from django.shortcuts import render
from django.views.generic import TemplateView
from django.conf import settings
import os


class ReactAppView(TemplateView):
    """
    Serves the React app's index.html for all non-API routes
    """
    
    def get_template_names(self):
        # Use the React build index.html
        return ['index.html']
    
    def get(self, request, *args, **kwargs):
        # Serve the React app
        return super().get(request, *args, **kwargs)