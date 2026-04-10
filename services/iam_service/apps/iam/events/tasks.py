import logging

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(name="process_iam_event")
def process_iam_event(event: dict):
    """Procesa eventos IAM entrantes de otros servicios."""
    event_type = event.get("event_type", "unknown")
    logger.info("Procesando evento IAM: %s", event_type)

    handlers = {
        "case.created": _handle_case_created,
    }

    handler = handlers.get(event_type)
    if handler:
        handler(event["payload"])
    else:
        logger.warning("Evento no manejado: %s", event_type)


def _handle_case_created(payload: dict):
    """Cuando se crea un caso, se pueden asignar permisos automáticos."""
    logger.info(
        "Caso creado: %s — asignación automática de permisos pendiente",
        payload.get("case_id"),
    )
