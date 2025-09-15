# Generated manually for populating site field in data submissions

from django.db import migrations


def populate_site_from_meter(apps, schema_editor):
    """
    Populate the site field in CompanyDataSubmission based on the meter's site
    """
    CompanyDataSubmission = apps.get_model('core', 'CompanyDataSubmission')

    # Update submissions that have meters - set site from meter's site
    submissions_with_meters = CompanyDataSubmission.objects.filter(meter__isnull=False)

    updated_count = 0
    for submission in submissions_with_meters:
        if submission.meter and submission.meter.site:
            submission.site = submission.meter.site
            submission.save()
            updated_count += 1

    print(f"Updated {updated_count} data submissions with site from meter")

    # For non-metered submissions, we can't determine site from existing data
    # They will remain with site=None for now
    non_metered_count = CompanyDataSubmission.objects.filter(meter__isnull=True).count()
    print(f"Found {non_metered_count} non-metered submissions that will need manual site assignment")


def reverse_populate_site(apps, schema_editor):
    """
    Reverse operation - clear the site field
    """
    CompanyDataSubmission = apps.get_model('core', 'CompanyDataSubmission')
    CompanyDataSubmission.objects.update(site=None)


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0023_add_site_to_data_submission'),
    ]

    operations = [
        migrations.RunPython(populate_site_from_meter, reverse_populate_site),
    ]