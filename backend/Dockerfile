# ===========================
# Stage 1: Builder
# ===========================
FROM python:3.11-alpine AS builder

WORKDIR /app

RUN apk add --no-cache --virtual .build-deps \
        build-base \
        libffi-dev \
        musl-dev \
        gcc \
        python3-dev \
        openssl-dev \
        curl

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt


# ===========================
# Stage 2: Final image
# ===========================
FROM python:3.11-alpine

WORKDIR /app

COPY --from=builder /install /usr/local

# ✅ Copy all files except unwanted ones
COPY . .

# ✅ Remove any local DB, caches, and temp files that might have been copied
RUN rm -f db.sqlite3 \
    && rm -rf __pycache__/ */__pycache__/ .pytest_cache/ *.log

# ✅ Optional cleanup for image size
RUN rm -rf /var/cache/apk/* /root/.cache \
    && find /usr/local -type d -name "__pycache__" -exec rm -rf {} + \
    && find /usr/local/lib/python3.11/site-packages -name "tests" -exec rm -rf {} + \
    && find /usr/local/lib/python3.11/site-packages -name "*.dist-info" -exec rm -rf {} +

RUN adduser -D appuser && chown -R appuser /app
USER appuser

EXPOSE 8000

# ✅ Run migrations automatically and start server
CMD ["sh", "-c", "python manage.py makemigrations && python manage.py migrate && python manage.py runserver 0.0.0.0:8000"]
