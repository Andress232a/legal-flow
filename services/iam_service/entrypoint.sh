#!/bin/bash
set -e

echo "Limpiando y migrando BD..."
python drop_and_migrate.py

echo "Creando usuario admin..."
python manage.py seed_admin
echo "Usuario admin creado"

echo "Iniciando servidor..."
gunicorn config.wsgi:application --bind 0.0.0.0:8001 --workers 3
