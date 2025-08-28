# Authentication & CSRF Fixes Documentation

## Overview

This document describes the comprehensive fixes applied to resolve CSRF (Cross-Site Request Forgery) errors and improve the authentication flow for the ESG Portal application. These changes ensure secure authentication across different deployment environments while streamlining the user experience.

## CSRF Error Fixes

### Problem Analysis

The application was experiencing CSRF token validation failures that prevented:
- Company creation during onboarding
- User authentication in production environments
- API requests in ngrok and Render deployments

### Root Causes Identified

1. **Conflicting CSRF Decorators**: Some ViewSets had `@csrf_exempt` decorators that bypassed CSRF protection
2. **Production Environment Issues**: CSRF cookies weren't being set properly in HTTPS contexts
3. **Dynamic Environment Support**: Hardcoded URLs prevented proper operation across different environments

### Solutions Implemented

#### 1. Backend CSRF Configuration (`backend/esg_backend/settings.py`)

```python
# Dynamic CSRF configuration based on environment
if not DEBUG:
    CSRF_COOKIE_SECURE = True      # Require HTTPS for CSRF cookies in production
    CSRF_COOKIE_HTTPONLY = False   # Allow JavaScript access to CSRF token
    CSRF_COOKIE_SAMESITE = 'Lax'   # Balance security and functionality
    SESSION_COOKIE_SECURE = True   # Require HTTPS for session cookies

# Dynamic ALLOWED_HOSTS and CORS settings
ALLOWED_HOSTS = ['localhost', '127.0.0.1', '.onrender.com', '.ngrok-free.app', '.ngrok.io']
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

# Add dynamic origins for deployment environments
if any(host in os.environ.get('RENDER_EXTERNAL_URL', '') for host in ['.onrender.com']):
    CORS_ALLOWED_ORIGINS.append(os.environ.get('RENDER_EXTERNAL_URL'))

CORS_ALLOW_CREDENTIALS = True
CSRF_TRUSTED_ORIGINS = CORS_ALLOWED_ORIGINS + [
    'https://*.ngrok-free.app',
    'https://*.ngrok.io',
    'https://*.onrender.com'
]
```

#### 2. Removed Conflicting CSRF Exemptions

**Before:**
```python
@method_decorator(csrf_exempt, name='dispatch')
class CompanyViewSet(viewsets.ModelViewSet):
    # This was bypassing CSRF protection
```

**After:**
```python
class CompanyViewSet(viewsets.ModelViewSet):
    # Now properly handles CSRF tokens
    authentication_classes = [SessionAuthentication]
    permission_classes = [IsAuthenticated]
```

#### 3. Dynamic API URL Configuration (`frontend/src/config.js`)

```javascript
export const getApiBaseUrl = () => {
  // Dynamic URL detection for different environments
  if (window.location.hostname.includes('.onrender.com') ||
      window.location.hostname.includes('.ngrok-free.app')) {
    return window.location.origin;
  }
  
  if (window.location.hostname === 'localhost') {
    return window.location.protocol === 'https:' 
      ? 'https://localhost:8000' 
      : 'http://localhost:8000';
  }
  
  return 'http://localhost:8000';
};
```

#### 4. Enhanced CSRF Token Handling (`frontend/src/context/AuthContext.js`)

```javascript
const getCsrfToken = async () => {
  // Multi-layer CSRF token retrieval
  const cookieValue = document.cookie
    .split('; ')
    .find(row => row.startsWith('csrftoken='))
    ?.split('=')[1];
    
  if (cookieValue) return cookieValue;
  
  // Fetch from Django CSRF endpoint if no cookie
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/csrf/`, {
      method: 'GET',
      credentials: 'include',
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.csrfToken;
    }
  } catch (error) {
    console.log('Could not fetch CSRF token:', error);
  }
  
  return null;
};
```

## Sign-In & Sign-Up Changes

### Authentication Flow Improvements

#### 1. Unified Company Creation During Signup

**Previous Flow:**
1. User signs up → Creates user only
2. User goes to onboarding → Creates company
3. Manual linking required between user and company

**New Flow:**
1. User signs up → Creates user + company + profile (all linked)
2. User goes to onboarding → Updates existing company
3. Immediate access to all features

#### 2. Enhanced Signup Form (`frontend/src/components/Signup.js`)

**Changes Made:**
- **Email field**: Changed from optional to required
- **Company Name field**: Added as required field
- **Removed asterisks (*)**: Cleaner UI design
- **Enhanced validation**: Client-side and server-side validation

**Form Structure:**
```javascript
const [formData, setFormData] = useState({
  username: '',
  email: '',           // Now required
  companyName: '',     // New required field
  password: '',
  confirmPassword: ''
});
```

**Validation:**
```javascript
const validateForm = () => {
  if (!formData.email || !formData.email.trim()) {
    setError('Email address is required');
    return false;
  }
  if (!formData.companyName || !formData.companyName.trim()) {
    setError('Company name is required');
    return false;
  }
  // ... additional validation
};
```

#### 3. Backend Signup Enhancement (`backend/core/auth_views.py`)

**Automatic Company Creation:**
```python
def post(self, request):
    username = request.data.get('username', '').strip()
    email = request.data.get('email', '').strip()
    company_name = request.data.get('companyName', '').strip()
    password = request.data.get('password', '')
    
    # Enhanced validation
    if not email:
        return Response({'error': 'Email address is required'}, 
                       status=status.HTTP_400_BAD_REQUEST)
    
    if not company_name:
        return Response({'error': 'Company name is required'}, 
                       status=status.HTTP_400_BAD_REQUEST)
    
    # Create user, company, and profile in one transaction
    user = User.objects.create_user(
        username=username, email=email, password=password,
        is_staff=True, is_superuser=True
    )
    
    company_code = f"USR{user.id:03d}"
    company = Company.objects.create(
        user=user, name=company_name, company_code=company_code,
        emirate='dubai', sector='hospitality'
    )
    
    UserProfile.objects.create(
        user=user, role='super_user', company=company
    )
    
    # Auto-assign mandatory frameworks
    FrameworkService.assign_mandatory_frameworks(company, user)
```

#### 4. User Management Enhancements

**Added Company Information Display:**
- **Company Code**: Shows unique identifier (e.g., USR001)
- **Company ID**: Shows database ID for reference
- **Enhanced API Response**: Includes complete company information

**User API Response:**
```python
user_data.append({
    'id': user.id,
    'username': user.username,
    'email': user.email,
    'name': f"{user.first_name} {user.last_name}".strip() or user.username,
    'role': role,
    'company': {                    # New company information
        'id': profile.company.id,
        'name': profile.company.name,
        'company_code': profile.company.company_code
    } if profile.company else None,
    'is_active': user.is_active,
    'last_login': user.last_login.isoformat() if user.last_login else None,
    'sites': []
})
```

### User Visibility Logic

**Previous Logic:**
- Users without companies couldn't see anyone
- Super users saw other super users without companies

**New Logic:**
- Each user is automatically assigned to their own company
- Users only see members of their own company
- Clean separation between different organizations

## State Management Fixes

### AuthContext Improvements

**Fixed Signup State Management:**
```javascript
if (response.ok) {
  setUser(data.user);
  // Set the company that was created during signup
  if (data.user.company) {
    setSelectedCompany(data.user.company);
    setCompanies([data.user.company]);
  }
  console.log('✅ Signup successful:', data.user);
  navigate('/onboard');
  return { success: true };
}
```

**Benefits:**
- Immediate access to onboarding after signup
- No permission denied errors
- Role information displays immediately
- Company selection works without page refresh

## Deployment Environment Support

### Multi-Environment Configuration

The application now supports:

1. **Local Development**: `http://localhost:8000`
2. **Render Deployment**: `https://your-app.onrender.com`
3. **Ngrok Tunneling**: `https://abc123.ngrok-free.app`

### Dynamic URL Resolution

```javascript
const getApiBaseUrl = () => {
  if (window.location.hostname.includes('.onrender.com') ||
      window.location.hostname.includes('.ngrok-free.app')) {
    return window.location.origin;
  }
  return window.location.protocol === 'https:' 
    ? 'https://localhost:8000' 
    : 'http://localhost:8000';
};
```

## Security Improvements

### CSRF Protection

1. **Proper Token Handling**: Automatic CSRF token retrieval and inclusion
2. **Secure Cookie Settings**: HTTPS-only cookies in production
3. **Environment-Specific Configuration**: Different settings for dev/prod

### Authentication Security

1. **Session-Based Authentication**: Secure session management
2. **Proper CORS Configuration**: Controlled cross-origin access
3. **Input Validation**: Both client-side and server-side validation

## Testing Recommendations

### Local Testing
```bash
# Start backend
python manage.py runserver

# Start frontend
npm start

# Test signup flow
1. Navigate to /signup
2. Fill all required fields (username, email, company name, password)
3. Submit form
4. Should redirect to onboarding with company data loaded
```

### Production Testing
```bash
# Deploy to Render
1. Push to repository
2. Render auto-deploys
3. Test CSRF protection with company creation
4. Verify HTTPS cookie settings
```

### Ngrok Testing
```bash
# Start ngrok tunnel
ngrok http 8000

# Update CORS settings for ngrok URL
# Test authentication flow
```

## Summary of Benefits

### For Users
- **Smoother Signup Flow**: All required information collected upfront
- **Immediate Access**: No permission errors after signup
- **Better UX**: Clear form fields without asterisks
- **Company Management**: Automatic company creation and management

### For Developers
- **CSRF Security**: Proper protection without blocking legitimate requests
- **Environment Flexibility**: Works across local, staging, and production
- **Cleaner Code**: Removed conflicting decorators and hardcoded values
- **Better Debugging**: Enhanced logging and error handling

### For Deployment
- **Production Ready**: Proper HTTPS and security settings
- **Scalable**: Dynamic configuration for different environments
- **Secure**: CSRF protection, secure cookies, and proper CORS

## Future Considerations

1. **Email Validation**: Consider email verification for new accounts
2. **Company Codes**: Implement custom company code generation logic
3. **Multi-Tenant Support**: Enhanced separation between companies
4. **Audit Logging**: Track company creation and user management activities

---

*Document created: 2025-01-27*  
*Last updated: 2025-01-27*