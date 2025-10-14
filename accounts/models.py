from django.contrib.auth.models import AbstractUser
from django.db import models


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

    def save(self, *args, **kwargs):
        # This is the new logic to sync Django's permissions with our custom role.
        if self.role == UserRole.SUPERADMIN:
            self.is_staff = True
            self.is_superuser = True
        elif self.role == UserRole.STAFF_ADMIN:
            self.is_staff = True
            self.is_superuser = False
        else:  # For CLIENT and GUEST
            self.is_staff = False
            self.is_superuser = False

        # Call the original save() method to save the object
        super().save(*args, **kwargs)