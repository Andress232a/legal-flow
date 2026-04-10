from django.contrib.auth import get_user_model
from django.db.models import Q
from rest_framework import viewsets, status, generics
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema, extend_schema_view

from apps.iam.models import Role, Permission, RolePermission, UserRole
from apps.iam.api.serializers import (
    UserListSerializer,
    UserCreateSerializer,
    UserUpdateSerializer,
    ChangePasswordSerializer,
    RoleListSerializer,
    RoleDetailSerializer,
    PermissionSerializer,
    RolePermissionSerializer,
    UserRoleSerializer,
    CheckPermissionSerializer,
    CheckPermissionResponseSerializer,
)
from apps.iam.api.permissions import IsAdmin, IsAdminOrReadOnly, IsSelfOrAdmin
from apps.iam.events.publisher import publish_event

User = get_user_model()


@extend_schema_view(
    list=extend_schema(summary="Listar usuarios"),
    retrieve=extend_schema(summary="Detalle de usuario"),
    create=extend_schema(summary="Crear usuario"),
    partial_update=extend_schema(summary="Actualizar usuario parcialmente"),
)
class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.prefetch_related("user_roles__role").all()
    http_method_names = ["get", "post", "patch", "delete"]

    def get_serializer_class(self):
        if self.action == "create":
            return UserCreateSerializer
        if self.action in ("partial_update", "update"):
            return UserUpdateSerializer
        return UserListSerializer

    def get_permissions(self):
        if self.action == "create":
            return [IsAdmin()]
        if self.action in ("partial_update", "update", "destroy"):
            return [IsAuthenticated(), IsSelfOrAdmin()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        user = serializer.save()
        publish_event("user.created", {
            "user_id": str(user.id),
            "username": user.username,
            "email": user.email,
            "user_type": user.user_type,
        })

    @extend_schema(summary="Cambiar contraseña")
    @action(detail=True, methods=["post"], serializer_class=ChangePasswordSerializer)
    def change_password(self, request, pk=None):
        user = self.get_object()
        serializer = ChangePasswordSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user.set_password(serializer.validated_data["new_password"])
        user.save()
        return Response({"detail": "Contraseña actualizada correctamente."})

    @extend_schema(summary="Obtener perfil del usuario autenticado")
    @action(detail=False, methods=["get"])
    def me(self, request):
        serializer = UserListSerializer(request.user)
        return Response(serializer.data)

    @extend_schema(summary="Asignar rol a usuario")
    @action(detail=True, methods=["post"], serializer_class=UserRoleSerializer)
    def assign_role(self, request, pk=None):
        user = self.get_object()
        data = request.data.copy()
        data["user"] = user.id
        data["assigned_by"] = request.user.id
        serializer = UserRoleSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @extend_schema(summary="Listar roles del usuario")
    @action(detail=True, methods=["get"])
    def roles(self, request, pk=None):
        user = self.get_object()
        user_roles = UserRole.objects.filter(user=user).select_related("role")
        serializer = UserRoleSerializer(user_roles, many=True)
        return Response(serializer.data)


@extend_schema_view(
    list=extend_schema(summary="Listar roles"),
    retrieve=extend_schema(summary="Detalle de rol"),
    create=extend_schema(summary="Crear rol"),
    partial_update=extend_schema(summary="Actualizar rol"),
)
class RoleViewSet(viewsets.ModelViewSet):
    queryset = Role.objects.prefetch_related("role_permissions__permission").all()
    http_method_names = ["get", "post", "patch", "delete"]

    def get_serializer_class(self):
        if self.action == "retrieve":
            return RoleDetailSerializer
        return RoleListSerializer

    def get_permissions(self):
        if self.action in ("create", "partial_update", "update", "destroy"):
            return [IsAdmin()]
        return [IsAdminOrReadOnly()]

    def perform_destroy(self, instance):
        if instance.is_system_role:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("No se pueden eliminar roles de sistema.")
        instance.delete()

    @extend_schema(summary="Asignar permiso al rol")
    @action(detail=True, methods=["post"], serializer_class=RolePermissionSerializer)
    def assign_permission(self, request, pk=None):
        role = self.get_object()
        data = request.data.copy()
        data["granted_by"] = request.user.id
        serializer = RolePermissionSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        serializer.save(role=role)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @extend_schema(summary="Revocar permiso del rol")
    @action(detail=True, methods=["post"], url_path="revoke-permission")
    def revoke_permission(self, request, pk=None):
        role = self.get_object()
        permission_id = request.data.get("permission_id")
        if not permission_id:
            return Response(
                {"detail": "Se requiere permission_id."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        deleted, _ = RolePermission.objects.filter(
            role=role, permission_id=permission_id
        ).delete()
        if deleted:
            publish_event("permission.revoked", {
                "role_id": str(role.id),
                "role_name": role.name,
                "permission_id": str(permission_id),
                "revoked_by": str(request.user.id),
            })
            return Response({"detail": "Permiso revocado."})
        return Response(
            {"detail": "Permiso no encontrado en el rol."},
            status=status.HTTP_404_NOT_FOUND,
        )


@extend_schema_view(
    list=extend_schema(summary="Listar permisos"),
    retrieve=extend_schema(summary="Detalle de permiso"),
    create=extend_schema(summary="Crear permiso"),
)
class PermissionViewSet(viewsets.ModelViewSet):
    queryset = Permission.objects.all()
    serializer_class = PermissionSerializer
    http_method_names = ["get", "post", "patch", "delete"]
    filterset_fields = ["resource_type", "action"]
    search_fields = ["codename", "name"]

    def get_permissions(self):
        if self.action in ("create", "partial_update", "update", "destroy"):
            return [IsAdmin()]
        return [IsAdminOrReadOnly()]


class CheckPermissionView(APIView):
    """
    Endpoint interno para verificar si un usuario tiene permiso
    para realizar una acción sobre un recurso.
    Usado por otros microservicios para autorización.
    """
    permission_classes = [AllowAny]

    @extend_schema(
        request=CheckPermissionSerializer,
        responses={200: CheckPermissionResponseSerializer},
        summary="Verificar permiso de usuario",
        description="Verifica si un usuario puede realizar una acción sobre un recurso. "
                    "Endpoint interno para comunicación entre microservicios.",
    )
    def post(self, request):
        serializer = CheckPermissionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        user_id = data["user_id"]
        action_name = data["action"]
        resource_type = data["resource_type"]
        resource_id = data.get("resource_id")

        try:
            user = User.objects.get(id=user_id, is_active=True)
        except User.DoesNotExist:
            return Response({
                "allowed": False,
                "user_id": str(user_id),
                "action": action_name,
                "resource_type": resource_type,
                "resource_id": str(resource_id) if resource_id else None,
                "reason": "Usuario no encontrado o inactivo.",
            })

        if user.user_type == "admin":
            return Response({
                "allowed": True,
                "user_id": str(user_id),
                "action": action_name,
                "resource_type": resource_type,
                "resource_id": str(resource_id) if resource_id else None,
                "reason": "Administrador tiene acceso total.",
            })

        codename = f"{resource_type}.{action_name}"

        # Buscar roles del usuario (globales y con scope específico)
        user_roles_query = UserRole.objects.filter(user=user)

        if resource_id:
            user_roles_query = user_roles_query.filter(
                Q(scope_type="", scope_id__isnull=True)
                | Q(scope_type=resource_type, scope_id=resource_id)
            )

        role_ids = user_roles_query.values_list("role_id", flat=True)

        # Buscar el permiso en los roles asignados
        has_permission = RolePermission.objects.filter(
            role_id__in=role_ids,
            permission__codename=codename,
        ).exists()

        # Buscar también en roles padre (herencia)
        if not has_permission:
            parent_role_ids = Role.objects.filter(
                id__in=role_ids, parent__isnull=False
            ).values_list("parent_id", flat=True)

            if parent_role_ids:
                has_permission = RolePermission.objects.filter(
                    role_id__in=parent_role_ids,
                    permission__codename=codename,
                ).exists()

        return Response({
            "allowed": has_permission,
            "user_id": str(user_id),
            "action": action_name,
            "resource_type": resource_type,
            "resource_id": str(resource_id) if resource_id else None,
            "reason": "Permiso concedido." if has_permission else "Permiso denegado.",
        })
