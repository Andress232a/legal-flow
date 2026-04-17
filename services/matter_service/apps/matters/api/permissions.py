from rest_framework.permissions import BasePermission
from apps.matters.iam_client import check_permission


class CanReadCases(BasePermission):
    """Verifica permiso de lectura de casos contra el IAM Service."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return check_permission(request.user.id, "read", "case")


class CanCreateCases(BasePermission):
    """Verifica permiso de creación de casos contra el IAM Service."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return check_permission(request.user.id, "create", "case")


class CanUpdateCases(BasePermission):
    """Verifica permiso de actualización de casos contra el IAM Service."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return check_permission(request.user.id, "update", "case")


class CanDeleteCases(BasePermission):
    """Verifica permiso de eliminación de casos contra el IAM Service."""

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return check_permission(request.user.id, "delete", "case")
