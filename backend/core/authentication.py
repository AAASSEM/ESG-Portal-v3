from rest_framework.authentication import SessionAuthentication


class CsrfExemptSessionAuthentication(SessionAuthentication):
    """Session authentication that bypasses CSRF checks for API calls."""
    
    def enforce_csrf(self, request):
        """Override to skip CSRF validation for API calls."""
        return  # Skip CSRF validation