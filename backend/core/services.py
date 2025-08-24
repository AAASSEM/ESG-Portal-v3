"""
Business logic services for ESG application
"""
from django.db import transaction
from django.db.models import Count, Q
from datetime import datetime
from collections import defaultdict
from .models import (
    Company, Framework, CompanyFramework, DataElement, 
    DataElementFrameworkMapping, ProfilingQuestion, 
    CompanyProfileAnswer, Meter, CompanyChecklist,
    ChecklistFrameworkMapping, CompanyDataSubmission
)


class FrameworkService:
    """Service for handling framework assignment logic"""
    
    @staticmethod
    def assign_mandatory_frameworks(company, user=None):
        """
        Assign mandatory frameworks based on company profile
        Core ESG is mandatory for all, conditional frameworks based on emirate/sector
        """
        # First, clear existing auto-assigned frameworks to ensure clean assignment
        CompanyFramework.objects.filter(
            user=user,
            company=company, 
            is_auto_assigned=True
        ).delete()
        
        frameworks_to_assign = []
        
        # Core ESG framework is mandatory for all
        esg_framework, _ = Framework.objects.get_or_create(
            framework_id='ESG',
            defaults={
                'name': 'ESG Standards',
                'type': 'mandatory',
                'description': 'Core Environmental, Social, and Governance standards'
            }
        )
        frameworks_to_assign.append(esg_framework)
        
        # Dubai Sustainable Tourism (DST) - mandatory ONLY if Dubai + Hospitality
        if company.emirate == 'dubai' and company.sector == 'hospitality':
            dst_framework, _ = Framework.objects.get_or_create(
                framework_id='DST',
                defaults={
                    'name': 'Dubai Sustainable Tourism',
                    'type': 'mandatory_conditional',
                    'description': 'Dubai Department of Economy and Tourism sustainability requirements',
                    'condition_emirate': 'dubai',
                    'condition_sector': 'hospitality'
                }
            )
            frameworks_to_assign.append(dst_framework)
        
        # Dubai Energy Regulations - mandatory for all Dubai establishments
        if company.emirate == 'dubai':
            energy_framework, _ = Framework.objects.get_or_create(
                framework_id='DUBAI_ENERGY_REGULATIONS',
                defaults={
                    'name': 'Dubai Supreme Council of Energy Regulations',
                    'type': 'mandatory_conditional',
                    'description': 'Mandatory compliance - Dubai Supreme Council of Energy',
                    'condition_emirate': 'dubai',
                    'condition_sector': ''
                }
            )
            frameworks_to_assign.append(energy_framework)
        
        # UAE ESG Reporting Requirements - mandatory for listed companies
        # For now, we'll make it conditional based on a future profiling question
        
        # Assign frameworks to company
        for framework in frameworks_to_assign:
            CompanyFramework.objects.get_or_create(
                user=user,
                company=company,
                framework=framework,
                defaults={'is_auto_assigned': True}
            )
        
        return frameworks_to_assign
    
    @staticmethod
    def get_voluntary_frameworks():
        """Get all available voluntary frameworks"""
        return Framework.objects.filter(type='voluntary')
    
    @staticmethod
    def assign_voluntary_framework(company, framework_id):
        """Assign a voluntary framework to a company"""
        try:
            framework = Framework.objects.get(framework_id=framework_id, type='voluntary')
            CompanyFramework.objects.get_or_create(
                company=company,
                framework=framework,
                defaults={'is_auto_assigned': False}
            )
            return True
        except Framework.DoesNotExist:
            return False


class ProfilingService:
    """Service for handling profiling wizard logic"""
    
    @staticmethod
    def get_profiling_questions(company):
        """Get all profiling questions relevant to company's frameworks"""
        company_frameworks = company.companyframework_set.all().values_list('framework_id', flat=True)
        
        # Get all conditional data elements required by company's frameworks
        conditional_elements = DataElement.objects.filter(
            type='conditional',
            dataelementframeworkmapping__framework_id__in=company_frameworks
        ).distinct()
        
        # Get profiling questions for these elements
        questions = ProfilingQuestion.objects.filter(
            activates_element__in=conditional_elements
        ).order_by('order')
        
        return questions
    
    @staticmethod
    def save_profiling_answers(company, answers_data):
        """Save profiling wizard answers"""
        with transaction.atomic():
            for answer_data in answers_data:
                question_id = answer_data.get('question_id')
                answer = answer_data.get('answer')
                
                try:
                    question = ProfilingQuestion.objects.get(question_id=question_id)
                    CompanyProfileAnswer.objects.update_or_create(
                        company=company,
                        question=question,
                        defaults={'answer': answer}
                    )
                except ProfilingQuestion.DoesNotExist:
                    continue


class ChecklistService:
    """Service for generating personalized checklists"""
    
    @staticmethod
    def generate_personalized_checklist(company):
        """
        Generate the final personalized checklist based on:
        1. Company's assigned frameworks
        2. Profiling wizard answers
        3. De-duplication and frequency consolidation
        """
        with transaction.atomic():
            # Clear existing checklist
            CompanyChecklist.objects.filter(company=company).delete()
            
            company_frameworks = company.companyframework_set.all().values_list('framework_id', flat=True)
            
            # Get all must-have elements for company's frameworks
            must_have_elements = DataElement.objects.filter(
                type='must_have',
                dataelementframeworkmapping__framework_id__in=company_frameworks
            ).distinct()
            
            # Get conditional elements activated by "Yes" answers
            yes_answers = CompanyProfileAnswer.objects.filter(
                company=company,
                answer=True
            ).values_list('question__activates_element_id', flat=True)
            
            conditional_elements = DataElement.objects.filter(
                element_id__in=yes_answers,
                dataelementframeworkmapping__framework_id__in=company_frameworks
            ).distinct()
            
            # Combine all elements
            all_elements = must_have_elements.union(conditional_elements)
            
            # Create checklist items with consolidated cadence and framework mapping
            for element in all_elements:
                # Get all framework mappings for this element
                mappings = DataElementFrameworkMapping.objects.filter(
                    element=element,
                    framework_id__in=company_frameworks
                )
                
                # Determine most frequent cadence (monthly > quarterly > annually)
                cadence_priority = {'monthly': 1, 'quarterly': 2, 'annually': 3}
                final_cadence = min(mappings, key=lambda x: cadence_priority.get(x.cadence, 4)).cadence
                
                # Create checklist item
                checklist_item = CompanyChecklist.objects.create(
                    company=company,
                    element=element,
                    is_required=True,
                    cadence=final_cadence
                )
                
                # Map to frameworks
                for mapping in mappings:
                    ChecklistFrameworkMapping.objects.create(
                        checklist_item=checklist_item,
                        framework=mapping.framework
                    )
            
            return CompanyChecklist.objects.filter(company=company)


class MeterService:
    """Service for handling meter management"""
    
    @staticmethod
    def auto_create_meters(company):
        """Automatically create default meters for metered data elements"""
        checklist_items = CompanyChecklist.objects.filter(
            company=company,
            element__is_metered=True
        )
        
        created_meters = []
        for item in checklist_items:
            # Create a default "Main" meter for each metered element type
            meter_type = item.element.name  # Use element name as meter type
            
            # Check if a meter of this type already exists
            existing_meter = Meter.objects.filter(
                company=company,
                type=meter_type
            ).first()
            
            if not existing_meter:
                meter = Meter.objects.create(
                    company=company,
                    type=meter_type,
                    name="Main",
                    status='active'
                )
                created_meters.append(meter)
        
        return created_meters
    
    @staticmethod
    def can_delete_meter(meter):
        """Check if meter can be deleted (no associated data)"""
        return not meter.has_data()


class DataCollectionService:
    """Service for handling data collection and tracking"""
    
    @staticmethod
    def get_available_months(year):
        """Get available months for data collection based on year"""
        current_year = datetime.now().year
        current_month = datetime.now().month
        
        if year == current_year:
            # For current year, only show months up to current month
            return list(range(1, current_month + 1))
        elif year < current_year:
            # For past years, show all 12 months
            return list(range(1, 13))
        else:
            # For future years, show no months
            return []
    
    @staticmethod
    def get_data_collection_tasks(company, year, month):
        """Get all data collection tasks for a specific month"""
        month_name = datetime(year, month, 1).strftime('%b')
        
        # Get all checklist items
        checklist_items = CompanyChecklist.objects.filter(company=company)
        
        tasks = []
        for item in checklist_items:
            if item.element.is_metered:
                # For metered elements, create task for each active meter
                # Match meters based on data element type (e.g., electricity, water, etc.)
                meter_type_mapping = {
                    'electricity': 'Electricity Consumption',
                    'water': 'Water Consumption', 
                    'waste': 'Waste to Landfill',
                    'gas': 'Generator Fuel Consumption',
                    'generator': 'Generator Fuel Consumption',
                    'fuel': 'Generator Fuel Consumption',
                    'lpg': 'LPG Usage',
                    'vehicle': 'Vehicle Fuel Consumption',
                    'renewable': 'Renewable Energy Usage'
                }
                
                # Try to find the meter type based on element name
                element_lower = item.element.name.lower()
                meter_type = None
                
                # Use more specific matching - check for exact patterns first
                if 'electricity' in element_lower:
                    meter_type = 'Electricity Consumption'
                elif 'water' in element_lower:
                    meter_type = 'Water Consumption'
                elif 'waste' in element_lower:
                    meter_type = 'Waste to Landfill'
                elif 'vehicle' in element_lower:
                    meter_type = 'Vehicle Fuel Consumption'
                elif 'generator' in element_lower:
                    meter_type = 'Generator Fuel Consumption'
                elif 'lpg' in element_lower:
                    meter_type = 'LPG Usage'
                elif 'renewable' in element_lower:
                    meter_type = 'Renewable Energy Usage'
                
                # If no specific match found, get all active meters
                if meter_type:
                    meters = Meter.objects.filter(
                        company=company,
                        type=meter_type,
                        status='active'
                    )
                else:
                    # Fallback: get all active meters
                    meters = Meter.objects.filter(
                        company=company,
                        status='active'
                    )
                for meter in meters:
                    # Get or create submission record
                    submission, created = CompanyDataSubmission.objects.get_or_create(
                        company=company,
                        element=item.element,
                        meter=meter,
                        reporting_year=year,
                        reporting_period=month_name
                    )
                    tasks.append({
                        'type': 'metered',
                        'element': item.element,
                        'meter': meter,
                        'submission': submission,
                        'cadence': item.cadence
                    })
            else:
                # For non-metered elements, create single task
                submission, created = CompanyDataSubmission.objects.get_or_create(
                    company=company,
                    element=item.element,
                    meter=None,
                    reporting_year=year,
                    reporting_period=month_name
                )
                tasks.append({
                    'type': 'non_metered',
                    'element': item.element,
                    'meter': None,
                    'submission': submission,
                    'cadence': item.cadence
                })
        
        return tasks
    
    @staticmethod
    def calculate_progress(company, year, month=None):
        """Calculate data collection progress - counts data and evidence as separate tasks"""
        filters = {'company': company, 'reporting_year': year}
        
        if month:
            month_name = datetime(year, month, 1).strftime('%b')
            filters['reporting_period'] = month_name
        
        submissions = CompanyDataSubmission.objects.filter(**filters)
        
        total_submissions = submissions.count()
        if total_submissions == 0:
            return {
                'data_progress': 0, 
                'evidence_progress': 0, 
                'total_points': 0, 
                'completed_points': 0,
                'items_remaining': 0
            }
        
        # Count completed data entries and evidence files separately
        data_complete = submissions.exclude(value='').count()
        evidence_complete = submissions.exclude(evidence_file='').count()
        
        # Total tasks = submissions × 2 (data + evidence for each submission)
        total_tasks = total_submissions * 2
        
        # Completed tasks = data entries + evidence uploads
        completed_tasks = data_complete + evidence_complete
        
        # Remaining tasks = total tasks - completed tasks
        items_remaining = total_tasks - completed_tasks
        
        # Calculate percentages based on separate task counting
        overall_progress = (completed_tasks / total_tasks) * 100 if total_tasks > 0 else 0
        data_progress = (data_complete / total_submissions) * 100
        evidence_progress = (evidence_complete / total_submissions) * 100
        
        return {
            'data_progress': data_progress,
            'evidence_progress': evidence_progress,
            'overall_progress': overall_progress,  # New field for combined progress
            'total_points': total_tasks,  # Now counts both data and evidence tasks
            'completed_points': completed_tasks,  # Data entries + evidence files
            'items_remaining': items_remaining,  # Tasks still needed
            'total_submissions': total_submissions,  # Original submission count for reference
            'data_complete': data_complete,  # Data entries completed
            'evidence_complete': evidence_complete  # Evidence files uploaded
        }


class DashboardService:
    """Service for dashboard statistics and data visualization"""
    
    @staticmethod
    def get_dashboard_stats(company):
        """Get comprehensive dashboard statistics"""
        # Basic counts
        total_frameworks = company.companyframework_set.count()
        total_data_elements = CompanyChecklist.objects.filter(company=company).count()
        total_meters = Meter.objects.filter(company=company).count()
        active_meters = Meter.objects.filter(company=company, status='active').count()
        
        # Data completeness (for current year)
        current_year = datetime.now().year
        year_progress = DataCollectionService.calculate_progress(company, current_year)
        
        # Monthly data for charts
        monthly_data = []
        for month in range(1, 13):
            month_progress = DataCollectionService.calculate_progress(company, current_year, month)
            monthly_data.append({
                'month': datetime(current_year, month, 1).strftime('%b'),
                'data_progress': month_progress['data_progress'],
                'evidence_progress': month_progress['evidence_progress']
            })
        
        return {
            'total_frameworks': total_frameworks,
            'total_data_elements': total_data_elements,
            'total_meters': total_meters,
            'active_meters': active_meters,
            'data_completeness_percentage': year_progress['data_progress'],
            'evidence_completeness_percentage': year_progress['evidence_progress'],
            'monthly_data': monthly_data
        }