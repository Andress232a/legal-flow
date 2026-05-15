#!/bin/bash
set -e

echo "Ejecutando migraciones..."
python manage.py migrate --noinput

echo "Creando usuario admin..."
python manage.py seed_admin || true

echo "Iniciando servidor..."
gunicorn config.wsgi:application --bind 0.0.0.0:8001 --workers 3
