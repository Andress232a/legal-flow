#!/usr/bin/env python
import os
import django
from django.core.management import call_command
from django.db import connection

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

# Limpiar conflictos de migraciones
with connection.cursor() as cursor:
    cursor.execute("DELETE FROM django_migrations WHERE app='admin' AND name='0001_initial'")

print("✓ BD limpia de conflictos")
print("Ejecutando migraciones...")
call_command('migrate', '--noinput', verbosity=2)
print("✓ Migraciones completadas")
