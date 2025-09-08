#!/usr/bin/env python
"""
Create a fresh invitation token for testing magic link flow
"""
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'esg_backend.settings')
django.setup()

from core.models import EmailVerificationToken
from django.contrib.auth.models import User

# Get the test user
email = "martice.grabert@easymailer.live"

try:
    user = User.objects.get(email=email)
    print(f"🔍 Found user: {user.email}")
    
    # Delete any existing tokens for this user to avoid conflicts
    old_tokens = EmailVerificationToken.objects.filter(
        user=user, 
        token_type='invitation'
    )
    if old_tokens.exists():
        count = old_tokens.count()
        old_tokens.delete()
        print(f"🗑️ Deleted {count} old invitation tokens")
    
    # Create a fresh invitation token
    token = EmailVerificationToken.objects.create(
        user=user,
        token_type='invitation'
    )
    
    print(f"✅ Created fresh token: {token.token}")
    print(f"   Created at: {token.created_at}")
    print(f"   User: {token.user.email}")
    print(f"   Type: {token.token_type}")
    print(f"   Used at: {token.used_at}")
    
    # Generate the magic link
    magic_link = f"http://localhost:8080/api/auth/magic-link/{token.token}/"
    print(f"\n🔗 Fresh Magic Link:")
    print(magic_link)
    
    print(f"\n🧪 Test this magic link now!")
    print(f"Expected flow: Magic Link → Auto Login → /setup-account")
    
except User.DoesNotExist:
    print(f"❌ User {email} not found")
    
except Exception as e:
    print(f"❌ Error: {e}")