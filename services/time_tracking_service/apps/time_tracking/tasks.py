"""
Tareas Celery para publicar eventos del Time Tracking Service.
"""
import logging
from config.celery import app

logger = logging.getLogger(__name__)


@app.task(bind=True, max_retries=3)
def publish_event(self, event_type: str, payload: dict):
    """Publica un evento al broker para consumo de otros servicios."""
    try:
        logger.info("Event published: %s — %s", event_type, payload)
        # En producción aquí se enviaría a una cola específica por servicio
    except Exception as exc:
        logger.error("Failed to publish event %s: %s", event_type, exc)
        raise self.retry(exc=exc, countdown=5)
