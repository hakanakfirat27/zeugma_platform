from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from accounts.views import HomeView

urlpatterns = [
    # Main application and admin URLs (unchanged)
    path('admin/', admin.site.urls),
    path('accounts/', include('accounts.urls')),
    path('dashboard/', include('dashboard.urls')),
    path('', HomeView.as_view(), name='home'),

    # --- THIS IS THE CORRECTED API URL CONFIGURATION ---
    # This creates a single entry point for all API calls at /api/
    path('api/', include([
        # Requests to /api/accounts/... will be handled by the accounts app
        path('accounts/', include('accounts.api_urls')),

        # All other API requests (e.g., /api/records/, /api/stats/) will be handled here
        path('', include('reports.api_urls')),
    ]))
]

# This part for serving media files is still correct
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)