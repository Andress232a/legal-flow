import json
import logging
from datetime import datetime, timezone

from celery import current_app

logger = logging.getLogger(__name__)


def publish_event(event_type: str, payload: dict):
    """
    Publica un evento al bus de eventos (Redis/Celery).
    Eventos del Document Service: document.uploaded, document.accessed
    """
    event = {
        "event_type": event_type,
        "payload": payload,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "source": "document_service",
    }

    try:
        current_app.send_task(
            "process_event",
            args=[event],
            queue="events",
        )
        logger.info("Evento publicado: %s", event_type)
    except Exception:
        logger.exception("Error publicando evento: %s", event_type)
        _fallback_publish(event)


def _fallback_publish(event: dict):
    """Publica directamente a Redis si Celery no está disponible."""
    try:
        from django.conf import settings
        import redis

        r = redis.from_url(settings.CELERY_BROKER_URL)
        r.publish("legalflow_events", json.dumps(event))
        logger.info("Evento publicado via Redis fallback: %s", event["event_type"])
    except Exception:
        logger.exception("Error en fallback de publicación de evento")
