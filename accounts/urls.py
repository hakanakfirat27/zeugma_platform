
from django.urls import path, include
from . import views

urlpatterns = [
    # Authentication endpoints
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('signup/', views.signup_view, name='signup'),

    # User profile endpoint - UPDATED NAME
    path('user/', views.user_profile_view, name='user-profile'),  # ← Changed from user_view

    # Include API URLs
    path('', include('accounts.api_urls')),
]