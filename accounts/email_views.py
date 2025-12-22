# accounts/email_views.py
# API views for email templates and branding

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from django.utils import timezone

from .email_models import EmailBranding, EmailTemplate
from .email_serializers import (
    EmailBrandingSerializer,
    EmailTemplateSerializer,
    EmailTemplateListSerializer,
    EmailPreviewSerializer,
    SendTestEmailSerializer
)
from .security_models import AuditLog


def get_client_ip(request):
    """Get client IP address from request"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


def get_test_data_for_template(template_type):
    """Get realistic test data for each template type"""
    base_data = {
        'user_name': 'John Doe',
        'user_email': 'john.doe@example.com',
        'company_name': EmailBranding.get_branding().company_name,
        'current_year': timezone.now().year,
    }
    
    # Template-specific test data
    template_data = {
        'welcome': {
            **base_data,
            'user_role': 'Client',
            'dashboard_url': 'https://zeugma.com/dashboard',
        },
        '2fa_setup_code': {
            **base_data,
            'code': '847291',
            'expiry_minutes': '10',
            'setup_message': 'You have requested to enable Two-Factor Authentication for your account. This adds an extra layer of security to protect your account.',
        },
        '2fa_enabled': {
            **base_data,
            'change_time': timezone.now().strftime('%B %d, %Y at %I:%M %p UTC'),
            'ip_address': '203.0.113.42',
            'location': 'London, United Kingdom',
            'device': 'Desktop/Laptop',
            'browser': 'Google Chrome',
            'os': 'Windows 10/11',
            'security_url': 'https://zeugma.com/settings/security',
        },
        '2fa_enabled_notification': {
            **base_data,
            'security_url': 'https://zeugma.com/settings/security',
        },
        'password_reset_success': {
            **base_data,
            'login_url': 'https://zeugma.com/login',
        },
        'user_invited': {
            **base_data,
            'inviter_name': 'Jane Admin',
            'role': 'Data Collector',
            'invite_url': 'https://zeugma.com/invite?token=abc123xyz',
            'expiry_hours': '24',
        },
        'password_reset': {
            **base_data,
            'reset_url': 'https://zeugma.com/reset-password?token=xyz789abc',
            'expiry_hours': '24',
        },
        'password_changed': {
            **base_data,
            'change_time': timezone.now().strftime('%B %d, %Y at %I:%M %p UTC'),
            'ip_address': '203.0.113.42',
            'location': 'London, United Kingdom',
            'device': 'Desktop/Laptop',
            'browser': 'Google Chrome',
            'os': 'Windows 10/11',
        },
        '2fa_code': {
            **base_data,
            'code': '847291',
            'expiry_minutes': '10',
        },
        '2fa_disabled': {
            **base_data,
            'change_time': timezone.now().strftime('%B %d, %Y at %I:%M %p UTC'),
            'ip_address': '203.0.113.42',
            'location': 'London, United Kingdom',
            'device': 'Desktop/Laptop',
            'browser': 'Google Chrome',
            'os': 'Windows 10/11',
            'security_url': 'https://zeugma.com/settings/security',
        },
        'new_device_login': {
            **base_data,
            'login_time': timezone.now().strftime('%B %d, %Y at %I:%M %p UTC'),
            'ip_address': '198.51.100.23',
            'location': 'New York, United States',
            'device': 'iPhone',
            'browser': 'Safari',
            'os': 'iOS (iPhone)',
            'security_url': 'https://zeugma.com/settings/security',
        },
        'suspicious_login': {
            **base_data,
            'failed_attempts': '5',
            'attempt_time': timezone.now().strftime('%B %d, %Y at %I:%M %p UTC'),
            'ip_address': '192.0.2.100',
            'location': 'Unknown Location',
            'device': 'Desktop/Laptop',
            'browser': 'Unknown Browser',
            'security_url': 'https://zeugma.com/settings/security',
        },
        'account_locked': {
            **base_data,
            'failed_attempts': '5',
            'unlock_time': (timezone.now() + timezone.timedelta(minutes=15)).strftime('%I:%M %p UTC'),
            'lockout_minutes': '15',
            'ip_address': '192.0.2.100',
            'location': 'Unknown Location',
            'device': 'Desktop/Laptop',
            'reset_url': 'https://zeugma.com/forgot-password',
        },
        'report_ready': {
            **base_data,
            'report_name': 'Q4 2024 European Plastics Market Analysis',
            'report_description': 'Comprehensive analysis of European plastics market including trends, forecasts, and company rankings across all production categories.',
            'report_url': 'https://zeugma.com/reports/123',
            'generated_time': timezone.now().strftime('%B %d, %Y at %I:%M %p UTC'),
        },
        'announcement_info': {
            **base_data,
            'announcement_title': 'New Features Available',
            'announcement_content': 'We have released exciting new features including advanced filtering, bulk export capabilities, and improved dashboard performance. Update your experience today!',
            'announcement_date': timezone.now().strftime('%B %d, %Y'),
            'action_url': 'https://zeugma.com/whats-new',
            'action_text': 'See What\'s New',
        },
        'announcement_warning': {
            **base_data,
            'announcement_title': 'Scheduled Maintenance Notice',
            'announcement_content': 'We will be performing scheduled maintenance on <strong>December 25, 2024 from 2:00 AM to 6:00 AM UTC</strong>. The platform may be temporarily unavailable during this time. Please save your work before the maintenance window.',
            'announcement_date': timezone.now().strftime('%B %d, %Y'),
        },
        'announcement_success': {
            **base_data,
            'announcement_title': 'Project Completed Successfully',
            'announcement_content': 'Great news! The data collection for your <strong>European Plastics Market 2024</strong> project has been completed successfully. All 2,450 company records have been verified and are ready for review.',
            'announcement_date': timezone.now().strftime('%B %d, %Y'),
            'action_url': 'https://zeugma.com/projects/123',
            'action_text': 'View Project Results',
        },
        'announcement_urgent': {
            **base_data,
            'announcement_title': 'Important Security Update',
            'announcement_content': 'We have detected unusual activity patterns on the platform. As a precaution, we recommend all users to:<br><br>• Change your password immediately<br>• Enable Two-Factor Authentication<br>• Review your recent account activity<br><br>If you notice any unauthorized access, please contact support immediately.',
            'announcement_date': timezone.now().strftime('%B %d, %Y'),
            'action_url': 'https://zeugma.com/settings/security',
            'action_text': 'Secure My Account Now',
        },
    }
    
    return template_data.get(template_type, base_data)


# ============================================
# EMAIL BRANDING VIEWS
# ============================================

@api_view(['GET'])
@permission_classes([IsAdminUser])
def get_email_branding(request):
    """Get email branding settings"""
    branding = EmailBranding.get_branding()
    serializer = EmailBrandingSerializer(branding)
    return Response(serializer.data)


@api_view(['PATCH'])
@permission_classes([IsAdminUser])
def update_email_branding(request):
    """Update email branding settings"""
    branding = EmailBranding.get_branding()
    serializer = EmailBrandingSerializer(branding, data=request.data, partial=True)
    
    if serializer.is_valid():
        serializer.save(updated_by=request.user)
        
        # Log the change
        AuditLog.log(
            event_type='settings_changed',
            user=request.user,
            ip_address=get_client_ip(request),
            description='Email branding updated',
            details={'changed_fields': list(request.data.keys())}
        )
        
        return Response(serializer.data)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ============================================
# EMAIL TEMPLATE VIEWS
# ============================================

@api_view(['GET'])
@permission_classes([IsAdminUser])
def get_email_templates(request):
    """Get all email templates"""
    templates = EmailTemplate.objects.all()
    serializer = EmailTemplateListSerializer(templates, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def get_email_template(request, template_id):
    """Get a specific email template with full details"""
    try:
        template = EmailTemplate.objects.get(id=template_id)
        serializer = EmailTemplateSerializer(template)
        
        # Also include preview data
        test_data = get_test_data_for_template(template.template_type)
        
        return Response({
            **serializer.data,
            'preview_data': test_data
        })
    except EmailTemplate.DoesNotExist:
        return Response({'error': 'Template not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['PATCH'])
@permission_classes([IsAdminUser])
def update_email_template(request, template_id):
    """Update an email template"""
    try:
        template = EmailTemplate.objects.get(id=template_id)
        serializer = EmailTemplateSerializer(template, data=request.data, partial=True)
        
        if serializer.is_valid():
            serializer.save(updated_by=request.user)
            
            # Log the change
            AuditLog.log(
                event_type='settings_changed',
                user=request.user,
                ip_address=get_client_ip(request),
                description=f'Email template updated: {template.name}',
                details={'template_type': template.template_type}
            )
            
            return Response(serializer.data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    except EmailTemplate.DoesNotExist:
        return Response({'error': 'Template not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def toggle_email_template(request, template_id):
    """Toggle email template active status"""
    try:
        template = EmailTemplate.objects.get(id=template_id)
        template.is_active = not template.is_active
        template.updated_by = request.user
        template.save()
        
        status_text = 'enabled' if template.is_active else 'disabled'
        
        AuditLog.log(
            event_type='settings_changed',
            user=request.user,
            ip_address=get_client_ip(request),
            description=f'Email template {status_text}: {template.name}'
        )
        
        return Response({
            'success': True,
            'is_active': template.is_active,
            'message': f'Template {status_text}'
        })
    except EmailTemplate.DoesNotExist:
        return Response({'error': 'Template not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def reset_email_template(request, template_id):
    """Reset an email template to its default content"""
    try:
        template = EmailTemplate.objects.get(id=template_id)
        defaults = EmailTemplate._get_default_templates()
        
        if template.template_type in defaults:
            default_data = defaults[template.template_type]
            template.name = default_data['name']
            template.subject = default_data['subject']
            template.html_content = default_data['html_content']
            template.text_content = default_data.get('text_content', '')
            template.available_variables = default_data.get('available_variables', [])
            template.updated_by = request.user
            template.save()
            
            AuditLog.log(
                event_type='settings_changed',
                user=request.user,
                ip_address=get_client_ip(request),
                description=f'Email template reset to default: {template.name}'
            )
            
            serializer = EmailTemplateSerializer(template)
            return Response({
                'success': True,
                'template': serializer.data,
                'message': 'Template reset to default'
            })
        
        return Response({
            'error': 'No default available for this template type'
        }, status=status.HTTP_400_BAD_REQUEST)
    except EmailTemplate.DoesNotExist:
        return Response({'error': 'Template not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def preview_email_template(request):
    """Preview an email template with test data"""
    serializer = EmailPreviewSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    data = serializer.validated_data
    custom_test_data = data.get('test_data', {})
    
    if data.get('template_id'):
        try:
            template = EmailTemplate.objects.get(id=data['template_id'])
            
            # Get template-specific test data
            test_data = get_test_data_for_template(template.template_type)
            
            # Merge with any custom test data provided
            test_data.update(custom_test_data)
            
            subject = template.render_subject(test_data)
            html_content = template.render_html(test_data)
            
            return Response({
                'subject': subject,
                'html_content': html_content,
                'test_data': test_data
            })
        except EmailTemplate.DoesNotExist:
            return Response({'error': 'Template not found'}, status=status.HTTP_404_NOT_FOUND)
    else:
        # Preview custom content
        subject = data.get('subject', 'Preview Email')
        html_content = data.get('html_content', '')
        
        # Get branding
        branding = EmailBranding.get_branding()
        test_data = {
            'user_name': 'John Doe',
            'company_name': branding.company_name,
            'primary_color': branding.primary_color,
            'secondary_color': branding.secondary_color,
            'footer_text': branding.footer_text,
            'support_email': branding.support_email,
            'current_year': timezone.now().year,
        }
        test_data.update(custom_test_data)
        
        for key, value in test_data.items():
            subject = subject.replace('{{' + key + '}}', str(value))
            subject = subject.replace('{{ ' + key + ' }}', str(value))
            html_content = html_content.replace('{{' + key + '}}', str(value))
            html_content = html_content.replace('{{ ' + key + ' }}', str(value))
        
        return Response({
            'subject': subject,
            'html_content': html_content,
            'test_data': test_data
        })


@api_view(['POST'])
@permission_classes([IsAdminUser])
def send_test_email(request):
    """Send a test email"""
    serializer = SendTestEmailSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    data = serializer.validated_data
    
    try:
        template = EmailTemplate.objects.get(id=data['template_id'])
    except EmailTemplate.DoesNotExist:
        return Response({'error': 'Template not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Get template-specific test data
    test_data = get_test_data_for_template(template.template_type)
    
    # Override with any custom test data provided
    if data.get('test_data'):
        test_data.update(data['test_data'])
    
    # Set the recipient email
    test_data['user_email'] = data['to_email']
    
    # Use the SSL-fixed email sender
    from .email_notifications import send_email_with_ssl_fix
    
    subject = template.render_subject(test_data)
    html_content = template.render_html(test_data)
    text_content = template.render_text(test_data)
    
    success, error = send_email_with_ssl_fix(
        data['to_email'],
        subject,
        text_content or "Please view this email in an HTML-compatible client.",
        html_content
    )
    
    if success:
        AuditLog.log(
            event_type='settings_changed',
            user=request.user,
            ip_address=get_client_ip(request),
            description=f'Test email sent: {template.name} to {data["to_email"]}'
        )
        
        return Response({
            'success': True,
            'message': f'Test email sent to {data["to_email"]}'
        })
    
    return Response({
        'success': False,
        'message': f'Failed to send email: {error}'
    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def create_default_templates(request):
    """Create default email templates"""
    created_count = EmailTemplate.create_default_templates()
    
    if created_count > 0:
        AuditLog.log(
            event_type='settings_changed',
            user=request.user,
            ip_address=get_client_ip(request),
            description=f'Created {created_count} default email templates'
        )
    
    templates = EmailTemplate.objects.all()
    serializer = EmailTemplateListSerializer(templates, many=True)
    
    return Response({
        'success': True,
        'created_count': created_count,
        'templates': serializer.data,
        'message': f'Created {created_count} new template(s)' if created_count > 0 else 'All templates already exist'
    })


@api_view(['GET'])
@permission_classes([IsAdminUser])
def get_template_types(request):
    """Get available template types"""
    return Response({
        'template_types': [
            {'value': choice[0], 'label': choice[1]}
            for choice in EmailTemplate.TEMPLATE_TYPES
        ]
    })


@api_view(['POST'])
@permission_classes([IsAdminUser])
def recreate_all_templates(request):
    """Delete and recreate all default templates (for updating to new versions)"""
    try:
        # Delete all existing templates
        deleted_count = EmailTemplate.objects.all().count()
        EmailTemplate.objects.all().delete()
        
        # Create new defaults
        created_count = EmailTemplate.create_default_templates()
        
        AuditLog.log(
            event_type='settings_changed',
            user=request.user,
            ip_address=get_client_ip(request),
            description=f'Recreated all email templates: deleted {deleted_count}, created {created_count}'
        )
        
        templates = EmailTemplate.objects.all()
        serializer = EmailTemplateListSerializer(templates, many=True)
        
        return Response({
            'success': True,
            'deleted_count': deleted_count,
            'created_count': created_count,
            'templates': serializer.data,
            'message': f'Recreated {created_count} templates'
        })
    except Exception as e:
        return Response({
            'success': False,
            'message': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def create_email_template(request):
    """Create a new custom email template"""
    try:
        template_type = request.data.get('template_type', '').strip()
        name = request.data.get('name', '').strip()
        subject = request.data.get('subject', '').strip()
        html_content = request.data.get('html_content', '').strip()
        text_content = request.data.get('text_content', '').strip()
        available_variables = request.data.get('available_variables', [])
        
        # Validation
        if not template_type:
            return Response({'error': 'Template type is required'}, status=status.HTTP_400_BAD_REQUEST)
        if not name:
            return Response({'error': 'Template name is required'}, status=status.HTTP_400_BAD_REQUEST)
        if not subject:
            return Response({'error': 'Subject line is required'}, status=status.HTTP_400_BAD_REQUEST)
        if not html_content:
            return Response({'error': 'HTML content is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if template type already exists
        if EmailTemplate.objects.filter(template_type=template_type).exists():
            return Response({'error': f'A template with type "{template_type}" already exists'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Create the template
        template = EmailTemplate.objects.create(
            template_type=template_type,
            name=name,
            subject=subject,
            html_content=html_content,
            text_content=text_content,
            available_variables=available_variables,
            is_active=True,
            updated_by=request.user
        )
        
        AuditLog.log(
            event_type='settings_changed',
            user=request.user,
            ip_address=get_client_ip(request),
            description=f'Created custom email template: {name}',
            details={'template_type': template_type}
        )
        
        serializer = EmailTemplateSerializer(template)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        return Response({
            'error': f'Failed to create template: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
@permission_classes([IsAdminUser])
def delete_email_template(request, template_id):
    """Delete a custom email template"""
    try:
        template = EmailTemplate.objects.get(id=template_id)
        
        # Check if it's a default template
        default_types = list(EmailTemplate._get_default_templates().keys())
        if template.template_type in default_types:
            return Response({
                'error': 'Cannot delete default templates. Use "Reset to Default" instead.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        template_name = template.name
        template_type = template.template_type
        template.delete()
        
        AuditLog.log(
            event_type='settings_changed',
            user=request.user,
            ip_address=get_client_ip(request),
            description=f'Deleted custom email template: {template_name}',
            details={'template_type': template_type}
        )
        
        return Response({
            'success': True,
            'message': f'Template "{template_name}" deleted successfully'
        })
        
    except EmailTemplate.DoesNotExist:
        return Response({'error': 'Template not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({
            'error': f'Failed to delete template: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
