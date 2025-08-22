from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator


class Company(models.Model):
    """Stores core company information"""
    EMIRATE_CHOICES = [
        ('dubai', 'Dubai'),
        ('abu_dhabi', 'Abu Dhabi'),
        ('sharjah', 'Sharjah'),
        ('ajman', 'Ajman'),
        ('umm_al_quwain', 'Umm Al Quwain'),
        ('ras_al_khaimah', 'Ras Al Khaimah'),
        ('fujairah', 'Fujairah'),
    ]
    
    SECTOR_CHOICES = [
        ('hospitality', 'Hospitality'),
        ('real_estate', 'Real Estate'),
        ('financial_services', 'Financial Services'),
        ('manufacturing', 'Manufacturing'),
        ('technology', 'Technology'),
        ('healthcare', 'Healthcare'),
        ('education', 'Education'),
        ('retail', 'Retail'),
    ]
    
    name = models.CharField(max_length=255)
    emirate = models.CharField(max_length=100, choices=EMIRATE_CHOICES)
    sector = models.CharField(max_length=100, choices=SECTOR_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)
    user = models.OneToOneField(User, on_delete=models.CASCADE, null=True, blank=True)
    
    def __str__(self):
        return self.name
    
    class Meta:
        verbose_name_plural = "Companies"


class Activity(models.Model):
    """Stores all possible business activities"""
    name = models.CharField(max_length=255, unique=True)
    is_custom = models.BooleanField(default=False)  # Track custom activities added by users
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.name
    
    class Meta:
        verbose_name_plural = "Activities"


class CompanyActivity(models.Model):
    """Links companies to their selected activities (Many-to-Many)"""
    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    activity = models.ForeignKey(Activity, on_delete=models.CASCADE)
    
    class Meta:
        unique_together = ('company', 'activity')
        verbose_name_plural = "Company Activities"


class Framework(models.Model):
    """Stores all available ESG frameworks"""
    FRAMEWORK_TYPES = [
        ('mandatory', 'Mandatory'),
        ('voluntary', 'Voluntary'),
        ('mandatory_conditional', 'Mandatory Conditional'),
    ]
    
    framework_id = models.CharField(max_length=50, primary_key=True)
    name = models.CharField(max_length=100)
    type = models.CharField(max_length=50, choices=FRAMEWORK_TYPES)
    description = models.TextField(blank=True)
    
    # Conditions for mandatory_conditional frameworks
    condition_emirate = models.CharField(max_length=100, blank=True)
    condition_sector = models.CharField(max_length=100, blank=True)
    
    def __str__(self):
        return self.name


class CompanyFramework(models.Model):
    """Stores the frameworks a company has adopted"""
    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    framework = models.ForeignKey(Framework, on_delete=models.CASCADE)
    is_auto_assigned = models.BooleanField(default=False)
    assigned_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('company', 'framework')


class DataElement(models.Model):
    """Master list of all possible data elements"""
    ELEMENT_TYPES = [
        ('must_have', 'Must Have'),
        ('conditional', 'Conditional'),
    ]
    
    element_id = models.CharField(max_length=50, primary_key=True)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    is_metered = models.BooleanField(default=False)
    type = models.CharField(max_length=50, choices=ELEMENT_TYPES)
    unit = models.CharField(max_length=50, blank=True)
    
    def __str__(self):
        return self.name


class DataElementFrameworkMapping(models.Model):
    """Maps data elements to the frameworks that require them"""
    CADENCE_CHOICES = [
        ('monthly', 'Monthly'),
        ('quarterly', 'Quarterly'),
        ('annually', 'Annually'),
    ]
    
    element = models.ForeignKey(DataElement, on_delete=models.CASCADE)
    framework = models.ForeignKey(Framework, on_delete=models.CASCADE)
    cadence = models.CharField(max_length=50, choices=CADENCE_CHOICES)
    
    class Meta:
        unique_together = ('element', 'framework')


class ProfilingQuestion(models.Model):
    """Stores all profiling wizard questions"""
    question_id = models.CharField(max_length=50, primary_key=True)
    text = models.TextField()
    activates_element = models.ForeignKey(
        DataElement, 
        on_delete=models.CASCADE,
        help_text="The conditional data element this question activates"
    )
    order = models.PositiveIntegerField(default=0)  # For ordering questions
    
    def __str__(self):
        return self.text[:100]
    
    class Meta:
        ordering = ['order']


class CompanyProfileAnswer(models.Model):
    """Stores a company's answers to the profiling questions"""
    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    question = models.ForeignKey(ProfilingQuestion, on_delete=models.CASCADE)
    answer = models.BooleanField()
    answered_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('company', 'question')


class Meter(models.Model):
    """Stores company-specific meters"""
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
    ]
    
    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    type = models.CharField(max_length=100)  # e.g., 'Electricity', 'Water'
    name = models.CharField(max_length=255)  # e.g., 'Main', 'Kitchen Meter'
    account_number = models.CharField(max_length=255, blank=True)
    location_description = models.TextField(blank=True)
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='active')
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.company.name} - {self.type} - {self.name}"
    
    def has_data(self):
        """Check if meter has any data submissions"""
        return self.companydatasubmission_set.exists()


class CompanyDataSubmission(models.Model):
    """Stores the actual data values and evidence submitted by the company"""
    STATUS_CHOICES = [
        ('missing', 'Missing'),
        ('partial', 'Partial'),
        ('complete', 'Complete'),
    ]
    
    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    element = models.ForeignKey(DataElement, on_delete=models.CASCADE)
    meter = models.ForeignKey(Meter, on_delete=models.CASCADE, null=True, blank=True)
    reporting_year = models.PositiveIntegerField()
    reporting_period = models.CharField(max_length=50)  # e.g., 'Jan', 'Q1', '2025'
    value = models.TextField(blank=True)
    evidence_file = models.FileField(upload_to='evidence/', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ('company', 'element', 'meter', 'reporting_year', 'reporting_period')
    
    @property
    def status(self):
        """Calculate status based on data and evidence availability"""
        has_value = bool(self.value)
        has_evidence = bool(self.evidence_file)
        
        if has_value and has_evidence:
            return 'complete'
        elif has_value or has_evidence:
            return 'partial'
        else:
            return 'missing'
    
    def __str__(self):
        return f"{self.company.name} - {self.element.name} - {self.reporting_period}/{self.reporting_year}"


class CompanyChecklist(models.Model):
    """Stores the personalized checklist for each company"""
    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    element = models.ForeignKey(DataElement, on_delete=models.CASCADE)
    is_required = models.BooleanField(default=True)
    cadence = models.CharField(max_length=50)  # Final consolidated cadence
    frameworks = models.ManyToManyField(Framework, through='ChecklistFrameworkMapping')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('company', 'element')
    
    def __str__(self):
        return f"{self.company.name} - {self.element.name}"


class ChecklistFrameworkMapping(models.Model):
    """Maps checklist items to frameworks they satisfy"""
    checklist_item = models.ForeignKey(CompanyChecklist, on_delete=models.CASCADE)
    framework = models.ForeignKey(Framework, on_delete=models.CASCADE)
    
    class Meta:
        unique_together = ('checklist_item', 'framework')