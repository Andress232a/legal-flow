"""
Cliente HTTP para sincronizar fechas de casos con el Calendar Service.
Cuando se añade/completa/elimina una CaseDate, se refleja automáticamente
como CalendarEvent en el Calendar Service.
"""
import logging
import requests
from django.conf import settings

logger = logging.getLogger(__name__)

CALENDAR_URL = f"{settings.CALENDAR_SERVICE_URL}/api/events/"
TIMEOUT = 5

# Mapeo de date_type (Matter) → event_type (Calendar)
DATE_TYPE_MAP = {
    "hearing":      "hearing",
    "deadline":     "deadline",
    "filing":       "filing",
    "trial":        "trial",
    "appeal":       "appeal",
    "notification": "notification",
    "meeting":      "meeting",
    "other":        "other",
}

# Fechas críticas van con prioridad alta en el calendario
PRIORITY_MAP = {
    True:  "high",
    False: "medium",
}


def _get_token_for_service():
    """
    Obtiene un token JWT del IAM Service usando credenciales de servicio.
    El Matter Service actúa como servicio interno al llamar al Calendar Service.
    """
    try:
        iam_url = f"{settings.IAM_SERVICE_URL}/api/token/"
        resp = requests.post(
            iam_url,
            json={"username": "admin", "password": "Admin123!"},
            headers={"Content-Type": "application/json", "Host": "localhost"},
            timeout=TIMEOUT,
        )
        resp.raise_for_status()
        return resp.json().get("access", "")
    except Exception:
        logger.exception("No se pudo obtener token para sincronizar con Calendar Service")
        return ""


def create_calendar_event(case_date, assigned_to_id: str) -> str | None:
    """
    Crea un CalendarEvent a partir de una CaseDate.
    Devuelve el ID del evento creado, o None si falla.
    """
    token = _get_token_for_service()
    if not token:
        return None

    payload = {
        "title": case_date.title,
        "description": case_date.notes or case_date.description or "",
        "event_type": DATE_TYPE_MAP.get(case_date.date_type, "other"),
        "priority": PRIORITY_MAP.get(case_date.is_critical, "medium"),
        "start_datetime": case_date.scheduled_date.isoformat(),
        "case_id": str(case_date.case.id),
        "case_number": case_date.case.case_number,
        "assigned_to": str(assigned_to_id),
        "is_legal_deadline": case_date.is_critical,
    }

    try:
        resp = requests.post(
            CALENDAR_URL,
            json=payload,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {token}",
                "Host": "localhost",
            },
            timeout=TIMEOUT,
        )
        resp.raise_for_status()
        event_id = resp.json().get("id")
        logger.info("CalendarEvent creado: %s para CaseDate %s", event_id, case_date.id)
        return event_id
    except Exception:
        logger.exception("Error creando CalendarEvent para CaseDate %s", case_date.id)
        return None


def complete_calendar_event(event_id: str) -> bool:
    """Marca como completado el CalendarEvent asociado."""
    token = _get_token_for_service()
    if not token or not event_id:
        return False
    try:
        resp = requests.post(
            f"{CALENDAR_URL}{event_id}/complete/",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {token}",
                "Host": "localhost",
            },
            timeout=TIMEOUT,
        )
        resp.raise_for_status()
        return True
    except Exception:
        logger.exception("Error completando CalendarEvent %s", event_id)
        return False


def delete_calendar_event(event_id: str) -> bool:
    """Elimina el CalendarEvent asociado."""
    token = _get_token_for_service()
    if not token or not event_id:
        return False
    try:
        resp = requests.delete(
            f"{CALENDAR_URL}{event_id}/",
            headers={
                "Authorization": f"Bearer {token}",
                "Host": "localhost",
            },
            timeout=TIMEOUT,
        )
        return resp.status_code in (200, 204)
    except Exception:
        logger.exception("Error eliminando CalendarEvent %s", event_id)
        return False
