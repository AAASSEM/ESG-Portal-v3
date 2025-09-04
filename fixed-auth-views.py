# Add these updated views to your auth_views.py file
# Replace the existing SendResetCodeView and VerifyResetCodeView classes

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
            from django.contrib.auth.models import User
            user = User.objects.get(email=email)
            print(f"✅ User found: {user.username}")
            
            # For testing mode, return hardcoded verification code
            # In production, you would call send_password_reset_email(user)
            verification_code = '654321'  # Hardcoded for testing
            
            # You can uncomment this for production:
            # from .email_service import send_password_reset_email
            # result = send_password_reset_email(user)
            # verification_code = result.get('verification_code')
            
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
                from django.contrib.auth.models import User
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
            
            # In production, uncomment this:
            # from .email_service import verify_password_reset_code
            # success, message, user = verify_password_reset_code(email, verification_code)
            # 
            # if success:
            #     return Response({
            #         'message': message,
            #         'verified': True,
            #         'user': {
            #             'id': user.id,
            #             'username': user.username,
            #             'email': user.email
            #         }
            #     }, status=status.HTTP_200_OK)
            # else:
            #     return Response({
            #         'error': message,
            #         'verified': False
            #     }, status=status.HTTP_400_BAD_REQUEST)
            
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