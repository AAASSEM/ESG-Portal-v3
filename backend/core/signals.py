"""
Django signals for handling user creation and email events
"""
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth.models import User
from django.db import transaction
from .email_service import send_email_verification, send_password_reset_email, send_invitation_email
from .models import EmailVerificationToken
import logging

logger = logging.getLogger(__name__)

@receiver(post_save, sender=User)
def send_verification_after_signup(sender, instance, created, **kwargs):
    """
    Send appropriate email after user is created and transaction commits
    - Self-signup: Email verification
    - Admin-added: Invitation (if they have staff/superuser permissions)
    """
    if created and not instance.is_active and instance.email:
        print(f"📧 Signal triggered for new user: {instance.email}")
        
        # Send email after transaction commits to ensure all data is available
        def send_user_email():
            print(f"🚀 Transaction committed - determining email type for {instance.email}")
            try:
                # Check if this is a self-signup (has password) or admin-created (no password)
                if instance.has_usable_password():
                    # Self-signup - send verification email
                    print(f"✉️ Self-signup detected - sending verification email to {instance.email}")
                    from .models import EmailVerificationToken
                    token_obj = EmailVerificationToken.objects.create(
                        user=instance,
                        token_type='email_verification'  # Correct type for signup
                    )
                    print(f"📧 Email verification token created - verification email will be sent")
                    result = {'type': 'email_verification', 'success': True, 'token': token_obj.token}
                else:
                    # Admin-created - send invitation email  
                    print(f"👨‍💼 Admin-created user detected - sending invitation email to {instance.email}")
                    from .models import EmailVerificationToken
                    token_obj = EmailVerificationToken.objects.create(
                        user=instance,
                        token_type='invitation'
                    )
                    print(f"📨 Invitation token created - invitation email will be sent")
                    result = {'type': 'invitation', 'success': True, 'token': token_obj.token}
                
                return result
            except Exception as e:
                print(f"❌ Email signal error: {str(e)}")
                logger.error(f"Failed to send email via signal: {str(e)}")
                return None
        
        # Schedule email to be sent after transaction commits
        transaction.on_commit(send_user_email)
        print(f"⏳ Email scheduled for after transaction commit")


@receiver(post_save, sender=EmailVerificationToken)
def send_email_after_token_creation(sender, instance, created, **kwargs):
    """
    Send appropriate email when EmailVerificationToken is created
    Handles password reset and invitation emails automatically
    """
    if created and instance.user.email:
        print(f"🔐 Token signal triggered for {instance.token_type}: {instance.user.email}")
        
        def send_token_email():
            print(f"🚀 Transaction committed - sending {instance.token_type} email to {instance.user.email}")
            try:
                if instance.token_type == 'password_reset':
                    # Send password reset email directly using token data
                    from django.template.loader import render_to_string
                    from django.core.mail import send_mail
                    from django.conf import settings
                    
                    context = {
                        'user_name': instance.user.first_name or instance.user.username,
                        'verification_code': instance.verification_code,
                        'site_name': 'ESG Portal',
                    }
                    
                    subject = f"{settings.EMAIL_SUBJECT_PREFIX}Password Reset Verification Code"
                    html_message = render_to_string('emails/password_reset.html', context)
                    plain_message = render_to_string('emails/password_reset.txt', context)
                    
                    send_result = send_mail(
                        subject=subject,
                        message=plain_message,
                        from_email=settings.DEFAULT_FROM_EMAIL,
                        recipient_list=[instance.user.email],
                        html_message=html_message,
                        fail_silently=False,
                    )
                    
                    result = {
                        'success': True,
                        'email_sent': send_result == 1,
                        'verification_code': instance.verification_code,
                        'message': 'Password reset email sent successfully' if send_result == 1 else 'Email sending failed'
                    }
                    print(f"🔐 Password reset email result: {result}")
                    
                elif instance.token_type == 'email_verification':
                    # Send email verification for self-signup
                    from django.template.loader import render_to_string
                    from django.core.mail import send_mail
                    from django.conf import settings
                    
                    context = {
                        'user_name': instance.user.first_name or instance.user.username,
                        'verification_code': instance.verification_code,
                        'site_name': 'ESG Portal',
                    }
                    
                    subject = f"{settings.EMAIL_SUBJECT_PREFIX}Verify Your Email Address"
                    html_message = render_to_string('emails/email_verification.html', context)
                    plain_message = render_to_string('emails/email_verification.txt', context)
                    
                    send_result = send_mail(
                        subject=subject,
                        message=plain_message,
                        from_email=settings.DEFAULT_FROM_EMAIL,
                        recipient_list=[instance.user.email],
                        html_message=html_message,
                        fail_silently=False,
                    )
                    
                    result = {
                        'success': True,
                        'email_sent': send_result == 1,
                        'verification_code': instance.verification_code,
                        'message': 'Email verification sent successfully' if send_result == 1 else 'Email sending failed'
                    }
                    print(f"✉️ Email verification result: {result}")
                    
                elif instance.token_type == 'invitation':
                    # Send invitation email directly using token data
                    from django.template.loader import render_to_string
                    from django.core.mail import send_mail
                    from django.conf import settings
                    
                    # Build magic link invitation URL
                    from django.conf import settings
                    # Get backend URL for magic link (not frontend URL)
                    backend_url = getattr(settings, 'BACKEND_URL', 'http://localhost:8080')
                    # OLD LOGIC COMMENTED: Used frontend URL incorrectly
                    # NEW MAGIC LINK: Use backend URL for magic link endpoint
                    magic_link_url = f"{backend_url}/api/auth/magic-link/{instance.token}/"
                    invitation_url = magic_link_url
                    
                    context = {
                        'user_name': instance.user.first_name or instance.user.username,
                        'invitation_url': invitation_url,
                        'site_name': 'ESG Portal',
                        'role': 'User',  # Could be enhanced to get actual role
                    }
                    
                    subject = f"{settings.EMAIL_SUBJECT_PREFIX}You've been invited to ESG Portal"
                    html_message = render_to_string('emails/invitation.html', context)
                    plain_message = render_to_string('emails/invitation.txt', context)
                    
                    send_result = send_mail(
                        subject=subject,
                        message=plain_message,
                        from_email=settings.DEFAULT_FROM_EMAIL,
                        recipient_list=[instance.user.email],
                        html_message=html_message,
                        fail_silently=False,
                    )
                    
                    result = {
                        'success': True,
                        'email_sent': send_result == 1,
                        'message': 'Invitation email sent successfully' if send_result == 1 else 'Email sending failed'
                    }
                    print(f"📨 Invitation email result: {result}")
                    
                else:
                    # Unknown token type
                    print(f"⚠️ Unknown token type: {instance.token_type}, skipping")
                    return None
                
                return result
            except Exception as e:
                print(f"❌ Token email signal error: {str(e)}")
                logger.error(f"Failed to send {instance.token_type} email via signal: {str(e)}")
                return None
        
        # Send emails for all token types: email_verification, password_reset, invitation
        if instance.token_type in ['email_verification', 'password_reset', 'invitation']:
            transaction.on_commit(send_token_email)
            print(f"⏳ {instance.token_type} email scheduled for after transaction commit")