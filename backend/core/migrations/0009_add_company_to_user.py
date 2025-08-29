# Generated migration to add company field directly to User model

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0008_userprofile_must_reset_password_and_more'),
    ]

    operations = [
        # Add company field to User table
        migrations.RunSQL(
            "ALTER TABLE auth_user ADD COLUMN company_id INTEGER REFERENCES core_company(id);",
            reverse_sql="ALTER TABLE auth_user DROP COLUMN company_id;"
        ),
        
        # Migrate existing UserProfile company relationships to User table
        migrations.RunSQL("""
            UPDATE auth_user 
            SET company_id = (
                SELECT company_id 
                FROM core_userprofile 
                WHERE core_userprofile.user_id = auth_user.id
            )
            WHERE EXISTS (
                SELECT 1 
                FROM core_userprofile 
                WHERE core_userprofile.user_id = auth_user.id 
                AND core_userprofile.company_id IS NOT NULL
            );
        """, reverse_sql=""),
        
        # For users without UserProfile, assign them to companies they own
        migrations.RunSQL("""
            UPDATE auth_user 
            SET company_id = (
                SELECT id 
                FROM core_company 
                WHERE core_company.user_id = auth_user.id
                LIMIT 1
            )
            WHERE company_id IS NULL 
            AND EXISTS (
                SELECT 1 
                FROM core_company 
                WHERE core_company.user_id = auth_user.id
            );
        """, reverse_sql=""),
    ]