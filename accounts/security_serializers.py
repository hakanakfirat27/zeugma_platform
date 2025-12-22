# accounts/security_serializers.py
# Serializers for security-related models

from rest_framework import serializers
from django.utils import timezone
from .security_models import (
    SecuritySettings, UserTOTPDevice, TwoFactorBackupCode,
    UserSession, PasswordHistory, APIKey, IPWhitelist, IPBlacklist,
    FailedLoginAttempt, AuditLog
)
from .models import User, LoginHistory


class SecuritySettingsSerializer(serializers.ModelSerializer):
    """Serializer for global security settings"""
    updated_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = SecuritySettings
        fields = '__all__'
        read_only_fields = ['updated_at', 'updated_by']
    
    def get_updated_by_name(self, obj):
        if obj.updated_by:
            return obj.updated_by.full_name or obj.updated_by.username
        return None


class UserTOTPDeviceSerializer(serializers.ModelSerializer):
    """Serializer for TOTP device (without exposing secret key)"""
    
    class Meta:
        model = UserTOTPDevice
        fields = ['id', 'is_verified', 'created_at', 'last_used_at']
        read_only_fields = fields


class TwoFactorBackupCodeSerializer(serializers.ModelSerializer):
    """Serializer for backup codes"""
    
    class Meta:
        model = TwoFactorBackupCode
        fields = ['id', 'is_used', 'used_at', 'created_at']
        read_only_fields = fields


class UserSessionSerializer(serializers.ModelSerializer):
    """Serializer for user sessions"""
    is_expired = serializers.SerializerMethodField()
    time_since_activity = serializers.SerializerMethodField()
    user_name = serializers.SerializerMethodField()
    username = serializers.SerializerMethodField()
    user_id = serializers.IntegerField(source='user.id', read_only=True)
    is_current = serializers.SerializerMethodField()  # Override to check against request session
    
    class Meta:
        model = UserSession
        fields = [
            'id', 'session_key', 'user_id', 'username', 'user_name',
            'device_name', 'device_type', 'browser', 'os', 
            'ip_address', 'location', 'is_current',
            'created_at', 'last_activity', 'expires_at', 'is_expired',
            'time_since_activity'
        ]
        read_only_fields = fields
    
    def get_is_expired(self, obj):
        return obj.is_expired()
    
    def get_is_current(self, obj):
        """Check if this session is the viewer's current session"""
        request = self.context.get('request')
        if request and hasattr(request, 'session'):
            return obj.session_key == request.session.session_key
        return False
    
    def get_user_name(self, obj):
        if obj.user:
            return obj.user.full_name or obj.user.username
        return 'Unknown'
    
    def get_username(self, obj):
        if obj.user:
            return obj.user.username
        return 'Unknown'
    
    def get_time_since_activity(self, obj):
        if not obj.last_activity:
            return "Unknown"
        
        from django.utils import timezone
        import math
        
        now = timezone.now()
        delta = now - obj.last_activity
        total_seconds = delta.total_seconds()
        
        if total_seconds < 60:
            return "Just now"
        elif total_seconds < 3600:
            minutes = int(total_seconds // 60)
            return f"{minutes} minute{'s' if minutes != 1 else ''} ago"
        elif total_seconds < 86400:
            hours = int(total_seconds // 3600)
            return f"{hours} hour{'s' if hours != 1 else ''} ago"
        else:
            days = int(total_seconds // 86400)
            return f"{days} day{'s' if days != 1 else ''} ago"


class APIKeySerializer(serializers.ModelSerializer):
    """Serializer for API keys (never exposes full key)"""
    user_name = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    is_valid = serializers.SerializerMethodField()
    masked_key = serializers.SerializerMethodField()
    
    class Meta:
        model = APIKey
        fields = [
            'id', 'name', 'key_prefix', 'masked_key', 'scopes',
            'last_used_at', 'last_used_ip', 'usage_count',
            'is_active', 'expires_at', 'is_valid',
            'created_at', 'user_name', 'created_by_name'
        ]
        read_only_fields = [
            'id', 'key_prefix', 'masked_key', 'last_used_at', 
            'last_used_ip', 'usage_count', 'created_at'
        ]
    
    def get_user_name(self, obj):
        return obj.user.full_name or obj.user.username
    
    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.full_name or obj.created_by.username
        return None
    
    def get_is_valid(self, obj):
        return obj.is_valid()
    
    def get_masked_key(self, obj):
        return f"{obj.key_prefix}{'*' * 24}"


class APIKeyCreateSerializer(serializers.Serializer):
    """Serializer for creating API keys"""
    name = serializers.CharField(max_length=100)
    scopes = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        default=list
    )
    expires_at = serializers.DateTimeField(required=False, allow_null=True)
    user_id = serializers.IntegerField(required=False)


class IPWhitelistSerializer(serializers.ModelSerializer):
    """Serializer for IP whitelist"""
    created_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = IPWhitelist
        fields = [
            'id', 'ip_address', 'description', 'is_active',
            'created_at', 'created_by_name'
        ]
        read_only_fields = ['id', 'created_at']
    
    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.full_name or obj.created_by.username
        return None


class IPBlacklistSerializer(serializers.ModelSerializer):
    """Serializer for IP blacklist"""
    created_by_name = serializers.SerializerMethodField()
    is_blocked = serializers.SerializerMethodField()
    
    class Meta:
        model = IPBlacklist
        fields = [
            'id', 'ip_address', 'reason', 'is_active', 'blocked_until',
            'is_blocked', 'created_at', 'created_by_name'
        ]
        read_only_fields = ['id', 'created_at', 'is_blocked']
    
    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.full_name or obj.created_by.username
        return None
    
    def get_is_blocked(self, obj):
        return obj.is_blocked()


class FailedLoginAttemptSerializer(serializers.ModelSerializer):
    """Serializer for failed login attempts"""
    reason_display = serializers.CharField(source='get_reason_display', read_only=True)
    
    class Meta:
        model = FailedLoginAttempt
        fields = [
            'id', 'username', 'ip_address', 'user_agent',
            'attempted_at', 'reason', 'reason_display'
        ]
        read_only_fields = fields


class AuditLogSerializer(serializers.ModelSerializer):
    """Serializer for audit logs"""
    user_name = serializers.SerializerMethodField()
    target_user_name = serializers.SerializerMethodField()
    event_type_display = serializers.CharField(source='get_event_type_display', read_only=True)
    severity_display = serializers.CharField(source='get_severity_display', read_only=True)
    
    class Meta:
        model = AuditLog
        fields = [
            'id', 'event_type', 'event_type_display', 'severity', 'severity_display',
            'user', 'user_name', 'target_user', 'target_user_name',
            'ip_address', 'user_agent', 'timestamp', 'description', 'details'
        ]
        read_only_fields = fields
    
    def get_user_name(self, obj):
        if obj.user:
            return obj.user.full_name or obj.user.username
        return None
    
    def get_target_user_name(self, obj):
        if obj.target_user:
            return obj.target_user.full_name or obj.target_user.username
        return None


class LoginHistorySerializer(serializers.ModelSerializer):
    """Serializer for login history"""
    user_name = serializers.SerializerMethodField()
    
    class Meta:
        model = LoginHistory
        fields = ['id', 'user', 'user_name', 'login_time', 'ip_address', 'user_agent', 'success']
        read_only_fields = fields
    
    def get_user_name(self, obj):
        return obj.user.full_name or obj.user.username


# Password validation helper
class PasswordPolicyValidator:
    """Helper class to validate passwords against security settings"""
    
    @staticmethod
    def validate(password, user=None):
        """Validate password against current security settings"""
        errors = []
        settings = SecuritySettings.get_settings()
        
        # Minimum length
        if len(password) < settings.min_password_length:
            errors.append(f"Password must be at least {settings.min_password_length} characters long")
        
        # Uppercase requirement
        if settings.require_uppercase and not any(c.isupper() for c in password):
            errors.append("Password must contain at least one uppercase letter")
        
        # Lowercase requirement
        if settings.require_lowercase and not any(c.islower() for c in password):
            errors.append("Password must contain at least one lowercase letter")
        
        # Number requirement
        if settings.require_numbers and not any(c.isdigit() for c in password):
            errors.append("Password must contain at least one number")
        
        # Special character requirement
        if settings.require_special_chars:
            special_chars = "!@#$%^&*()_+-=[]{}|;:',.<>?/~`"
            if not any(c in special_chars for c in password):
                errors.append("Password must contain at least one special character")
        
        # Password history check
        if user and settings.password_history_count > 0:
            if PasswordHistory.is_password_used(user, password):
                errors.append(f"This password was recently used. Please choose a different password")
        
        return errors
    
    @staticmethod
    def get_policy():
        """Get the current password policy for display"""
        settings = SecuritySettings.get_settings()
        return {
            'min_length': settings.min_password_length,
            'require_uppercase': settings.require_uppercase,
            'require_lowercase': settings.require_lowercase,
            'require_numbers': settings.require_numbers,
            'require_special_chars': settings.require_special_chars,
            'password_expiry_days': settings.password_expiry_days,
            'password_history_count': settings.password_history_count,
        }
