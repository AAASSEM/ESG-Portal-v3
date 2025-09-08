#!/usr/bin/env python3
"""
Standalone email verification sender
Called by signup process to ensure reliable email delivery
"""
import os
import sys
import django

# Setup Django
sys.path.append('/mnt/c/Users/20100/vsim2.0/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'esg_backend.settings')
django.setup()

from core.email_service import send_email_verification
from django.contrib.auth.models import User

def send_signup_verification_email(user_email):
    """
    Send verification email for a user by email address
    This runs as a separate process to avoid transaction issues
    """
    try:
        print(f"📧 Starting email verification for {user_email}")
        
        # Get user by email
        user = User.objects.get(email=user_email)
        print(f"✅ Found user: {user.username} ({user.email})")
        
        # Send verification email (same as manual test)
        result = send_email_verification(user)
        print(f"📤 Email result: {result}")
        
        if result and result.get('success') and result.get('email_sent'):
            print(f"✅ Verification email sent successfully to {user_email}")
            return True
        else:
            print(f"❌ Email sending failed: {result}")
            return False
            
    except User.DoesNotExist:
        print(f"❌ User not found: {user_email}")
        return False
    except Exception as e:
        print(f"❌ Error sending email: {str(e)}")
        return False

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python send_verification_email.py <user_email>")
        sys.exit(1)
    
    user_email = sys.argv[1]
    success = send_signup_verification_email(user_email)
    sys.exit(0 if success else 1)