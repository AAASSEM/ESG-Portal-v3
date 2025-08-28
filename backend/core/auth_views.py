from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework.permissions import AllowAny
from django.middleware.csrf import get_token
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
            # Create superuser by default
            user = User.objects.create_user(
                username=username,
                email=email or '',
                password=password,
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
            
            # Create UserProfile linked to the company
            UserProfile.objects.create(
                user=user,
                role='super_user',
                company=company
            )
            
            # Auto-assign mandatory frameworks to the new company
            from .services import FrameworkService
            FrameworkService.assign_mandatory_frameworks(company, user)
            
            # Auto-login after signup
            login(request, user)
            
            return Response({
                'message': 'Superuser and company created successfully',
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'name': f"{user.first_name} {user.last_name}".strip() or user.username,
                    'role': 'super_user',
                    'is_superuser': True,
                    'company': {
                        'id': company.id,
                        'name': company.name,
                        'company_code': company.company_code
                    }
                }
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