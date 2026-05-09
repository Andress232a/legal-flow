#!/bin/bash
set -e

echo "Ejecutando migraciones..."
python manage.py migrate --run-syncdb --noinput
echo "Migraciones completadas"

echo "Iniciando servidor..."
gunicorn config.wsgi:application --bind 0.0.0.0:8002 --workers 3
