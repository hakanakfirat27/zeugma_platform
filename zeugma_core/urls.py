# zeugma_core/urls.py
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),

    # --- API URLS ---
    # All API endpoints are now consistently under /api/
    path('api/', include('reports.api_urls')),
    path('api/auth/', include('accounts.api_urls')), # NEW: User Management API

    # --- DJANGO-BASED AUTH & DASHBOARD URLS ---
    # These handle the server-side login/logout and dashboard routing
    path('accounts/', include('accounts.urls')),
    path('dashboard/', include('dashboard.urls')),
    path('api/client/', include('reports.client_api_urls')),
]