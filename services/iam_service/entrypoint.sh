#!/bin/bash
set -e

echo "Ejecutando migraciones..."
python manage.py migrate --noinput --fake-initial
echo "Migraciones completadas"

echo "Creando usuario admin..."
python manage.py seed_admin
echo "Usuario admin creado"

echo "Iniciando servidor..."
gunicorn config.wsgi:application --bind 0.0.0.0:8001 --workers 3
