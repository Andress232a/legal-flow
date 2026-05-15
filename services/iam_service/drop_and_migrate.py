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

print("Borrando y recreando base de datos...")
conn = MySQLdb.connect(
    host=db_host,
    user=db_user,
    passwd=db_password,
    charset='utf8mb4'
)
cursor = conn.cursor()
cursor.execute(f"DROP DATABASE IF EXISTS `{db_name}`")
cursor.execute(f"CREATE DATABASE `{db_name}`")
cursor.close()
conn.close()

print("Ejecutando migraciones...")
call_command('migrate', '--noinput', verbosity=2)

print("Creando usuario admin...")
call_command('seed_admin')
print("✓ Usuario admin creado")
