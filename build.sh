#!/usr/bin/env bash
# Build script for Render deployment

set -o errexit

# Build React frontend
echo "Building React frontend..."
cd frontend
npm install
CI=false npm run build
cd ..

# Install Python dependencies
echo "Installing Python dependencies..."
cd backend
pip install -r requirements.txt

# Collect static files
echo "Collecting static files..."
python manage.py collectstatic --no-input

# Run migrations
echo "Running database migrations..."
python manage.py migrate

echo "Build complete!"