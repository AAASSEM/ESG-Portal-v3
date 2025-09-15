import json
import os
from django.core.management.base import BaseCommand
from django.conf import settings
from core.models import Framework, FrameworkElement


class Command(BaseCommand):
    help = 'Load ESG framework definitions from JSON files into the database'

    def add_arguments(self, parser):
        parser.add_argument(
            '--framework',
            type=str,
            help='Specific framework file to load (e.g., "06sep-hospitality-dst-new-JSON-v2.json")',
        )
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing data before loading',
        )

    def handle(self, *args, **options):
        questions_dir = os.path.join(settings.BASE_DIR.parent, 'questions')

        if not os.path.exists(questions_dir):
            self.stdout.write(
                self.style.ERROR(f'Questions directory not found: {questions_dir}')
            )
            return

        # Framework file mappings
        framework_files = {
            'UAE-CLIMATE-LAW-2024': '06sep-hospitality-NetZero50-short-new-JSON-v2.json',
            'DUBAI-SUSTAINABLE-TOURISM': '06sep-hospitality-dst-new-JSON-v2.json',
            'GREEN-KEY-HOSPITALITY': '06sep-hospitality-green-key-new-JSON-v2.json',
            'HOSPITALITY-MASTER': '06sep-g-master-hospitality-v3.json',
        }

        if options['clear']:
            self.stdout.write('Clearing existing framework data...')
            FrameworkElement.objects.all().delete()
            Framework.objects.all().delete()
            self.stdout.write(self.style.SUCCESS('Existing data cleared.'))

        # Load specific framework or all frameworks
        files_to_load = []
        if options['framework']:
            if options['framework'] in framework_files.values():
                files_to_load = [options['framework']]
            else:
                self.stdout.write(
                    self.style.ERROR(f'Framework file not found: {options["framework"]}')
                )
                return
        else:
            files_to_load = list(framework_files.values())

        total_elements = 0
        for filename in files_to_load:
            filepath = os.path.join(questions_dir, filename)

            if not os.path.exists(filepath):
                self.stdout.write(
                    self.style.WARNING(f'File not found: {filepath}')
                )
                continue

            self.stdout.write(f'Loading framework from: {filename}')

            try:
                with open(filepath, 'r', encoding='utf-8') as file:
                    framework_data = json.load(file)

                if not framework_data:
                    self.stdout.write(
                        self.style.WARNING(f'No data found in {filename}')
                    )
                    continue

                # Extract framework info from first element
                first_element = framework_data[0]

                # Handle different file structures
                if 'master_id' in first_element:
                    # Master hospitality file
                    framework_id = 'HOSPITALITY-MASTER'
                    sector = 'hospitality'
                else:
                    # Standard framework files
                    framework_id = first_element['framework_id']
                    sector = first_element.get('sector', 'generic')

                # Create or get framework
                framework, created = Framework.objects.get_or_create(
                    framework_id=framework_id,
                    defaults={
                        'name': self._get_framework_name(framework_id),
                        'type': self._get_framework_type(framework_id),
                        'description': f'ESG framework for {sector} sector',
                    }
                )

                if created:
                    self.stdout.write(f'  Created framework: {framework.name}')
                else:
                    self.stdout.write(f'  Using existing framework: {framework.name}')

                # Load elements
                elements_loaded = 0
                for element_data in framework_data:
                    try:
                        self._create_data_element(element_data)
                        elements_loaded += 1
                    except Exception as e:
                        self.stdout.write(
                            self.style.ERROR(f'  Error loading element {element_data.get("official_code", "unknown")}: {str(e)}')
                        )

                total_elements += elements_loaded
                self.stdout.write(
                    self.style.SUCCESS(f'  Loaded {elements_loaded} elements from {filename}')
                )

            except json.JSONDecodeError as e:
                self.stdout.write(
                    self.style.ERROR(f'Invalid JSON in {filename}: {str(e)}')
                )
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'Error loading {filename}: {str(e)}')
                )

        self.stdout.write(
            self.style.SUCCESS(f'Framework loading completed. Total elements loaded: {total_elements}')
        )

    def _get_framework_name(self, framework_id):
        """Convert framework ID to human-readable name"""
        name_mapping = {
            'UAE-CLIMATE-LAW-2024': 'UAE Climate Change Law 2024',
            'DUBAI-SUSTAINABLE-TOURISM': 'Dubai Sustainable Tourism',
            'GREEN-KEY-HOSPITALITY': 'Green Key Hospitality Certification',
            'HOSPITALITY-MASTER': 'Hospitality Master Framework',
        }
        return name_mapping.get(framework_id, framework_id)

    def _get_framework_type(self, framework_id):
        """Determine framework type based on ID"""
        if framework_id == 'UAE-CLIMATE-LAW-2024':
            return 'mandatory'
        elif framework_id == 'DUBAI-SUSTAINABLE-TOURISM':
            return 'mandatory_conditional'  # Conditional on Dubai location
        elif framework_id == 'HOSPITALITY-MASTER':
            return 'master'  # Consolidated framework
        else:
            return 'voluntary'

    def _create_data_element(self, element_data):
        """Create a FrameworkElement from framework JSON data"""
        # Handle different file formats
        if 'master_id' in element_data:
            # Master hospitality format
            element_id = element_data['master_id']
            framework_id = 'HOSPITALITY-MASTER'
            official_code = element_data['master_id']
            description = element_data.get('description', '')
        else:
            # Standard format
            element_id = element_data['official_code']
            framework_id = element_data['framework_id']
            official_code = element_data['official_code']
            description = element_data.get('description', '')

        # Extract carbon specifications if present
        carbon_specs = element_data.get('carbon')

        # Create the element
        element = FrameworkElement.objects.create(
            element_id=element_id,
            framework_id=framework_id,
            sector=element_data.get('sector', 'hospitality' if 'master_id' in element_data else 'generic'),
            official_code=official_code,
            name_plain=element_data['name_plain'],
            description=description,
            unit=element_data.get('unit', ''),
            cadence=element_data['cadence'],
            type=element_data.get('type', 'must-have'),
            category=element_data.get('category', 'E'),
            condition_logic=element_data.get('condition_logic'),
            wizard_question=element_data.get('wizard_question'),
            prompt=element_data.get('prompt', ''),
            metered=element_data.get('metered', False),
            meter_type=element_data.get('meter_type'),
            meter_scope=element_data.get('meter_scope'),
            calculation=element_data.get('calculation'),
            aggregation=element_data.get('aggregation'),
            privacy_level=element_data.get('privacy_level', 'public'),
            evidence_requirements=element_data.get('evidence', []),
            providers_by_emirate=element_data.get('providers_by_emirate', {}),
            data_source_systems=element_data.get('data_source_systems', []),
            quality_checks=element_data.get('quality_checks', []),
            tags=element_data.get('tags', []),
            notes=element_data.get('notes', ''),
            sources=element_data.get('sources', []),
            carbon_specifications=carbon_specs,
        )

        return element