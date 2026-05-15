#!/usr/bin/env python
import os
import django
from django.core.management import call_command
from django.db import connection

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

print("Limpiando base de datos...")
call_command('flush', '--noinput')

print("Limpiando registro migraciones...")
with connection.cursor() as cursor:
    cursor.execute("TRUNCATE TABLE `django_migrations`")

print("Ejecutando migraciones...")
call_command('migrate', '--noinput', verbosity=2)
print("✓ Migraciones completadas")
