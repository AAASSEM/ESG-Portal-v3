#!/usr/bin/env python3
"""
Production data initialization script for ESG Platform
Run this after deployment to populate initial data
"""
import os
import sys
import django

# Setup Django environment
if __name__ == '__main__':
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'esg_backend.settings')
    django.setup()
    
    from django.core.management import call_command
    
    print("🚀 Initializing production data...")
    
    try:
        # Run the populate_initial_data command
        call_command('populate_initial_data')
        print("✅ Production data initialized successfully!")
    except Exception as e:
        print(f"❌ Error initializing data: {e}")
        sys.exit(1)