from rest_framework.permissions import BasePermission


class IsAdmin(BasePermission):
    """Solo permite acceso a usuarios con user_type='admin'."""

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.user_type == "admin"
        )


class IsAdminOrReadOnly(BasePermission):
    """Admin tiene acceso total; el resto solo lectura."""

    def has_permission(self, request, view):
        if request.method in ("GET", "HEAD", "OPTIONS"):
            return request.user and request.user.is_authenticated
        return (
            request.user
            and request.user.is_authenticated
            and request.user.user_type == "admin"
        )


class IsSelfOrAdmin(BasePermission):
    """El usuario puede editarse a sí mismo, o un admin puede editar a cualquiera."""

    def has_object_permission(self, request, view, obj):
        return obj == request.user or request.user.user_type == "admin"
