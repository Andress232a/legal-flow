"""
Cliente HTTP para verificar permisos contra el IAM Service.
Fail-closed: si el IAM no responde, se deniega el acceso.
"""
import logging

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

IAM_TIMEOUT = 3  # segundos


def check_permission(user_id: str, action: str, resource_type: str = "time_entry", resource_id: str = None) -> bool:
    """
    Verifica si user_id puede realizar action sobre resource_type[:resource_id].
    Retorna True si permitido, False si denegado o error.
    """
    url = f"{settings.IAM_SERVICE_URL}/check-permission/"
    payload = {
        "user_id": str(user_id),
        "action": action,
        "resource_type": resource_type,
    }
    if resource_id:
        payload["resource_id"] = str(resource_id)

    try:
        resp = requests.post(
            url, json=payload, timeout=IAM_TIMEOUT,
            headers={"Host": "localhost", "Content-Type": "application/json"},
        )
        if resp.status_code == 200:
            return resp.json().get("allowed", False)
        logger.warning("IAM check-permission returned %s", resp.status_code)
        return False
    except requests.RequestException as e:
        logger.error("IAM Service unreachable: %s — failing closed", e)
        return False
