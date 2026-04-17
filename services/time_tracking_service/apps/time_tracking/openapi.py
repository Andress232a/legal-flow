"""
Extensiones de drf-spectacular para el Time Tracking Service.
Registra IamJWTAuthentication para que Swagger muestre el candado
y el botón Authorize con Bearer token.
"""
from drf_spectacular.extensions import OpenApiAuthenticationExtension


class IamJWTAuthenticationScheme(OpenApiAuthenticationExtension):
    target_class = "apps.time_tracking.authentication.IamJWTAuthentication"
    name = "BearerAuth"

    def get_security_definition(self, auto_schema):
        return {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
            "description": "Token JWT emitido por el IAM Service. Obtén uno en POST /api/token/ del IAM Service (puerto 8001).",
        }
