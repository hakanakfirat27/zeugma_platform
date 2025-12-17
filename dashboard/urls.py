# dashboard/urls.py

from django.urls import path
from .views import (
    staff_dashboard_view,
    client_dashboard_view,
    guest_dashboard_view,
    # API views
    recent_activities,
    recently_viewed_companies,
    track_company_view,
    reports_by_category,
    companies_by_country,
    subscription_timeline,
    dashboard_stats,
)


app_name = 'dashboard'

urlpatterns = [
    # Template views
    path('', staff_dashboard_view, name='staff_dashboard'),
    path('client/', client_dashboard_view, name='client_dashboard'),
    path('guest/', guest_dashboard_view, name='guest_dashboard'),
    
    # API endpoints
    path('api/recent-activities/', recent_activities, name='recent_activities'),
    path('api/recently-viewed/', recently_viewed_companies, name='recently_viewed'),
    path('api/track-view/', track_company_view, name='track_view'),
    path('api/reports-by-category/', reports_by_category, name='reports_by_category'),
    path('api/companies-by-country/', companies_by_country, name='companies_by_country'),
    path('api/subscription-timeline/', subscription_timeline, name='subscription_timeline'),
    path('api/stats/', dashboard_stats, name='dashboard_stats'),
]
