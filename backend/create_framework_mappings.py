#!/usr/bin/env python3
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'esg_backend.settings')
django.setup()

from core.models import DataElement, Framework, DataElementFrameworkMapping

# Define which elements belong to which frameworks
# ESG framework gets ALL must-have elements
# DST and Green Key get specific elements for hospitality

ELEMENT_FRAMEWORK_MAPPINGS = {
    # Environmental Elements (Must-have)
    'electricity_consumption': {
        'frameworks': ['ESG', 'DST', 'GREEN_KEY'],
        'cadence': 'monthly'
    },
    'water_consumption': {
        'frameworks': ['ESG', 'DST', 'GREEN_KEY'],
        'cadence': 'monthly'
    },
    'waste_to_landfill': {
        'frameworks': ['ESG', 'DST', 'GREEN_KEY'],
        'cadence': 'monthly'
    },
    'carbon_footprint': {
        'frameworks': ['ESG'],
        'cadence': 'annually'
    },
    
    # Social Elements (Must-have)
    'sustainability_policy': {
        'frameworks': ['ESG', 'DST', 'GREEN_KEY'],
        'cadence': 'annually'
    },
    'sustainability_personnel': {
        'frameworks': ['ESG', 'DST', 'GREEN_KEY'],
        'cadence': 'annually'
    },
    'employee_training_hours': {
        'frameworks': ['ESG', 'DST', 'GREEN_KEY'],
        'cadence': 'annually'
    },
    'guest_education': {
        'frameworks': ['ESG', 'DST', 'GREEN_KEY'],
        'cadence': 'quarterly'
    },
    'community_initiatives': {
        'frameworks': ['ESG', 'DST'],
        'cadence': 'annually'
    },
    'health_safety': {
        'frameworks': ['ESG'],
        'cadence': 'monthly'
    },
    
    # Governance Elements (Must-have)
    'government_compliance': {
        'frameworks': ['ESG', 'DST'],
        'cadence': 'annually'
    },
    'action_plan': {
        'frameworks': ['ESG', 'DST', 'GREEN_KEY'],
        'cadence': 'annually'
    },
    'anti_corruption': {
        'frameworks': ['ESG'],
        'cadence': 'annually'
    },
    'risk_management': {
        'frameworks': ['ESG'],
        'cadence': 'annually'
    },
    
    # Environmental Elements (Conditional)
    'generator_fuel': {
        'frameworks': ['ESG', 'DST'],
        'cadence': 'monthly'
    },
    'vehicle_fuel': {
        'frameworks': ['ESG', 'DST'],
        'cadence': 'monthly'
    },
    'lpg_usage': {
        'frameworks': ['ESG', 'DST'],
        'cadence': 'monthly'
    },
    'renewable_energy': {
        'frameworks': ['ESG', 'GREEN_KEY'],
        'cadence': 'quarterly'
    },
    'food_sourcing': {
        'frameworks': ['GREEN_KEY', 'ESG'],
        'cadence': 'quarterly'
    },
    'green_spaces': {
        'frameworks': ['GREEN_KEY'],
        'cadence': 'annually'
    },
    
    # Social Elements (Conditional)
    'green_events': {
        'frameworks': ['DST', 'GREEN_KEY'],
        'cadence': 'quarterly'
    },
    
    # Governance Elements (Conditional)
    'environmental_management_system': {
        'frameworks': ['ESG', 'GREEN_KEY'],
        'cadence': 'annually'
    },
    'board_composition': {
        'frameworks': ['ESG'],
        'cadence': 'annually'
    },
}

def create_framework_mappings():
    created = 0
    updated = 0
    
    # Clear existing mappings to avoid duplicates
    print("Clearing existing mappings...")
    DataElementFrameworkMapping.objects.all().delete()
    
    for element_id, mapping_info in ELEMENT_FRAMEWORK_MAPPINGS.items():
        try:
            element = DataElement.objects.get(element_id=element_id)
            
            for framework_id in mapping_info['frameworks']:
                try:
                    framework = Framework.objects.get(framework_id=framework_id)
                    
                    mapping, was_created = DataElementFrameworkMapping.objects.update_or_create(
                        element=element,
                        framework=framework,
                        defaults={'cadence': mapping_info['cadence']}
                    )
                    
                    if was_created:
                        print(f"✅ Created: {element_id} -> {framework_id} ({mapping_info['cadence']})")
                        created += 1
                    else:
                        print(f"📝 Updated: {element_id} -> {framework_id} ({mapping_info['cadence']})")
                        updated += 1
                        
                except Framework.DoesNotExist:
                    print(f"⚠️  Framework not found: {framework_id}")
                    
        except DataElement.DoesNotExist:
            print(f"❌ Element not found: {element_id}")
    
    print(f"\n📊 Summary: Created {created} mappings, Updated {updated} mappings")
    print(f"📊 Total mappings in database: {DataElementFrameworkMapping.objects.count()}")

if __name__ == "__main__":
    print("Creating framework mappings for all elements...\n")
    create_framework_mappings()