# accounts/decorators.py

from django.core.exceptions import PermissionDenied
from .models import UserRole

def staff_required(function):
    """
    A decorator to ensure that a user is a Superadmin or Staff Admin.
    """
    def wrap(request, *args, **kwargs):
        # --- THIS IS THE CORRECTED LOGIC ---
        # We now check if the user is a built-in superuser OR has a staff role.
        if request.user.is_authenticated and (request.user.is_superuser or request.user.role in [UserRole.SUPERADMIN, UserRole.STAFF_ADMIN]):
            return function(request, *args, **kwargs)
        else:
            raise PermissionDenied
    return wrap