"""
Cliente HTTP para comunicarse con el IAM Service.
Verifica permisos de usuario antes de permitir operaciones sobre documentos.
"""

import logging
import requests
from django.conf import settings

logger = logging.getLogger(__name__)

IAM_CHECK_PERMISSION_URL = f"{settings.IAM_SERVICE_URL}/api/check-permission/"

REQUEST_TIMEOUT = 5


def check_permission(user_id: str, action: str, resource_type: str = "document",
                     resource_id: str = None) -> bool:
    """
    Consulta al IAM Service si el usuario tiene permiso para la acción.
    Retorna True si está permitido, False en caso contrario.
    En caso de error de comunicación, deniega el acceso (fail-closed).
    """
    payload = {
        "user_id": str(user_id),
        "action": action,
        "resource_type": resource_type,
    }
    if resource_id:
        payload["resource_id"] = str(resource_id)

    try:
        response = requests.post(
            IAM_CHECK_PERMISSION_URL,
            json=payload,
            timeout=REQUEST_TIMEOUT,
            headers={"Host": "localhost", "Content-Type": "application/json"},
        )
        response.raise_for_status()
        data = response.json()
        allowed = data.get("allowed", False)
        if not allowed:
            logger.info(
                "Permiso denegado: user=%s action=%s resource=%s reason=%s",
                user_id, action, resource_type, data.get("reason"),
            )
        return allowed
    except requests.Timeout:
        logger.error("Timeout al consultar IAM Service para user=%s", user_id)
        return False
    except requests.RequestException:
        logger.exception("Error comunicándose con IAM Service")
        return False
