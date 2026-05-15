"""Valida acceso al caso vía Matter Service usando el JWT del usuario."""

import logging
import uuid

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

TIMEOUT = 10


def user_has_case_access(case_id, authorization_header: str) -> bool:
    try:
        uuid.UUID(str(case_id))
    except ValueError:
        return False
    url = f"{settings.MATTER_SERVICE_URL.rstrip('/')}/cases/{case_id}/"
    try:
        r = requests.get(
            url,
            headers={"Authorization": authorization_header},
            timeout=TIMEOUT,
        )
        return r.status_code == 200
    except requests.RequestException:
        logger.exception("Portal: no se pudo validar acceso al caso %s", case_id)
        return False
