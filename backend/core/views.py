from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.authentication import SessionAuthentication
from .authentication import CsrfExemptSessionAuthentication
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.core.exceptions import PermissionDenied
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from datetime import datetime
from django.contrib.auth.models import User
from django.contrib.auth.hashers import make_password

from .models import (
    Company, Site, Activity, CompanyActivity, Framework, CompanyFramework, DataElement, FrameworkElement, ProfilingQuestion,
    CompanyProfileAnswer, Meter, CompanyDataSubmission, CompanyChecklist
)
from .serializers import (
    CompanySerializer, CompanyCreateSerializer, SiteSerializer, ActivitySerializer,
    FrameworkSerializer, DataElementSerializer, FrameworkElementSerializer, ProfilingQuestionSerializer,
    CompanyProfileAnswerSerializer, MeterSerializer,
    CompanyDataSubmissionSerializer, CompanyChecklistSerializer,
    DashboardStatsSerializer, ProgressSerializer
)
from .services import (
    ProfilingService, ChecklistService,
    MeterService, DataCollectionService, DashboardService, FrameworkProcessor
)


def get_user_company(request_user, company_id):
    """
    Universal helper to validate company access through User.company field.
    Returns the company if user has access, raises PermissionDenied otherwise.
    """
    if not company_id:
        raise PermissionDenied("Company ID is required")
    
    try:
        company_id = int(company_id)
    except (ValueError, TypeError):
        raise PermissionDenied("Invalid company ID")
    
    # Check if user's assigned company matches the requested company
    if hasattr(request_user, 'company') and request_user.company and request_user.company.id == company_id:
        return request_user.company
    
    # Fallback: check UserProfile for backward compatibility
    user_profile = getattr(request_user, 'userprofile', None)
    if user_profile and user_profile.company and user_profile.company.id == company_id:
        return user_profile.company
    
    # Final fallback: check if user owns this company directly (legacy support)
    try:
        return Company.objects.get(pk=company_id, user=request_user)
    except Company.DoesNotExist:
        pass
    
    raise PermissionDenied("You don't have permission to access this company")


@method_decorator(csrf_exempt, name='dispatch')
class CompanyViewSet(viewsets.ModelViewSet):
    """ViewSet for company management"""
    serializer_class = CompanySerializer
    authentication_classes = [CsrfExemptSessionAuthentication]  # Use CSRF-exempt auth
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        # Return the company associated with the user's profile
        user_profile = getattr(self.request.user, 'userprofile', None)
        if user_profile and user_profile.company:
            return Company.objects.filter(id=user_profile.company.id)
        
        # Fallback: return companies owned by the user directly (legacy support)
        legacy_companies = Company.objects.filter(user=self.request.user)
        if legacy_companies.exists():
            return legacy_companies
            
        # No companies accessible
        return Company.objects.none()
    
    def get_serializer_class(self):
        if self.action == 'create':
            return CompanyCreateSerializer
        return CompanySerializer
    
    def perform_create(self, serializer):
        # CRITICAL: Set user when creating
        company = serializer.save(user=self.request.user)
        
        # CRITICAL FIX: Update user's profile to link to the new company
        user_profile = getattr(self.request.user, 'userprofile', None)
        if user_profile:
            user_profile.company = company
            user_profile.save()
            print(f"✅ Linked user {self.request.user.username} profile to company {company.name}")
        else:
            print(f"❌ No UserProfile found for user {self.request.user.username}")
        
        # Auto-assign mandatory frameworks
        FrameworkService.assign_mandatory_frameworks(company, self.request.user)
        return company
    
    def get_object(self):
        # CRITICAL: Additional security check
        obj = super().get_object()
        
        # Check if user has access to this company through their profile
        user_profile = getattr(self.request.user, 'userprofile', None)
        if user_profile and user_profile.company and user_profile.company.id == obj.id:
            return obj
        
        # Fallback: check if user owns this company (for super users)
        if obj.user == self.request.user:
            return obj
            
        raise PermissionDenied("You don't have permission to access this company")
        return obj
    
    def _get_user_company(self, company_id):
        """Helper method to get company that user has access to"""
        return get_user_company(self.request.user, company_id)
    
    @action(detail=True, methods=['post'])
    def update_info(self, request, pk=None):
        """Update company basic information (CSRF-exempt alternative to PUT)"""
        print(f"\n🏢 === COMPANY UPDATE REQUEST START ===")
        print(f"👤 User: {request.user.username} (ID: {request.user.id})")
        print(f"🏢 Company ID: {pk}")
        print(f"📝 Request data: {request.data}")
        
        try:
            company = self._get_user_company(pk)
            print(f"✅ Company found: {company.name} (ID: {company.id})")
            
            # Update allowed fields
            if 'name' in request.data:
                company.name = request.data['name']
                print(f"📝 Updated name to: {company.name}")
                
            if 'emirate' in request.data:
                company.emirate = request.data['emirate'].lower()
                print(f"📍 Updated emirate to: {company.emirate}")
                
            if 'sector' in request.data:
                company.sector = request.data['sector'].lower().replace(' & ', '_').replace(' ', '_')
                print(f"🏭 Updated sector to: {company.sector}")
            
            company.save()
            print(f"✅ Company saved successfully")
            
            # Return updated company data
            serializer = self.get_serializer(company)
            response_data = serializer.data
            
            print(f"📤 Returning company data: {response_data}")
            print(f"🏢 === COMPANY UPDATE REQUEST END ===\n")
            
            return Response(response_data)
            
        except Exception as e:
            print(f"❌ Error updating company: {str(e)}")
            print(f"🏢 === COMPANY UPDATE REQUEST END (ERROR) ===\n")
            return Response(
                {'error': f'Failed to update company: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get'])
    def progress(self, request, pk=None):
        """Get company's overall progress through the modules"""
        company = get_object_or_404(Company, pk=pk)
        
        progress = {
            'module_1_complete': bool(company.companyactivity_set.exists()),
            'module_2_complete': bool(company.companyframework_set.exists()),
            'module_3_complete': bool(
                CompanyProfileAnswer.objects.filter(company=company).exists() and
                CompanyChecklist.objects.filter(company=company).exists()
            ),
            'module_4_complete': bool(Meter.objects.filter(company=company).exists()),
            'module_5_complete': bool(CompanyDataSubmission.objects.filter(company=company).exists()),
        }
        
        # Calculate percentage
        completed_modules = sum(progress.values())
        progress['overall_percentage'] = (completed_modules / 5) * 100
        
        return Response(progress)
    
    @action(detail=True, methods=['get'])
    def activities(self, request, pk=None):
        """Get company's selected activities"""
        company = get_object_or_404(Company, pk=pk)
        
        activities = Activity.objects.filter(companyactivity__company=company)
        serializer = ActivitySerializer(activities, many=True)
        
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def save_activities(self, request, pk=None):
        """Save company's selected activities and re-assign mandatory frameworks"""
        print(f"\n🏢 === ACTIVITY SAVE REQUEST START ===")
        print(f"👤 User: {request.user.username} (ID: {request.user.id})")
        print(f"🏢 Company ID requested: {pk}")
        print(f"📝 Activity IDs in request: {request.data.get('activity_ids', [])}")
        
        company = self._get_user_company(pk)
        print(f"✅ Company resolved: {company.name} (ID: {company.id})")
        
        activity_ids = request.data.get('activity_ids', [])
        
        # Show current database state BEFORE changes (company-wide)
        existing_activities = CompanyActivity.objects.filter(
            company=company
        )
        print(f"📊 BEFORE: {existing_activities.count()} existing CompanyActivity records for company")
        for ca in existing_activities:
            print(f"   - ID: {ca.id}, Activity: '{ca.activity.name}' (Activity ID: {ca.activity.id}, Created by: {ca.user.username if ca.user else 'System'})")
        
        with transaction.atomic():
            # Clear existing activities for this company (company-wide, not user-specific)
            deleted_count, _ = CompanyActivity.objects.filter(
                company=company
            ).delete()
            print(f"🗑️  Deleted {deleted_count} existing CompanyActivity records")
            
            # Add new activities
            created_count = 0
            for activity_id in activity_ids:
                try:
                    activity = Activity.objects.get(id=activity_id)
                    print(f"🔍 Found activity: '{activity.name}' (ID: {activity.id}, is_custom: {activity.is_custom})")
                    
                    company_activity = CompanyActivity.objects.create(
                        user=None,  # Company-wide activity, not tied to specific user
                        company=company,
                        activity=activity
                    )
                    print(f"✅ Created CompanyActivity record: ID {company_activity.id}")
                    created_count += 1
                    
                except Activity.DoesNotExist:
                    print(f"❌ Activity ID {activity_id} not found in database!")
                    continue
            
            print(f"📈 Created {created_count} new CompanyActivity records")
            
            # Re-assign mandatory frameworks based on updated company profile
            print(f"🔄 Re-assigning mandatory frameworks...")
            FrameworkService.assign_mandatory_frameworks(company, request.user)
        
        # Show final database state AFTER changes (company-wide, not user-specific)
        final_activities = Activity.objects.filter(
            companyactivity__company=company
        ).distinct()
        print(f"📊 AFTER: {final_activities.count()} activities now linked to company")
        for activity in final_activities:
            print(f"   - '{activity.name}' (ID: {activity.id}, is_custom: {activity.is_custom})")
        
        print(f"🏢 === ACTIVITY SAVE REQUEST END ===\n")
        
        # Return updated activities (company-wide, visible to all users in company)
        activities = Activity.objects.filter(
            companyactivity__company=company
        ).distinct()
        serializer = ActivitySerializer(activities, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def frameworks(self, request, pk=None):
        """Get company's assigned mandatory frameworks"""
        company = self._get_user_company(pk)
        
        # Get company's assigned frameworks (company-wide, visible to all users)
        company_frameworks = CompanyFramework.objects.filter(
            company=company
        )
        frameworks = [cf.framework for cf in company_frameworks]
        serializer = FrameworkSerializer(frameworks, many=True)
        
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def profile_answers(self, request, pk=None):
        """Get company's profiling wizard answers - site-specific or aggregated"""
        company = self._get_user_company(pk)
        site_id = request.query_params.get('site_id')
        
        # Get the most recent answers for each question for this company/site
        # Users should see company-wide answers, not just their own
        from django.db.models import Max
        
        # Build filter
        filters = {'company': company}
        if site_id:
            filters['site_id'] = site_id
            print(f"🏢 Getting profile answers for site_id: {site_id}")
        else:
            print(f"🌐 Getting aggregated profile answers for all locations")
            # For "All Locations" view, get answers from all sites
            # Don't filter by site to show aggregated data
        
        # Get the latest answer for each question
        latest_answers = CompanyProfileAnswer.objects.filter(
            **filters
        ).values('question').annotate(
            latest_time=Max('answered_at')
        )
        
        # Get the actual answer records
        answer_ids = []
        for item in latest_answers:
            answer_filters = {
                'company': company,
                'question': item['question'],
                'answered_at': item['latest_time']
            }
            if site_id:
                answer_filters['site_id'] = site_id
                
            latest_answer = CompanyProfileAnswer.objects.filter(
                **answer_filters
            ).first()
            if latest_answer:
                answer_ids.append(latest_answer.id)
        
        answers = CompanyProfileAnswer.objects.filter(id__in=answer_ids)
        serializer = CompanyProfileAnswerSerializer(answers, many=True)
        
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def save_profile_answer(self, request, pk=None):
        """Save a single profiling wizard answer"""
        company = self._get_user_company(pk)
        
        # Check if user has permission to edit profiling answers
        user_role = getattr(request.user.userprofile, 'role', 'viewer')
        allowed_edit_roles = ['super_user', 'admin']
        
        if user_role not in allowed_edit_roles:
            return Response(
                {'error': f'Role "{user_role}" does not have permission to edit profiling answers'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        question_id = request.data.get('question')
        answer = request.data.get('answer')
        site_id = request.data.get('site_id')
        
        if question_id is None or answer is None:
            return Response(
                {'error': 'question and answer are required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get site if provided
        site = None
        if site_id:
            try:
                site = Site.objects.get(id=site_id, company=company)
            except Site.DoesNotExist:
                return Response(
                    {'error': 'Site not found or unauthorized'},
                    status=status.HTTP_404_NOT_FOUND
                )
        
        try:
            question = ProfilingQuestion.objects.get(question_id=question_id)
            
            # Update or create the answer (site-specific)
            profile_answer, created = CompanyProfileAnswer.objects.update_or_create(
                user=None,  # Company-wide answer, not tied to specific user
                company=company,
                site=site,  # Site-specific answer
                question=question,
                defaults={'answer': answer}
            )
            
            serializer = CompanyProfileAnswerSerializer(profile_answer)
            return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)
            
        except ProfilingQuestion.DoesNotExist:
            return Response(
                {'error': 'Question not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )


class SiteViewSet(viewsets.ModelViewSet):
    """ViewSet for managing company sites/locations"""
    serializer_class = SiteSerializer
    permission_classes = [IsAuthenticated]
    authentication_classes = [CsrfExemptSessionAuthentication, SessionAuthentication]
    
    def get_queryset(self):
        """Return sites for user's company"""
        user = self.request.user
        
        # Get company from request or user's default company
        company_id = self.request.query_params.get('company_id')
        
        if company_id:
            try:
                company = get_user_company(user, company_id)
            except PermissionDenied:
                return Site.objects.none()
        else:
            # Get user's assigned company
            company = None
            if hasattr(user, 'company') and user.company:
                company = user.company
            elif hasattr(user, 'userprofile') and user.userprofile and user.userprofile.company:
                company = user.userprofile.company
            else:
                # Fallback: try to find first company user owns (legacy support)
                company = Company.objects.filter(user=user).first()
            
        if not company:
            return Site.objects.none()
            
        return Site.objects.filter(company=company).order_by('name')
    
    def perform_create(self, serializer):
        """Create a new site for the company"""
        user = self.request.user
        company_id = self.request.data.get('company_id')
        
        if not company_id:
            # Get user's first company if no company_id provided
            company = Company.objects.filter(user=user).first()
            if not company:
                raise PermissionDenied("No company found for user")
        else:
            company = get_object_or_404(Company, id=company_id, user=user)
        
        serializer.save(company=company)
    
    @action(detail=True, methods=['post'])
    def set_active(self, request, pk=None):
        """Set a site as the active location for the user"""
        user = request.user

        # Check user role - meter managers and uploaders should not have access to location features
        user_role = 'viewer'  # default
        if hasattr(user, 'userprofile') and user.userprofile:
            user_role = user.userprofile.role

        # Role-based access control - block meter managers and uploaders
        if user_role in ['meter_manager', 'uploader']:
            return Response({
                'error': 'Access denied',
                'message': 'Meter managers and uploaders do not have access to location features'
            }, status=status.HTTP_403_FORBIDDEN)

        site = self.get_object()

        # Update user profile with selected site
        if hasattr(request.user, 'userprofile'):
            profile = request.user.userprofile
            profile.site = site
            profile.view_all_locations = False  # Clear "All Locations" flag when selecting a specific site
            profile.save()
            
            return Response({
                'success': True,
                'message': f'Active location set to {site.name}',
                'site': SiteSerializer(site).data
            })
        
        return Response({
            'error': 'User profile not found'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get the currently active site for the user"""
        user = request.user

        # Check user role - meter managers and uploaders should not have access to location features
        user_role = 'viewer'  # default
        if hasattr(user, 'userprofile') and user.userprofile:
            user_role = user.userprofile.role

        # Role-based access control - block meter managers and uploaders
        if user_role in ['meter_manager', 'uploader']:
            return Response({
                'error': 'Access denied',
                'message': 'Meter managers and uploaders do not have access to location features'
            }, status=status.HTTP_403_FORBIDDEN)

        if hasattr(request.user, 'userprofile'):
            profile = request.user.userprofile

            # Check if "All Locations" view is active
            if profile.view_all_locations:
                return Response({
                    'id': 'all',
                    'name': 'All Locations'
                })

            # Check for regular site selection
            if profile.site:
                site = profile.site
                return Response(SiteSerializer(site).data)

        return Response({
            'message': 'No active site selected'
        }, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=False, methods=['post'])
    def set_all_locations(self, request):
        """Set the user to view all locations"""
        user = request.user

        # Check user role - meter managers and uploaders should not have access to location features
        user_role = 'viewer'  # default
        if hasattr(user, 'userprofile') and user.userprofile:
            user_role = user.userprofile.role

        # Role-based access control - block meter managers and uploaders
        if user_role in ['meter_manager', 'uploader']:
            return Response({
                'error': 'Access denied',
                'message': 'Meter managers and uploaders do not have access to location features'
            }, status=status.HTTP_403_FORBIDDEN)

        if hasattr(request.user, 'userprofile'):
            profile = request.user.userprofile
            profile.site = None  # Clear specific site selection
            profile.view_all_locations = True  # Set "All Locations" flag
            profile.save()
            
            return Response({
                'success': True,
                'message': 'Active view set to All Locations',
                'site': {
                    'id': 'all',
                    'name': 'All Locations'
                }
            })
        
        return Response({
            'error': 'User profile not found'
        }, status=status.HTTP_400_BAD_REQUEST)


@method_decorator(csrf_exempt, name='dispatch')
class ActivityViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for business activities"""
    queryset = Activity.objects.all().order_by('name')
    serializer_class = ActivitySerializer
    permission_classes = [permissions.AllowAny]
    
    def list(self, request, *args, **kwargs):
        """Override list to add database state logging"""
        print(f"\n📋 === ACTIVITY LIST REQUEST ===")
        print(f"👤 User: {request.user.username if request.user.is_authenticated else 'Anonymous'}")
        
        # Show all activities in database
        all_activities = Activity.objects.all().order_by('name')
        predefined_count = all_activities.filter(is_custom=False).count()
        custom_count = all_activities.filter(is_custom=True).count()
        
        print(f"📊 Total activities in database: {all_activities.count()}")
        print(f"   - Predefined: {predefined_count}")
        print(f"   - Custom: {custom_count}")
        
        print(f"📋 All activities:")
        for activity in all_activities:
            print(f"   - ID: {activity.id}, Name: '{activity.name}', is_custom: {activity.is_custom}")
        
        print(f"📋 === ACTIVITY LIST REQUEST END ===\n")
        
        return super().list(request, *args, **kwargs)
    
    @action(detail=False, methods=['post'])
    def add_custom(self, request):
        """Add a custom activity and auto-select it for the company"""
        print(f"\n🆕 === ADD CUSTOM ACTIVITY REQUEST START ===")
        print(f"👤 User: {request.user.username if request.user.is_authenticated else 'Anonymous'}")
        
        activity_name = request.data.get('name')
        company_id = request.data.get('company_id')
        
        print(f"📝 Activity name: '{activity_name}'")
        print(f"🏢 Company ID: {company_id}")
        
        if not activity_name:
            print(f"❌ No activity name provided")
            return Response(
                {'error': 'Activity name is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if activity already exists
        existing_activity = Activity.objects.filter(name=activity_name).first()
        if existing_activity:
            print(f"🔍 Found existing activity: '{existing_activity.name}' (ID: {existing_activity.id}, is_custom: {existing_activity.is_custom})")
        else:
            print(f"🆕 Activity '{activity_name}' does not exist, will create new one")
        
        activity, created = Activity.objects.get_or_create(
            name=activity_name,
            defaults={'is_custom': True}
        )
        
        if created:
            print(f"✅ Created new custom activity: '{activity.name}' (ID: {activity.id})")
        else:
            print(f"🔄 Using existing activity: '{activity.name}' (ID: {activity.id}, is_custom: {activity.is_custom})")
        
        # If company_id provided, automatically select this activity for the company
        if company_id:
            try:
                company = Company.objects.get(id=company_id)
                print(f"🏢 Found company: '{company.name}' (ID: {company.id})")
                
                company_activity, ca_created = CompanyActivity.objects.get_or_create(
                    company=company, 
                    activity=activity
                )
                
                if ca_created:
                    print(f"✅ Created CompanyActivity link: Company '{company.name}' -> Activity '{activity.name}' (CompanyActivity ID: {company_activity.id})")
                else:
                    print(f"🔄 CompanyActivity link already exists: ID {company_activity.id}")
                    
            except Company.DoesNotExist:
                print(f"❌ Company ID {company_id} not found!")
        else:
            print(f"⚠️  No company_id provided, activity created but not linked to any company")
        
        serializer = self.get_serializer(activity)
        response_data = serializer.data
        response_data['auto_selected'] = bool(company_id)
        
        print(f"📤 Returning activity data: ID {activity.id}, name: '{activity.name}', auto_selected: {bool(company_id)}")
        print(f"🆕 === ADD CUSTOM ACTIVITY REQUEST END ===\n")
        
        return Response(response_data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


@method_decorator(csrf_exempt, name='dispatch')
class FrameworkViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for ESG frameworks"""
    queryset = Framework.objects.all()
    serializer_class = FrameworkSerializer
    permission_classes = [permissions.AllowAny]
    
    @action(detail=False, methods=['get'])
    def voluntary(self, request):
        """Get all voluntary frameworks"""
        frameworks = FrameworkService.get_voluntary_frameworks()
        serializer = self.get_serializer(frameworks, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def assign_voluntary(self, request):
        """Assign voluntary framework to company"""
        company_id = request.data.get('company_id')
        framework_id = request.data.get('framework_id')

        print(f"🔍 assign_voluntary called with company_id={company_id}, framework_id={framework_id}")
        print(f"🔍 Request data: {request.data}")

        if not company_id:
            print("❌ Missing company_id")
            return Response(
                {'error': 'company_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not framework_id:
            print("❌ Missing framework_id")
            return Response(
                {'error': 'framework_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            company = Company.objects.get(pk=company_id)
            print(f"✅ Found company: {company.name}")

            success = FrameworkService.assign_voluntary_framework(company, framework_id)
            print(f"🔍 FrameworkService.assign_voluntary_framework returned: {success}")

            if success:
                print("✅ Framework assigned successfully")
                return Response({'message': 'Framework assigned successfully'})
            else:
                print("❌ FrameworkService returned False")
                return Response(
                    {'error': 'Framework not found or not voluntary'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        except Company.DoesNotExist:
            print(f"❌ Company not found with ID: {company_id}")
            return Response(
                {'error': 'Company not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            print(f"❌ Unexpected error: {str(e)}")
            return Response(
                {'error': f'Unexpected error: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'])
    def remove_voluntary(self, request):
        """Remove voluntary framework from company"""
        company_id = request.data.get('company_id')
        framework_id = request.data.get('framework_id')
        
        try:
            company = Company.objects.get(pk=company_id)
            framework = Framework.objects.get(framework_id=framework_id, type='voluntary')
            
            # Remove the framework assignment
            CompanyFramework.objects.filter(
                company=company,
                framework=framework,
                is_auto_assigned=False  # Only remove voluntary frameworks
            ).delete()
            
            return Response({'message': 'Framework removed successfully'})
        except Company.DoesNotExist:
            return Response(
                {'error': 'Company not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Framework.DoesNotExist:
            return Response(
                {'error': 'Framework not found or not voluntary'}, 
                status=status.HTTP_400_BAD_REQUEST
            )


class FrameworkElementViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for framework-based elements with rich specifications"""
    queryset = FrameworkElement.objects.all()
    serializer_class = FrameworkElementSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Filter framework elements based on company context"""
        queryset = super().get_queryset()

        # Filter by framework if specified
        framework_id = self.request.query_params.get('framework_id')
        if framework_id:
            queryset = queryset.filter(framework_id=framework_id)

        # Filter by sector if specified
        sector = self.request.query_params.get('sector')
        if sector:
            queryset = queryset.filter(sector=sector)

        # Filter by category if specified
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category=category)

        # Filter by type if specified
        element_type = self.request.query_params.get('type')
        if element_type:
            queryset = queryset.filter(type=element_type)

        return queryset.order_by('official_code')

    @action(detail=False, methods=['get'])
    def for_company(self, request):
        """Get framework elements applicable to a specific company"""
        company_id = request.query_params.get('company_id')

        if not company_id:
            return Response(
                {'error': 'company_id parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            company = get_object_or_404(Company, id=company_id)

            # Use framework processor to get applicable elements
            processor = FrameworkProcessor(company)
            framework_id = request.query_params.get('framework_id')
            applicable_elements = processor.get_applicable_elements(framework_id=framework_id, sector=company.sector)

            serializer = self.get_serializer(applicable_elements, many=True)
            return Response(serializer.data)

        except Company.DoesNotExist:
            return Response(
                {'error': 'Company not found'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=False, methods=['get'])
    def wizard_questions(self, request):
        """Get wizard questions for determining element applicability"""
        company_id = request.query_params.get('company_id')
        framework_id = request.query_params.get('framework_id')

        if not company_id:
            return Response(
                {'error': 'company_id parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            company = get_object_or_404(Company, id=company_id)
            processor = FrameworkProcessor(company)
            questions = processor.get_wizard_questions(framework_id=framework_id)
            return Response({'questions': questions})

        except Company.DoesNotExist:
            return Response(
                {'error': 'Company not found'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=['post'])
    def calculate_carbon(self, request, pk=None):
        """Calculate carbon emissions for an element"""
        element = self.get_object()
        value = request.data.get('value')
        period = request.data.get('period', 'monthly')

        if value is None:
            return Response(
                {'error': 'value parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            value = float(value)
            company_id = request.data.get('company_id')

            if company_id:
                company = get_object_or_404(Company, id=company_id)
                processor = FrameworkProcessor(company)
                result = processor.calculate_carbon_emissions(element, value, period)
            else:
                # Fallback to basic calculation without company context
                result = {'error': 'company_id required for carbon calculations'}

            return Response(result)

        except (ValueError, TypeError):
            return Response(
                {'error': 'Invalid value - must be a number'},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['get'])
    def evidence_requirements(self, request, pk=None):
        """Get evidence requirements for an element"""
        element = self.get_object()
        company_id = request.query_params.get('company_id')

        if company_id:
            try:
                company = get_object_or_404(Company, id=company_id)
                processor = FrameworkProcessor(company)
                requirements = processor.get_evidence_requirements(element)
                providers = processor.get_data_providers(element)

                return Response({
                    'evidence_requirements': requirements,
                    'recommended_providers': providers
                })
            except Company.DoesNotExist:
                pass

        # Fallback without company context
        return Response({
            'evidence_requirements': element.evidence_requirements or [],
            'recommended_providers': []
        })


@method_decorator(csrf_exempt, name='dispatch')
class ProfilingQuestionViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for profiling questions"""
    queryset = ProfilingQuestion.objects.all()
    serializer_class = ProfilingQuestionSerializer
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def for_company(self, request):
        """Get profiling questions for a specific company"""
        company_id = request.query_params.get('company_id')
        if not company_id:
            return Response(
                {'error': 'company_id parameter required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # CRITICAL: Ensure user can only access their own company
            company = get_user_company(request.user, company_id)
                    
            questions = ProfilingService.get_profiling_questions(company)
            serializer = self.get_serializer(questions, many=True)
            return Response(serializer.data)
        except Exception as e:
            return Response(
                {'error': f'Error retrieving questions: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'])
    def save_answers(self, request):
        """Save profiling wizard answers"""
        # Check if user has permission to edit profiling answers
        user_role = getattr(request.user.userprofile, 'role', 'viewer')
        allowed_edit_roles = ['super_user', 'admin']
        
        if user_role not in allowed_edit_roles:
            return Response(
                {'error': f'Role "{user_role}" does not have permission to edit profiling answers'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        company_id = request.data.get('company_id')
        site_id = request.data.get('site_id')
        answers = request.data.get('answers', [])
        
        try:
            # CRITICAL: Ensure user can only save answers for their own company
            company = get_user_company(request.user, company_id)
            
            # Get site if provided
            site = None
            if site_id:
                try:
                    site = Site.objects.get(id=site_id, company=company)
                    print(f"🏢 Saving profile answers for site: {site.name}")
                except Site.DoesNotExist:
                    return Response(
                        {'error': 'Site not found or unauthorized'},
                        status=status.HTTP_404_NOT_FOUND
                    )
                    
            # Save framework element answers directly (NEW SYSTEM)
            # Store answers directly without using the old ProfilingQuestion system
            from django.db import transaction
            from .models import CompanyProfileAnswer, ProfilingQuestion, DataElement

            with transaction.atomic():
                # Clear existing answers for this company
                CompanyProfileAnswer.objects.filter(company=company).delete()

                # Create answers using a simplified approach
                for answer_data in answers:
                    element_id = answer_data.get('question_id')  # Actually element_id in new system
                    answer_value = answer_data.get('answer')

                    # Get or create a dummy DataElement for compatibility
                    dummy_element, created = DataElement.objects.get_or_create(
                        element_id=f"dummy_{element_id}",
                        defaults={
                            'name': element_id,
                            'description': f'Dummy element for {element_id}',
                            'type': 'conditional'
                        }
                    )

                    # Get or create ProfilingQuestion with required activates_element
                    question, created = ProfilingQuestion.objects.get_or_create(
                        question_id=element_id,
                        defaults={
                            'text': element_id,
                            'activates_element': dummy_element
                        }
                    )

                    # Store the answer
                    CompanyProfileAnswer.objects.create(
                        company=company,
                        question=question,
                        answer=answer_value,
                        user=request.user
                    )

            # Generate personalized checklist after saving answers (site-specific)
            ChecklistService.generate_personalized_checklist(company, site)

            # Auto-create meters for metered data elements (site-specific)
            MeterService.auto_create_meters(company, site)
            
            return Response({'message': 'Answers saved, checklist generated, and meters created successfully'})
        except Company.DoesNotExist:
            return Response(
                {'error': 'Company not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            print(f"❌ Error in save_answers: {str(e)}")
            import traceback
            traceback.print_exc()
            return Response(
                {'error': f'Failed to save answers and generate checklist: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@method_decorator(csrf_exempt, name='dispatch')
class CompanyChecklistViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for company's personalized checklist"""
    serializer_class = CompanyChecklistSerializer
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        company_id = self.request.query_params.get('company_id')
        site_id = self.request.query_params.get('site_id')
        
        if company_id:
            # CRITICAL: Ensure user can only access checklists for their own company
            try:
                company = get_user_company(self.request.user, company_id)
                queryset = CompanyChecklist.objects.filter(company_id=company_id)
                
                # Filter by site if provided
                if site_id:
                    queryset = queryset.filter(site_id=site_id)
                    print(f"🏢 Filtering checklist by site_id: {site_id}")
                else:
                    # For "All Locations" view, return checklists from all sites for this company
                    print(f"🌐 Showing aggregated checklist for all locations")
                    # Don't filter by site - show all checklists for the company
                    
                return queryset
            except PermissionDenied:
                return CompanyChecklist.objects.none()
        return CompanyChecklist.objects.none()
    
    def list(self, request, *args, **kwargs):
        """Override list to provide location aggregation info for All Locations view"""
        print("🚀 CUSTOM LIST METHOD CALLED!")
        company_id = self.request.query_params.get('company_id')
        site_id = self.request.query_params.get('site_id')
        
        print(f"🔍 Parameters: company_id={company_id}, site_id={site_id}")
        
        if company_id and not site_id:  # All Locations view - aggregate by element
            print("🌍 All Locations aggregation logic triggered!")
            try:
                company = get_user_company(request.user, company_id)
                
                # Get all checklist items for all sites
                all_items = CompanyChecklist.objects.filter(
                    company_id=company_id
                ).select_related('element', 'site').order_by('element__element_id')
                
                print(f"📊 Found {all_items.count()} total checklist items across all sites")
                
                # Group by element ID to deduplicate
                element_map = {}
                
                for item in all_items:
                    element_id = item.element.element_id
                    
                    if element_id not in element_map:
                        element_map[element_id] = {
                            'item': item,  # Keep first item as template
                            'sites': []
                        }
                    
                    # Add site info if not already added
                    if item.site and not any(s['id'] == item.site.id for s in element_map[element_id]['sites']):
                        element_map[element_id]['sites'].append({
                            'id': item.site.id,
                            'name': item.site.name,
                            'location': item.site.location
                        })
                
                # Build aggregated response - one entry per unique element
                results = []
                shared_count = 0
                unique_count = 0
                
                for element_id, data in element_map.items():
                    # Use the checklist serializer for base data
                    serializer = self.get_serializer(data['item'])
                    item_data = serializer.data
                    
                    # Add aggregated location info
                    site_count = len(data['sites'])
                    item_data['locations'] = data['sites']
                    item_data['location_count'] = site_count
                    
                    # Determine if shared or unique
                    if site_count > 1:
                        item_data['location_type'] = 'shared'
                        shared_count += 1
                        print(f"   🔵 SHARED: {item_data['element_name']} in {site_count} sites")
                    elif site_count == 1:
                        item_data['location_type'] = 'unique'
                        unique_count += 1
                        print(f"   🟠 UNIQUE: {item_data['element_name']} only in {data['sites'][0]['name']}")
                    else:
                        item_data['location_type'] = 'none'
                        print(f"   ⚪ NO SITE: {item_data['element_name']}")
                    
                    results.append(item_data)
                
                # Sort results for consistent display
                results.sort(key=lambda x: (x.get('category', ''), x.get('element_name', '')))
                
                print(f"📊 Aggregation complete: {len(results)} elements ({shared_count} shared, {unique_count} unique)")
                
                return Response({
                    'results': results,
                    'count': len(results),
                    'aggregation_stats': {
                        'total_elements': len(results),
                        'shared_elements': shared_count,
                        'unique_elements': unique_count
                    }
                })
                
            except Exception as e:
                print(f"❌ Error in All Locations aggregation: {e}")
                return Response(
                    {'error': 'Failed to load aggregated checklist'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        
        # Default behavior for specific location
        print(f"🔍 Using default list behavior for site_id={site_id}")
        return super().list(request, *args, **kwargs)


@method_decorator(csrf_exempt, name='dispatch')
class MeterViewSet(viewsets.ModelViewSet):
    """ViewSet for meter management"""
    serializer_class = MeterSerializer
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        company_id = self.request.query_params.get('company_id')
        site_id = self.request.query_params.get('site_id')
        
        if company_id:
            # CRITICAL: Filter by user's company to ensure data isolation
            try:
                company = get_user_company(self.request.user, company_id)
                queryset = Meter.objects.filter(company_id=company_id)
                
                # Filter by site if provided
                if site_id:
                    queryset = queryset.filter(site_id=site_id)
                    print(f"🏢 Filtering meters by site_id: {site_id}")
                else:
                    print(f"🌐 Showing aggregated meters for all locations")
                    # For "All Locations" view, show all meters for the company
                
                return queryset
            except PermissionDenied:
                return Meter.objects.none()
        return Meter.objects.none()
    
    def create(self, request, *args, **kwargs):
        """Custom create to handle company_id from query params or request body"""
        try:
            print(f"🔍 Meter create request received from user: {request.user}")
            print(f"📊 Request data: {request.data}")
            print(f"📊 Query params: {request.query_params}")
            
            # Get company_id from query params or request body
            company_id = request.query_params.get('company_id') or request.data.get('company')
            print(f"🏢 Company ID: {company_id}")
            
            if not company_id:
                return Response(
                    {'error': 'company_id is required'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Validate company exists and belongs to authenticated user
            try:
                company = get_user_company(request.user, company_id)
                print(f"✅ Company found: {company.name}")
            except PermissionDenied as e:
                print(f"❌ Company access denied for ID: {company_id}")
                return Response(
                    {'error': str(e)}, 
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Create meter data with company_id
            meter_data = request.data.copy()
            meter_data['company_id'] = company_id
            print(f"🔧 Creating meter with data: {meter_data}")
            
            # Get site if provided
            site_id = request.query_params.get('site_id') or request.data.get('site_id')
            site = None
            if site_id:
                try:
                    site = Site.objects.get(id=site_id, company=company)
                    print(f"📍 Assigning meter to site: {site.name}")
                except Site.DoesNotExist:
                    print(f"⚠️ Site {site_id} not found for company {company_id}")
            
            # Create meter directly (company-wide, not user-specific)
            meter = Meter.objects.create(
                user=None,  # Company-wide meter, not tied to specific user
                company=company,
                site=site,  # Assign to site if provided
                type=meter_data.get('type'),
                name=meter_data.get('name'),
                account_number=meter_data.get('account_number', ''),
                location_description=meter_data.get('location_description', ''),
                status=meter_data.get('status', 'active').lower(),
                is_auto_created=False  # Manual meter creation by user
            )
            print(f"✅ Meter created successfully: {meter.id}")
            
            serializer = self.get_serializer(meter)
            print(f"📤 Returning meter data: {serializer.data}")
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            print(f"💥 ERROR in meter creation: {str(e)}")
            print(f"💥 Error type: {type(e).__name__}")
            import traceback
            print(f"💥 Full traceback: {traceback.format_exc()}")
            return Response(
                {'error': f'Internal server error: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def update(self, request, *args, **kwargs):
        """Custom update to ensure company_id consistency"""
        meter = self.get_object()
        
        # Update meter fields
        if 'name' in request.data:
            meter.name = request.data['name']
        if 'type' in request.data:
            meter.type = request.data['type']
        if 'account_number' in request.data:
            meter.account_number = request.data['account_number']
        if 'location_description' in request.data:
            meter.location_description = request.data['location_description']
        if 'status' in request.data:
            meter.status = request.data['status'].lower()
        
        meter.save()
        
        serializer = self.get_serializer(meter)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def auto_create(self, request):
        """Auto-create default meters for company"""
        company_id = request.data.get('company_id')
        
        try:
            company = get_user_company(request.user, company_id)
            meters = MeterService.auto_create_meters(company)
            serializer = self.get_serializer(meters, many=True)
            return Response(serializer.data)
        except PermissionDenied as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_403_FORBIDDEN
            )
    
    def destroy(self, request, *args, **kwargs):
        """Override destroy to check if meter can be deleted and clean up associated data"""
        meter = self.get_object()
        
        # Check if meter has actual data (not just empty submissions)
        if meter.has_data():
            return Response(
                {'error': f'Cannot delete meter "{meter.name}" because it has data entries. Please remove all data entries first, or deactivate the meter instead.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Clean up associated empty submissions before deleting meter
        from .models import CompanyDataSubmission
        deleted_submissions = CompanyDataSubmission.objects.filter(meter=meter).count()
        CompanyDataSubmission.objects.filter(meter=meter).delete()
        
        # Now delete the meter
        response = super().destroy(request, *args, **kwargs)
        
        # Log for debugging
        print(f"Deleted meter {meter.name} and cleaned up {deleted_submissions} empty submissions")
        
        return response


@method_decorator(csrf_exempt, name='dispatch')
class DataCollectionViewSet(viewsets.ModelViewSet):
    """ViewSet for data collection and submissions"""
    serializer_class = CompanyDataSubmissionSerializer
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        company_id = self.request.query_params.get('company_id')
        site_id = self.request.query_params.get('site_id')
        year = self.request.query_params.get('year')
        month = self.request.query_params.get('month')
        
        queryset = CompanyDataSubmission.objects.all()
        
        if company_id:
            queryset = queryset.filter(company_id=company_id)
            
        # Filter by site using direct site field
        if site_id:
            queryset = queryset.filter(site_id=site_id)
            print(f"📍 Filtering data submissions by site_id: {site_id}")
        else:
            print(f"🌐 Showing aggregated data submissions for all locations")
            # For "All Locations" view, show all submissions for the company
            
        if year:
            queryset = queryset.filter(reporting_year=year)
        if month:
            month_name = datetime(int(year), int(month), 1).strftime('%b')
            queryset = queryset.filter(reporting_period=month_name)
        
        return queryset.order_by('-updated_at')
    
    @action(detail=False, methods=['get'])
    def available_months(self, request):
        """Get available months for data collection"""
        year = request.query_params.get('year')
        if not year:
            return Response(
                {'error': 'year parameter required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        months = DataCollectionService.get_available_months(int(year))
        return Response({'months': months})
    
    @action(detail=False, methods=['get'])
    def tasks(self, request):
        """Get data collection tasks for specific month"""
        company_id = request.query_params.get('company_id')
        site_id = request.query_params.get('site_id')
        year = request.query_params.get('year')
        month = request.query_params.get('month')
        
        if not all([company_id, year, month]):
            return Response(
                {'error': 'company_id, year, and month parameters required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # CRITICAL: Added proper permission check
            company = get_user_company(request.user, company_id)
            
            # Get site if specified
            site = None
            if site_id:
                try:
                    site = Site.objects.get(id=site_id, company=company)
                    print(f"📍 Tasks filtered for site: {site.name}")
                except Site.DoesNotExist:
                    return Response(
                        {'error': 'Site not found or unauthorized'},
                        status=status.HTTP_404_NOT_FOUND
                    )
            
            print(f"🔐 Tasks request from user: {request.user} (ID: {request.user.id if hasattr(request.user, 'id') else 'N/A'})")
            tasks = DataCollectionService.get_data_collection_tasks(
                company, int(year), int(month), user=request.user, site=site
            )
            
            # Check if tasks are grouped by site (All Locations) or ungrouped (specific site)
            if site:
                # Specific site: serialize tasks normally
                task_data = []
                for task in tasks:
                    submission_data = CompanyDataSubmissionSerializer(task['submission']).data
                    meter_info = None
                    if task['meter']:
                        meter_info = {
                            'id': task['meter'].id,
                            'name': task['meter'].name,
                            'type': task['meter'].type,
                            'location': task['meter'].location_description,
                            'account_number': task['meter'].account_number,
                            'status': task['meter'].status
                        }
                    
                    task_data.append({
                        'type': task['type'],
                        'element_name': task['element'].name_plain,
                        'element_unit': task['element'].unit,
                        'element_description': task['element'].description,
                        'meter': meter_info,
                        'cadence': task['cadence'],
                        'submission': submission_data
                    })
                
                return Response(task_data)
            else:
                # All Locations: serialize grouped by site
                grouped_data = []
                for site_group in tasks:
                    site_tasks = []
                    for task in site_group['tasks']:
                        submission_data = CompanyDataSubmissionSerializer(task['submission']).data
                        meter_info = None
                        if task['meter']:
                            meter_info = {
                                'id': task['meter'].id,
                                'name': task['meter'].name,
                                'type': task['meter'].type,
                                'location': task['meter'].location_description,
                                'account_number': task['meter'].account_number,
                                'status': task['meter'].status
                            }
                        
                        site_tasks.append({
                            'type': task['type'],
                            'element_name': task['element'].name_plain,
                            'element_unit': task['element'].unit,
                            'element_description': task['element'].description,
                            'meter': meter_info,
                            'cadence': task['cadence'],
                            'submission': submission_data
                        })
                    
                    grouped_data.append({
                        'site': site_group['site'],
                        'tasks': site_tasks
                    })
                
                return Response(grouped_data)
            
        except PermissionDenied as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_403_FORBIDDEN
            )
    
    @action(detail=False, methods=['get'])
    def progress(self, request):
        """Get data collection progress"""
        company_id = request.query_params.get('company_id')
        site_id = request.query_params.get('site_id')
        year = request.query_params.get('year')
        month = request.query_params.get('month')

        if not all([company_id, year]):
            return Response(
                {'error': 'company_id and year parameters required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # CRITICAL: Added proper permission check
            company = get_user_company(request.user, company_id)

            # Get site if specified
            site = None
            if site_id:
                try:
                    site = Site.objects.get(id=site_id, company=company)
                    print(f"📍 Progress filtered for site: {site.name}")
                except Site.DoesNotExist:
                    return Response(
                        {'error': 'Site not found or unauthorized'},
                        status=status.HTTP_404_NOT_FOUND
                    )
            else:
                print(f"🌐 Progress showing aggregated stats for all locations")

            progress = DataCollectionService.calculate_progress(
                company, int(year), int(month) if month else None, user=request.user, site=site
            )
            print(f"🔍 Progress data for validation: {progress}")
            serializer = ProgressSerializer(data=progress)
            if not serializer.is_valid():
                print(f"❌ Serializer validation errors: {serializer.errors}")
                return Response(
                    {'error': 'Progress data validation failed', 'details': serializer.errors},
                    status=status.HTTP_400_BAD_REQUEST
                )
            return Response(serializer.data)

        except PermissionDenied as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_403_FORBIDDEN
            )
        except Exception as e:
            print(f"❌ Unexpected error in progress endpoint: {e}")
            import traceback
            traceback.print_exc()
            return Response(
                {'error': 'Internal server error', 'details': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'], url_path='cleanup-orphaned')
    def cleanup_orphaned_submissions(self, request):
        """Clean up orphaned submissions from deleted meters"""
        company_id = request.data.get('company_id')
        
        if not company_id:
            return Response(
                {'error': 'company_id is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            from .models import CompanyDataSubmission, Meter
            
            # Find submissions that reference non-existent meters
            orphaned_count = 0
            all_submissions = CompanyDataSubmission.objects.filter(company_id=company_id)
            
            for submission in all_submissions:
                if submission.meter_id:  # Only check metered submissions
                    try:
                        # Try to access the meter - this will fail if meter doesn't exist
                        _ = submission.meter
                    except Meter.DoesNotExist:
                        # Meter doesn't exist, delete the orphaned submission
                        submission.delete()
                        orphaned_count += 1
            
            return Response({
                'message': f'Cleaned up {orphaned_count} orphaned submissions',
                'deleted_count': orphaned_count
            })
            
        except Exception as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def update(self, request, *args, **kwargs):
        """Custom update method to handle file removal"""
        instance = self.get_object()
        
        # Check if this is a file removal request
        if 'remove_evidence' in request.data:
            instance.evidence_file.delete(save=False)  # Delete the file
            instance.evidence_file = None
            instance.save()
            serializer = self.get_serializer(instance)
            return Response(serializer.data)
        
        # Otherwise, use the default update behavior
        return super().update(request, *args, **kwargs)
    
    @action(detail=False, methods=['post'], url_path='assign-task')
    def assign_task(self, request):
        """Assign a data collection task to a user"""
        task_id = request.data.get('task_id')
        assigned_user_id = request.data.get('assigned_user_id')
        
        if not task_id or not assigned_user_id:
            return Response(
                {'error': 'task_id and assigned_user_id are required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Get the task (CompanyDataSubmission)
            task = CompanyDataSubmission.objects.get(id=task_id)
            
            # Get the user to assign to
            from django.contrib.auth.models import User
            assigned_user = User.objects.get(id=assigned_user_id)
            
            # Update assignment fields
            task.assigned_to = assigned_user
            task.assigned_by = request.user
            task.assigned_at = timezone.now()
            task.save()
            
            return Response({
                'message': 'Task assigned successfully',
                'task_id': task_id,
                'assigned_to': {
                    'id': assigned_user.id,
                    'name': f"{assigned_user.first_name} {assigned_user.last_name}".strip() or assigned_user.username,
                    'email': assigned_user.email
                },
                'assigned_by': request.user.username,
                'assigned_at': task.assigned_at.isoformat()
            })
            
        except CompanyDataSubmission.DoesNotExist:
            return Response(
                {'error': 'Task not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': f'Failed to assign task: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@method_decorator(csrf_exempt, name='dispatch')
class DashboardView(APIView):
    """API view for dashboard statistics"""
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthenticated]  # CRITICAL: Fixed security hole
    
    def get(self, request):
        company_id = request.query_params.get('company_id')
        site_id = request.query_params.get('site_id')
        
        if not company_id:
            return Response(
                {'error': 'company_id parameter required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # CRITICAL: Added proper permission check
            company = get_user_company(request.user, company_id)
            
            # Get site if specified
            site = None
            if site_id:
                try:
                    site = Site.objects.get(id=site_id, company=company)
                    print(f"🏢 Dashboard filtered for site: {site.name}")
                except Site.DoesNotExist:
                    return Response(
                        {'error': 'Site not found or unauthorized'},
                        status=status.HTTP_404_NOT_FOUND
                    )
            else:
                print(f"🌐 Dashboard showing aggregated stats for all locations")
            
            stats = DashboardService.get_dashboard_stats(company, user=request.user, site=site)
            serializer = DashboardStatsSerializer(data=stats)
            serializer.is_valid(raise_exception=True)
            return Response(serializer.data)
            
        except PermissionDenied as e:
            return Response(
                {'error': str(e)}, 
                status=status.HTTP_403_FORBIDDEN
            )