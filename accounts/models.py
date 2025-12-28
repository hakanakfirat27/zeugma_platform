from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone
from datetime import timedelta
import random
import string

# Import security models to make them available through this module
from .security_models import (
    SecuritySettings, UserTOTPDevice, TwoFactorBackupCode,
    UserSession, PasswordHistory, APIKey, IPWhitelist, IPBlacklist,
    FailedLoginAttempt, AuditLog
)

# Import user settings models
from .user_settings_models import UserSettings, DefaultUserSettings


# This class defines the choices for the 'role' field.
# It makes the code more readable and prevents typos.
class UserRole(models.TextChoices):
    SUPERADMIN = 'SUPERADMIN', 'Superadmin'
    STAFF_ADMIN = 'STAFF_ADMIN', 'Staff Admin'
    DATA_COLLECTOR = 'DATA_COLLECTOR', 'Data Collector'  
    CLIENT = 'CLIENT', 'Client'
    GUEST = 'GUEST', 'Guest'


# This is our custom User model. It inherits all the fields from Django's
# default user (username, email, password, etc.) and adds our custom 'role' field.
class User(AbstractUser):
    role = models.CharField(
        max_length=20,
        choices=UserRole.choices,
        default=UserRole.GUEST  # New users will be 'Guest' by default.
    )

    phone_number = models.CharField(max_length=20, blank=True, null=True)
    company_name = models.CharField(max_length=255, blank=True, null=True)
    is_online = models.BooleanField(default=False)
    last_activity = models.DateTimeField(null=True, blank=True)

    # 2FA Fields
    two_factor_enabled = models.BooleanField(default=False)
    is_2fa_setup_required = models.BooleanField(default=True)  # Force 2FA on first login
    two_factor_code = models.CharField(max_length=6, blank=True, null=True)
    two_factor_code_created_at = models.DateTimeField(null=True, blank=True)

    # Login Tracking Fields
    login_count = models.IntegerField(default=0, help_text='Total number of successful logins')
    last_login_ip = models.GenericIPAddressField(null=True, blank=True, help_text='IP address of last login')
    
    # Password Management Fields
    password_changed_at = models.DateTimeField(null=True, blank=True, help_text='When password was last changed')

    def save(self, *args, **kwargs):
        """
        Override save to automatically sync role with is_staff and is_superuser
        """
        # Sync role to Django's built-in fields
        if self.role == UserRole.SUPERADMIN:
            self.is_superuser = True
            self.is_staff = True  # Superadmins should also have staff access
        elif self.role == UserRole.STAFF_ADMIN:
            self.is_staff = True
            self.is_superuser = False
        else:
            # Clients and Guests should not have admin access
            self.is_staff = False
            self.is_superuser = False

        # If is_superuser is manually set to True, ensure role is SUPERADMIN
        if self.is_superuser and self.role != UserRole.SUPERADMIN:
            self.role = UserRole.SUPERADMIN

        # Call the original save() method to save the object
        super().save(*args, **kwargs)

    @property
    def full_name(self):
        """Return the user's full name."""
        if self.first_name and self.last_name:
            return f"{self.first_name} {self.last_name}"
        elif self.first_name:
            return self.first_name
        elif self.last_name:
            return self.last_name
        return self.username

    @property
    def initials(self):
        """Return the user's initials."""
        if self.first_name and self.last_name:
            return f"{self.first_name[0]}{self.last_name[0]}".upper()
        elif self.first_name:
            return self.first_name[0].upper()
        elif self.username:
            return self.username[0].upper()
        return "?"

    def update_last_activity(self):
        """Update the last activity timestamp."""
        from django.utils import timezone
        self.last_activity = timezone.now()
        self.save(update_fields=['last_activity'])

    def generate_2fa_code(self):
        """Generate a random 6-digit code"""
        code = ''.join(random.choices(string.digits, k=6))
        self.two_factor_code = code
        self.two_factor_code_created_at = timezone.now()
        self.save()
        return code

    def verify_2fa_code(self, code):
        """Verify the 2FA code (valid for 10 minutes)"""
        if not self.two_factor_code or not self.two_factor_code_created_at:
            return False

        # Check if code matches
        if self.two_factor_code != code:
            return False

        # Check if code is expired (10 minutes)
        expiry_time = self.two_factor_code_created_at + timedelta(minutes=10)
        if timezone.now() > expiry_time:
            return False

        return True

    def clear_2fa_code(self):
        """Clear the 2FA code after successful verification"""
        self.two_factor_code = None
        self.two_factor_code_created_at = None
        self.save()

    def record_login(self, ip_address=None, user_agent=None):
        """Record a successful login"""
        self.login_count += 1
        self.last_login_ip = ip_address
        self.save(update_fields=['login_count', 'last_login_ip'])

        # Create login history entry
        LoginHistory.objects.create(
            user=self,
            ip_address=ip_address,
            user_agent=user_agent,
            success=True
        )

    def is_password_expired(self):
        """Check if user's password has expired based on security settings"""
        settings = SecuritySettings.get_settings()
        
        # If password expiry is disabled (0 days), password never expires
        if settings.password_expiry_days == 0:
            return False
        
        # If password_changed_at is not set, consider it expired (force change)
        if not self.password_changed_at:
            return True
        
        # Calculate expiry date
        expiry_date = self.password_changed_at + timedelta(days=settings.password_expiry_days)
        return timezone.now() > expiry_date
    
    def days_until_password_expires(self):
        """Get number of days until password expires (None if never)"""
        settings = SecuritySettings.get_settings()
        
        if settings.password_expiry_days == 0:
            return None  # Never expires
        
        if not self.password_changed_at:
            return 0  # Already expired
        
        expiry_date = self.password_changed_at + timedelta(days=settings.password_expiry_days)
        days_left = (expiry_date - timezone.now()).days
        return max(0, days_left)
    
    def update_password(self, new_password):
        """Update password with tracking and history"""
        # Save old password to history before changing
        if self.password:  # Only if user already has a password
            PasswordHistory.add_password(self, self.password)
        
        # Set new password
        self.set_password(new_password)
        self.password_changed_at = timezone.now()
        self.save()

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"


class LoginHistory(models.Model):
    """Track individual login events for analytics"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='login_history')
    login_time = models.DateTimeField(default=timezone.now)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True, null=True)
    success = models.BooleanField(default=True)

    class Meta:
        verbose_name = 'Login History'
        verbose_name_plural = 'Login Histories'
        ordering = ['-login_time']
        indexes = [
            models.Index(fields=['-login_time']),
            models.Index(fields=['user', '-login_time']),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.login_time.strftime('%Y-%m-%d %H:%M')}"