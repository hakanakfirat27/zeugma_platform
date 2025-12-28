# accounts/user_settings_views.py

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django.shortcuts import get_object_or_404

from .user_settings_models import UserSettings, DefaultUserSettings
from .user_settings_serializers import (
    UserSettingsSerializer, 
    DefaultUserSettingsSerializer,
    UserSettingsChoicesSerializer
)


class UserSettingsView(APIView):
    """
    API endpoint for current user's settings.
    GET: Retrieve user settings
    PATCH: Update user settings
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get current user's settings"""
        settings = UserSettings.get_for_user(request.user)
        serializer = UserSettingsSerializer(settings)
        return Response(serializer.data)
    
    def patch(self, request):
        """Update current user's settings"""
        settings = UserSettings.get_for_user(request.user)
        serializer = UserSettingsSerializer(settings, data=request.data, partial=True)
        
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserSettingsResetView(APIView):
    """
    Reset user settings to role-based defaults.
    POST: Reset settings to defaults
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Reset user settings to defaults based on their role"""
        settings = UserSettings.get_for_user(request.user)
        
        # Get defaults for user's role
        defaults = DefaultUserSettings.get_for_role(request.user.role)
        
        # Apply defaults
        settings.theme_mode = defaults.default_theme_mode
        settings.header_color_scheme = defaults.default_header_color_scheme
        settings.header_style = defaults.default_header_style
        settings.sidebar_color_scheme = defaults.default_sidebar_color_scheme
        settings.sidebar_style = defaults.default_sidebar_style
        settings.email_notifications = defaults.default_email_notifications
        settings.push_notifications = defaults.default_push_notifications
        settings.inapp_notifications = defaults.default_inapp_notifications
        settings.sidebar_collapsed = defaults.default_sidebar_collapsed
        settings.animation_enabled = defaults.default_animation_enabled
        
        # Reset other settings to class defaults
        settings.notification_sound = False
        settings.notification_preferences = {}
        settings.daily_summary_email = False
        settings.compact_mode = False
        settings.high_contrast = False
        
        settings.save()
        
        serializer = UserSettingsSerializer(settings)
        return Response(serializer.data)


class UserSettingsChoicesView(APIView):
    """
    Get available choices for settings dropdowns.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get all available setting choices"""
        serializer = UserSettingsChoicesSerializer({})
        return Response(serializer.data)


# ============================================
# ADMIN VIEWS FOR DEFAULT SETTINGS
# ============================================

class DefaultUserSettingsListView(APIView):
    """
    Admin view to list and manage default settings for all roles.
    GET: List all role defaults
    """
    permission_classes = [IsAdminUser]
    
    def get(self, request):
        """Get default settings for all roles"""
        # Ensure all roles have default settings
        for role, _ in DefaultUserSettings.UserRole.choices:
            DefaultUserSettings.get_for_role(role)
        
        defaults = DefaultUserSettings.objects.all().order_by('role')
        serializer = DefaultUserSettingsSerializer(defaults, many=True)
        return Response(serializer.data)


class DefaultUserSettingsDetailView(APIView):
    """
    Admin view to update default settings for a specific role.
    GET: Get defaults for a role
    PATCH: Update defaults for a role
    """
    permission_classes = [IsAdminUser]
    
    def get(self, request, role):
        """Get default settings for a specific role"""
        defaults = DefaultUserSettings.get_for_role(role)
        serializer = DefaultUserSettingsSerializer(defaults)
        return Response(serializer.data)
    
    def patch(self, request, role):
        """Update default settings for a specific role"""
        defaults = DefaultUserSettings.get_for_role(role)
        serializer = DefaultUserSettingsSerializer(defaults, data=request.data, partial=True)
        
        if serializer.is_valid():
            serializer.save(updated_by=request.user)
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ApplyDefaultsToAllUsersView(APIView):
    """
    Admin action to apply current defaults to all existing users of a role.
    POST: Apply defaults to all users of specified role
    """
    permission_classes = [IsAdminUser]
    
    def post(self, request, role):
        """Apply default settings to all users of a role"""
        from .models import User
        
        defaults = DefaultUserSettings.get_for_role(role)
        users = User.objects.filter(role=role)
        
        updated_count = 0
        for user in users:
            settings, created = UserSettings.objects.get_or_create(user=user)
            
            # Apply defaults
            settings.theme_mode = defaults.default_theme_mode
            settings.header_color_scheme = defaults.default_header_color_scheme
            settings.header_style = defaults.default_header_style
            settings.sidebar_color_scheme = defaults.default_sidebar_color_scheme
            settings.sidebar_style = defaults.default_sidebar_style
            settings.email_notifications = defaults.default_email_notifications
            settings.push_notifications = defaults.default_push_notifications
            settings.inapp_notifications = defaults.default_inapp_notifications
            settings.sidebar_collapsed = defaults.default_sidebar_collapsed
            settings.animation_enabled = defaults.default_animation_enabled
            settings.save()
            
            updated_count += 1
        
        return Response({
            'message': f'Applied defaults to {updated_count} users',
            'role': role,
            'users_updated': updated_count
        })


# ============================================
# USER ACTIVITY LOG VIEW
# ============================================

class UserActivityView(APIView):
    """
    Get current user's activity log.
    Shows only important, non-redundant events.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get user's recent activity"""
        from .security_models import AuditLog
        from .models import LoginHistory
        
        # Get login history (authoritative login records)
        login_history = LoginHistory.objects.filter(
            user=request.user
        ).order_by('-login_time')[:50]
        
        # Get audit logs for important events only
        # Exclude redundant login/session events (already captured by LoginHistory)
        important_event_types = [
            'password_change',
            'password_reset',
            '2fa_enabled',
            '2fa_disabled',
            'backup_code_used',
            'api_key_created',
            'api_key_revoked',
            'suspicious_activity',
        ]
        
        audit_logs = AuditLog.objects.filter(
            user=request.user,
            event_type__in=important_event_types
        ).order_by('-timestamp')[:50]
        
        # Combine and format
        activities = []
        
        for login in login_history:
            activities.append({
                'action_type': 'login' if login.success else 'failed_login',
                'description': 'Successful login' if login.success else 'Failed login attempt',
                'timestamp': login.login_time.isoformat(),
                'ip_address': login.ip_address,
                'user_agent': login.user_agent,
            })
        
        for audit in audit_logs:
            activities.append({
                'action_type': audit.event_type,
                'description': audit.description or audit.get_event_type_display(),
                'timestamp': audit.timestamp.isoformat(),
                'ip_address': audit.ip_address,
                'user_agent': audit.user_agent,
            })
        
        # Sort by timestamp
        activities.sort(key=lambda x: x['timestamp'], reverse=True)
        
        return Response({
            'results': activities[:100]  # Limit to 100 items
        })
