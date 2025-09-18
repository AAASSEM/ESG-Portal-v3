from django.core.management.base import BaseCommand
from core.models import Company, Framework, CompanyFramework


class Command(BaseCommand):
    help = 'Assign mandatory frameworks to all companies'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be done without making changes',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']

        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN MODE - No changes will be made'))

        # Get all companies
        companies = Company.objects.all()
        self.stdout.write(f'Found {companies.count()} companies')

        # Get mandatory frameworks
        mandatory_frameworks = Framework.objects.filter(type__in=['mandatory', 'mandatory_conditional'])
        self.stdout.write(f'Found {mandatory_frameworks.count()} mandatory frameworks:')
        for fw in mandatory_frameworks:
            self.stdout.write(f'  - {fw.framework_id}: {fw.name} ({fw.type})')

        self.stdout.write('')
        self.stdout.write('=== CREATING ASSIGNMENTS ===')

        assignments_created = 0
        for company in companies:
            for framework in mandatory_frameworks:
                # Check if assignment already exists
                existing = CompanyFramework.objects.filter(
                    company=company,
                    framework=framework
                ).first()

                if not existing:
                    if not dry_run:
                        # Create the assignment
                        CompanyFramework.objects.create(
                            company=company,
                            framework=framework,
                            is_auto_assigned=True
                        )
                    self.stdout.write(
                        self.style.SUCCESS(f'✅ {"Would assign" if dry_run else "Assigned"} {framework.framework_id} to {company.name}')
                    )
                    assignments_created += 1
                else:
                    self.stdout.write(f'⏭️  {framework.framework_id} already assigned to {company.name}')

        self.stdout.write('')
        self.stdout.write('=== SUMMARY ===')
        self.stdout.write(f'{"Would create" if dry_run else "Created"} {assignments_created} new framework assignments')

        if not dry_run:
            total_assignments = CompanyFramework.objects.count()
            self.stdout.write(f'Total CompanyFramework records: {total_assignments}')

        if dry_run:
            self.stdout.write(self.style.WARNING('Run without --dry-run to apply changes'))