#!/bin/bash
set -e

APP_NAME="${1:-}"

if [ -n "$APP_NAME" ]; then
    echo "Creating migrations for app: $APP_NAME"
    python manage.py makemigrations "$APP_NAME"
else
    echo "Creating migrations for all apps"
    python manage.py makemigrations
fi

echo "Applying database migrations"
python manage.py migrate

echo "Database is up to date"