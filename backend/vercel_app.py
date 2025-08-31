"""
WSGI application for Vercel deployment
"""
import os
import sys
from pathlib import Path

# Add the project directory to Python path
current_dir = Path(__file__).resolve().parent
sys.path.append(str(current_dir))

# Set Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'esg_backend.settings')

# Import Django's WSGI application
from django.core.wsgi import get_wsgi_application

# Initialize Django application
application = get_wsgi_application()