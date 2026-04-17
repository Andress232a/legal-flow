import logging
import requests
from django.conf import settings

logger = logging.getLogger(__name__)
IAM_CHECK_PERMISSION_URL = f"{settings.IAM_SERVICE_URL}/check-permission/"
REQUEST_TIMEOUT = 5


def check_permission(user_id, action, resource_type="invoice", resource_id=None):
    payload = {"user_id": str(user_id), "action": action, "resource_type": resource_type}
    if resource_id:
        payload["resource_id"] = str(resource_id)
    try:
        response = requests.post(
            IAM_CHECK_PERMISSION_URL, json=payload, timeout=REQUEST_TIMEOUT,
            headers={"Content-Type": "application/json"},
        )
        response.raise_for_status()
        data = response.json()
        allowed = data.get("allowed", False)
        if not allowed:
            logger.info("Permiso denegado: user=%s action=%s resource=%s", user_id, action, resource_type)
        return allowed
    except requests.Timeout:
        logger.error("Timeout consultando IAM para user=%s", user_id)
        return False
    except requests.RequestException:
        logger.exception("Error comunicándose con IAM Service")
        return False
