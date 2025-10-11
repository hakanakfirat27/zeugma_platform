# zeugma_core/urls.py
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('accounts/', include('accounts.urls')),
    path('api/', include('reports.api_urls')),
    path('dashboard/', include('dashboard.urls')),
]