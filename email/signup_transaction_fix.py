# THE REAL FIX: Update SignupView in auth_views.py
# The problem is that email is being sent inside a transaction that hasn't committed yet

from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework.permissions import AllowAny
from django.db import transaction
from .email_service import send_email_verification

@method_decorator(csrf_exempt, name='dispatch')
class SignupView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        username = request.data.get('username', '').strip()
        email = request.data.get('email', '').strip()
        company_name = request.data.get('companyName', '').strip()
        password = request.data.get('password', '')
        
        # Validation (keep existing validation code)
        if not username or not password:
            return Response({
                'error': 'Username and password are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # ... (keep all other validation)
        
        # CRITICAL FIX: Separate user creation from email sending
        verification_code = None
        email_sent = False
        email_error = None
        
        try:
            # STEP 1: Create user and related objects in a transaction
            with transaction.atomic():
                # Create user
                user = User.objects.create_user(
                    username=username,
                    email=email,
                    password=password,
                    is_active=False,  # Inactive until email verified
                    is_staff=True,
                    is_superuser=True
                )
                
                # Create company
                from .models import UserProfile, Company
                
                company_code = f"USR{user.id:03d}"
                company = Company.objects.create(
                    user=user,
                    name=company_name,
                    company_code=company_code,
                    emirate='dubai',
                    sector='hospitality'
                )
                
                # Set company on user
                user.company = company
                user.save()
                
                # Create UserProfile
                UserProfile.objects.create(
                    user=user,
                    role='super_user',
                    email=email,
                    company=company,
                    email_verified=False
                )
                
                # IMPORTANT: Don't do framework assignment yet
                # We'll do it AFTER email is sent successfully
                
            # STEP 2: Now that transaction is committed, send email
            # User exists in DB, so email service can access it
            print(f"📧 User created with ID {user.id}, now sending email...")
            
            try:
                email_result = send_email_verification(user, request)
                
                if email_result:
                    email_sent = email_result.get('email_sent', False)
                    verification_code = email_result.get('verification_code')
                    email_error = email_result.get('message') if not email_sent else None
                    
                    print(f"📧 Email result: sent={email_sent}, code={verification_code}")
                else:
                    email_error = "Email service returned no result"
                    
            except Exception as e:
                print(f"⚠️ Email sending exception: {e}")
                email_error = str(e)
                email_sent = False
            
            # STEP 3: Now do framework assignment (non-critical)
            try:
                from .services import FrameworkService
                FrameworkService.assign_mandatory_frameworks(company, user)
                print(f"✓ Frameworks assigned for company {company.id}")
            except Exception as e:
                print(f"⚠️ Framework assignment failed (non-critical): {e}")
                # Don't fail signup for this
            
            # STEP 4: Return appropriate response
            if email_sent:
                return Response({
                    'message': 'Account created successfully! Please check your email to verify your account.',
                    'email_sent': True,
                    'user_email': user.email,
                    'verification_code': verification_code,  # For testing only
                    'next_step': 'Enter the 6-digit verification code to activate your account.'
                }, status=status.HTTP_201_CREATED)
            else:
                # Account created but email failed - still successful signup
                return Response({
                    'message': 'Account created successfully!',
                    'email_sent': False,
                    'user_email': user.email,
                    'verification_code': verification_code,  # Include for testing
                    'email_warning': 'Verification email could not be sent.',
                    'email_error': email_error,
                    'next_step': f'Use verification code: {verification_code}' if verification_code else 'Contact support for verification.'
                }, status=status.HTTP_201_CREATED)
                
        except Exception as e:
            print(f"❌ Signup error: {str(e)}")
            import traceback
            traceback.print_exc()
            
            # Try to clean up if user was partially created
            try:
                if 'user' in locals():
                    user.delete()
            except:
                pass
                
            return Response({
                'error': f'Failed to create account: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)