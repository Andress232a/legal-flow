import logging

import requests
from django.conf import settings
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema

logger = logging.getLogger(__name__)

REQUEST_TIMEOUT = 8


def _get(url: str, authorization: str, params: dict | None = None) -> dict | list | None:
    try:
        r = requests.get(
            url,
            headers={"Authorization": authorization},
            params=params or {},
            timeout=REQUEST_TIMEOUT,
        )
        if not r.ok:
            return None
        return r.json()
    except requests.RequestException:
        logger.exception("Analytics: fallo al consultar %s", url)
        return None


def _count(url: str, authorization: str) -> int | None:
    data = _get(url, authorization, {"page_size": 1})
    if data is None:
        return None
    if isinstance(data, dict) and "count" in data:
        return int(data["count"])
    if isinstance(data, list):
        return len(data)
    return None


@extend_schema(summary="KPIs generales", description="Conteos agregados desde todos los microservicios.")
class KPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        auth = request.META.get("HTTP_AUTHORIZATION", "")
        base = {
            "cases": _count(f"{settings.MATTER_SERVICE_URL.rstrip('/')}/cases/", auth),
            "documents": _count(f"{settings.DOCUMENT_SERVICE_URL.rstrip('/')}/documents/", auth),
            "time_entries": _count(f"{settings.TIME_SERVICE_URL.rstrip('/')}/time-entries/", auth),
            "invoices": _count(f"{settings.BILLING_SERVICE_URL.rstrip('/')}/invoices/", auth),
            "calendar_events": _count(f"{settings.CALENDAR_SERVICE_URL.rstrip('/')}/events/", auth),
        }
        return Response(base)


@extend_schema(summary="Dashboard completo de Analytics", description="KPIs detallados: facturación, casos, calendario, tiempos.")
class DashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        auth = request.META.get("HTTP_AUTHORIZATION", "")
        matter_url = settings.MATTER_SERVICE_URL.rstrip("/")
        billing_url = settings.BILLING_SERVICE_URL.rstrip("/")
        time_url = settings.TIME_SERVICE_URL.rstrip("/")
        calendar_url = settings.CALENDAR_SERVICE_URL.rstrip("/")

        # Estadísticas de casos
        case_stats = _get(f"{matter_url}/cases/stats/", auth) or {}

        # Estadísticas de facturación
        billing_stats = _get(f"{billing_url}/invoices/stats/", auth) or {}

        # Estadísticas de tiempo
        time_stats = _get(f"{time_url}/time-entries/stats/", auth) or {}

        # Estadísticas de calendario
        calendar_stats = _get(f"{calendar_url}/events/stats/", auth) or {}

        return Response({
            "cases": {
                "total": case_stats.get("total", 0),
                "open": case_stats.get("open", 0),
                "closed": case_stats.get("closed", 0),
                "urgent": case_stats.get("urgent", 0),
                "by_status": case_stats.get("by_status", {}),
                "by_type": case_stats.get("by_type", {}),
            },
            "billing": {
                "total": billing_stats.get("total", 0),
                "draft": billing_stats.get("draft", 0),
                "sent": billing_stats.get("sent", 0),
                "paid": billing_stats.get("paid", 0),
                "overdue": billing_stats.get("overdue", 0),
                "total_billed": billing_stats.get("total_billed", "0.00"),
                "total_paid": billing_stats.get("total_paid", "0.00"),
                "total_pending": billing_stats.get("total_pending", "0.00"),
            },
            "time": {
                "total_entries": time_stats.get("total_entries", 0),
                "total_hours": time_stats.get("total_hours", 0),
                "billable_hours": time_stats.get("billable_hours", 0),
                "billable_amount": time_stats.get("billable_amount", 0),
            },
            "calendar": {
                "total": calendar_stats.get("total", 0),
                "upcoming": calendar_stats.get("upcoming", 0),
                "overdue": calendar_stats.get("overdue", 0),
                "completed": calendar_stats.get("completed", 0),
                "legal_deadlines": calendar_stats.get("legal_deadlines", 0),
                "critical": calendar_stats.get("critical", 0),
            },
        })


@extend_schema(summary="Cumplimiento de plazos", description="Porcentaje de plazos legales cumplidos vs vencidos.")
class DeadlineComplianceView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        auth = request.META.get("HTTP_AUTHORIZATION", "")
        calendar_url = settings.CALENDAR_SERVICE_URL.rstrip("/")

        stats = _get(f"{calendar_url}/events/stats/", auth) or {}
        completed = int(stats.get("completed", 0))
        overdue = int(stats.get("overdue", 0))
        legal = int(stats.get("legal_deadlines", 0))
        total = completed + overdue

        compliance_rate = round((completed / total * 100), 1) if total > 0 else 0.0

        return Response({
            "total_deadlines": legal,
            "completed": completed,
            "overdue": overdue,
            "compliance_rate": compliance_rate,
        })
