# ESG Platform: Local vs Server Deployment Analysis

## Overview

This document provides a comprehensive analysis of how the ESG Platform handles file uploads and operates differently between local development and server deployment environments.

## 🏠 Local Development (Localhost)

### Development Server Setup
```bash
# Frontend (React dev server)
cd frontend-react
npm run dev        # Runs on http://localhost:5173 (Vite)

# Backend (Django dev server) 
cd backend
python manage.py runserver  # Runs on http://localhost:8000
```

### Local Configuration
- **DEBUG = True** - Full error pages, auto-reload enabled
- **Static files served from** `frontend-react/dist/`
- **API calls go to** `http://localhost:8000/api`
- **File uploads stored in** `backend/media/task_attachments/`
- **Two separate servers** running simultaneously

### Local File Structure
```
project/
├── frontend-react/
│   ├── src/
│   └── dist/              # Vite build output
└── backend/
    ├── media/
    │   └── task_attachments/  # Upload directory
    ├── esg_platform/
    └── manage.py
```

---

## 🌐 Server Deployment (Render)

### Production Server Setup
```yaml
# render.yaml
services:
  - type: web
    name: esg-compass-v2
    env: python
    buildCommand: "./backend/build.sh"
    startCommand: "cd backend && gunicorn esg_platform.wsgi:application"
```

### Server Build Process
The build script (`build_script.sh`) performs these steps:

```bash
#!/usr/bin/env bash
set -o errexit

# 1. Install Python dependencies
pip install -r requirements.txt

# 2. Build React frontend
cd ../frontend-react
npm install
npm run build

# 3. Copy built files to Django staticfiles
cd ../backend
rm -rf staticfiles
mkdir -p staticfiles
cp -r ../frontend-react/dist/* staticfiles/

# 4. Collect all static files (including admin)
python manage.py collectstatic --noinput

# 5. Run database migrations
python manage.py migrate
```

### Server File Structure
```
/opt/render/project/src/
├── backend/
│   ├── staticfiles/        # Built React app + Django static files
│   │   ├── index.html      # React app entry point
│   │   ├── assets/
│   │   │   ├── index-q35brSoC.js   # Bundled React app
│   │   │   └── index-CeN7EyYB.css  # Bundled styles
│   │   ├── admin/          # Django admin files
│   │   └── rest_framework/ # DRF files
│   ├── media/             # User uploaded files
│   │   └── task_attachments/
│   └── esg_platform/      # Django project
└── frontend-react/
    └── dist/              # Build artifacts (copied to staticfiles)
```

---

## 📁 File Serving Differences

### Local Development
```python
# settings.py (DEBUG=True)
STATICFILES_DIRS = [
    os.path.join(BASE_DIR, '..', 'frontend-react', 'dist'),
]
```

### Production Server
```python  
# settings.py (DEBUG=False)
STATICFILES_DIRS = []  # Empty - files already in STATIC_ROOT

# WhiteNoise serves static files
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'
WHITENOISE_USE_FINDERS = True
WHITENOISE_AUTOREFRESH = False  # Only in development
```

---

## 🔗 API URL Resolution

### Smart URL Detection
The app automatically detects its environment and adjusts API URLs accordingly:

```javascript
// api-config.js
export const getApiBaseURL = () => {
  // Server detection
  if (window.location.hostname.includes('onrender.com')) {
    return `https://${window.location.hostname}/api`;  // https://esg-compass-v2.onrender.com/api
  }
  if (window.location.hostname.includes('ngrok-free.app')) {
    return `https://${window.location.hostname}/api`;   // Your ngrok tunnel
  }
  // Local fallback
  return 'http://localhost:8000/api';                   // Local Django server
};
```

---

## 📤 Upload Handling Architecture

### Frontend Upload Logic
Located in `TaskDetail.jsx` (lines 455-559):

```javascript
// Drag & Drop + File Selection
const validateAndSetFile = async (file, documentKey = null, monthKey = null) => {
  const maxBytes = 10 * 1024 * 1024; // 10MB limit
  
  if (file.size > maxBytes) {
    toast.error(`File size exceeds 10MB limit`);
    return;
  }
  
  // Auto-upload immediately
  const uploadedAttachment = await esgAPI.uploadTaskAttachment(task.id, {
    file: file,
    title: fileTitle,
    description: `Uploaded file: ${file.name}`,
    attachment_type: 'evidence'
  });
};
```

### Backend API Endpoint
Located in `views.py` (lines 191-221):

```python
@action(detail=True, methods=['post'])
def upload_attachment(self, request, pk=None):
    task = self.get_object()  # Validates task ownership
    
    if 'file' not in request.FILES:
        return Response({'error': 'No file provided'}, status=400)
    
    file = request.FILES['file']
    
    attachment = TaskAttachment.objects.create(
        task=task,
        file=file,  # Django handles the actual storage
        original_filename=file.name,
        file_size=file.size,
        mime_type=file.content_type,
        title=request.data.get('title', ''),
        description=request.data.get('description', ''),
        attachment_type=request.data.get('attachment_type', 'evidence'),
        uploaded_by=request.user
    )
```

### File Storage Configuration
```python
# settings.py
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# models.py
class TaskAttachment(models.Model):
    file = models.FileField(upload_to='task_attachments/')
```

### Upload Differences

| Aspect | Local Development | Production Server |
|--------|------------------|-------------------|
| **Storage Location** | `backend/media/task_attachments/` | `/opt/render/project/src/backend/media/task_attachments/` |
| **File URLs** | `http://localhost:8000/media/` | `https://esg-compass-v2.onrender.com/media/` |
| **Processing** | No compression/optimization | Automatic compression and caching headers |
| **Security** | Basic validation | Production security headers |

---

## 🚀 Server Runtime Architecture

### Production Process Flow
1. **Gunicorn WSGI Server** serves Django application
2. **WhiteNoise Middleware** handles static file serving
3. **Single Process** serves both frontend and API
4. **Compressed Assets** for faster loading

### Frontend App Serving
The server serves the React app through Django's `FrontendAppView`:

```python
# esg_platform/views.py
class FrontendAppView(View):
    def get(self, request, *args, **kwargs):
        # Serve the built index.html file
        index_path = os.path.join(settings.BASE_DIR, 'staticfiles', 'index.html')
        
        if os.path.exists(index_path):
            with open(index_path, 'r') as file:
                return HttpResponse(file.read(), content_type='text/html')
        else:
            raise Http404("Frontend build not found.")
```

---

## ⚙️ Configuration Differences

| Feature | Local (DEBUG=True) | Server (DEBUG=False) |
|---------|-------------------|---------------------|
| **Static Files** | Served from `frontend-react/dist/` | Served from `backend/staticfiles/` |
| **File Serving** | Django dev server | WhiteNoise middleware |
| **Error Pages** | Full debug information | User-friendly error pages |
| **CORS** | All origins allowed | Specific origins only |
| **Security** | Relaxed for development | Production hardening |
| **Static Compression** | None | Gzip + Brotli compression |
| **Cache Headers** | None | Long-term caching |
| **Asset Bundling** | Individual files | Single bundled files |

---

## 🔒 Security Configuration

### Local Development
```python
# Relaxed security for development
DEBUG = True
CORS_ALLOW_ALL_ORIGINS = True
ALLOWED_HOSTS = ['*']

# CSRF settings
CSRF_TRUSTED_ORIGINS = [
    'http://localhost:8080',
    'http://localhost:8000',
    'http://127.0.0.1:8080',
    'http://127.0.0.1:8000',
]
```

### Production Server
```python
# Strict security for production
DEBUG = False
CORS_ALLOW_ALL_ORIGINS = False

# Specific allowed hosts
ALLOWED_HOSTS = [
    'esg-compass-v2.onrender.com',
    '.onrender.com',
    '.ngrok-free.app'
]

# CSRF protection
CSRF_TRUSTED_ORIGINS = [
    'https://esg-compass-v2.onrender.com',
    'https://*.onrender.com',
    'https://*.ngrok-free.app',
]
```

### Authentication & Authorization
Both environments use the same security model:

```python
# Multi-layer security
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
}

# File upload security
# 1. JWT Authentication required for all uploads
# 2. Task ownership validation (users can only upload to their company's tasks)
# 3. CSRF protection for state-changing requests
# 4. Company-level isolation
```

---

## 📊 Performance Optimizations

### Server-Side Optimizations
1. **Asset Compression** - All CSS/JS files are gzipped
2. **Static File Caching** - Long-term browser caching headers
3. **Bundled Assets** - Single JS/CSS files instead of multiple
4. **CDN-Ready** - Static files optimized for CDN delivery
5. **Database Connection Pooling** - Efficient database connections

### Upload Performance
```javascript
// Frontend optimizations
- Progress tracking and real-time feedback
- Auto-save functionality
- Optimistic UI updates
- Query invalidation for cache refresh

// Backend optimizations
- Efficient database queries with select_related/prefetch_related
- Proper indexing on task-attachment relationships
- Minimal file processing overhead
```

---

## 🔧 Environment Variables

### Local Development
```bash
DEBUG=True
SECRET_KEY=django-insecure-local-key
ALLOWED_HOSTS=localhost,127.0.0.1
```

### Production Server
```bash
DEBUG=False
SECRET_KEY=[Generated by Render]
RENDER_EXTERNAL_HOSTNAME=esg-compass-v2.onrender.com
PYTHON_VERSION=3.9.16
NODE_VERSION=18.17.0
WEB_CONCURRENCY=4
```

---

## 🚨 File Upload Security

### Validation Layers
1. **Client-side**: 10MB file size limit
2. **Server-side**: Authentication required
3. **Database**: File metadata tracking
4. **File system**: Organized storage structure

### Upload Flow Security
```python
# 1. Authentication check
@permission_classes([IsAuthenticated])

# 2. Task ownership validation
task = self.get_object()  # Validates user can access this task

# 3. File validation
if 'file' not in request.FILES:
    return Response({'error': 'No file provided'}, status=400)

# 4. Secure storage
attachment = TaskAttachment.objects.create(
    task=task,
    uploaded_by=request.user,  # Track uploader
    # ... other fields
)
```

---

## 📝 Key Differences Summary

The server deployment creates a highly optimized, single-process application that serves both your React frontend and Django API efficiently, with:

- **Unified serving** through Django + WhiteNoise
- **Compressed static assets** for faster loading
- **Production security hardening**
- **Proper caching headers**
- **Environment-aware URL resolution**
- **Comprehensive error handling**

This represents a significant upgrade from the dual-server local development setup, providing enterprise-grade performance and security for your ESG platform.

---


Files are organized with descriptive names that include task identifiers, making them easy to locate and manage both programmatically and manually.