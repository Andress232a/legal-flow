import logging

import requests
from django.conf import settings
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema

logger = logging.getLogger(__name__)

REQUEST_TIMEOUT = 8


def _count_from_service(url: str, authorization: str) -> int | None:
    try:
        r = requests.get(
            url,
            headers={"Authorization": authorization},
            params={"page_size": 1},
            timeout=REQUEST_TIMEOUT,
        )
        if not r.ok:
            return None
        data = r.json()
        if isinstance(data, dict) and "count" in data:
            return int(data["count"])
        if isinstance(data, list):
            return len(data)
        return None
    except requests.RequestException:
        logger.exception("Analytics: fallo al consultar %s", url)
        return None


@extend_schema(summary="Resumen de KPIs", description="Agrega conteos desde los demás microservicios respetando el JWT.")
class KPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        auth = request.META.get("HTTP_AUTHORIZATION", "")
        base = {
            "cases": _count_from_service(
                f"{settings.MATTER_SERVICE_URL.rstrip('/')}/cases/",
                auth,
            ),
            "documents": _count_from_service(
                f"{settings.DOCUMENT_SERVICE_URL.rstrip('/')}/documents/",
                auth,
            ),
            "time_entries": _count_from_service(
                f"{settings.TIME_SERVICE_URL.rstrip('/')}/time-entries/",
                auth,
            ),
            "invoices": _count_from_service(
                f"{settings.BILLING_SERVICE_URL.rstrip('/')}/invoices/",
                auth,
            ),
            "calendar_events": _count_from_service(
                f"{settings.CALENDAR_SERVICE_URL.rstrip('/')}/events/",
                auth,
            ),
        }
        return Response(base)
