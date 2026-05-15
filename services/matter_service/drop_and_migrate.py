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

    # Crear lista de DROP statements
    drop_statements = []
    for table in tables:
        if table.startswith(('django_', 'auth_', 'users', 'contenttypes_')):
            drop_statements.append(f"DROP TABLE IF EXISTS `{table}`")

    # Ejecutar todos los DROP en una sola sesión
    for stmt in drop_statements:
        cursor.execute(stmt)
        table_name = stmt.split('`')[1]
        print(f"✓ Borrada tabla: {table_name}")

    cursor.execute("SET FOREIGN_KEY_CHECKS=1")

print("Ejecutando migraciones...")
call_command('migrate', '--noinput', verbosity=2)
print("✓ Migraciones completadas")
