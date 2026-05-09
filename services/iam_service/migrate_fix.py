#!/usr/bin/env python
import os
import django
from django.core.management import call_command
from django.db import connection

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

try:
    call_command('migrate', '--noinput', verbosity=2)
    print("✓ Migraciones ejecutadas correctamente")
except Exception as e:
    if 'InconsistentMigrationHistory' in str(e):
        print("⚠ Conflicto de migraciones detectado, limpiando...")
        with connection.cursor() as cursor:
            cursor.execute("DELETE FROM django_migrations WHERE app='admin' AND name='0001_initial'")
            connection.commit()
        print("✓ Registros limpios, reintentando...")
        call_command('migrate', '--noinput', verbosity=2)
    else:
        raise
