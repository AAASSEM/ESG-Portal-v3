# COMPLETE DIAGNOSTIC AND FIX FOR EMAIL ISSUE
# ============================================

# STEP 1: First, let's add comprehensive debugging to email_service.py
# Replace your send_email_verification function with this:

import logging
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
from django.utils.html import strip_tags
from .models import EmailVerificationToken
import traceback
import sys

logger = logging.getLogger(__name__)

def send_email_verification(user, request=None):
    """
    Send email verification email to user - WITH COMPLETE DEBUGGING
    """
    print("\n" + "="*60)
    print("🔍 EMAIL VERIFICATION DEBUG START")
    print("="*60)
    
    # Debug Point 1: Check user state
    print(f"1️⃣ USER STATE CHECK:")
    print(f"   - User ID: {user.id}")
    print(f"   - Username: {user.username}")
    print(f"   - Email: {user.email}")
    print(f"   - Is Active: {user.is_active}")
    print(f"   - Is Staff: {user.is_staff}")
    print(f"   - Is Superuser: {user.is_superuser}")
    
    # Debug Point 2: Check related objects
    print(f"\n2️⃣ RELATED OBJECTS CHECK:")
    try:
        if hasattr(user, 'userprofile'):
            print(f"   ✓ UserProfile exists: {user.userprofile.role}")
        else:
            print(f"   ✗ No UserProfile")
    except Exception as e:
        print(f"   ✗ UserProfile error: {e}")
    
    try:
        if hasattr(user, 'company'):
            print(f"   ✓ Company exists: {user.company.name if user.company else 'None'}")
        else:
            print(f"   ✗ No Company relation")
    except Exception as e:
        print(f"   ✗ Company error: {e}")
    
    # Debug Point 3: Check email configuration
    print(f"\n3️⃣ EMAIL CONFIGURATION:")
    print(f"   - EMAIL_BACKEND: {settings.EMAIL_BACKEND}")
    print(f"   - EMAIL_HOST: {settings.EMAIL_HOST}")
    print(f"   - EMAIL_PORT: {settings.EMAIL_PORT}")
    print(f"   - EMAIL_USE_TLS: {settings.EMAIL_USE_TLS}")
    print(f"   - EMAIL_HOST_USER: {settings.EMAIL_HOST_USER}")
    print(f"   - EMAIL_HOST_PASSWORD: {'SET' if settings.EMAIL_HOST_PASSWORD else 'NOT SET'}")
    print(f"   - DEFAULT_FROM_EMAIL: {settings.DEFAULT_FROM_EMAIL}")
    print(f"   - USE_REAL_EMAIL: {getattr(settings, 'USE_REAL_EMAIL', False)}")
    print(f"   - EMAIL_SERVICE: {getattr(settings, 'EMAIL_SERVICE', 'not set')}")
    
    try:
        # Debug Point 4: Token creation
        print(f"\n4️⃣ TOKEN CREATION:")
        
        # Try to get existing valid token first
        existing_tokens = EmailVerificationToken.objects.filter(
            user=user,
            token_type='email_verification',
            used_at__isnull=True
        )
        print(f"   - Existing tokens count: {existing_tokens.count()}")
        
        # Create new token
        token_obj = EmailVerificationToken.objects.create(
            user=user,
            token_type='email_verification'
        )
        print(f"   ✓ Token created: {token_obj.verification_code}")
        print(f"   - Token ID: {token_obj.id}")
        print(f"   - Expires at: {token_obj.expires_at}")
        
        # Debug Point 5: Template rendering
        print(f"\n5️⃣ TEMPLATE RENDERING:")
        
        context = {
            'user_name': user.first_name or user.username,
            'verification_code': token_obj.verification_code,
            'site_name': 'ESG Portal',
        }
        print(f"   - Context prepared: {context}")
        
        try:
            html_message = render_to_string('emails/email_verification.html', context)
            print(f"   ✓ HTML template rendered: {len(html_message)} chars")
        except Exception as e:
            print(f"   ✗ HTML template error: {e}")
            html_message = None
        
        try:
            plain_message = render_to_string('emails/email_verification.txt', context)
            print(f"   ✓ Text template rendered: {len(plain_message)} chars")
        except Exception as e:
            print(f"   ✗ Text template error: {e}")
            # Fallback plain message
            plain_message = f"Your verification code is: {token_obj.verification_code}"
            print(f"   → Using fallback plain message")
        
        # Debug Point 6: Email sending
        print(f"\n6️⃣ EMAIL SENDING ATTEMPT:")
        
        subject = f"{settings.EMAIL_SUBJECT_PREFIX}Verify Your Email Address"
        recipient_email = user.email
        
        print(f"   - Subject: {subject}")
        print(f"   - From: {settings.DEFAULT_FROM_EMAIL}")
        print(f"   - To: {recipient_email}")
        print(f"   - Message length: {len(plain_message)}")
        
        # Try sending with maximum debugging
        email_sent = False
        email_error = None
        
        try:
            print(f"   → Calling send_mail()...")
            
            # Force flush stdout to see output immediately
            sys.stdout.flush()
            
            send_result = send_mail(
                subject=subject,
                message=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[recipient_email],
                html_message=html_message,
                fail_silently=False,
            )
            
            print(f"   → send_mail() returned: {send_result}")
            
            if send_result == 1:
                email_sent = True
                print(f"   ✓ Email sent successfully!")
            else:
                email_sent = False
                email_error = f"send_mail returned {send_result}"
                print(f"   ✗ Unexpected result: {send_result}")
                
        except Exception as e:
            email_sent = False
            email_error = str(e)
            print(f"   ✗ EXCEPTION in send_mail: {e}")
            print(f"   Exception type: {type(e).__name__}")
            print(f"   Full traceback:")
            traceback.print_exc()
            
            # Extra debugging for specific error types
            if "SMTP" in str(e):
                print(f"   → SMTP Configuration Issue")
            elif "Connection" in str(e):
                print(f"   → Network/Connection Issue")
            elif "Authentication" in str(e):
                print(f"   → Authentication Issue")
        
        # Debug Point 7: Final result
        print(f"\n7️⃣ FINAL RESULT:")
        result = {
            'success': True,  # Token was created
            'email_sent': email_sent,
            'verification_code': token_obj.verification_code,
            'message': 'Email sent successfully' if email_sent else (email_error or 'Email failed')
        }
        print(f"   Result: {result}")
        
        print("="*60)
        print("🔍 EMAIL VERIFICATION DEBUG END")
        print("="*60 + "\n")
        
        return result
        
    except Exception as e:
        print(f"\n❌ CRITICAL ERROR: {str(e)}")
        print(f"   Exception type: {type(e).__name__}")
        traceback.print_exc()
        
        print("="*60)
        print("🔍 EMAIL VERIFICATION DEBUG END (ERROR)")
        print("="*60 + "\n")
        
        return {
            'success': False,
            'email_sent': False,
            'verification_code': None,
            'message': f'Critical error: {str(e)}'
        }


# STEP 2: Add this test function to isolate the problem
def test_email_in_transaction():
    """
    Test email sending within a database transaction context
    Run this in Django shell to simulate signup conditions
    """
    from django.db import transaction
    from django.contrib.auth.models import User
    from core.models import Company, UserProfile
    import time
    
    print("\n🧪 TESTING EMAIL IN TRANSACTION CONTEXT")
    
    # Test 1: Outside transaction
    print("\n📍 Test 1: Email outside transaction")
    test_user = User.objects.create(
        username=f'test_outside_{int(time.time())}',
        email='test@example.com',
        is_active=False
    )
    result = send_email_verification(test_user)
    print(f"Result: {result}")
    test_user.delete()
    
    # Test 2: Inside transaction
    print("\n📍 Test 2: Email inside transaction")
    with transaction.atomic():
        test_user = User.objects.create(
            username=f'test_inside_{int(time.time())}',
            email='test@example.com',
            is_active=False
        )
        result = send_email_verification(test_user)
        print(f"Result: {result}")
        test_user.delete()
    
    # Test 3: With complex relationships (like signup)
    print("\n📍 Test 3: Email with complex relationships")
    with transaction.atomic():
        test_user = User.objects.create(
            username=f'test_complex_{int(time.time())}',
            email='test@example.com',
            is_active=False,
            is_staff=True,
            is_superuser=True
        )
        
        company = Company.objects.create(
            user=test_user,
            name='Test Company',
            company_code=f'TST{test_user.id}',
            emirate='dubai',
            sector='hospitality'
        )
        
        test_user.company = company
        test_user.save()
        
        UserProfile.objects.create(
            user=test_user,
            role='super_user',
            email=test_user.email,
            company=company,
            email_verified=False
        )
        
        # Now try email
        result = send_email_verification(test_user)
        print(f"Result: {result}")
        
        # Cleanup
        test_user.delete()
        company.delete()


# STEP 3: Add this minimal test to check basic SMTP connection
def test_smtp_connection():
    """
    Test basic SMTP connection without Django's send_mail
    """
    import smtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart
    
    print("\n🔌 TESTING RAW SMTP CONNECTION")
    
    try:
        # Get settings
        host = settings.EMAIL_HOST
        port = settings.EMAIL_PORT
        username = settings.EMAIL_HOST_USER
        password = settings.EMAIL_HOST_PASSWORD
        
        print(f"Connecting to {host}:{port}")
        print(f"Username: {username}")
        
        # Create SMTP connection
        if settings.EMAIL_USE_TLS:
            server = smtplib.SMTP(host, port)
            server.starttls()
        else:
            server = smtplib.SMTP_SSL(host, port)
        
        print("✓ Connected to SMTP server")
        
        # Login
        server.login(username, password)
        print("✓ Authenticated successfully")
        
        # Create test message
        msg = MIMEMultipart()
        msg['From'] = settings.DEFAULT_FROM_EMAIL
        msg['To'] = 'test@example.com'
        msg['Subject'] = 'SMTP Connection Test'
        
        body = "This is a test message to verify SMTP connection."
        msg.attach(MIMEText(body, 'plain'))
        
        # Don't actually send, just test the connection
        print("✓ Message prepared (not sending)")
        
        # Close connection
        server.quit()
        print("✓ SMTP connection test successful!")
        
        return True
        
    except Exception as e:
        print(f"✗ SMTP connection failed: {e}")
        import traceback
        traceback.print_exc()
        return False