from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone
from datetime import timedelta
import random
import string


# This class defines the choices for the 'role' field.
# It makes the code more readable and prevents typos.
class UserRole(models.TextChoices):
    SUPERADMIN = 'SUPERADMIN', 'Superadmin'
    STAFF_ADMIN = 'STAFF_ADMIN', 'Staff Admin'
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
    last_activity = models.DateTimeField(null=True, blank=True)

    # 2FA Fields
    two_factor_enabled = models.BooleanField(default=False)
    is_2fa_setup_required = models.BooleanField(default=True)  # Force 2FA on first login
    two_factor_code = models.CharField(max_length=6, blank=True, null=True)
    two_factor_code_created_at = models.DateTimeField(null=True, blank=True)

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

    @property
    def is_online(self):
        """Check if user was active in the last 5 minutes."""
        if not self.last_activity:
            return False
        from django.utils import timezone
        from datetime import timedelta
        return timezone.now() - self.last_activity < timedelta(minutes=5)

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

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"