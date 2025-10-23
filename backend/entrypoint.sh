#!/bin/sh
set -e

echo "🚀 Starting Django container..."

# Wait briefly for DB connection if using Postgres (SQLite is instant)
if [ "$DATABASE" = "postgres" ]; then
  echo "⏳ Waiting for PostgreSQL..."
  while ! nc -z $SQL_HOST $SQL_PORT; do
    sleep 0.1
  done
  echo "✅ PostgreSQL started!"
fi

# Run makemigrations and migrate (only if needed)
echo "⚙️ Checking and applying migrations..."
python manage.py makemigrations --noinput || true
python manage.py migrate --noinput

# Ensure superuser exists (idempotent)
echo "👤 Ensuring superuser exists..."
python manage.py shell <<EOF
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(username='$DJANGO_SUPERUSER_USERNAME').exists():
    User.objects.create_superuser(
        '$DJANGO_SUPERUSER_USERNAME',
        '$DJANGO_SUPERUSER_EMAIL',
        '$DJANGO_SUPERUSER_PASSWORD'
    )
    print("✅ Superuser created.")
else:
    print("ℹ️ Superuser already exists.")
EOF

# Optionally collect static files (uncomment if needed)
# echo "📦 Collecting static files..."
# python manage.py collectstatic --noinput

# Start Gunicorn server (fast, production-grade)
echo "🚀 Starting Gunicorn server..."
exec gunicorn backend_project.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers 1 \
    --threads 1 \
    --timeout 0
