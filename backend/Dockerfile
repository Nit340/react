# Use smaller base image
FROM python:3.11-alpine

WORKDIR /app

# Install essential build dependencies including libffi for cffi
RUN apk add --no-cache --virtual .build-deps \
        build-base \
        python3-dev \
        libffi-dev \
        gcc \
        musl-dev \
    && apk add --no-cache bash curl

# Copy requirements and install Python packages
COPY requirements.txt .
RUN pip install --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt

# Copy project files
COPY . .

# Create directories and set permissions
RUN mkdir -p /app/db /app/static && \
    chmod -R 755 /app/db /app/static && \
    chmod +x /app/entrypoint.sh

# Clean up build dependencies to save space
RUN apk del .build-deps && \
    rm -rf /var/cache/apk/* /root/.cache

# Add a non-root user
RUN adduser -D appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

CMD ["/app/entrypoint.sh"]
