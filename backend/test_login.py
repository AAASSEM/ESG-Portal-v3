#!/usr/bin/env python
"""
Test login functionality
"""
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'esg_backend.settings')
django.setup()

from django.contrib.auth.models import User
from django.contrib.auth import authenticate

# Check what users exist
print("🔍 Available users:")
users = User.objects.all()
for user in users:
    print(f"   - {user.username} ({user.email}) - Active: {user.is_active}, Superuser: {user.is_superuser}")

print(f"\n🔍 Checking specific users:")
test_emails = [
    "admin@test.com",
    "martice.grabert@easymailer.live",
]

for email in test_emails:
    try:
        user = User.objects.get(email=email)
        print(f"   - {email}: username={user.username}, active={user.is_active}")
        
        # Test password authentication
        if user.has_usable_password():
            print(f"     Has usable password: Yes")
        else:
            print(f"     Has usable password: No (needs magic link setup)")
            
    except User.DoesNotExist:
        print(f"   - {email}: Not found")

# Test authentication with a known user
print(f"\n🔐 Testing authentication:")
print(f"Try logging in with one of the active users above.")
print(f"If user has 'No usable password', they need to use magic link first.")