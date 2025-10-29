# backend/announcements/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AnnouncementViewSet

router = DefaultRouter()
router.register(r'', AnnouncementViewSet, basename='announcement')

urlpatterns = [
    path('', include(router.urls)),

]

# Available endpoints:
# GET    /api/announcements/                      - List all announcements (filtered by role)
# POST   /api/announcements/                      - Create announcement (staff/superadmin only)
# GET    /api/announcements/{id}/                 - Get announcement detail & mark as viewed
# PUT    /api/announcements/{id}/                 - Update announcement (staff/superadmin only)
# PATCH  /api/announcements/{id}/                 - Partial update (staff/superadmin only)
# DELETE /api/announcements/{id}/                 - Delete announcement (staff/superadmin only)
# GET    /api/announcements/my_announcements/     - Get user's announcements with status
# GET    /api/announcements/unread_count/         - Get count of unread announcements (for badge)
# GET    /api/announcements/unread/               - Get list of unread announcements
# GET    /api/announcements/popup/                - Get popup announcements (for login popup)
# POST   /api/announcements/{id}/acknowledge/     - Acknowledge announcement
# DELETE /api/announcements/{id}/delete_for_user/ - Delete from user's view
# GET    /api/announcements/{id}/views/           - Get view statistics (staff/superadmin only)
# GET    /api/announcements/statistics/           - Get global statistics (staff/superadmin only)
# POST   /api/announcements/{id}/publish/         - Publish draft (staff/superadmin only)
# POST   /api/announcements/{id}/archive/         - Archive announcement (staff/superadmin only)