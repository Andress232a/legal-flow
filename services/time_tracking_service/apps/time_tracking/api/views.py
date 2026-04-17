import logging
from django.utils import timezone
from django.db.models import Sum, Count, Q
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from apps.time_tracking.models import TimeEntry, Timer
from apps.time_tracking.tasks import publish_event
from .serializers import (
    TimeEntrySerializer, TimeEntryCreateSerializer,
    TimerSerializer, TimerStartSerializer, TimeStatsSerializer,
)

logger = logging.getLogger(__name__)


class TimeEntryViewSet(viewsets.ModelViewSet):
    """
    CRUD de entradas de tiempo.
    Cada usuario solo ve sus propias entradas, excepto admins.
    """
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["case_id", "task_type", "is_billable", "date"]
    search_fields = ["description", "case_number"]
    ordering_fields = ["date", "duration_minutes", "created_at"]
    ordering = ["-date", "-created_at"]

    def get_queryset(self):
        # getattr evita error cuando drf-spectacular inspecciona la vista sin request real
        if getattr(self, "swagger_fake_view", False):
            return TimeEntry.objects.none()
        user_id = str(self.request.user.id)
        qs = TimeEntry.objects.filter(user_id=user_id)
        case_id = self.request.query_params.get("case_id")
        if case_id:
            qs = qs.filter(case_id=case_id)
        return qs

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return TimeEntryCreateSerializer
        return TimeEntrySerializer

    def _fire_event(self, event_type: str, payload: dict):
        """Publica evento Celery sin romper la operación si el broker no está disponible."""
        try:
            publish_event.delay(event_type, payload)
        except Exception as exc:
            logger.warning("Could not publish event %s: %s", event_type, exc)

    def perform_create(self, serializer):
        user = self.request.user
        entry = serializer.save(
            user_id=user.id,
            user_name=getattr(user, "user_name", ""),
        )
        self._fire_event("time_entry.created", {
            "entry_id": str(entry.id),
            "case_id": str(entry.case_id),
            "user_id": str(entry.user_id),
            "duration_minutes": entry.duration_minutes,
            "is_billable": entry.is_billable,
        })

    def perform_update(self, serializer):
        entry = serializer.save()
        self._fire_event("time_entry.updated", {
            "entry_id": str(entry.id),
            "case_id": str(entry.case_id),
            "user_id": str(entry.user_id),
        })

    def perform_destroy(self, instance):
        self._fire_event("time_entry.deleted", {
            "entry_id": str(instance.id),
            "case_id": str(instance.case_id),
            "user_id": str(instance.user_id),
        })
        instance.delete()

    @action(detail=False, methods=["get"], url_path="stats")
    def stats(self, request):
        """Estadísticas de tiempo del usuario autenticado."""
        user_id = str(request.user.id)
        qs = TimeEntry.objects.filter(user_id=user_id)

        # Filtros opcionales por fecha
        date_from = request.query_params.get("date_from")
        date_to = request.query_params.get("date_to")
        case_id = request.query_params.get("case_id")
        if date_from:
            qs = qs.filter(date__gte=date_from)
        if date_to:
            qs = qs.filter(date__lte=date_to)
        if case_id:
            qs = qs.filter(case_id=case_id)

        agg = qs.aggregate(
            total_minutes=Sum("duration_minutes"),
            billable_minutes=Sum("duration_minutes", filter=Q(is_billable=True)),
        )
        total_minutes = agg["total_minutes"] or 0
        billable_minutes = agg["billable_minutes"] or 0

        # Billable amount
        billable_amount = 0.0
        for entry in qs.filter(is_billable=True).exclude(hourly_rate=None):
            billable_amount += entry.billable_amount

        # Por tipo de tarea
        by_type = {}
        for row in qs.values("task_type").annotate(minutes=Sum("duration_minutes"), count=Count("id")):
            by_type[row["task_type"]] = {"minutes": row["minutes"], "count": row["count"]}

        # Por caso (top 10)
        by_case = list(
            qs.values("case_id", "case_number")
            .annotate(minutes=Sum("duration_minutes"), count=Count("id"))
            .order_by("-minutes")[:10]
        )
        for row in by_case:
            row["case_id"] = str(row["case_id"])

        # Timer activo
        active_timer = Timer.objects.filter(user_id=user_id, status="running").first()

        data = {
            "total_entries": qs.count(),
            "total_minutes": total_minutes,
            "total_hours": round(total_minutes / 60, 2),
            "billable_minutes": billable_minutes,
            "billable_hours": round(billable_minutes / 60, 2),
            "billable_amount": billable_amount,
            "entries_by_task_type": by_type,
            "entries_by_case": by_case,
            "active_timer": TimerSerializer(active_timer).data if active_timer else None,
        }
        return Response(data)


class TimerViewSet(viewsets.GenericViewSet):
    """
    Temporizador en tiempo real.
    Cada usuario puede tener UN solo timer activo a la vez.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = TimerSerializer

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Timer.objects.none()
        return Timer.objects.filter(user_id=str(self.request.user.id))

    @action(detail=False, methods=["get"], url_path="active")
    def active(self, request):
        """Devuelve el timer activo del usuario, o 404 si no hay ninguno."""
        timer = Timer.objects.filter(
            user_id=str(request.user.id),
            status__in=["running", "paused"]
        ).first()
        if not timer:
            return Response({"detail": "No hay ningún timer activo."}, status=status.HTTP_404_NOT_FOUND)
        return Response(TimerSerializer(timer).data)

    @action(detail=False, methods=["post"], url_path="start")
    def start(self, request):
        """Inicia un nuevo timer. Si ya hay uno activo, devuelve error."""
        existing = Timer.objects.filter(
            user_id=str(request.user.id),
            status__in=["running", "paused"]
        ).first()
        if existing:
            return Response(
                {"detail": "Ya tienes un timer activo. Detén el actual antes de iniciar uno nuevo.",
                 "timer": TimerSerializer(existing).data},
                status=status.HTTP_409_CONFLICT,
            )

        serializer = TimerStartSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data

        timer = Timer.objects.create(
            user_id=request.user.id,
            case_id=d["case_id"],
            case_number=d.get("case_number", ""),
            task_type=d.get("task_type", "other"),
            description=d.get("description", ""),
            is_billable=d.get("is_billable", True),
            status="running",
            started_at=timezone.now(),
        )
        logger.info("Timer started: %s by user %s", timer.id, request.user.id)
        return Response(TimerSerializer(timer).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="pause")
    def pause(self, request, pk=None):
        """Pausa un timer en curso."""
        try:
            timer = Timer.objects.get(pk=pk, user_id=str(request.user.id))
        except Timer.DoesNotExist:
            return Response({"detail": "Timer no encontrado."}, status=status.HTTP_404_NOT_FOUND)

        if timer.status != "running":
            return Response({"detail": "Solo se puede pausar un timer en curso."}, status=status.HTTP_400_BAD_REQUEST)

        now = timezone.now()
        elapsed = int((now - timer.started_at).total_seconds())
        timer.accumulated_seconds += elapsed
        timer.paused_at = now
        timer.status = "paused"
        timer.save(update_fields=["accumulated_seconds", "paused_at", "status"])
        return Response(TimerSerializer(timer).data)

    @action(detail=True, methods=["post"], url_path="resume")
    def resume(self, request, pk=None):
        """Reanuda un timer pausado."""
        try:
            timer = Timer.objects.get(pk=pk, user_id=str(request.user.id))
        except Timer.DoesNotExist:
            return Response({"detail": "Timer no encontrado."}, status=status.HTTP_404_NOT_FOUND)

        if timer.status != "paused":
            return Response({"detail": "Solo se puede reanudar un timer pausado."}, status=status.HTTP_400_BAD_REQUEST)

        timer.started_at = timezone.now()
        timer.paused_at = None
        timer.status = "running"
        timer.save(update_fields=["started_at", "paused_at", "status"])
        return Response(TimerSerializer(timer).data)

    @action(detail=True, methods=["post"], url_path="stop")
    def stop(self, request, pk=None):
        """
        Detiene el timer y crea automáticamente un TimeEntry con el tiempo acumulado.
        """
        try:
            timer = Timer.objects.get(pk=pk, user_id=str(request.user.id))
        except Timer.DoesNotExist:
            return Response({"detail": "Timer no encontrado."}, status=status.HTTP_404_NOT_FOUND)

        if timer.status == "stopped":
            return Response({"detail": "El timer ya fue detenido."}, status=status.HTTP_400_BAD_REQUEST)

        now = timezone.now()
        if timer.status == "running":
            elapsed = int((now - timer.started_at).total_seconds())
            timer.accumulated_seconds += elapsed

        timer.stopped_at = now
        timer.status = "stopped"
        timer.save(update_fields=["accumulated_seconds", "stopped_at", "status"])

        duration_minutes = max(1, round(timer.accumulated_seconds / 60))

        # Crear TimeEntry automáticamente
        description = timer.description or f"Tiempo registrado vía temporizador"
        entry = TimeEntry.objects.create(
            case_id=timer.case_id,
            case_number=timer.case_number,
            user_id=timer.user_id,
            user_name=getattr(request.user, "user_name", ""),
            task_type=timer.task_type,
            description=description,
            date=now.date(),
            duration_minutes=duration_minutes,
            is_billable=timer.is_billable,
            created_from_timer=True,
            timer=timer,
        )

        try:
            publish_event.delay("time_entry.created", {
                "entry_id": str(entry.id),
                "case_id": str(entry.case_id),
                "user_id": str(entry.user_id),
                "duration_minutes": entry.duration_minutes,
                "is_billable": entry.is_billable,
                "source": "timer",
            })
        except Exception as exc:
            logger.warning("Could not publish timer stop event: %s", exc)

        return Response({
            "timer": TimerSerializer(timer).data,
            "time_entry": TimeEntrySerializer(entry).data,
        })

    @action(detail=True, methods=["delete"], url_path="discard")
    def discard(self, request, pk=None):
        """Descarta un timer sin crear TimeEntry."""
        try:
            timer = Timer.objects.get(pk=pk, user_id=str(request.user.id))
        except Timer.DoesNotExist:
            return Response({"detail": "Timer no encontrado."}, status=status.HTTP_404_NOT_FOUND)

        if timer.status == "stopped":
            return Response({"detail": "El timer ya fue detenido."}, status=status.HTTP_400_BAD_REQUEST)

        timer.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
