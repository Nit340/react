#!/bin/bash

set -e

echo "🚀 Starting Django application..."

# Create necessary directories
mkdir -p /app/db /app/static

# Run database migrations
python manage.py makemigrations || echo "No new migrations needed"
python manage.py migrate

# Create superuser
python manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(username='inno').exists():
    User.objects.create_superuser('inno', 'inno@example.com', 'Inno@2025')
    print('Superuser created')
"

# Find project name
PROJECT_NAME=$(find . -name wsgi.py -exec dirname {} \; | xargs -I {} basename {})

echo "📁 Detected project name: $PROJECT_NAME"

# Start Gunicorn server (this blocks and keeps container running)
echo "🌐 Starting Gunicorn server..."
exec gunicorn ${PROJECT_NAME}.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers 2 \
    --threads 2 \
    --worker-connections 100 \
    --max-requests 1000 \
    --timeout 30 \
    --preload \
    --access-logfile - \
    --error-logfile - \
    --log-level info