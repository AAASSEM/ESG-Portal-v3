#!/usr/bin/env python
"""
Test script to verify location data isolation
Run with: python manage.py shell < test_location_isolation.py
"""

from core.models import Site, CompanyProfileAnswer, CompanyChecklist, Meter, Company

# Get the test company
try:
    company = Company.objects.get(name="aydain.blackwood")
    print(f"\n✅ Found company: {company.name} (ID: {company.id})")
except Company.DoesNotExist:
    print("❌ Company 'assemalhattmi' not found")
    exit()

# Get all sites for this company
sites = Site.objects.filter(company=company)
print(f"\n📍 Found {sites.count()} sites for company {company.name}:")

for site in sites:
    print(f"\n  🏢 Site: {site.name} (ID: {site.id})")
    print(f"     Active: {site.is_active}")
    
    # Count profile answers for this site
    answers = CompanyProfileAnswer.objects.filter(company=company, site=site)
    print(f"     📝 Profile answers: {answers.count()}")
    
    # Count checklist items for this site
    checklist = CompanyChecklist.objects.filter(company=company, site=site)
    print(f"     ✅ Checklist items: {checklist.count()}")
    if checklist.exists():
        # Show first 3 checklist items
        for item in checklist[:3]:
            print(f"        - {item.element.name if item.element else 'Unknown'}")
    
    # Count meters for this site
    meters = Meter.objects.filter(company=company, site=site)
    print(f"     ⚡ Meters: {meters.count()}")
    if meters.exists():
        # Show first 3 meters
        for meter in meters[:3]:
            print(f"        - {meter.name} ({meter.meter_type})")

# Check for orphaned data (data without site)
print("\n⚠️  Checking for orphaned data (no site assigned):")
orphaned_answers = CompanyProfileAnswer.objects.filter(company=company, site__isnull=True)
print(f"   Profile answers without site: {orphaned_answers.count()}")

orphaned_checklist = CompanyChecklist.objects.filter(company=company, site__isnull=True)
print(f"   Checklist items without site: {orphaned_checklist.count()}")

orphaned_meters = Meter.objects.filter(company=company, site__isnull=True)
print(f"   Meters without site: {orphaned_meters.count()}")

# Show currently active site
active_site = Site.objects.filter(company=company, is_active=True).first()
if active_site:
    print(f"\n🎯 Currently active site: {active_site.name} (ID: {active_site.id})")
else:
    print("\n⚠️  No active site set")

print("\n✅ Location isolation test complete")