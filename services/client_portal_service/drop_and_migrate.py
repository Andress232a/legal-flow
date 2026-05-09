#!/usr/bin/env python
import os
import django
from django.core.management import call_command
from django.db import connection

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

print("Borrando tablas Django...")
with connection.cursor() as cursor:
    cursor.execute("SET FOREIGN_KEY_CHECKS=0")
    cursor.execute("SHOW TABLES")
    tables = [row[0] for row in cursor.fetchall()]

    for table in tables:
        if table.startswith(('django_', 'auth_', 'users', 'contenttypes_')):
            cursor.execute(f"DROP TABLE IF EXISTS `{table}`")
            print(f"✓ Borrada tabla: {table}")

    cursor.execute("SET FOREIGN_KEY_CHECKS=1")

print("Ejecutando migraciones...")
call_command('migrate', '--noinput', verbosity=2)
print("✓ Migraciones completadas")
