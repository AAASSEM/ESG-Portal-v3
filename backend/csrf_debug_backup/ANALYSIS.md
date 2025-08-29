# CSRF Issue Analysis

## Problem Summary
- Custom activities save successfully using `POST /api/activities/add_custom/`
- Company updates fail with 403 CSRF errors on both:
  - Original: `PUT /api/companies/{id}/`  
  - New: `POST /api/companies/{id}/update_info/`

## Console Evidence
```
Line 108: POST http://localhost:8080/api/companies/16/update_info/ 403 (Forbidden)
Line 136: Failed to save company data. Status: 403
```

## Files Involved
1. **Backend Views**: `views.py` - Contains CompanyViewSet with @csrf_exempt
2. **Auth Views**: `auth_views.py` - Working auth endpoints with @csrf_exempt  
3. **URLs**: `urls.py` - Router configuration
4. **Settings**: `settings.py` - CSRF middleware configuration
5. **Frontend**: `AuthContext.js` - CSRF token handling
6. **Frontend**: `Onboard.js` - Company update requests

## Key Observations

### Working Custom Activity Endpoint
```python
@method_decorator(csrf_exempt, name='dispatch')
class ActivityViewSet(viewsets.ReadOnlyModelViewSet):
    @action(detail=False, methods=['post'])
    def add_custom(self, request):
        # This works perfectly - no CSRF issues
```

### Failing Company Update Endpoint  
```python
@method_decorator(csrf_exempt, name='dispatch')
class CompanyViewSet(viewsets.ModelViewSet):
    @action(detail=True, methods=['post'])
    def update_info(self, request, pk=None):
        # This fails with 403 CSRF error despite same pattern
```

## CSRF Configuration Analysis

### Settings.py
- CSRF middleware only added in production: `if not DEBUG:`
- We're in development mode (`DEBUG = True`)
- Should have no CSRF enforcement

### AuthContext.js CSRF Token Handling
- Successfully obtains CSRF token: `🔑 CSRF token: obtained`
- Adds `X-CSRFToken` header to requests
- Uses `credentials: 'include'` for cookies

## Hypothesis
The issue might be:
1. **Router-level CSRF enforcement** - Router vs direct endpoint
2. **ViewSet method type** - ModelViewSet vs ReadOnlyModelViewSet  
3. **URL parameter difference** - detail=True vs detail=False
4. **Session/cookie state** - Some middleware interfering

## Next Steps
1. Test direct endpoint outside of router
2. Compare exact request headers between working/failing calls
3. Check middleware order and interference
4. Try bypassing DRF router entirely