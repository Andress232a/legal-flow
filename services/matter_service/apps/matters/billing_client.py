import logging
import requests
from django.conf import settings

logger = logging.getLogger(__name__)

BILLING_SERVICE_URL = getattr(settings, "BILLING_SERVICE_URL", "http://billing_service:8005")


def notify_case_closed(case_id: str, client_id: str, lawyer_id: str,
                        case_number: str, client_name: str) -> bool:
    """Llama al webhook de Billing Service para generar factura al cerrar un caso."""
    url = f"{BILLING_SERVICE_URL}/api/webhooks/case-closed/"
    payload = {
        "case_id": case_id,
        "client_id": client_id,
        "lawyer_id": lawyer_id,
        "case_number": case_number,
        "client_name": client_name,
    }
    try:
        resp = requests.post(url, json=payload, timeout=5)
        resp.raise_for_status()
        logger.info("Billing Service notificado del cierre del caso %s", case_number)
        return True
    except Exception as e:
        logger.warning("No se pudo notificar a Billing Service del caso %s: %s", case_number, e)
        return False
