from .models import User, LoginHistory
from .password_utils import get_password_policy, validate_password, get_password_requirements_text, check_password_strength
from .email_notifications import (
    send_welcome_email, 
    send_2fa_disabled_email,
    send_2fa_enabled_email,
    send_new_device_login_email,
    send_suspicious_login_email,
    send_account_locked_email,
    send_report_ready_email,
    send_system_announcement_email,
    is_new_device,
    get_location_from_ip,
    parse_user_agent
)
from django.contrib.auth import authenticate, login as auth_login, logout as auth_logout
from django.views.decorators.csrf import ensure_csrf_cookie
from django.core.mail import send_mail
from django.conf import settings
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.contrib.auth.tokens import default_token_generator
from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny
from rest_framework.response import Response
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db.models import Count, Q
from .serializers import UserSerializer, UserManagementSerializer
from .pagination import CustomPagination
import json
import re
from datetime import timedelta
import datetime
from django_ratelimit.decorators import ratelimit
import pyotp
import qrcode
import io
import base64
from django.core.mail import EmailMultiAlternatives
import ssl
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart


User = get_user_model()


def get_client_ip(request):
    """
    Get client IP address from request.
    Handles X-Forwarded-For header for proxied requests.
    """
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


def check_login_security(request, username=None):
    """
    Check login security before allowing login attempt.
    
    Returns: (allowed: bool, error_message: str, error_code: str)
    - allowed: True if login attempt is allowed
    - error_message: Human-readable error message if not allowed
    - error_code: Machine-readable error code for frontend handling
    """
    from .security_models import (
        SecuritySettings, IPWhitelist, IPBlacklist, 
        FailedLoginAttempt, AuditLog
    )
    
    settings_obj = SecuritySettings.get_settings()
    ip_address = get_client_ip(request)
    
    # Check IP Blacklist
    if settings_obj.enable_ip_blacklist:
        blacklisted = IPBlacklist.objects.filter(
            ip_address=ip_address,
            is_active=True
        ).first()
        
        if blacklisted and blacklisted.is_blocked():
            AuditLog.log(
                event_type='login_failed',
                ip_address=ip_address,
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                description=f'Login blocked - IP blacklisted: {ip_address}',
                severity='warning'
            )
            return False, 'Access denied. Your IP address has been blocked.', 'ip_blocked'
    
    # Check IP Whitelist (if enabled, ONLY whitelisted IPs can login)
    if settings_obj.enable_ip_whitelist:
        whitelisted = IPWhitelist.objects.filter(
            ip_address=ip_address,
            is_active=True
        ).exists()
        
        if not whitelisted:
            AuditLog.log(
                event_type='login_failed',
                ip_address=ip_address,
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                description=f'Login blocked - IP not whitelisted: {ip_address}',
                severity='warning'
            )
            return False, 'Access denied. Your IP address is not authorized.', 'ip_not_whitelisted'
    
    # Check for too many failed attempts (account lockout)
    if settings_obj.max_failed_attempts > 0:
        lockout_minutes = settings_obj.lockout_duration_minutes
        
        # Check by IP
        ip_attempts = FailedLoginAttempt.get_recent_attempts(
            ip_address=ip_address,
            minutes=lockout_minutes
        )
        
        if ip_attempts >= settings_obj.max_failed_attempts:
            # Calculate remaining lockout time
            oldest_attempt = FailedLoginAttempt.objects.filter(
                ip_address=ip_address,
                attempted_at__gte=timezone.now() - timedelta(minutes=lockout_minutes)
            ).order_by('attempted_at').first()
            
            if oldest_attempt:
                unlock_time = oldest_attempt.attempted_at + timedelta(minutes=lockout_minutes)
                remaining_minutes = max(1, int((unlock_time - timezone.now()).total_seconds() / 60))
            else:
                remaining_minutes = lockout_minutes
            
            return False, f'Too many failed login attempts. Please try again in {remaining_minutes} minute(s).', 'account_locked'
        
        # Check by username (if provided)
        if username:
            username_attempts = FailedLoginAttempt.get_recent_attempts(
                username=username,
                minutes=lockout_minutes
            )
            
            if username_attempts >= settings_obj.max_failed_attempts:
                oldest_attempt = FailedLoginAttempt.objects.filter(
                    username=username,
                    attempted_at__gte=timezone.now() - timedelta(minutes=lockout_minutes)
                ).order_by('attempted_at').first()
                
                if oldest_attempt:
                    unlock_time = oldest_attempt.attempted_at + timedelta(minutes=lockout_minutes)
                    remaining_minutes = max(1, int((unlock_time - timezone.now()).total_seconds() / 60))
                else:
                    remaining_minutes = lockout_minutes
                
                return False, f'This account is temporarily locked due to too many failed login attempts. Please try again in {remaining_minutes} minute(s).', 'account_locked'
    
    return True, None, None


def record_failed_login(request, username, reason='invalid_password'):
    """
    Record a failed login attempt.
    Sends suspicious activity email after 3+ failed attempts.
    """
    from .security_models import FailedLoginAttempt, AuditLog, SecuritySettings
    
    ip_address = get_client_ip(request)
    user_agent = request.META.get('HTTP_USER_AGENT', '')
    
    # Record the failed attempt
    FailedLoginAttempt.objects.create(
        username=username,
        ip_address=ip_address,
        user_agent=user_agent,
        reason=reason
    )
    
    # Log to audit
    AuditLog.log(
        event_type='login_failed',
        ip_address=ip_address,
        user_agent=user_agent,
        description=f'Failed login attempt for {username}: {reason}',
        severity='warning'
    )
    
    # Check if this triggers a lockout or suspicious activity notification
    settings_obj = SecuritySettings.get_settings()
    if settings_obj.max_failed_attempts > 0:
        attempts = FailedLoginAttempt.get_recent_attempts(
            username=username,
            minutes=settings_obj.lockout_duration_minutes
        )
        
        # Send suspicious activity email after 3 failed attempts (before lockout)
        if attempts >= 3:
            try:
                # Try to find the user to send email
                user = None
                if '@' in username:
                    user = User.objects.filter(email__iexact=username).first()
                else:
                    user = User.objects.filter(username__iexact=username).first()
                
                if user:
                    send_suspicious_login_email(user, ip_address, user_agent, attempts)
            except Exception as e:
                print(f"Failed to send suspicious login email: {e}")
        
        if attempts >= settings_obj.max_failed_attempts:
            AuditLog.log(
                event_type='user_locked',
                ip_address=ip_address,
                user_agent=user_agent,
                description=f'Account locked due to {attempts} failed login attempts: {username}',
                severity='critical'
            )
            
            # Send account locked email
            try:
                user = None
                if '@' in username:
                    user = User.objects.filter(email__iexact=username).first()
                else:
                    user = User.objects.filter(username__iexact=username).first()
                
                if user:
                    send_account_locked_email(
                        user, ip_address, user_agent, 
                        attempts, settings_obj.lockout_duration_minutes
                    )
            except Exception as e:
                print(f"Failed to send account locked email: {e}")


def clear_failed_attempts(username, ip_address=None):
    """
    Clear failed login attempts after successful login.
    """
    from .security_models import FailedLoginAttempt
    
    # Clear attempts for this username
    FailedLoginAttempt.objects.filter(username=username).delete()
    
    # Optionally clear attempts for this IP
    if ip_address:
        FailedLoginAttempt.objects.filter(ip_address=ip_address).delete()


def manage_user_sessions(user, request):
    """
    Manage user sessions based on security settings.
    - Enforces max_concurrent_sessions limit
    - Handles single_session_mode
    - Creates new session tracking record
    
    Returns: (success: bool, message: str)
    """
    from .security_models import SecuritySettings, UserSession, AuditLog
    from django.contrib.sessions.models import Session
    
    settings = SecuritySettings.get_settings()
    session_key = request.session.session_key
    
    # Get user agent info for session tracking
    user_agent = request.META.get('HTTP_USER_AGENT', '')
    ip_address = request.META.get('REMOTE_ADDR')
    
    # Parse device info from user agent
    device_type = 'unknown'
    browser = ''
    os_name = ''
    
    if user_agent:
        user_agent_lower = user_agent.lower()
        # Detect device type
        if 'mobile' in user_agent_lower or 'android' in user_agent_lower:
            device_type = 'mobile'
        elif 'tablet' in user_agent_lower or 'ipad' in user_agent_lower:
            device_type = 'tablet'
        else:
            device_type = 'desktop'
        
        # Detect browser
        if 'chrome' in user_agent_lower and 'edg' not in user_agent_lower:
            browser = 'Chrome'
        elif 'firefox' in user_agent_lower:
            browser = 'Firefox'
        elif 'safari' in user_agent_lower and 'chrome' not in user_agent_lower:
            browser = 'Safari'
        elif 'edg' in user_agent_lower:
            browser = 'Edge'
        else:
            browser = 'Other'
        
        # Detect OS
        if 'windows' in user_agent_lower:
            os_name = 'Windows'
        elif 'mac' in user_agent_lower:
            os_name = 'macOS'
        elif 'linux' in user_agent_lower:
            os_name = 'Linux'
        elif 'android' in user_agent_lower:
            os_name = 'Android'
        elif 'iphone' in user_agent_lower or 'ipad' in user_agent_lower:
            os_name = 'iOS'
        else:
            os_name = 'Other'
    
    # Get existing sessions for this user
    existing_sessions = UserSession.objects.filter(user=user).order_by('-last_activity')
    
    # Handle Single Session Mode
    if settings.single_session_mode:
        # Terminate all existing sessions
        for old_session in existing_sessions:
            try:
                Session.objects.filter(session_key=old_session.session_key).delete()
                old_session.delete()
                
                AuditLog.log(
                    event_type='session_terminated',
                    user=user,
                    ip_address=ip_address,
                    description=f'Session terminated due to single session mode (new login)',
                    severity='info'
                )
            except Exception as e:
                print(f"Error terminating session: {e}")
    
    # Handle Max Concurrent Sessions
    elif settings.max_concurrent_sessions > 0:
        current_count = existing_sessions.count()
        
        if current_count >= settings.max_concurrent_sessions:
            # Terminate oldest sessions to make room
            sessions_to_remove = current_count - settings.max_concurrent_sessions + 1
            oldest_sessions = existing_sessions.order_by('last_activity')[:sessions_to_remove]
            
            for old_session in oldest_sessions:
                try:
                    Session.objects.filter(session_key=old_session.session_key).delete()
                    old_session.delete()
                    
                    AuditLog.log(
                        event_type='session_terminated',
                        user=user,
                        ip_address=ip_address,
                        description=f'Session terminated due to max concurrent sessions limit',
                        severity='info'
                    )
                except Exception as e:
                    print(f"Error terminating session: {e}")
    
    # Create new session tracking record
    if session_key:
        UserSession.objects.update_or_create(
            session_key=session_key,
            defaults={
                'user': user,
                'device_type': device_type,
                'browser': browser,
                'os': os_name,
                'ip_address': ip_address,
                'device_name': f"{browser} on {os_name}",
                'is_current': True,
            }
        )
        
        # Mark other sessions as not current
        UserSession.objects.filter(user=user).exclude(session_key=session_key).update(is_current=False)
        
        AuditLog.log(
            event_type='session_created',
            user=user,
            ip_address=ip_address,
            user_agent=user_agent,
            description=f'New session created for {user.username}',
            severity='info'
        )
    
    return True, 'Session created successfully'


def send_email_with_ssl_fix(to_email, subject, text_message, html_message=None):
    """
    Helper function to send email with SSL certificate verification disabled.
    This fixes the SSL: CERTIFICATE_VERIFY_FAILED error in development.
    """
    try:
        # Create unverified SSL context for development
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE
        
        if html_message:
            msg = MIMEMultipart('alternative')
            msg.attach(MIMEText(text_message, 'plain'))
            msg.attach(MIMEText(html_message, 'html'))
        else:
            msg = MIMEMultipart()
            msg.attach(MIMEText(text_message, 'plain'))
        
        msg['Subject'] = subject
        msg['From'] = settings.DEFAULT_FROM_EMAIL
        msg['To'] = to_email
        
        with smtplib.SMTP(settings.EMAIL_HOST, settings.EMAIL_PORT) as server:
            server.starttls(context=ssl_context)
            server.login(settings.EMAIL_HOST_USER, settings.EMAIL_HOST_PASSWORD)
            server.sendmail(settings.EMAIL_HOST_USER, [to_email], msg.as_string())
        
        return True, None
    except Exception as e:
        return False, str(e)

def broadcast_user_status(user_id, username, is_online):
    """
    Broadcast user online/offline status via WebSocket
    """
    try:
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync

        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            "user_status",
            {
                "type": "user_status_update",
                "user_id": user_id,
                "username": username,
                "is_online": is_online
            }
        )
        print(f"✅ Broadcasted status: User {username} is {'ONLINE' if is_online else 'OFFLINE'}")
    except Exception as e:
        print(f"⚠️ Failed to broadcast user status: {e}")


def generate_username_suggestions(first_name='', last_name='', email=''):
    """
    Generate username suggestions based on user info
    """
    suggestions = []

    # Extract email username part
    email_base = email.split('@')[0] if email else ''

    # Create base suggestions
    if first_name and last_name:
        base = f"{first_name.lower()}.{last_name.lower()}"
        suggestions.append(base)
        suggestions.append(f"{first_name.lower()}{last_name.lower()}")
        suggestions.append(f"{first_name[0].lower()}{last_name.lower()}")

    if email_base:
        suggestions.append(email_base.lower())

    if first_name:
        suggestions.append(first_name.lower())

    # Add numbers to make unique
    final_suggestions = []
    for base in suggestions[:3]:  # Take top 3 base suggestions
        # Clean the base (remove special characters)
        clean_base = re.sub(r'[^a-z0-9]', '', base)

        if not User.objects.filter(username=clean_base).exists():
            final_suggestions.append(clean_base)

        # Add variations with numbers
        for num in range(1, 100):
            username = f"{clean_base}{num}"
            if not User.objects.filter(username=username).exists():
                final_suggestions.append(username)
                if len(final_suggestions) >= 3:
                    break

        if len(final_suggestions) >= 3:
            break

    return final_suggestions[:3]


@api_view(['POST'])
@permission_classes([AllowAny])
def check_email_availability(request):
    """
    Check if email is available
    """
    email = request.data.get('email', '').strip().lower()
    user_id = request.data.get('user_id', None)  # For edit mode

    if not email:
        return Response({
            'available': False,
            'message': 'Email is required'
        }, status=status.HTTP_400_BAD_REQUEST)

    # Check if email exists (excluding current user if editing)
    query = User.objects.filter(email__iexact=email)
    if user_id:
        query = query.exclude(pk=user_id)

    is_available = not query.exists()

    response_data = {
        'available': is_available,
        'email': email,
    }

    if is_available:
        response_data['message'] = 'Email is available'
    else:
        response_data[
            'message'] = 'An account with this email already exists. Only one user can be registered per email address. Please use a different email or contact support if you need assistance.'

    return Response(response_data)


@api_view(['POST'])
@permission_classes([AllowAny])
def check_username_availability(request):
    """
    Check if username is available and suggest alternatives
    """
    username = request.data.get('username', '').strip().lower()
    first_name = request.data.get('first_name', '')
    last_name = request.data.get('last_name', '')
    email = request.data.get('email', '')

    if not username:
        return Response({
            'available': False,
            'message': 'Username is required'
        }, status=status.HTTP_400_BAD_REQUEST)

    # Check if username exists
    is_available = not User.objects.filter(username__iexact=username).exists()

    response_data = {
        'available': is_available,
        'username': username,
    }

    if is_available:
        response_data['message'] = 'Username is available'
    else:
        response_data['message'] = 'Someone already has that username. Try another?'
        # Generate suggestions
        suggestions = generate_username_suggestions(first_name, last_name, email)
        # Filter out the taken username
        suggestions = [s for s in suggestions if s != username.lower()]
        response_data['suggestions'] = suggestions

    return Response(response_data)


@api_view(['POST'])
@permission_classes([AllowAny])
def generate_username(request):
    """
    Generate username suggestions based on user info
    """
    first_name = request.data.get('first_name', '')
    last_name = request.data.get('last_name', '')
    email = request.data.get('email', '')

    suggestions = generate_username_suggestions(first_name, last_name, email)

    return Response({
        'suggestions': suggestions
    })


@api_view(['POST'])
@permission_classes([IsAdminUser])
def create_user_send_email(request):
    """
    Create user without password and send password creation link.
    Uses the 'user_invited' email template from EmailTemplate system.
    """
    from .email_models import EmailTemplate, EmailBranding
    
    serializer = UserManagementSerializer(data=request.data)

    if serializer.is_valid():
        # Create user without password
        user = serializer.save()
        # Password is already set as unusable in serializer.create()

        # Generate password reset token
        token = default_token_generator.make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))

        # Create password creation link
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
        password_link = f"{frontend_url}/create-password/{uid}/{token}/"

        # Get role display name
        role_display = {
            'CLIENT': 'Client',
            'DATA_COLLECTOR': 'Data Collector',
            'STAFF_ADMIN': 'Staff Admin',
            'SUPERADMIN': 'Super Admin',
            'GUEST': 'Guest'
        }.get(user.role, user.role)

        # Try to use EmailTemplate system first
        template = EmailTemplate.get_template('user_invited')
        
        if template:
            # Use the EmailTemplate system
            context_data = {
                'user_name': user.first_name or user.username,
                'user_email': user.email,
                'role': role_display,
                'invite_url': password_link,
                'expiry_hours': '24',
            }
            
            success = template.send_email(user.email, context_data)
            
            if success:
                return Response({
                    'success': True,
                    'message': 'User created successfully. Password creation email sent.',
                    'user': UserSerializer(user).data
                }, status=status.HTTP_201_CREATED)
            else:
                # If email fails, delete the user and return error
                user.delete()
                return Response({
                    'success': False,
                    'message': 'Failed to send email. Please try again.'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        else:
            # Fallback: Use inline template if EmailTemplate not found
            branding = EmailBranding.get_branding()
            current_year = datetime.datetime.now().year
            
            subject = f'Welcome to {branding.company_name} - Set Up Your Account'
            
            # Plain text version (fallback)
            text_message = f"""Welcome to {branding.company_name}!

Dear {user.first_name or user.username},

Your {role_display} account has been created on {branding.company_name}. We're excited to have you on board!

To get started, please set up your password by clicking the link below:
{password_link}

What happens next:
- Create a secure password for your account
- Set up Two-Factor Authentication for enhanced security
- Complete your profile information
- Start using the platform!

Note: This link will expire in 24 hours. If you didn't expect this email, please contact support.

Warm regards,
{branding.company_name} Team"""

            # Professional HTML version
            html_message = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to {branding.company_name}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); max-width: 600px; overflow: hidden;">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, {branding.primary_color} 0%, {branding.secondary_color} 100%); padding: 50px 40px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
                                Welcome to {branding.company_name}
                            </h1>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 40px 20px 40px;">
                            <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: {branding.primary_color}; font-weight: 500;">
                                Dear {user.first_name or user.username},
                            </p>

                            <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                                Your <strong>{role_display}</strong> account has been created on {branding.company_name}. We're excited to have you on board!
                            </p>

                            <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                                To get started, please set up your password by clicking the button below:
                            </p>

                            <!-- Set Up Account Button -->
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" style="padding: 20px 0;">
                                        <a href="{password_link}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, {branding.primary_color} 0%, {branding.secondary_color} 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(139, 92, 246, 0.3);">
                                            Set Up Your Account
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <!-- What Happens Next -->
                            <div style="border-left: 4px solid #dc2626; padding: 15px 20px; margin: 25px 0; background-color: #ffffff;">
                                <p style="margin: 0 0 15px 0; font-size: 15px; font-weight: 600; color: #1a1a1a;">
                                    What happens next:
                                </p>
                                <ul style="margin: 0; padding-left: 20px; color: #4a4a4a; font-size: 14px; line-height: 1.8;">
                                    <li>Create a secure password for your account</li>
                                    <li>Set up Two-Factor Authentication for enhanced security</li>
                                    <li>Complete your profile information</li>
                                    <li>Start using the platform!</li>
                                </ul>
                            </div>

                            <!-- Note -->
                            <p style="margin: 25px 0; font-size: 14px; line-height: 1.6; color: #4a4a4a;">
                                <strong>Note:</strong> This link will expire in <strong>24 hours</strong>. If you didn't expect this email, please contact support.
                            </p>

                            <!-- Fallback Link -->
                            <p style="margin: 0 0 10px 0; font-size: 13px; color: #6b7280;">
                                Or copy and paste this link into your browser:
                            </p>
                            <p style="margin: 0; font-size: 13px; word-break: break-all;">
                                <a href="{password_link}" style="color: {branding.primary_color}; text-decoration: none;">{password_link}</a>
                            </p>
                        </td>
                    </tr>

                    <!-- Signature -->
                    <tr>
                        <td style="padding: 20px 40px 30px 40px;">
                            <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #4a4a4a;">
                                Warm regards,<br>
                                <strong style="color: {branding.primary_color};">{branding.company_name} Team</strong>
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 30px 40px; border-top: 1px solid #e5e7eb;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center">
                                        <p style="margin: 0 0 5px 0; font-size: 14px; font-weight: 600; color: #1a1a1a;">
                                            {branding.company_name}
                                        </p>
                                        <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                                            {branding.footer_text}
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>"""

            success, error = send_email_with_ssl_fix(user.email, subject, text_message, html_message)
            
            if success:
                return Response({
                    'success': True,
                    'message': 'User created successfully. Password creation email sent.',
                    'user': UserSerializer(user).data
                }, status=status.HTTP_201_CREATED)
            else:
                # If email fails, delete the user and return error
                user.delete()
                return Response({
                    'success': False,
                    'message': f'Failed to send email: {error}'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def validate_password_token(request, uidb64, token):
    """
    Validate password creation token
    """
    try:
        uid = force_str(urlsafe_base64_decode(uidb64))
        user = User.objects.get(pk=uid)
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        return Response({
            'valid': False,
            'message': 'Invalid link'
        }, status=status.HTTP_400_BAD_REQUEST)

    if default_token_generator.check_token(user, token):
        return Response({
            'valid': True,
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'phone_number': user.phone_number,
                'company_name': user.company_name,
                'role': user.role,
            }
        })

    return Response({
        'valid': False,
        'message': 'Link has expired or is invalid'
    }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def create_password(request, uidb64, token):
    """
    Create password for new user - uses dynamic password policy
    """
    try:
        uid = force_str(urlsafe_base64_decode(uidb64))
        user = User.objects.get(pk=uid)
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        return Response({
            'success': False,
            'message': 'Invalid link'
        }, status=status.HTTP_400_BAD_REQUEST)

    if not default_token_generator.check_token(user, token):
        return Response({
            'success': False,
            'message': 'Link has expired or is invalid'
        }, status=status.HTTP_400_BAD_REQUEST)

    password = request.data.get('password')

    if not password:
        return Response({
            'success': False,
            'message': 'Password is required'
        }, status=status.HTTP_400_BAD_REQUEST)

    # Validate password using dynamic policy
    is_valid, errors = validate_password(password, user)
    
    if not is_valid:
        return Response({
            'success': False,
            'message': errors[0] if errors else 'Password does not meet requirements',
            'errors': errors
        }, status=status.HTTP_400_BAD_REQUEST)

    # Set password and track change time
    user.set_password(password)
    user.password_changed_at = timezone.now()
    user.save()

    return Response({
        'success': True,
        'message': 'Password created successfully',
        'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'role': user.role,
        }
    })


class UserViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows staff users to be viewed or edited.
    Supports filtering by role, searching, and ordering.
    """
    queryset = User.objects.all().order_by('-date_joined')
    permission_classes = [IsAdminUser]
    pagination_class = CustomPagination
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['role', 'is_active']
    search_fields = ['username', 'email', 'first_name', 'last_name', 'company_name']
    ordering_fields = [
        'username',
        'email',
        'first_name',
        'last_name',
        'company_name',
        'role',
        'is_active',
        'date_joined',
        'last_login'
    ]

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return UserManagementSerializer
        return UserSerializer


@api_view(['POST'])
@ensure_csrf_cookie
def login_view(request):
    """
    Login view with Email 2FA support, Remember Me, and real-time status updates.
    Includes login security: IP whitelist/blacklist, failed attempt lockout.
    """
    data = request.data
    username_or_email = data.get('username', '').strip()
    password = data.get('password', '')
    remember_me = data.get('remember_me', False)

    # ===== SECURITY CHECK: IP whitelist/blacklist and lockout =====
    allowed, error_message, error_code = check_login_security(request, username_or_email)
    if not allowed:
        return Response({
            'error': error_message,
            'error_code': error_code,
        }, status=status.HTTP_403_FORBIDDEN)

    # Try to determine if input is email or username
    user = None
    attempted_user = None

    if '@' in username_or_email:
        try:
            user_obj = User.objects.get(email__iexact=username_or_email)
            user = authenticate(request, username=user_obj.username, password=password)
            if user is None:
                attempted_user = user_obj
        except User.DoesNotExist:
            user = None
    else:
        user = authenticate(request, username=username_or_email, password=password)
        if user is None:
            try:
                attempted_user = User.objects.get(username__iexact=username_or_email)
            except User.DoesNotExist:
                pass

    if user is None and '@' not in username_or_email:
        try:
            user_obj = User.objects.get(email__iexact=username_or_email)
            user = authenticate(request, username=user_obj.username, password=password)
            if user is None:
                attempted_user = user_obj
        except User.DoesNotExist:
            user = None

    # ===== FAILED LOGIN: Record attempt =====
    if user is None:
        # Determine the reason for failure
        if attempted_user is not None:
            reason = 'invalid_password'
        else:
            reason = 'invalid_username'
        
        record_failed_login(request, username_or_email, reason)
        
        return Response({
            'error': 'Invalid username or password',
            'error_code': 'invalid_credentials',
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    # ===== SUCCESSFUL AUTH: Clear failed attempts and continue =====
    clear_failed_attempts(user.username, get_client_ip(request))
    
    # Check if password is expired
    if user.is_password_expired():
        days_expired = 0
        if user.password_changed_at:
            from .security_models import SecuritySettings
            settings = SecuritySettings.get_settings()
            from datetime import timedelta
            expiry_date = user.password_changed_at + timedelta(days=settings.password_expiry_days)
            days_expired = (timezone.now() - expiry_date).days
        
        return Response({
            'password_expired': True,
            'username': user.username,
            'days_expired': days_expired,
            'message': 'Your password has expired. Please change your password to continue.'
        })
    
    # Check if 2FA is enabled
    if user.two_factor_enabled:
        from .email_models import EmailBranding
        
        # Generate and send code
        code = user.generate_2fa_code()
        
        # Get branding
        branding = EmailBranding.get_branding()
        current_year = datetime.datetime.now().year

        subject = f'Your Login Verification Code - {branding.company_name}'

        # Plain text version (fallback)
        text_message = f"""
Hello {user.first_name or user.username},

Your verification code is: {code}

This code will expire in 10 minutes.

If you didn't try to log in, please secure your account immediately.

Best regards,
{branding.company_name} Team
        """

        # Professional HTML version (matching Welcome email design)
        html_message = f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Login Verification Code</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); max-width: 600px; overflow: hidden;">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, {branding.primary_color} 0%, #7c3aed 100%); padding: 40px 40px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
                                Your Login Verification Code
                            </h1>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 40px 20px 40px;">
                            <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: {branding.primary_color}; font-weight: 500;">
                                Hello {user.first_name or user.username},
                            </p>

                            <p style="margin: 0 0 30px 0; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                                We received a login attempt for your {branding.company_name} account. 
                                Use the verification code below to complete your login:
                            </p>

                            <!-- Verification Code Box -->
                            <div style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border: 2px dashed {branding.primary_color}; border-radius: 12px; padding: 30px; text-align: center; margin: 20px 0 30px 0;">
                                <div style="font-size: 42px; font-weight: bold; color: {branding.primary_color}; letter-spacing: 12px; font-family: 'Courier New', monospace;">
                                    {code}
                                </div>
                            </div>

                            <p style="margin: 30px 0 10px 0; font-size: 14px; line-height: 1.6; color: #6b7280;">
                                This code will expire in <strong>10 minutes</strong>.
                            </p>

                            <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #6b7280;">
                                If you didn't try to log in, please secure your account immediately by changing your password.
                            </p>
                        </td>
                    </tr>

                    <!-- Signature -->
                    <tr>
                        <td style="padding: 20px 40px 30px 40px;">
                            <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #4a4a4a;">
                                Warm regards,<br>
                                <strong style="color: {branding.primary_color};">{branding.company_name} Team</strong>
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 30px 40px; border-top: 1px solid #e5e7eb;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center">
                                        <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #1a1a1a;">
                                            {branding.company_name}
                                        </p>
                                        <p style="margin: 0 0 15px 0; font-size: 12px; color: #6b7280;">
                                            Professional Data Collection & Site Management
                                        </p>
                                        <p style="margin: 0; font-size: 11px; color: #9ca3af;">
                                            This email was sent from an automated system. Please do not reply directly to this email.
                                        </p>
                                        <p style="margin: 10px 0 0 0; font-size: 11px; color: #9ca3af;">
                                            © {current_year} {branding.company_name}. All rights reserved.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
        """

        try:
            success, error = send_email_with_ssl_fix(user.email, subject, text_message, html_message)
            if not success:
                return Response({
                    'error': f'Failed to send verification code: {error}'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except Exception as e:
            return Response({
                'error': 'Failed to send verification code. Please try again.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Don't login yet, require 2FA code
        return Response({
            'requires_2fa': True,
            'username': user.username,
            'email': user.email,
            'message': f'Verification code sent to {user.email}'
        })

    # Check if 2FA setup is required (first login)
    if user.is_2fa_setup_required:
        # Login but flag that 2FA setup is required
        auth_logout(request)
        auth_login(request, user)

        # Store remember_me flag and set session expiry
        request.session['remember_me'] = remember_me
        request.session['last_activity'] = timezone.now().isoformat()
        
        if remember_me:
            # Remember for 30 days
            request.session.set_expiry(2592000)  # 30 days in seconds
        else:
            # Session expires when browser closes
            request.session.set_expiry(0)
        
        # Manage sessions (enforce limits, track session)
        manage_user_sessions(user, request)

        user.update_last_activity()

        # SET USER ONLINE
        user.is_online = True
        user.save(update_fields=['is_online'])

        # BROADCAST STATUS
        broadcast_user_status(user.id, user.username, True)

        user.record_login(
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT')
        )

        # Log successful login (2FA setup required)
        from .security_models import AuditLog
        AuditLog.log(
            event_type='login_success',
            user=user,
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            description=f'User {user.username} logged in (2FA setup required)',
            severity='info'
        )

        return Response({
            'requires_2fa_setup': True,
            'user': UserSerializer(user).data,
            'message': '2FA setup required'
        })

    # Regular login without 2FA
    auth_logout(request)
    auth_login(request, user)

    # Store remember_me flag and set session expiry
    request.session['remember_me'] = remember_me
    request.session['last_activity'] = timezone.now().isoformat()
    
    if remember_me:
        # Remember for 30 days
        request.session.set_expiry(2592000)  # 30 days in seconds
    else:
        # Session expires when browser closes
        request.session.set_expiry(0)
    
    # Manage sessions (enforce limits, track session)
    manage_user_sessions(user, request)

    user.update_last_activity()

    # SET USER ONLINE
    user.is_online = True
    user.save(update_fields=['is_online'])

    # BROADCAST STATUS
    broadcast_user_status(user.id, user.username, True)

    user.record_login(
        ip_address=request.META.get('REMOTE_ADDR'),
        user_agent=request.META.get('HTTP_USER_AGENT')
    )

    # Log successful login
    from .security_models import AuditLog
    ip_address = request.META.get('REMOTE_ADDR')
    user_agent = request.META.get('HTTP_USER_AGENT', '')
    
    AuditLog.log(
        event_type='login_success',
        user=user,
        ip_address=ip_address,
        user_agent=user_agent,
        description=f'User {user.username} logged in successfully',
        severity='info'
    )

    # Check if this is a new device and send notification
    try:
        if is_new_device(user, user_agent):
            send_new_device_login_email(user, ip_address, user_agent)
    except Exception as e:
        print(f"Failed to send new device login email: {e}")

    serializer = UserSerializer(user)

    return Response({
        'user': serializer.data,
        'message': 'Login successful'
    })


@api_view(['POST'])
def logout_view(request):
    """
    Logout view with real-time status updates and session cleanup
    """
    user = request.user
    session_key = request.session.session_key if hasattr(request, 'session') else None

    if user.is_authenticated:
        # Clean up session tracking
        if session_key:
            from .security_models import UserSession, AuditLog
            try:
                UserSession.objects.filter(session_key=session_key).delete()
                AuditLog.log(
                    event_type='logout',
                    user=user,
                    ip_address=request.META.get('REMOTE_ADDR'),
                    description=f'User {user.username} logged out',
                    severity='info'
                )
            except Exception as e:
                print(f"Error cleaning up session: {e}")
        
        # SET USER OFFLINE
        user.is_online = False
        user.save(update_fields=['is_online'])

        # BROADCAST STATUS
        broadcast_user_status(user.id, user.username, False)

    auth_logout(request)
    return Response({'message': 'Logged out successfully'})


@api_view(['POST'])
@ensure_csrf_cookie
def signup_view(request):
    serializer = UserManagementSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def user_profile_view(request):
    """
    Get or update current user's profile
    """
    if request.method == 'GET':
        request.user.update_last_activity()
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    elif request.method == 'PATCH':
        # Update user profile
        serializer = UserManagementSerializer(
            request.user,
            data=request.data,
            partial=True
        )
        if serializer.is_valid():
            serializer.save()
            return Response(UserSerializer(request.user).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@ensure_csrf_cookie
@permission_classes([AllowAny])
def csrf_view(request):
    """
    Return CSRF token for client
    """
    return Response({
        'detail': 'CSRF cookie set'
    })


@api_view(['POST'])
@ensure_csrf_cookie
@permission_classes([AllowAny])
def signup_with_verification(request):
    """
    Create user account and send email verification link
    User account will be inactive until email is verified
    """
    serializer = UserManagementSerializer(data=request.data)

    if serializer.is_valid():
        # Create user with inactive status
        user = serializer.save()
        user.is_active = False  # Set inactive until email verified
        user.save()

        # Generate email verification token
        token = default_token_generator.make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))

        # Create verification link
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
        verification_link = f"{frontend_url}/verify-email/{uid}/{token}/"

        # Send verification email
        subject = 'Verify Your Email - A Data'
        message = f"""
Hello {user.first_name or user.username},

Thank you for signing up for A Data!

Please verify your email address by clicking the link below:

{verification_link}

This link will expire in 24 hours.

If you didn't create an account, please ignore this email.

Best regards,
A Data Team
        """

        try:
            success, error = send_email_with_ssl_fix(user.email, subject, message)
            
            if success:
                return Response({
                    'success': True,
                    'message': 'Account created successfully. Please check your email to verify your account.',
                    'email': user.email
                }, status=status.HTTP_201_CREATED)
            else:
                # If email fails, delete the user
                user.delete()
                return Response({
                    'success': False,
                    'message': f'Failed to send verification email: {error}'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        except Exception as e:
            # If email fails, delete the user
            user.delete()
            return Response({
                'success': False,
                'message': f'Failed to send verification email: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def verify_email(request, uidb64, token):
    """
    Verify user's email and activate their account
    """
    try:
        uid = force_str(urlsafe_base64_decode(uidb64))
        user = User.objects.get(pk=uid)
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        return Response({
            'success': False,
            'message': 'Invalid verification link'
        }, status=status.HTTP_400_BAD_REQUEST)

    if user.is_active:
        return Response({
            'success': False,
            'message': 'This account is already verified'
        }, status=status.HTTP_400_BAD_REQUEST)

    if default_token_generator.check_token(user, token):
        user.is_active = True
        user.save()

        return Response({
            'success': True,
            'message': 'Email verified successfully! You can now log in.',
            'user': {
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
            }
        })

    return Response({
        'success': False,
        'message': 'Verification link has expired or is invalid'
    }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def resend_verification_email(request):
    """
    Resend verification email to user
    """
    email = request.data.get('email', '').strip().lower()

    if not email:
        return Response({
            'success': False,
            'message': 'Email is required'
        }, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.get(email__iexact=email)

        if user.is_active:
            return Response({
                'success': False,
                'message': 'This account is already verified'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Generate new token
        token = default_token_generator.make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))

        # Create verification link
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
        verification_link = f"{frontend_url}/verify-email/{uid}/{token}/"

        # Send email
        subject = 'Verify Your Email - A Data'
        message = f"""
Hello {user.first_name or user.username},

Here is your new email verification link:

{verification_link}

This link will expire in 24 hours.

Best regards,
A Data Team
        """

        success, error = send_email_with_ssl_fix(user.email, subject, message)
        
        if success:
            return Response({
                'success': True,
                'message': 'Verification email sent successfully'
            })
        else:
            return Response({
                'success': False,
                'message': f'Failed to send email: {error}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    except User.DoesNotExist:
        return Response({
            'success': False,
            'message': 'No account found with this email address'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({
            'success': False,
            'message': f'Failed to send email: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def disable_2fa(request):
    """
    Disable 2FA for user (requires password confirmation)
    Sends security notification email when 2FA is disabled
    """
    user = request.user
    password = request.data.get('password', '')

    # Verify password
    if not user.check_password(password):
        return Response(
            {'success': False, 'message': 'Invalid password'},
            status=status.HTTP_400_BAD_REQUEST
        )

    user.two_factor_enabled = False
    user.clear_2fa_code()
    user.save()

    # Send security notification email
    try:
        ip_address = get_client_ip(request)
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        send_2fa_disabled_email(user, ip_address, user_agent)
    except Exception as e:
        print(f"Failed to send 2FA disabled notification: {e}")

    # Log to audit
    from .security_models import AuditLog
    AuditLog.log(
        event_type='2fa_disabled',
        user=user,
        ip_address=get_client_ip(request),
        user_agent=request.META.get('HTTP_USER_AGENT', ''),
        description=f'2FA disabled for user {user.username}',
        severity='warning'
    )

    return Response({
        'success': True,
        'message': '2FA disabled successfully'
    })


@api_view(['POST'])
@ensure_csrf_cookie
def verify_2fa_login(request):
    """
    Verify 2FA code during login with Remember Me and real-time status updates
    """
    username = request.data.get('username', '')
    code = request.data.get('code', '')
    remember_me = request.data.get('remember_me', False)  # NEW: Get remember_me flag

    if not username or not code:
        return Response(
            {'success': False, 'message': 'Username and code are required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        # Find user
        if '@' in username:
            user = User.objects.get(email__iexact=username)
        else:
            user = User.objects.get(username__iexact=username)
    except User.DoesNotExist:
        return Response(
            {'success': False, 'message': 'Invalid credentials'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Verify code
    if user.verify_2fa_code(code):
        # Clear the code
        user.clear_2fa_code()

        # Login user
        auth_login(request, user)

        # Store remember_me flag and set session expiry
        request.session['remember_me'] = remember_me
        request.session['last_activity'] = timezone.now().isoformat()
        
        if remember_me:
            # Remember for 30 days
            request.session.set_expiry(2592000)  # 30 days in seconds
        else:
            # Session expires when browser closes
            request.session.set_expiry(0)
        
        # Manage sessions (enforce limits, track session)
        manage_user_sessions(user, request)

        user.update_last_activity()

        # SET USER ONLINE
        user.is_online = True
        user.save(update_fields=['is_online'])

        # BROADCAST STATUS
        broadcast_user_status(user.id, user.username, True)

        user.record_login(
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT')
        )

        # Log successful login after 2FA verification
        from .security_models import AuditLog
        ip_address = request.META.get('REMOTE_ADDR')
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        
        AuditLog.log(
            event_type='login_success',
            user=user,
            ip_address=ip_address,
            user_agent=user_agent,
            description=f'User {user.username} logged in after 2FA verification',
            severity='info'
        )

        # Check if this is a new device and send notification
        try:
            if is_new_device(user, user_agent):
                send_new_device_login_email(user, ip_address, user_agent)
        except Exception as e:
            print(f"Failed to send new device login email: {e}")

        return Response({
            'success': True,
            'user': UserSerializer(user).data,
            'message': 'Login successful'
        })
    else:
        # RECORD FAILED 2FA ATTEMPT
        LoginHistory.objects.create(
            user=user,
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT'),
            success=False
        )
        
        # Log failed 2FA attempt
        from .security_models import AuditLog
        AuditLog.log(
            event_type='2fa_failed',
            user=user,
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            description=f'Failed 2FA verification for {user.username}',
            severity='warning'
        )
        
        return Response(
            {'success': False, 'message': 'Invalid or expired code'},
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    """
    Change user password - uses dynamic password policy with history check
    Sends password change confirmation email on success
    """
    from .security_models import PasswordHistory
    from .email_models import EmailTemplate, EmailBranding
    
    user = request.user
    current_password = request.data.get('current_password', '')
    new_password = request.data.get('new_password', '')

    # Verify current password
    if not user.check_password(current_password):
        return Response(
            {'success': False, 'message': 'Current password is incorrect'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Validate new password using dynamic policy (includes history check)
    is_valid, errors = validate_password(new_password, user)
    
    if not is_valid:
        return Response({
            'success': False,
            'message': errors[0] if errors else 'Password does not meet requirements',
            'errors': errors
        }, status=status.HTTP_400_BAD_REQUEST)

    # Capture security details BEFORE password change
    ip_address = get_client_ip(request)
    user_agent = request.META.get('HTTP_USER_AGENT', '')
    change_time = timezone.now()
    
    # Get location and device info
    location_info = get_location_from_ip(ip_address)
    device_info = parse_user_agent(user_agent)

    # Save current password to history before changing
    PasswordHistory.add_password(user, current_password)
    
    # Set new password and track change time
    user.set_password(new_password)
    user.password_changed_at = change_time
    user.save()
    
    # Send password change confirmation email
    try:
        template = EmailTemplate.get_template('password_changed')
        
        if template:
            # Use EmailTemplate system
            context_data = {
                'user_name': user.first_name or user.username,
                'change_time': change_time.strftime('%B %d, %Y at %I:%M %p UTC'),
                'ip_address': ip_address,
                'location': location_info['display'],
                'device': device_info['device'],
                'browser': device_info['browser'],
                'os': device_info['os'],
            }
            
            template.send_email(user.email, context_data)
            print(f"✅ Password changed confirmation email sent to {user.email}")
        else:
            # Fallback: Use inline email
            branding = EmailBranding.get_branding()
            current_year = datetime.datetime.now().year
            formatted_time = change_time.strftime('%B %d, %Y at %I:%M %p UTC')
            frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
            security_url = f"{frontend_url}/settings/security"
            
            subject = f'✅ Password Changed Successfully - {branding.company_name}'
            
            text_message = f"""
Hello {user.first_name or user.username},

Your password was successfully changed.

Change Details:
- Time: {formatted_time}
- IP Address: {ip_address}
- Location: {location_info['display']}
- Device: {device_info['device']}
- Browser: {device_info['browser']}

If you didn't make this change, your account may be compromised. Please contact support immediately.

Best regards,
{branding.company_name} Team
            """
            
            html_message = f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Changed</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); max-width: 600px; overflow: hidden;">
                    <tr>
                        <td style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 40px 40px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
                                ✅ Password Changed Successfully
                            </h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px 40px 20px 40px;">
                            <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                                Hello {user.first_name or user.username},
                            </p>
                            <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                                Your password was successfully changed.
                            </p>
                            <div style="background-color: #f8f9fa; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
                                <p style="margin: 0 0 15px 0; font-size: 14px; font-weight: 600; color: #1a1a1a;">
                                    📋 Change Details
                                </p>
                                <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 14px;">
                                    <tr>
                                        <td style="padding: 8px 0; color: #6b7280; width: 140px;">🕒 Time:</td>
                                        <td style="padding: 8px 0; color: #1a1a1a; font-weight: 500;">{formatted_time}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #6b7280;">🌐 IP Address:</td>
                                        <td style="padding: 8px 0; color: #1a1a1a; font-weight: 500;">{ip_address}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #6b7280;">📍 Location:</td>
                                        <td style="padding: 8px 0; color: #1a1a1a; font-weight: 500;">{location_info['display']}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #6b7280;">💻 Device:</td>
                                        <td style="padding: 8px 0; color: #1a1a1a; font-weight: 500;">{device_info['device']}</td>
                                    </tr>
                                </table>
                            </div>
                            <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; border-radius: 0 8px 8px 0; padding: 20px; margin: 20px 0;">
                                <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: 600; color: #991b1b;">
                                    🚨 Didn't make this change?
                                </p>
                                <p style="margin: 0; font-size: 14px; color: #991b1b; line-height: 1.6;">
                                    If you didn't change your password, your account may be compromised. Please contact support immediately.
                                </p>
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 30px 40px; border-top: 1px solid #e5e7eb;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center">
                                        <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #1a1a1a;">
                                            {branding.company_name}
                                        </p>
                                        <p style="margin: 0; font-size: 11px; color: #9ca3af;">
                                            © {current_year} {branding.company_name}. All rights reserved.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
            """
            
            send_email_with_ssl_fix(user.email, subject, text_message, html_message)
            print(f"✅ Password changed confirmation email sent to {user.email} (fallback)")
    except Exception as e:
        print(f"❌ Failed to send password change confirmation email: {e}")

    return Response({
        'success': True,
        'message': 'Password changed successfully'
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def enable_email_2fa(request):
    """
    Enable email-based 2FA for user
    Sends a verification code to confirm
    Uses EmailTemplate system with context-aware message
    """
    from .email_models import EmailTemplate
    
    user = request.user
    
    # Determine if this is first-time setup or user-requested from profile
    is_first_time_setup = user.is_2fa_setup_required

    # Generate verification code
    code = user.generate_2fa_code()
    
    # Try to use EmailTemplate system
    template = EmailTemplate.get_template('2fa_setup_code')
    
    if template:
        # Set context-aware message based on setup type
        if is_first_time_setup:
            setup_message = 'System requires Two-Factor Authentication to be enabled for your first login.'
        else:
            setup_message = 'You have requested to enable Two-Factor Authentication for your account. This adds an extra layer of security to protect your account.'
        
        context_data = {
            'user_name': user.first_name or user.username,
            'code': code,
            'expiry_minutes': '10',
            'setup_message': setup_message,
        }
        
        success = template.send_email(user.email, context_data)
        
        if success:
            return Response({
                'success': True,
                'message': f'Verification code sent to {user.email}'
            })
        else:
            return Response({
                'success': False,
                'message': 'Failed to send email. Please try again.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    else:
        # Fallback: Use inline email if template not found
        from .email_models import EmailBranding
        branding = EmailBranding.get_branding()
        current_year = datetime.datetime.now().year
        
        # Set context-aware message
        if is_first_time_setup:
            setup_message = 'System requires Two-Factor Authentication to be enabled for your first login.'
        else:
            setup_message = f'You have requested to enable Two-Factor Authentication for your {branding.company_name} account. This adds an extra layer of security to protect your account.'

        subject = f'Enable Two-Factor Authentication - {branding.company_name}'

        text_message = f"""
Hello {user.first_name or user.username},

{setup_message}

Your verification code is: {code}

This code will expire in 10 minutes.

If you didn't request this, please ignore this email.

Best regards,
{branding.company_name} Team
        """

        html_message = f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Enable Two-Factor Authentication</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); max-width: 600px; overflow: hidden;">
                    <tr>
                        <td style="background: linear-gradient(135deg, {branding.primary_color} 0%, #7c3aed 100%); padding: 40px 40px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
                                Enable Two-Factor Authentication
                            </h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px 40px 20px 40px;">
                            <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: {branding.primary_color}; font-weight: 500;">
                                Hello {user.first_name or user.username},
                            </p>
                            <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                                {setup_message}
                            </p>
                            <p style="margin: 0 0 30px 0; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                                Use the verification code below to complete the setup:
                            </p>
                            <div style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border: 2px dashed {branding.primary_color}; border-radius: 12px; padding: 30px; text-align: center; margin: 20px 0 30px 0;">
                                <div style="font-size: 42px; font-weight: bold; color: {branding.primary_color}; letter-spacing: 12px; font-family: 'Courier New', monospace;">
                                    {code}
                                </div>
                            </div>
                            <p style="margin: 30px 0 10px 0; font-size: 14px; line-height: 1.6; color: #6b7280;">
                                This code will expire in <strong>10 minutes</strong>.
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 20px 40px 30px 40px;">
                            <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #4a4a4a;">
                                Warm regards,<br>
                                <strong style="color: {branding.primary_color};">{branding.company_name} Team</strong>
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 30px 40px; border-top: 1px solid #e5e7eb;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center">
                                        <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #1a1a1a;">
                                            {branding.company_name}
                                        </p>
                                        <p style="margin: 0; font-size: 11px; color: #9ca3af;">
                                            © {current_year} {branding.company_name}. All rights reserved.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
        """

        try:
            success, error = send_email_with_ssl_fix(user.email, subject, text_message, html_message)
            
            if success:
                return Response({
                    'success': True,
                    'message': f'Verification code sent to {user.email}'
                })
            else:
                return Response({
                    'success': False,
                    'message': f'Failed to send email: {error}'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except Exception as e:
            return Response({
                'success': False,
                'message': f'Failed to send email: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def verify_enable_2fa(request):
    """
    Verify code and enable 2FA
    Generates backup codes and returns them to the user
    - First-time setup: Sends welcome email (not 2FA enabled email)
    - Profile settings: Sends 2FA enabled confirmation email
    """
    from .security_models import TwoFactorBackupCode, SecuritySettings
    
    user = request.user
    code = request.data.get('code', '')
    
    # Check if this is first-time 2FA setup BEFORE enabling
    # (is_2fa_setup_required is True for new users who haven't completed 2FA setup)
    is_first_time_setup = user.is_2fa_setup_required

    if not code:
        return Response(
            {'success': False, 'message': 'Verification code is required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Verify code
    if user.verify_2fa_code(code):
        user.two_factor_enabled = True
        user.is_2fa_setup_required = False
        user.clear_2fa_code()
        user.save()

        # Generate backup codes
        backup_codes = []
        try:
            # Get settings for backup codes count
            settings = SecuritySettings.get_settings()
            code_count = settings.backup_codes_count
        except:
            code_count = 5  # Default
        
        # Delete any existing backup codes
        TwoFactorBackupCode.objects.filter(user=user).delete()
        
        # Generate new backup codes
        for _ in range(code_count):
            code_str = TwoFactorBackupCode.generate_code()
            TwoFactorBackupCode.objects.create(
                user=user,
                code_hash=TwoFactorBackupCode.hash_code(code_str)
            )
            # Format code with dash for readability (e.g., ABCD-EFGH)
            formatted_code = f"{code_str[:4]}-{code_str[4:]}"
            backup_codes.append(formatted_code)

        # Send appropriate email based on setup type
        try:
            ip_address = get_client_ip(request)
            user_agent = request.META.get('HTTP_USER_AGENT', '')
            
            if is_first_time_setup:
                # First-time setup: Send welcome email instead of 2FA enabled email
                # User should NOT receive "2FA Enabled" during first-time setup
                send_welcome_email(user, ip_address, user_agent)
                print(f"✅ Welcome email sent to {user.email} (first-time 2FA setup)")
            else:
                # Enabling from profile settings: Send 2FA enabled confirmation
                send_2fa_enabled_email(user, ip_address, user_agent)
                print(f"✅ 2FA enabled email sent to {user.email} (profile settings)")
        except Exception as e:
            print(f"Failed to send email after 2FA setup: {e}")

        return Response({
            'success': True,
            'message': '2FA enabled successfully',
            'backup_codes': backup_codes
        })
    else:
        return Response(
            {'success': False, 'message': 'Invalid or expired code'},
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def regenerate_backup_codes(request):
    """
    Regenerate backup codes for a user
    Requires password confirmation for security
    """
    from .security_models import TwoFactorBackupCode, SecuritySettings
    
    user = request.user
    password = request.data.get('password', '')
    
    # Verify password
    if not user.check_password(password):
        return Response(
            {'success': False, 'message': 'Invalid password'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Check if 2FA is enabled
    if not user.two_factor_enabled:
        return Response(
            {'success': False, 'message': '2FA is not enabled for your account'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Generate new backup codes
    backup_codes = []
    try:
        settings = SecuritySettings.get_settings()
        code_count = settings.backup_codes_count
    except:
        code_count = 5  # Default
    
    # Delete existing backup codes
    TwoFactorBackupCode.objects.filter(user=user).delete()
    
    # Generate new codes
    for _ in range(code_count):
        code_str = TwoFactorBackupCode.generate_code()
        TwoFactorBackupCode.objects.create(
            user=user,
            code_hash=TwoFactorBackupCode.hash_code(code_str)
        )
        formatted_code = f"{code_str[:4]}-{code_str[4:]}"
        backup_codes.append(formatted_code)
    
    return Response({
        'success': True,
        'message': 'Backup codes regenerated successfully',
        'backup_codes': backup_codes
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def send_2fa_code(request):
    """
    Send 2FA code to user's email during login
    """
    from .email_models import EmailBranding
    
    username = request.data.get('username', '')

    if not username:
        return Response(
            {'success': False, 'message': 'Username is required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        # Find user by username or email
        if '@' in username:
            user = User.objects.get(email__iexact=username)
        else:
            user = User.objects.get(username__iexact=username)
    except User.DoesNotExist:
        return Response(
            {'success': False, 'message': 'User not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    if not user.two_factor_enabled:
        return Response(
            {'success': False, 'message': '2FA is not enabled for this user'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Generate and send code
    code = user.generate_2fa_code()
    
    # Get branding
    branding = EmailBranding.get_branding()
    current_year = datetime.datetime.now().year

    subject = f'Your Login Verification Code - {branding.company_name}'

    # Plain text version (fallback)
    text_message = f"""
Hello {user.first_name or user.username},

Your verification code is: {code}

This code will expire in 10 minutes.

If you didn't try to log in, please secure your account immediately.

Best regards,
{branding.company_name} Team
    """

    # Professional HTML version (matching Welcome email design)
    html_message = f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Login Verification Code</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); max-width: 600px; overflow: hidden;">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, {branding.primary_color} 0%, #7c3aed 100%); padding: 40px 40px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
                                Your Login Verification Code
                            </h1>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 40px 20px 40px;">
                            <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: {branding.primary_color}; font-weight: 500;">
                                Hello {user.first_name or user.username},
                            </p>

                            <p style="margin: 0 0 30px 0; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                                We received a login attempt for your {branding.company_name} account. 
                                Use the verification code below to complete your login:
                            </p>

                            <!-- Verification Code Box -->
                            <div style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border: 2px dashed {branding.primary_color}; border-radius: 12px; padding: 30px; text-align: center; margin: 20px 0 30px 0;">
                                <div style="font-size: 42px; font-weight: bold; color: {branding.primary_color}; letter-spacing: 12px; font-family: 'Courier New', monospace;">
                                    {code}
                                </div>
                            </div>

                            <p style="margin: 30px 0 10px 0; font-size: 14px; line-height: 1.6; color: #6b7280;">
                                This code will expire in <strong>10 minutes</strong>.
                            </p>

                            <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #6b7280;">
                                If you didn't try to log in, please secure your account immediately by changing your password.
                            </p>
                        </td>
                    </tr>

                    <!-- Signature -->
                    <tr>
                        <td style="padding: 20px 40px 30px 40px;">
                            <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #4a4a4a;">
                                Warm regards,<br>
                                <strong style="color: {branding.primary_color};">{branding.company_name} Team</strong>
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 30px 40px; border-top: 1px solid #e5e7eb;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center">
                                        <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #1a1a1a;">
                                            {branding.company_name}
                                        </p>
                                        <p style="margin: 0 0 15px 0; font-size: 12px; color: #6b7280;">
                                            Professional Data Collection & Site Management
                                        </p>
                                        <p style="margin: 0; font-size: 11px; color: #9ca3af;">
                                            This email was sent from an automated system. Please do not reply directly to this email.
                                        </p>
                                        <p style="margin: 10px 0 0 0; font-size: 11px; color: #9ca3af;">
                                            © {current_year} {branding.company_name}. All rights reserved.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    """

    try:
        success, error = send_email_with_ssl_fix(user.email, subject, text_message, html_message)
        
        if success:
            return Response({
                'success': True,
                'message': f'Verification code sent to {user.email}',
                'email': user.email
            })
        else:
            return Response({
                'success': False,
                'message': f'Failed to send email: {error}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    except Exception as e:
        return Response({
            'success': False,
            'message': f'Failed to send email: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
def verify_backup_code_login(request):
    """
    Verify backup code during login (when user can't access email)
    """
    from .security_models import TwoFactorBackupCode
    
    username = request.data.get('username', '')
    backup_code = request.data.get('backup_code', '')
    remember_me = request.data.get('remember_me', False)
    
    if not username or not backup_code:
        return Response(
            {'success': False, 'message': 'Username and backup code are required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        # Find user
        if '@' in username:
            user = User.objects.get(email__iexact=username)
        else:
            user = User.objects.get(username__iexact=username)
    except User.DoesNotExist:
        return Response(
            {'success': False, 'message': 'Invalid credentials'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if not user.two_factor_enabled:
        return Response(
            {'success': False, 'message': '2FA is not enabled for this account'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Clean and hash the backup code
    clean_code = backup_code.replace('-', '').replace(' ', '').upper()
    code_hash = TwoFactorBackupCode.hash_code(clean_code)
    
    # Find matching unused backup code
    try:
        backup_code_obj = TwoFactorBackupCode.objects.get(
            user=user,
            code_hash=code_hash,
            is_used=False
        )
        
        # Mark code as used
        backup_code_obj.is_used = True
        backup_code_obj.used_at = timezone.now()
        backup_code_obj.save()
        
        # Login user
        auth_login(request, user)
        
        # Set session expiry based on remember_me
        if remember_me:
            request.session.set_expiry(2592000)  # 30 days
        else:
            request.session.set_expiry(0)
        
        user.update_last_activity()
        
        # Set user online
        user.is_online = True
        user.save(update_fields=['is_online'])
        
        # Broadcast status
        broadcast_user_status(user.id, user.username, True)
        
        user.record_login(
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT')
        )
        
        # Count remaining backup codes
        remaining_codes = TwoFactorBackupCode.objects.filter(
            user=user,
            is_used=False
        ).count()
        
        return Response({
            'success': True,
            'user': UserSerializer(user).data,
            'message': 'Login successful',
            'remaining_backup_codes': remaining_codes
        })
        
    except TwoFactorBackupCode.DoesNotExist:
        # Record failed attempt
        LoginHistory.objects.create(
            user=user,
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT'),
            success=False
        )
        return Response(
            {'success': False, 'message': 'Invalid or already used backup code'},
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_admin_users(request):
    """
    Get list of admin users for clients to chat with
    Only returns basic info for SUPERADMIN and STAFF_ADMIN users
    """
    # Get all admin users
    admin_users = User.objects.filter(
        role__in=['SUPERADMIN', 'STAFF_ADMIN'],
        is_active=True
    ).order_by('first_name', 'username')

    # Return simplified user data
    users_data = [{
        'id': user.id,
        'username': user.username,
        'full_name': user.full_name or user.username,
        'email': user.email,
        'role': user.role
    } for user in admin_users]

    return Response(users_data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_activity_stats(request):
    """
    Get comprehensive user activity statistics
    """
    # Only staff can view activity stats
    if not request.user.is_staff:
        return Response({'error': 'Permission denied'}, status=403)

    now = timezone.now()
    thirty_days_ago = now - timedelta(days=30)
    seven_days_ago = now - timedelta(days=7)

    # Get most active users (by login count)
    most_active_users = User.objects.filter(
        is_active=True
    ).order_by('-login_count')[:10].values(
        'id',
        'username',
        'first_name',
        'last_name',
        'email',
        'role',
        'login_count',
        'last_login',
        'last_login_ip',
        #'initials'
    )

    # Add full_name and initials to each user
    for user in most_active_users:
        first_name = user['first_name'] or ''
        last_name = user['last_name'] or ''
        if first_name and last_name:
            user['full_name'] = f"{first_name} {last_name}"
            user['initials'] = f"{first_name[0]}{last_name[0]}".upper()
        elif first_name:
            user['full_name'] = first_name
            user['initials'] = first_name[0].upper()
        elif last_name:
            user['full_name'] = last_name
            user['initials'] = last_name[0].upper()
        else:
            user['full_name'] = user['username']
            user['initials'] = user['username'][0].upper() if user['username'] else '?'

    # Get login trends (last 30 days)
    login_history_30d = LoginHistory.objects.filter(
        login_time__gte=thirty_days_ago,
        success=True
    ).extra(select={'date': 'DATE(login_time)'}).values('date').annotate(
        count=Count('id')
    ).order_by('date')

    # Get login trends (last 7 days)
    login_history_7d = LoginHistory.objects.filter(
        login_time__gte=seven_days_ago,
        success=True
    ).extra(select={'date': 'DATE(login_time)'}).values('date').annotate(
        count=Count('id')
    ).order_by('date')

    # Get total stats
    total_users = User.objects.filter(is_active=True).count()
    total_logins_30d = LoginHistory.objects.filter(
        login_time__gte=thirty_days_ago,
        success=True
    ).count()

    total_logins_7d = LoginHistory.objects.filter(
        login_time__gte=seven_days_ago,
        success=True
    ).count()

    # Get unique active users in last 30 days
    active_users_30d = LoginHistory.objects.filter(
        login_time__gte=thirty_days_ago,
        success=True
    ).values('user').distinct().count()

    return Response({
        'most_active_users': list(most_active_users),
        'login_trends_30d': list(login_history_30d),
        'login_trends_7d': list(login_history_7d),
        'total_users': total_users,
        'total_logins_30d': total_logins_30d,
        'total_logins_7d': total_logins_7d,
        'active_users_30d': active_users_30d,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_login_history(request, user_id):
    """
    Get login history for a specific user
    """
    # Only staff or the user themselves can view login history
    if not request.user.is_staff and request.user.id != user_id:
        return Response({'error': 'Permission denied'}, status=403)

    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=404)

    # Get pagination parameters
    page = int(request.GET.get('page', 1))
    page_size = int(request.GET.get('page_size', 20))

    # Get login history
    login_history = LoginHistory.objects.filter(
        user=user
    ).order_by('-login_time')

    # Paginate
    start = (page - 1) * page_size
    end = start + page_size
    total_count = login_history.count()

    history_data = login_history[start:end].values(
        'id',
        'login_time',
        'ip_address',
        'user_agent',
        'success'
    )

    return Response({
        'count': total_count,
        'next': page + 1 if end < total_count else None,
        'previous': page - 1 if page > 1 else None,
        'results': list(history_data),
        'user': {
            'id': user.id,
            'username': user.username,
            'full_name': user.full_name,
            'login_count': user.login_count,
            'last_login': user.last_login,
            'last_login_ip': user.last_login_ip,
        }
    })


@ratelimit(key='ip', rate='5/h', method='POST')
@api_view(['POST'])
def request_password_reset(request):
    """
    Send password reset link to user's email
    """
    from .email_models import EmailBranding
    
    email = request.data.get('email', '').strip().lower()

    if not email:
        return Response({
            'success': False,
            'message': 'Email is required'
        }, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.get(email__iexact=email)

        # Generate password reset token
        token = default_token_generator.make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))

        # Create password reset link
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
        reset_link = f"{frontend_url}/reset-password/{uid}/{token}/"

        # Get branding
        branding = EmailBranding.get_branding()
        current_year = datetime.datetime.now().year

        # Send email
        subject = f'Reset Your Password - {branding.company_name}'
        
        # Plain text version
        text_message = f"""
Hello {user.first_name or user.username},

We received a request to reset your password for your {branding.company_name} account.

Click the link below to reset your password:

{reset_link}

This link will expire in 24 hours.

If you didn't request a password reset, you can safely ignore this email.

Best regards,
{branding.company_name} Team
        """

        # Professional HTML version (matching Welcome email design)
        html_message = f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); max-width: 600px; overflow: hidden;">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, {branding.primary_color} 0%, #7c3aed 100%); padding: 40px 40px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
                                Reset Your Password
                            </h1>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 40px 20px 40px;">
                            <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: {branding.primary_color}; font-weight: 500;">
                                Hello {user.first_name or user.username},
                            </p>

                            <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                                We received a request to reset your password for your {branding.company_name} account.
                            </p>

                            <p style="margin: 0 0 30px 0; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                                Click the button below to create a new password:
                            </p>

                            <!-- CTA Button -->
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" style="padding: 10px 0 30px 0;">
                                        <a href="{reset_link}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, {branding.primary_color} 0%, #7c3aed 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(124, 58, 237, 0.4);">
                                            Reset Password
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <!-- Info Box -->
                            <div style="background-color: #f8f9fa; border-left: 4px solid {branding.primary_color}; border-radius: 0 8px 8px 0; padding: 20px; margin: 20px 0;">
                                <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: 600; color: #1a1a1a;">
                                    Security Tips:
                                </p>
                                <ul style="margin: 0; padding-left: 20px; color: #4a4a4a; font-size: 14px; line-height: 1.8;">
                                    <li>Choose a strong, unique password</li>
                                    <li>Don't reuse passwords from other accounts</li>
                                    <li>Enable Two-Factor Authentication for extra security</li>
                                </ul>
                            </div>

                            <p style="margin: 30px 0 10px 0; font-size: 14px; line-height: 1.6; color: #6b7280;">
                                <strong>Note:</strong> This link will expire in <strong>24 hours</strong>.
                            </p>

                            <p style="margin: 0 0 10px 0; font-size: 14px; line-height: 1.6; color: #6b7280;">
                                If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
                            </p>

                            <p style="margin: 20px 0 0 0; font-size: 14px; line-height: 1.6; color: #6b7280;">
                                Or copy and paste this link into your browser:<br>
                                <a href="{reset_link}" style="color: {branding.primary_color}; word-break: break-all;">{reset_link}</a>
                            </p>
                        </td>
                    </tr>

                    <!-- Signature -->
                    <tr>
                        <td style="padding: 20px 40px 30px 40px;">
                            <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #4a4a4a;">
                                Warm regards,<br>
                                <strong style="color: {branding.primary_color};">{branding.company_name} Team</strong>
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 30px 40px; border-top: 1px solid #e5e7eb;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center">
                                        <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #1a1a1a;">
                                            {branding.company_name}
                                        </p>
                                        <p style="margin: 0 0 15px 0; font-size: 12px; color: #6b7280;">
                                            Professional Data Collection & Site Management
                                        </p>
                                        <p style="margin: 0; font-size: 11px; color: #9ca3af;">
                                            This email was sent from an automated system. Please do not reply directly to this email.
                                        </p>
                                        <p style="margin: 10px 0 0 0; font-size: 11px; color: #9ca3af;">
                                            © {current_year} {branding.company_name}. All rights reserved.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
        """

        try:
            success, error = send_email_with_ssl_fix(user.email, subject, text_message, html_message)

            if success:
                return Response({
                    'success': True,
                    'message': f'Password reset instructions have been sent to {email}'
                })
            else:
                return Response({
                    'success': False,
                    'message': f'Failed to send email: {error}'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        except Exception as e:
            return Response({
                'success': False,
                'message': f'Failed to send email: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    except User.DoesNotExist:
        # Don't reveal whether email exists (security best practice)
        return Response({
            'success': True,
            'message': f'If an account exists with {email}, you will receive password reset instructions.'
        })


def get_location_from_ip(ip_address):
    """
    Get location information from IP address using free API.
    Returns dict with city, region, country, or 'Unknown' values on failure.
    """
    import requests
    
    # Skip for localhost/private IPs
    if ip_address in ['127.0.0.1', 'localhost', '::1'] or ip_address.startswith('192.168.') or ip_address.startswith('10.'):
        return {
            'city': 'Local Network',
            'region': '',
            'country': '',
            'display': 'Local Network'
        }
    
    try:
        # Using ip-api.com (free, no API key needed, 45 requests/minute)
        response = requests.get(f'http://ip-api.com/json/{ip_address}', timeout=5)
        if response.status_code == 200:
            data = response.json()
            if data.get('status') == 'success':
                city = data.get('city', 'Unknown')
                region = data.get('regionName', '')
                country = data.get('country', 'Unknown')
                
                # Build display string
                parts = [p for p in [city, region, country] if p]
                display = ', '.join(parts) if parts else 'Unknown Location'
                
                return {
                    'city': city,
                    'region': region,
                    'country': country,
                    'display': display
                }
    except Exception as e:
        print(f"Failed to get location from IP: {e}")
    
    return {
        'city': 'Unknown',
        'region': '',
        'country': '',
        'display': 'Unknown Location'
    }


def parse_user_agent(user_agent):
    """
    Parse user agent string to extract browser and OS information.
    Returns dict with browser, os, and device info.
    """
    if not user_agent:
        return {
            'browser': 'Unknown Browser',
            'os': 'Unknown OS',
            'device': 'Unknown Device'
        }
    
    user_agent_lower = user_agent.lower()
    
    # Detect browser
    if 'edg/' in user_agent_lower or 'edge' in user_agent_lower:
        browser = 'Microsoft Edge'
    elif 'chrome' in user_agent_lower and 'chromium' not in user_agent_lower:
        browser = 'Google Chrome'
    elif 'firefox' in user_agent_lower:
        browser = 'Mozilla Firefox'
    elif 'safari' in user_agent_lower and 'chrome' not in user_agent_lower:
        browser = 'Apple Safari'
    elif 'opera' in user_agent_lower or 'opr/' in user_agent_lower:
        browser = 'Opera'
    elif 'msie' in user_agent_lower or 'trident' in user_agent_lower:
        browser = 'Internet Explorer'
    else:
        browser = 'Unknown Browser'
    
    # Detect OS
    if 'windows nt 10' in user_agent_lower:
        os_name = 'Windows 10/11'
    elif 'windows nt 6.3' in user_agent_lower:
        os_name = 'Windows 8.1'
    elif 'windows nt 6.2' in user_agent_lower:
        os_name = 'Windows 8'
    elif 'windows nt 6.1' in user_agent_lower:
        os_name = 'Windows 7'
    elif 'windows' in user_agent_lower:
        os_name = 'Windows'
    elif 'mac os x' in user_agent_lower:
        os_name = 'macOS'
    elif 'linux' in user_agent_lower and 'android' not in user_agent_lower:
        os_name = 'Linux'
    elif 'android' in user_agent_lower:
        os_name = 'Android'
    elif 'iphone' in user_agent_lower:
        os_name = 'iOS (iPhone)'
    elif 'ipad' in user_agent_lower:
        os_name = 'iOS (iPad)'
    elif 'ios' in user_agent_lower:
        os_name = 'iOS'
    else:
        os_name = 'Unknown OS'
    
    # Detect device type
    if 'mobile' in user_agent_lower or 'android' in user_agent_lower and 'tablet' not in user_agent_lower:
        if 'iphone' in user_agent_lower:
            device = 'iPhone'
        elif 'android' in user_agent_lower:
            device = 'Android Phone'
        else:
            device = 'Mobile Device'
    elif 'tablet' in user_agent_lower or 'ipad' in user_agent_lower:
        if 'ipad' in user_agent_lower:
            device = 'iPad'
        else:
            device = 'Tablet'
    else:
        device = 'Desktop/Laptop'
    
    return {
        'browser': browser,
        'os': os_name,
        'device': device
    }


@api_view(['POST'])
@permission_classes([AllowAny])
def reset_password(request, uidb64, token):
    """
    Reset password using token from email - uses dynamic password policy
    """
    from .security_models import PasswordHistory
    from .email_models import EmailBranding
    
    new_password = request.data.get('password', '')

    if not new_password:
        return Response({
            'success': False,
            'message': 'Password is required'
        }, status=status.HTTP_400_BAD_REQUEST)

    try:
        uid = force_str(urlsafe_base64_decode(uidb64))
        user = User.objects.get(pk=uid)
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        return Response({
            'success': False,
            'message': 'Invalid password reset link'
        }, status=status.HTTP_400_BAD_REQUEST)

    if not default_token_generator.check_token(user, token):
        return Response({
            'success': False,
            'message': 'Password reset link has expired or is invalid'
        }, status=status.HTTP_400_BAD_REQUEST)

    # Validate password using dynamic policy (includes history check)
    is_valid, errors = validate_password(new_password, user)
    
    if not is_valid:
        return Response({
            'success': False,
            'message': errors[0] if errors else 'Password does not meet requirements',
            'errors': errors
        }, status=status.HTTP_400_BAD_REQUEST)

    # Capture security details BEFORE password change
    ip_address = get_client_ip(request)
    user_agent = request.META.get('HTTP_USER_AGENT', '')
    change_time = timezone.now()
    
    # Get location and device info
    location_info = get_location_from_ip(ip_address)
    device_info = parse_user_agent(user_agent)

    # Save current password to history before changing (if user has a password)
    if user.has_usable_password():
        # We can't save the actual old password since we don't know it
        # Password history will track the new password going forward
        pass
    
    # Set new password and track change time
    user.set_password(new_password)
    user.password_changed_at = change_time
    user.save()
    
    # Add new password to history
    PasswordHistory.add_password(user, new_password)

    # Send password reset confirmation email with security details
    print(f"\n🔔 Attempting to send password reset confirmation email to {user.email}...")
    try:
        branding = EmailBranding.get_branding()
        current_year = datetime.datetime.now().year
        print(f"📧 Branding loaded: {branding.company_name}")
        
        # Format the change time nicely
        formatted_time = change_time.strftime('%B %d, %Y at %I:%M %p UTC')
        
        # Build security settings URL
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
        security_url = f"{frontend_url}/settings/security"
        
        subject = f'Password Reset Successful - {branding.company_name}'
        
        # Plain text version
        text_message = f"""
Hello {user.first_name or user.username},

Your password has been successfully reset for your {branding.company_name} account.

Password Change Details:
- Time: {formatted_time}
- IP Address: {ip_address}
- Location: {location_info['display']}
- Device: {device_info['device']}
- Browser: {device_info['browser']}
- Operating System: {device_info['os']}

If you made this change, you can safely ignore this email.

If you did NOT reset your password, please contact our support team immediately or reset your password again to secure your account.

Best regards,
{branding.company_name} Team
        """

        # Professional HTML version with security details
        html_message = f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset Successful</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); max-width: 600px; overflow: hidden;">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, {branding.primary_color} 0%, #7c3aed 100%); padding: 40px 40px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
                                Password Reset Successful
                            </h1>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 40px 20px 40px;">
                            <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: {branding.primary_color}; font-weight: 500;">
                                Hello {user.first_name or user.username},
                            </p>

                            <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                                Your password has been successfully reset for your {branding.company_name} account.
                            </p>

                            <!-- Success Icon -->
                            <div style="text-align: center; margin: 30px 0;">
                                <div style="display: inline-block; width: 80px; height: 80px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 50%; line-height: 80px;">
                                    <span style="color: white; font-size: 40px;">✓</span>
                                </div>
                            </div>

                            <p style="margin: 0 0 30px 0; font-size: 16px; line-height: 1.6; color: #4a4a4a; text-align: center;">
                                You can now log in with your new password.
                            </p>

                            <!-- Security Details Box -->
                            <div style="background-color: #f8f9fa; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
                                <p style="margin: 0 0 15px 0; font-size: 14px; font-weight: 600; color: #1a1a1a;">
                                    🔒 Password Change Details
                                </p>
                                <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 14px;">
                                    <tr>
                                        <td style="padding: 8px 0; color: #6b7280; width: 140px;">🕒 Time:</td>
                                        <td style="padding: 8px 0; color: #1a1a1a; font-weight: 500;">{formatted_time}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #6b7280;">🌐 IP Address:</td>
                                        <td style="padding: 8px 0; color: #1a1a1a; font-weight: 500;">{ip_address}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #6b7280;">📍 Location:</td>
                                        <td style="padding: 8px 0; color: #1a1a1a; font-weight: 500;">{location_info['display']}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #6b7280;">💻 Device:</td>
                                        <td style="padding: 8px 0; color: #1a1a1a; font-weight: 500;">{device_info['device']}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #6b7280;">🌐 Browser:</td>
                                        <td style="padding: 8px 0; color: #1a1a1a; font-weight: 500;">{device_info['browser']}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #6b7280;">🖥️ Operating System:</td>
                                        <td style="padding: 8px 0; color: #1a1a1a; font-weight: 500;">{device_info['os']}</td>
                                    </tr>
                                </table>
                            </div>

                            <!-- Warning Box -->
                            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 0 8px 8px 0; padding: 20px; margin: 30px 0;">
                                <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: 600; color: #92400e;">
                                    ⚠️ Didn't make this change?
                                </p>
                                <p style="margin: 0 0 15px 0; font-size: 14px; color: #92400e; line-height: 1.6;">
                                    If you did NOT reset your password, your account may be compromised. Please take action immediately:
                                </p>
                                <ul style="margin: 0 0 20px 0; padding-left: 20px; color: #92400e; font-size: 14px; line-height: 1.8;">
                                    <li>Reset your password again immediately</li>
                                    <li>Enable Two-Factor Authentication</li>
                                    <li>Review your account activity</li>
                                    <li>Contact our support team</li>
                                </ul>
                                
                                <!-- Secure Account Button -->
                                <table width="100%" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td align="center">
                                            <a href="{security_url}" style="display: inline-block; padding: 12px 24px; background-color: #dc2626; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 600;">
                                                🛡️ Secure Your Account
                                            </a>
                                        </td>
                                    </tr>
                                </table>
                            </div>

                            <p style="margin: 20px 0 0 0; font-size: 14px; line-height: 1.6; color: #6b7280;">
                                For your security, this email was sent to confirm a recent password change on your account.
                            </p>
                        </td>
                    </tr>

                    <!-- Signature -->
                    <tr>
                        <td style="padding: 20px 40px 30px 40px;">
                            <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #4a4a4a;">
                                Warm regards,<br>
                                <strong style="color: {branding.primary_color};">{branding.company_name} Team</strong>
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 30px 40px; border-top: 1px solid #e5e7eb;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center">
                                        <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #1a1a1a;">
                                            {branding.company_name}
                                        </p>
                                        <p style="margin: 0 0 15px 0; font-size: 12px; color: #6b7280;">
                                            Professional Data Collection & Site Management
                                        </p>
                                        <p style="margin: 0; font-size: 11px; color: #9ca3af;">
                                            This email was sent from an automated system. Please do not reply directly to this email.
                                        </p>
                                        <p style="margin: 10px 0 0 0; font-size: 11px; color: #9ca3af;">
                                            © {current_year} {branding.company_name}. All rights reserved.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
        """

        print(f"📨 Sending email to {user.email} with subject: {subject}")
        success, error = send_email_with_ssl_fix(user.email, subject, text_message, html_message)
        if success:
            print(f"✅ Password reset confirmation email sent successfully to {user.email}")
        else:
            print(f"❌ Failed to send password reset confirmation email: {error}")
    except Exception as e:
        # Log the error but don't fail the password reset
        print(f"❌ Failed to send password reset confirmation email: {e}")

    return Response({
        'success': True,
        'message': 'Password has been reset successfully. You can now log in with your new password.'
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def validate_reset_token(request, uidb64, token):
    """
    Validate if password reset token is still valid
    """
    try:
        uid = force_str(urlsafe_base64_decode(uidb64))
        user = User.objects.get(pk=uid)
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        return Response({
            'valid': False,
            'message': 'Invalid reset link'
        }, status=status.HTTP_400_BAD_REQUEST)

    if default_token_generator.check_token(user, token):
        return Response({
            'valid': True,
            'email': user.email,
            'username': user.username
        })

    return Response({
        'valid': False,
        'message': 'Reset link has expired'
    }, status=status.HTTP_400_BAD_REQUEST)


# ============================================
# PASSWORD EXPIRY ENDPOINTS
# ============================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_password_expiry_info(request):
    """
    Get password expiry information for the current user.
    """
    from .security_models import SecuritySettings, TwoFactorBackupCode
    
    user = request.user
    settings = SecuritySettings.get_settings()
    
    # Password expiry info
    password_expiry_days = settings.password_expiry_days
    password_changed_at = user.password_changed_at
    days_until_expiry = user.days_until_password_expires()
    is_expired = user.is_password_expired()
    
    # Backup codes info
    total_backup_codes = TwoFactorBackupCode.objects.filter(user=user).count()
    remaining_backup_codes = TwoFactorBackupCode.objects.filter(user=user, is_used=False).count()
    
    return Response({
        'password_expiry_days': password_expiry_days,
        'password_changed_at': password_changed_at,
        'days_until_expiry': days_until_expiry,
        'is_expired': is_expired,
        'never_expires': password_expiry_days == 0,
        'total_backup_codes': total_backup_codes,
        'remaining_backup_codes': remaining_backup_codes,
        'two_factor_enabled': user.two_factor_enabled
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def change_expired_password(request):
    """
    Change password for a user whose password has expired.
    Requires current password verification and new password.
    """
    from .security_models import PasswordHistory
    
    username = request.data.get('username', '')
    current_password = request.data.get('current_password', '')
    new_password = request.data.get('new_password', '')
    
    if not username or not current_password or not new_password:
        return Response({
            'success': False,
            'message': 'Username, current password, and new password are required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Find user by username or email
        if '@' in username:
            user = User.objects.get(email__iexact=username)
        else:
            user = User.objects.get(username__iexact=username)
    except User.DoesNotExist:
        return Response({
            'success': False,
            'message': 'Invalid credentials'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Verify current password
    if not user.check_password(current_password):
        return Response({
            'success': False,
            'message': 'Current password is incorrect'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Validate new password using dynamic policy
    is_valid, errors = validate_password(new_password, user)
    
    if not is_valid:
        return Response({
            'success': False,
            'message': errors[0] if errors else 'Password does not meet requirements',
            'errors': errors
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Check that new password is different from current
    if user.check_password(new_password):
        return Response({
            'success': False,
            'message': 'New password must be different from current password'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Save current password to history
    PasswordHistory.add_password(user, current_password)
    
    # Set new password and track change time
    user.set_password(new_password)
    user.password_changed_at = timezone.now()
    user.save()
    
    return Response({
        'success': True,
        'message': 'Password changed successfully. You can now log in with your new password.'
    })


# ============================================
# PASSWORD POLICY ENDPOINTS
# ============================================

@api_view(['GET'])
@permission_classes([AllowAny])
def get_password_policy_view(request):
    """
    Get current password policy for frontend validation.
    This endpoint is public so login/signup pages can fetch requirements.
    """
    policy = get_password_policy()
    requirements = get_password_requirements_text()
    
    return Response({
        'policy': policy,
        'requirements': requirements
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def validate_password_strength(request):
    """
    Validate a password against current policy.
    Returns validation result and strength score.
    """
    password = request.data.get('password', '')
    user_id = request.data.get('user_id', None)  # For password history check
    
    if not password:
        return Response({
            'valid': False,
            'errors': ['Password is required'],
            'strength': {'score': 0, 'label': 'None', 'color': 'gray'}
        })
    
    # Get user for password history check (optional)
    user = None
    if user_id:
        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            pass
    
    # Validate against policy
    is_valid, errors = validate_password(password, user)
    
    # Get strength score
    strength = check_password_strength(password)
    
    return Response({
        'valid': is_valid,
        'errors': errors,
        'strength': strength
    })


# =============================================================================
# SESSION MANAGEMENT VIEWS
# =============================================================================

@api_view(['GET'])
@permission_classes([AllowAny])
def get_session_status(request):
    """
    Get current session status.
    Returns whether session is active, locked, or expired.
    """
    if not request.user.is_authenticated:
        return Response({
            'status': 'unauthenticated',
            'authenticated': False,
            'locked': False,
        })
    
    is_locked = request.session.get('is_locked', False)
    locked_at = request.session.get('locked_at')
    remember_me = request.session.get('remember_me', False)
    
    if is_locked:
        return Response({
            'status': 'locked',
            'authenticated': True,
            'locked': True,
            'locked_at': locked_at,
            'user': {
                'username': request.user.username,
                'email': request.user.email,
                'first_name': request.user.first_name,
                'last_name': request.user.last_name,
                'full_name': request.user.full_name,
            }
        })
    
    # Get timeout info
    from .security_models import SecuritySettings
    settings = SecuritySettings.get_settings()
    
    last_activity = request.session.get('last_activity')
    
    return Response({
        'status': 'active',
        'authenticated': True,
        'locked': False,
        'remember_me': remember_me,
        'session_timeout_minutes': settings.session_timeout_minutes,
        'last_activity': last_activity,
        'user': UserSerializer(request.user).data
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def unlock_session(request):
    """
    Unlock a locked session with password.
    This is the "wake from sleep" functionality.
    """
    if not request.user.is_authenticated:
        return Response({
            'success': False,
            'message': 'No active session to unlock. Please log in.'
        }, status=status.HTTP_401_UNAUTHORIZED)
    
    # Check if session is actually locked
    is_locked = request.session.get('is_locked', False)
    if not is_locked:
        # Even if not locked, update last_activity to prevent immediate lock after this
        request.session['last_activity'] = timezone.now().isoformat()
        request.session.modified = True
        request.session.save()
        return Response({
            'success': True,
            'message': 'Session is already active.',
            'user': UserSerializer(request.user).data
        })
    
    # Verify password
    password = request.data.get('password', '')
    
    if not password:
        return Response({
            'success': False,
            'message': 'Password is required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    if not request.user.check_password(password):
        # Log failed unlock attempt
        from .security_models import AuditLog
        AuditLog.log(
            event_type='login_failed',
            user=request.user,
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            description=f'Failed session unlock attempt for {request.user.username}',
            severity='warning'
        )
        
        return Response({
            'success': False,
            'message': 'Invalid password'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Unlock session - explicitly mark session as modified to ensure it saves
    request.session['is_locked'] = False
    request.session['locked_at'] = None
    request.session['last_activity'] = timezone.now().isoformat()
    request.session.modified = True
    request.session.save()  # Force immediate save
    
    # Update user activity
    request.user.update_last_activity()
    request.user.is_online = True
    request.user.save(update_fields=['is_online'])
    
    # Broadcast status
    broadcast_user_status(request.user.id, request.user.username, True)
    
    # Log successful unlock
    from .security_models import AuditLog
    AuditLog.log(
        event_type='login_success',
        user=request.user,
        ip_address=request.META.get('REMOTE_ADDR'),
        user_agent=request.META.get('HTTP_USER_AGENT', ''),
        description=f'Session unlocked for {request.user.username}',
        severity='info'
    )
    
    return Response({
        'success': True,
        'message': 'Session unlocked successfully',
        'user': UserSerializer(request.user).data
    })