from rest_framework import serializers
from .models import (
    Company, Site, Activity, CompanyActivity, Framework, CompanyFramework,
    DataElement, FrameworkElement, DataElementFrameworkMapping, ProfilingQuestion,
    CompanyProfileAnswer, Meter, CompanyDataSubmission, CompanyChecklist,
    ElementAssignment
)


class ActivitySerializer(serializers.ModelSerializer):
    class Meta:
        model = Activity
        fields = ['id', 'name', 'is_custom']


class FrameworkSerializer(serializers.ModelSerializer):
    class Meta:
        model = Framework
        fields = ['framework_id', 'name', 'type', 'description']


class DataElementSerializer(serializers.ModelSerializer):
    frameworks = serializers.SerializerMethodField()
    
    class Meta:
        model = DataElement
        fields = ['element_id', 'name', 'description', 'is_metered', 'type', 'unit', 'frameworks']
    
    def get_frameworks(self, obj):
        mappings = DataElementFrameworkMapping.objects.filter(element=obj)
        return [{'framework': mapping.framework.name, 'cadence': mapping.cadence} for mapping in mappings]


class FrameworkElementSerializer(serializers.ModelSerializer):
    """Serializer for framework-based elements with rich specifications"""

    class Meta:
        model = FrameworkElement
        fields = [
            'element_id', 'framework_id', 'official_code', 'name_plain', 'description',
            'category', 'type', 'unit', 'cadence', 'metered', 'meter_type', 'meter_scope',
            'condition_logic', 'wizard_question', 'prompt', 'calculation', 'aggregation',
            'evidence_requirements', 'providers_by_emirate', 'data_source_systems',
            'quality_checks', 'tags', 'notes', 'sources', 'carbon_specifications'
        ]


class CompanySerializer(serializers.ModelSerializer):
    activities = ActivitySerializer(many=True, read_only=True, source='companyactivity_set.activity')
    frameworks = FrameworkSerializer(many=True, read_only=True, source='companyframework_set.framework')
    
    class Meta:
        model = Company
        fields = ['id', 'name', 'emirate', 'sector', 'created_at', 'activities', 'frameworks']


class CompanyCreateSerializer(serializers.ModelSerializer):
    activities = serializers.ListField(
        child=serializers.CharField(),
        write_only=True,
        required=False
    )
    
    class Meta:
        model = Company
        fields = ['name', 'emirate', 'sector', 'activities']
    
    def create(self, validated_data):
        activities_data = validated_data.pop('activities', [])
        company = Company.objects.create(**validated_data)
        
        # Handle activities
        for activity_name in activities_data:
            activity, created = Activity.objects.get_or_create(
                name=activity_name,
                defaults={'is_custom': True}
            )
            CompanyActivity.objects.create(company=company, activity=activity)
        
        return company


class SiteSerializer(serializers.ModelSerializer):
    meter_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Site
        fields = ['id', 'name', 'location', 'address', 'is_active', 'meter_count', 'created_at', 'updated_at']
    
    def get_meter_count(self, obj):
        return obj.meters.count()


class ProfilingQuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProfilingQuestion
        fields = ['question_id', 'text', 'activates_element', 'order']


class CompanyProfileAnswerSerializer(serializers.ModelSerializer):
    question_text = serializers.CharField(source='question.text', read_only=True)
    
    class Meta:
        model = CompanyProfileAnswer
        fields = ['question', 'question_text', 'answer', 'answered_at']


class MeterSerializer(serializers.ModelSerializer):
    has_data = serializers.BooleanField(read_only=True)
    site_name = serializers.CharField(source='site.name', read_only=True, allow_null=True)
    
    class Meta:
        model = Meter
        fields = ['id', 'type', 'name', 'account_number', 'location_description', 'status', 'has_data', 'created_at', 'site_name']


class CompanyDataSubmissionSerializer(serializers.ModelSerializer):
    element_name = serializers.CharField(read_only=True)
    meter_name = serializers.CharField(source='meter.name', read_only=True, allow_null=True)
    status = serializers.CharField(read_only=True)
    assigned_to = serializers.SerializerMethodField()
    assigned_by_name = serializers.CharField(source='assigned_by.username', read_only=True, allow_null=True)
    
    def get_assigned_to(self, obj):
        """Return assigned user details"""
        if obj.assigned_to:
            return {
                'id': obj.assigned_to.id,
                'username': obj.assigned_to.username,
                'first_name': obj.assigned_to.first_name,
                'last_name': obj.assigned_to.last_name,
                'email': obj.assigned_to.email
            }
        return None
    
    class Meta:
        model = CompanyDataSubmission
        fields = [
            'id', 'element_name', 'meter', 'meter_name',
            'reporting_year', 'reporting_period', 'value', 'evidence_file',
            'status', 'assigned_to', 'assigned_by_name', 'assigned_at',
            'created_at', 'updated_at'
        ]


class CompanyChecklistSerializer(serializers.ModelSerializer):
    element_name = serializers.CharField(source='element.name_plain', read_only=True)
    element_description = serializers.CharField(source='element.description', read_only=True)
    element_unit = serializers.CharField(source='element.unit', read_only=True)
    is_metered = serializers.BooleanField(source='element.metered', read_only=True)
    category = serializers.CharField(source='element.category', read_only=True)
    frameworks_list = serializers.SerializerMethodField()
    site_info = serializers.SerializerMethodField()
    
    class Meta:
        model = CompanyChecklist
        fields = [
            'id', 'element', 'element_name', 'element_description', 'element_unit',
            'is_metered', 'is_required', 'cadence', 'frameworks_list', 'created_at', 'category', 'site_info'
        ]
    
    def get_frameworks_list(self, obj):
        return [obj.framework_id] if obj.framework_id else []
    
    def get_site_info(self, obj):
        """Return site information for this checklist item"""
        if obj.site:
            return {
                'id': obj.site.id,
                'name': obj.site.name,
                'location': obj.site.location
            }
        return None


class ProgressSerializer(serializers.Serializer):
    """Serializer for progress data with inactive period support"""
    data_progress = serializers.FloatField()
    evidence_progress = serializers.FloatField()
    overall_progress = serializers.FloatField()
    total_points = serializers.IntegerField()
    completed_points = serializers.IntegerField()
    items_remaining = serializers.IntegerField()
    total_submissions = serializers.IntegerField()
    data_complete = serializers.IntegerField()
    evidence_complete = serializers.IntegerField()
    inactive_period_points = serializers.IntegerField(required=False)
    inactive_period_submissions = serializers.IntegerField(required=False)


class DashboardStatsSerializer(serializers.Serializer):
    """Serializer for dashboard statistics"""
    total_frameworks = serializers.IntegerField()
    total_data_elements = serializers.IntegerField()
    total_meters = serializers.IntegerField()
    active_meters = serializers.IntegerField()
    data_completeness_percentage = serializers.FloatField()
    evidence_completeness_percentage = serializers.FloatField()
    
    # Monthly progress data for charts
    monthly_data = serializers.ListField(
        child=serializers.DictField(),
        allow_empty=True
    )


class ElementAssignmentSerializer(serializers.ModelSerializer):
    """Serializer for ElementAssignment model"""
    element_name = serializers.CharField(source='checklist_item.element_name', read_only=True)
    element_description = serializers.CharField(source='checklist_item.element_description', read_only=True)
    element_unit = serializers.CharField(source='checklist_item.element_unit', read_only=True)
    assigned_to_username = serializers.CharField(source='assigned_to.username', read_only=True)
    assigned_to_email = serializers.CharField(source='assigned_to.email', read_only=True)
    assigned_by_username = serializers.CharField(source='assigned_by.username', read_only=True)
    company_name = serializers.CharField(source='company.name', read_only=True)
    is_overdue = serializers.SerializerMethodField()
    
    class Meta:
        model = ElementAssignment
        fields = [
            'id', 'checklist_item', 'element_name', 'element_description', 'element_unit',
            'assigned_to', 'assigned_to_username', 'assigned_to_email',
            'assigned_by', 'assigned_by_username',
            'company', 'company_name',
            'status', 'priority', 'notes', 'due_date',
            'assigned_at', 'updated_at', 'completed_at',
            'is_overdue'
        ]
        read_only_fields = ['id', 'assigned_at', 'updated_at']
    
    def get_is_overdue(self, obj):
        return obj.is_overdue()