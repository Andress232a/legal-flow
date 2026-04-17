"""
Autenticación JWT para el Time Tracking Service.
Idéntica al Matter Service: valida tokens del IAM Service con PyJWT
y crea un VirtualUser con el user_id UUID del payload.
"""
import logging

from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed

try:
    import jwt as pyjwt
except ImportError:
    pyjwt = None

from django.conf import settings

logger = logging.getLogger(__name__)


class VirtualUser:
    def __init__(self, user_id: str, user_name: str = ""):
        self.id = user_id
        self.pk = user_id
        self.user_name = user_name
        self.is_authenticated = True
        self.is_active = True
        self.is_anonymous = False

    def __str__(self):
        return f"VirtualUser({self.id})"


class IamJWTAuthentication(BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.META.get("HTTP_AUTHORIZATION", "")
        if not auth_header.startswith("Bearer "):
            return None

        token = auth_header.split(" ", 1)[1].strip()
        if not token:
            return None

        try:
            payload = pyjwt.decode(
                token,
                settings.SECRET_KEY,
                algorithms=["HS256"],
                options={"verify_iat": False},
            )
            user_id = payload.get("user_id")
            if not user_id:
                raise AuthenticationFailed("Token inválido: falta user_id.")
            user_name = payload.get("username", "")
            return (VirtualUser(user_id, user_name), token)
        except pyjwt.ExpiredSignatureError:
            raise AuthenticationFailed("El token ha expirado.")
        except pyjwt.InvalidTokenError as e:
            raise AuthenticationFailed(f"Token inválido: {e}")
