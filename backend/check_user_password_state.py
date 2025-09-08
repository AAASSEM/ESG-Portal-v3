#!/usr/bin/env python
"""
Check user password state for debugging magic link flow
"""
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'esg_backend.settings')
django.setup()

from django.contrib.auth.models import User
from core.models import UserProfile

# Check the user from the token we tested earlier
email = "martice.grabert@easymailer.live"

try:
    user = User.objects.get(email=email)
    print(f"🔍 Checking user: {user.email}")
    print(f"   - is_active: {user.is_active}")
    print(f"   - has_usable_password: {user.has_usable_password()}")
    print(f"   - password field: {user.password}")
    
    try:
        profile = user.userprofile
        print(f"   - must_reset_password: {profile.must_reset_password}")
        print(f"   - role: {profile.role}")
    except UserProfile.DoesNotExist:
        print(f"   - No UserProfile found")
    
    # Determine what should happen
    profile_needs_reset = getattr(user.userprofile, 'must_reset_password', True) if hasattr(user, 'userprofile') else True
    has_unusable_password = not user.has_usable_password()
    needs_password_setup = profile_needs_reset or has_unusable_password
    
    print(f"\n🔐 Magic link logic:")
    print(f"   - Profile must_reset_password: {profile_needs_reset}")
    print(f"   - Has unusable password: {has_unusable_password}")  
    print(f"   - Should redirect to setup: {needs_password_setup}")
    
    expected_redirect = '/setup-account' if needs_password_setup else '/onboard'
    print(f"   - Expected redirect: {expected_redirect}")
    
except User.DoesNotExist:
    print(f"❌ User {email} not found")
    
print(f"\n💡 If user is going to onboarding instead of setup:")
print(f"   - Either has_usable_password=True (has old company code password)")
print(f"   - Or must_reset_password=False") 
print(f"   - Need to fix the user state or create fresh user with new logic")