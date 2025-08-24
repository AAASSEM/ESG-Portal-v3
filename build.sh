#!/usr/bin/env bash
# Build script for ESG Portal Render deployment

set -o errexit

# Build React frontend
echo "Building React frontend..."
cd frontend
npm install
npm run build
cd ..

# Install Python dependencies
echo "Installing Python dependencies..."
cd backend

# Install production dependencies
pip install -r requirements.txt
pip install gunicorn whitenoise dj-database-url

# Run database migrations
echo "Running database migrations..."
python manage.py migrate

# Create superuser if needed (optional - remove in production)
# python manage.py createsuperuser --noinput --username admin --email admin@example.com || true

# Collect static files (this will gather React build files too)
echo "Collecting static files..."
python manage.py collectstatic --no-input

echo "Build complete!"
