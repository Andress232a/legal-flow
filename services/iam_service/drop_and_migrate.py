#!/usr/bin/env python
import os
import django
from django.core.management import call_command
from django.db import connection

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

print("Borrando tablas Django...")
with connection.cursor() as cursor:
    cursor.execute("SHOW TABLES")
    tables = [row[0] for row in cursor.fetchall()]

    # Borrar tablas que empiezan con django_ o iam_
    for table in tables:
        if table.startswith(('django_', 'auth_', 'iam_', 'users', 'contenttypes_')):
            cursor.execute(f"DROP TABLE IF EXISTS `{table}`")
            print(f"✓ Borrada tabla: {table}")

print("Ejecutando migraciones...")
call_command('migrate', '--noinput', verbosity=2)
print("✓ Migraciones completadas")
