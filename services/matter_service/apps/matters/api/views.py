import logging

from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, extend_schema_view

from apps.matters.models import Case, CaseParty, CaseDate, CaseActivityLog
from apps.matters.api.serializers import (
    CaseListSerializer,
    CaseDetailSerializer,
    CaseCreateSerializer,
    CaseUpdateSerializer,
    CaseStatusChangeSerializer,
    CasePartySerializer,
    CasePartyCreateSerializer,
    CaseDateSerializer,
    CaseDateCreateSerializer,
    CaseActivityLogSerializer,
)
from apps.matters.iam_client import check_permission
from apps.matters.events.publisher import publish_event

logger = logging.getLogger(__name__)


def _get_client_ip(request):
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def _log_activity(case, user_id, activity_type, description,
                  old_value=None, new_value=None, request=None):
    """Registra una actividad en el log de auditoría del caso."""
    CaseActivityLog.objects.create(
        case=case,
        activity_type=activity_type,
        user_id=user_id,
        description=description,
        old_value=old_value,
        new_value=new_value,
        ip_address=_get_client_ip(request) if request else None,
    )


@extend_schema_view(
    list=extend_schema(summary="Listar casos"),
    retrieve=extend_schema(summary="Detalle de un caso"),
    create=extend_schema(summary="Crear nuevo caso"),
    partial_update=extend_schema(summary="Actualizar caso parcialmente"),
    destroy=extend_schema(summary="Eliminar caso"),
)
class CaseViewSet(viewsets.ModelViewSet):
    queryset = Case.objects.prefetch_related("parties", "dates").all()
    http_method_names = ["get", "post", "patch", "delete"]
    filterset_fields = ["status", "case_type", "is_urgent", "assigned_lawyer_id", "client_id"]
    search_fields = ["title", "case_number", "jurisdiction", "court", "description"]
    ordering_fields = ["created_at", "updated_at", "opened_at", "case_number", "title"]

    def get_serializer_class(self):
        if self.action == "retrieve":
            return CaseDetailSerializer
        if self.action == "create":
            return CaseCreateSerializer
        if self.action in ("partial_update", "update"):
            return CaseUpdateSerializer
        return CaseListSerializer

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [IsAuthenticated()]
        if self.action == "create":
            return [IsAuthenticated()]
        if self.action in ("partial_update", "update"):
            return [IsAuthenticated()]
        if self.action == "destroy":
            return [IsAuthenticated()]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = Case.objects.prefetch_related("parties", "dates").all()
        # Los abogados solo ven sus casos asignados
        user = self.request.user
        user_type = getattr(user, "user_type", None)
        if user_type == "lawyer":
            qs = qs.filter(assigned_lawyer_id=user.id)
        elif user_type == "client":
            qs = qs.filter(client_id=user.id)
        return qs

    def list(self, request, *args, **kwargs):
        if not check_permission(request.user.id, "read", "case"):
            return Response(
                {"detail": "No tiene permiso para listar casos."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return super().list(request, *args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        if not check_permission(request.user.id, "read", "case", str(instance.id)):
            return Response(
                {"detail": "No tiene permiso para ver este caso."},
                status=status.HTTP_403_FORBIDDEN,
            )
        _log_activity(
            instance, request.user.id,
            CaseActivityLog.ActivityType.UPDATED,
            f"Caso consultado por usuario {request.user.id}",
            request=request,
        )
        return super().retrieve(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        if not check_permission(request.user.id, "create", "case"):
            return Response(
                {"detail": "No tiene permiso para crear casos."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = CaseCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        case = serializer.save(created_by=request.user.id)

        _log_activity(
            case, request.user.id,
            CaseActivityLog.ActivityType.CREATED,
            f"Caso '{case.title}' creado con número {case.case_number}",
            new_value={"case_number": case.case_number, "title": case.title},
            request=request,
        )

        publish_event("case.created", {
            "case_id": str(case.id),
            "case_number": case.case_number,
            "title": case.title,
            "case_type": case.case_type,
            "assigned_lawyer_id": str(case.assigned_lawyer_id),
            "client_id": str(case.client_id),
            "created_by": str(request.user.id),
        })

        response_serializer = CaseDetailSerializer(case)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        if not check_permission(request.user.id, "update", "case", str(instance.id)):
            return Response(
                {"detail": "No tiene permiso para actualizar este caso."},
                status=status.HTTP_403_FORBIDDEN,
            )

        old_status = instance.status
        serializer = CaseUpdateSerializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        case = serializer.save()

        description = f"Caso '{case.title}' actualizado"
        old_value = None
        new_value = None

        if old_status != case.status:
            old_value = {"status": old_status}
            new_value = {"status": case.status}
            description = f"Estado cambiado de '{old_status}' a '{case.status}'"
            _log_activity(
                case, request.user.id,
                CaseActivityLog.ActivityType.STATUS_CHANGED,
                description, old_value=old_value, new_value=new_value, request=request,
            )
            publish_event("case.status_changed", {
                "case_id": str(case.id),
                "case_number": case.case_number,
                "old_status": old_status,
                "new_status": case.status,
                "changed_by": str(request.user.id),
            })
            if case.status == Case.CaseStatus.CLOSED:
                publish_event("case.closed", {
                    "case_id": str(case.id),
                    "case_number": case.case_number,
                    "closed_by": str(request.user.id),
                    "closed_at": case.closed_at.isoformat() if case.closed_at else None,
                })
        else:
            _log_activity(
                case, request.user.id,
                CaseActivityLog.ActivityType.UPDATED,
                description, request=request,
            )

        publish_event("case.updated", {
            "case_id": str(case.id),
            "case_number": case.case_number,
            "updated_by": str(request.user.id),
        })

        response_serializer = CaseDetailSerializer(case)
        return Response(response_serializer.data)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if not check_permission(request.user.id, "delete", "case", str(instance.id)):
            return Response(
                {"detail": "No tiene permiso para eliminar este caso."},
                status=status.HTTP_403_FORBIDDEN,
            )

        _log_activity(
            instance, request.user.id,
            CaseActivityLog.ActivityType.CLOSED,
            f"Caso '{instance.title}' eliminado por usuario {request.user.id}",
            request=request,
        )

        publish_event("case.deleted", {
            "case_id": str(instance.id),
            "case_number": instance.case_number,
            "deleted_by": str(request.user.id),
        })

        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @extend_schema(summary="Cambiar estado del caso", request=CaseStatusChangeSerializer)
    @action(detail=True, methods=["post"], url_path="change-status")
    def change_status(self, request, pk=None):
        case = self.get_object()
        if not check_permission(request.user.id, "update", "case", str(case.id)):
            return Response(
                {"detail": "No tiene permiso para cambiar el estado de este caso."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = CaseStatusChangeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        new_status = serializer.validated_data["status"]
        notes = serializer.validated_data.get("notes", "")
        old_status = case.status

        case.status = new_status
        if new_status == Case.CaseStatus.CLOSED and not case.closed_at:
            case.closed_at = timezone.now().date()
        case.save()

        _log_activity(
            case, request.user.id,
            CaseActivityLog.ActivityType.STATUS_CHANGED,
            f"Estado cambiado de '{old_status}' a '{new_status}'. {notes}".strip(),
            old_value={"status": old_status},
            new_value={"status": new_status},
            request=request,
        )

        publish_event("case.status_changed", {
            "case_id": str(case.id),
            "case_number": case.case_number,
            "old_status": old_status,
            "new_status": new_status,
            "changed_by": str(request.user.id),
            "notes": notes,
        })

        if new_status == Case.CaseStatus.CLOSED:
            publish_event("case.closed", {
                "case_id": str(case.id),
                "case_number": case.case_number,
                "closed_by": str(request.user.id),
                "closed_at": case.closed_at.isoformat() if case.closed_at else None,
            })

        return Response(CaseDetailSerializer(case).data)

    @extend_schema(
        summary="Listar partes del caso",
        responses={200: CasePartySerializer(many=True)},
    )
    @action(detail=True, methods=["get"])
    def parties(self, request, pk=None):
        case = self.get_object()
        if not check_permission(request.user.id, "read", "case", str(case.id)):
            return Response({"detail": "Sin permiso."}, status=status.HTTP_403_FORBIDDEN)
        serializer = CasePartySerializer(case.parties.all(), many=True)
        return Response(serializer.data)

    @extend_schema(
        summary="Añadir parte al caso",
        request=CasePartyCreateSerializer,
        responses={201: CasePartySerializer},
    )
    @action(detail=True, methods=["post"], url_path="add-party")
    def add_party(self, request, pk=None):
        case = self.get_object()
        if not check_permission(request.user.id, "update", "case", str(case.id)):
            return Response({"detail": "Sin permiso."}, status=status.HTTP_403_FORBIDDEN)

        serializer = CasePartyCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        party = serializer.save(case=case)

        _log_activity(
            case, request.user.id,
            CaseActivityLog.ActivityType.PARTY_ADDED,
            f"Parte '{party.full_name}' ({party.get_role_display()}) añadida al caso",
            new_value={"party_name": party.full_name, "role": party.role},
            request=request,
        )

        publish_event("case.party_added", {
            "case_id": str(case.id),
            "party_id": str(party.id),
            "party_name": party.full_name,
            "role": party.role,
            "added_by": str(request.user.id),
        })

        return Response(CasePartySerializer(party).data, status=status.HTTP_201_CREATED)

    @extend_schema(
        summary="Eliminar parte del caso",
    )
    @action(detail=True, methods=["delete"], url_path="remove-party/(?P<party_id>[^/.]+)")
    def remove_party(self, request, pk=None, party_id=None):
        case = self.get_object()
        if not check_permission(request.user.id, "update", "case", str(case.id)):
            return Response({"detail": "Sin permiso."}, status=status.HTTP_403_FORBIDDEN)

        try:
            party = case.parties.get(id=party_id)
        except CaseParty.DoesNotExist:
            return Response(
                {"detail": "Parte no encontrada en este caso."},
                status=status.HTTP_404_NOT_FOUND,
            )

        _log_activity(
            case, request.user.id,
            CaseActivityLog.ActivityType.PARTY_REMOVED,
            f"Parte '{party.full_name}' ({party.get_role_display()}) eliminada del caso",
            old_value={"party_name": party.full_name, "role": party.role},
            request=request,
        )

        party.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @extend_schema(
        summary="Listar fechas/plazos del caso",
        responses={200: CaseDateSerializer(many=True)},
    )
    @action(detail=True, methods=["get"])
    def dates(self, request, pk=None):
        case = self.get_object()
        if not check_permission(request.user.id, "read", "case", str(case.id)):
            return Response({"detail": "Sin permiso."}, status=status.HTTP_403_FORBIDDEN)
        serializer = CaseDateSerializer(case.dates.all(), many=True)
        return Response(serializer.data)

    @extend_schema(
        summary="Añadir fecha/plazo al caso",
        request=CaseDateCreateSerializer,
        responses={201: CaseDateSerializer},
    )
    @action(detail=True, methods=["post"], url_path="add-date")
    def add_date(self, request, pk=None):
        case = self.get_object()
        if not check_permission(request.user.id, "update", "case", str(case.id)):
            return Response({"detail": "Sin permiso."}, status=status.HTTP_403_FORBIDDEN)

        serializer = CaseDateCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        case_date = serializer.save(case=case, created_by=request.user.id)

        # Sincronizar con Calendar Service
        try:
            from apps.matters.calendar_client import create_calendar_event
            event_id = create_calendar_event(case_date, case.assigned_lawyer_id)
            if event_id:
                case_date.calendar_event_id = event_id
                case_date.save(update_fields=["calendar_event_id"])
        except Exception:
            logger.exception("Error al sincronizar CaseDate %s con Calendar Service", case_date.id)

        _log_activity(
            case, request.user.id,
            CaseActivityLog.ActivityType.DATE_ADDED,
            f"Fecha '{case_date.title}' ({case_date.scheduled_date}) añadida",
            new_value={
                "date_title": case_date.title,
                "scheduled_date": case_date.scheduled_date.isoformat(),
                "is_critical": case_date.is_critical,
            },
            request=request,
        )

        publish_event("case.date_added", {
            "case_id": str(case.id),
            "date_id": str(case_date.id),
            "title": case_date.title,
            "scheduled_date": case_date.scheduled_date.isoformat(),
            "is_critical": case_date.is_critical,
            "added_by": str(request.user.id),
        })

        return Response(CaseDateSerializer(case_date).data, status=status.HTTP_201_CREATED)

    @extend_schema(summary="Marcar fecha/plazo como completado")
    @action(detail=True, methods=["post"], url_path="complete-date/(?P<date_id>[^/.]+)")
    def complete_date(self, request, pk=None, date_id=None):
        case = self.get_object()
        if not check_permission(request.user.id, "update", "case", str(case.id)):
            return Response({"detail": "Sin permiso."}, status=status.HTTP_403_FORBIDDEN)

        try:
            case_date = case.dates.get(id=date_id)
        except CaseDate.DoesNotExist:
            return Response(
                {"detail": "Fecha no encontrada en este caso."},
                status=status.HTTP_404_NOT_FOUND,
            )

        case_date.is_completed = True
        case_date.completed_at = timezone.now()
        case_date.save()

        # Sincronizar completado con Calendar Service
        if case_date.calendar_event_id:
            try:
                from apps.matters.calendar_client import complete_calendar_event
                complete_calendar_event(str(case_date.calendar_event_id))
            except Exception:
                logger.exception("Error al completar CalendarEvent %s", case_date.calendar_event_id)

        _log_activity(
            case, request.user.id,
            CaseActivityLog.ActivityType.DATE_COMPLETED,
            f"Fecha '{case_date.title}' marcada como completada",
            request=request,
        )

        return Response(CaseDateSerializer(case_date).data)

    @extend_schema(
        summary="Historial de actividad del caso",
        responses={200: CaseActivityLogSerializer(many=True)},
    )
    @action(detail=True, methods=["get"], url_path="activity-log")
    def activity_log(self, request, pk=None):
        case = self.get_object()
        if not check_permission(request.user.id, "read", "case", str(case.id)):
            return Response({"detail": "Sin permiso."}, status=status.HTTP_403_FORBIDDEN)

        logs = case.activity_logs.all()
        serializer = CaseActivityLogSerializer(logs, many=True)
        return Response(serializer.data)

    @extend_schema(summary="Estadísticas generales de casos")
    @action(detail=False, methods=["get"])
    def stats(self, request):
        if not check_permission(request.user.id, "read", "case"):
            return Response({"detail": "Sin permiso."}, status=status.HTTP_403_FORBIDDEN)

        from django.db.models import Count
        user = request.user
        user_type = getattr(user, "user_type", None)
        cases = Case.objects.all()
        if user_type == "lawyer":
            cases = cases.filter(assigned_lawyer_id=user.id)
        elif user_type == "client":
            cases = cases.filter(client_id=user.id)

        stats = {
            "total": cases.count(),
            "by_status": {
                item["status"]: item["count"]
                for item in cases.values("status").annotate(count=Count("id"))
            },
            "by_type": {
                item["case_type"]: item["count"]
                for item in cases.values("case_type").annotate(count=Count("id"))
            },
            "urgent": cases.filter(is_urgent=True).count(),
            "open": cases.filter(status__in=["open", "in_progress"]).count(),
            "closed": cases.filter(status="closed").count(),
        }

        return Response(stats)
