from rest_framework import serializers
from .models import (
    Company, Activity, CompanyActivity, Framework, CompanyFramework,
    DataElement, DataElementFrameworkMapping, ProfilingQuestion,
    CompanyProfileAnswer, Meter, CompanyDataSubmission, CompanyChecklist
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
    
    class Meta:
        model = Meter
        fields = ['id', 'type', 'name', 'account_number', 'location_description', 'status', 'has_data', 'created_at']


class CompanyDataSubmissionSerializer(serializers.ModelSerializer):
    element_name = serializers.CharField(source='element.name', read_only=True)
    meter_name = serializers.CharField(source='meter.name', read_only=True, allow_null=True)
    status = serializers.CharField(read_only=True)
    
    class Meta:
        model = CompanyDataSubmission
        fields = [
            'id', 'element', 'element_name', 'meter', 'meter_name', 
            'reporting_year', 'reporting_period', 'value', 'evidence_file',
            'status', 'created_at', 'updated_at'
        ]


class CompanyChecklistSerializer(serializers.ModelSerializer):
    element_name = serializers.CharField(source='element.name', read_only=True)
    element_description = serializers.CharField(source='element.description', read_only=True)
    element_unit = serializers.CharField(source='element.unit', read_only=True)
    is_metered = serializers.BooleanField(source='element.is_metered', read_only=True)
    frameworks_list = serializers.SerializerMethodField()
    
    class Meta:
        model = CompanyChecklist
        fields = [
            'id', 'element', 'element_name', 'element_description', 'element_unit',
            'is_metered', 'is_required', 'cadence', 'frameworks_list', 'created_at'
        ]
    
    def get_frameworks_list(self, obj):
        return [framework.name for framework in obj.frameworks.all()]


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