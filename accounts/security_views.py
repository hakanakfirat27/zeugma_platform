# accounts/security_views.py
# API views for security management

from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django.utils import timezone
from django.db.models import Count
from django.contrib.sessions.models import Session
from datetime import timedelta
import pyotp
import qrcode
import io
import base64

from .security_models import (
    SecuritySettings, UserTOTPDevice, TwoFactorBackupCode,
    UserSession, PasswordHistory, APIKey, IPWhitelist, IPBlacklist,
    FailedLoginAttempt, AuditLog
)
from .email_notifications import send_2fa_enabled_email, send_2fa_disabled_email
from .security_serializers import (
    SecuritySettingsSerializer, UserTOTPDeviceSerializer, TwoFactorBackupCodeSerializer,
    UserSessionSerializer, APIKeySerializer, APIKeyCreateSerializer,
    IPWhitelistSerializer, IPBlacklistSerializer, FailedLoginAttemptSerializer,
    AuditLogSerializer, LoginHistorySerializer, PasswordPolicyValidator
)
from .models import LoginHistory


class StandardResultsPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


# ============================================
# SECURITY SETTINGS VIEWS
# ============================================

@api_view(['GET'])
@permission_classes([IsAdminUser])
def get_security_settings(request):
    """Get global security settings"""
    settings = SecuritySettings.get_settings()
    serializer = SecuritySettingsSerializer(settings)
    return Response(serializer.data)


@api_view(['PATCH'])
@permission_classes([IsAdminUser])
def update_security_settings(request):
    """Update global security settings"""
    from django.core.cache import cache
    from .middleware import SECURITY_SETTINGS_CACHE_KEY
    
    settings = SecuritySettings.get_settings()
    serializer = SecuritySettingsSerializer(settings, data=request.data, partial=True)
    
    if serializer.is_valid():
        serializer.save(updated_by=request.user)
        
        # Invalidate the security settings cache
        cache.delete(SECURITY_SETTINGS_CACHE_KEY)
        
        # Log the change
        AuditLog.log(
            event_type='settings_changed',
            user=request.user,
            ip_address=get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
            description='Security settings updated',
            details={'changed_fields': list(request.data.keys())}
        )
        
        return Response(serializer.data)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def get_password_policy(request):
    """Get current password policy"""
    policy = PasswordPolicyValidator.get_policy()
    return Response(policy)


# ============================================
# TWO-FACTOR AUTHENTICATION VIEWS
# ============================================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def setup_totp(request):
    """
    Setup TOTP for the current user
    Returns QR code and secret for manual entry
    """
    user = request.user
    
    # Check if already has TOTP
    if hasattr(user, 'totp_device') and user.totp_device.is_verified:
        return Response({
            'error': 'TOTP is already set up for this account'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Generate or get secret
    if hasattr(user, 'totp_device'):
        device = user.totp_device
        if not device.is_verified:
            # Regenerate if not verified yet
            device.secret_key = pyotp.random_base32()
            device.save()
    else:
        secret = pyotp.random_base32()
        device = UserTOTPDevice.objects.create(
            user=user,
            secret_key=secret
        )
    
    # Generate provisioning URI
    totp = pyotp.TOTP(device.secret_key)
    provisioning_uri = totp.provisioning_uri(
        name=user.email or user.username,
        issuer_name='Zeugma Platform'
    )
    
    # Generate QR code
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(provisioning_uri)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    
    # Convert to base64
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    qr_code_base64 = base64.b64encode(buffer.getvalue()).decode()
    
    return Response({
        'qr_code': f"data:image/png;base64,{qr_code_base64}",
        'secret': device.secret_key,
        'message': 'Scan the QR code with your authenticator app'
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def verify_totp_setup(request):
    """Verify TOTP setup with a code from the authenticator app"""
    user = request.user
    code = request.data.get('code', '')
    
    if not hasattr(user, 'totp_device'):
        return Response({
            'error': 'TOTP not set up. Please start the setup process first.'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    device = user.totp_device
    totp = pyotp.TOTP(device.secret_key)
    
    if totp.verify(code):
        device.is_verified = True
        device.last_used_at = timezone.now()
        device.save()
        
        # Enable 2FA for user
        user.two_factor_enabled = True
        user.is_2fa_setup_required = False
        user.save()
        
        # Generate backup codes
        backup_codes = generate_backup_codes(user)
        
        # Log the event
        ip_address = get_client_ip(request)
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        
        AuditLog.log(
            event_type='2fa_enabled',
            user=user,
            ip_address=ip_address,
            user_agent=user_agent,
            description='TOTP 2FA enabled'
        )
        
        # Send 2FA enabled confirmation email
        try:
            send_2fa_enabled_email(user, ip_address, user_agent)
        except Exception as e:
            print(f"Failed to send 2FA enabled email: {e}")
        
        return Response({
            'success': True,
            'message': '2FA has been enabled successfully',
            'backup_codes': backup_codes
        })
    
    return Response({
        'error': 'Invalid verification code'
    }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def verify_totp(request):
    """Verify a TOTP code during login"""
    user = request.user
    code = request.data.get('code', '')
    
    if not hasattr(user, 'totp_device') or not user.totp_device.is_verified:
        return Response({
            'error': 'TOTP is not set up for this account'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    device = user.totp_device
    totp = pyotp.TOTP(device.secret_key)
    
    if totp.verify(code):
        device.last_used_at = timezone.now()
        device.save()
        
        AuditLog.log(
            event_type='2fa_verified',
            user=user,
            ip_address=get_client_ip(request),
            description='TOTP verification successful'
        )
        
        return Response({'success': True, 'message': 'Code verified successfully'})
    
    AuditLog.log(
        event_type='2fa_failed',
        user=user,
        ip_address=get_client_ip(request),
        description='TOTP verification failed',
        severity='warning'
    )
    
    return Response({'error': 'Invalid code'}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def disable_totp(request):
    """Disable TOTP 2FA"""
    user = request.user
    password = request.data.get('password', '')
    
    # Verify password
    if not user.check_password(password):
        return Response({
            'error': 'Invalid password'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Delete TOTP device
    if hasattr(user, 'totp_device'):
        user.totp_device.delete()
    
    # Delete backup codes
    TwoFactorBackupCode.objects.filter(user=user).delete()
    
    # Disable 2FA
    user.two_factor_enabled = False
    user.save()
    
    ip_address = get_client_ip(request)
    user_agent = request.META.get('HTTP_USER_AGENT', '')
    
    AuditLog.log(
        event_type='2fa_disabled',
        user=user,
        ip_address=ip_address,
        description='TOTP 2FA disabled'
    )
    
    # Send 2FA disabled notification email
    try:
        send_2fa_disabled_email(user, ip_address, user_agent)
    except Exception as e:
        print(f"Failed to send 2FA disabled email: {e}")
    
    return Response({
        'success': True,
        'message': '2FA has been disabled'
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_2fa_status(request):
    """Get 2FA status for current user"""
    user = request.user
    
    totp_enabled = hasattr(user, 'totp_device') and user.totp_device.is_verified
    email_2fa_enabled = user.two_factor_enabled and not totp_enabled
    
    backup_codes_remaining = TwoFactorBackupCode.objects.filter(
        user=user, is_used=False
    ).count()
    
    return Response({
        'two_factor_enabled': user.two_factor_enabled,
        'totp_enabled': totp_enabled,
        'email_2fa_enabled': email_2fa_enabled,
        'backup_codes_remaining': backup_codes_remaining,
        'is_setup_required': user.is_2fa_setup_required
    })


def generate_backup_codes(user, count=None):
    """Generate backup codes for a user"""
    settings = SecuritySettings.get_settings()
    code_count = count or settings.backup_codes_count
    
    # Delete existing unused codes
    TwoFactorBackupCode.objects.filter(user=user, is_used=False).delete()
    
    codes = []
    for _ in range(code_count):
        code = TwoFactorBackupCode.generate_code()
        TwoFactorBackupCode.objects.create(
            user=user,
            code_hash=TwoFactorBackupCode.hash_code(code)
        )
        codes.append(code)
    
    return codes


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def regenerate_backup_codes(request):
    """Regenerate backup codes"""
    user = request.user
    password = request.data.get('password', '')
    
    if not user.check_password(password):
        return Response({
            'error': 'Invalid password'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    codes = generate_backup_codes(user)
    
    return Response({
        'success': True,
        'backup_codes': codes,
        'message': 'New backup codes generated. Store them safely!'
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def verify_backup_code(request):
    """Verify a backup code during login"""
    user = request.user
    code = request.data.get('code', '').upper().replace('-', '').replace(' ', '')
    
    backup_codes = TwoFactorBackupCode.objects.filter(user=user, is_used=False)
    
    for backup_code in backup_codes:
        if backup_code.verify_code(code):
            backup_code.mark_used()
            
            AuditLog.log(
                event_type='backup_code_used',
                user=user,
                ip_address=get_client_ip(request),
                description='Backup code used for login'
            )
            
            remaining = TwoFactorBackupCode.objects.filter(user=user, is_used=False).count()
            
            return Response({
                'success': True,
                'message': 'Backup code verified',
                'remaining_codes': remaining
            })
    
    return Response({
        'error': 'Invalid backup code'
    }, status=status.HTTP_400_BAD_REQUEST)


# ============================================
# SESSION MANAGEMENT VIEWS
# ============================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_my_sessions(request):
    """Get all active sessions for the current user"""
    sessions = UserSession.objects.filter(user=request.user)
    serializer = UserSessionSerializer(sessions, many=True, context={'request': request})
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def terminate_session(request, session_key):
    """Terminate a specific session"""
    success = UserSession.terminate_session(session_key, request.user)
    
    if success:
        AuditLog.log(
            event_type='session_terminated',
            user=request.user,
            ip_address=get_client_ip(request),
            description=f'Session terminated: {session_key[:8]}...'
        )
        return Response({'success': True, 'message': 'Session terminated'})
    
    return Response({
        'error': 'Session not found'
    }, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def terminate_all_other_sessions(request):
    """Terminate all sessions except the current one"""
    current_session_key = request.session.session_key
    
    other_sessions = UserSession.objects.filter(user=request.user).exclude(
        session_key=current_session_key
    )
    
    count = other_sessions.count()
    
    for session in other_sessions:
        Session.objects.filter(session_key=session.session_key).delete()
    
    other_sessions.delete()
    
    AuditLog.log(
        event_type='session_terminated',
        user=request.user,
        ip_address=get_client_ip(request),
        description=f'Terminated {count} other sessions'
    )
    
    return Response({
        'success': True,
        'message': f'Terminated {count} session(s)',
        'count': count
    })


@api_view(['GET'])
@permission_classes([IsAdminUser])
def get_all_sessions(request):
    """Admin: Get all active sessions"""
    sessions = UserSession.objects.all().select_related('user')
    paginator = StandardResultsPagination()
    page = paginator.paginate_queryset(sessions, request)
    serializer = UserSessionSerializer(page, many=True, context={'request': request})
    return paginator.get_paginated_response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def admin_terminate_session(request, session_key):
    """Admin: Terminate any session"""
    try:
        session = UserSession.objects.get(session_key=session_key)
        user = session.user
        
        Session.objects.filter(session_key=session_key).delete()
        session.delete()
        
        AuditLog.log(
            event_type='session_terminated',
            user=request.user,
            target_user=user,
            ip_address=get_client_ip(request),
            description=f'Admin terminated session for {user.username}'
        )
        
        return Response({'success': True, 'message': 'Session terminated'})
    except UserSession.DoesNotExist:
        return Response({'error': 'Session not found'}, status=status.HTTP_404_NOT_FOUND)


# ============================================
# API KEY MANAGEMENT VIEWS
# ============================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_my_api_keys(request):
    """Get API keys for the current user"""
    keys = APIKey.objects.filter(user=request.user)
    serializer = APIKeySerializer(keys, many=True)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_api_key(request):
    """Create a new API key"""
    serializer = APIKeyCreateSerializer(data=request.data)
    
    if serializer.is_valid():
        api_key, full_key = APIKey.create_key(
            user=request.user,
            name=serializer.validated_data['name'],
            scopes=serializer.validated_data.get('scopes', []),
            expires_at=serializer.validated_data.get('expires_at'),
            created_by=request.user
        )
        
        AuditLog.log(
            event_type='api_key_created',
            user=request.user,
            ip_address=get_client_ip(request),
            description=f'API key created: {api_key.name}'
        )
        
        return Response({
            'success': True,
            'key': full_key,  # Only shown once!
            'api_key': APIKeySerializer(api_key).data,
            'message': 'Store this key safely. It will not be shown again!'
        }, status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def revoke_api_key(request, key_id):
    """Revoke an API key"""
    try:
        api_key = APIKey.objects.get(id=key_id, user=request.user)
        key_name = api_key.name
        api_key.delete()
        
        AuditLog.log(
            event_type='api_key_revoked',
            user=request.user,
            ip_address=get_client_ip(request),
            description=f'API key revoked: {key_name}'
        )
        
        return Response({'success': True, 'message': 'API key revoked'})
    except APIKey.DoesNotExist:
        return Response({'error': 'API key not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_api_key(request, key_id):
    """Update an API key (name, scopes, status)"""
    try:
        api_key = APIKey.objects.get(id=key_id, user=request.user)
        
        if 'name' in request.data:
            api_key.name = request.data['name']
        if 'scopes' in request.data:
            api_key.scopes = request.data['scopes']
        if 'is_active' in request.data:
            api_key.is_active = request.data['is_active']
        if 'expires_at' in request.data:
            api_key.expires_at = request.data['expires_at']
        
        api_key.save()
        
        return Response({
            'success': True,
            'api_key': APIKeySerializer(api_key).data
        })
    except APIKey.DoesNotExist:
        return Response({'error': 'API key not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def get_all_api_keys(request):
    """Admin: Get all API keys"""
    keys = APIKey.objects.all().select_related('user', 'created_by')
    paginator = StandardResultsPagination()
    page = paginator.paginate_queryset(keys, request)
    serializer = APIKeySerializer(page, many=True)
    return paginator.get_paginated_response(serializer.data)


# ============================================
# IP WHITELIST/BLACKLIST VIEWS
# ============================================

@api_view(['GET'])
@permission_classes([IsAdminUser])
def get_ip_whitelist(request):
    """Get IP whitelist"""
    ips = IPWhitelist.objects.all()
    serializer = IPWhitelistSerializer(ips, many=True)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def add_ip_whitelist(request):
    """Add IP to whitelist"""
    serializer = IPWhitelistSerializer(data=request.data)
    
    if serializer.is_valid():
        serializer.save(created_by=request.user)
        
        AuditLog.log(
            event_type='settings_changed',
            user=request.user,
            ip_address=get_client_ip(request),
            description=f'IP whitelisted: {serializer.validated_data["ip_address"]}'
        )
        
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['DELETE'])
@permission_classes([IsAdminUser])
def remove_ip_whitelist(request, pk):
    """Remove IP from whitelist"""
    try:
        ip_entry = IPWhitelist.objects.get(pk=pk)
        ip_address = ip_entry.ip_address
        ip_entry.delete()
        
        AuditLog.log(
            event_type='settings_changed',
            user=request.user,
            ip_address=get_client_ip(request),
            description=f'IP removed from whitelist: {ip_address}'
        )
        
        return Response({'success': True})
    except IPWhitelist.DoesNotExist:
        return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def get_ip_blacklist(request):
    """Get IP blacklist"""
    ips = IPBlacklist.objects.all()
    serializer = IPBlacklistSerializer(ips, many=True)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def add_ip_blacklist(request):
    """Add IP to blacklist"""
    serializer = IPBlacklistSerializer(data=request.data)
    
    if serializer.is_valid():
        serializer.save(created_by=request.user)
        
        AuditLog.log(
            event_type='ip_blocked',
            user=request.user,
            ip_address=get_client_ip(request),
            description=f'IP blacklisted: {serializer.validated_data["ip_address"]}',
            severity='warning'
        )
        
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['DELETE'])
@permission_classes([IsAdminUser])
def remove_ip_blacklist(request, pk):
    """Remove IP from blacklist"""
    try:
        ip_entry = IPBlacklist.objects.get(pk=pk)
        ip_address = ip_entry.ip_address
        ip_entry.delete()
        
        AuditLog.log(
            event_type='ip_unblocked',
            user=request.user,
            ip_address=get_client_ip(request),
            description=f'IP removed from blacklist: {ip_address}'
        )
        
        return Response({'success': True})
    except IPBlacklist.DoesNotExist:
        return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)


# ============================================
# AUDIT LOG VIEWS
# ============================================

@api_view(['GET'])
@permission_classes([IsAdminUser])
def get_audit_logs(request):
    """Get audit logs with filtering"""
    logs = AuditLog.objects.all().select_related('user', 'target_user')
    
    # Filtering
    event_type = request.query_params.get('event_type')
    severity = request.query_params.get('severity')
    user_id = request.query_params.get('user_id')
    date_from = request.query_params.get('date_from')
    date_to = request.query_params.get('date_to')
    
    if event_type:
        logs = logs.filter(event_type=event_type)
    if severity:
        logs = logs.filter(severity=severity)
    if user_id:
        logs = logs.filter(user_id=user_id)
    if date_from:
        logs = logs.filter(timestamp__gte=date_from)
    if date_to:
        logs = logs.filter(timestamp__lte=date_to)
    
    paginator = StandardResultsPagination()
    page = paginator.paginate_queryset(logs, request)
    serializer = AuditLogSerializer(page, many=True)
    return paginator.get_paginated_response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def get_audit_log_stats(request):
    """Get audit log statistics"""
    now = timezone.now()
    last_24h = now - timedelta(hours=24)
    last_7d = now - timedelta(days=7)
    last_30d = now - timedelta(days=30)
    
    stats = {
        'total_events': AuditLog.objects.count(),
        'events_24h': AuditLog.objects.filter(timestamp__gte=last_24h).count(),
        'events_7d': AuditLog.objects.filter(timestamp__gte=last_7d).count(),
        'events_30d': AuditLog.objects.filter(timestamp__gte=last_30d).count(),
        'by_severity': list(
            AuditLog.objects.filter(timestamp__gte=last_7d)
            .values('severity')
            .annotate(count=Count('id'))
        ),
        'by_event_type': list(
            AuditLog.objects.filter(timestamp__gte=last_7d)
            .values('event_type')
            .annotate(count=Count('id'))
            .order_by('-count')[:10]
        ),
        'failed_logins_24h': AuditLog.objects.filter(
            event_type='login_failed',
            timestamp__gte=last_24h
        ).count(),
    }
    
    return Response(stats)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def get_audit_log_event_types(request):
    """Get available audit log event types"""
    return Response({
        'event_types': [
            {'value': choice[0], 'label': choice[1]}
            for choice in AuditLog.EVENT_TYPES
        ],
        'severity_levels': [
            {'value': choice[0], 'label': choice[1]}
            for choice in AuditLog.SEVERITY_LEVELS
        ]
    })


# ============================================
# LOGIN HISTORY & FAILED ATTEMPTS VIEWS
# ============================================

@api_view(['GET'])
@permission_classes([IsAdminUser])
def get_login_history(request):
    """Get login history with filtering"""
    history = LoginHistory.objects.all().select_related('user')
    
    user_id = request.query_params.get('user_id')
    success = request.query_params.get('success')
    date_from = request.query_params.get('date_from')
    date_to = request.query_params.get('date_to')
    
    if user_id:
        history = history.filter(user_id=user_id)
    if success is not None:
        history = history.filter(success=success.lower() == 'true')
    if date_from:
        history = history.filter(login_time__gte=date_from)
    if date_to:
        history = history.filter(login_time__lte=date_to)
    
    paginator = StandardResultsPagination()
    page = paginator.paginate_queryset(history, request)
    serializer = LoginHistorySerializer(page, many=True)
    return paginator.get_paginated_response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def get_failed_login_attempts(request):
    """Get failed login attempts"""
    attempts = FailedLoginAttempt.objects.all()
    
    ip_address = request.query_params.get('ip_address')
    username = request.query_params.get('username')
    
    if ip_address:
        attempts = attempts.filter(ip_address=ip_address)
    if username:
        attempts = attempts.filter(username__icontains=username)
    
    paginator = StandardResultsPagination()
    page = paginator.paginate_queryset(attempts, request)
    serializer = FailedLoginAttemptSerializer(page, many=True)
    return paginator.get_paginated_response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def get_security_dashboard(request):
    """Get security dashboard overview"""
    from .models import User
    
    now = timezone.now()
    last_24h = now - timedelta(hours=24)
    last_7d = now - timedelta(days=7)
    
    # Get settings
    settings = SecuritySettings.get_settings()
    
    # Count failed logins from both sources
    failed_logins_audit = AuditLog.objects.filter(
        event_type='login_failed',
        timestamp__gte=last_24h
    ).count()
    failed_logins_attempts = FailedLoginAttempt.objects.filter(
        attempted_at__gte=last_24h
    ).count()
    
    # Use the maximum of both counts (in case they're recorded differently)
    failed_logins_24h = max(failed_logins_audit, failed_logins_attempts)
    
    # Count users with any type of 2FA enabled (TOTP or Email)
    users_with_2fa = User.objects.filter(two_factor_enabled=True).count()
    
    # Calculate stats
    stats = {
        'settings': SecuritySettingsSerializer(settings).data,
        'active_sessions': UserSession.objects.count(),
        'active_api_keys': APIKey.objects.filter(is_active=True).count(),
        'users_with_2fa': users_with_2fa,
        'failed_logins_24h': failed_logins_24h,
        'blacklisted_ips': IPBlacklist.objects.filter(is_active=True).count(),
        'whitelisted_ips': IPWhitelist.objects.filter(is_active=True).count(),
        'recent_security_events': AuditLogSerializer(
            AuditLog.objects.filter(
                severity__in=['warning', 'critical'],
                timestamp__gte=last_7d
            ).order_by('-timestamp')[:10],
            many=True
        ).data,
    }
    
    return Response(stats)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def cleanup_stale_sessions(request):
    """
    Clean up stale sessions - sessions in our tracking table 
    that no longer have a corresponding Django session.
    """
    from django.contrib.sessions.models import Session
    
    # Get all tracked sessions
    tracked_sessions = UserSession.objects.all()
    
    # Get all valid Django session keys
    valid_session_keys = set(
        Session.objects.filter(expire_date__gt=timezone.now())
        .values_list('session_key', flat=True)
    )
    
    # Find and delete stale sessions
    stale_count = 0
    for session in tracked_sessions:
        if session.session_key not in valid_session_keys:
            session.delete()
            stale_count += 1
    
    if stale_count > 0:
        AuditLog.log(
            event_type='settings_changed',
            user=request.user,
            ip_address=get_client_ip(request),
            description=f'Cleaned up {stale_count} stale session(s)',
            severity='info'
        )
    
    return Response({
        'success': True,
        'stale_sessions_removed': stale_count,
        'message': f'Removed {stale_count} stale session(s)'
    })


# ============================================
# HELPER FUNCTIONS
# ============================================

def get_client_ip(request):
    """Get client IP address from request"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


# ============================================
# AUDIT LOG CLEANUP VIEWS
# ============================================

@api_view(['GET'])
@permission_classes([IsAdminUser])
def get_cleanup_preview(request):
    """
    Preview what would be deleted during cleanup.
    Uses the retention days from settings or optional override.
    """
    days = request.query_params.get('days')
    
    if days:
        retention_days = int(days)
    else:
        settings_obj = SecuritySettings.get_settings()
        retention_days = settings_obj.audit_retention_days
    
    if retention_days <= 0:
        return Response({
            'retention_days': retention_days,
            'audit_logs_count': 0,
            'failed_logins_count': 0,
            'total_count': 0,
            'message': 'Retention is set to 0 (keep forever). No cleanup will be performed.'
        })
    
    cutoff_date = timezone.now() - timedelta(days=retention_days)
    
    audit_logs_count = AuditLog.objects.filter(timestamp__lt=cutoff_date).count()
    failed_logins_count = FailedLoginAttempt.objects.filter(attempted_at__lt=cutoff_date).count()
    
    return Response({
        'retention_days': retention_days,
        'cutoff_date': cutoff_date.isoformat(),
        'audit_logs_count': audit_logs_count,
        'failed_logins_count': failed_logins_count,
        'total_count': audit_logs_count + failed_logins_count,
        'message': f'Records older than {retention_days} days will be deleted'
    })


@api_view(['POST'])
@permission_classes([IsAdminUser])
def run_cleanup(request):
    """
    Run audit log cleanup.
    Deletes audit logs and failed login attempts older than retention period.
    """
    days = request.data.get('days')
    include_failed_logins = request.data.get('include_failed_logins', True)
    
    if days:
        retention_days = int(days)
    else:
        settings_obj = SecuritySettings.get_settings()
        retention_days = settings_obj.audit_retention_days
    
    if retention_days <= 0:
        return Response({
            'success': False,
            'message': 'Retention is set to 0 (keep forever). No cleanup performed.',
            'audit_logs_deleted': 0,
            'failed_logins_deleted': 0
        })
    
    cutoff_date = timezone.now() - timedelta(days=retention_days)
    
    # Delete audit logs
    audit_logs_to_delete = AuditLog.objects.filter(timestamp__lt=cutoff_date)
    audit_count = audit_logs_to_delete.count()
    audit_logs_to_delete.delete()
    
    # Delete failed login attempts
    failed_count = 0
    if include_failed_logins:
        failed_logins_to_delete = FailedLoginAttempt.objects.filter(attempted_at__lt=cutoff_date)
        failed_count = failed_logins_to_delete.count()
        failed_logins_to_delete.delete()
    
    total_deleted = audit_count + failed_count
    
    # Log the cleanup action
    if total_deleted > 0:
        AuditLog.log(
            event_type='settings_changed',
            user=request.user,
            ip_address=get_client_ip(request),
            description=f'Manual audit log cleanup: deleted {audit_count} audit logs and {failed_count} failed login attempts older than {retention_days} days',
            severity='info',
            details={
                'retention_days': retention_days,
                'audit_logs_deleted': audit_count,
                'failed_logins_deleted': failed_count,
                'cutoff_date': cutoff_date.isoformat(),
                'triggered_by': 'manual'
            }
        )
    
    return Response({
        'success': True,
        'message': f'Cleanup complete! Deleted {total_deleted} records.',
        'retention_days': retention_days,
        'audit_logs_deleted': audit_count,
        'failed_logins_deleted': failed_count,
        'total_deleted': total_deleted
    })
