from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework.permissions import AllowAny
from django.middleware.csrf import get_token
from .email_service import send_email_verification, verify_email_token, verify_email_code, send_password_reset_email, verify_password_reset_code
import re

@method_decorator(csrf_exempt, name='dispatch')
class SignupView(APIView):
    permission_classes = [AllowAny]  # Allow unauthenticated access
    
    def post(self, request):
        username = request.data.get('username', '').strip()
        email = request.data.get('email', '').strip()
        company_name = request.data.get('companyName', '').strip()
        password = request.data.get('password', '')
        
        # Validation
        if not username or not password:
            return Response({
                'error': 'Username and password are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if not email:
            return Response({
                'error': 'Email address is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if not company_name:
            return Response({
                'error': 'Company name is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if len(password) < 6:
            return Response({
                'error': 'Password must be at least 6 characters long'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if len(username) < 3:
            return Response({
                'error': 'Username must be at least 3 characters long'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Email validation (now required)
        if not re.match(r'^[^\s@]+@[^\s@]+\.[^\s@]+$', email):
            return Response({
                'error': 'Please enter a valid email address'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if user exists
        if User.objects.filter(username=username).exists():
            return Response({
                'error': 'Username already exists'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if email and User.objects.filter(email=email).exists():
            return Response({
                'error': 'Email already registered'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Create inactive user (email verification required)
            user = User.objects.create_user(
                username=username,
                email=email or '',
                password=password,
                is_active=False,    # User must verify email first
                is_staff=True,      # Can access Django admin
                is_superuser=True   # Has all permissions
            )
            
            # Create a default company for the new user
            from .models import UserProfile, Company
            import random
            
            # Generate unique company code
            company_code = f"USR{user.id:03d}"
            
            # Create company with provided name
            company = Company.objects.create(
                user=user,
                name=company_name,
                company_code=company_code,
                emirate='dubai',  # Default emirate
                sector='hospitality'  # Default sector
            )
            
            # Set company directly on User for fast access
            user.company = company
            user.save()
            
            # Create UserProfile linked to the company
            UserProfile.objects.create(
                user=user,
                role='super_user',
                company=company,
                email_verified=False  # Will be set to True after email verification
            )
            
            # Auto-assign mandatory frameworks to the new company
            from .services import FrameworkService
            FrameworkService.assign_mandatory_frameworks(company, user)
            
            # Send email verification
            email_result = send_email_verification(user, request)
            
            if email_result and email_result.get('success'):
                return Response({
                    'message': 'Account created successfully! Please check your email to verify your account.',
                    'email_sent': email_result.get('email_sent', False),
                    'user_email': user.email,
                    'verification_code': email_result.get('verification_code'),  # For testing
                    'next_step': 'Enter the 6-digit verification code to activate your account.'
                }, status=status.HTTP_201_CREATED)
            else:
                # If email sending fails, still return success but mention the issue
                error_message = email_result.get('message', 'Unknown error') if email_result else 'Failed to generate verification code'
                return Response({
                    'message': 'Account created successfully, but there was an issue with the verification process.',
                    'email_sent': False,
                    'user_email': user.email,
                    'error': error_message,
                    'next_step': 'Please try signing up again or contact support.'
                }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response({
                'error': 'Failed to create user. Please try again.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@method_decorator(csrf_exempt, name='dispatch')
class LoginView(APIView):
    permission_classes = [AllowAny]  # Allow unauthenticated access
    
    def get(self, request):
        return Response({'message': 'Login endpoint is working'})
    
    def post(self, request):
        print(f"🔍 Raw request data: {request.data}")
        print(f"🔍 Request content type: {request.content_type}")
        
        email = request.data.get('email', '').strip()
        username = request.data.get('username', '').strip()  # Backwards compatibility
        password = request.data.get('password', '')
        
        print(f"🔍 Login attempt - Email: '{email}', Username: '{username}', Password: '{password[:3]}...'")
        print(f"🔍 Request data: {request.data}")
        print(f"🔍 Request method: {request.method}")
        company_code = request.data.get('company_code', '')
        
        # Support both email and username login
        login_field = email or username
        
        if not login_field or not password:
            return Response({
                'error': 'Email/Username and password are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Try to authenticate with email first, then username
        user = None
        if email:
            # Try to find user by email and check password manually for inactive users
            try:
                user_obj = User.objects.get(email=email)
                # Check password manually to handle inactive users
                if user_obj.check_password(password):
                    user = user_obj
            except User.DoesNotExist:
                user = None
        else:
            # For username login, try normal authenticate first, then manual check for inactive users
            user = authenticate(request, username=username, password=password)
            if user is None:
                # Try to find inactive user with username
                try:
                    user_obj = User.objects.get(username=username)
                    if user_obj.check_password(password):
                        user = user_obj
                except User.DoesNotExist:
                    user = None
        
        if user is not None:
            # Check if user is inactive (first time login)
            if not user.is_active:
                # Activate user on first successful login
                user.is_active = True
                user.save()
            
            login(request, user)
            
            # Get user role and check password reset requirement
            try:
                user_profile = user.userprofile
                user_role = user_profile.role
                must_reset_password = user_profile.must_reset_password
            except:
                user_role = 'viewer'  # Default fallback role
                must_reset_password = False
            
            response_data = {
                'message': 'Login successful',
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'name': f"{user.first_name} {user.last_name}".strip() or user.username,
                    'role': user_role,
                    'must_reset_password': must_reset_password
                }
            }
            
            # If user must reset password, include special flag
            if must_reset_password:
                response_data['requires_password_reset'] = True
                response_data['message'] = 'Login successful. You must reset your password.'
            
            return Response(response_data)
        else:
            return Response({
                'error': 'Invalid email/username or password'
            }, status=status.HTTP_401_UNAUTHORIZED)

@method_decorator(csrf_exempt, name='dispatch')
class LogoutView(APIView):
    def post(self, request):
        logout(request)
        return Response({'message': 'Logged out successfully'})

@method_decorator(csrf_exempt, name='dispatch')
class UserProfileView(APIView):
    def get(self, request):
        if request.user.is_authenticated:
            # Get or create user profile
            try:
                from .models import UserProfile
                profile, created = UserProfile.objects.get_or_create(
                    user=request.user,
                    defaults={
                        'role': 'super_user' if request.user.is_superuser else 'viewer'
                    }
                )
                user_role = profile.role
            except Exception as e:
                print(f"Error getting user profile: {e}")
                user_role = 'super_user' if request.user.is_superuser else 'viewer'
            
            return Response({
                'user': {
                    'id': request.user.id,
                    'username': request.user.username,
                    'email': request.user.email,
                    'name': f"{request.user.first_name} {request.user.last_name}".strip() or request.user.username,
                    'role': user_role,
                    'is_superuser': request.user.is_superuser
                }
            })
        else:
            return Response({
                'error': 'Not authenticated'
            }, status=status.HTTP_401_UNAUTHORIZED)


@method_decorator(csrf_exempt, name='dispatch')
class RoleSwitchView(APIView):
    """Switch user role for testing purposes"""
    
    def post(self, request):
        if not request.user.is_authenticated:
            return Response({
                'error': 'Not authenticated'
            }, status=status.HTTP_401_UNAUTHORIZED)
            
        new_role = request.data.get('role')
        if not new_role:
            return Response({
                'error': 'Role is required'
            }, status=status.HTTP_400_BAD_REQUEST)
            
        # Valid roles
        valid_roles = ['super_user', 'admin', 'site_manager', 'uploader', 'viewer', 'meter_manager']
        if new_role not in valid_roles:
            return Response({
                'error': 'Invalid role'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Get or create user's profile
            from .models import UserProfile
            profile, created = UserProfile.objects.get_or_create(
                user=request.user,
                defaults={'role': 'super_user'}  # Default role for new profiles
            )
            
            # Update role
            profile.role = new_role
            profile.save()
            
            return Response({
                'message': 'Role switched successfully',
                'new_role': new_role,
                'profile_created': created
            })
        except Exception as e:
            return Response({
                'error': f'Failed to switch role: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@method_decorator(csrf_exempt, name='dispatch')
class CsrfTokenView(APIView):
    """Get CSRF token for authenticated requests"""
    permission_classes = [AllowAny]
    
    def get(self, request):
        token = get_token(request)
        return Response({'csrfToken': token})


@method_decorator(csrf_exempt, name='dispatch')
class ResetPasswordView(APIView):
    """Reset user's own password"""
    
    def post(self, request):
        print(f"🔐 Personal password reset request from user: {request.user.username if request.user.is_authenticated else 'Anonymous'}")
        
        if not request.user.is_authenticated:
            return Response({
                'error': 'Not authenticated'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        current_password = request.data.get('current_password', '')
        new_password = request.data.get('new_password', '')
        
        if not current_password or not new_password:
            return Response({
                'error': 'Both current and new password are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate current password
        if not request.user.check_password(current_password):
            return Response({
                'error': 'Current password is incorrect'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate new password
        if len(new_password) < 6:
            return Response({
                'error': 'New password must be at least 6 characters long'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Set new password
            request.user.set_password(new_password)
            request.user.save()
            
            # Clear the must_reset_password flag
            try:
                user_profile = request.user.userprofile
                user_profile.must_reset_password = False
                user_profile.save()
            except:
                pass  # Profile might not exist
            
            return Response({
                'message': 'Password reset successfully'
            })
            
        except Exception as e:
            return Response({
                'error': f'Failed to reset password: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@method_decorator(csrf_exempt, name='dispatch')
class UserSitesView(APIView):
    """Get sites accessible to the current user"""
    
    def get(self, request):
        if not request.user.is_authenticated:
            return Response({
                'error': 'Not authenticated'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        # For now, return empty sites since we haven't implemented the full site system yet
        # TODO: Implement proper site filtering based on user role and permissions
        return Response([])


@method_decorator(csrf_exempt, name='dispatch')
class CompanyUpdateView(APIView):
    """Direct company update endpoint (bypasses DRF router)"""
    
    def post(self, request, company_id):
        print(f"\n🏢 === DIRECT COMPANY UPDATE REQUEST START ===")
        print(f"👤 User: {request.user.username} (ID: {request.user.id})")
        print(f"🏢 Company ID: {company_id}")
        print(f"📝 Request data: {request.data}")
        
        if not request.user.is_authenticated:
            return Response({
                'error': 'Not authenticated'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        try:
            from .models import Company
            from .views import get_user_company
            
            company = get_user_company(request.user, company_id)
            print(f"✅ Company found: {company.name} (ID: {company.id})")
            
            # Update allowed fields
            if 'name' in request.data:
                company.name = request.data['name']
                print(f"📝 Updated name to: {company.name}")
                
            if 'emirate' in request.data:
                company.emirate = request.data['emirate'].lower()
                print(f"📍 Updated emirate to: {company.emirate}")
                
            if 'sector' in request.data:
                company.sector = request.data['sector'].lower().replace(' & ', '_').replace(' ', '_')
                print(f"🏭 Updated sector to: {company.sector}")
            
            company.save()
            print(f"✅ Company saved successfully")
            
            # Return updated company data
            response_data = {
                'id': company.id,
                'name': company.name,
                'emirate': company.emirate,
                'sector': company.sector,
                'created_at': company.created_at.isoformat() if company.created_at else None
            }
            
            print(f"📤 Returning company data: {response_data}")
            print(f"🏢 === DIRECT COMPANY UPDATE REQUEST END ===\n")
            
            return Response(response_data)
            
        except Exception as e:
            print(f"❌ Error updating company: {str(e)}")
            print(f"🏢 === DIRECT COMPANY UPDATE REQUEST END (ERROR) ===\n")
            return Response(
                {'error': f'Failed to update company: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class CsrfTokenView(APIView):
    """
    View to get CSRF token
    """
    permission_classes = [AllowAny]
    
    def get(self, request):
        from django.middleware.csrf import get_token
        token = get_token(request)
        return Response({'csrfToken': token})


@method_decorator(csrf_exempt, name='dispatch')
class EmailVerificationView(APIView):
    """
    View to verify email address using token
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        token = request.data.get('token', '').strip()
        
        if not token:
            return Response({
                'error': 'Verification token is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            success, message, user = verify_email_token(token)
            
            if success:
                return Response({
                    'message': message,
                    'verified': True,
                    'user': {
                        'id': user.id,
                        'username': user.username,
                        'email': user.email,
                        'is_active': user.is_active
                    }
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    'error': message,
                    'verified': False
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            return Response({
                'error': 'An error occurred during verification'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@method_decorator(csrf_exempt, name='dispatch')
class EmailCodeVerificationView(APIView):
    """
    View to verify email address using verification code
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        email = request.data.get('email', '').strip()
        verification_code = request.data.get('verification_code', '').strip()
        
        if not email:
            return Response({
                'error': 'Email address is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if not verification_code:
            return Response({
                'error': 'Verification code is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            success, message, user = verify_email_code(email, verification_code)
            
            if success:
                return Response({
                    'message': message,
                    'verified': True,
                    'user': {
                        'id': user.id,
                        'username': user.username,
                        'email': user.email,
                        'is_active': user.is_active
                    }
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    'error': message,
                    'verified': False
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            return Response({
                'error': 'An error occurred during verification'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@method_decorator(csrf_exempt, name='dispatch')
class ResendVerificationView(APIView):
    """
    View to resend verification email
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        email = request.data.get('email', '').strip()
        
        if not email:
            return Response({
                'error': 'Email address is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Find user by email
            user = User.objects.get(email=email, is_active=False)
            
            # Check if user profile exists and email is not verified
            if hasattr(user, 'userprofile') and user.userprofile.email_verified:
                return Response({
                    'error': 'Email is already verified'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Send verification email
            email_sent = send_email_verification(user, request)
            
            if email_sent:
                return Response({
                    'message': 'Verification email has been resent. Please check your inbox.',
                    'email_sent': True
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    'error': 'Failed to send verification email. Please try again later.'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
        except User.DoesNotExist:
            return Response({
                'error': 'No unverified account found with this email address'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                'error': 'An error occurred while sending verification email'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@method_decorator(csrf_exempt, name='dispatch')
class SendResetCodeView(APIView):
    """
    View to send password reset verification code
    """
    permission_classes = [AllowAny]  # Allow both authenticated and unauthenticated
    
    def post(self, request):
        print(f"🔐 Password reset code request received")
        print(f"📧 Request data: {request.data}")
        print(f"👤 User authenticated: {request.user.is_authenticated}")
        
        # Get email from request
        email = request.data.get('email', '').strip()
        
        # If no email provided but user is authenticated, use their email
        if not email and request.user.is_authenticated:
            email = request.user.email
            print(f"📧 Using authenticated user's email: {email}")
        
        if not email:
            return Response({
                'error': 'Email address is required',
                'success': False
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Find user by email
            user = User.objects.get(email=email)
            print(f"✅ User found: {user.username}")
            
            # For testing mode, return hardcoded verification code
            # In production, you would call send_password_reset_email(user)
            verification_code = '654321'  # Hardcoded for testing
            
            print(f"🔢 Verification code: {verification_code}")
            
            return Response({
                'message': 'Password reset verification code generated successfully',
                'success': True,
                'email_sent': False,  # Set to True in production when email is actually sent
                'verification_code': verification_code,  # Remove this in production for security
                'user_email': user.email
            }, status=status.HTTP_200_OK)
            
        except User.DoesNotExist:
            print(f"❌ User not found with email: {email}")
            return Response({
                'error': 'No user found with this email address',
                'success': False
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            print(f"❌ Error in SendResetCodeView: {str(e)}")
            import traceback
            traceback.print_exc()
            return Response({
                'error': f'An error occurred: {str(e)}',
                'success': False
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@method_decorator(csrf_exempt, name='dispatch')
class VerifyResetCodeView(APIView):
    """
    View to verify password reset verification code
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        print(f"🔐 Password reset code verification request")
        print(f"📧 Request data: {request.data}")
        
        email = request.data.get('email', '').strip()
        verification_code = request.data.get('verification_code', '').strip()
        
        # If no email provided but user is authenticated, use their email
        if not email and request.user.is_authenticated:
            email = request.user.email
            print(f"📧 Using authenticated user's email: {email}")
        
        if not email:
            return Response({
                'error': 'Email address is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if not verification_code:
            return Response({
                'error': 'Verification code is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # For testing, accept hardcoded code
            if verification_code == '654321':
                print(f"✅ Verification code matched (test mode)")
                
                # Find user for response
                user = User.objects.get(email=email)
                
                return Response({
                    'message': 'Verification successful',
                    'verified': True,
                    'user': {
                        'id': user.id,
                        'username': user.username,
                        'email': user.email
                    }
                }, status=status.HTTP_200_OK)
            
            # For testing, if code doesn't match
            return Response({
                'error': 'Invalid verification code',
                'verified': False
            }, status=status.HTTP_400_BAD_REQUEST)
                
        except User.DoesNotExist:
            return Response({
                'error': 'User not found',
                'verified': False
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            print(f"❌ Error in VerifyResetCodeView: {str(e)}")
            import traceback
            traceback.print_exc()
            return Response({
                'error': f'An error occurred during verification: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)