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
        
        # Assign frameworks to company (company-wide, not user-specific)
        for framework in frameworks_to_assign:
            CompanyFramework.objects.get_or_create(
                user=None,  # Company-wide framework assignment
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
        print(f"🔍 FrameworkService.assign_voluntary_framework called with company={company.name}, framework_id={framework_id}")

        try:
            print(f"🔍 Looking for framework with framework_id={framework_id} and type='voluntary'")
            framework = Framework.objects.get(framework_id=framework_id, type='voluntary')
            print(f"✅ Found framework: {framework.name}")

            print(f"🔍 Creating/getting CompanyFramework...")
            company_framework, created = CompanyFramework.objects.get_or_create(
                company=company,
                framework=framework,
                defaults={'is_auto_assigned': False}
            )

            if created:
                print(f"✅ Created new CompanyFramework assignment")
            else:
                print(f"ℹ️ CompanyFramework assignment already exists")

            return True
        except Framework.DoesNotExist:
            print(f"❌ Framework.DoesNotExist: No framework found with framework_id={framework_id} and type='voluntary'")

            # Let's see what frameworks actually exist
            all_frameworks = Framework.objects.all()
            print(f"🔍 Available frameworks:")
            for fw in all_frameworks:
                print(f"  - ID: {fw.framework_id}, Type: {fw.type}")

            return False
        except Exception as e:
            print(f"❌ Unexpected error in assign_voluntary_framework: {str(e)}")
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
    def save_profiling_answers(company, answers_data, user):
        """Save profiling wizard answers"""
        with transaction.atomic():
            for answer_data in answers_data:
                question_id = answer_data.get('question_id')
                answer = answer_data.get('answer')
                
                try:
                    question = ProfilingQuestion.objects.get(question_id=question_id)
                    CompanyProfileAnswer.objects.update_or_create(
                        user=None,  # Company-wide answer, not user-specific
                        company=company,
                        question=question,
                        defaults={'answer': answer}
                    )
                except ProfilingQuestion.DoesNotExist:
                    continue


class ChecklistService:
    """Service for generating personalized checklists using FrameworkElement"""

    @staticmethod
    def generate_personalized_checklist(company, site=None):
        """
        Generate checklist using new FrameworkElement system based on:
        1. Company's assigned frameworks
        2. Profile answers (for conditional elements)
        3. Must-have elements (always included)
        """
        with transaction.atomic():
            # Clear existing checklist for this company (and site if specified)
            filters = {'company': company}
            if site:
                filters['site'] = site
            CompanyChecklist.objects.filter(**filters).delete()

            # Use FrameworkProcessor to get applicable elements
            processor = FrameworkProcessor(company)
            applicable_elements = processor.get_applicable_elements()

            print(f"🔍 Found {len(applicable_elements)} applicable framework elements")

            # Create checklist items
            created_items = []
            for element in applicable_elements:
                # Determine cadence based on element specifications
                cadence = element.cadence if element.cadence else 'annually'

                # Create checklist item
                checklist_item = CompanyChecklist.objects.create(
                    company=company,
                    site=site,
                    element=element,
                    cadence=cadence,
                    framework_id=element.framework_id,
                    is_required=True
                )
                created_items.append(checklist_item)

            print(f"✅ Created {len(created_items)} checklist items")
            return created_items


class MeterService:
    """Service for handling meter management"""
    
    @staticmethod
    def auto_create_meters(company, site=None):
        """Automatically create meters for FrameworkElements with carbon_specifications"""
        # Get checklist items with carbon_specifications (metered elements)
        filters = {'company': company, 'element__carbon_specifications__isnull': False}
        if site:
            filters['site'] = site

        checklist_items = CompanyChecklist.objects.filter(**filters).exclude(
            element__carbon_specifications={}
        )

        created_meters = []
        for item in checklist_items:
            element = item.element

            # Skip emissions calculations - they should be dashboard metrics, not meters
            if any(keyword in element.name_plain.lower() for keyword in ['emissions', 'ghg', 'co2', 'carbon footprint']):
                print(f"⏭️ Skipping emissions calculation: {element.name_plain} (dashboard metric)")
                continue

            # Use element name_plain as meter type
            meter_type = element.name_plain

            # Check if a meter of this type already exists for this company/site
            existing_filters = {'company': company, 'type': meter_type}
            if site:
                existing_filters['site'] = site

            existing_meter = Meter.objects.filter(**existing_filters).first()

            if not existing_meter:
                # Create meter with data from carbon_specifications
                carbon_specs = element.carbon_specifications or {}

                meter = Meter.objects.create(
                    company=company,
                    site=site,
                    type=meter_type,
                    name="Main",
                    status='active',
                    is_auto_created=True
                )
                created_meters.append(meter)
                print(f"✅ Created meter: {meter_type} for framework {element.framework_id}")

        print(f"🔢 Created {len(created_meters)} meters from framework elements")
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
    def get_data_collection_tasks(company, year, month, user=None, site=None):
        """Get all data collection tasks for a specific month - shared data visibility"""
        month_name = datetime(year, month, 1).strftime('%b')
        
        if site:
            # For specific site, get site-specific checklist items
            checklist_items = CompanyChecklist.objects.filter(company=company, site=site)
            # print(f"🏢 Specific site {site.name}: Found {checklist_items.count()} checklist items")
            return DataCollectionService._process_site_tasks(company, year, month_name, user, site, checklist_items)
        else:
            # For "All Locations", group tasks by site
            sites = company.sites.all()
            # print(f"🌐 All Locations: Found {sites.count()} sites")
            grouped_tasks = []
            
            for current_site in sites:
                site_checklist = CompanyChecklist.objects.filter(company=company, site=current_site)
                # print(f"🏢 Site {current_site.name}: Found {site_checklist.count()} checklist items")
                site_tasks = DataCollectionService._process_site_tasks(company, year, month_name, user, current_site, site_checklist)
                # print(f"🏢 Site {current_site.name}: Generated {len(site_tasks)} tasks")
                
                if site_tasks:  # Only include sites with tasks
                    grouped_tasks.append({
                        'site': {
                            'id': current_site.id,
                            'name': current_site.name
                        },
                        'tasks': site_tasks
                    })
            
            # print(f"🌐 Total grouped tasks: {len(grouped_tasks)} site groups")
            return grouped_tasks
    
    @staticmethod
    def _process_site_tasks(company, year, month_name, user, site, checklist_items):
        
        """Process tasks for a specific site"""
        tasks = []
        for item in checklist_items:
            element = item.element

            # Skip emissions calculations - they should be dashboard metrics, not data collection tasks
            if any(keyword in element.name_plain.lower() for keyword in ['emissions', 'ghg', 'co2', 'carbon footprint']):
                print(f"⏭️ Skipping emissions task: {element.name_plain} (dashboard calculation)")
                continue

            if item.element.metered:
                # For metered elements, create task for each active meter in this site
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
                
                # Try to find appropriate meters based on element specifications
                element = item.element
                meters = []

                # First, try to use carbon_specifications if available
                if element.carbon_specifications and 'ef_data_dependencies' in element.carbon_specifications:
                    dependencies = element.carbon_specifications['ef_data_dependencies']
                    meter_types_to_find = []

                    for dep in dependencies:
                        dep_lower = dep.lower()
                        if 'grid' in dep_lower or 'electricity' in dep_lower:
                            meter_types_to_find.append('Electricity Consumption')
                        elif 'district cooling' in dep_lower or 'cooling' in dep_lower:
                            meter_types_to_find.append('District Cooling Consumption')
                        elif 'water' in dep_lower:
                            meter_types_to_find.append('Water Consumption')

                    for meter_type in meter_types_to_find:
                        type_meters = Meter.objects.filter(
                            company=company,
                            type=meter_type,
                            status='active',
                            site=site
                        )
                        meters.extend(type_meters)

                # Fallback to element name pattern matching if no carbon_specifications
                if not meters:
                    element_lower = element.name_plain.lower()
                    meter_type = None

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

                    if meter_type:
                        # Try exact match first
                        exact_meters = Meter.objects.filter(
                            company=company,
                            type=meter_type,
                            status='active',
                            site=site
                        )

                        if exact_meters.exists():
                            meters.extend(exact_meters)
                        else:
                            # If no exact match, try flexible matching
                            short_type = meter_type.replace(' Consumption', '').replace(' Usage', '').replace('Waste to Landfill', 'Waste')
                            flexible_meters = Meter.objects.filter(
                                company=company,
                                type__icontains=short_type,
                                status='active',
                                site=site
                            )
                            meters.extend(flexible_meters)

                # If still no meters found and element is metered, skip this element (don't create tasks for ALL meters)
                if not meters and element.metered:
                    print(f"⚠️ No appropriate meters found for metered element: {element.name_plain}")
                    continue
                for meter in meters:
                    # Find existing submission from ANY user, or create new one for current user
                    submission = CompanyDataSubmission.objects.filter(
                        company=company,
                        site=site,
                        framework_element=item.element,
                        meter=meter,
                        reporting_year=year,
                        reporting_period=month_name
                    ).first()

                    if not submission:
                        # Create new submission record with current user
                        submission = CompanyDataSubmission.objects.create(
                            user=user,
                            company=company,
                            site=site,
                            framework_element=item.element,
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
                # For non-metered elements, find existing submission from ANY user or create new
                submission = CompanyDataSubmission.objects.filter(
                    company=company,
                    site=site,
                    framework_element=item.element,
                    meter=None,
                    reporting_year=year,
                    reporting_period=month_name
                ).first()

                if not submission:
                    # Create new submission record with current user
                    submission = CompanyDataSubmission.objects.create(
                        user=user,
                        company=company,
                        site=site,
                        framework_element=item.element,
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

        # Deduplicate tasks by grouping identical data requirements
        # Use a simplified key that focuses on the actual data requirement, not how frameworks classify it
        unique_tasks = {}
        for task in tasks:
            element = task['element']
            meter = task['meter']

            # Create a unique key based on the core data requirement (ignore metered/non-metered conflicts)
            base_key = (
                element.name_plain,  # Same data requirement name
                element.unit or '',  # Same unit
                element.cadence,     # Same reporting frequency
            )

            # For metered elements, include meter type AND meter ID to allow separate tasks for each meter
            if task['type'] == 'metered' and meter:
                task_key = base_key + (meter.type, meter.id)
            else:
                task_key = base_key + ('non_metered',)

            # Prioritize metered tasks over non-metered when there's a conflict
            if task_key not in unique_tasks:
                unique_tasks[task_key] = task
            elif task['type'] == 'metered' and unique_tasks[task_key]['type'] == 'non_metered':
                # Replace non-metered with metered version for the same data requirement
                unique_tasks[task_key] = task

        deduplicated_tasks = list(unique_tasks.values())
        print(f"🔄 Deduplicated tasks: {len(tasks)} → {len(deduplicated_tasks)}")

        return deduplicated_tasks
    
    @staticmethod
    def calculate_progress(company, year, month=None, user=None, site=None):
        """Calculate data collection progress - counts data and evidence as separate tasks"""
        filters = {'company': company, 'reporting_year': year}

        if month:
            month_name = datetime(year, month, 1).strftime('%b')
            filters['reporting_period'] = month_name
        else:
            # For yearly progress, ensure all tasks are created for all 12 months
            # Create submissions for the FULL year (Jan-Dec)
            for month_num in range(1, 13):
                tasks = DataCollectionService.get_data_collection_tasks(company, year, month_num, user=user, site=site)

        # Remove user filtering to allow shared data visibility
        # All users can see data entered by any user for the same company

        submissions = CompanyDataSubmission.objects.filter(**filters)

        # Filter by site if provided
        if site:
            submissions = submissions.filter(site=site)
        
        # Filter out submissions from inactive meters
        # Include submissions without meters (non-metered tasks) and submissions from active meters only
        active_submissions = submissions.filter(
            Q(meter__isnull=True) | Q(meter__status='active')
        )
        
        # Separate active period submissions from inactive period submissions
        active_period_submissions = active_submissions.exclude(value='INACTIVE_PERIOD')
        inactive_period_submissions = active_submissions.filter(value='INACTIVE_PERIOD')
        
        total_active_submissions = active_period_submissions.count()
        total_inactive_submissions = inactive_period_submissions.count()
        
        if total_active_submissions == 0 and total_inactive_submissions == 0:
            return {
                'data_progress': 0, 
                'evidence_progress': 0, 
                'total_points': 0, 
                'completed_points': 0,
                'items_remaining': 0,
                'inactive_period_points': 0
            }
        
        # Count completed data entries and evidence files separately (only from active period)
        data_complete = active_period_submissions.exclude(value='').count()
        evidence_complete = active_period_submissions.exclude(evidence_file='').count()
        
        # Total tasks = active submissions × 2 (data + evidence for each submission)
        total_active_tasks = total_active_submissions * 2
        
        # Inactive period tasks (shown as incomplete/orange)
        total_inactive_tasks = total_inactive_submissions * 2
        
        # Completed tasks = data entries + evidence uploads (only from active period)
        completed_tasks = data_complete + evidence_complete
        
        # Remaining tasks = total active tasks - completed tasks
        items_remaining = total_active_tasks - completed_tasks
        
        # Calculate percentages based on active period only
        overall_progress = (completed_tasks / total_active_tasks) * 100 if total_active_tasks > 0 else 0
        data_progress = (data_complete / total_active_submissions) * 100 if total_active_submissions > 0 else 0
        evidence_progress = (evidence_complete / total_active_submissions) * 100 if total_active_submissions > 0 else 0
        
        return {
            'data_progress': data_progress,
            'evidence_progress': evidence_progress,
            'overall_progress': overall_progress,
            'total_points': total_active_tasks,  # Only active period tasks
            'completed_points': completed_tasks,
            'items_remaining': items_remaining,
            'total_submissions': total_active_submissions,  # Active period submissions
            'data_complete': data_complete,
            'evidence_complete': evidence_complete,
            'inactive_period_points': total_inactive_tasks,  # New field for inactive period
            'inactive_period_submissions': total_inactive_submissions
        }


class DashboardService:
    """Service for dashboard statistics and data visualization"""
    
    @staticmethod
    def get_dashboard_stats(company, user=None, site=None):
        """Get comprehensive dashboard statistics"""
        # Basic counts
        total_frameworks = company.companyframework_set.count()
        
        # Filter data by site if provided
        if site:
            print(f"🏢 Dashboard filtered for site: {site.name}")
            total_data_elements = CompanyChecklist.objects.filter(company=company, site=site).count()
            total_meters = Meter.objects.filter(company=company, site=site).count()
            active_meters = Meter.objects.filter(company=company, site=site, status='active').count()
        else:
            print(f"🌐 Dashboard showing aggregated stats for all locations")
            total_data_elements = CompanyChecklist.objects.filter(company=company).count()
            total_meters = Meter.objects.filter(company=company).count()
            active_meters = Meter.objects.filter(company=company, status='active').count()
        
        # Data completeness (for current year)
        current_year = datetime.now().year
        year_progress = DataCollectionService.calculate_progress(company, current_year, user=user, site=site)
        
        # Monthly data for charts
        monthly_data = []
        for month in range(1, 13):
            month_progress = DataCollectionService.calculate_progress(company, current_year, month, user=user, site=site)
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


class FrameworkProcessor:
    """Processes framework elements and evaluates conditional logic"""

    def __init__(self, company):
        from .models import FrameworkElement, CompanyProfileAnswer
        self.company = company
        self.profile_answers = self._get_profile_answers()

    def _get_profile_answers(self):
        """Get all profile answers for the company (NEW SYSTEM)"""
        from .models import CompanyProfileAnswer
        answers = CompanyProfileAnswer.objects.filter(company=self.company)
        return {
            answer.question.question_id: str(answer.answer).lower() if answer.answer is not None else None
            for answer in answers
        }

    def get_applicable_elements(self, framework_id=None, sector=None):
        """Get all applicable framework elements for this company"""
        from .models import FrameworkElement

        queryset = FrameworkElement.objects.all()

        if framework_id:
            queryset = queryset.filter(framework_id=framework_id)

        if sector:
            queryset = queryset.filter(sector__in=[sector, 'generic'])

        applicable_elements = []

        for element in queryset:
            if self._is_element_applicable(element):
                applicable_elements.append(element)

        return applicable_elements

    def _is_element_applicable(self, element):
        """Evaluate if an element is applicable based on conditional logic"""
        # Must-have elements are always applicable
        if element.type == 'must-have':
            return True

        # If no condition logic, conditional elements default to applicable
        if not element.condition_logic:
            return True

        try:
            return self._evaluate_condition(element.condition_logic)
        except Exception as e:
            # Log error and default to applicable for safety
            print(f"Error evaluating condition for {element.element_id}: {e}")
            return True

    def _evaluate_condition(self, condition_logic):
        """Evaluate conditional logic string"""
        if not condition_logic:
            return True

        # Handle common condition patterns
        condition_lower = condition_logic.lower()

        # Location-based conditions
        if 'dubai' in condition_lower:
            company_emirate = getattr(self.company, 'emirate', '').lower()
            return 'dubai' in company_emirate

        # Sector-based conditions
        if 'hospitality' in condition_lower:
            company_sector = getattr(self.company, 'sector', '').lower()
            return 'hospitality' in company_sector or 'hotel' in company_sector

        # Activity-based conditions
        if 'food service' in condition_lower or 'restaurant' in condition_lower:
            activities = self.company.companyactivity_set.values_list('activity__name', flat=True)
            activity_names = ' '.join(activities).lower()
            return any(term in activity_names for term in ['food', 'restaurant', 'catering', 'dining'])

        # Room count conditions
        if 'rooms' in condition_lower:
            import re
            room_keywords = ['rooms', 'room count', 'number of rooms']
            for keyword in room_keywords:
                if keyword in self.profile_answers:
                    try:
                        room_count = int(self.profile_answers[keyword])
                        # Extract room count threshold from condition
                        match = re.search(r'(\d+)\s*rooms?', condition_lower)
                        if match:
                            threshold = int(match.group(1))
                            return room_count >= threshold
                    except (ValueError, TypeError):
                        continue

        # Swimming pool conditions
        if 'pool' in condition_lower or 'swimming' in condition_lower:
            pool_keywords = ['swimming pool', 'pool', 'pools', 'has pool']
            for keyword in pool_keywords:
                if keyword in self.profile_answers:
                    answer = self.profile_answers[keyword]
                    return answer in ['yes', 'true', '1', 'have', 'has']

        # Spa conditions
        if 'spa' in condition_lower:
            spa_keywords = ['spa', 'wellness', 'spa services', 'has spa']
            for keyword in spa_keywords:
                if keyword in self.profile_answers:
                    answer = self.profile_answers[keyword]
                    return answer in ['yes', 'true', '1', 'have', 'has']

        # Fleet conditions
        if 'fleet' in condition_lower or 'vehicles' in condition_lower:
            fleet_keywords = ['fleet', 'vehicles', 'company vehicles', 'transport']
            for keyword in fleet_keywords:
                if keyword in self.profile_answers:
                    answer = self.profile_answers[keyword]
                    if answer in ['yes', 'true', '1', 'have', 'has']:
                        return True
                    try:
                        vehicle_count = int(answer)
                        return vehicle_count > 0
                    except (ValueError, TypeError):
                        continue

        # Default to applicable if condition cannot be evaluated
        return True

    def get_wizard_questions(self, framework_id=None):
        """Get wizard questions to determine element applicability"""
        from .models import FrameworkElement

        # Determine applicable frameworks based on company profile
        applicable_frameworks = self._get_applicable_frameworks()

        # Filter elements by applicable frameworks
        elements = FrameworkElement.objects.filter(
            type='conditional',
            wizard_question__isnull=False,
            framework_id__in=applicable_frameworks
        )

        if framework_id:
            elements = elements.filter(framework_id=framework_id)

        questions = []
        seen_questions = set()

        for element in elements:
            if element.wizard_question and element.wizard_question not in seen_questions:
                questions.append({
                    'id': f"wizard_{element.element_id}",
                    'question': element.wizard_question,
                    'element_id': element.element_id,
                    'framework_id': element.framework_id,
                    'condition_logic': element.condition_logic
                })
                seen_questions.add(element.wizard_question)

        return questions

    def _get_applicable_frameworks(self):
        """Determine which frameworks apply to this company based on profile and user selections"""
        from .models import CompanyFramework, Framework
        applicable = []

        # UAE Climate Law - mandatory for all UAE companies
        applicable.append('UAE-CLIMATE-LAW-2024')

        # Dubai Sustainable Tourism - mandatory for Dubai hospitality companies
        if (self.company.emirate == 'dubai' and
            self.company.sector == 'hospitality'):
            applicable.append('DUBAI-SUSTAINABLE-TOURISM')

        # Get user-selected voluntary frameworks from database
        try:
            company_frameworks = CompanyFramework.objects.filter(
                company=self.company,
                is_auto_assigned=False  # Only manually selected frameworks
            ).select_related('framework')

            for cf in company_frameworks:
                # Since frontend now uses correct framework IDs, no mapping needed
                framework_id = cf.framework.framework_id
                print(f"🔍 Adding selected framework: {framework_id}")
                applicable.append(framework_id)

        except Exception as e:
            # If error fetching selections, include no voluntary frameworks
            print(f"Error fetching company frameworks: {e}")

        return applicable

    def calculate_carbon_emissions(self, element, value, period='monthly'):
        """Calculate carbon emissions using framework specifications"""
        if not element.carbon_specifications:
            return {'error': 'No carbon specifications available'}

        try:
            carbon_specs = element.carbon_specifications
            emission_factor = carbon_specs.get('emission_factor', 0)
            unit = carbon_specs.get('unit', 'kg CO2e')
            scope = carbon_specs.get('scope', 'unknown')

            # Basic calculation: value * emission_factor
            carbon_emissions = value * emission_factor

            # Adjust for reporting period
            if period == 'monthly' and 'annual' in carbon_specs.get('calculation_notes', ''):
                carbon_emissions *= 12
            elif period == 'quarterly':
                carbon_emissions *= 4

            return {
                'carbon_emissions': carbon_emissions,
                'unit': unit,
                'scope': scope,
                'emission_factor': emission_factor,
                'calculation_method': carbon_specs.get('calculation_method', 'direct_multiplication')
            }

        except Exception as e:
            return {'error': f'Carbon calculation failed: {str(e)}'}

    def get_evidence_requirements(self, element):
        """Get evidence requirements for an element"""
        if not element.evidence_requirements:
            return []

        return element.evidence_requirements

    def get_data_providers(self, element, emirate=None):
        """Get recommended data providers by emirate"""
        if not element.providers_by_emirate:
            return []

        emirate_key = (emirate or self.company.emirate or '').lower()
        providers = element.providers_by_emirate.get(emirate_key, [])

        # Fallback to generic providers if none found
        if not providers:
            providers = element.providers_by_emirate.get('generic', [])

        return providers