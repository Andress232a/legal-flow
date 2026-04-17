import logging

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(name="process_matter_event")
def process_matter_event(event: dict):
    """Procesa eventos entrantes de otros servicios relevantes para los casos."""
    event_type = event.get("event_type", "unknown")
    logger.info("Procesando evento Matter: %s", event_type)

    handlers = {
        "user.created": _handle_user_created,
        "permission.revoked": _handle_permission_revoked,
    }

    handler = handlers.get(event_type)
    if handler:
        handler(event.get("payload", {}))
    else:
        logger.debug("Evento no manejado en matter_service: %s", event_type)


def _handle_user_created(payload: dict):
    """Cuando se crea un nuevo usuario, log informativo."""
    logger.info(
        "Nuevo usuario registrado: %s — disponible para asignar a casos",
        payload.get("username"),
    )


def _handle_permission_revoked(payload: dict):
    """Cuando se revocan permisos de un rol, log de alerta."""
    logger.warning(
        "Permiso revocado para rol %s — puede afectar el acceso a casos",
        payload.get("role_name"),
    )
