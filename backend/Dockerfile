# Use Python 3.11 as base image
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
ENV DJANGO_SETTINGS_MODULE esg_backend.settings

# Set work directory
WORKDIR /app

# Install system dependencies
RUN echo "nameserver 8.8.8.8" > /etc/resolv.conf \
    && echo "nameserver 8.8.4.4" >> /etc/resolv.conf \
    && apt-get update || apt-get update \
    && apt-get install -y --no-install-recommends \
        postgresql-client \
        build-essential \
        libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# Copy project files
COPY . /app/

# Create staticfiles directory
RUN mkdir -p /app/staticfiles

# Collect static files
RUN python manage.py collectstatic --noinput

# Create media directory
RUN mkdir -p /app/media

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/api/auth/csrf/ || exit 1

# Run the application
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]