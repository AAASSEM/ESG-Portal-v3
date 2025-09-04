"""
Email service for handling email verification, invitations, and password reset
"""
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
from django.utils.html import strip_tags
from .models import EmailVerificationToken


def get_base_url():
    """Get the base URL for the frontend application"""
    if hasattr(settings, 'FRONTEND_URL'):
        return settings.FRONTEND_URL
    else:
        # Fallback for development
        return "http://localhost:3000"


def send_email_verification(user, request=None):
    """
    Send email verification email to user
    """
    try:
        # Create or get verification token
        token_obj, created = EmailVerificationToken.objects.get_or_create(
            user=user,
            token_type='email_verification',
            used_at__isnull=True,
            defaults={}
        )
        
        # If token already exists and is still valid, use it
        if not created and not token_obj.is_valid():
            # Token expired, create a new one
            token_obj.delete()
            token_obj = EmailVerificationToken.objects.create(
                user=user,
                token_type='email_verification'
            )
        
        # Context for email template with verification code
        context = {
            'user_name': user.first_name or user.username,
            'verification_code': token_obj.verification_code,
            'site_name': 'ESG Portal',
        }
        
        # Render email templates
        subject = f"{settings.EMAIL_SUBJECT_PREFIX}Verify Your Email Address"
        html_message = render_to_string('emails/email_verification.html', context)
        plain_message = render_to_string('emails/email_verification.txt', context)
        
        # Send email
        try:
            send_mail(
                subject=subject,
                message=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                html_message=html_message,
                fail_silently=False,
            )
            print(f"✅ Email verification sent to {user.email}")
            email_sent = True
        except Exception as email_error:
            print(f"⚠️ Email sending failed: {email_error}")
            email_sent = False
        
        # Return both success status and verification code for testing
        return {
            'success': True,
            'email_sent': email_sent,
            'verification_code': token_obj.verification_code,
            'message': 'Verification code generated successfully'
        }
        
    except Exception as e:
        print(f"❌ Failed to send verification email to {user.email}: {str(e)}")
        return {
            'success': False,
            'email_sent': False,
            'verification_code': None,
            'message': f'Error: {str(e)}'
        }


def verify_email_code(email, verification_code):
    """
    Verify email verification code and activate user account
    Returns: (success: bool, message: str, user: User or None)
    """
    try:
        # Find user by email
        from django.contrib.auth.models import User
        user = User.objects.get(email=email)
        
        # Find verification token for this user
        token_obj = EmailVerificationToken.objects.get(
            user=user,
            verification_code=verification_code,
            token_type='email_verification'
        )
        
        if not token_obj.is_valid():
            return False, "This verification code has expired or has already been used.", None
        
        # Activate user
        user.is_active = True
        user.save()
        
        # Mark user profile as email verified
        if hasattr(user, 'userprofile'):
            user.userprofile.email_verified = True
            user.userprofile.save()
        
        # Mark token as used
        token_obj.mark_as_used()
        
        print(f"✅ Email verified for user {user.email}")
        return True, "Email verified successfully! You can now login to your account.", user
        
    except User.DoesNotExist:
        return False, "User not found.", None
    except EmailVerificationToken.DoesNotExist:
        return False, "Invalid verification code.", None
    except Exception as e:
        print(f"❌ Error verifying email code: {str(e)}")
        return False, "An error occurred while verifying your email.", None

def verify_email_token(token):
    """
    Verify email token and activate user account (kept for backward compatibility)
    Returns: (success: bool, message: str, user: User or None)
    """
    try:
        token_obj = EmailVerificationToken.objects.get(
            token=token,
            token_type='email_verification'
        )
        
        if not token_obj.is_valid():
            return False, "This verification link has expired or has already been used.", None
        
        # Activate user
        user = token_obj.user
        user.is_active = True
        user.save()
        
        # Mark user profile as email verified
        if hasattr(user, 'userprofile'):
            user.userprofile.email_verified = True
            user.userprofile.save()
        
        # Mark token as used
        token_obj.mark_as_used()
        
        print(f"✅ Email verified for user {user.email}")
        return True, "Email verified successfully! You can now login to your account.", user
        
    except EmailVerificationToken.DoesNotExist:
        return False, "Invalid verification link.", None
    except Exception as e:
        print(f"❌ Error verifying email token: {str(e)}")
        return False, "An error occurred while verifying your email.", None


def send_password_reset_email(user):
    """
    Send password reset email with verification code to user
    """
    try:
        # Create password reset token (with verification code)
        token_obj = EmailVerificationToken.objects.create(
            user=user,
            token_type='password_reset'
        )
        
        # Context for email template with verification code
        context = {
            'user_name': user.first_name or user.username,
            'verification_code': token_obj.verification_code,
            'site_name': 'ESG Portal',
        }
        
        # Render email templates
        subject = f"{settings.EMAIL_SUBJECT_PREFIX}Password Reset Verification Code"
        html_message = render_to_string('emails/password_reset.html', context)
        plain_message = render_to_string('emails/password_reset.txt', context)
        
        # Send email
        try:
            send_mail(
                subject=subject,
                message=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                html_message=html_message,
                fail_silently=False,
            )
            print(f"✅ Password reset email sent to {user.email}")
            email_sent = True
        except Exception as email_error:
            print(f"⚠️ Email sending failed: {email_error}")
            email_sent = False
        
        # Return both success status and verification code for testing
        return {
            'success': True,
            'email_sent': email_sent,
            'verification_code': token_obj.verification_code,
            'message': 'Password reset verification code generated successfully'
        }
        
    except Exception as e:
        print(f"❌ Failed to send password reset email to {user.email}: {str(e)}")
        return {
            'success': False,
            'email_sent': False,
            'verification_code': None,
            'message': f'Error: {str(e)}'
        }


def verify_password_reset_code(email, verification_code):
    """
    Verify password reset verification code
    Returns: (success: bool, message: str, user: User or None)
    """
    try:
        # Find user by email
        from django.contrib.auth.models import User
        user = User.objects.get(email=email)
        
        # Find verification token for this user
        token_obj = EmailVerificationToken.objects.get(
            user=user,
            verification_code=verification_code,
            token_type='password_reset'
        )
        
        if not token_obj.is_valid():
            return False, "This verification code has expired or has already been used.", None
        
        print(f"✅ Password reset code verified for user {user.email}")
        return True, "Verification code confirmed. You can now reset your password.", user
        
    except User.DoesNotExist:
        return False, "User not found.", None
    except EmailVerificationToken.DoesNotExist:
        return False, "Invalid verification code.", None
    except Exception as e:
        print(f"❌ Error verifying password reset code: {str(e)}")
        return False, "An error occurred while verifying your code.", None


def send_invitation_email(user, invited_by):
    """
    Send invitation email to new user
    """
    try:
        # Create invitation token
        token_obj = EmailVerificationToken.objects.create(
            user=user,
            token_type='invitation'
        )
        
        # Build invitation URL
        base_url = get_base_url()
        invitation_url = f"{base_url}/setup-account/{token_obj.token}"
        
        # Context for email template
        context = {
            'user_name': user.first_name or user.username,
            'invited_by': invited_by.get_full_name() or invited_by.username,
            'invitation_url': invitation_url,
            'site_name': 'ESG Portal',
            'role': user.userprofile.get_role_display() if hasattr(user, 'userprofile') else 'User',
        }
        
        # Render email templates
        subject = f"{settings.EMAIL_SUBJECT_PREFIX}You've been invited to ESG Portal"
        html_message = render_to_string('emails/invitation.html', context)
        plain_message = render_to_string('emails/invitation.txt', context)
        
        # Send email
        send_mail(
            subject=subject,
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=False,
        )
        
        print(f"✅ Invitation email sent to {user.email}")
        return True
        
    except Exception as e:
        print(f"❌ Failed to send invitation email to {user.email}: {str(e)}")
        return False