#!/usr/bin/env python3
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'esg_backend.settings')
django.setup()

from core.models import DataElement

# Define element categories based on their IDs
element_categories = {
    # Environmental elements
    'electricity': 'Environmental',
    'water': 'Environmental',
    'waste_landfill': 'Environmental',
    'generator_fuel': 'Environmental',
    'vehicle_fuel': 'Environmental',
    'lpg_consumption': 'Environmental',
    'food_sourcing': 'Environmental',
    'green_spaces': 'Environmental',
    'renewable_energy_usage': 'Environmental',
    'carbon_footprint': 'Environmental',
    
    # Social elements
    'sustainability_policy': 'Social',
    'sustainability_personnel': 'Social',
    'employee_training': 'Social',
    'guest_education': 'Social',
    'community_initiatives': 'Social',
    'green_events': 'Social',
    'health_safety': 'Social',
    
    # Governance elements
    'government_compliance': 'Governance',
    'action_plan': 'Governance',
    'anti_corruption': 'Governance',
    'risk_management': 'Governance',
    'environmental_management_system': 'Governance',
    'board_composition': 'Governance',
}

def update_categories():
    updated = 0
    not_found = []
    
    for element_id, category in element_categories.items():
        try:
            element = DataElement.objects.get(element_id=element_id)
            element.category = category
            element.save()
            print(f"✅ Updated {element_id} ({element.name}) to category: {category}")
            updated += 1
        except DataElement.DoesNotExist:
            not_found.append(element_id)
            print(f"❌ Element not found: {element_id}")
    
    print(f"\n📊 Summary: Updated {updated} elements")
    if not_found:
        print(f"⚠️  Not found: {', '.join(not_found)}")

if __name__ == "__main__":
    print("Updating element categories...\n")
    update_categories()