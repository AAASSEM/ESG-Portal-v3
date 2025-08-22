from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CompanyViewSet, ActivityViewSet, FrameworkViewSet,
    ProfilingQuestionViewSet, CompanyChecklistViewSet,
    MeterViewSet, DataCollectionViewSet, DashboardView
)

# Create router and register viewsets
router = DefaultRouter()
router.register(r'companies', CompanyViewSet)
router.register(r'activities', ActivityViewSet)
router.register(r'frameworks', FrameworkViewSet)
router.register(r'profiling-questions', ProfilingQuestionViewSet)
router.register(r'checklist', CompanyChecklistViewSet, basename='checklist')
router.register(r'meters', MeterViewSet, basename='meters')
router.register(r'data-collection', DataCollectionViewSet, basename='data-collection')

urlpatterns = [
    path('', include(router.urls)),
    path('dashboard/', DashboardView.as_view(), name='dashboard'),
]