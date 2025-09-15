from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CompanyViewSet, SiteViewSet, ActivityViewSet, FrameworkViewSet, FrameworkElementViewSet,
    ProfilingQuestionViewSet, CompanyChecklistViewSet,
    MeterViewSet, DataCollectionViewSet, DashboardView
)
from .user_views import UserViewSet
from .auth_views import SignupView, LoginView, LogoutView, UserProfileView, CsrfTokenView, UserSitesView, UserPermissionsView, RoleSwitchView, ResetPasswordView, CompanyUpdateView, EmailVerificationView, EmailCodeVerificationView, ResendVerificationView, SendResetCodeView, VerifyResetCodeView, MagicLinkAuthView
from .assignment_views import ElementAssignmentViewSet

# Create router and register viewsets
router = DefaultRouter()
router.register(r'companies', CompanyViewSet, basename='companies')
router.register(r'sites', SiteViewSet, basename='sites')
router.register(r'activities', ActivityViewSet, basename='activities')
router.register(r'frameworks', FrameworkViewSet, basename='frameworks')
router.register(r'framework-elements', FrameworkElementViewSet, basename='framework-elements')
router.register(r'profiling-questions', ProfilingQuestionViewSet, basename='profiling-questions')
router.register(r'checklist', CompanyChecklistViewSet, basename='checklist')
router.register(r'meters', MeterViewSet, basename='meters')
router.register(r'data-collection', DataCollectionViewSet, basename='data-collection')
router.register(r'users', UserViewSet, basename='users')
router.register(r'element-assignments', ElementAssignmentViewSet, basename='element-assignments')

urlpatterns = [
    path('', include(router.urls)),
    path('dashboard/', DashboardView.as_view(), name='dashboard'),
    # Authentication endpoints
    path('auth/signup/', SignupView.as_view(), name='signup'),
    path('auth/login/', LoginView.as_view(), name='login'),
    path('auth/logout/', LogoutView.as_view(), name='logout'),
    path('auth/user/', UserProfileView.as_view(), name='user-profile'),
    path('auth/switch-role/', RoleSwitchView.as_view(), name='switch-role'),
    path('auth/reset-password/', ResetPasswordView.as_view(), name='reset-password'),
    path('auth/csrf/', CsrfTokenView.as_view(), name='csrf-token'),
    # Email verification endpoints
    path('auth/verify-email/', EmailVerificationView.as_view(), name='verify-email'),
    path('auth/verify-code/', EmailCodeVerificationView.as_view(), name='verify-code'),
    path('auth/resend-verification/', ResendVerificationView.as_view(), name='resend-verification'),
    # Password reset verification endpoints
    path('auth/send-reset-code/', SendResetCodeView.as_view(), name='send-reset-code'),
    path('auth/verify-reset-code/', VerifyResetCodeView.as_view(), name='verify-reset-code'),
    # Magic link authentication (invitation auto-login)
    path('auth/magic-link/<str:token>/', MagicLinkAuthView.as_view(), name='magic-link-auth'),
    # User endpoints
    path('user/sites/', UserSitesView.as_view(), name='user-sites'),
    path('user/permissions/', UserPermissionsView.as_view(), name='user-permissions'),
    # Direct company update (bypasses DRF router)
    path('company/<int:company_id>/update/', CompanyUpdateView.as_view(), name='company-update'),
]