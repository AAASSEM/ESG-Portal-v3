#!/usr/bin/env bash
# Build script for Render deployment

set -o errexit

# Build React frontend for production
echo "Building React frontend for production..."
cd frontend
npm install
CI=false npm run build:prod
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
python3 manage.py collectstatic --no-input

# Run migrations
echo "Running database migrations..."
python3 manage.py migrate

# Initialize production data
echo "Initializing production data..."
python3 init_production_data.py

# Fix user company associations
echo "Fixing user company associations..."
python3 fix_user_companies.py

echo "Build complete!"
