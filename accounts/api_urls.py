# accounts/api_urls.py

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'users', views.UserViewSet, basename='user')

urlpatterns = [
    # Router URLs
    path('', include(router.urls)),

    # Username and Email checking
    path('check-username/', views.check_username_availability, name='check-username'),
    path('check-email/', views.check_email_availability, name='check-email'),
    path('generate-username/', views.generate_username, name='generate-username'),

    # User creation with email
    path('create-user-send-email/', views.create_user_send_email, name='create-user-send-email'),

    # Password creation
    path('validate-password-token/<str:uidb64>/<str:token>/', views.validate_password_token,
         name='validate-password-token'),
    path('create-password/<str:uidb64>/<str:token>/', views.create_password, name='create-password'),
]