#!/bin/bash
set -e

echo "Ejecutando migraciones..."
python manage.py migrate --noinput
echo "Migraciones completadas"

echo "Iniciando servidor..."
gunicorn config.wsgi:application --bind 0.0.0.0:8007 --workers 3
