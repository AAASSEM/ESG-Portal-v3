#!/usr/bin/env bash
# Build script for Render deployment

set -o errexit

# Build React frontend
echo "Building React frontend..."
cd frontend
npm install
CI=false npm run build
cd ..

# Copy React build files to Django static directory
echo "Copying React build files..."
cd backend
mkdir -p staticfiles
cp -r ../frontend/build/* staticfiles/

# Install Python dependencies
echo "Installing Python dependencies..."
pip install -r requirements.txt

# Collect static files (includes React build files)
echo "Collecting static files..."
python manage.py collectstatic --no-input

# Run migrations
echo "Running database migrations..."
python manage.py migrate

echo "Build complete!"
