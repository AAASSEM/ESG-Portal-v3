#!/usr/bin/env python3
"""
Test script for SimpleLogin integration
"""
import os
import django
import sys

# Add the backend directory to Python path
sys.path.append('/mnt/c/Users/20100/vsim2.0/backend')

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'esg_backend.settings')
django.setup()

from django.contrib.auth.models import User
from core.simplelogin_service import simplelogin
from core.email_service import send_email_verification, get_user_email_address

def test_simplelogin_service():
    """Test the SimpleLogin service functionality"""
    print("🧪 Testing SimpleLogin Integration")
    print("=" * 50)
    
    # Test 1: Check if SimpleLogin is configured
    print("1. Checking SimpleLogin configuration...")
    if simplelogin.is_configured():
        print("   ✅ SimpleLogin API key is configured")
    else:
        print("   ❌ SimpleLogin API key is NOT configured")
        return
    
    # Test 2: Try to create a test alias
    print("\n2. Testing alias creation...")
    test_email = "testuser@example.com"
    
    try:
        success, alias_data = simplelogin.create_alias(
            user_email=test_email,
            note="ESG Portal test alias"
        )
        
        if success and alias_data:
            print(f"   ✅ Successfully created alias: {alias_data['alias_email']}")
            print(f"   📋 Alias ID: {alias_data['alias_id']}")
            
            # Test 3: Try to delete the test alias
            print("\n3. Testing alias deletion...")
            if simplelogin.delete_alias(str(alias_data['alias_id'])):
                print("   ✅ Successfully deleted test alias")
            else:
                print("   ⚠️ Failed to delete test alias")
        else:
            print(f"   ❌ Failed to create alias: {alias_data}")
    
    except Exception as e:
        print(f"   ❌ Error during alias creation: {str(e)}")
    
    # Test 4: Test with a real user (if available)
    print("\n4. Testing with existing user...")
    try:
        # Try to find a test user
        test_user = User.objects.filter(email__icontains='test').first()
        if not test_user:
            # Create a temporary test user
            test_user = User.objects.create_user(
                username='simplelogin_test_user',
                email='simplelogin.test@example.com',
                first_name='Test',
                last_name='User'
            )
            print(f"   📋 Created temporary test user: {test_user.email}")
        
        # Test getting email address
        email_address = get_user_email_address(test_user)
        print(f"   📧 Email address for user: {email_address}")
        
        # Check if it's an alias or direct email
        if '@simplelogin.io' in email_address:
            print("   ✅ Successfully using SimpleLogin alias")
        else:
            print("   📝 Using direct email (fallback)")
            
        # Clean up temporary user
        if test_user.username == 'simplelogin_test_user':
            test_user.delete()
            print("   🧹 Cleaned up temporary test user")
        
    except Exception as e:
        print(f"   ❌ Error during user test: {str(e)}")
    
    print("\n" + "=" * 50)
    print("🏁 SimpleLogin integration test completed!")

if __name__ == "__main__":
    test_simplelogin_service()