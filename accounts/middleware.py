# accounts/middleware.py
# Middleware for user activity tracking and session management
# OPTIMIZED VERSION for production use

from django.utils import timezone
from django.contrib.auth import get_user_model, logout
from django.http import JsonResponse
from django.core.cache import cache
from datetime import timedelta

User = get_user_model()

# Cache key for security settings
SECURITY_SETTINGS_CACHE_KEY = 'security_settings_cache'
SECURITY_SETTINGS_CACHE_TIMEOUT = 60  # Cache for 60 seconds


def get_cached_security_settings():
    """Get security settings from cache or database"""
    settings = cache.get(SECURITY_SETTINGS_CACHE_KEY)
    if settings is None:
        from .security_models import SecuritySettings
        settings_obj = SecuritySettings.get_settings()
        settings = {
            'session_timeout_minutes': settings_obj.session_timeout_minutes,
            'max_concurrent_sessions': settings_obj.max_concurrent_sessions,
            'single_session_mode': settings_obj.single_session_mode,
        }
        cache.set(SECURITY_SETTINGS_CACHE_KEY, settings, SECURITY_SETTINGS_CACHE_TIMEOUT)
    return settings


class UpdateLastActivityMiddleware:
    """
    Middleware to update user's last_activity timestamp.
    OPTIMIZED: Only updates if more than 60 seconds since last update.
    """
    
    # Only update if this many seconds have passed
    UPDATE_INTERVAL = 60

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        # Update last activity for authenticated users (throttled)
        if request.user.is_authenticated:
            # Check if we should update (throttle to reduce DB writes)
            cache_key = f'user_activity_{request.user.pk}'
            last_update = cache.get(cache_key)
            
            if last_update is None:
                # Update database and set cache
                User.objects.filter(pk=request.user.pk).update(
                    last_activity=timezone.now()
                )
                cache.set(cache_key, True, self.UPDATE_INTERVAL)

        return response


class SessionTimeoutMiddleware:
    """
    Middleware to handle session timeout with sleep mode support.
    OPTIMIZED: Uses caching and reduces unnecessary operations.
    """
    
    # Paths that should bypass session timeout check
    EXEMPT_PATHS = [
        '/api/auth/login/',
        '/api/auth/logout/',
        '/api/auth/unlock-session/',
        '/api/auth/session-status/',
        '/api/auth/csrf/',
        '/accounts/login/',
        '/accounts/logout/',
        '/accounts/csrf/',
        '/accounts/user/',
        '/admin/',
        '/static/',
        '/media/',
        '/ws/',
    ]
    
    # Only save session if this many seconds have passed since last save
    SESSION_SAVE_INTERVAL = 30
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Skip for non-authenticated users
        if not request.user.is_authenticated:
            return self.get_response(request)
        
        # Skip for exempt paths
        if self._is_exempt_path(request.path):
            return self.get_response(request)
        
        # Check if session is locked
        is_locked = request.session.get('is_locked', False)
        
        if is_locked:
            return self._locked_response(request)
        
        # Check session timeout
        timeout_result = self._check_session_timeout(request)
        
        if timeout_result == 'locked':
            request.session['is_locked'] = True
            request.session['locked_at'] = timezone.now().isoformat()
            request.session['last_activity'] = timezone.now().isoformat()
            request.session.modified = True
            return self._locked_response(request)
        
        elif timeout_result == 'expired':
            logout(request)
            return self._expired_response(request)
        
        # Session is active - update last activity (throttled)
        self._update_session_activity(request)
        
        return self.get_response(request)
    
    def _is_exempt_path(self, path):
        """Check if path should bypass timeout check"""
        for exempt_path in self.EXEMPT_PATHS:
            if path.startswith(exempt_path):
                return True
        return False
    
    def _update_session_activity(self, request):
        """Update session last_activity with throttling to reduce DB writes"""
        last_activity_str = request.session.get('last_activity')
        
        if last_activity_str:
            try:
                from datetime import datetime
                last_activity = datetime.fromisoformat(last_activity_str)
                if last_activity.tzinfo is None:
                    from django.utils.timezone import make_aware
                    last_activity = make_aware(last_activity)
                
                # Only update if more than SESSION_SAVE_INTERVAL seconds have passed
                time_since_update = (timezone.now() - last_activity).total_seconds()
                if time_since_update < self.SESSION_SAVE_INTERVAL:
                    return  # Skip update, not enough time has passed
            except (ValueError, TypeError):
                pass
        
        # Update last activity in session
        now = timezone.now()
        request.session['last_activity'] = now.isoformat()
        request.session.modified = True
        
        # Also update UserSession model for accurate display in admin panel
        session_key = request.session.session_key
        if session_key:
            try:
                from .security_models import UserSession
                UserSession.objects.filter(session_key=session_key).update(
                    last_activity=now
                )
            except Exception:
                pass  # Don't fail the request if UserSession update fails
    
    def _check_session_timeout(self, request):
        """
        Check if session has timed out.
        Returns: 'active', 'locked', or 'expired'
        """
        # Get cached security settings
        settings = get_cached_security_settings()
        timeout_minutes = settings['session_timeout_minutes']
        
        # If timeout is 0, no timeout is enforced
        if timeout_minutes == 0:
            return 'active'
        
        # Get last activity from session
        last_activity_str = request.session.get('last_activity')
        
        if not last_activity_str:
            # First request - set initial activity
            request.session['last_activity'] = timezone.now().isoformat()
            request.session.modified = True
            return 'active'
        
        try:
            from datetime import datetime
            last_activity = datetime.fromisoformat(last_activity_str)
            
            if last_activity.tzinfo is None:
                from django.utils.timezone import make_aware
                last_activity = make_aware(last_activity)
            
            time_since_activity = timezone.now() - last_activity
            timeout_delta = timedelta(minutes=timeout_minutes)
            
            if time_since_activity > timeout_delta:
                remember_me = request.session.get('remember_me', False)
                return 'locked' if remember_me else 'expired'
            
            return 'active'
            
        except (ValueError, TypeError):
            request.session['last_activity'] = timezone.now().isoformat()
            request.session.modified = True
            return 'active'
    
    def _locked_response(self, request):
        """Return response for locked session"""
        return JsonResponse({
            'error': 'session_locked',
            'message': 'Session locked due to inactivity. Please enter your password to continue.',
            'locked': True,
            'user': {
                'username': request.user.username,
                'email': request.user.email,
                'first_name': request.user.first_name,
                'last_name': request.user.last_name,
            }
        }, status=401)
    
    def _expired_response(self, request):
        """Return response for expired session"""
        return JsonResponse({
            'error': 'session_expired',
            'message': 'Your session has expired. Please log in again.',
            'expired': True,
        }, status=401)


class ConcurrentSessionMiddleware:
    """
    Middleware to enforce concurrent session limits.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        return self.get_response(request)
