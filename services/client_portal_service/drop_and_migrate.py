#!/usr/bin/env python
import os
import django
import MySQLdb
from django.conf import settings
from django.core.management import call_command
from django.db import connections

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

db_config = settings.DATABASES['default']
db_host = db_config.get('HOST', 'localhost')
db_user = db_config.get('USER', 'root')
db_password = db_config.get('PASSWORD', '')
db_name = db_config.get('NAME')

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
call_command('migrate', '--noinput', verbosity=2)
print("✓ Migraciones completadas")
