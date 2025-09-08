#!/usr/bin/env python
"""
Debug magic link authentication
"""
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'esg_backend.settings')
django.setup()

from core.models import EmailVerificationToken
from django.contrib.auth.models import User

# Your specific token
TOKEN = "Q7vKccuQA5sTDZv7BnpcLSAU2O4ypRjKOG7YQ7VsZKvFnlM_R_zwchzko_LhUgE4"

print(f"🔍 Debugging token: {TOKEN}")

try:
    token_obj = EmailVerificationToken.objects.get(token=TOKEN)
    print(f"✅ Token found!")
    print(f"   User: {token_obj.user.email} (ID: {token_obj.user.id})")
    print(f"   Token type: {token_obj.token_type}")
    print(f"   Created: {token_obj.created_at}")
    print(f"   Used at: {token_obj.used_at if token_obj.used_at else 'Not used'}")
    print(f"   User is_active: {token_obj.user.is_active}")
    
    # Check user profile
    try:
        profile = token_obj.user.userprofile
        print(f"   User role: {profile.role}")
        print(f"   Must reset password: {profile.must_reset_password}")
        print(f"   Company: {profile.company.name if profile.company else 'None'}")
    except:
        print(f"   ❌ No UserProfile found!")
    
    # Check if expired
    from django.utils import timezone
    from datetime import timedelta
    
    if token_obj.created_at < timezone.now() - timedelta(days=7):
        print(f"   ❌ Token EXPIRED (older than 7 days)")
    else:
        print(f"   ✅ Token is valid (not expired)")
        
    # Test what should happen
    user = token_obj.user
    needs_setup = getattr(user.userprofile, 'must_reset_password', True) if hasattr(user, 'userprofile') else True
    expected_redirect = '/setup-account' if needs_setup else '/dashboard'
    print(f"   Expected redirect: {expected_redirect}")
    
except EmailVerificationToken.DoesNotExist:
    print(f"❌ Token NOT FOUND!")
    print("Available invitation tokens:")
    for token in EmailVerificationToken.objects.filter(token_type='invitation')[:5]:
        print(f"  - {token.token} (user: {token.user.email}, created: {token.created_at})")
        
except Exception as e:
    print(f"❌ Error: {e}")

print("\n🔧 Next steps:")
print("1. If token not found: Create a new invitation")
print("2. If token expired: Create a new invitation")  
print("3. If token valid but login shown: Check Django console for authentication errors")