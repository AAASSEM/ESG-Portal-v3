# RUN THIS IN DJANGO SHELL TO DIAGNOSE THE ISSUE
# python manage.py shell
# Then copy and paste this entire script

print("\n" + "="*70)
print("🔬 COMPREHENSIVE EMAIL DIAGNOSTIC SCRIPT")
print("="*70)

# Test 1: Check Django Settings
print("\n📋 TEST 1: DJANGO EMAIL SETTINGS")
print("-"*40)
from django.conf import settings
import os

print(f"USE_REAL_EMAIL: {os.environ.get('USE_REAL_EMAIL', 'not set')}")
print(f"EMAIL_SERVICE: {os.environ.get('EMAIL_SERVICE', 'not set')}")
print(f"EMAIL_BACKEND: {settings.EMAIL_BACKEND}")
print(f"EMAIL_HOST: {settings.EMAIL_HOST}")
print(f"EMAIL_PORT: {settings.EMAIL_PORT}")
print(f"SENDGRID_API_KEY exists: {bool(os.environ.get('SENDGRID_API_KEY'))}")
print(f"DEFAULT_FROM_EMAIL: {settings.DEFAULT_FROM_EMAIL}")

# Test 2: Simple Django Email Test
print("\n📋 TEST 2: SIMPLE DJANGO EMAIL TEST")
print("-"*40)
from django.core.mail import send_mail

try:
    result = send_mail(
        'Test Subject',
        'Test message body',
        settings.DEFAULT_FROM_EMAIL,
        ['test@example.com'],
        fail_silently=False,
    )
    print(f"✓ send_mail returned: {result}")
except Exception as e:
    print(f"✗ send_mail failed: {e}")

# Test 3: Create User Without Transaction
print("\n📋 TEST 3: EMAIL WITHOUT TRANSACTION")
print("-"*40)
from django.contrib.auth.models import User
from core.models import Company, UserProfile
from core.email_service import send_email_verification
import time

try:
    # Create simple user
    test_user = User.objects.create(
        username=f'simple_test_{int(time.time())}',
        email='test@example.com',
        is_active=False
    )
    print(f"Created user: {test_user.username}")
    
    # Send email
    result = send_email_verification(test_user)
    print(f"Email result: {result}")
    
    # Cleanup
    test_user.delete()
    print("✓ Test completed and cleaned up")
    
except Exception as e:
    print(f"✗ Test failed: {e}")
    import traceback
    traceback.print_exc()

# Test 4: Create User With Transaction (Like Signup)
print("\n📋 TEST 4: EMAIL WITH TRANSACTION (SIGNUP SIMULATION)")
print("-"*40)
from django.db import transaction

try:
    with transaction.atomic():
        # Create complex user like signup does
        test_user = User.objects.create_user(
            username=f'complex_test_{int(time.time())}',
            email='test@example.com',
            password='testpass123',
            is_active=False,
            is_staff=True,
            is_superuser=True
        )
        print(f"Created user in transaction: {test_user.username}")
        
        # Create company
        company = Company.objects.create(
            user=test_user,
            name='Test Company',
            company_code=f'TST{test_user.id}',
            emirate='dubai',
            sector='hospitality'
        )
        print(f"Created company: {company.name}")
        
        # Set company on user
        test_user.company = company
        test_user.save()
        
        # Create profile
        profile = UserProfile.objects.create(
            user=test_user,
            role='super_user',
            email=test_user.email,
            company=company,
            email_verified=False
        )
        print(f"Created profile: {profile.role}")
        
        # Try to send email INSIDE transaction
        print("Attempting email send INSIDE transaction...")
        result = send_email_verification(test_user)
        print(f"Email result inside transaction: {result}")
    
    # Now try OUTSIDE transaction
    print("\nAttempting email send OUTSIDE transaction...")
    result2 = send_email_verification(test_user)
    print(f"Email result outside transaction: {result2}")
    
    # Cleanup
    test_user.delete()
    company.delete()
    print("✓ Test completed and cleaned up")
    
except Exception as e:
    print(f"✗ Test failed: {e}")
    import traceback
    traceback.print_exc()

# Test 5: Framework Assignment Impact
print("\n📋 TEST 5: FRAMEWORK ASSIGNMENT IMPACT")
print("-"*40)

try:
    # Create user with everything
    test_user = User.objects.create_user(
        username=f'framework_test_{int(time.time())}',
        email='test@example.com',
        password='testpass123',
        is_active=False
    )
    
    company = Company.objects.create(
        user=test_user,
        name='Framework Test Company',
        company_code=f'FRM{test_user.id}',
        emirate='dubai',
        sector='hospitality'
    )
    
    test_user.company = company
    test_user.save()
    
    UserProfile.objects.create(
        user=test_user,
        role='super_user',
        email=test_user.email,
        company=company
    )
    
    print("User setup complete, testing framework assignment...")
    
    # Try framework assignment
    try:
        from core.services import FrameworkService
        FrameworkService.assign_mandatory_frameworks(company, test_user)
        print("✓ Framework assignment succeeded")
    except Exception as e:
        print(f"✗ Framework assignment failed: {e}")
    
    # Now try email after framework
    print("Testing email after framework assignment...")
    result = send_email_verification(test_user)
    print(f"Email result: {result}")
    
    # Cleanup
    test_user.delete()
    company.delete()
    print("✓ Test completed and cleaned up")
    
except Exception as e:
    print(f"✗ Test failed: {e}")
    import traceback
    traceback.print_exc()

# Test 6: Raw SMTP Test
print("\n📋 TEST 6: RAW SMTP CONNECTION TEST")
print("-"*40)

import smtplib

try:
    print(f"Connecting to {settings.EMAIL_HOST}:{settings.EMAIL_PORT}")
    
    if settings.EMAIL_USE_TLS:
        server = smtplib.SMTP(settings.EMAIL_HOST, settings.EMAIL_PORT)
        server.starttls()
    else:
        server = smtplib.SMTP_SSL(settings.EMAIL_HOST, settings.EMAIL_PORT)
    
    print("✓ Connected to SMTP server")
    
    print(f"Logging in as: {settings.EMAIL_HOST_USER}")
    server.login(settings.EMAIL_HOST_USER, settings.EMAIL_HOST_PASSWORD)
    print("✓ Authentication successful")
    
    server.quit()
    print("✓ SMTP connection test successful")
    
except Exception as e:
    print(f"✗ SMTP connection failed: {e}")

print("\n" + "="*70)
print("🔬 DIAGNOSTIC COMPLETE")
print("="*70)
print("\n📊 SUMMARY:")
print("If Test 2 (Simple Django Email) works but Test 4 (Transaction) fails,")
print("the issue is transaction-related. Apply the SignupView fix.")
print("\nIf Test 6 (Raw SMTP) fails, check your SendGrid credentials.")
print("\nIf Test 5 (Framework) causes issues, the framework service is the problem.")
print("="*70)