import os
import sys
from pathlib import Path

# Add the backend directory to Python path
current_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(current_dir))

# Set Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'esg_backend.settings')

# Import and setup Django
import django
from django.conf import settings

# Ensure Django is configured
if not settings.configured:
    django.setup()

# Import Django's WSGI application
from django.core.wsgi import get_wsgi_application

# Create WSGI application
application = get_wsgi_application()