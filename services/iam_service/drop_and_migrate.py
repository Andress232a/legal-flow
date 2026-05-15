#!/usr/bin/env python
import os
import django
import MySQLdb
from django.conf import settings
from django.core.management import call_command
from django.db import connections

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

# Usar env vars directamente (Railway tiene valores diferentes a docker-compose)
db_host = os.environ.get('IAM_DB_HOST') or os.environ.get('DATABASE_HOST', 'localhost')
db_user = os.environ.get('IAM_DB_USER') or os.environ.get('DATABASE_USER', 'root')
db_password = os.environ.get('IAM_DB_PASSWORD') or os.environ.get('DATABASE_PASSWORD', '')
db_name = os.environ.get('IAM_DB_NAME') or os.environ.get('DATABASE_NAME', 'legalflow_iam')

print("Cerrando conexiones Django...")
connections.close_all()

print("Borrando tablas...")
conn = MySQLdb.connect(
    host=db_host,
    user=db_user,
    passwd=db_password,
    database=db_name,
    charset='utf8mb4'
)
cursor = conn.cursor()
cursor.execute("SET FOREIGN_KEY_CHECKS=0")
cursor.execute("SHOW TABLES")
tables = [row[0] for row in cursor.fetchall()]
for table in tables:
    cursor.execute(f"DROP TABLE IF EXISTS `{table}`")
    print(f"✓ Tabla borrada: {table}")
cursor.execute("SET FOREIGN_KEY_CHECKS=1")
cursor.close()
conn.close()

print("Ejecutando migraciones...")
try:
    call_command('migrate', '--noinput', verbosity=2)
    print("✓ Migraciones OK")
except Exception as e:
    print(f"⚠ Error migraciones (continuando): {e}")

print("Creando usuario admin...")
try:
    call_command('seed_admin')
    print("✓ Usuario admin creado")
except Exception as e:
    print(f"⚠ Error seed_admin (continuando): {e}")
