#!/usr/bin/env python3
"""
Fix user company associations for production deployment
This ensures all users have proper company and profile setup
"""
import os
import sys
import django

# Setup Django environment
if __name__ == '__main__':
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'esg_backend.settings')
    django.setup()
    
    from django.contrib.auth.models import User
    from core.models import UserProfile, Company
    
    print("🔧 Fixing user company associations...")
    
    try:
        # Get all users without profiles
        users_without_profiles = User.objects.filter(userprofile__isnull=True)
        
        for user in users_without_profiles:
            print(f"Creating profile for user: {user.username}")
            
            # Create UserProfile
            profile = UserProfile.objects.create(
                user=user,
                role='super_user' if user.is_superuser else 'viewer'
            )
            
            # If user is superuser and has no company, create a default one
            if user.is_superuser:
                companies = Company.objects.filter(user=user)
                if not companies.exists():
                    company = Company.objects.create(
                        user=user,
                        name=f"{user.username}'s Company",
                        emirate='dubai',
                        sector='hospitality'
                    )
                    profile.company = company
                    profile.save()
                    print(f"Created company: {company.name}")
                else:
                    profile.company = companies.first()
                    profile.save()
                    print(f"Assigned existing company: {companies.first().name}")
        
        # Fix users with profiles but no companies
        profiles_without_companies = UserProfile.objects.filter(company__isnull=True, user__is_superuser=True)
        
        for profile in profiles_without_companies:
            user = profile.user
            companies = Company.objects.filter(user=user)
            
            if companies.exists():
                profile.company = companies.first()
                profile.save()
                print(f"Fixed company association for: {user.username}")
            else:
                # Create company for superuser
                company = Company.objects.create(
                    user=user,
                    name=f"{user.username}'s Company",
                    emirate='dubai',
                    sector='hospitality'
                )
                profile.company = company
                profile.save()
                print(f"Created new company for: {user.username}")
        
        print("✅ User company associations fixed successfully!")
        
        # Print summary
        total_users = User.objects.count()
        users_with_profiles = UserProfile.objects.count()
        superusers_with_companies = UserProfile.objects.filter(
            user__is_superuser=True,
            company__isnull=False
        ).count()
        
        print(f"\n📊 Summary:")
        print(f"Total users: {total_users}")
        print(f"Users with profiles: {users_with_profiles}")
        print(f"Superusers with companies: {superusers_with_companies}")
        
    except Exception as e:
        print(f"❌ Error fixing user associations: {e}")
        sys.exit(1)