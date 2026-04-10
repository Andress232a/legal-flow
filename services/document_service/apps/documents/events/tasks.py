import logging

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(name="process_document_event")
def process_document_event(event: dict):
    """Procesa eventos entrantes relevantes para el Document Service."""
    event_type = event.get("event_type", "unknown")
    logger.info("Procesando evento en Document Service: %s", event_type)

    handlers = {
        "permission.revoked": _handle_permission_revoked,
        "case.closed": _handle_case_closed,
    }

    handler = handlers.get(event_type)
    if handler:
        handler(event["payload"])
    else:
        logger.warning("Evento no manejado: %s", event_type)


def _handle_permission_revoked(payload: dict):
    """
    Cuando se revoca un permiso, invalidar cachés de permisos
    para forzar re-validación en próximos accesos.
    """
    logger.info(
        "Permiso revocado: role=%s permission=%s",
        payload.get("role_name"),
        payload.get("permission_id"),
    )


def _handle_case_closed(payload: dict):
    """Cuando se cierra un caso, archivar documentos asociados."""
    from apps.documents.models import Document

    case_id = payload.get("case_id")
    if case_id:
        updated = Document.objects.filter(
            case_id=case_id,
            status__in=["draft", "review", "approved"],
        ).update(status="archived")
        logger.info("Caso %s cerrado: %d documentos archivados", case_id, updated)
