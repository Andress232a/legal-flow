from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView

from apps.iam.api.views import (
    UserViewSet,
    RoleViewSet,
    PermissionViewSet,
    CheckPermissionView,
)


class LegalFlowTokenSerializer(TokenObtainPairSerializer):
    """
    Extiende el JWT para incluir user_type y username en el payload.
    Esto permite que los microservicios (Matter, Time Tracking)
    conozcan el tipo de usuario sin consultar al IAM.
    """
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["user_type"] = user.user_type
        token["username"] = user.username
        token["first_name"] = user.first_name
        token["last_name"] = user.last_name
        return token


class LegalFlowTokenView(TokenObtainPairView):
    serializer_class = LegalFlowTokenSerializer


router = DefaultRouter()
router.register(r"users", UserViewSet, basename="user")
router.register(r"roles", RoleViewSet, basename="role")
router.register(r"permissions", PermissionViewSet, basename="permission")

urlpatterns = [
    path("", include(router.urls)),
    path("check-permission/", CheckPermissionView.as_view(), name="check-permission"),
    path("token/", LegalFlowTokenView.as_view(), name="token-obtain-pair"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
]
