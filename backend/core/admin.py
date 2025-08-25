from django.contrib import admin
from .models import (
    Company, Activity, CompanyActivity, Framework, CompanyFramework,
    DataElement, DataElementFrameworkMapping, ProfilingQuestion,
    CompanyProfileAnswer, Meter, CompanyDataSubmission, CompanyChecklist,
    ChecklistFrameworkMapping
)


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ['name', 'emirate', 'sector', 'created_at']
    list_filter = ['emirate', 'sector', 'created_at']
    search_fields = ['name']


@admin.register(Activity)
class ActivityAdmin(admin.ModelAdmin):
    list_display = ['name', 'is_custom', 'created_at']
    list_filter = ['is_custom', 'created_at']
    search_fields = ['name']


@admin.register(CompanyActivity)
class CompanyActivityAdmin(admin.ModelAdmin):
    list_display = ['company', 'activity']
    list_filter = ['activity']
    search_fields = ['company__name', 'activity__name']


@admin.register(Framework)
class FrameworkAdmin(admin.ModelAdmin):
    list_display = ['framework_id', 'name', 'type']
    list_filter = ['type']
    search_fields = ['name', 'framework_id']


@admin.register(CompanyFramework)
class CompanyFrameworkAdmin(admin.ModelAdmin):
    list_display = ['company', 'framework', 'is_auto_assigned', 'assigned_at']
    list_filter = ['framework', 'is_auto_assigned', 'assigned_at']
    search_fields = ['company__name', 'framework__name']


@admin.register(DataElement)
class DataElementAdmin(admin.ModelAdmin):
    list_display = ['element_id', 'name', 'type', 'is_metered', 'unit']
    list_filter = ['type', 'is_metered']
    search_fields = ['name', 'element_id']


@admin.register(DataElementFrameworkMapping)
class DataElementFrameworkMappingAdmin(admin.ModelAdmin):
    list_display = ['element', 'framework', 'cadence']
    list_filter = ['framework', 'cadence']
    search_fields = ['element__name', 'framework__name']


@admin.register(ProfilingQuestion)
class ProfilingQuestionAdmin(admin.ModelAdmin):
    list_display = ['question_id', 'text', 'activates_element', 'order']
    list_filter = ['activates_element']
    search_fields = ['text', 'question_id']
    ordering = ['order']


@admin.register(CompanyProfileAnswer)
class CompanyProfileAnswerAdmin(admin.ModelAdmin):
    list_display = ['company', 'question', 'answer', 'answered_at']
    list_filter = ['answer', 'answered_at', 'question']
    search_fields = ['company__name', 'question__text']


@admin.register(Meter)
class MeterAdmin(admin.ModelAdmin):
    list_display = ['company', 'type', 'name', 'status', 'created_at']
    list_filter = ['type', 'status', 'created_at']
    search_fields = ['company__name', 'type', 'name', 'account_number']


@admin.register(CompanyDataSubmission)
class CompanyDataSubmissionAdmin(admin.ModelAdmin):
    list_display = ['company', 'element', 'meter', 'reporting_year', 'reporting_period', 'status', 'updated_at']
    list_filter = ['reporting_year', 'reporting_period', 'element', 'updated_at']
    search_fields = ['company__name', 'element__name']
    
    def status(self, obj):
        return obj.status
    status.short_description = 'Status'


@admin.register(CompanyChecklist)
class CompanyChecklistAdmin(admin.ModelAdmin):
    list_display = ['company', 'element', 'is_required', 'cadence', 'created_at']
    list_filter = ['is_required', 'cadence', 'created_at']
    search_fields = ['company__name', 'element__name']
    filter_horizontal = ['frameworks']


@admin.register(ChecklistFrameworkMapping)
class ChecklistFrameworkMappingAdmin(admin.ModelAdmin):
    list_display = ['checklist_item', 'framework']
    list_filter = ['framework']
    search_fields = ['checklist_item__company__name', 'framework__name']