# accounts/middleware.py
# This middleware tracks user activity for online/offline status

from django.utils import timezone
from django.contrib.auth import get_user_model

User = get_user_model()


class UpdateLastActivityMiddleware:
    """
    Middleware to update user's last_activity timestamp on each request
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        # Update last activity for authenticated users
        if request.user.is_authenticated:
            # Use update() to avoid triggering signals and save time
            User.objects.filter(pk=request.user.pk).update(
                last_activity=timezone.now()
            )

        return response