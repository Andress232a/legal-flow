import uuid
from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """
    Usuario personalizado del sistema LegalFlow.
    Extiende AbstractUser para incluir campos específicos del dominio legal.
    """

    class UserType(models.TextChoices):
        ADMIN = "admin", "Administrador"
        LAWYER = "lawyer", "Abogado"
        ASSISTANT = "assistant", "Asistente Legal"
        CLIENT = "client", "Cliente"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user_type = models.CharField(
        max_length=20,
        choices=UserType.choices,
        default=UserType.LAWYER,
    )
    phone = models.CharField(max_length=20, blank=True)
    bar_number = models.CharField(
        max_length=50,
        blank=True,
        help_text="Número de colegiado (solo abogados)",
    )
    department = models.CharField(max_length=100, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "users"
        ordering = ["-created_at"]
        verbose_name = "Usuario"
        verbose_name_plural = "Usuarios"

    def __str__(self):
        return f"{self.get_full_name()} ({self.user_type})"


class Role(models.Model):
    """
    Roles del sistema que agrupan permisos.
    Soporta jerarquía de roles para herencia de permisos.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    is_system_role = models.BooleanField(
        default=False,
        help_text="Los roles de sistema no pueden ser eliminados",
    )
    parent = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="children",
        help_text="Rol padre para herencia de permisos",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "roles"
        ordering = ["name"]
        verbose_name = "Rol"
        verbose_name_plural = "Roles"

    def __str__(self):
        return self.name

    def get_all_permissions(self):
        """Retorna todos los permisos del rol, incluyendo los heredados del padre."""
        perms = set(self.permissions.values_list("id", flat=True))
        if self.parent:
            perms |= set(self.parent.get_all_permissions())
        return perms


class Permission(models.Model):
    """
    Permisos granulares del sistema.
    Definen acciones sobre recursos específicos.
    """

    class ResourceType(models.TextChoices):
        CASE = "case", "Caso"
        DOCUMENT = "document", "Documento"
        INVOICE = "invoice", "Factura"
        TIME_ENTRY = "time_entry", "Entrada de Tiempo"
        USER = "user", "Usuario"
        ROLE = "role", "Rol"
        CALENDAR = "calendar", "Calendario"
        REPORT = "report", "Reporte"

    class ActionType(models.TextChoices):
        CREATE = "create", "Crear"
        READ = "read", "Leer"
        UPDATE = "update", "Actualizar"
        DELETE = "delete", "Eliminar"
        DOWNLOAD = "download", "Descargar"
        ASSIGN = "assign", "Asignar"
        APPROVE = "approve", "Aprobar"
        EXPORT = "export", "Exportar"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    codename = models.CharField(
        max_length=100,
        unique=True,
        help_text="Identificador único: resource.action (ej: case.create)",
    )
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    resource_type = models.CharField(max_length=30, choices=ResourceType.choices)
    action = models.CharField(max_length=30, choices=ActionType.choices)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "permissions"
        ordering = ["resource_type", "action"]
        unique_together = ("resource_type", "action")
        verbose_name = "Permiso"
        verbose_name_plural = "Permisos"

    def __str__(self):
        return self.codename


class RolePermission(models.Model):
    """Relación muchos-a-muchos entre roles y permisos."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    role = models.ForeignKey(Role, on_delete=models.CASCADE, related_name="role_permissions")
    permission = models.ForeignKey(Permission, on_delete=models.CASCADE, related_name="role_permissions")
    granted_at = models.DateTimeField(auto_now_add=True)
    granted_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name="granted_role_permissions",
    )

    class Meta:
        db_table = "role_permissions"
        unique_together = ("role", "permission")
        verbose_name = "Permiso de Rol"
        verbose_name_plural = "Permisos de Roles"

    def __str__(self):
        return f"{self.role.name} -> {self.permission.codename}"


class UserRole(models.Model):
    """Asignación de roles a usuarios, con soporte para alcance por recurso."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="user_roles")
    role = models.ForeignKey(Role, on_delete=models.CASCADE, related_name="user_roles")
    scope_type = models.CharField(
        max_length=30,
        blank=True,
        help_text="Tipo de recurso al que aplica (ej: 'case' para un caso específico)",
    )
    scope_id = models.UUIDField(
        null=True,
        blank=True,
        help_text="ID del recurso al que aplica el rol (ej: ID de un caso)",
    )
    assigned_at = models.DateTimeField(auto_now_add=True)
    assigned_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name="assigned_user_roles",
    )

    class Meta:
        db_table = "user_roles"
        unique_together = ("user", "role", "scope_type", "scope_id")
        verbose_name = "Rol de Usuario"
        verbose_name_plural = "Roles de Usuarios"

    def __str__(self):
        scope = f" [{self.scope_type}:{self.scope_id}]" if self.scope_type else ""
        return f"{self.user.username} -> {self.role.name}{scope}"
