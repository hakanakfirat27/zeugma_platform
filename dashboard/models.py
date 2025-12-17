# dashboard/models.py

import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone


class ActivityType(models.TextChoices):
    """Types of user activities to track"""
    FAVORITE_ADDED = 'FAVORITE_ADDED', 'Added to Favorites'
    FAVORITE_REMOVED = 'FAVORITE_REMOVED', 'Removed from Favorites'
    COLLECTION_CREATED = 'COLLECTION_CREATED', 'Created Collection'
    COLLECTION_DELETED = 'COLLECTION_DELETED', 'Deleted Collection'
    COLLECTION_ITEM_ADDED = 'COLLECTION_ITEM_ADDED', 'Added to Collection'
    COLLECTION_ITEM_REMOVED = 'COLLECTION_ITEM_REMOVED', 'Removed from Collection'
    COMPANY_VIEWED = 'COMPANY_VIEWED', 'Viewed Company'
    REPORT_VIEWED = 'REPORT_VIEWED', 'Viewed Report'
    NOTE_ADDED = 'NOTE_ADDED', 'Added Note'
    NOTE_UPDATED = 'NOTE_UPDATED', 'Updated Note'
    EXPORT_CREATED = 'EXPORT_CREATED', 'Exported Data'


class UserActivity(models.Model):
    """
    Tracks user activities for the activity feed on the dashboard.
    """
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='activities'
    )
    
    activity_type = models.CharField(
        max_length=30,
        choices=ActivityType.choices
    )
    
    # Optional related objects
    company_name = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Name of the company involved"
    )
    
    report_title = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Title of the report involved"
    )
    
    collection_name = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="Name of the collection involved"
    )
    
    # Store IDs for linking
    report_id = models.UUIDField(
        null=True,
        blank=True,
        help_text="UUID of the related report"
    )
    
    record_id = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        help_text="ID of the company record"
    )
    
    collection_id = models.UUIDField(
        null=True,
        blank=True,
        help_text="UUID of the related collection"
    )
    
    # Additional context
    description = models.TextField(
        blank=True,
        null=True,
        help_text="Additional description of the activity"
    )
    
    # Metadata
    country = models.CharField(
        max_length=100,
        blank=True,
        null=True
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "User Activity"
        verbose_name_plural = "User Activities"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['activity_type']),
        ]
    
    def __str__(self):
        return f"{self.user.username} - {self.get_activity_type_display()} - {self.created_at}"


class RecentlyViewedCompany(models.Model):
    """
    Tracks companies that users have recently viewed.
    Limited to last N companies per user.
    """
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='recently_viewed_companies'
    )
    
    # Report association
    report = models.ForeignKey(
        'reports.CustomReport',
        on_delete=models.CASCADE,
        related_name='recently_viewed'
    )
    
    # Record identifier
    record_id = models.CharField(
        max_length=50,
        help_text="ID of the company record"
    )
    
    # Denormalized for quick access
    company_name = models.CharField(
        max_length=255,
        help_text="Company name for display purposes"
    )
    
    country = models.CharField(
        max_length=100,
        blank=True,
        null=True
    )
    
    category = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        help_text="Company category"
    )
    
    # Timestamps
    viewed_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Recently Viewed Company"
        verbose_name_plural = "Recently Viewed Companies"
        ordering = ['-viewed_at']
        indexes = [
            models.Index(fields=['user', '-viewed_at']),
        ]
    
    def __str__(self):
        return f"{self.user.username} viewed {self.company_name}"
    
    @classmethod
    def add_view(cls, user, report, record_id, company_name, country=None, category=None):
        """
        Add or update a recently viewed company.
        Maintains a maximum of 20 entries per user.
        """
        MAX_RECENT = 20
        
        # Update existing or create new
        obj, created = cls.objects.update_or_create(
            user=user,
            report=report,
            record_id=record_id,
            defaults={
                'company_name': company_name,
                'country': country,
                'category': category,
                'viewed_at': timezone.now()
            }
        )
        
        # Clean up old entries
        user_views = cls.objects.filter(user=user).order_by('-viewed_at')
        if user_views.count() > MAX_RECENT:
            # Get IDs of entries to keep
            keep_ids = list(user_views[:MAX_RECENT].values_list('id', flat=True))
            # Delete the rest
            cls.objects.filter(user=user).exclude(id__in=keep_ids).delete()
        
        return obj
