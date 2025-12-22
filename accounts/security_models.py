# accounts/security_models.py
# Security-related models for comprehensive security management
# Note: These models have _acc suffix on related_names to avoid conflicts with dashboard models

from django.db import models
from django.conf import settings
from django.utils import timezone
from django.contrib.auth.hashers import make_password, check_password
import secrets
import string
import hashlib
import uuid


class SecuritySettings(models.Model):
    """
    Global security settings for the platform
    Singleton pattern - only one instance should exist
    """
    # Two-Factor Authentication Settings
    enforce_2fa_first_login = models.BooleanField(
        default=False, 
        help_text="Require all users to set up 2FA on first login (users can disable later)"
    )
    email_2fa_enabled = models.BooleanField(
        default=True, 
        help_text="Enable email-based 2FA"
    )
    backup_codes_count = models.IntegerField(
        default=5, 
        help_text="Number of backup codes to generate for recovery"
    )
    
    # Session Settings
    session_timeout_minutes = models.IntegerField(
        default=60, 
        help_text="Session timeout in minutes (0 = no timeout)"
    )
    max_concurrent_sessions = models.IntegerField(
        default=5, 
        help_text="Maximum concurrent sessions per user (0 = unlimited)"
    )
    single_session_mode = models.BooleanField(
        default=False, 
        help_text="Allow only one session per user"
    )
    
    # Password Policy Settings
    min_password_length = models.IntegerField(default=8)
    require_uppercase = models.BooleanField(default=True)
    require_lowercase = models.BooleanField(default=True)
    require_numbers = models.BooleanField(default=True)
    require_special_chars = models.BooleanField(default=False)
    password_expiry_days = models.IntegerField(
        default=0, 
        help_text="Days until password expires (0 = never)"
    )
    password_history_count = models.IntegerField(
        default=5, 
        help_text="Number of previous passwords to remember"
    )
    
    # Login Security Settings
    max_failed_attempts = models.IntegerField(
        default=5, 
        help_text="Failed attempts before lockout"
    )
    lockout_duration_minutes = models.IntegerField(
        default=30, 
        help_text="Account lockout duration in minutes"
    )
    enable_ip_whitelist = models.BooleanField(
        default=False, 
        help_text="Only allow logins from whitelisted IPs"
    )
    enable_ip_blacklist = models.BooleanField(
        default=True, 
        help_text="Block logins from blacklisted IPs"
    )
    
    # Audit Settings
    log_all_logins = models.BooleanField(default=True)
    log_failed_logins = models.BooleanField(default=True)
    log_admin_actions = models.BooleanField(default=True)
    audit_retention_days = models.IntegerField(
        default=90, 
        help_text="Days to keep audit logs"
    )
    
    # Metadata
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='acc_security_settings_updates'
    )
    
    class Meta:
        verbose_name = 'Security Settings'
        verbose_name_plural = 'Security Settings'
        # Use a different db_table to avoid conflicts
        db_table = 'accounts_securitysettings'
    
    def save(self, *args, **kwargs):
        # Ensure only one instance exists
        self.pk = 1
        super().save(*args, **kwargs)
    
    @classmethod
    def get_settings(cls):
        """Get or create the singleton instance"""
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


class UserTOTPDevice(models.Model):
    """
    TOTP (Time-based One-Time Password) device for authenticator apps
    """
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='totp_device'
    )
    secret_key = models.CharField(max_length=32)
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    last_used_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        verbose_name = 'User TOTP Device'
        verbose_name_plural = 'User TOTP Devices'
    
    def __str__(self):
        return f"TOTP for {self.user.username}"


class TwoFactorBackupCode(models.Model):
    """
    Backup codes for 2FA recovery
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='backup_codes'
    )
    code_hash = models.CharField(max_length=128)  # Store hashed codes
    is_used = models.BooleanField(default=False)
    used_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'Two-Factor Backup Code'
        verbose_name_plural = 'Two-Factor Backup Codes'
    
    @staticmethod
    def generate_code():
        """Generate a random 8-character backup code"""
        return ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(8))
    
    @staticmethod
    def hash_code(code):
        """Hash a backup code for storage"""
        return hashlib.sha256(code.encode()).hexdigest()
    
    def verify_code(self, code):
        """Verify if the provided code matches"""
        return self.code_hash == self.hash_code(code) and not self.is_used
    
    def mark_used(self):
        """Mark the code as used"""
        self.is_used = True
        self.used_at = timezone.now()
        self.save()


class UserSession(models.Model):
    """
    Track active user sessions for session management
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='acc_active_sessions'
    )
    session_key = models.CharField(max_length=40, unique=True)
    device_name = models.CharField(max_length=255, blank=True)
    device_type = models.CharField(
        max_length=20, 
        choices=[
            ('desktop', 'Desktop'),
            ('mobile', 'Mobile'),
            ('tablet', 'Tablet'),
            ('unknown', 'Unknown'),
        ],
        default='unknown'
    )
    browser = models.CharField(max_length=100, blank=True)
    os = models.CharField(max_length=100, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    location = models.CharField(max_length=255, blank=True)
    is_current = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    last_activity = models.DateTimeField(auto_now=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        verbose_name = 'User Session'
        verbose_name_plural = 'User Sessions'
        ordering = ['-last_activity']
        db_table = 'accounts_usersession'
    
    def __str__(self):
        return f"Session for {self.user.username} - {self.device_name}"
    
    def is_expired(self):
        """Check if session is expired"""
        if self.expires_at:
            return timezone.now() > self.expires_at
        return False
    
    @classmethod
    def terminate_session(cls, session_key, user):
        """Terminate a specific session"""
        try:
            from django.contrib.sessions.models import Session
            session = cls.objects.get(session_key=session_key, user=user)
            # Delete Django session
            Session.objects.filter(session_key=session_key).delete()
            # Delete our tracking record
            session.delete()
            return True
        except cls.DoesNotExist:
            return False


class PasswordHistory(models.Model):
    """
    Track password history to prevent reuse
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='acc_password_history'
    )
    password_hash = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'Password History'
        verbose_name_plural = 'Password Histories'
        ordering = ['-created_at']
        db_table = 'accounts_passwordhistory'
    
    @classmethod
    def add_password(cls, user, password):
        """Add a password to history"""
        cls.objects.create(
            user=user,
            password_hash=make_password(password)
        )
        
        # Clean up old entries based on settings
        settings_obj = SecuritySettings.get_settings()
        history_count = settings_obj.password_history_count
        
        # Keep only the most recent passwords
        old_entries = cls.objects.filter(user=user).order_by('-created_at')[history_count:]
        for entry in old_entries:
            entry.delete()
    
    @classmethod
    def is_password_used(cls, user, password):
        """Check if password was recently used"""
        settings_obj = SecuritySettings.get_settings()
        history_count = settings_obj.password_history_count
        
        recent_passwords = cls.objects.filter(user=user).order_by('-created_at')[:history_count]
        
        for entry in recent_passwords:
            if check_password(password, entry.password_hash):
                return True
        return False


class APIKey(models.Model):
    """
    API keys for programmatic access
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='acc_api_keys'
    )
    name = models.CharField(max_length=100)
    key_prefix = models.CharField(max_length=8)  # First 8 chars for identification
    key_hash = models.CharField(max_length=128)  # SHA256 hash of the full key
    
    # Permissions/Scopes
    scopes = models.JSONField(
        default=list, 
        help_text="List of allowed API scopes"
    )
    
    # Usage tracking
    last_used_at = models.DateTimeField(null=True, blank=True)
    last_used_ip = models.GenericIPAddressField(null=True, blank=True)
    usage_count = models.IntegerField(default=0)
    
    # Status
    is_active = models.BooleanField(default=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        related_name='acc_created_api_keys'
    )
    
    class Meta:
        verbose_name = 'API Key'
        verbose_name_plural = 'API Keys'
        ordering = ['-created_at']
        db_table = 'accounts_apikey'
    
    def __str__(self):
        return f"{self.name} ({self.key_prefix}...)"
    
    @classmethod
    def generate_key(cls):
        """Generate a new API key"""
        key = secrets.token_urlsafe(32)
        return key
    
    @classmethod
    def create_key(cls, user, name, scopes=None, expires_at=None, created_by=None):
        """Create a new API key and return the full key (only shown once)"""
        full_key = cls.generate_key()
        key_prefix = full_key[:8]
        key_hash = hashlib.sha256(full_key.encode()).hexdigest()
        
        api_key = cls.objects.create(
            user=user,
            name=name,
            key_prefix=key_prefix,
            key_hash=key_hash,
            scopes=scopes or [],
            expires_at=expires_at,
            created_by=created_by or user
        )
        
        return api_key, full_key
    
    def verify_key(self, key):
        """Verify if a key matches this API key"""
        return self.key_hash == hashlib.sha256(key.encode()).hexdigest()
    
    def record_usage(self, ip_address=None):
        """Record API key usage"""
        self.last_used_at = timezone.now()
        self.last_used_ip = ip_address
        self.usage_count += 1
        self.save(update_fields=['last_used_at', 'last_used_ip', 'usage_count'])
    
    def is_expired(self):
        """Check if key is expired"""
        if self.expires_at:
            return timezone.now() > self.expires_at
        return False
    
    def is_valid(self):
        """Check if key is valid (active and not expired)"""
        return self.is_active and not self.is_expired()


class IPWhitelist(models.Model):
    """
    Whitelisted IP addresses for login security
    """
    ip_address = models.GenericIPAddressField()
    description = models.CharField(max_length=255, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True,
        related_name='created_ip_whitelists'
    )
    
    class Meta:
        verbose_name = 'IP Whitelist'
        verbose_name_plural = 'IP Whitelists'
        unique_together = ['ip_address']
    
    def __str__(self):
        return f"{self.ip_address} - {self.description}"


class IPBlacklist(models.Model):
    """
    Blacklisted IP addresses for login security
    """
    ip_address = models.GenericIPAddressField()
    reason = models.CharField(max_length=255, blank=True)
    is_active = models.BooleanField(default=True)
    blocked_until = models.DateTimeField(null=True, blank=True)  # Temporary blocks
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True,
        related_name='created_ip_blacklists'
    )
    
    class Meta:
        verbose_name = 'IP Blacklist'
        verbose_name_plural = 'IP Blacklists'
        unique_together = ['ip_address']
    
    def __str__(self):
        return f"{self.ip_address} - {self.reason}"
    
    def is_blocked(self):
        """Check if IP is currently blocked"""
        if not self.is_active:
            return False
        if self.blocked_until and timezone.now() > self.blocked_until:
            return False
        return True


class FailedLoginAttempt(models.Model):
    """
    Track failed login attempts for security
    """
    username = models.CharField(max_length=150)
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField(blank=True)
    attempted_at = models.DateTimeField(auto_now_add=True)
    reason = models.CharField(
        max_length=50,
        choices=[
            ('invalid_password', 'Invalid Password'),
            ('invalid_username', 'Invalid Username'),
            ('account_locked', 'Account Locked'),
            ('account_disabled', 'Account Disabled'),
            ('ip_blocked', 'IP Blocked'),
        ],
        default='invalid_password'
    )
    
    class Meta:
        verbose_name = 'Failed Login Attempt'
        verbose_name_plural = 'Failed Login Attempts'
        ordering = ['-attempted_at']
        indexes = [
            models.Index(fields=['ip_address', '-attempted_at']),
            models.Index(fields=['username', '-attempted_at']),
        ]
    
    @classmethod
    def get_recent_attempts(cls, ip_address=None, username=None, minutes=30):
        """Get recent failed attempts"""
        cutoff_time = timezone.now() - timezone.timedelta(minutes=minutes)
        query = cls.objects.filter(attempted_at__gte=cutoff_time)
        
        if ip_address:
            query = query.filter(ip_address=ip_address)
        if username:
            query = query.filter(username=username)
        
        return query.count()
    
    @classmethod
    def should_lock(cls, ip_address=None, username=None):
        """Check if account/IP should be locked based on failed attempts"""
        settings_obj = SecuritySettings.get_settings()
        max_attempts = settings_obj.max_failed_attempts
        lockout_duration = settings_obj.lockout_duration_minutes
        
        recent_attempts = cls.get_recent_attempts(
            ip_address=ip_address, 
            username=username, 
            minutes=lockout_duration
        )
        
        return recent_attempts >= max_attempts


class AuditLog(models.Model):
    """
    Security audit log for tracking important events
    """
    EVENT_TYPES = [
        # Authentication Events
        ('login_success', 'Login Success'),
        ('login_failed', 'Login Failed'),
        ('logout', 'Logout'),
        ('password_change', 'Password Change'),
        ('password_reset', 'Password Reset'),
        
        # 2FA Events
        ('2fa_enabled', '2FA Enabled'),
        ('2fa_disabled', '2FA Disabled'),
        ('2fa_verified', '2FA Verified'),
        ('2fa_failed', '2FA Failed'),
        ('backup_code_used', 'Backup Code Used'),
        
        # Session Events
        ('session_created', 'Session Created'),
        ('session_terminated', 'Session Terminated'),
        ('session_expired', 'Session Expired'),
        
        # API Key Events
        ('api_key_created', 'API Key Created'),
        ('api_key_revoked', 'API Key Revoked'),
        ('api_key_used', 'API Key Used'),
        
        # Admin Actions
        ('user_created', 'User Created'),
        ('user_updated', 'User Updated'),
        ('user_deleted', 'User Deleted'),
        ('user_locked', 'User Locked'),
        ('user_unlocked', 'User Unlocked'),
        ('settings_changed', 'Settings Changed'),
        
        # Security Events
        ('ip_blocked', 'IP Blocked'),
        ('ip_unblocked', 'IP Unblocked'),
        ('suspicious_activity', 'Suspicious Activity'),
    ]
    
    SEVERITY_LEVELS = [
        ('info', 'Info'),
        ('warning', 'Warning'),
        ('critical', 'Critical'),
    ]
    
    event_type = models.CharField(max_length=50, choices=EVENT_TYPES)
    severity = models.CharField(max_length=20, choices=SEVERITY_LEVELS, default='info')
    
    # Who
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='acc_audit_logs'
    )
    target_user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='acc_audit_logs_as_target'
    )
    
    # When/Where
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    
    # What
    description = models.TextField(blank=True)
    details = models.JSONField(default=dict, blank=True)
    
    class Meta:
        verbose_name = 'Audit Log'
        verbose_name_plural = 'Audit Logs'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['-timestamp']),
            models.Index(fields=['event_type', '-timestamp']),
            models.Index(fields=['user', '-timestamp']),
            models.Index(fields=['severity', '-timestamp']),
        ]
        db_table = 'accounts_auditlog'
    
    def __str__(self):
        return f"{self.get_event_type_display()} - {self.timestamp}"
    
    @classmethod
    def log(cls, event_type, user=None, target_user=None, ip_address=None, 
            user_agent='', description='', details=None, severity='info'):
        """Create a new audit log entry with conditional logging based on settings"""
        # Get settings to check if we should log this event
        settings = SecuritySettings.get_settings()
        
        # Determine if we should log based on event type and settings
        should_log = True
        
        # Check login success logging
        if event_type == 'login_success' and not settings.log_all_logins:
            should_log = False
        
        # Check failed login logging
        if event_type == 'login_failed' and not settings.log_failed_logins:
            should_log = False
        
        # Check admin actions logging
        admin_event_types = [
            'user_created', 'user_updated', 'user_deleted', 
            'user_locked', 'user_unlocked', 'settings_changed',
            'ip_blocked', 'ip_unblocked'
        ]
        if event_type in admin_event_types and not settings.log_admin_actions:
            should_log = False
        
        # Always log critical security events regardless of settings
        critical_events = [
            'suspicious_activity', '2fa_failed', 'api_key_revoked'
        ]
        if event_type in critical_events or severity == 'critical':
            should_log = True
        
        if not should_log:
            return None
        
        return cls.objects.create(
            event_type=event_type,
            severity=severity,
            user=user,
            target_user=target_user,
            ip_address=ip_address,
            user_agent=user_agent,
            description=description,
            details=details or {}
        )
