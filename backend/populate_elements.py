#!/usr/bin/env python3
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'esg_backend.settings')
django.setup()

from core.models import DataElement

# All elements that should be in the database
ALL_ELEMENTS = [
    # Environmental
    {'element_id': 'electricity_consumption', 'name': 'Electricity Consumption', 'description': 'Total electricity from local providers', 'unit': 'kWh', 'category': 'Environmental', 'is_metered': True, 'type': 'must_have'},
    {'element_id': 'water_consumption', 'name': 'Water Consumption', 'description': 'Total water usage', 'unit': 'm³', 'category': 'Environmental', 'is_metered': True, 'type': 'must_have'},
    {'element_id': 'waste_to_landfill', 'name': 'Waste to Landfill', 'description': 'Non-recycled waste disposal', 'unit': 'kg', 'category': 'Environmental', 'is_metered': True, 'type': 'must_have'},
    {'element_id': 'carbon_footprint', 'name': 'Carbon Footprint', 'description': 'Total GHG emissions', 'unit': 'tonnes CO2e', 'category': 'Environmental', 'is_metered': False, 'type': 'must_have'},
    {'element_id': 'generator_fuel', 'name': 'Generator Fuel Consumption', 'description': 'Fuel for backup generators', 'unit': 'liters', 'category': 'Environmental', 'is_metered': True, 'type': 'conditional'},
    {'element_id': 'vehicle_fuel', 'name': 'Vehicle Fuel Consumption', 'description': 'Company vehicle fuel', 'unit': 'liters', 'category': 'Environmental', 'is_metered': True, 'type': 'conditional'},
    {'element_id': 'lpg_usage', 'name': 'LPG Usage', 'description': 'Liquid petroleum gas consumption', 'unit': 'kg', 'category': 'Environmental', 'is_metered': True, 'type': 'conditional'},
    {'element_id': 'renewable_energy', 'name': 'Renewable Energy Usage', 'description': 'Energy from renewable sources', 'unit': '%', 'category': 'Environmental', 'is_metered': True, 'type': 'conditional'},
    {'element_id': 'food_sourcing', 'name': 'Food Sourcing', 'description': 'Local/organic food purchases', 'unit': '%', 'category': 'Environmental', 'is_metered': False, 'type': 'conditional'},
    {'element_id': 'green_spaces', 'name': 'Green Spaces', 'description': 'Sustainable landscaping', 'unit': 'm²', 'category': 'Environmental', 'is_metered': False, 'type': 'conditional'},
    
    # Social  
    {'element_id': 'sustainability_policy', 'name': 'Sustainability Policy', 'description': 'Written sustainability policy', 'unit': 'Document', 'category': 'Social', 'is_metered': False, 'type': 'must_have'},
    {'element_id': 'sustainability_personnel', 'name': 'Sustainability Personnel', 'description': 'Certified sustainability staff', 'unit': 'Count', 'category': 'Social', 'is_metered': False, 'type': 'must_have'},
    {'element_id': 'employee_training_hours', 'name': 'Employee Training Hours', 'description': 'Sustainability training per employee', 'unit': 'Hours', 'category': 'Social', 'is_metered': False, 'type': 'must_have'},
    {'element_id': 'guest_education', 'name': 'Guest Education', 'description': 'Guest sustainability initiatives', 'unit': 'Count', 'category': 'Social', 'is_metered': False, 'type': 'must_have'},
    {'element_id': 'community_initiatives', 'name': 'Community Initiatives', 'description': 'Local community programs', 'unit': 'Count, AED', 'category': 'Social', 'is_metered': False, 'type': 'must_have'},
    {'element_id': 'health_safety', 'name': 'Health & Safety Incidents', 'description': 'Workplace incidents', 'unit': 'Count', 'category': 'Social', 'is_metered': False, 'type': 'must_have'},
    {'element_id': 'green_events', 'name': 'Green Events', 'description': 'Sustainable event services', 'unit': 'Count', 'category': 'Social', 'is_metered': False, 'type': 'conditional'},
    
    # Governance
    {'element_id': 'government_compliance', 'name': 'Government Compliance', 'description': 'Energy regulation compliance', 'unit': 'Status', 'category': 'Governance', 'is_metered': False, 'type': 'must_have'},
    {'element_id': 'action_plan', 'name': 'Action Plan', 'description': 'Annual sustainability objectives', 'unit': 'Document', 'category': 'Governance', 'is_metered': False, 'type': 'must_have'},
    {'element_id': 'anti_corruption', 'name': 'Anti-corruption Policies', 'description': 'Anti-corruption measures', 'unit': 'Status', 'category': 'Governance', 'is_metered': False, 'type': 'must_have'},
    {'element_id': 'risk_management', 'name': 'Risk Management', 'description': 'ESG risk framework', 'unit': 'Status', 'category': 'Governance', 'is_metered': False, 'type': 'must_have'},
    {'element_id': 'environmental_management_system', 'name': 'Environmental Management System', 'description': 'EMS certification', 'unit': 'Status', 'category': 'Governance', 'is_metered': False, 'type': 'conditional'},
    {'element_id': 'board_composition', 'name': 'Board Composition', 'description': 'Board diversity metrics', 'unit': '%', 'category': 'Governance', 'is_metered': False, 'type': 'conditional'},
]

def populate_elements():
    created = 0
    updated = 0
    
    for elem_data in ALL_ELEMENTS:
        element, was_created = DataElement.objects.update_or_create(
            element_id=elem_data['element_id'],
            defaults={
                'name': elem_data['name'],
                'description': elem_data['description'],
                'unit': elem_data['unit'],
                'category': elem_data['category'],
                'is_metered': elem_data['is_metered'],
                'type': elem_data['type'],
            }
        )
        
        if was_created:
            print(f"✅ Created: {elem_data['element_id']} - {elem_data['name']} ({elem_data['category']})")
            created += 1
        else:
            print(f"📝 Updated: {elem_data['element_id']} - {elem_data['name']} ({elem_data['category']})")
            updated += 1
    
    print(f"\n📊 Summary: Created {created} new elements, Updated {updated} existing elements")
    print(f"📊 Total elements in database: {DataElement.objects.count()}")

if __name__ == "__main__":
    print("Populating all data elements...\n")
    populate_elements()