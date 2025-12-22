# accounts/integrations_services.py
# Services for Slack notifications and Webhook triggers

import requests
import json
import time
from datetime import datetime
from django.utils import timezone
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


class SlackService:
    """
    Service for sending Slack notifications
    """
    
    @classmethod
    def send_notification(cls, event_type, data, force=False):
        """
        Send a notification to Slack if enabled and event is subscribed
        
        Args:
            event_type: Type of event (e.g., 'user.created', 'report.published')
            data: Dictionary of event data
            force: If True, send even if event type is not enabled
        
        Returns:
            (success: bool, error: str or None)
        """
        from .integrations_models import SlackIntegration
        
        try:
            slack_settings = SlackIntegration.get_settings()
            
            if not slack_settings.is_enabled or not slack_settings.webhook_url:
                return False, 'Slack integration is not enabled'
            
            # Check if event type is enabled
            if not force and not cls._is_event_enabled(slack_settings, event_type):
                return False, f'Event type {event_type} is not enabled'
            
            # Build the message
            message = cls._build_message(event_type, data)
            
            # Send to Slack
            response = requests.post(
                slack_settings.webhook_url,
                json=message,
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            
            if response.status_code == 200:
                # Update stats
                slack_settings.last_notification_at = timezone.now()
                slack_settings.notification_count += 1
                slack_settings.save(update_fields=['last_notification_at', 'notification_count'])
                return True, None
            else:
                return False, f'Slack API returned {response.status_code}: {response.text}'
                
        except requests.exceptions.Timeout:
            return False, 'Request to Slack timed out'
        except requests.exceptions.RequestException as e:
            return False, f'Request failed: {str(e)}'
        except Exception as e:
            logger.error(f'Slack notification error: {e}')
            return False, str(e)
    
    @classmethod
    def test_connection(cls, webhook_url):
        """
        Test Slack webhook connection
        
        Returns:
            (success: bool, error: str or None)
        """
        try:
            message = {
                'text': '✅ Zeugma Platform - Connection Test Successful!',
                'blocks': [
                    {
                        'type': 'section',
                        'text': {
                            'type': 'mrkdwn',
                            'text': '*✅ Connection Test Successful*\n\nYour Slack integration is working correctly. You will receive notifications here when events occur in Zeugma.'
                        }
                    },
                    {
                        'type': 'context',
                        'elements': [
                            {
                                'type': 'mrkdwn',
                                'text': f'🕒 Tested at {timezone.now().strftime("%Y-%m-%d %H:%M:%S UTC")}'
                            }
                        ]
                    }
                ]
            }
            
            response = requests.post(
                webhook_url,
                json=message,
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            
            if response.status_code == 200:
                return True, None
            else:
                return False, f'Slack returned status {response.status_code}: {response.text}'
                
        except requests.exceptions.Timeout:
            return False, 'Request timed out'
        except requests.exceptions.RequestException as e:
            return False, f'Connection failed: {str(e)}'
        except Exception as e:
            return False, str(e)
    
    @classmethod
    def _is_event_enabled(cls, slack_settings, event_type):
        """Check if a specific event type is enabled"""
        event_mapping = {
            'user.created': slack_settings.notify_user_created,
            'user.invited': slack_settings.notify_user_invited,
            'user.login': slack_settings.notify_user_login,
            'report.published': slack_settings.notify_report_published,
            'report.updated': slack_settings.notify_report_updated,
            'data.import_completed': slack_settings.notify_data_imported,
            'data.import_failed': slack_settings.notify_data_import_failed,
            'security.failed_login': slack_settings.notify_security_alerts,
            'security.account_locked': slack_settings.notify_security_alerts,
            'user.2fa_disabled': slack_settings.notify_security_alerts,
            'announcement.created': slack_settings.notify_system_announcements,
        }
        return event_mapping.get(event_type, False)
    
    @classmethod
    def _build_message(cls, event_type, data):
        """Build Slack message based on event type"""
        from .integrations_models import SlackIntegration
        slack_settings = SlackIntegration.get_settings()
        
        # Common message structure
        message = {
            'username': slack_settings.bot_name or 'Zeugma Bot',
            'icon_emoji': slack_settings.bot_icon or ':robot_face:',
        }
        
        # Build message based on event type
        if event_type == 'user.created':
            message['blocks'] = cls._user_created_blocks(data)
        elif event_type == 'user.invited':
            message['blocks'] = cls._user_invited_blocks(data)
        elif event_type == 'report.published':
            message['blocks'] = cls._report_published_blocks(data)
        elif event_type == 'data.import_completed':
            message['blocks'] = cls._import_completed_blocks(data)
        elif event_type == 'data.import_failed':
            message['blocks'] = cls._import_failed_blocks(data)
        elif event_type == 'security.failed_login':
            message['blocks'] = cls._security_alert_blocks(data, 'Failed Login Attempt')
        elif event_type == 'security.account_locked':
            message['blocks'] = cls._security_alert_blocks(data, 'Account Locked')
        elif event_type == 'user.2fa_disabled':
            message['blocks'] = cls._security_alert_blocks(data, '2FA Disabled')
        elif event_type == 'announcement.created':
            message['blocks'] = cls._announcement_blocks(data)
        else:
            # Generic message
            message['text'] = f'Event: {event_type}\nData: {json.dumps(data, indent=2)}'
        
        return message
    
    @classmethod
    def _user_created_blocks(cls, data):
        return [
            {
                'type': 'header',
                'text': {'type': 'plain_text', 'text': '🆕 New User Created', 'emoji': True}
            },
            {
                'type': 'section',
                'fields': [
                    {'type': 'mrkdwn', 'text': f'*Name:*\n{data.get("name", "N/A")}'},
                    {'type': 'mrkdwn', 'text': f'*Email:*\n{data.get("email", "N/A")}'},
                    {'type': 'mrkdwn', 'text': f'*Role:*\n{data.get("role", "N/A")}'},
                    {'type': 'mrkdwn', 'text': f'*Created by:*\n{data.get("created_by", "N/A")}'},
                ]
            },
            {
                'type': 'context',
                'elements': [
                    {'type': 'mrkdwn', 'text': f'🕒 {data.get("timestamp", timezone.now().strftime("%Y-%m-%d %H:%M:%S UTC"))}'}
                ]
            }
        ]
    
    @classmethod
    def _user_invited_blocks(cls, data):
        return [
            {
                'type': 'header',
                'text': {'type': 'plain_text', 'text': '✉️ User Invited', 'emoji': True}
            },
            {
                'type': 'section',
                'fields': [
                    {'type': 'mrkdwn', 'text': f'*Email:*\n{data.get("email", "N/A")}'},
                    {'type': 'mrkdwn', 'text': f'*Role:*\n{data.get("role", "N/A")}'},
                    {'type': 'mrkdwn', 'text': f'*Invited by:*\n{data.get("invited_by", "N/A")}'},
                ]
            },
            {
                'type': 'context',
                'elements': [
                    {'type': 'mrkdwn', 'text': f'🕒 {data.get("timestamp", timezone.now().strftime("%Y-%m-%d %H:%M:%S UTC"))}'}
                ]
            }
        ]
    
    @classmethod
    def _report_published_blocks(cls, data):
        return [
            {
                'type': 'header',
                'text': {'type': 'plain_text', 'text': '📊 Report Published', 'emoji': True}
            },
            {
                'type': 'section',
                'fields': [
                    {'type': 'mrkdwn', 'text': f'*Report:*\n{data.get("report_name", "N/A")}'},
                    {'type': 'mrkdwn', 'text': f'*Client:*\n{data.get("client_name", "N/A")}'},
                    {'type': 'mrkdwn', 'text': f'*Records:*\n{data.get("record_count", "N/A")}'},
                    {'type': 'mrkdwn', 'text': f'*Published by:*\n{data.get("published_by", "N/A")}'},
                ]
            },
            {
                'type': 'context',
                'elements': [
                    {'type': 'mrkdwn', 'text': f'🕒 {data.get("timestamp", timezone.now().strftime("%Y-%m-%d %H:%M:%S UTC"))}'}
                ]
            }
        ]
    
    @classmethod
    def _import_completed_blocks(cls, data):
        return [
            {
                'type': 'header',
                'text': {'type': 'plain_text', 'text': '📥 Data Import Completed', 'emoji': True}
            },
            {
                'type': 'section',
                'fields': [
                    {'type': 'mrkdwn', 'text': f'*File:*\n{data.get("filename", "N/A")}'},
                    {'type': 'mrkdwn', 'text': f'*Records Imported:*\n{data.get("imported_count", "N/A")}'},
                    {'type': 'mrkdwn', 'text': f'*Duplicates Skipped:*\n{data.get("duplicates", "0")}'},
                    {'type': 'mrkdwn', 'text': f'*Imported by:*\n{data.get("imported_by", "N/A")}'},
                ]
            },
            {
                'type': 'context',
                'elements': [
                    {'type': 'mrkdwn', 'text': f'🕒 {data.get("timestamp", timezone.now().strftime("%Y-%m-%d %H:%M:%S UTC"))}'}
                ]
            }
        ]
    
    @classmethod
    def _import_failed_blocks(cls, data):
        return [
            {
                'type': 'header',
                'text': {'type': 'plain_text', 'text': '❌ Data Import Failed', 'emoji': True}
            },
            {
                'type': 'section',
                'text': {
                    'type': 'mrkdwn',
                    'text': f'*File:* {data.get("filename", "N/A")}\n*Error:* {data.get("error", "Unknown error")}'
                }
            },
            {
                'type': 'section',
                'fields': [
                    {'type': 'mrkdwn', 'text': f'*Attempted by:*\n{data.get("attempted_by", "N/A")}'},
                ]
            },
            {
                'type': 'context',
                'elements': [
                    {'type': 'mrkdwn', 'text': f'🕒 {data.get("timestamp", timezone.now().strftime("%Y-%m-%d %H:%M:%S UTC"))}'}
                ]
            }
        ]
    
    @classmethod
    def _security_alert_blocks(cls, data, alert_type):
        return [
            {
                'type': 'header',
                'text': {'type': 'plain_text', 'text': f'🚨 Security Alert: {alert_type}', 'emoji': True}
            },
            {
                'type': 'section',
                'fields': [
                    {'type': 'mrkdwn', 'text': f'*User:*\n{data.get("username", "N/A")}'},
                    {'type': 'mrkdwn', 'text': f'*IP Address:*\n{data.get("ip_address", "N/A")}'},
                    {'type': 'mrkdwn', 'text': f'*Location:*\n{data.get("location", "N/A")}'},
                ]
            },
            {
                'type': 'context',
                'elements': [
                    {'type': 'mrkdwn', 'text': f'🕒 {data.get("timestamp", timezone.now().strftime("%Y-%m-%d %H:%M:%S UTC"))}'}
                ]
            }
        ]
    
    @classmethod
    def _announcement_blocks(cls, data):
        return [
            {
                'type': 'header',
                'text': {'type': 'plain_text', 'text': '📢 System Announcement', 'emoji': True}
            },
            {
                'type': 'section',
                'text': {
                    'type': 'mrkdwn',
                    'text': f'*{data.get("title", "Announcement")}*\n\n{data.get("content", "")}'
                }
            },
            {
                'type': 'context',
                'elements': [
                    {'type': 'mrkdwn', 'text': f'🕒 {data.get("timestamp", timezone.now().strftime("%Y-%m-%d %H:%M:%S UTC"))}'}
                ]
            }
        ]


class WebhookService:
    """
    Service for triggering custom webhooks
    """
    
    @classmethod
    def trigger_event(cls, event_type, data):
        """
        Trigger webhooks for a specific event type
        
        Args:
            event_type: Type of event (e.g., 'user.created')
            data: Dictionary of event data
        
        Returns:
            List of (webhook_id, success, error) tuples
        """
        from .integrations_models import Webhook, WebhookDeliveryLog
        
        results = []
        
        # Find all active webhooks subscribed to this event
        webhooks = Webhook.objects.filter(
            is_active=True,
            status='active',
            events__contains=[event_type]
        )
        
        for webhook in webhooks:
            success, error = cls._deliver_to_webhook(webhook, event_type, data)
            results.append((webhook.id, success, error))
        
        return results
    
    @classmethod
    def _deliver_to_webhook(cls, webhook, event_type, data, attempt=1):
        """
        Deliver event to a single webhook
        
        Returns:
            (success: bool, error: str or None)
        """
        from .integrations_models import WebhookDeliveryLog
        
        start_time = time.time()
        
        # Build payload
        payload = {
            'event': event_type,
            'timestamp': timezone.now().isoformat(),
            'data': data,
        }
        
        # Generate signature
        signature = webhook.generate_signature(payload)
        
        # Build headers
        headers = {
            'Content-Type': 'application/json',
            'X-Webhook-Event': event_type,
            'X-Webhook-Signature': f'sha256={signature}',
            'X-Webhook-Timestamp': str(int(time.time())),
            'User-Agent': 'Zeugma-Webhook/1.0',
        }
        
        # Add custom headers
        if webhook.custom_headers:
            headers.update(webhook.custom_headers)
        
        try:
            response = requests.post(
                webhook.url,
                json=payload,
                headers=headers,
                timeout=webhook.timeout_seconds
            )
            
            duration_ms = int((time.time() - start_time) * 1000)
            success = 200 <= response.status_code < 300
            
            # Log the delivery
            WebhookDeliveryLog.objects.create(
                webhook=webhook,
                event_type=event_type,
                payload=payload,
                request_headers=headers,
                response_status_code=response.status_code,
                response_body=response.text[:5000] if response.text else None,  # Limit response body
                success=success,
                duration_ms=duration_ms,
                attempt_number=attempt,
                error_message=None if success else f'HTTP {response.status_code}'
            )
            
            # Update webhook stats
            webhook.record_delivery(success, None if success else f'HTTP {response.status_code}')
            
            return success, None if success else f'HTTP {response.status_code}'
            
        except requests.exceptions.Timeout:
            duration_ms = int((time.time() - start_time) * 1000)
            error = 'Request timed out'
            
            WebhookDeliveryLog.objects.create(
                webhook=webhook,
                event_type=event_type,
                payload=payload,
                request_headers=headers,
                success=False,
                duration_ms=duration_ms,
                attempt_number=attempt,
                error_message=error
            )
            
            webhook.record_delivery(False, error)
            return False, error
            
        except requests.exceptions.RequestException as e:
            duration_ms = int((time.time() - start_time) * 1000)
            error = str(e)
            
            WebhookDeliveryLog.objects.create(
                webhook=webhook,
                event_type=event_type,
                payload=payload,
                request_headers=headers,
                success=False,
                duration_ms=duration_ms,
                attempt_number=attempt,
                error_message=error
            )
            
            webhook.record_delivery(False, error)
            return False, error
    
    @classmethod
    def test_webhook(cls, webhook):
        """
        Send a test event to a webhook
        
        Returns:
            (success: bool, error: str or None, response_info: dict)
        """
        test_data = {
            'message': 'This is a test webhook delivery from Zeugma Platform',
            'webhook_name': webhook.name,
            'tested_at': timezone.now().isoformat(),
        }
        
        start_time = time.time()
        
        # Build payload
        payload = {
            'event': 'test.webhook',
            'timestamp': timezone.now().isoformat(),
            'data': test_data,
        }
        
        # Generate signature
        signature = webhook.generate_signature(payload)
        
        # Build headers
        headers = {
            'Content-Type': 'application/json',
            'X-Webhook-Event': 'test.webhook',
            'X-Webhook-Signature': f'sha256={signature}',
            'X-Webhook-Timestamp': str(int(time.time())),
            'User-Agent': 'Zeugma-Webhook/1.0',
        }
        
        if webhook.custom_headers:
            headers.update(webhook.custom_headers)
        
        response_info = {
            'status_code': None,
            'duration_ms': None,
            'response_body': None,
        }
        
        try:
            response = requests.post(
                webhook.url,
                json=payload,
                headers=headers,
                timeout=webhook.timeout_seconds
            )
            
            duration_ms = int((time.time() - start_time) * 1000)
            success = 200 <= response.status_code < 300
            
            response_info = {
                'status_code': response.status_code,
                'duration_ms': duration_ms,
                'response_body': response.text[:1000] if response.text else None,
            }
            
            return success, None if success else f'HTTP {response.status_code}', response_info
            
        except requests.exceptions.Timeout:
            response_info['duration_ms'] = int((time.time() - start_time) * 1000)
            return False, 'Request timed out', response_info
            
        except requests.exceptions.RequestException as e:
            response_info['duration_ms'] = int((time.time() - start_time) * 1000)
            return False, str(e), response_info


def notify_event(event_type, data):
    """
    Convenience function to trigger both Slack and Webhook notifications
    
    Usage:
        from accounts.integrations_services import notify_event
        
        notify_event('user.created', {
            'name': 'John Smith',
            'email': 'john@example.com',
            'role': 'Client',
            'created_by': 'Admin User'
        })
    """
    results = {
        'slack': None,
        'webhooks': []
    }
    
    # Send to Slack
    try:
        success, error = SlackService.send_notification(event_type, data)
        results['slack'] = {'success': success, 'error': error}
    except Exception as e:
        logger.error(f'Error sending Slack notification: {e}')
        results['slack'] = {'success': False, 'error': str(e)}
    
    # Trigger webhooks
    try:
        webhook_results = WebhookService.trigger_event(event_type, data)
        results['webhooks'] = webhook_results
    except Exception as e:
        logger.error(f'Error triggering webhooks: {e}')
    
    return results
