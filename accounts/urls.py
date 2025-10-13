# accounts/urls.py

from django.urls import path
from . import views  # This imports from accounts/views.py
from .csrf_views import get_csrf_token  # --- NEW: Import the correct function from the correct file

app_name = 'accounts'

urlpatterns = [
    # Paths pointing to the updated views in accounts/views.py
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('signup/', views.signup_view, name='signup'),
    path('user/', views.user_view, name='user'),

    # --- UPDATED: Path now points to the imported get_csrf_token function ---
    path('csrf/', get_csrf_token, name='csrf'),
]