# accounts/integrations_urls.py
# URL routing for Integration settings API

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import integrations_views

# Router for viewsets
router = DefaultRouter()
router.register(r'webhooks', integrations_views.WebhookViewSet, basename='webhook')

urlpatterns = [
    # Include router URLs
    path('', include(router.urls)),
    
    # Summary
    path('summary/', integrations_views.integrations_summary, name='integrations-summary'),
    
    # Slack
    path('slack/', integrations_views.slack_settings, name='slack-settings'),
    path('slack/test/', integrations_views.slack_test_connection, name='slack-test'),
    path('slack/send-test/', integrations_views.slack_send_test_notification, name='slack-send-test'),
    
    # Webhooks (additional endpoints not in viewset)
    path('webhooks/logs/', integrations_views.webhook_delivery_logs, name='webhook-logs'),
    
    # Google Analytics
    path('google-analytics/', integrations_views.google_analytics_settings, name='ga-settings'),
    path('google-analytics/config/', integrations_views.google_analytics_config_for_frontend, name='ga-config'),
]
