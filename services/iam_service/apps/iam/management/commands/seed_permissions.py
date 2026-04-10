from django.core.management.base import BaseCommand

from apps.iam.models import Permission, Role, RolePermission


PERMISSIONS = [
    ("case.create", "Crear caso", "case", "create"),
    ("case.read", "Leer caso", "case", "read"),
    ("case.update", "Actualizar caso", "case", "update"),
    ("case.delete", "Eliminar caso", "case", "delete"),
    ("document.create", "Subir documento", "document", "create"),
    ("document.read", "Leer documento", "document", "read"),
    ("document.update", "Actualizar documento", "document", "update"),
    ("document.delete", "Eliminar documento", "document", "delete"),
    ("document.download", "Descargar documento", "document", "download"),
    ("invoice.create", "Crear factura", "invoice", "create"),
    ("invoice.read", "Leer factura", "invoice", "read"),
    ("invoice.update", "Actualizar factura", "invoice", "update"),
    ("invoice.approve", "Aprobar factura", "invoice", "approve"),
    ("time_entry.create", "Crear entrada de tiempo", "time_entry", "create"),
    ("time_entry.read", "Leer entrada de tiempo", "time_entry", "read"),
    ("time_entry.update", "Actualizar entrada de tiempo", "time_entry", "update"),
    ("time_entry.delete", "Eliminar entrada de tiempo", "time_entry", "delete"),
    ("user.create", "Crear usuario", "user", "create"),
    ("user.read", "Leer usuario", "user", "read"),
    ("user.update", "Actualizar usuario", "user", "update"),
    ("user.delete", "Eliminar usuario", "user", "delete"),
    ("role.create", "Crear rol", "role", "create"),
    ("role.read", "Leer rol", "role", "read"),
    ("role.update", "Actualizar rol", "role", "update"),
    ("role.delete", "Eliminar rol", "role", "delete"),
    ("report.read", "Leer reportes", "report", "read"),
    ("report.export", "Exportar reportes", "report", "export"),
]

ROLES = {
    "Administrador": {"system": True, "permissions": "*"},
    "Abogado Senior": {
        "system": True,
        "permissions": [
            "case.create", "case.read", "case.update",
            "document.create", "document.read", "document.update", "document.download",
            "time_entry.create", "time_entry.read", "time_entry.update",
            "invoice.read",
            "report.read",
        ],
    },
    "Abogado Junior": {
        "system": True,
        "permissions": [
            "case.read",
            "document.read", "document.download",
            "time_entry.create", "time_entry.read", "time_entry.update",
        ],
    },
    "Asistente Legal": {
        "system": True,
        "permissions": [
            "case.read",
            "document.create", "document.read", "document.download",
            "time_entry.create", "time_entry.read",
        ],
    },
    "Cliente": {
        "system": True,
        "permissions": [
            "case.read",
            "document.read", "document.download",
            "invoice.read",
        ],
    },
}


class Command(BaseCommand):
    help = "Genera los permisos y roles iniciales del sistema LegalFlow"

    def handle(self, *args, **options):
        self.stdout.write("Creando permisos...")
        perm_objects = {}
        for codename, name, resource_type, action in PERMISSIONS:
            perm, created = Permission.objects.get_or_create(
                codename=codename,
                defaults={
                    "name": name,
                    "resource_type": resource_type,
                    "action": action,
                },
            )
            perm_objects[codename] = perm
            status = "creado" if created else "existente"
            self.stdout.write(f"  {codename}: {status}")

        all_perms = list(perm_objects.values())

        self.stdout.write("\nCreando roles...")
        for role_name, config in ROLES.items():
            role, created = Role.objects.get_or_create(
                name=role_name,
                defaults={
                    "is_system_role": config["system"],
                    "description": f"Rol de sistema: {role_name}",
                },
            )
            status = "creado" if created else "existente"
            self.stdout.write(f"  {role_name}: {status}")

            if config["permissions"] == "*":
                perms_to_assign = all_perms
            else:
                perms_to_assign = [perm_objects[c] for c in config["permissions"]]

            for perm in perms_to_assign:
                RolePermission.objects.get_or_create(role=role, permission=perm)

        self.stdout.write(self.style.SUCCESS("\nPermisos y roles inicializados correctamente."))
