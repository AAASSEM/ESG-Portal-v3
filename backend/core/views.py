from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.core.exceptions import PermissionDenied
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from datetime import datetime

from .models import (
    Company, Activity, CompanyActivity, Framework, CompanyFramework, DataElement, ProfilingQuestion,
    CompanyProfileAnswer, Meter, CompanyDataSubmission, CompanyChecklist
)
from .serializers import (
    CompanySerializer, CompanyCreateSerializer, ActivitySerializer,
    FrameworkSerializer, DataElementSerializer, ProfilingQuestionSerializer,
    CompanyProfileAnswerSerializer, MeterSerializer, 
    CompanyDataSubmissionSerializer, CompanyChecklistSerializer,
    DashboardStatsSerializer
)
from .services import (
    FrameworkService, ProfilingService, ChecklistService,
    MeterService, DataCollectionService, DashboardService
)


@method_decorator(csrf_exempt, name='dispatch')
class CompanyViewSet(viewsets.ModelViewSet):
    """ViewSet for company management"""
    serializer_class = CompanySerializer
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        # CRITICAL: Always filter by authenticated user
        return Company.objects.filter(user=self.request.user)
    
    def get_serializer_class(self):
        if self.action == 'create':
            return CompanyCreateSerializer
        return CompanySerializer
    
    def perform_create(self, serializer):
        # CRITICAL: Set user when creating
        company = serializer.save(user=self.request.user)
        # Auto-assign mandatory frameworks
        FrameworkService.assign_mandatory_frameworks(company, self.request.user)
        return company
    
    def get_object(self):
        # CRITICAL: Additional security check
        obj = super().get_object()
        if obj.user != self.request.user:
            raise PermissionDenied("You don't have permission to access this company")
        return obj
    
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
        company = get_object_or_404(Company, pk=pk, user=request.user)
        activity_ids = request.data.get('activity_ids', [])
        
        with transaction.atomic():
            # Clear existing activities for this user's company
            CompanyActivity.objects.filter(
                user=request.user,
                company=company
            ).delete()
            
            # Add new activities
            for activity_id in activity_ids:
                try:
                    activity = Activity.objects.get(id=activity_id)
                    CompanyActivity.objects.create(
                        user=request.user,
                        company=company,
                        activity=activity
                    )
                except Activity.DoesNotExist:
                    continue
            
            # Re-assign mandatory frameworks based on updated company profile
            FrameworkService.assign_mandatory_frameworks(company, request.user)
        
        # Return updated activities
        activities = Activity.objects.filter(
            companyactivity__user=request.user,
            companyactivity__company=company
        )
        serializer = ActivitySerializer(activities, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def frameworks(self, request, pk=None):
        """Get company's assigned mandatory frameworks"""
        company = get_object_or_404(Company, pk=pk, user=request.user)
        
        # Get company's assigned frameworks (filtered by user)
        company_frameworks = CompanyFramework.objects.filter(
            user=request.user,
            company=company
        )
        frameworks = [cf.framework for cf in company_frameworks]
        serializer = FrameworkSerializer(frameworks, many=True)
        
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def profile_answers(self, request, pk=None):
        """Get company's profiling wizard answers"""
        company = get_object_or_404(Company, pk=pk, user=request.user)
        
        answers = CompanyProfileAnswer.objects.filter(
            user=request.user,
            company=company
        )
        serializer = CompanyProfileAnswerSerializer(answers, many=True)
        
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def save_profile_answer(self, request, pk=None):
        """Save a single profiling wizard answer"""
        company = get_object_or_404(Company, pk=pk, user=request.user)
        
        question_id = request.data.get('question')
        answer = request.data.get('answer')
        
        if question_id is None or answer is None:
            return Response(
                {'error': 'question and answer are required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            question = ProfilingQuestion.objects.get(question_id=question_id)
            
            # Update or create the answer
            profile_answer, created = CompanyProfileAnswer.objects.update_or_create(
                user=request.user,
                company=company,
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


@method_decorator(csrf_exempt, name='dispatch')
class ActivityViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for business activities"""
    queryset = Activity.objects.all().order_by('name')
    serializer_class = ActivitySerializer
    permission_classes = [permissions.AllowAny]
    
    @action(detail=False, methods=['post'])
    def add_custom(self, request):
        """Add a custom activity and auto-select it for the company"""
        activity_name = request.data.get('name')
        company_id = request.data.get('company_id')
        
        if not activity_name:
            return Response(
                {'error': 'Activity name is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        activity, created = Activity.objects.get_or_create(
            name=activity_name,
            defaults={'is_custom': True}
        )
        
        # If company_id provided, automatically select this activity for the company
        if company_id:
            try:
                company = Company.objects.get(id=company_id)
                CompanyActivity.objects.get_or_create(
                    company=company, 
                    activity=activity
                )
            except Company.DoesNotExist:
                pass
        
        serializer = self.get_serializer(activity)
        response_data = serializer.data
        response_data['auto_selected'] = bool(company_id)
        
        return Response(response_data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


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
        
        try:
            company = Company.objects.get(pk=company_id)
            success = FrameworkService.assign_voluntary_framework(company, framework_id)
            
            if success:
                return Response({'message': 'Framework assigned successfully'})
            else:
                return Response(
                    {'error': 'Framework not found or not voluntary'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        except Company.DoesNotExist:
            return Response(
                {'error': 'Company not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )


@method_decorator(csrf_exempt, name='dispatch')
class ProfilingQuestionViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for profiling questions"""
    queryset = ProfilingQuestion.objects.all()
    serializer_class = ProfilingQuestionSerializer
    authentication_classes = [SessionAuthentication]
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
            company = Company.objects.get(pk=company_id, user=request.user)
            questions = ProfilingService.get_profiling_questions(company)
            serializer = self.get_serializer(questions, many=True)
            return Response(serializer.data)
        except Company.DoesNotExist:
            return Response(
                {'error': 'Company not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['post'])
    def save_answers(self, request):
        """Save profiling wizard answers"""
        company_id = request.data.get('company_id')
        answers = request.data.get('answers', [])
        
        try:
            # CRITICAL: Ensure user can only save answers for their own company
            company = Company.objects.get(pk=company_id, user=request.user)
            ProfilingService.save_profiling_answers(company, answers)
            
            # Generate personalized checklist after saving answers
            ChecklistService.generate_personalized_checklist(company)
            
            # Auto-create meters for metered data elements
            MeterService.auto_create_meters(company)
            
            return Response({'message': 'Answers saved, checklist generated, and meters created successfully'})
        except Company.DoesNotExist:
            return Response(
                {'error': 'Company not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )


@method_decorator(csrf_exempt, name='dispatch')
class CompanyChecklistViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for company's personalized checklist"""
    serializer_class = CompanyChecklistSerializer
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        company_id = self.request.query_params.get('company_id')
        if company_id:
            # CRITICAL: Filter by user to ensure data isolation
            return CompanyChecklist.objects.filter(company_id=company_id, company__user=self.request.user)
        return CompanyChecklist.objects.none()
    
    @action(detail=False, methods=['post'])
    def generate(self, request):
        """Generate personalized checklist for company"""
        company_id = request.data.get('company_id')
        
        try:
            # CRITICAL: Ensure user can only generate checklist for their own company
            company = Company.objects.get(pk=company_id, user=request.user)
            checklist = ChecklistService.generate_personalized_checklist(company)
            
            # Auto-create meters for metered data elements
            MeterService.auto_create_meters(company)
            
            serializer = self.get_serializer(checklist, many=True)
            return Response(serializer.data)
        except Company.DoesNotExist:
            return Response(
                {'error': 'Company not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )


@method_decorator(csrf_exempt, name='dispatch')
class MeterViewSet(viewsets.ModelViewSet):
    """ViewSet for meter management"""
    serializer_class = MeterSerializer
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        company_id = self.request.query_params.get('company_id')
        if company_id:
            # CRITICAL: Filter by user to ensure data isolation
            return Meter.objects.filter(company_id=company_id, company__user=self.request.user)
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
                company = Company.objects.get(pk=company_id, user=request.user)
                print(f"✅ Company found: {company.name}")
            except Company.DoesNotExist:
                print(f"❌ Company not found for ID: {company_id}")
                return Response(
                    {'error': 'Company not found'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Create meter data with company_id
            meter_data = request.data.copy()
            meter_data['company_id'] = company_id
            print(f"🔧 Creating meter with data: {meter_data}")
            
            # Create meter directly
            meter = Meter.objects.create(
                user=request.user,  # CRITICAL: Set the user field
                company=company,
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
            company = Company.objects.get(pk=company_id)
            meters = MeterService.auto_create_meters(company)
            serializer = self.get_serializer(meters, many=True)
            return Response(serializer.data)
        except Company.DoesNotExist:
            return Response(
                {'error': 'Company not found'}, 
                status=status.HTTP_404_NOT_FOUND
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


class DataCollectionViewSet(viewsets.ModelViewSet):
    """ViewSet for data collection and submissions"""
    serializer_class = CompanyDataSubmissionSerializer
    permission_classes = [permissions.AllowAny]
    
    def get_queryset(self):
        company_id = self.request.query_params.get('company_id')
        year = self.request.query_params.get('year')
        month = self.request.query_params.get('month')
        
        queryset = CompanyDataSubmission.objects.all()
        
        if company_id:
            queryset = queryset.filter(company_id=company_id)
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
        year = request.query_params.get('year')
        month = request.query_params.get('month')
        
        if not all([company_id, year, month]):
            return Response(
                {'error': 'company_id, year, and month parameters required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            company = Company.objects.get(pk=company_id)
            tasks = DataCollectionService.get_data_collection_tasks(
                company, int(year), int(month)
            )
            
            # Serialize the tasks
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
                    'element_name': task['element'].name,
                    'element_unit': task['element'].unit,
                    'element_description': task['element'].description,
                    'meter': meter_info,
                    'cadence': task['cadence'],
                    'submission': submission_data
                })
            
            return Response(task_data)
            
        except Company.DoesNotExist:
            return Response(
                {'error': 'Company not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['get'])
    def progress(self, request):
        """Get data collection progress"""
        company_id = request.query_params.get('company_id')
        year = request.query_params.get('year')
        month = request.query_params.get('month')
        
        if not all([company_id, year]):
            return Response(
                {'error': 'company_id and year parameters required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            company = Company.objects.get(pk=company_id)
            progress = DataCollectionService.calculate_progress(
                company, int(year), int(month) if month else None
            )
            return Response(progress)
            
        except Company.DoesNotExist:
            return Response(
                {'error': 'Company not found'}, 
                status=status.HTTP_404_NOT_FOUND
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


class DashboardView(APIView):
    """API view for dashboard statistics"""
    permission_classes = [permissions.AllowAny]
    
    def get(self, request):
        company_id = request.query_params.get('company_id')
        if not company_id:
            return Response(
                {'error': 'company_id parameter required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            company = Company.objects.get(pk=company_id)
            stats = DashboardService.get_dashboard_stats(company)
            serializer = DashboardStatsSerializer(data=stats)
            serializer.is_valid(raise_exception=True)
            return Response(serializer.data)
            
        except Company.DoesNotExist:
            return Response(
                {'error': 'Company not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )