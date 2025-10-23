# ===========================
# Stage 1: Builder
# ===========================
FROM python:3.11-slim AS builder

WORKDIR /app

# Copy and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt


# ===========================
# Stage 2: Final Image
# ===========================
FROM python:3.11-slim

WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /install /usr/local

# Copy application code
COPY . .

# Copy entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Create non-root user
RUN useradd -m appuser && chown -R appuser /app
USER appuser

# Expose Django port
EXPOSE 8000

# ✅ Environment variables
ENV DJANGO_SUPERUSER_USERNAME=inno \
    DJANGO_SUPERUSER_PASSWORD=InnoSpace@2025 \
    DJANGO_SUPERUSER_EMAIL=inno@example.com \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    DJANGO_SETTINGS_MODULE=backend_project.settings \
    ALLOWED_HOSTS=* \
    DEBUG=True

# Use entrypoint for all startup logic
ENTRYPOINT ["/entrypoint.sh"]
