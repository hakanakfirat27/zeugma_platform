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
    path('signup-verify/', views.signup_with_verification, name='signup-verify'),
    path('verify-email/<str:uidb64>/<str:token>/', views.verify_email, name='verify-email'),
    path('resend-verification/', views.resend_verification_email, name='resend-verification'),

    path('check-email/', views.check_email_availability, name='check-email'),
    path('check-username/', views.check_username_availability, name='check-username'),
    path('generate-username/', views.generate_username, name='generate-username'),
    path('create-user-send-email/', views.create_user_send_email, name='create-user-send-email'),
    path('validate-password-token/<str:uidb64>/<str:token>/', views.validate_password_token,
         name='validate-password-token'),
    path('create-password/<str:uidb64>/<str:token>/', views.create_password, name='create-password'),

    path('2fa/enable/', views.enable_email_2fa, name='enable-email-2fa'),
    path('2fa/verify-enable/', views.verify_enable_2fa, name='verify-enable-2fa'),
    path('2fa/disable/', views.disable_2fa, name='disable-2fa'),
    path('2fa/send-code/', views.send_2fa_code, name='send-2fa-code'),
    path('2fa/verify-login/', views.verify_2fa_login, name='verify-2fa-login'),

    path('change-password/', views.change_password, name='change-password'),

    # User Activity endpoints
    path('activity/stats/', views.user_activity_stats, name='user-activity-stats'),
    path('activity/user/<int:user_id>/history/', views.user_login_history, name='user-login-history'),
]