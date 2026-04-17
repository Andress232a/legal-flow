from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()


class Command(BaseCommand):
    help = "Crea el superusuario admin si no existe"

    def handle(self, *args, **options):
        if User.objects.filter(username="admin").exists():
            self.stdout.write("Superusuario admin ya existe.")
            return
        u = User.objects.create_superuser(
            username="admin",
            email="admin@legalflow.com",
            password="Admin1234!",
        )
        u.user_type = "admin"
        u.first_name = "Administrador"
        u.last_name = "Sistema"
        u.save()
        self.stdout.write(self.style.SUCCESS("Superusuario admin creado: admin / Admin1234!"))
