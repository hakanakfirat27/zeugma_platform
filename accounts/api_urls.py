from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'users', views.UserViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('signup/', views.signup_view, name='signup'),
    path('user/', views.user_profile_view, name='user-profile'),

    # NEW ENDPOINTS - Add these lines
    path('check-email/', views.check_email_availability, name='check-email'),
    path('check-username/', views.check_username_availability, name='check-username'),
    path('generate-username/', views.generate_username, name='generate-username'),
    path('create-user-send-email/', views.create_user_send_email, name='create-user-send-email'),
    path('validate-password-token/<str:uidb64>/<str:token>/', views.validate_password_token,
         name='validate-password-token'),
    path('create-password/<str:uidb64>/<str:token>/', views.create_password, name='create-password'),
]