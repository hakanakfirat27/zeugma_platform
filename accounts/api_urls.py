from django.urls import path
from .views import CurrentUserAPIView, LoginAPIView, LogoutAPIView, SignupAPIView

urlpatterns = [
    path('me/', CurrentUserAPIView.as_view(), name='current-user'),
    path('login/', LoginAPIView.as_view(), name='api-login'),
    path('logout/', LogoutAPIView.as_view(), name='api-logout'),
    path('signup/', SignupAPIView.as_view(), name='api-signup'),
]