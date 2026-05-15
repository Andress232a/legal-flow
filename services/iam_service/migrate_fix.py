#!/usr/bin/env python
import os
import django
from django.core.management import call_command
from django.db import connection

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

print("Limpiando tabla de migraciones...")
with connection.cursor() as cursor:
    cursor.execute("TRUNCATE TABLE django_migrations")

print("✓ Tabla limpia")
print("Ejecutando migraciones desde cero...")
call_command('migrate', '--noinput', verbosity=2)
print("✓ Migraciones completadas")
