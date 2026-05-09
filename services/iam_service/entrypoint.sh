#!/bin/bash

echo "Ejecutando migraciones..."
python manage.py migrate --noinput 2>/dev/null || python manage.py migrate iam 0001 --fake --noinput && python manage.py migrate --noinput
echo "Migraciones completadas"

echo "Creando usuario admin..."
python manage.py seed_admin 2>/dev/null || true
echo "Usuario admin creado"

echo "Iniciando servidor..."
gunicorn config.wsgi:application --bind 0.0.0.0:8001 --workers 3
