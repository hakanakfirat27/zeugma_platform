from django.contrib import admin
from django.urls import path, include
from django.views.generic import RedirectView
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),

    # Root URL - redirect to login
    path('', RedirectView.as_view(url='/accounts/login/', permanent=False)),

    # --- API URLS ---
    path('api/', include('reports.api_urls')),
    path('api/auth/', include('accounts.api_urls')),
    path('', include('notifications.urls')),

    # --- DJANGO-BASED AUTH & DASHBOARD URLS ---
    path('accounts/', include('accounts.urls')),
    path('dashboard/', include('dashboard.urls')),
    path('api/client/', include('reports.client_api_urls')),
    path('api/chat/', include('chat.urls')),
    path('api/announcements/', include('announcements.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)