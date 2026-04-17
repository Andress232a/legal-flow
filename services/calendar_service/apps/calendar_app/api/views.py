import logging
from django.utils import timezone
from django.db.models import Count, Q
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema

from apps.calendar_app.models import CalendarEvent, EventReminder
from apps.calendar_app.api.serializers import (
    CalendarEventListSerializer, CalendarEventDetailSerializer,
    CalendarEventCreateSerializer, CalendarEventUpdateSerializer,
    EventReminderSerializer,
)
from apps.calendar_app.iam_client import check_permission

logger = logging.getLogger(__name__)


class CalendarEventViewSet(viewsets.ModelViewSet):
    http_method_names = ["get", "post", "patch", "delete"]
    filterset_fields = ["event_type", "priority", "case_id", "assigned_to", "is_completed", "is_legal_deadline"]
    search_fields = ["title", "description", "location", "case_number"]
    ordering_fields = ["start_datetime", "created_at", "priority", "event_type"]

    def get_serializer_class(self):
        if self.action == "retrieve":
            return CalendarEventDetailSerializer
        if self.action == "create":
            return CalendarEventCreateSerializer
        if self.action in ("partial_update", "update"):
            return CalendarEventUpdateSerializer
        return CalendarEventListSerializer

    def get_queryset(self):
        qs = CalendarEvent.objects.prefetch_related("reminders").all()
        user = self.request.user
        user_type = getattr(user, "user_type", None)
        if user_type in ("lawyer", "assistant"):
            qs = qs.filter(assigned_to=user.id)
        elif user_type == "client":
            qs = qs.filter(assigned_to=user.id)
        # admins ven todo
        # filtros opcionales por rango de fechas
        date_from = self.request.query_params.get("date_from")
        date_to = self.request.query_params.get("date_to")
        if date_from:
            qs = qs.filter(start_datetime__date__gte=date_from)
        if date_to:
            qs = qs.filter(start_datetime__date__lte=date_to)
        return qs

    def list(self, request, *args, **kwargs):
        if not check_permission(request.user.id, "read", "calendar"):
            return Response({"detail": "Sin permiso para listar eventos."}, status=status.HTTP_403_FORBIDDEN)
        return super().list(request, *args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        if not check_permission(request.user.id, "read", "calendar", str(instance.id)):
            return Response({"detail": "Sin permiso para ver este evento."}, status=status.HTTP_403_FORBIDDEN)
        return super().retrieve(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        if not check_permission(request.user.id, "create", "calendar"):
            return Response({"detail": "Sin permiso para crear eventos."}, status=status.HTTP_403_FORBIDDEN)
        serializer = CalendarEventCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if "assigned_to" not in request.data:
            event = serializer.save(created_by=request.user.id, assigned_to=request.user.id)
        else:
            event = serializer.save(created_by=request.user.id)
        return Response(CalendarEventDetailSerializer(event).data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        if not check_permission(request.user.id, "update", "calendar", str(instance.id)):
            return Response({"detail": "Sin permiso para actualizar este evento."}, status=status.HTTP_403_FORBIDDEN)
        serializer = CalendarEventUpdateSerializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        event = serializer.save()
        return Response(CalendarEventDetailSerializer(event).data)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if not check_permission(request.user.id, "delete", "calendar", str(instance.id)):
            return Response({"detail": "Sin permiso para eliminar este evento."}, status=status.HTTP_403_FORBIDDEN)
        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @extend_schema(summary="Marcar evento como completado")
    @action(detail=True, methods=["post"], url_path="complete")
    def complete(self, request, pk=None):
        event = self.get_object()
        if not check_permission(request.user.id, "update", "calendar", str(event.id)):
            return Response({"detail": "Sin permiso."}, status=status.HTTP_403_FORBIDDEN)
        if event.is_completed:
            return Response({"detail": "El evento ya está completado."}, status=status.HTTP_400_BAD_REQUEST)
        event.mark_completed()
        return Response(CalendarEventDetailSerializer(event).data)

    @extend_schema(summary="Agregar recordatorio al evento")
    @action(detail=True, methods=["post"], url_path="add-reminder")
    def add_reminder(self, request, pk=None):
        event = self.get_object()
        if not check_permission(request.user.id, "update", "calendar", str(event.id)):
            return Response({"detail": "Sin permiso."}, status=status.HTTP_403_FORBIDDEN)
        serializer = EventReminderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        reminder = serializer.save(event=event)
        return Response(EventReminderSerializer(reminder).data, status=status.HTTP_201_CREATED)

    @extend_schema(summary="Próximos eventos (7 días)")
    @action(detail=False, methods=["get"], url_path="upcoming")
    def upcoming(self, request):
        if not check_permission(request.user.id, "read", "calendar"):
            return Response({"detail": "Sin permiso."}, status=status.HTTP_403_FORBIDDEN)
        now = timezone.now()
        in_7_days = now + timezone.timedelta(days=7)
        qs = self.get_queryset().filter(
            start_datetime__gte=now,
            start_datetime__lte=in_7_days,
            is_completed=False,
        ).order_by("start_datetime")
        serializer = CalendarEventListSerializer(qs, many=True)
        return Response(serializer.data)

    @extend_schema(summary="Eventos vencidos sin completar")
    @action(detail=False, methods=["get"], url_path="overdue")
    def overdue(self, request):
        if not check_permission(request.user.id, "read", "calendar"):
            return Response({"detail": "Sin permiso."}, status=status.HTTP_403_FORBIDDEN)
        now = timezone.now()
        qs = self.get_queryset().filter(
            start_datetime__lt=now,
            is_completed=False,
        ).order_by("start_datetime")
        serializer = CalendarEventListSerializer(qs, many=True)
        return Response(serializer.data)

    @extend_schema(summary="Estadísticas del calendario")
    @action(detail=False, methods=["get"])
    def stats(self, request):
        if not check_permission(request.user.id, "read", "calendar"):
            return Response({"detail": "Sin permiso."}, status=status.HTTP_403_FORBIDDEN)
        now = timezone.now()
        qs = self.get_queryset()
        by_type = {
            row["event_type"]: row["count"]
            for row in qs.values("event_type").annotate(count=Count("id"))
        }
        return Response({
            "total": qs.count(),
            "upcoming": qs.filter(start_datetime__gte=now, is_completed=False).count(),
            "overdue": qs.filter(start_datetime__lt=now, is_completed=False).count(),
            "completed": qs.filter(is_completed=True).count(),
            "legal_deadlines": qs.filter(is_legal_deadline=True).count(),
            "critical": qs.filter(priority="critical", is_completed=False).count(),
            "by_type": by_type,
        })
