#!/usr/bin/env python
"""
Quick token checker for debugging magic links
"""
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'esg_backend.settings')
django.setup()

from core.models import EmailVerificationToken

def check_token(token_string):
    print(f"🔍 Checking token: {token_string}")
    
    try:
        token = EmailVerificationToken.objects.get(token=token_string)
        print(f"✅ Token found!")
        print(f"   User: {token.user.email}")
        print(f"   Type: {token.token_type}")
        print(f"   Created: {token.created_at}")
        print(f"   Used: {token.is_used}")
        print(f"   User active: {token.user.is_active}")
        
        # Check if token is expired
        from django.utils import timezone
        from datetime import timedelta
        
        if token.created_at < timezone.now() - timedelta(days=7):
            print(f"⚠️  Token is EXPIRED (older than 7 days)")
        else:
            print(f"✅ Token is valid (not expired)")
            
        return token
        
    except EmailVerificationToken.DoesNotExist:
        print(f"❌ Token NOT found in database")
        print("   Available tokens:")
        tokens = EmailVerificationToken.objects.filter(token_type='invitation')[:5]
        for t in tokens:
            print(f"   - {t.token[:20]}... (user: {t.user.email})")
        return None

if __name__ == "__main__":
    # Test the specific token
    token_string = "TB4TM2VWNYQmdWEfb1gjPCdnANz8jIhnYntfkfG-uhcC6vVhz7-36DBobWCAj-ES"
    check_token(token_string)