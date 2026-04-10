"""
Autenticación JWT para el Document Service.
Valida tokens JWT emitidos por el IAM Service y extrae la información del usuario.
Como este microservicio no tiene modelo User propio, creamos un objeto
usuario ligero a partir de los claims del token.
"""

import jwt
from django.conf import settings
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed


class ServiceUser:
    """Objeto usuario ligero que representa un usuario autenticado vía JWT."""

    def __init__(self, user_id, claims=None):
        self.id = user_id
        self.pk = user_id
        self.claims = claims or {}
        self.is_authenticated = True
        self.is_active = True

    @property
    def user_type(self):
        return self.claims.get("user_type", "")

    @property
    def username(self):
        return self.claims.get("username", "")

    def __str__(self):
        return f"ServiceUser({self.id})"


class ServiceJWTAuthentication(BaseAuthentication):
    """
    Autenticación JWT que decodifica el token sin necesidad de un modelo User local.
    Confía en los tokens firmados por el IAM Service.
    """

    def authenticate(self, request):
        auth_header = request.META.get("HTTP_AUTHORIZATION", "")
        if not auth_header.startswith("Bearer "):
            return None

        token = auth_header.split(" ", 1)[1]

        try:
            payload = jwt.decode(
                token,
                settings.SECRET_KEY,
                algorithms=["HS256"],
                options={"verify_exp": True},
            )
        except jwt.ExpiredSignatureError:
            raise AuthenticationFailed("Token expirado.")
        except jwt.InvalidTokenError:
            raise AuthenticationFailed("Token inválido.")

        user_id = payload.get("user_id")
        if not user_id:
            raise AuthenticationFailed("Token no contiene user_id.")

        user = ServiceUser(user_id=user_id, claims=payload)
        return (user, token)

    def authenticate_header(self, request):
        return "Bearer"
