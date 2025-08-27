from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.contrib.auth.models import User
from .models import UserProfile


@method_decorator(csrf_exempt, name='dispatch')
class UserViewSet(viewsets.ModelViewSet):
    """ViewSet for user management"""
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Return users based on current user's permissions"""
        current_user = self.request.user
        
        # Get current user's role and company
        try:
            user_profile = current_user.userprofile
            user_role = user_profile.role
            user_company = user_profile.company
        except:
            user_role = 'viewer'
            user_company = None
        
        # All users (including super_user) should only see users from their company
        if user_company:
            return User.objects.filter(
                userprofile__company=user_company
            ).select_related('userprofile')
        else:
            # If user has no company, they see no users
            return User.objects.none()
    
    def create(self, request, *args, **kwargs):
        """Create a new user"""
        # Check permissions
        current_user = self.request.user
        try:
            user_profile = current_user.userprofile
            user_role = user_profile.role
            user_company = user_profile.company
        except:
            return Response(
                {'error': 'User profile not found'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Check if user has a company assigned
        if not user_company:
            return Response(
                {'error': 'You must be assigned to a company to create users'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Only super_user, admin, and site_manager can create users
        if user_role not in ['super_user', 'admin', 'site_manager']:
            return Response(
                {'error': 'Permission denied'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get data from request
        email = request.data.get('email', '').strip()
        name = request.data.get('name', '').strip()
        role = request.data.get('role', '').strip()
        sites = request.data.get('sites', [])
        send_welcome_email = request.data.get('sendWelcomeEmail', True)
        
        # Validation
        if not email or not name or not role:
            return Response(
                {'error': 'Email, name, and role are required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if user with this email already exists
        if User.objects.filter(email=email).exists():
            return Response(
                {'error': 'User with this email already exists'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Role hierarchy permissions for creation
        create_hierarchy = {
            'super_user': ['super_user', 'admin', 'site_manager', 'uploader', 'viewer', 'meter_manager'],
            'admin': ['admin', 'site_manager', 'uploader', 'viewer', 'meter_manager'],  # Admins can create other admins but cannot manage them
            'site_manager': ['uploader', 'viewer', 'meter_manager']  # Site managers can only create lower roles
        }
        
        # Check if current user can create the requested role based on hierarchy
        allowed_create_roles = create_hierarchy.get(user_role, [])
        if role not in allowed_create_roles:
            return Response(
                {'error': f'You cannot create users with {role} role'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Generate username from email
        username = email.split('@')[0]
        if User.objects.filter(username=username).exists():
            # Make username unique by appending numbers
            counter = 1
            original_username = username
            while User.objects.filter(username=username).exists():
                username = f"{original_username}{counter}"
                counter += 1
        
        try:
            # Create user with company code as temporary password and set as inactive
            temp_password = user_company.company_code  # Use company code as initial password
            user = User.objects.create_user(
                username=username,
                email=email,
                password=temp_password,
                first_name=name.split(' ')[0] if ' ' in name else name,
                last_name=' '.join(name.split(' ')[1:]) if ' ' in name else '',
                is_active=False  # Set as inactive until first login
            )
            
            # Create or update user profile
            profile, created = UserProfile.objects.get_or_create(user=user)
            profile.role = role
            profile.email = email
            profile.company = user_company  # Assign to same company as creator
            profile.must_reset_password = True  # Force password reset on first login
            profile.save()
            
            # TODO: Handle site assignments
            # TODO: Send welcome email if requested
            
            return Response({
                'message': f'User created successfully. Initial password is the company code: {user_company.company_code}. User must reset password on first login.',
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'name': f"{user.first_name} {user.last_name}".strip(),
                    'role': role,
                    'is_active': user.is_active,
                    'last_login': user.last_login,
                    'sites': [],  # TODO: Implement site relationships
                    'temp_password': user_company.company_code  # Include for admin reference
                }
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response(
                {'error': f'Failed to create user: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def list(self, request, *args, **kwargs):
        """List users with proper serialization"""
        users = self.get_queryset()
        
        user_data = []
        for user in users:
            try:
                role = user.userprofile.role
            except:
                role = 'viewer'
            
            user_data.append({
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'name': f"{user.first_name} {user.last_name}".strip() or user.username,
                'role': role,
                'is_active': user.is_active,
                'last_login': user.last_login.isoformat() if user.last_login else None,
                'sites': []  # TODO: Implement site relationships
            })
        
        return Response(user_data)
    
    @action(detail=False, methods=['get'], url_path='my-team')
    def my_team(self, request):
        """Get users in the current user's team/company"""
        # For now, return the same as list - we'll add proper filtering later
        return self.list(request)
    
    def update(self, request, *args, **kwargs):
        """Update a user"""
        # Check permissions
        current_user = self.request.user
        try:
            user_role = current_user.userprofile.role
        except:
            return Response(
                {'error': 'User profile not found'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Only super_user, admin, and site_manager can update users
        if user_role not in ['super_user', 'admin', 'site_manager']:
            return Response(
                {'error': 'Permission denied'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get the user to update
        user = self.get_object()
        
        # Don't allow updating your own user through this API
        if user == current_user:
            return Response(
                {'error': 'Use profile settings to update your own account'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get target user's role for hierarchy check
        try:
            target_user_role = user.userprofile.role
        except:
            target_user_role = 'viewer'
        
        # Role hierarchy permissions
        role_hierarchy = {
            'super_user': ['super_user', 'admin', 'site_manager', 'uploader', 'viewer', 'meter_manager'],
            'admin': ['site_manager', 'uploader', 'viewer', 'meter_manager'],  # Admin cannot manage other admins or super_user
            'site_manager': ['uploader', 'viewer', 'meter_manager']
        }
        
        # Check if current user can edit target user based on hierarchy
        allowed_roles = role_hierarchy.get(user_role, [])
        if target_user_role not in allowed_roles:
            return Response(
                {'error': f'You cannot edit users with {target_user_role} role'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get data from request
        email = request.data.get('email', '').strip()
        name = request.data.get('name', '').strip()
        role = request.data.get('role', '').strip()
        sites = request.data.get('sites', [])
        is_active = request.data.get('is_active', user.is_active)
        
        # Validation
        if not email or not name or not role:
            return Response(
                {'error': 'Email, name, and role are required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if user can assign the requested role based on hierarchy
        if role not in allowed_roles:
            return Response(
                {'error': f'You cannot assign {role} role'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if email is already used by another user
        if User.objects.filter(email=email).exclude(id=user.id).exists():
            return Response(
                {'error': 'Email already in use by another user'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Update user fields
            user.email = email
            user.is_active = is_active
            
            # Split name into first and last name
            name_parts = name.strip().split(' ', 1)
            user.first_name = name_parts[0]
            user.last_name = name_parts[1] if len(name_parts) > 1 else ''
            user.save()
            
            # Update user profile
            profile, created = UserProfile.objects.get_or_create(user=user)
            profile.role = role
            profile.save()
            
            # TODO: Handle site assignments
            
            return Response({
                'message': 'User updated successfully',
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'name': f"{user.first_name} {user.last_name}".strip(),
                    'role': role,
                    'is_active': user.is_active,
                    'last_login': user.last_login,
                    'sites': []  # TODO: Implement site relationships
                }
            })
            
        except Exception as e:
            return Response(
                {'error': f'Failed to update user: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def destroy(self, request, *args, **kwargs):
        """Delete a user"""
        # Check permissions
        current_user = self.request.user
        try:
            user_role = current_user.userprofile.role
        except:
            return Response(
                {'error': 'User profile not found'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Only super_user and admin can delete users
        if user_role not in ['super_user', 'admin']:
            return Response(
                {'error': 'Permission denied'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get the user to delete
        user = self.get_object()
        
        # Don't allow deleting yourself
        if user == current_user:
            return Response(
                {'error': 'Cannot delete your own account'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get target user's role for hierarchy check
        try:
            target_user_role = user.userprofile.role
        except:
            target_user_role = 'viewer'
        
        # Role hierarchy permissions for deletion
        delete_hierarchy = {
            'super_user': ['admin', 'site_manager', 'uploader', 'viewer', 'meter_manager'],  # Super users can't delete other super users
            'admin': ['site_manager', 'uploader', 'viewer', 'meter_manager']  # Admins can't delete super users or other admins
        }
        
        # Check if current user can delete target user based on hierarchy
        allowed_delete_roles = delete_hierarchy.get(user_role, [])
        if target_user_role not in allowed_delete_roles:
            return Response(
                {'error': f'You cannot delete users with {target_user_role} role'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            username = user.username
            user.delete()
            return Response({
                'message': f'User {username} deleted successfully'
            })
            
        except Exception as e:
            return Response(
                {'error': f'Failed to delete user: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'], url_path='reset-password')
    def reset_password(self, request, pk=None):
        """Reset a user's password"""
        # Check permissions
        current_user = self.request.user
        try:
            user_role = current_user.userprofile.role
        except:
            return Response(
                {'error': 'User profile not found'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Only super_user, admin, and site_manager can reset passwords
        if user_role not in ['super_user', 'admin', 'site_manager']:
            return Response(
                {'error': 'Permission denied'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get the user whose password to reset
        user = self.get_object()
        
        # Don't allow resetting your own password through this API
        if user == current_user:
            return Response(
                {'error': 'Use profile settings to change your own password'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get target user's role for hierarchy check
        try:
            target_user_role = user.userprofile.role
        except:
            target_user_role = 'viewer'
        
        # Role hierarchy permissions for password reset (same as edit)
        reset_hierarchy = {
            'super_user': ['super_user', 'admin', 'site_manager', 'uploader', 'viewer', 'meter_manager'],
            'admin': ['site_manager', 'uploader', 'viewer', 'meter_manager'],  # Admin cannot reset other admin or super_user passwords
            'site_manager': ['uploader', 'viewer', 'meter_manager']
        }
        
        # Check if current user can reset target user's password based on hierarchy
        allowed_reset_roles = reset_hierarchy.get(user_role, [])
        if target_user_role not in allowed_reset_roles:
            return Response(
                {'error': f'You cannot reset password for users with {target_user_role} role'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            # Generate a new temporary password
            import secrets
            import string
            
            # Generate a secure random password
            alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
            temp_password = ''.join(secrets.choice(alphabet) for _ in range(12))
            
            # Set the new password
            user.set_password(temp_password)
            user.save()
            
            # TODO: Send email with new password
            # For now, return it in the response (not secure for production)
            
            return Response({
                'message': f'Password reset successfully for {user.username}. Temporary password has been generated.',
                'note': 'User should change this password on first login'
            })
            
        except Exception as e:
            return Response(
                {'error': f'Failed to reset password: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )