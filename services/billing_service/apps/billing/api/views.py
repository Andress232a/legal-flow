import logging
from decimal import Decimal

from django.db.models import Sum, Count, Q
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema

from apps.billing.models import Invoice, InvoiceItem, Payment
from apps.billing.api.serializers import (
    InvoiceListSerializer, InvoiceDetailSerializer,
    InvoiceCreateSerializer, InvoiceUpdateSerializer,
    InvoiceItemSerializer, InvoiceItemCreateSerializer,
    PaymentSerializer, PaymentCreateSerializer,
    InvoiceStatsSerializer,
)
from apps.billing.iam_client import check_permission

logger = logging.getLogger(__name__)


class InvoiceViewSet(viewsets.ModelViewSet):
    http_method_names = ["get", "post", "patch", "delete"]
    filterset_fields = ["status", "case_id", "client_id", "lawyer_id"]
    search_fields = ["invoice_number", "case_number", "client_name", "notes"]
    ordering_fields = ["created_at", "issue_date", "due_date", "total", "invoice_number"]

    def get_serializer_class(self):
        if self.action == "retrieve":
            return InvoiceDetailSerializer
        if self.action == "create":
            return InvoiceCreateSerializer
        if self.action in ("partial_update", "update"):
            return InvoiceUpdateSerializer
        return InvoiceListSerializer

    def get_queryset(self):
        qs = Invoice.objects.prefetch_related("items", "payments").all()
        user = self.request.user
        user_type = getattr(user, "user_type", None)
        if user_type == "client":
            qs = qs.filter(client_id=user.id)
        elif user_type == "lawyer":
            qs = qs.filter(lawyer_id=user.id)
        return qs

    def list(self, request, *args, **kwargs):
        if not check_permission(request.user.id, "read", "invoice"):
            return Response({"detail": "Sin permiso para listar facturas."}, status=status.HTTP_403_FORBIDDEN)
        return super().list(request, *args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        if not check_permission(request.user.id, "read", "invoice", str(instance.id)):
            return Response({"detail": "Sin permiso para ver esta factura."}, status=status.HTTP_403_FORBIDDEN)
        return super().retrieve(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        if not check_permission(request.user.id, "create", "invoice"):
            return Response({"detail": "Sin permiso para crear facturas."}, status=status.HTTP_403_FORBIDDEN)
        serializer = InvoiceCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        invoice = serializer.save(created_by=request.user.id, lawyer_id=request.user.id
                                  if getattr(request.user, "user_type", "") == "lawyer"
                                  else serializer.validated_data.get("lawyer_id", request.user.id))
        return Response(InvoiceDetailSerializer(invoice).data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        if not check_permission(request.user.id, "update", "invoice", str(instance.id)):
            return Response({"detail": "Sin permiso para actualizar esta factura."}, status=status.HTTP_403_FORBIDDEN)
        serializer = InvoiceUpdateSerializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        invoice = serializer.save()
        return Response(InvoiceDetailSerializer(invoice).data)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if not check_permission(request.user.id, "delete", "invoice", str(instance.id)):
            return Response({"detail": "Sin permiso para eliminar esta factura."}, status=status.HTTP_403_FORBIDDEN)
        if instance.status not in (Invoice.Status.DRAFT, Invoice.Status.CANCELLED):
            return Response({"detail": "Solo se pueden eliminar facturas en borrador o canceladas."}, status=status.HTTP_400_BAD_REQUEST)
        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @extend_schema(summary="Cambiar estado de la factura")
    @action(detail=True, methods=["post"], url_path="change-status")
    def change_status(self, request, pk=None):
        invoice = self.get_object()
        if not check_permission(request.user.id, "update", "invoice", str(invoice.id)):
            return Response({"detail": "Sin permiso."}, status=status.HTTP_403_FORBIDDEN)
        new_status = request.data.get("status")
        if new_status not in Invoice.Status.values:
            return Response({"detail": f"Estado inválido. Opciones: {Invoice.Status.values}"}, status=status.HTTP_400_BAD_REQUEST)
        if invoice.status == Invoice.Status.CANCELLED:
            return Response({"detail": "No se puede cambiar el estado de una factura cancelada."}, status=status.HTTP_400_BAD_REQUEST)
        invoice.status = new_status
        invoice.save(update_fields=["status"])
        return Response(InvoiceDetailSerializer(invoice).data)

    @extend_schema(summary="Agregar ítem a la factura")
    @action(detail=True, methods=["post"], url_path="add-item")
    def add_item(self, request, pk=None):
        invoice = self.get_object()
        if not check_permission(request.user.id, "update", "invoice", str(invoice.id)):
            return Response({"detail": "Sin permiso."}, status=status.HTTP_403_FORBIDDEN)
        if invoice.status not in (Invoice.Status.DRAFT,):
            return Response({"detail": "Solo se pueden agregar ítems a facturas en borrador."}, status=status.HTTP_400_BAD_REQUEST)
        serializer = InvoiceItemCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        item = serializer.save(invoice=invoice)
        invoice.recalculate()
        return Response(InvoiceItemSerializer(item).data, status=status.HTTP_201_CREATED)

    @extend_schema(summary="Eliminar ítem de la factura")
    @action(detail=True, methods=["delete"], url_path="remove-item/(?P<item_id>[^/.]+)")
    def remove_item(self, request, pk=None, item_id=None):
        invoice = self.get_object()
        if not check_permission(request.user.id, "update", "invoice", str(invoice.id)):
            return Response({"detail": "Sin permiso."}, status=status.HTTP_403_FORBIDDEN)
        if invoice.status != Invoice.Status.DRAFT:
            return Response({"detail": "Solo se pueden eliminar ítems de facturas en borrador."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            item = invoice.items.get(id=item_id)
        except InvoiceItem.DoesNotExist:
            return Response({"detail": "Ítem no encontrado."}, status=status.HTTP_404_NOT_FOUND)
        item.delete()
        invoice.recalculate()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @extend_schema(summary="Registrar pago de la factura")
    @action(detail=True, methods=["post"], url_path="add-payment")
    def add_payment(self, request, pk=None):
        invoice = self.get_object()
        if not check_permission(request.user.id, "approve", "invoice", str(invoice.id)):
            return Response({"detail": "Sin permiso para registrar pagos."}, status=status.HTTP_403_FORBIDDEN)
        if invoice.status == Invoice.Status.CANCELLED:
            return Response({"detail": "No se puede registrar pagos en una factura cancelada."}, status=status.HTTP_400_BAD_REQUEST)
        serializer = PaymentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payment_amount = serializer.validated_data["amount"]
        if payment_amount > invoice.balance_due:
            return Response({"detail": f"El pago ({payment_amount}) supera el saldo pendiente ({invoice.balance_due})."}, status=status.HTTP_400_BAD_REQUEST)
        payment = serializer.save(invoice=invoice, registered_by=request.user.id)
        invoice.amount_paid += payment_amount
        if invoice.amount_paid >= invoice.total:
            invoice.status = Invoice.Status.PAID
        elif invoice.status == Invoice.Status.SENT:
            pass
        invoice.save(update_fields=["amount_paid", "status"])
        return Response(PaymentSerializer(payment).data, status=status.HTTP_201_CREATED)

    @extend_schema(summary="Estadísticas de facturación")
    @action(detail=False, methods=["get"])
    def stats(self, request):
        if not check_permission(request.user.id, "read", "invoice"):
            return Response({"detail": "Sin permiso."}, status=status.HTTP_403_FORBIDDEN)
        qs = self.get_queryset()
        by_status = {row["status"]: row["count"] for row in qs.values("status").annotate(count=Count("id"))}
        totals = qs.aggregate(
            total_billed=Sum("total"),
            total_paid=Sum("amount_paid"),
        )
        total_billed = totals["total_billed"] or Decimal("0.00")
        total_paid = totals["total_paid"] or Decimal("0.00")
        return Response({
            "total": qs.count(),
            "draft": by_status.get("draft", 0),
            "sent": by_status.get("sent", 0),
            "paid": by_status.get("paid", 0),
            "overdue": by_status.get("overdue", 0),
            "cancelled": by_status.get("cancelled", 0),
            "total_billed": total_billed,
            "total_paid": total_paid,
            "total_pending": total_billed - total_paid,
        })
