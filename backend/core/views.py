from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.db import transaction
from datetime import datetime

from .models import (
    Company, Activity, Framework, DataElement, ProfilingQuestion,
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


class CompanyViewSet(viewsets.ModelViewSet):
    """ViewSet for company management"""
    queryset = Company.objects.all()
    permission_classes = [permissions.AllowAny]  # For development
    
    def get_serializer_class(self):
        if self.action == 'create':
            return CompanyCreateSerializer
        return CompanySerializer
    
    def perform_create(self, serializer):
        company = serializer.save()
        # Auto-assign mandatory frameworks
        FrameworkService.assign_mandatory_frameworks(company)
        return company
    
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


class ActivityViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for business activities"""
    queryset = Activity.objects.all().order_by('name')
    serializer_class = ActivitySerializer
    permission_classes = [permissions.AllowAny]
    
    @action(detail=False, methods=['post'])
    def add_custom(self, request):
        """Add a custom activity"""
        activity_name = request.data.get('name')
        if not activity_name:
            return Response(
                {'error': 'Activity name is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        activity, created = Activity.objects.get_or_create(
            name=activity_name,
            defaults={'is_custom': True}
        )
        
        serializer = self.get_serializer(activity)
        return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


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


class ProfilingQuestionViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for profiling questions"""
    queryset = ProfilingQuestion.objects.all()
    serializer_class = ProfilingQuestionSerializer
    permission_classes = [permissions.AllowAny]
    
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
            company = Company.objects.get(pk=company_id)
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
            company = Company.objects.get(pk=company_id)
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


class CompanyChecklistViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for company's personalized checklist"""
    serializer_class = CompanyChecklistSerializer
    permission_classes = [permissions.AllowAny]
    
    def get_queryset(self):
        company_id = self.request.query_params.get('company_id')
        if company_id:
            return CompanyChecklist.objects.filter(company_id=company_id)
        return CompanyChecklist.objects.none()
    
    @action(detail=False, methods=['post'])
    def generate(self, request):
        """Generate personalized checklist for company"""
        company_id = request.data.get('company_id')
        
        try:
            company = Company.objects.get(pk=company_id)
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


class MeterViewSet(viewsets.ModelViewSet):
    """ViewSet for meter management"""
    serializer_class = MeterSerializer
    permission_classes = [permissions.AllowAny]
    
    def get_queryset(self):
        company_id = self.request.query_params.get('company_id')
        if company_id:
            return Meter.objects.filter(company_id=company_id)
        return Meter.objects.none()
    
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
        """Override destroy to check if meter can be deleted"""
        meter = self.get_object()
        
        if not MeterService.can_delete_meter(meter):
            return Response(
                {'error': 'Cannot delete meter with associated data. Deactivate instead.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return super().destroy(request, *args, **kwargs)


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