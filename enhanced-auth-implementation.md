# Authentication & User Isolation Implementation - Complete Guide

## Overview
This document provides a comprehensive implementation guide for user authentication, signup/login functionality, and **strict user data isolation** across the ESG Portal application, ensuring each user only sees and modifies their own data.

## Critical Implementation Requirements

### ⚠️ MOST IMPORTANT: User Data Isolation
**Every API endpoint MUST filter data by the authenticated user to prevent data leakage.**

```python
# ❌ NEVER DO THIS
Company.objects.all()  # Shows all companies from all users

# ✅ ALWAYS DO THIS
Company.objects.filter(user=request.user)  # Shows only current user's companies
```

## Authentication System

### Backend Changes

#### 1. Authentication Views (`core/auth_views.py`)
Complete implementation with proper error handling:

```python
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator

@method_decorator(csrf_exempt, name='dispatch')
class SignupView(APIView):
    permission_classes = []  # Allow unauthenticated access
    
    def post(self, request):
        username = request.data.get('username')
        email = request.data.get('email')
        password = request.data.get('password')
        
        # Validation
        if not username or not password:
            return Response({
                'error': 'Username and password are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if user exists
        if User.objects.filter(username=username).exists():
            return Response({
                'error': 'Username already exists'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if email and User.objects.filter(email=email).exists():
            return Response({
                'error': 'Email already registered'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Create user
        user = User.objects.create_user(
            username=username,
            email=email or '',
            password=password
        )
        
        # Auto-login after signup
        login(request, user)
        
        return Response({
            'message': 'User created successfully',
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email
            }
        }, status=status.HTTP_201_CREATED)

@method_decorator(csrf_exempt, name='dispatch')
class LoginView(APIView):
    permission_classes = []  # Allow unauthenticated access
    
    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        
        user = authenticate(request, username=username, password=password)
        
        if user is not None:
            login(request, user)
            return Response({
                'message': 'Login successful',
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email
                }
            })
        else:
            return Response({
                'error': 'Invalid credentials'
            }, status=status.HTTP_401_UNAUTHORIZED)

@method_decorator(csrf_exempt, name='dispatch')
class LogoutView(APIView):
    def post(self, request):
        logout(request)
        return Response({'message': 'Logged out successfully'})

@method_decorator(csrf_exempt, name='dispatch')
class UserProfileView(APIView):
    def get(self, request):
        if request.user.is_authenticated:
            return Response({
                'user': {
                    'id': request.user.id,
                    'username': request.user.username,
                    'email': request.user.email
                }
            })
        else:
            return Response({
                'error': 'Not authenticated'
            }, status=status.HTTP_401_UNAUTHORIZED)
```

#### 2. Models with User Foreign Keys (`core/models.py`)
**CRITICAL: Every model that stores user data MUST have a user foreign key:**

```python
from django.contrib.auth.models import User

class Company(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    emirate = models.CharField(max_length=100, choices=EMIRATE_CHOICES)
    sector = models.CharField(max_length=100, choices=SECTOR_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        # Ensure unique company names per user
        unique_together = ['user', 'name']
        verbose_name_plural = "Companies"
    
    def __str__(self):
        return f"{self.name} (User: {self.user.username})"

class Activity(models.Model):
    name = models.CharField(max_length=255)
    is_custom = models.BooleanField(default=False)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name_plural = "Activities"

class CompanyActivity(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    activity = models.ForeignKey(Activity, on_delete=models.CASCADE)
    
    class Meta:
        unique_together = ('user', 'company', 'activity')

class CompanyFramework(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    framework = models.ForeignKey(Framework, on_delete=models.CASCADE)
    is_auto_assigned = models.BooleanField(default=False)
    assigned_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('user', 'company', 'framework')

class CompanyProfileAnswer(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    question = models.ForeignKey(ProfilingQuestion, on_delete=models.CASCADE)
    answer = models.BooleanField()
    answered_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('user', 'company', 'question')

class Meter(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    type = models.CharField(max_length=100)
    name = models.CharField(max_length=255)
    account_number = models.CharField(max_length=255, blank=True)
    location_description = models.TextField(blank=True)
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='active')
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.company.name} - {self.type} - {self.name} (User: {self.user.username})"

class CompanyDataSubmission(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    element = models.ForeignKey(DataElement, on_delete=models.CASCADE)
    meter = models.ForeignKey(Meter, on_delete=models.CASCADE, null=True, blank=True)
    reporting_year = models.PositiveIntegerField()
    reporting_period = models.CharField(max_length=50)
    value = models.TextField(blank=True)
    evidence_file = models.FileField(upload_to='evidence/%Y/%m/%d/', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ('user', 'company', 'element', 'meter', 'reporting_year', 'reporting_period')

class CompanyChecklist(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    element = models.ForeignKey(DataElement, on_delete=models.CASCADE)
    is_required = models.BooleanField(default=True)
    cadence = models.CharField(max_length=50)
    frameworks = models.ManyToManyField(Framework, through='ChecklistFrameworkMapping')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('user', 'company', 'element')
```

#### 3. ViewSet Updates with User Filtering (`core/views.py`)
**CRITICAL: Every ViewSet MUST filter by authenticated user:**

```python
from rest_framework import viewsets, status, permissions
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import IsAuthenticated

class CompanyViewSet(viewsets.ModelViewSet):
    serializer_class = CompanySerializer
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        # CRITICAL: Always filter by authenticated user
        return Company.objects.filter(user=self.request.user)
    
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

class MeterViewSet(viewsets.ModelViewSet):
    serializer_class = MeterSerializer
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        # CRITICAL: Filter meters by user AND optionally by company
        queryset = Meter.objects.filter(user=self.request.user)
        company_id = self.request.query_params.get('company_id')
        if company_id:
            # Verify company belongs to user
            company = get_object_or_404(Company, id=company_id, user=self.request.user)
            queryset = queryset.filter(company=company)
        return queryset
    
    def perform_create(self, serializer):
        company_id = self.request.data.get('company_id')
        # CRITICAL: Verify company ownership
        company = get_object_or_404(Company, id=company_id, user=self.request.user)
        serializer.save(user=self.request.user, company=company)

class DataCollectionViewSet(viewsets.ModelViewSet):
    serializer_class = CompanyDataSubmissionSerializer
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        # CRITICAL: Filter all data by user
        queryset = CompanyDataSubmission.objects.filter(user=self.request.user)
        
        company_id = self.request.query_params.get('company_id')
        if company_id:
            # Verify company ownership
            company = get_object_or_404(Company, id=company_id, user=self.request.user)
            queryset = queryset.filter(company=company)
        
        year = self.request.query_params.get('year')
        if year:
            queryset = queryset.filter(reporting_year=year)
        
        return queryset.order_by('-updated_at')
```

#### 4. Service Layer Updates (`core/services.py`)
**CRITICAL: All service methods must accept and use user parameter:**

```python
class FrameworkService:
    @staticmethod
    def assign_mandatory_frameworks(company, user):
        """Assign mandatory frameworks based on company profile"""
        # Clear existing auto-assigned frameworks for THIS USER's company
        CompanyFramework.objects.filter(
            user=user,
            company=company, 
            is_auto_assigned=True
        ).delete()
        
        # ... framework assignment logic ...
        
        for framework in frameworks_to_assign:
            CompanyFramework.objects.get_or_create(
                user=user,
                company=company,
                framework=framework,
                defaults={'is_auto_assigned': True}
            )

class ChecklistService:
    @staticmethod
    def generate_personalized_checklist(company, user):
        """Generate checklist for specific user's company"""
        with transaction.atomic():
            # Clear existing checklist for THIS USER
            CompanyChecklist.objects.filter(user=user, company=company).delete()
            
            # Get frameworks for THIS USER's company
            company_frameworks = CompanyFramework.objects.filter(
                user=user,
                company=company
            ).values_list('framework_id', flat=True)
            
            # ... checklist generation logic ...
            
            for element in all_elements:
                checklist_item = CompanyChecklist.objects.create(
                    user=user,
                    company=company,
                    element=element,
                    is_required=True,
                    cadence=final_cadence
                )

class DashboardService:
    @staticmethod
    def get_dashboard_stats(company, user):
        """Get dashboard statistics for specific user's company"""
        # CRITICAL: All queries must filter by user
        total_frameworks = CompanyFramework.objects.filter(
            user=user, 
            company=company
        ).count()
        
        total_data_elements = CompanyChecklist.objects.filter(
            user=user,
            company=company
        ).count()
        
        total_meters = Meter.objects.filter(
            user=user,
            company=company
        ).count()
        
        # ... rest of dashboard logic with user filtering ...
```

### Frontend Changes

#### 1. Authentication Context (`src/context/AuthContext.js`)
Complete implementation with persistence:

```javascript
import React, { createContext, useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const navigate = useNavigate();

  // Check authentication status on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/auth/user/', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        // Fetch user's companies after authentication confirmed
        await fetchUserCompanies();
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserCompanies = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/companies/', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        const companiesData = data.results || data;
        setCompanies(companiesData);
        
        // Auto-select first company or restore from localStorage
        const savedCompanyId = localStorage.getItem('selectedCompanyId');
        if (savedCompanyId) {
          const savedCompany = companiesData.find(c => c.id === parseInt(savedCompanyId));
          if (savedCompany) {
            setSelectedCompany(savedCompany);
          } else if (companiesData.length > 0) {
            setSelectedCompany(companiesData[0]);
          }
        } else if (companiesData.length > 0) {
          setSelectedCompany(companiesData[0]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch companies:', error);
    }
  };

  const login = async (username, password) => {
    try {
      const response = await fetch('http://localhost:8000/api/auth/login/', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();
      
      if (response.ok) {
        setUser(data.user);
        await fetchUserCompanies();
        navigate('/dashboard');
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Login failed' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Network error' };
    }
  };

  const signup = async (username, email, password) => {
    try {
      const response = await fetch('http://localhost:8000/api/auth/signup/', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, email, password })
      });

      const data = await response.json();
      
      if (response.ok) {
        setUser(data.user);
        navigate('/onboard'); // Go to onboarding for new users
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Signup failed' };
      }
    } catch (error) {
      console.error('Signup error:', error);
      return { success: false, error: 'Network error' };
    }
  };

  const logout = async () => {
    try {
      await fetch('http://localhost:8000/api/auth/logout/', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setCompanies([]);
      setSelectedCompany(null);
      localStorage.removeItem('selectedCompanyId');
      navigate('/login');
    }
  };

  const switchCompany = (company) => {
    setSelectedCompany(company);
    localStorage.setItem('selectedCompanyId', company.id);
  };

  const value = {
    user,
    loading,
    companies,
    selectedCompany,
    login,
    signup,
    logout,
    checkAuthStatus,
    switchCompany,
    fetchUserCompanies
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
```

#### 2. Component Updates for Company Selection
**CRITICAL: All components must use selectedCompany from context:**

```javascript
// Example: Onboard.js
import { useAuth } from '../context/AuthContext';

const Onboard = () => {
  const { selectedCompany, fetchUserCompanies } = useAuth();
  const [formData, setFormData] = useState({
    companyName: '',
    emirate: '',
    primarySector: '',
    activities: []
  });

  useEffect(() => {
    if (selectedCompany) {
      // Load existing company data
      fetchCompanyData(selectedCompany.id);
    }
  }, [selectedCompany]);

  const fetchCompanyData = async (companyId) => {
    try {
      const response = await fetch(`http://localhost:8000/api/companies/${companyId}/`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        // Update form with company data
        setFormData({
          companyName: data.name,
          emirate: data.emirate,
          primarySector: data.sector,
          activities: data.activities || []
        });
      }
    } catch (error) {
      console.error('Error fetching company:', error);
    }
  };

  const saveData = async () => {
    const companyData = {
      name: formData.companyName,
      emirate: formData.emirate,
      sector: formData.primarySector
    };

    try {
      let response;
      if (selectedCompany) {
        // Update existing company
        response = await fetch(`http://localhost:8000/api/companies/${selectedCompany.id}/`, {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(companyData)
        });
      } else {
        // Create new company
        response = await fetch('http://localhost:8000/api/companies/', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(companyData)
        });
      }

      if (response.ok) {
        // Refresh companies list
        await fetchUserCompanies();
      }
    } catch (error) {
      console.error('Save error:', error);
    }
  };
};
```

## Database Migrations

### 1. Add User Foreign Keys Migration
Create migration to add user fields to existing models:

```python
# migrations/add_user_fields.py
from django.db import migrations, models
import django.db.models.deletion
from django.contrib.auth.models import User

def assign_default_user(apps, schema_editor):
    """Assign existing records to a default user"""
    User = apps.get_model('auth', 'User')
    Company = apps.get_model('core', 'Company')
    
    # Get or create default user
    default_user, created = User.objects.get_or_create(
        username='admin',
        defaults={'email': 'admin@example.com'}
    )
    
    # Assign all existing companies to default user
    Company.objects.filter(user__isnull=True).update(user=default_user)
    
    # Repeat for all other models with user field
    # ...

class Migration(migrations.Migration):
    dependencies = [
        ('core', 'previous_migration'),
    ]

    operations = [
        migrations.AddField(
            model_name='company',
            name='user',
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                to='auth.user'
            ),
        ),
        migrations.RunPython(assign_default_user),
        migrations.AlterField(
            model_name='company',
            name='user',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                to='auth.user'
            ),
        ),
    ]
```

## Testing Checklist

### 1. Authentication Flow
- [ ] User can sign up with unique username
- [ ] User can log in with correct credentials
- [ ] User session persists across page refreshes
- [ ] User can log out successfully
- [ ] Unauthenticated users redirected to login

### 2. Data Isolation
- [ ] User A cannot see User B's companies
- [ ] User A cannot access User B's data via API
- [ ] User A cannot modify User B's data
- [ ] Direct API calls with wrong company ID return 404/403
- [ ] All dashboard data is user-specific

### 3. Data Persistence
- [ ] User data persists after logout/login
- [ ] Company selection persists across sessions
- [ ] Form data saves correctly for each user
- [ ] File uploads are user-isolated

### 4. Multi-Company Support
- [ ] User can create multiple companies
- [ ] User can switch between companies
- [ ] Data is correctly associated with selected company
- [ ] Company deletion removes only that company's data

## Security Best Practices

### 1. Always Filter by User
```python
# In every view/queryset
.filter(user=request.user)
```

### 2. Verify Ownership
```python
# Before any update/delete
if obj.user != request.user:
    raise PermissionDenied
```

### 3. Use Transactions
```python
# For multi-step operations
with transaction.atomic():
    # Create/update operations
```

### 4. Sanitize User Input
```python
# Validate all user input
serializer.is_valid(raise_exception=True)
```

## Troubleshooting Guide

### Issue: User sees other users' data
**Solution**: Check that all querysets filter by `user=request.user`

### Issue: 403 Forbidden on API calls
**Solution**: Ensure `credentials: 'include'` in all fetch calls

### Issue: Data not persisting
**Solution**: Verify user field is being set on model creation

### Issue: Company not found after creation
**Solution**: Check that company is created with correct user association

## Performance Optimization

### 1. Database Indexes
```python
class Meta:
    indexes = [
        models.Index(fields=['user', 'company']),
        models.Index(fields=['user', 'created_at']),
    ]
```

### 2. Query Optimization
```python
# Use select_related for foreign keys
Company.objects.filter(user=request.user).select_related('user')

# Use prefetch_related for many-to-many
company.activities.prefetch_related('activity')
```

### 3. Caching User Companies
```javascript
// Cache companies in localStorage
localStorage.setItem('userCompanies', JSON.stringify(companies));
```

## Deployment Checklist

- [ ] Set `DEBUG = False` in production
- [ ] Configure proper CORS settings
- [ ] Use HTTPS for all API calls
- [ ] Set secure session cookies
- [ ] Implement rate limiting
- [ ] Add logging for authentication events
- [ ] Regular security audits

---

**Implementation Status**: ✅ Ready for Implementation  
**Security Level**: High - Strict User Isolation  
**Data Persistence**: Full - All user data maintained across sessions  
**Multi-tenancy**: Supported - Multiple companies per user