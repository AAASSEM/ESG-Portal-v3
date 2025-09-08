#!/usr/bin/env python3
"""
Test script for all email types with Django signals
"""
import os
import sys
import django

# Setup Django
sys.path.append('/mnt/c/Users/20100/vsim2.0/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'esg_backend.settings')
django.setup()

from django.contrib.auth.models import User
from core.models import Company, UserProfile
from core.email_service import send_password_reset_email, send_invitation_email

def test_all_email_types():
    print("🧪 Testing All Email Types with Django Signals")
    print("=" * 50)
    
    # Test 1: Email Verification (via User creation)
    print("\n1️⃣ Testing Email Verification (User Signup)")
    try:
        user1 = User.objects.create(
            username='test_signup',
            email='test@example.com',
            is_active=False  # This triggers the email verification signal
        )
        company1 = Company.objects.create(name='Test Company 1', company_code='TC1')
        UserProfile.objects.create(user=user1, company=company1, role='admin')
        
        print("✅ User created - email verification signal should have fired")
        
        # Clean up
        user1.delete()
        company1.delete()
        
    except Exception as e:
        print(f"❌ Email verification test failed: {e}")
    
    # Test 2: Password Reset
    print("\n2️⃣ Testing Password Reset Email")
    try:
        user2 = User.objects.create(
            username='test_reset',
            email='reset@example.com',
            is_active=True
        )
        
        # This should create EmailVerificationToken and trigger signal
        result = send_password_reset_email(user2)
        print(f"Password reset result: {result}")
        print("✅ Password reset token created - signal should have fired")
        
        # Clean up
        user2.delete()
        
    except Exception as e:
        print(f"❌ Password reset test failed: {e}")
    
    # Test 3: Invitation
    print("\n3️⃣ Testing Invitation Email")
    try:
        user3 = User.objects.create(
            username='test_invite',
            email='invite@example.com',
            is_active=False
        )
        
        admin_user = User.objects.create(username='admin_user', email='admin@example.com')
        
        # This should create EmailVerificationToken and trigger signal
        result = send_invitation_email(user3, admin_user)
        print(f"Invitation result: {result}")
        print("✅ Invitation token created - signal should have fired")
        
        # Clean up
        user3.delete()
        admin_user.delete()
        
    except Exception as e:
        print(f"❌ Invitation test failed: {e}")
    
    print("\n🎉 All email types tested!")
    print("Check your console logs for signal activity.")

if __name__ == "__main__":
    test_all_email_types()