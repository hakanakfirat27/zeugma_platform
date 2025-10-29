# backend/announcements/models.py
from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()


class Announcement(models.Model):
    """
    Main Announcement model for system-wide notifications
    """
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]

    TYPE_CHOICES = [
        ('general', 'General'),
        ('maintenance', 'Maintenance'),
        ('feature', 'New Feature'),
        ('update', 'Update'),
        ('event', 'Event'),
        ('alert', 'Alert'),
    ]

    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('scheduled', 'Scheduled'),
        ('active', 'Active'),
        ('expired', 'Expired'),
        ('archived', 'Archived'),
    ]

    TARGET_AUDIENCE_CHOICES = [
        ('all', 'All Users'),
        ('clients', 'Clients Only'),
        ('staff', 'Staff Only'),
        ('superadmin', 'Superadmin Only'),
        ('custom', 'Custom Selection'),
    ]

    # Basic Information
    title = models.CharField(max_length=200)
    content = models.TextField()
    summary = models.CharField(max_length=300, blank=True, help_text="Short summary for preview")

    # Classification
    announcement_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='general')
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='medium')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')

    # Targeting
    target_audience = models.CharField(max_length=20, choices=TARGET_AUDIENCE_CHOICES, default='all')
    specific_users = models.ManyToManyField(User, related_name='targeted_announcements', blank=True)

    # Scheduling
    start_date = models.DateTimeField(default=timezone.now)
    end_date = models.DateTimeField(null=True, blank=True, help_text="Leave blank for no expiration")

    # Display Options
    is_pinned = models.BooleanField(default=False, help_text="Pin to top of announcements")
    show_popup = models.BooleanField(default=False, help_text="Show as popup on user login")
    require_acknowledgment = models.BooleanField(default=False, help_text="User must acknowledge reading")
    icon = models.CharField(max_length=50, blank=True, help_text="Icon name from lucide-react")
    color_scheme = models.CharField(max_length=50, default='blue', help_text="Color theme for the announcement")

    # Actions (optional)
    action_button_text = models.CharField(max_length=50, blank=True, help_text="e.g., 'Learn More'")
    action_button_url = models.URLField(blank=True, help_text="External or internal URL")

    # Metadata
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_announcements')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    views_count = models.IntegerField(default=0)

    class Meta:
        ordering = ['-is_pinned', '-start_date', '-created_at']
        indexes = [
            models.Index(fields=['-start_date', 'status']),
            models.Index(fields=['target_audience', 'status']),
        ]

    def __str__(self):
        return f"{self.title} ({self.get_status_display()})"

    def is_active(self):
        """Check if announcement is currently active"""
        now = timezone.now()
        if self.status != 'active':
            return False
        if self.start_date > now:
            return False
        if self.end_date and self.end_date < now:
            return False
        return True

    def update_status(self):
        """Auto-update status based on dates"""
        now = timezone.now()

        if self.status == 'draft':
            return

        if self.start_date > now:
            self.status = 'scheduled'
        elif self.end_date and self.end_date < now:
            self.status = 'expired'
        else:
            self.status = 'active'

        self.save(update_fields=['status'])

    def increment_views(self):
        """Increment view counter"""
        self.views_count += 1
        self.save(update_fields=['views_count'])

    def get_target_users(self):
        """Get list of users who should see this announcement"""
        if self.target_audience == 'all':
            return User.objects.all()
        elif self.target_audience == 'clients':
            return User.objects.filter(role='CLIENT')
        elif self.target_audience == 'staff':
            return User.objects.filter(role__in=['STAFF_ADMIN', 'SUPERADMIN'])
        elif self.target_audience == 'superadmin':
            return User.objects.filter(role='SUPERADMIN')
        elif self.target_audience == 'custom':
            return self.specific_users.all()
        return User.objects.none()


class AnnouncementView(models.Model):
    """
    Track who has viewed which announcements
    """
    announcement = models.ForeignKey(Announcement, on_delete=models.CASCADE, related_name='user_views')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='announcement_views')
    viewed_at = models.DateTimeField(auto_now_add=True)
    acknowledged = models.BooleanField(default=False)
    acknowledged_at = models.DateTimeField(null=True, blank=True)
    hidden = models.BooleanField(default=False, help_text="User has dismissed this announcement")

    class Meta:
        unique_together = ['announcement', 'user']
        ordering = ['-viewed_at']
        indexes = [
            models.Index(fields=['announcement', 'user']),
            models.Index(fields=['user', '-viewed_at']),
            models.Index(fields=['user', 'hidden']),
        ]

    def __str__(self):
        return f"{self.user.username} viewed {self.announcement.title}"

    def acknowledge(self):
        """Mark announcement as acknowledged"""
        if not self.acknowledged:
            self.acknowledged = True
            self.acknowledged_at = timezone.now()
            self.save()


class AnnouncementAttachment(models.Model):
    """
    Optional file attachments for announcements
    """
    announcement = models.ForeignKey(Announcement, on_delete=models.CASCADE, related_name='attachments')
    file = models.FileField(upload_to='announcements/attachments/%Y/%m/')
    file_name = models.CharField(max_length=255)
    file_size = models.IntegerField(help_text="Size in bytes")
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-uploaded_at']

    def __str__(self):
        return f"{self.file_name} - {self.announcement.title}"

    def get_file_size_display(self):
        """Return human-readable file size"""
        size = self.file_size
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size < 1024.0:
                return f"{size:.1f} {unit}"
            size /= 1024.0
        return f"{size:.1f} TB"