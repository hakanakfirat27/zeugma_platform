from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UserViewSet

# Create a router and register our viewsets with it.
router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')

# The API URLs are now determined automatically by the router.
# This will create URLs like:
# /api/auth/users/ (for listing and creating users)
# /api/auth/users/{id}/ (for retrieving, updating, and deleting a specific user)
urlpatterns = [
    path('', include(router.urls)),
]

