from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone
from datetime import timedelta


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
    """
    Custom User model with role-based permissions and additional fields
    """
    ROLE_CHOICES = [
        ('SUPERADMIN', 'Superadmin'),
        ('STAFF_ADMIN', 'Staff Admin'),
        ('CLIENT', 'Client'),
        ('GUEST', 'Guest'),
    ]

    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='GUEST')
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    company_name = models.CharField(max_length=200, blank=True, null=True)

    # For tracking online status
    last_activity = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-date_joined']

    def __str__(self):
        return self.username

    @property
    def full_name(self):
        """Return full name or username if name not set"""
        if self.first_name and self.last_name:
            return f"{self.first_name} {self.last_name}"
        elif self.first_name:
            return self.first_name
        elif self.last_name:
            return self.last_name
        return self.username

    @property
    def initials(self):
        """Return user initials"""
        if self.first_name and self.last_name:
            return f"{self.first_name[0]}{self.last_name[0]}".upper()
        elif self.first_name:
            return self.first_name[0].upper()
        elif self.last_name:
            return self.last_name[0].upper()
        return self.username[0].upper() if self.username else "?"

    @property
    def is_online(self):
        """
        Check if user is online (active within last 5 minutes)
        """
        if not self.last_activity:
            return False

        # User is considered online if active within last 5 minutes
        threshold = timezone.now() - timedelta(minutes=5)
        return self.last_activity >= threshold

    def update_last_activity(self):
        """Update the last activity timestamp"""
        self.last_activity = timezone.now()
        self.save(update_fields=['last_activity'])