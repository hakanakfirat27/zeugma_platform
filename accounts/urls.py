from django.urls import path, include
from . import views

urlpatterns = [
    # Authentication endpoints
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('signup/', views.signup_view, name='signup'),

    # User profile endpoint
    path('user/', views.user_profile_view, name='user-profile'),
    path('csrf/', views.csrf_view, name='csrf'),

    # NEW: Get admin users for chat
    path('admins/', views.get_admin_users, name='get-admins'),

    # Include API URLs
    path('', include('accounts.api_urls')),
    
    # Security management URLs
    path('security/', include('accounts.security_urls')),
]