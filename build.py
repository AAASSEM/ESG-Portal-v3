#!/usr/bin/env python3
"""Build script for ESG Portal Render deployment"""

import os
import subprocess
import sys

def run_command(command, cwd=None):
    """Run a shell command and exit on failure"""
    print(f"Running: {command}")
    result = subprocess.run(command, shell=True, cwd=cwd)
    if result.returncode != 0:
        print(f"Command failed: {command}")
        sys.exit(1)

def main():
    # Build React frontend
    print("=" * 50)
    print("Building React frontend...")
    print("=" * 50)
    run_command("npm install", cwd="frontend")
    run_command("npm run build", cwd="frontend")
    
    # Install Python dependencies
    print("=" * 50)
    print("Installing Python dependencies...")
    print("=" * 50)
    os.chdir("backend")
    run_command("pip install -r requirements.txt")
    run_command("pip install gunicorn whitenoise dj-database-url psycopg2-binary")
    
    # Run database migrations
    print("=" * 50)
    print("Running database migrations...")
    print("=" * 50)
    run_command("python manage.py migrate")
    
    # Collect static files
    print("=" * 50)
    print("Collecting static files...")
    print("=" * 50)
    run_command("python manage.py collectstatic --no-input")
    
    print("=" * 50)
    print("Build complete!")
    print("=" * 50)

if __name__ == "__main__":
    main()
