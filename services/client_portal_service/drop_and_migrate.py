#!/usr/bin/env python
import os
import django
from django.core.management import call_command

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

print("Limpiando base de datos...")
call_command('flush', '--noinput')

print("Ejecutando migraciones...")
call_command('migrate', '--noinput', verbosity=2)
print("✓ Migraciones completadas")
