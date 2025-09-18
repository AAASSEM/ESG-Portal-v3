from django.core.management.base import BaseCommand
from core.models import CompanyFramework, Framework

class Command(BaseCommand):
    help = 'Fix auto-assigned flags for voluntary frameworks'

    def handle(self, *args, **options):
        self.stdout.write('🔍 Checking framework assignments...')

        # Get all voluntary frameworks
        voluntary_frameworks = Framework.objects.filter(type='voluntary')
        voluntary_ids = [f.framework_id for f in voluntary_frameworks]

        self.stdout.write(f'Found {len(voluntary_ids)} voluntary frameworks: {voluntary_ids}')

        # Check current state
        wrong_assignments = CompanyFramework.objects.filter(
            framework_id__in=voluntary_ids,
            is_auto_assigned=True
        )

        self.stdout.write(f'Found {wrong_assignments.count()} voluntary frameworks incorrectly marked as auto-assigned')

        if wrong_assignments.exists():
            # Fix any voluntary frameworks marked as auto-assigned
            fixed_count = wrong_assignments.update(is_auto_assigned=False)
            self.stdout.write(self.style.SUCCESS(f'✅ Fixed {fixed_count} voluntary framework assignments'))
        else:
            self.stdout.write(self.style.SUCCESS('✅ All voluntary frameworks have correct auto-assigned flags'))

        # Summary
        total_assignments = CompanyFramework.objects.count()
        auto_assigned_count = CompanyFramework.objects.filter(is_auto_assigned=True).count()
        voluntary_assigned_count = CompanyFramework.objects.filter(
            framework_id__in=voluntary_ids,
            is_auto_assigned=False
        ).count()

        self.stdout.write('')
        self.stdout.write('📊 Final assignment summary:')
        self.stdout.write(f'  - Total assignments: {total_assignments}')
        self.stdout.write(f'  - Auto-assigned (mandatory): {auto_assigned_count}')
        self.stdout.write(f'  - User-selected (voluntary): {voluntary_assigned_count}')