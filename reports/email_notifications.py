# reports/email_notifications.py
"""
Email notification system for Unverified Sites
Sends notifications when sites are submitted, approved, or rejected
Now respects global notification settings!
"""

from django.core.mail import send_mail, EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.conf import settings
from django.contrib.auth import get_user_model
from .models import UnverifiedSite, VerificationStatus

User = get_user_model()


def check_email_allowed(notification_type):
    """
    Check if email notifications are allowed for this type.
    """
    try:
        from notifications.services import check_notification_allowed, check_channel_enabled
        
        # Check global settings
        is_allowed, _ = check_notification_allowed(notification_type)
        if not is_allowed:
            return False
        
        # Check if email channel is enabled for this type
        return check_channel_enabled(notification_type, 'email')
    except Exception as e:
        print(f"⚠️ Could not check email settings: {e}")
        return True  # Default to allowing if settings not available


def send_site_submitted_notification(site):
    """
    Send notification to staff when a new site is submitted
    """
    # Check if email notifications are allowed
    if not check_email_allowed('site_submitted'):
        print(f"🚫 Site submitted email notification blocked by settings")
        return False
    
    # Get all staff admins and superadmins
    staff_users = User.objects.filter(
        role__in=['STAFF_ADMIN', 'SUPERADMIN'],
        is_active=True
    )
    
    if not staff_users.exists():
        return
    
    recipient_list = [user.email for user in staff_users if user.email]
    
    if not recipient_list:
        return
    
    subject = f'New Unverified Site Submitted: {site.company_name}'
    
    # HTML email content
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                       color: white; padding: 20px; border-radius: 8px 8px 0 0; }}
            .content {{ background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }}
            .info-grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }}
            .info-item {{ background: white; padding: 12px; border-radius: 6px; border: 1px solid #e5e7eb; }}
            .info-label {{ font-size: 12px; color: #6b7280; margin-bottom: 4px; }}
            .info-value {{ font-size: 14px; font-weight: 600; color: #1f2937; }}
            .badge {{ display: inline-block; padding: 4px 12px; border-radius: 12px; 
                     font-size: 12px; font-weight: 600; }}
            .badge-pending {{ background: #fef3c7; color: #92400e; }}
    .badge-priority-high {{ background: #fee2e2; color: #991b1b; }}
            .badge-priority-medium {{ background: #dbeafe; color: #1e40af; }}
            .button {{ display: inline-block; padding: 12px 24px; background: #4f46e5; 
                      color: white; text-decoration: none; border-radius: 6px; 
                      font-weight: 600; margin: 20px 0; }}
            .footer {{ text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2 style="margin: 0;">🔔 New Site Awaiting Verification</h2>
            </div>
            
            <div class="content">
                <h3 style="margin-top: 0;">{site.company_name}</h3>
                <p>A new unverified site has been submitted and requires your review.</p>
                
                <div class="info-grid">
                    <div class="info-item">
                        <div class="info-label">Category</div>
                        <div class="info-value">{site.get_category_display()}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Country</div>
                        <div class="info-value">{site.country}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Status</div>
                        <div class="info-value">
                            <span class="badge badge-pending">PENDING</span>
                        </div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Priority</div>
                        <div class="info-value">
                            <span class="badge badge-priority-{site.priority.lower()}">
                                {site.get_priority_display()}
                            </span>
                        </div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Data Quality</div>
                        <div class="info-value">{site.data_quality_score}%</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Source</div>
                        <div class="info-value">{site.get_source_display()}</div>
                    </div>
                </div>
                
                <p><strong>Collected by:</strong> {site.collected_by.get_full_name() if site.collected_by else 'Unknown'}</p>
                
                <div style="text-align: center;">
                    <a href="{settings.FRONTEND_URL}/unverified-sites" class="button">
                        Review Site →
                    </a>
                </div>
            </div>
            
            <div class="footer">
                <p>This is an automated notification from Zeugma Platform</p>
                <p>Do not reply to this email</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    # Plain text fallback
    text_content = f"""
    New Unverified Site Submitted
    
    Company: {site.company_name}
    Category: {site.get_category_display()}
    Country: {site.country}
    Status: PENDING
    Priority: {site.get_priority_display()}
    Data Quality: {site.data_quality_score}%
    Source: {site.get_source_display()}
    
    Collected by: {site.collected_by.get_full_name() if site.collected_by else 'Unknown'}
    
    Please review this site at: {settings.FRONTEND_URL}/unverified-sites
    """
    
    try:
        email = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=recipient_list,
        )
        email.attach_alternative(html_content, "text/html")
        email.send(fail_silently=False)
        
        print(f"✅ Notification sent to {len(recipient_list)} staff members")
        return True
    except Exception as e:
        print(f"❌ Failed to send notification: {str(e)}")
        return False


def send_site_approved_notification(site, approved_by):
    """
    Send notification to data collector when their site is approved
    """
    # Check if email notifications are allowed
    if not check_email_allowed('site_approved'):
        print(f"🚫 Site approved email notification blocked by settings")
        return False
    
    if not site.collected_by or not site.collected_by.email:
        return
    
    subject = f'Site Approved: {site.company_name}'
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #10b981 0%, #059669 100%); 
                       color: white; padding: 20px; border-radius: 8px 8px 0 0; }}
            .content {{ background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }}
            .success-icon {{ font-size: 48px; text-align: center; margin: 20px 0; }}
            .button {{ display: inline-block; padding: 12px 24px; background: #10b981; 
                      color: white; text-decoration: none; border-radius: 6px; 
                      font-weight: 600; margin: 20px 0; }}
            .footer {{ text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2 style="margin: 0;">✅ Site Approved!</h2>
            </div>
            
            <div class="content">
                <div class="success-icon">🎉</div>
                <h3 style="margin-top: 0; text-align: center;">
                    {site.company_name}
                </h3>
                <p style="text-align: center;">
                    Great news! The site you submitted has been approved and transferred to the Superdatabase.
                </p>
                
                <div style="background: white; padding: 15px; border-radius: 6px; margin: 20px 0; border: 1px solid #e5e7eb;">
                    <p style="margin: 5px 0;"><strong>Company:</strong> {site.company_name}</p>
                    <p style="margin: 5px 0;"><strong>Category:</strong> {site.get_category_display()}</p>
                    <p style="margin: 5px 0;"><strong>Country:</strong> {site.country}</p>
                    <p style="margin: 5px 0;"><strong>Approved by:</strong> {approved_by.get_full_name()}</p>
                </div>
                
                <p>This company data is now live in the Superdatabase and accessible to clients.</p>
                
                <div style="text-align: center;">
                    <a href="{settings.FRONTEND_URL}/superdatabase" class="button">
                        View in Superdatabase →
                    </a>
                </div>
            </div>
            
            <div class="footer">
                <p>Thank you for your contribution to the database!</p>
                <p>This is an automated notification from Zeugma Platform</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    text_content = f"""
    Site Approved!
    
    Great news! The site you submitted has been approved.
    
    Company: {site.company_name}
    Category: {site.get_category_display()}
    Country: {site.country}
    Approved by: {approved_by.get_full_name()}
    
    This company data is now live in the Superdatabase.
    
    View it at: {settings.FRONTEND_URL}/superdatabase
    """
    
    try:
        email = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[site.collected_by.email],
        )
        email.attach_alternative(html_content, "text/html")
        email.send(fail_silently=False)
        
        print(f"✅ Approval notification sent to {site.collected_by.email}")
        return True
    except Exception as e:
        print(f"❌ Failed to send approval notification: {str(e)}")
        return False


def send_site_rejected_notification(site, rejected_by, reason):
    """
    Send notification to data collector when their site is rejected
    """
    # Check if email notifications are allowed
    if not check_email_allowed('site_rejected'):
        print(f"🚫 Site rejected email notification blocked by settings")
        return False
    
    if not site.collected_by or not site.collected_by.email:
        return
    
    subject = f'Site Rejected: {site.company_name}'
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); 
                       color: white; padding: 20px; border-radius: 8px 8px 0 0; }}
            .content {{ background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }}
            .reason-box {{ background: #fef2f2; border-left: 4px solid #ef4444; 
                          padding: 15px; margin: 20px 0; border-radius: 4px; }}
            .button {{ display: inline-block; padding: 12px 24px; background: #4f46e5; 
                      color: white; text-decoration: none; border-radius: 6px; 
                      font-weight: 600; margin: 20px 0; }}
            .footer {{ text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2 style="margin: 0;">❌ Site Rejected</h2>
            </div>
            
            <div class="content">
                <h3 style="margin-top: 0;">
                    {site.company_name}
                </h3>
                <p>
                    The site you submitted has been rejected during the verification process.
                </p>
                
                <div style="background: white; padding: 15px; border-radius: 6px; margin: 20px 0; border: 1px solid #e5e7eb;">
                    <p style="margin: 5px 0;"><strong>Company:</strong> {site.company_name}</p>
                    <p style="margin: 5px 0;"><strong>Category:</strong> {site.get_category_display()}</p>
                    <p style="margin: 5px 0;"><strong>Country:</strong> {site.country}</p>
                    <p style="margin: 5px 0;"><strong>Reviewed by:</strong> {rejected_by.get_full_name()}</p>
                </div>
                
                <div class="reason-box">
                    <p style="margin: 0;"><strong>Rejection Reason:</strong></p>
                    <p style="margin: 10px 0 0 0;">{reason}</p>
                </div>
                
                <p>
                    If you believe this is an error or have additional information, 
                    please contact the verification team.
                </p>
            </div>
            
            <div class="footer">
                <p>This is an automated notification from Zeugma Platform</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    text_content = f"""
    Site Rejected
    
    The site you submitted has been rejected during verification.
    
    Company: {site.company_name}
    Category: {site.get_category_display()}
    Country: {site.country}
    Reviewed by: {rejected_by.get_full_name()}
    
    Rejection Reason:
    {reason}
    
    If you believe this is an error, please contact the verification team.
    """
    
    try:
        email = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[site.collected_by.email],
        )
        email.attach_alternative(html_content, "text/html")
        email.send(fail_silently=False)
        
        print(f"✅ Rejection notification sent to {site.collected_by.email}")
        return True
    except Exception as e:
        print(f"❌ Failed to send rejection notification: {str(e)}")
        return False


def send_daily_summary_to_staff():
    """
    Send daily summary of unverified sites to staff
    Can be called via Django management command or Celery task
    """
    from django.db.models import Count, Avg
    from django.utils import timezone
    
    # Check if daily summary is enabled
    try:
        from dashboard.models import NotificationSettings
        global_settings = NotificationSettings.get_settings()
        
        if not global_settings.get('notifications_enabled', True):
            print(f"🚫 Daily summary blocked: notifications disabled")
            return False
        
        if not global_settings.get('daily_summary_enabled', True):
            print(f"🚫 Daily summary blocked: daily summary disabled")
            return False
    except Exception as e:
        print(f"⚠️ Could not check daily summary settings: {e}")
    
    # Get stats
    total_pending = UnverifiedSite.objects.filter(
        verification_status=VerificationStatus.PENDING
    ).count()
    
    total_under_review = UnverifiedSite.objects.filter(
        verification_status=VerificationStatus.UNDER_REVIEW
    ).count()
    
    approved_today = UnverifiedSite.objects.filter(
        verification_status=VerificationStatus.APPROVED,
        verified_date__date=timezone.now().date()
    ).count()
    
    avg_quality = UnverifiedSite.objects.filter(
        verification_status=VerificationStatus.PENDING
    ).aggregate(avg=Avg('data_quality_score'))['avg'] or 0
    
    # Get staff emails
    staff_users = User.objects.filter(
        role__in=['STAFF_ADMIN', 'SUPERADMIN'],
        is_active=True
    )
    recipient_list = [user.email for user in staff_users if user.email]
    
    if not recipient_list:
        return
    
    subject = f'Daily Verification Summary - {total_pending} Sites Pending'
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                       color: white; padding: 20px; border-radius: 8px 8px 0 0; }}
            .stats-grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }}
            .stat-card {{ background: white; padding: 20px; border-radius: 8px; 
                         border: 2px solid #e5e7eb; text-align: center; }}
            .stat-number {{ font-size: 36px; font-weight: bold; color: #4f46e5; }}
            .stat-label {{ font-size: 14px; color: #6b7280; margin-top: 5px; }}
            .button {{ display: inline-block; padding: 12px 24px; background: #4f46e5; 
                      color: white; text-decoration: none; border-radius: 6px; 
                      font-weight: 600; margin: 20px 0; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2 style="margin: 0;">📊 Daily Verification Summary</h2>
                <p style="margin: 5px 0 0 0; opacity: 0.9;">
                    {timezone.now().strftime('%B %d, %Y')}
                </p>
            </div>
            
            <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb;">
                <div class="stats-grid">
                    <div class="stat-card" style="border-color: #f59e0b;">
                        <div class="stat-number" style="color: #f59e0b;">{total_pending}</div>
                        <div class="stat-label">Pending Review</div>
                    </div>
                    <div class="stat-card" style="border-color: #3b82f6;">
                        <div class="stat-number" style="color: #3b82f6;">{total_under_review}</div>
                        <div class="stat-label">Under Review</div>
                    </div>
                    <div class="stat-card" style="border-color: #10b981;">
                        <div class="stat-number" style="color: #10b981;">{approved_today}</div>
                        <div class="stat-label">Approved Today</div>
                    </div>
                    <div class="stat-card" style="border-color: #6366f1;">
                        <div class="stat-number" style="color: #6366f1;">{int(avg_quality)}%</div>
                        <div class="stat-label">Avg Quality Score</div>
                    </div>
                </div>
                
                <div style="text-align: center; margin-top: 20px;">
                    <a href="{settings.FRONTEND_URL}/unverified-sites" class="button">
                        Review Pending Sites →
                    </a>
                </div>
            </div>
        </div>
    </body>
    </html>
    """
    
    text_content = f"""
    Daily Verification Summary - {timezone.now().strftime('%B %d, %Y')}
    
    Pending Review: {total_pending}
    Under Review: {total_under_review}
    Approved Today: {approved_today}
    Avg Quality Score: {int(avg_quality)}%
    
    Review pending sites at: {settings.FRONTEND_URL}/unverified-sites
    """
    
    try:
        email = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=recipient_list,
        )
        email.attach_alternative(html_content, "text/html")
        email.send(fail_silently=False)
        
        print(f"✅ Daily summary sent to {len(recipient_list)} staff members")
        return True
    except Exception as e:
        print(f"❌ Failed to send daily summary: {str(e)}")
        return False