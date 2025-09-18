from django.core.management.base import BaseCommand
from core.models import Framework, CompanyFramework

class Command(BaseCommand):
    help = 'Clean up framework database - keep only intended frameworks'

    def handle(self, *args, **options):
        self.stdout.write('🧹 Starting framework cleanup...\n')
        
        # Define which voluntary frameworks to keep
        voluntary_to_keep = ['GREEN-KEY-HOSPITALITY', 'HOSPITALITY-MASTER']
        
        # List current state
        all_voluntary = Framework.objects.filter(type='voluntary')
        self.stdout.write(f'Current voluntary frameworks: {all_voluntary.count()}')
        for f in all_voluntary:
            status = "✅ KEEP" if f.framework_id in voluntary_to_keep else "❌ REMOVE"
            self.stdout.write(f'  {status} - {f.framework_id}: {f.name}')
        
        # Remove unwanted voluntary frameworks
        to_delete = Framework.objects.filter(
            type='voluntary'
        ).exclude(
            framework_id__in=voluntary_to_keep
        )
        
        # First remove any company assignments to these frameworks
        CompanyFramework.objects.filter(
            framework_id__in=to_delete.values_list('framework_id', flat=True)
        ).delete()
        
        # Now delete the frameworks
        deleted_count = to_delete.delete()[0]
        
        self.stdout.write(f'\n✅ Removed {deleted_count} unwanted voluntary frameworks')
        
        # Show final state
        remaining = Framework.objects.filter(type='voluntary')
        self.stdout.write(f'\n📋 Final voluntary frameworks: {remaining.count()}')
        for f in remaining:
            self.stdout.write(f'  - {f.framework_id}: {f.name}')