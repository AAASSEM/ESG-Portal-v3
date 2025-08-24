from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CompanyViewSet, ActivityViewSet, FrameworkViewSet,
    ProfilingQuestionViewSet, CompanyChecklistViewSet,
    MeterViewSet, DataCollectionViewSet, DashboardView
)
from .auth_views import SignupView, LoginView, LogoutView, UserProfileView, CsrfTokenView

# Create router and register viewsets
router = DefaultRouter()
router.register(r'companies', CompanyViewSet, basename='companies')
router.register(r'activities', ActivityViewSet, basename='activities')
router.register(r'frameworks', FrameworkViewSet, basename='frameworks')
router.register(r'profiling-questions', ProfilingQuestionViewSet, basename='profiling-questions')
router.register(r'checklist', CompanyChecklistViewSet, basename='checklist')
router.register(r'meters', MeterViewSet, basename='meters')
router.register(r'data-collection', DataCollectionViewSet, basename='data-collection')

urlpatterns = [
    path('', include(router.urls)),
    path('dashboard/', DashboardView.as_view(), name='dashboard'),
    # Authentication endpoints
    path('auth/signup/', SignupView.as_view(), name='signup'),
    path('auth/login/', LoginView.as_view(), name='login'),
    path('auth/logout/', LogoutView.as_view(), name='logout'),
    path('auth/user/', UserProfileView.as_view(), name='user-profile'),
    path('auth/csrf/', CsrfTokenView.as_view(), name='csrf-token'),
]