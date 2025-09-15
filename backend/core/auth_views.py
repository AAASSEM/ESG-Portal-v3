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
from django.conf import settings
from django.db import transaction
import os
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
        
        # Step 1: Create user account in explicit transaction
        try:
            with transaction.atomic():
                print("🔄 Starting user creation transaction...")
                
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
                    email=email,  # Set the email in UserProfile
                    company=company,
                    email_verified=False  # Will be set to True after email verification
                )
                
                # Auto-assign mandatory frameworks to the new company
                # TEMPORARILY DISABLED FOR EMAIL TESTING
                # from .services import FrameworkService
                # FrameworkService.assign_mandatory_frameworks(company, user)
                print("⚠️ Framework assignment SKIPPED for email testing")
                
                print("✅ User creation transaction completed - all data committed")
                
        except Exception as e:
            print(f"❌ Error creating user account: {str(e)}")
            return Response({
                'error': 'Failed to create account'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        print(f"✅ User account created successfully: {user.email}")
        print(f"📧 Email verification will be handled automatically by signals")
        
        
        response_message = 'Account created successfully! Please check your email to verify your account.'
        next_step = 'Click the verification link in your email to activate your account.'
        
        return Response({
            'message': response_message,
            'user_email': user.email,
            'email_sent': True,  # Signal will handle email sending
            'next_step': next_step
        }, status=status.HTTP_201_CREATED)

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
        password = request.data.get('password', '').strip()  # Remove leading/trailing spaces
        
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
            # Check if user is inactive - they must verify email first
            if not user.is_active:
                # Check if email is verified before allowing login
                try:
                    user_profile = user.userprofile
                    if not user_profile.email_verified:
                        return Response({
                            'error': 'Account not verified. Please check your email and click the verification link before logging in.',
                            'requires_verification': True,
                            'email': user.email
                        }, status=status.HTTP_403_FORBIDDEN)
                except:
                    # If no profile exists, still require verification
                    return Response({
                        'error': 'Account not verified. Please check your email and click the verification link before logging in.',
                        'requires_verification': True,
                        'email': user.email
                    }, status=status.HTTP_403_FORBIDDEN)
                
                # If email is verified but user is still inactive, activate them
                user.is_active = True
                user.save()
            
            login(request, user)
            
            # Get user role and check password reset requirement
            try:
                user_profile = user.userprofile
                user_role = user_profile.role
                must_reset_password = user_profile.must_reset_password

                # Auto-set active location for users with assignments but no active location
                from .models import UserSiteAssignment
                if not user_profile.site and not user_profile.view_all_locations:
                    user_assignments = UserSiteAssignment.objects.filter(user=user)
                    if user_assignments.count() == 1:
                        # User has exactly one site assignment - set it as active
                        user_profile.site = user_assignments.first().site
                        user_profile.view_all_locations = False
                        user_profile.save()
                        print(f"🎯 Auto-set active location to {user_assignments.first().site.name} for user {user.username} on login")
                    elif user_assignments.count() > 1:
                        # User has multiple assignments but no active location - they'll need to choose
                        print(f"📍 User {user.username} has {user_assignments.count()} site assignments but no active location - will need to select")

            except:
                user_role = 'viewer'  # Default fallback role
                must_reset_password = False

            # Determine redirect path based on user role
            role_redirect_map = {
                'super_user': '/onboard',
                'admin': '/onboard', 
                'site_manager': '/onboard',
                'viewer': '/onboard',
                'meter_manager': '/meter',
                'uploader': '/data'
            }
            
            redirect_path = role_redirect_map.get(user_role, '/dashboard')  # Default to dashboard
            
            response_data = {
                'message': 'Login successful',
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'name': f"{user.first_name} {user.last_name}".strip() or user.username,
                    'role': user_role,
                    'must_reset_password': must_reset_password
                },
                'redirect_path': redirect_path
            }
            
            # If user must reset password, include special flag
            if must_reset_password:
                response_data['requires_password_reset'] = True
                response_data['message'] = 'Login successful. You must reset your password.'
                response_data['redirect_path'] = '/reset-password'  # Override redirect for password reset
            
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
            
            # Get must_reset_password from profile
            try:
                must_reset_password = profile.must_reset_password if hasattr(profile, 'must_reset_password') else False
            except:
                must_reset_password = False
            
            return Response({
                'user': {
                    'id': request.user.id,
                    'username': request.user.username,
                    'email': request.user.email,
                    'name': f"{request.user.first_name} {request.user.last_name}".strip() or request.user.username,
                    'role': user_role,
                    'is_superuser': request.user.is_superuser,
                    'must_reset_password': must_reset_password  # Added missing field!
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
        
        # Special handling for account setup (magic link users)
        # OLD LOGIC COMMENTED: Standard password validation for existing users
        if current_password == 'temporary_setup_password':
            # This is an account setup request from magic link authentication
            print(f"🔗 Account setup request detected for user: {request.user.username}")
            
            # Check if user actually needs password setup
            try:
                user_profile = request.user.userprofile
                if not user_profile.must_reset_password:
                    return Response({
                        'error': 'Account setup not required'
                    }, status=status.HTTP_400_BAD_REQUEST)
            except:
                # If no profile, allow setup
                pass
        else:
            # Standard password validation for existing users
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
            
            # Check if this was account setup
            if current_password == 'temporary_setup_password':
                success_message = 'Account setup completed successfully'
                print(f"✅ Account setup completed for user: {request.user.username}")
            else:
                success_message = 'Password reset successfully'
                print(f"✅ Password reset completed for user: {request.user.username}")
            
            return Response({
                'message': success_message,
                'success': True
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
        
        try:
            user = request.user
            
            # Get user's company
            user_company = None
            if hasattr(user, 'company') and user.company:
                user_company = user.company
            elif hasattr(user, 'userprofile') and user.userprofile and user.userprofile.company:
                user_company = user.userprofile.company
            
            if not user_company:
                return Response([])
            
            # Get user's role
            user_role = 'viewer'  # default
            if hasattr(user, 'userprofile') and user.userprofile:
                user_role = user.userprofile.role
            
            # Role-based access control
            if user_role in ['meter_manager', 'uploader']:
                # Meter managers and uploaders have no access to locations
                return Response([])
            
            # Import models
            from .models import Site, UserSiteAssignment
            from .serializers import SiteSerializer
            
            if user_role in ['super_user', 'admin']:
                # Super users and admins see all company sites
                sites = Site.objects.filter(company=user_company).order_by('name')
            elif user_role in ['site_manager', 'viewer']:
                # Site managers and viewers see sites based on assignments
                # If no assignments, they see all company sites (backward compatibility)
                user_assignments = UserSiteAssignment.objects.filter(user=user).select_related('site')
                
                if user_assignments.exists():
                    # Return only assigned sites
                    sites = [assignment.site for assignment in user_assignments]
                    sites.sort(key=lambda x: x.name)
                else:
                    # No assignments yet - return all company sites for backward compatibility
                    sites = Site.objects.filter(company=user_company).order_by('name')
            else:
                # Unknown role - no access
                return Response([])
            
            serializer = SiteSerializer(sites, many=True)
            
            return Response(serializer.data)
            
        except Exception as e:
            print(f"❌ Error in UserSitesView: {str(e)}")
            return Response([])


@method_decorator(csrf_exempt, name='dispatch')
class UserPermissionsView(APIView):
    """Get user's location access permissions"""
    
    def get(self, request):
        print(f"\n🔐 === PERMISSIONS REQUEST START ===")
        print(f"👤 User: {request.user.username} (ID: {request.user.id})")
        
        if not request.user.is_authenticated:
            return Response({
                'error': 'Not authenticated'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        try:
            user = request.user
            
            # Get user's role
            user_role = 'viewer'  # default
            if hasattr(user, 'userprofile') and user.userprofile:
                user_role = user.userprofile.role
                print(f"🎭 Role from userprofile: {user_role}")
            else:
                print("❗ No userprofile found, using default role: viewer")
            
            # Check user's site assignments
            from .models import UserSiteAssignment
            user_assignments = UserSiteAssignment.objects.filter(user=user)
            assigned_site_count = user_assignments.count()
            print(f"🏢 Site assignments: {assigned_site_count}")
            if assigned_site_count > 0:
                assigned_sites = [f"{assignment.site.name} (ID: {assignment.site.id})" for assignment in user_assignments]
                print(f"📍 Assigned sites: {assigned_sites}")
            
            # Determine permissions based on role and assignments
            can_access_location = user_role not in ['meter_manager', 'uploader']
            
            # For site managers and viewers, they need at least one site assignment to access anything
            if user_role in ['site_manager', 'viewer'] and assigned_site_count == 0:
                can_access_location = False
                can_change_location = False
                show_dropdown = False
            else:
                can_change_location = user_role in ['super_user', 'admin'] or (user_role in ['site_manager', 'viewer'] and assigned_site_count != 1)
                show_dropdown = user_role not in ['meter_manager', 'uploader'] and (user_role in ['super_user', 'admin'] or assigned_site_count != 1)
            
            permissions = {
                'canAccessLocationPage': can_access_location,
                'canChangeLocation': can_change_location,
                'showLocationDropdown': show_dropdown,
                'role': user_role,
                'assignedSiteCount': assigned_site_count
            }
            
            print(f"🔐 Calculated permissions:")
            print(f"  - canAccessLocationPage: {can_access_location}")
            print(f"  - canChangeLocation: {can_change_location}")
            print(f"  - showLocationDropdown: {show_dropdown}")
            print(f"  - role: {user_role}")
            print(f"  - assignedSiteCount: {assigned_site_count}")
            
            # Additional logic explanation
            if user_role in ['site_manager', 'viewer'] and assigned_site_count == 0:
                print(f"🚫 Site manager/viewer with 0 assignments - access denied")
            elif user_role in ['site_manager', 'viewer'] and assigned_site_count == 1:
                print(f"🔒 Site manager/viewer with 1 assignment - dropdown hidden, access read-only")
            elif user_role in ['site_manager', 'viewer'] and assigned_site_count > 1:
                print(f"🔓 Site manager/viewer with multiple assignments - full dropdown access")
                
            print(f"🔐 === PERMISSIONS REQUEST END ===\n")
            
            return Response(permissions)
            
        except Exception as e:
            print(f"❌ Error in UserPermissionsView: {str(e)}")
            return Response({
                'canAccessLocationPage': False,
                'canChangeLocation': False,
                'showLocationDropdown': False,
                'role': 'viewer',
                'assignedSiteCount': 0
            })


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
                # Log the user in using Django sessions (same as login)
                from django.contrib.auth import login
                login(request, user)
                
                # Get user profile info
                profile_data = {}
                if hasattr(user, 'userprofile'):
                    profile = user.userprofile
                    profile_data = {
                        'role': profile.role,
                        'company_name': profile.company.name if profile.company else '',
                        'company_id': profile.company.id if profile.company else None
                    }
                
                return Response({
                    'message': message,
                    'verified': True,
                    'auto_login': True,
                    'session_created': True,
                    'user': {
                        'id': user.id,
                        'username': user.username,
                        'email': user.email,
                        'is_active': user.is_active,
                        'profile': profile_data
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
            
            # Send real password reset email via signals system
            email_result = send_password_reset_email(user)
            print(f"📧 Password reset email result: {email_result}")
            
            return Response({
                'message': 'Password reset verification code sent to your email',
                'success': True,
                'email_sent': email_result.get('email_sent', False),
                'user_email': user.email,
                'next_step': 'Check your email for the 6-digit verification code'
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
            # Use real verification system
            print(f"🔍 Verifying code {verification_code} for {email}")
            
            success, message, user = verify_password_reset_code(email, verification_code)
            
            if success and user:
                print(f"✅ Password reset code verified for {email}")
                
                return Response({
                    'message': message,
                    'verified': True,
                    'user': {
                        'id': user.id,
                        'username': user.username,
                        'email': user.email
                    }
                }, status=status.HTTP_200_OK)
            else:
                print(f"❌ Password reset code verification failed: {message}")
                return Response({
                    'error': message,
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


@method_decorator(csrf_exempt, name='dispatch')
class MagicLinkAuthView(APIView):
    """
    Magic Link Authentication - Auto-login via invitation token
    Users click invitation link and are automatically logged in
    """
    permission_classes = [AllowAny]
    
    def get(self, request, token):
        print(f"🔗 Magic link authentication request for token: {token[:8]}...")
        
        try:
            from .models import EmailVerificationToken
            
            # Find and validate the token (invitation OR email_verification)
            try:
                token_obj = EmailVerificationToken.objects.get(
                    token=token,
                    token_type__in=['invitation', 'email_verification'],
                    used_at__isnull=True  # Check if not used yet
                )
                print(f"✅ Valid {token_obj.token_type} token found for user: {token_obj.user.email}")
            except EmailVerificationToken.DoesNotExist:
                print(f"❌ Invalid or expired magic link token")
                # Redirect to login with error message
                from django.shortcuts import redirect
                from .email_service import get_base_url
                base_url = get_base_url()
                return redirect(f"{base_url}/login?error=invalid_token")
            
            user = token_obj.user
            
            # Check if token is expired (7 days)
            from django.utils import timezone
            from datetime import timedelta
            
            if token_obj.created_at < timezone.now() - timedelta(days=7):
                print(f"❌ Invitation token expired for user: {user.email}")
                # Redirect to login with error message
                from django.shortcuts import redirect
                from .email_service import get_base_url
                base_url = get_base_url()
                return redirect(f"{base_url}/login?error=invitation_expired")
            
            # Auto-login the user (magic link authentication)
            print(f"🔐 Auto-authenticating user: {user.email}")
            
            # Activate user if not already active
            if not user.is_active:
                user.is_active = True
                user.save()
                print(f"✅ User activated: {user.email}")
            
            # Log the user in using Django's session authentication
            login(request, user)
            print(f"✅ User logged in via magic link: {user.email}")
            
            # Mark email as verified (for both signup and invitation)
            try:
                if hasattr(user, 'userprofile'):
                    user.userprofile.email_verified = True
                    user.userprofile.save()
                    print(f"✅ Email marked as verified for user: {user.email}")
            except Exception as e:
                print(f"⚠️ Could not mark email as verified: {e}")
            
            # Mark token as used (keep for audit trail)
            from django.utils import timezone
            token_obj.used_at = timezone.now()
            token_obj.save()
            print(f"✅ Token marked as used")
            
            # Get user profile for additional info
            from .models import UserProfile
            try:
                user_profile = user.userprofile
                user_role = user_profile.role
                user_company = user_profile.company
            except UserProfile.DoesNotExist:
                # Create minimal profile if missing
                user_profile = UserProfile.objects.create(
                    user=user,
                    role='viewer',
                    email=user.email
                )
                user_role = 'viewer'
                user_company = None
                print(f"⚠️ Created minimal user profile for: {user.email}")
            
            # Determine redirect destination based on token type and user role
            if token_obj.token_type == 'email_verification':
                # This is a signup verification - redirect super users to onboarding
                print(f"📧 Email verification magic link for signup user")
                redirect_to = '/onboard'  # Super users go to onboarding after signup verification
                needs_password_setup = False  # Signup users already have passwords
            else:
                # This is an invitation - check if user needs password setup
                profile_needs_reset = getattr(user_profile, 'must_reset_password', True)
                has_unusable_password = not user.has_usable_password()
                needs_password_setup = profile_needs_reset or has_unusable_password
                
                print(f"👨‍💼 Invitation magic link - password setup check:")
                print(f"   - Profile must_reset_password: {profile_needs_reset}")
                print(f"   - Has unusable password: {has_unusable_password}")
                print(f"   - Needs setup: {needs_password_setup}")
                
                redirect_to = '/setup-account' if needs_password_setup else '/dashboard'
            
            response_data = {
                'success': True,
                'message': 'Magic link authentication successful',
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'name': f"{user.first_name} {user.last_name}".strip() or user.username,
                    'role': user_role,
                    'is_active': user.is_active,
                    'must_reset_password': False if token_obj.token_type == 'email_verification' else needs_password_setup
                },
                'needs_password_setup': False if token_obj.token_type == 'email_verification' else needs_password_setup,
                'redirect_to': redirect_to
            }
            
            print(f"✅ Magic link authentication successful for: {user.email}")
            print(f"🎯 Redirecting to: {response_data['redirect_to']}")
            
            # Since this is accessed via browser (magic link), redirect to frontend
            from django.shortcuts import redirect
            from .email_service import get_base_url
            
            base_url = get_base_url()
            frontend_redirect_url = f"{base_url}{response_data['redirect_to']}"
            
            print(f"🔗 Redirecting browser to: {frontend_redirect_url}")
            return redirect(frontend_redirect_url)
            
        except Exception as e:
            print(f"❌ Magic link authentication error: {str(e)}")
            import traceback
            traceback.print_exc()
            # Redirect to login with error message
            from django.shortcuts import redirect
            from .email_service import get_base_url
            base_url = get_base_url()
            return redirect(f"{base_url}/login?error=authentication_failed")