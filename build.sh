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
pip install -r requirements.txt
pip install gunicorn whitenoise dj-database-url

# Run database migrations
echo "Running database migrations..."
python manage.py migrate

# Collect static files
echo "Collecting static files..."
python manage.py collectstatic --no-input

echo "Build complete!"
