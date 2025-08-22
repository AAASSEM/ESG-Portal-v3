from django.core.management.base import BaseCommand
from core.models import (
    Activity, Framework, DataElement, DataElementFrameworkMapping, 
    ProfilingQuestion
)


class Command(BaseCommand):
    help = 'Populate initial data for ESG application'

    def handle(self, *args, **options):
        self.stdout.write('Populating initial data...')
        
        # Create predefined business activities
        self.create_activities()
        
        # Create frameworks
        self.create_frameworks()
        
        # Create data elements
        self.create_data_elements()
        
        # Create profiling questions
        self.create_profiling_questions()
        
        self.stdout.write(self.style.SUCCESS('Successfully populated initial data'))

    def create_activities(self):
        """Create predefined business activities for hospitality sector"""
        activities = [
            'Hotel Operations',
            'Food & Beverage',
            'Spa & Wellness',
            'Event Management',
            'Retail Operations',
            'Recreation Facilities',
            'Conference & Meeting Rooms',
            'Housekeeping Services',
            'Laundry Services',
            'Transportation Services'
        ]
        
        for activity_name in activities:
            Activity.objects.get_or_create(name=activity_name, defaults={'is_custom': False})
        
        self.stdout.write(f'Created {len(activities)} predefined activities')

    def create_frameworks(self):
        """Create ESG frameworks"""
        frameworks = [
            {
                'framework_id': 'ESG',
                'name': 'ESG Standards',
                'type': 'mandatory',
                'description': 'Core Environmental, Social, and Governance standards'
            },
            {
                'framework_id': 'DST',
                'name': 'Dubai Sustainable Tourism',
                'type': 'mandatory_conditional',
                'description': 'Dubai Department of Economy and Tourism sustainability requirements',
                'condition_emirate': 'dubai',
                'condition_sector': 'hospitality'
            },
            {
                'framework_id': 'UAE_ESG',
                'name': 'UAE ESG Reporting Requirements',
                'type': 'mandatory_conditional',
                'description': 'UAE Securities and Commodities Authority ESG reporting',
                'condition_emirate': '',
                'condition_sector': 'listed_company'
            },
            {
                'framework_id': 'GREEN_KEY',
                'name': 'Green Key Certification',
                'type': 'voluntary',
                'description': 'International eco-label for tourism industry'
            },
            {
                'framework_id': 'GRI',
                'name': 'Global Reporting Initiative',
                'type': 'voluntary',
                'description': 'International standards for sustainability reporting'
            },
            {
                'framework_id': 'TCFD',
                'name': 'Task Force on Climate-related Financial Disclosures',
                'type': 'voluntary',
                'description': 'Climate-related financial risk disclosures'
            }
        ]
        
        for framework_data in frameworks:
            Framework.objects.get_or_create(
                framework_id=framework_data['framework_id'],
                defaults=framework_data
            )
        
        self.stdout.write(f'Created {len(frameworks)} frameworks')

    def create_data_elements(self):
        """Create data elements and their framework mappings"""
        # Must-have data elements (common to all hospitality entities)
        must_have_elements = [
            {
                'element_id': 'electricity_consumption',
                'name': 'Electricity Consumption',
                'description': 'Total electricity from local providers',
                'unit': 'kWh',
                'is_metered': True,
                'frameworks': [
                    ('DST', 'monthly'),
                    ('ESG', 'monthly'),
                    ('GREEN_KEY', 'monthly')
                ]
            },
            {
                'element_id': 'water_consumption',
                'name': 'Water Consumption',
                'description': 'Total water usage',
                'unit': 'm³',
                'is_metered': True,
                'frameworks': [
                    ('DST', 'monthly'),
                    ('ESG', 'monthly'),
                    ('GREEN_KEY', 'monthly')
                ]
            },
            {
                'element_id': 'waste_to_landfill',
                'name': 'Waste to Landfill',
                'description': 'Non-recycled waste disposal',
                'unit': 'kg',
                'is_metered': True,
                'frameworks': [
                    ('DST', 'monthly'),
                    ('ESG', 'monthly'),
                    ('GREEN_KEY', 'monthly')
                ]
            },
            {
                'element_id': 'sustainability_policy',
                'name': 'Sustainability Policy',
                'description': 'Written sustainability policy',
                'unit': 'Document',
                'is_metered': False,
                'frameworks': [
                    ('DST', 'annually'),
                    ('GREEN_KEY', 'annually'),
                    ('ESG', 'annually')
                ]
            },
            {
                'element_id': 'employee_training_hours',
                'name': 'Employee Training Hours',
                'description': 'Sustainability training per employee',
                'unit': 'Hours',
                'is_metered': False,
                'frameworks': [
                    ('DST', 'annually'),
                    ('GREEN_KEY', 'annually'),
                    ('ESG', 'annually')
                ]
            }
        ]
        
        # Conditional data elements
        conditional_elements = [
            {
                'element_id': 'generator_fuel',
                'name': 'Generator Fuel Consumption',
                'description': 'Fuel for backup generators',
                'unit': 'liters',
                'is_metered': True,
                'frameworks': [
                    ('DST', 'monthly'),
                    ('ESG', 'monthly')
                ]
            },
            {
                'element_id': 'vehicle_fuel',
                'name': 'Vehicle Fuel Consumption',
                'description': 'Company vehicle fuel',
                'unit': 'liters',
                'is_metered': True,
                'frameworks': [
                    ('DST', 'monthly'),
                    ('ESG', 'monthly')
                ]
            },
            {
                'element_id': 'lpg_usage',
                'name': 'LPG Usage',
                'description': 'Liquid petroleum gas consumption',
                'unit': 'kg',
                'is_metered': True,
                'frameworks': [
                    ('DST', 'monthly'),
                    ('ESG', 'monthly')
                ]
            },
            {
                'element_id': 'renewable_energy',
                'name': 'Renewable Energy Usage',
                'description': 'Energy from renewable sources',
                'unit': '%',
                'is_metered': True,
                'frameworks': [
                    ('GREEN_KEY', 'quarterly'),
                    ('ESG', 'quarterly')
                ]
            }
        ]
        
        # Create must-have elements
        for element_data in must_have_elements:
            frameworks = element_data.pop('frameworks')
            element, created = DataElement.objects.get_or_create(
                element_id=element_data['element_id'],
                defaults={**element_data, 'type': 'must_have'}
            )
            
            # Create framework mappings
            for framework_id, cadence in frameworks:
                try:
                    framework = Framework.objects.get(framework_id=framework_id)
                    DataElementFrameworkMapping.objects.get_or_create(
                        element=element,
                        framework=framework,
                        defaults={'cadence': cadence}
                    )
                except Framework.DoesNotExist:
                    continue
        
        # Create conditional elements
        for element_data in conditional_elements:
            frameworks = element_data.pop('frameworks')
            element, created = DataElement.objects.get_or_create(
                element_id=element_data['element_id'],
                defaults={**element_data, 'type': 'conditional'}
            )
            
            # Create framework mappings
            for framework_id, cadence in frameworks:
                try:
                    framework = Framework.objects.get(framework_id=framework_id)
                    DataElementFrameworkMapping.objects.get_or_create(
                        element=element,
                        framework=framework,
                        defaults={'cadence': cadence}
                    )
                except Framework.DoesNotExist:
                    continue
        
        total_elements = len(must_have_elements) + len(conditional_elements)
        self.stdout.write(f'Created {total_elements} data elements with framework mappings')

    def create_profiling_questions(self):
        """Create profiling wizard questions"""
        questions = [
            {
                'question_id': 'has_backup_generators',
                'text': 'Do you have backup generators on-site?',
                'activates_element_id': 'generator_fuel',
                'order': 1
            },
            {
                'question_id': 'has_company_vehicles',
                'text': 'Do you own or operate company vehicles for operations?',
                'activates_element_id': 'vehicle_fuel',
                'order': 2
            },
            {
                'question_id': 'uses_lpg',
                'text': 'Do you use LPG (liquid petroleum gas) in your operations?',
                'activates_element_id': 'lpg_usage',
                'order': 3
            },
            {
                'question_id': 'has_renewable_energy',
                'text': 'Do you use solar panels or other renewable energy sources?',
                'activates_element_id': 'renewable_energy',
                'order': 4
            }
        ]
        
        for question_data in questions:
            ProfilingQuestion.objects.get_or_create(
                question_id=question_data['question_id'],
                defaults=question_data
            )
        
        self.stdout.write(f'Created {len(questions)} profiling questions')