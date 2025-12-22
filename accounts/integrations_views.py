# accounts/integrations_views.py
# API views for Integration settings

from rest_framework import status, viewsets
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from django.utils import timezone

from .integrations_models import (
    SlackIntegration,
    Webhook,
    WebhookDeliveryLog,
    GoogleAnalyticsIntegration
)
from .integrations_serializers import (
    SlackIntegrationSerializer,
    WebhookSerializer,
    WebhookCreateSerializer,
    WebhookDeliveryLogSerializer,
    GoogleAnalyticsIntegrationSerializer,
    IntegrationsSummarySerializer
)
from .integrations_services import SlackService, WebhookService


# =============================================================================
# INTEGRATIONS SUMMARY
# =============================================================================

@api_view(['GET'])
@permission_classes([IsAdminUser])
def integrations_summary(request):
    """
    Get summary of all integrations status
    """
    serializer = IntegrationsSummarySerializer({})
    return Response(serializer.data)


# =============================================================================
# SLACK INTEGRATION
# =============================================================================

@api_view(['GET', 'PUT', 'PATCH'])
@permission_classes([IsAdminUser])
def slack_settings(request):
    """
    Get or update Slack integration settings
    """
    settings = SlackIntegration.get_settings()
    
    if request.method == 'GET':
        serializer = SlackIntegrationSerializer(settings)
        return Response(serializer.data)
    
    elif request.method in ['PUT', 'PATCH']:
        serializer = SlackIntegrationSerializer(
            settings,
            data=request.data,
            partial=(request.method == 'PATCH')
        )
        
        if serializer.is_valid():
            serializer.save(updated_by=request.user)
            
            # Log the change
            from .security_models import AuditLog
            AuditLog.log(
                event_type='settings_changed',
                user=request.user,
                ip_address=request.META.get('REMOTE_ADDR'),
                description=f'Slack integration settings updated',
                severity='info'
            )
            
            return Response(serializer.data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def slack_test_connection(request):
    """
    Test Slack webhook connection
    """
    webhook_url = request.data.get('webhook_url')
    
    if not webhook_url:
        # Use saved URL
        settings = SlackIntegration.get_settings()
        webhook_url = settings.webhook_url
    
    if not webhook_url:
        return Response({
            'success': False,
            'message': 'No webhook URL provided'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    success, error = SlackService.test_connection(webhook_url)
    
    # Update test status
    settings = SlackIntegration.get_settings()
    settings.last_test_at = timezone.now()
    settings.last_test_success = success
    settings.save(update_fields=['last_test_at', 'last_test_success'])
    
    if success:
        return Response({
            'success': True,
            'message': 'Connection test successful! Check your Slack channel for the test message.'
        })
    else:
        return Response({
            'success': False,
            'message': f'Connection test failed: {error}'
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def slack_send_test_notification(request):
    """
    Send a test notification to Slack
    """
    settings = SlackIntegration.get_settings()
    
    if not settings.is_enabled or not settings.webhook_url:
        return Response({
            'success': False,
            'message': 'Slack integration is not enabled or configured'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    event_type = request.data.get('event_type', 'user.created')
    
    # Build test data based on event type
    test_data = {
        'name': 'Test User',
        'email': 'test@example.com',
        'role': 'Client',
        'created_by': request.user.full_name or request.user.username,
        'timestamp': timezone.now().strftime('%Y-%m-%d %H:%M:%S UTC'),
    }
    
    success, error = SlackService.send_notification(event_type, test_data, force=True)
    
    if success:
        return Response({
            'success': True,
            'message': 'Test notification sent successfully!'
        })
    else:
        return Response({
            'success': False,
            'message': f'Failed to send notification: {error}'
        }, status=status.HTTP_400_BAD_REQUEST)


# =============================================================================
# WEBHOOKS
# =============================================================================

class WebhookViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing webhooks
    """
    queryset = Webhook.objects.all().order_by('-created_at')
    permission_classes = [IsAdminUser]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return WebhookCreateSerializer
        return WebhookSerializer
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
        
        # Log the creation
        from .security_models import AuditLog
        AuditLog.log(
            event_type='webhook_created',
            user=self.request.user,
            ip_address=self.request.META.get('REMOTE_ADDR'),
            description=f'Webhook created: {serializer.instance.name}',
            severity='info'
        )
    
    def perform_update(self, serializer):
        serializer.save()
        
        # Log the update
        from .security_models import AuditLog
        AuditLog.log(
            event_type='webhook_updated',
            user=self.request.user,
            ip_address=self.request.META.get('REMOTE_ADDR'),
            description=f'Webhook updated: {serializer.instance.name}',
            severity='info'
        )
    
    def perform_destroy(self, instance):
        name = instance.name
        instance.delete()
        
        # Log the deletion
        from .security_models import AuditLog
        AuditLog.log(
            event_type='webhook_deleted',
            user=self.request.user,
            ip_address=self.request.META.get('REMOTE_ADDR'),
            description=f'Webhook deleted: {name}',
            severity='info'
        )
    
    @action(detail=True, methods=['post'])
    def test(self, request, pk=None):
        """Test a webhook by sending a test event"""
        webhook = self.get_object()
        
        success, error, response_info = WebhookService.test_webhook(webhook)
        
        if success:
            return Response({
                'success': True,
                'message': 'Test webhook delivered successfully!',
                'response': response_info
            })
        else:
            return Response({
                'success': False,
                'message': f'Test failed: {error}',
                'response': response_info
            }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def regenerate_secret(self, request, pk=None):
        """Regenerate the webhook secret"""
        import secrets
        webhook = self.get_object()
        webhook.secret = secrets.token_hex(32)
        webhook.save(update_fields=['secret'])
        
        return Response({
            'success': True,
            'secret': webhook.secret,
            'message': 'Secret regenerated successfully'
        })
    
    @action(detail=True, methods=['post'])
    def toggle_status(self, request, pk=None):
        """Toggle webhook active status"""
        webhook = self.get_object()
        webhook.is_active = not webhook.is_active
        
        # If re-activating, reset status to active
        if webhook.is_active and webhook.status == 'failed':
            webhook.status = 'active'
            webhook.consecutive_failures = 0
        
        webhook.save()
        
        return Response({
            'success': True,
            'is_active': webhook.is_active,
            'status': webhook.status
        })
    
    @action(detail=True, methods=['get'])
    def logs(self, request, pk=None):
        """Get delivery logs for a webhook"""
        webhook = self.get_object()
        logs = webhook.delivery_logs.all()[:100]  # Last 100 logs
        serializer = WebhookDeliveryLogSerializer(logs, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def available_events(self, request):
        """Get list of available webhook events"""
        events = Webhook.get_available_events()
        return Response(events)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def webhook_delivery_logs(request):
    """
    Get all webhook delivery logs with filtering
    """
    webhook_id = request.query_params.get('webhook_id')
    event_type = request.query_params.get('event_type')
    success = request.query_params.get('success')
    
    logs = WebhookDeliveryLog.objects.all()
    
    if webhook_id:
        logs = logs.filter(webhook_id=webhook_id)
    
    if event_type:
        logs = logs.filter(event_type=event_type)
    
    if success is not None:
        logs = logs.filter(success=success.lower() == 'true')
    
    logs = logs[:200]  # Limit to 200 logs
    serializer = WebhookDeliveryLogSerializer(logs, many=True)
    return Response(serializer.data)


# =============================================================================
# GOOGLE ANALYTICS
# =============================================================================

@api_view(['GET', 'PUT', 'PATCH'])
@permission_classes([IsAdminUser])
def google_analytics_settings(request):
    """
    Get or update Google Analytics integration settings
    """
    settings = GoogleAnalyticsIntegration.get_settings()
    
    if request.method == 'GET':
        serializer = GoogleAnalyticsIntegrationSerializer(settings)
        return Response(serializer.data)
    
    elif request.method in ['PUT', 'PATCH']:
        serializer = GoogleAnalyticsIntegrationSerializer(
            settings,
            data=request.data,
            partial=(request.method == 'PATCH')
        )
        
        if serializer.is_valid():
            serializer.save(updated_by=request.user)
            
            # Log the change
            from .security_models import AuditLog
            AuditLog.log(
                event_type='settings_changed',
                user=request.user,
                ip_address=request.META.get('REMOTE_ADDR'),
                description=f'Google Analytics integration settings updated',
                severity='info'
            )
            
            return Response(serializer.data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def google_analytics_config_for_frontend(request):
    """
    Get Google Analytics configuration for frontend initialization
    This is a simplified endpoint that only returns what the frontend needs
    """
    settings = GoogleAnalyticsIntegration.get_settings()
    
    if not settings.is_enabled or not settings.measurement_id:
        return Response({
            'enabled': False
        })
    
    return Response({
        'enabled': True,
        'measurementId': settings.measurement_id,
        'config': {
            'trackPageViews': settings.track_page_views,
            'trackReportDownloads': settings.track_report_downloads,
            'trackSearchQueries': settings.track_search_queries,
            'trackFilterUsage': settings.track_filter_usage,
            'trackUserActions': settings.track_user_actions,
            'anonymizeIp': settings.anonymize_ip,
            'debugMode': settings.debug_mode,
        }
    })
