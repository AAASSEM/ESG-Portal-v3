#!/usr/bin/env python
"""
Test script for Magic Link Invitation System
Run this in your Django environment to test magic link functionality
"""
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.contrib.auth.models import User
from core.models import EmailVerificationToken, UserProfile, Company
from django.db import transaction

def test_magic_link_system():
    print("🧪 === MAGIC LINK TESTING SYSTEM ===")
    
    # 1. Create a test company and admin user
    print("\n1️⃣ Creating test company and admin user...")
    
    with transaction.atomic():
        # Clean up any existing test data
        User.objects.filter(username__startswith='test_').delete()
        
        # Create admin user
        admin_user = User.objects.create_user(
            username='test_admin',
            email='admin@test.com',
            password='admin123',
            first_name='Test',
            last_name='Admin',
            is_active=True,
            is_staff=True,
            is_superuser=True
        )
        
        # Create company
        company = Company.objects.create(
            user=admin_user,
            name='Test Company',
            company_code='TEST001',
            emirate='dubai',
            sector='hospitality'
        )
        
        # Create admin profile
        admin_profile = UserProfile.objects.create(
            user=admin_user,
            role='super_user',
            email='admin@test.com',
            company=company,
            must_reset_password=False
        )
        
        admin_user.company = company
        admin_user.save()
        
        print(f"✅ Created admin user: {admin_user.username} ({admin_user.email})")
        print(f"✅ Created company: {company.name} ({company.company_code})")
    
    # 2. Create a new user (simulating admin adding a user)
    print("\n2️⃣ Creating new invited user...")
    
    with transaction.atomic():
        new_user = User.objects.create_user(
            username='test_invitee',
            email='newuser@test.com',
            password=company.company_code,  # Temporary password
            first_name='New',
            last_name='User',
            is_active=False  # Will be activated by magic link
        )
        
        # Set company on user
        new_user.company = company
        new_user.save()
        
        # Create profile
        new_profile = UserProfile.objects.create(
            user=new_user,
            role='admin',
            email='newuser@test.com',
            company=company,
            must_reset_password=True  # Needs password setup
        )
        
        print(f"✅ Created new user: {new_user.username} ({new_user.email})")
        print(f"✅ User is_active: {new_user.is_active}")
        print(f"✅ User must_reset_password: {new_profile.must_reset_password}")
    
    # 3. Create invitation token (simulating the signal)
    print("\n3️⃣ Creating invitation token...")
    
    invitation_token = EmailVerificationToken.objects.create(
        user=new_user,
        token_type='invitation'
    )
    
    print(f"✅ Created invitation token: {invitation_token.token}")
    print(f"✅ Token created at: {invitation_token.created_at}")
    print(f"✅ Token is_used: {invitation_token.is_used}")
    
    # 4. Generate magic link URLs
    print("\n4️⃣ Magic Link URLs for testing:")
    
    backend_magic_link = f"http://localhost:8000/api/auth/magic-link/{invitation_token.token}/"
    frontend_setup_link = f"http://localhost:3000/setup-account"
    
    print(f"🔗 Backend Magic Link: {backend_magic_link}")
    print(f"🔗 Frontend Setup Page: {frontend_setup_link}")
    
    # 5. Show testing instructions
    print("\n5️⃣ TESTING INSTRUCTIONS:")
    print("=" * 60)
    print("1. Start your Django server: python manage.py runserver")
    print("2. Start your React server: npm start (in frontend/)")
    print("3. Click the backend magic link above in your browser")
    print("4. You should be automatically logged in and redirected to setup-account")
    print("5. Set a new password and complete the flow")
    print()
    print("💡 DEBUGGING TIPS:")
    print("- Check Django console for magic link authentication logs")
    print("- Check browser network tab for redirects")
    print("- Check React console for authentication context updates")
    print("- Use browser dev tools to inspect session cookies")
    
    # 6. Show token details for manual testing
    print("\n6️⃣ TOKEN DETAILS (for manual API testing):")
    print("=" * 60)
    print(f"Token: {invitation_token.token}")
    print(f"User ID: {new_user.id}")
    print(f"User Email: {new_user.email}")
    print(f"Company: {company.name} ({company.company_code})")
    print(f"Role: {new_profile.role}")
    
    # 7. Test API endpoints manually
    print("\n7️⃣ MANUAL API TESTING:")
    print("=" * 60)
    print("You can test these with curl or Postman:")
    print()
    print(f"# Test magic link authentication:")
    print(f"curl -X GET '{backend_magic_link}' -i")
    print()
    print("# After magic link login, test password setup:")
    print("curl -X POST 'http://localhost:8000/api/auth/reset-password/' \\")
    print("  -H 'Content-Type: application/json' \\")
    print("  -b 'cookies.txt' \\  # Save cookies from magic link response")
    print("  -d '{")
    print('    "current_password": "temporary_setup_password",')
    print('    "new_password": "mynewpassword123"')
    print("  }'")
    
    print("\n✅ Test setup complete! Use the magic link above to test the flow.")
    return {
        'admin_user': admin_user,
        'new_user': new_user,
        'company': company,
        'invitation_token': invitation_token,
        'magic_link': backend_magic_link
    }

if __name__ == "__main__":
    test_data = test_magic_link_system()