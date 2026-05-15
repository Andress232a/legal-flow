from django.db.models import Q
from django.utils import timezone
from rest_framework import mixins, viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, extend_schema_view

from apps.portal.models import PortalMessage
from apps.portal.matter_client import user_has_case_access
from apps.portal.api.serializers import (
    PortalMessageSerializer,
    PortalMessageCreateSerializer,
)


@extend_schema_view(
    list=extend_schema(summary="Listar mensajes del usuario"),
    create=extend_schema(summary="Enviar mensaje en el contexto de un caso"),
    retrieve=extend_schema(summary="Detalle de mensaje"),
)
class PortalMessageViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        uid = self.request.user.id
        return PortalMessage.objects.filter(
            Q(sender_id=uid) | Q(recipient_id=uid)
        )

    def get_serializer_class(self):
        if self.action == "create":
            return PortalMessageCreateSerializer
        return PortalMessageSerializer

    def create(self, request, *args, **kwargs):
        auth = request.META.get("HTTP_AUTHORIZATION", "")
        ser = self.get_serializer(data=request.data)
        ser.is_valid(raise_exception=True)
        case_id = ser.validated_data["case_id"]
        if not user_has_case_access(case_id, auth):
            return Response(
                {"detail": "No tiene acceso a este caso o el caso no existe."},
                status=status.HTTP_403_FORBIDDEN,
            )
        msg = PortalMessage.objects.create(
            case_id=case_id,
            sender_id=request.user.id,
            recipient_id=ser.validated_data["recipient_id"],
            body=ser.validated_data["body"],
        )
        return Response(
            PortalMessageSerializer(msg).data,
            status=status.HTTP_201_CREATED,
        )

    @extend_schema(summary="Marcar mensaje como leído")
    @action(detail=True, methods=["post"], url_path="mark-read")
    def mark_read(self, request, pk=None):
        msg = self.get_object()
        if msg.recipient_id != request.user.id:
            return Response(
                {"detail": "Solo el destinatario puede marcar el mensaje como leído."},
                status=status.HTTP_403_FORBIDDEN,
            )
        msg.read_at = timezone.now()
        msg.save(update_fields=["read_at"])
        return Response(PortalMessageSerializer(msg).data)
