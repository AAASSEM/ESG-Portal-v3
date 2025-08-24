#!/usr/bin/env bash
# Build script for Render deployment

set -o errexit

# Build React frontend
echo "Building React frontend..."
cd frontend
npm install
npm run build
cd ..

# Copy built frontend files to Django static directory
echo "Copying frontend build to Django..."
# Adjust these paths based on your Django settings
cp -r frontend/build/* backend/static/ 2>/dev/null || true
cp -r frontend/build/static/* backend/static/ 2>/dev/null || true

# Install Python dependencies
echo "Installing Python dependencies..."
cd backend
pip install -r requirements.txt

# Install production server
pip install gunicorn whitenoise

# Collect static files
echo "Collecting static files..."
python manage.py collectstatic --no-input

# Run migrations
echo "Running database migrations..."
python manage.py migrate

echo "Build complete!"
