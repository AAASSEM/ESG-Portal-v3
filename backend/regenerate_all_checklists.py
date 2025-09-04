#!/usr/bin/env python3
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'esg_backend.settings')
django.setup()

from core.models import Company, CompanyChecklist
from core.services import ChecklistService
from collections import Counter

def regenerate_all_checklists():
    companies = Company.objects.all()
    
    print(f"Regenerating checklists for {companies.count()} companies...\n")
    
    for company in companies:
        old_count = CompanyChecklist.objects.filter(company=company).count()
        
        # Regenerate checklist
        checklist = ChecklistService.generate_personalized_checklist(company)
        new_count = checklist.count()
        
        # Get category breakdown
        categories = []
        for item in checklist:
            categories.append(item.element.category)
        category_counts = Counter(categories)
        
        print(f"Company: {company.name} (ID: {company.id})")
        print(f"  Old count: {old_count} → New count: {new_count}")
        print(f"  Categories: E={category_counts.get('Environmental', 0)}, S={category_counts.get('Social', 0)}, G={category_counts.get('Governance', 0)}")
        print()
    
    print("✅ All checklists regenerated successfully!")

if __name__ == "__main__":
    regenerate_all_checklists()