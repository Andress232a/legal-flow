#!/bin/bash
set -e

echo "Ejecutando migraciones..."
python drop_and_migrate.py
echo "Migraciones completadas"

echo "Iniciando servidor..."
gunicorn config.wsgi:application --bind 0.0.0.0:8006 --workers 3
