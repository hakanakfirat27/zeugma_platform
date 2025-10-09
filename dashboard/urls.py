# dashboard/urls.py

from django.urls import path
from .views import staff_dashboard_view, client_dashboard_view, guest_dashboard_view


app_name = 'dashboard'

urlpatterns = [
    # The path for staff will be /dashboard/
    path('', staff_dashboard_view, name='staff_dashboard'),
    path('client/', client_dashboard_view, name='client_dashboard'),
    path('guest/', guest_dashboard_view, name='guest_dashboard'),
]