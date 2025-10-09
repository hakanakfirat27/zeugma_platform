
from django.urls import path
from django.contrib.auth import views as auth_views
from .views import SignUpView, custom_login_view
from .csrf_views import get_csrf_token

app_name = 'accounts'

urlpatterns = [
    path('signup/', SignUpView.as_view(), name='signup'),
    path('login/', custom_login_view, name='login'),
    path('logout/', auth_views.LogoutView.as_view(), name='logout'),
    path('csrf/', get_csrf_token, name='csrf'),
]