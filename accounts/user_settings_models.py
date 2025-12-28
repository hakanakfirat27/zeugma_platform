# accounts/user_settings_models.py

import uuid
from django.db import models
from django.conf import settings
from django.core.cache import cache


class UserSettings(models.Model):
    """
    Per-user settings for theme, notifications, and preferences.
    Each user can customize their own experience independently.
    """
    
    # === CHOICES ===
    class ColorScheme(models.TextChoices):
        # Primary solid colors
        DEFAULT = 'default', 'Default'
        DARK = 'dark', 'Dark'
        FOREST = 'forest', 'Forest'
        OCEAN = 'ocean', 'Ocean'
        AMBER = 'amber', 'Amber'
        ROSE = 'rose', 'Rose'
        LAVENDER = 'lavender', 'Lavender'
        SLATE = 'slate', 'Slate'
        PURPLE = 'purple', 'Purple'
        # More solid colors
        MIDNIGHT = 'midnight', 'Midnight Blue'
        PINK = 'pink', 'Pink'
        CYAN = 'cyan', 'Cyan'
        TEAL = 'teal', 'Teal'
        LIME = 'lime', 'Lime'
        SUNSET = 'sunset', 'Sunset'
        STONE = 'stone', 'Stone'
        # Additional colors
        EMERALD = 'emerald', 'Emerald'
        SKY = 'sky', 'Sky'
        VIOLET = 'violet', 'Violet'
        FUCHSIA = 'fuchsia', 'Fuchsia'
        CORAL = 'coral', 'Coral'
        GOLD = 'gold', 'Gold'
        NAVY = 'navy', 'Navy'
        CHARCOAL = 'charcoal', 'Charcoal'
        # Pastel/Light colors
        LIGHTBLUE = 'lightblue', 'Light Blue'
        LIGHTGREEN = 'lightgreen', 'Light Green'
        LIGHTPINK = 'lightpink', 'Light Pink'
        LIGHTYELLOW = 'lightyellow', 'Light Yellow'
        LIGHTPURPLE = 'lightpurple', 'Light Purple'
        LIGHTCYAN = 'lightcyan', 'Light Cyan'
        LIGHTORANGE = 'lightorange', 'Light Orange'
        LIGHTGRAY = 'lightgray', 'Light Gray'
        # Deep/Rich colors
        CRIMSON = 'crimson', 'Crimson'
        INDIGO = 'indigo', 'Deep Indigo'
        DEEPBLUE = 'deepblue', 'Deep Blue'
        DEEPPURPLE = 'deeppurple', 'Deep Purple'
        DEEPTEAL = 'deepteal', 'Deep Teal'
        DEEPGREEN = 'deepgreen', 'Deep Green'
        BRONZE = 'bronze', 'Bronze'
        MAROON = 'maroon', 'Maroon'
        # Gradient-like/Unique colors
        ROYALBLUE = 'royalblue', 'Royal Blue'
        HOTPINK = 'hotpink', 'Hot Pink'
        TURQUOISE = 'turquoise', 'Turquoise'
        SALMON = 'salmon', 'Salmon'
        ORCHID = 'orchid', 'Orchid'
        SEAGREEN = 'seagreen', 'Sea Green'
        STEELBLUE = 'steelblue', 'Steel Blue'
        TOMATO = 'tomato', 'Tomato'
        # Multi-color gradients
        AURORA = 'aurora', 'Aurora'
        SUNSET_GLOW = 'sunset_glow', 'Sunset Glow'
        OCEAN_BREEZE = 'ocean_breeze', 'Ocean Breeze'
        PURPLE_HAZE = 'purple_haze', 'Purple Haze'
        FRESH_MINT = 'fresh_mint', 'Fresh Mint'
        WARM_FLAME = 'warm_flame', 'Warm Flame'
        COOL_BLUES = 'cool_blues', 'Cool Blues'
        NIGHT_FADE = 'night_fade', 'Night Fade'
    
    class SidebarStyle(models.TextChoices):
        DEFAULT = 'default', 'Default'
        COMPACT = 'compact', 'Compact'
        EXPANDED = 'expanded', 'Expanded'
        MINIMAL = 'minimal', 'Minimal'
        GLASS = 'glass', 'Glass Effect'
        GRADIENT = 'gradient', 'Gradient'
    
    class HeaderStyle(models.TextChoices):
        DEFAULT = 'default', 'Default'
        GRADIENT = 'gradient', 'Gradient'
        SOLID = 'solid', 'Solid Color'
        MINIMAL = 'minimal', 'Minimal'
        GLASS = 'glass', 'Glass Effect'
    
    class ThemeMode(models.TextChoices):
        LIGHT = 'light', 'Light'
        DARK = 'dark', 'Dark'
        SYSTEM = 'system', 'System Preference'
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='settings'
    )
    
    # === THEME SETTINGS ===
    theme_mode = models.CharField(
        max_length=10,
        choices=ThemeMode.choices,
        default=ThemeMode.SYSTEM,
        help_text="Overall theme mode (light/dark/system)"
    )
    
    # Header Settings
    header_color_scheme = models.CharField(
        max_length=20,
        choices=ColorScheme.choices,
        default=ColorScheme.PURPLE_HAZE,  # Purple Haze gradient
        help_text="Color scheme for the header"
    )
    
    header_style = models.CharField(
        max_length=20,
        choices=HeaderStyle.choices,
        default=HeaderStyle.DEFAULT,
        help_text="Style variant for the header"
    )
    
    # Sidebar Settings
    sidebar_color_scheme = models.CharField(
        max_length=20,
        choices=ColorScheme.choices,
        default=ColorScheme.DARK,  # Dark sidebar
        help_text="Color scheme for the sidebar"
    )
    
    sidebar_style = models.CharField(
        max_length=20,
        choices=SidebarStyle.choices,
        default=SidebarStyle.DEFAULT,
        help_text="Style variant for the sidebar"
    )
    
    sidebar_collapsed = models.BooleanField(
        default=False,
        help_text="Whether sidebar is collapsed by default"
    )
    
    # === NOTIFICATION SETTINGS ===
    email_notifications = models.BooleanField(
        default=True,
        help_text="Receive email notifications"
    )
    
    push_notifications = models.BooleanField(
        default=True,
        help_text="Receive push notifications"
    )
    
    inapp_notifications = models.BooleanField(
        default=True,
        help_text="Receive in-app notifications"
    )
    
    notification_sound = models.BooleanField(
        default=False,
        help_text="Play sound for new notifications"
    )
    
    # Granular notification controls (JSON for flexibility)
    notification_preferences = models.JSONField(
        default=dict,
        blank=True,
        help_text="Granular notification preferences per type"
    )
    
    # === UI PREFERENCES ===
    compact_mode = models.BooleanField(
        default=False,
        help_text="Use compact UI layout"
    )
    
    animation_enabled = models.BooleanField(
        default=True,
        help_text="Enable UI animations"
    )
    
    high_contrast = models.BooleanField(
        default=False,
        help_text="Enable high contrast mode for accessibility"
    )
    
    # === METADATA ===
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "User Settings"
        verbose_name_plural = "User Settings"
    
    def __str__(self):
        return f"Settings for {self.user.username}"
    
    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # Clear user-specific cache
        cache.delete(f'user_settings_{self.user.id}')
    
    @classmethod
    def get_for_user(cls, user):
        """
        Get or create settings for a user.
        Returns the settings instance with defaults applied from admin settings.
        """
        cache_key = f'user_settings_{user.id}'
        cached = cache.get(cache_key)
        
        if cached:
            return cached
        
        # Get or create user settings
        settings_obj, created = cls.objects.get_or_create(user=user)
        
        # If created, apply defaults from admin theme settings
        if created:
            settings_obj._apply_admin_defaults()
            settings_obj.save()
        
        cache.set(cache_key, settings_obj, 60 * 60)  # Cache for 1 hour
        return settings_obj
    
    def _apply_admin_defaults(self):
        """Apply default settings from admin configuration based on user role.
        
        Note: Header and sidebar colors are fixed at platform defaults:
        - Header: 'purple_haze' (Purple Haze gradient)
        - Sidebar: 'dark'
        Users can customize these from their personal settings page.
        """
        try:
            # Get defaults for user's role from DefaultUserSettings
            defaults = DefaultUserSettings.get_for_role(self.user.role)
            
            # Apply theme defaults (only theme mode from admin, colors are fixed)
            self.theme_mode = defaults.default_theme_mode
            
            # Fixed header/sidebar colors - not controlled by admin
            self.header_color_scheme = UserSettings.ColorScheme.PURPLE_HAZE  # Purple Haze
            self.sidebar_color_scheme = UserSettings.ColorScheme.DARK         # Dark
            self.header_style = UserSettings.HeaderStyle.DEFAULT
            self.sidebar_style = UserSettings.SidebarStyle.DEFAULT
            
            # Apply notification defaults
            self.email_notifications = defaults.default_email_notifications
            self.push_notifications = defaults.default_push_notifications
            self.inapp_notifications = defaults.default_inapp_notifications
            
            # Apply UI defaults
            self.sidebar_collapsed = defaults.default_sidebar_collapsed
            self.animation_enabled = defaults.default_animation_enabled
                
        except Exception as e:
            # If anything fails, just use class defaults
            import logging
            logging.getLogger(__name__).warning(f"Failed to apply admin defaults: {e}")
            pass
    
    def to_dict(self):
        """Convert settings to dictionary for API response."""
        return {
            'theme_mode': self.theme_mode,
            'header_color_scheme': self.header_color_scheme,
            'header_style': self.header_style,
            'sidebar_color_scheme': self.sidebar_color_scheme,
            'sidebar_style': self.sidebar_style,
            'sidebar_collapsed': self.sidebar_collapsed,
            'email_notifications': self.email_notifications,
            'push_notifications': self.push_notifications,
            'inapp_notifications': self.inapp_notifications,
            'notification_sound': self.notification_sound,
            'notification_preferences': self.notification_preferences,
            'compact_mode': self.compact_mode,
            'animation_enabled': self.animation_enabled,
            'high_contrast': self.high_contrast,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }


class DefaultUserSettings(models.Model):
    """
    Admin-configurable default settings for each user role.
    When a new user is created, their settings inherit from these defaults.
    """
    
    class UserRole(models.TextChoices):
        CLIENT = 'CLIENT', 'Client'
        DATA_COLLECTOR = 'DATA_COLLECTOR', 'Data Collector'
        GUEST = 'GUEST', 'Guest'
        STAFF_ADMIN = 'STAFF_ADMIN', 'Staff Admin'
        SUPERADMIN = 'SUPERADMIN', 'Superadmin'
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    
    role = models.CharField(
        max_length=20,
        choices=UserRole.choices,
        unique=True,
        help_text="The user role this default applies to"
    )
    
    # Theme defaults
    default_theme_mode = models.CharField(
        max_length=10,
        choices=UserSettings.ThemeMode.choices,
        default=UserSettings.ThemeMode.SYSTEM
    )
    
    # Header/Sidebar color schemes are fixed at platform level:
    # - Header: 'purple_haze' (Purple Haze)
    # - Sidebar: 'dark'
    # These fields are kept for backwards compatibility but no longer used by admin
    default_header_color_scheme = models.CharField(
        max_length=20,
        choices=UserSettings.ColorScheme.choices,
        default=UserSettings.ColorScheme.PURPLE_HAZE,  # Fixed: Purple Haze
        help_text="Deprecated: Header color is now fixed at platform default"
    )
    
    default_header_style = models.CharField(
        max_length=20,
        choices=UserSettings.HeaderStyle.choices,
        default=UserSettings.HeaderStyle.DEFAULT
    )
    
    default_sidebar_color_scheme = models.CharField(
        max_length=20,
        choices=UserSettings.ColorScheme.choices,
        default=UserSettings.ColorScheme.DARK,  # Fixed: Dark
        help_text="Deprecated: Sidebar color is now fixed at platform default"
    )
    
    default_sidebar_style = models.CharField(
        max_length=20,
        choices=UserSettings.SidebarStyle.choices,
        default=UserSettings.SidebarStyle.DEFAULT
    )
    
    # Notification defaults
    default_email_notifications = models.BooleanField(default=True)
    default_push_notifications = models.BooleanField(default=True)
    default_inapp_notifications = models.BooleanField(default=True)
    
    # UI defaults
    default_sidebar_collapsed = models.BooleanField(default=False)
    default_animation_enabled = models.BooleanField(default=True)
    
    # Metadata
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='default_settings_updated'
    )
    
    class Meta:
        verbose_name = "Default User Settings"
        verbose_name_plural = "Default User Settings"
        ordering = ['role']
    
    def __str__(self):
        return f"Default Settings for {self.get_role_display()}"
    
    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        cache.delete(f'default_user_settings_{self.role}')
        cache.delete('default_user_settings_all')
    
    @classmethod
    def get_for_role(cls, role):
        """Get default settings for a specific role."""
        cache_key = f'default_user_settings_{role}'
        cached = cache.get(cache_key)
        
        if cached:
            return cached
        
        obj, _ = cls.objects.get_or_create(role=role)
        cache.set(cache_key, obj, 60 * 60)
        return obj
