#!/usr/bin/env python
import os
import django
from django.conf import settings
from django.core.management import call_command
from django.db import connection, connections

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

db_name = settings.DATABASES['default']['NAME']

print("Borrando y recreando base de datos...")
with connection.cursor() as cursor:
    cursor.execute(f"DROP DATABASE IF EXISTS `{db_name}`")
    cursor.execute(f"CREATE DATABASE `{db_name}`")

# Reconectar
connections.close_all()

print("Ejecutando migraciones...")
call_command('migrate', '--noinput', verbosity=2)

print("Creando usuario admin...")
call_command('seed_admin')
print("✓ Usuario admin creado")
