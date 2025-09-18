from django.core.management.base import BaseCommand
from django.core.management import call_command
from core.models import Framework, FrameworkElement, Company, CompanyFramework


class Command(BaseCommand):
    help = 'Load initial framework data and assign mandatory frameworks if database is empty'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force reload even if data exists',
        )

    def handle(self, *args, **options):
        force = options['force']

        self.stdout.write('🔍 Checking database state...')

        # Check frameworks
        framework_count = Framework.objects.count()
        element_count = FrameworkElement.objects.count()
        company_framework_count = CompanyFramework.objects.count()

        self.stdout.write(f'Current data:')
        self.stdout.write(f'  - Frameworks: {framework_count}')
        self.stdout.write(f'  - Framework Elements: {element_count}')
        self.stdout.write(f'  - Company Framework Assignments: {company_framework_count}')

        # Load frameworks if needed
        if framework_count == 0 or force:
            self.stdout.write('📦 Loading frameworks...')
            try:
                call_command('loaddata', 'fixtures/frameworks.json')
                new_framework_count = Framework.objects.count()
                self.stdout.write(f'✅ Successfully loaded {new_framework_count} frameworks')
            except Exception as e:
                self.stdout.write(f'❌ Error loading frameworks: {str(e)}')

        # Load framework elements if needed
        if element_count == 0 or force:
            self.stdout.write('📦 Loading framework elements...')
            try:
                call_command('loaddata', 'fixtures/framework_elements.json')
                new_element_count = FrameworkElement.objects.count()
                self.stdout.write(f'✅ Successfully loaded {new_element_count} framework elements')
            except Exception as e:
                self.stdout.write(f'❌ Error loading framework elements: {str(e)}')

        # Assign mandatory frameworks to companies if needed
        if company_framework_count == 0 or force:
            self.stdout.write('🔗 Assigning mandatory frameworks to companies...')
            try:
                call_command('assign_mandatory_frameworks')
                new_assignment_count = CompanyFramework.objects.count()
                self.stdout.write(f'✅ Successfully created {new_assignment_count} framework assignments')
            except Exception as e:
                self.stdout.write(f'❌ Error assigning frameworks: {str(e)}')

        # Final summary
        final_framework_count = Framework.objects.count()
        final_element_count = FrameworkElement.objects.count()
        final_assignment_count = CompanyFramework.objects.count()

        self.stdout.write('')
        self.stdout.write('🎯 Final database state:')
        self.stdout.write(f'  - Frameworks: {final_framework_count}')
        self.stdout.write(f'  - Framework Elements: {final_element_count}')
        self.stdout.write(f'  - Company Framework Assignments: {final_assignment_count}')

        if final_framework_count > 0 and final_element_count > 0 and final_assignment_count > 0:
            self.stdout.write(self.style.SUCCESS('✅ Database is ready! Framework questions should now be available.'))
        else:
            self.stdout.write(self.style.ERROR('❌ Database setup incomplete. Check logs above for errors.'))