# accounts/email_models.py
# Email template and branding models

from django.db import models
from django.utils import timezone
from django.core.mail import EmailMultiAlternatives
from django.conf import settings
import re
import datetime


class EmailBranding(models.Model):
    """
    Global email branding settings - singleton model
    """
    company_name = models.CharField(max_length=255, default='Zeugma Platform')
    logo_url = models.URLField(blank=True, null=True, help_text='URL to company logo')
    primary_color = models.CharField(max_length=7, default='#8b5cf6', help_text='Primary brand color (hex)')
    secondary_color = models.CharField(max_length=7, default='#7c3aed', help_text='Secondary brand color (hex)')
    footer_text = models.TextField(blank=True, default='© 2025 Zeugma Platform. All rights reserved.')
    support_email = models.EmailField(blank=True, default='support@zeugma.com')
    website_url = models.URLField(blank=True, default='https://zeugma.com')
    
    # Social links (stored as JSON)
    social_links = models.JSONField(default=dict, blank=True)
    
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='email_branding_updates'
    )

    class Meta:
        verbose_name = 'Email Branding'
        verbose_name_plural = 'Email Branding'

    def __str__(self):
        return f"Email Branding - {self.company_name}"

    @classmethod
    def get_branding(cls):
        """Get or create the singleton branding instance"""
        branding, created = cls.objects.get_or_create(pk=1)
        return branding

    def save(self, *args, **kwargs):
        self.pk = 1  # Ensure singleton
        super().save(*args, **kwargs)


class EmailTemplate(models.Model):
    """
    Customizable email templates
    """
    TEMPLATE_TYPES = [
        # Account & Security
        ('user_invited', 'User Creation'),
        ('2fa_setup_code', 'Two-Factor Authentication Setup'),
        ('welcome', 'Welcome Email'),
        ('2fa_disabled', '2FA Disabled Confirmation'),
        ('2fa_enabled_notification', '2FA Enabled Notification'),
        ('2fa_enabled', '2FA Enabled Confirmation'),
        ('password_reset', 'Password Reset Request'),
        ('password_reset_success', 'Password Reset Confirmation'),
        ('2fa_code', '2FA Verification Code'),
        ('password_changed', 'Password Changed Confirmation'),
        # Login Alerts
        ('account_locked', 'Account Locked Notification'),
        ('new_device_login', 'New Device Login Alert'),
        ('suspicious_login', 'Suspicious Login Activity'),
        # Reports
        ('report_ready', 'Report Ready Notification'),
        # Announcements
        ('announcement_info', 'System Announcement (Info)'),
        ('announcement_warning', 'System Announcement (Warning)'),
        ('announcement_success', 'System Announcement (Success)'),
        ('announcement_urgent', 'System Announcement (Urgent)'),
    ]

    template_type = models.CharField(
        max_length=50,
        choices=TEMPLATE_TYPES,
        unique=True
    )
    name = models.CharField(max_length=255)
    subject = models.CharField(max_length=255, help_text='Email subject line. Can use {{variables}}')
    html_content = models.TextField(help_text='HTML email content. Can use {{variables}}')
    text_content = models.TextField(blank=True, help_text='Plain text fallback content')
    
    # Available variables for this template type (stored as JSON list)
    available_variables = models.JSONField(default=list, blank=True)
    
    is_active = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='email_template_updates'
    )

    class Meta:
        verbose_name = 'Email Template'
        verbose_name_plural = 'Email Templates'
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.template_type})"

    def render_subject(self, context_data):
        """Render the subject with context variables"""
        from .email_models import EmailBranding
        
        # Add branding to context for subject rendering
        branding = EmailBranding.get_branding()
        context_data.setdefault('company_name', branding.company_name)
        
        subject = self.subject
        for key, value in context_data.items():
            subject = subject.replace('{{' + key + '}}', str(value))
            subject = subject.replace('{{ ' + key + ' }}', str(value))
        return subject

    def render_html(self, context_data):
        """Render the HTML content with context variables"""
        branding = EmailBranding.get_branding()
        
        # Add branding to context
        context_data.update({
            'company_name': branding.company_name,
            'logo_url': branding.logo_url or '',
            'primary_color': branding.primary_color,
            'secondary_color': branding.secondary_color,
            'footer_text': branding.footer_text,
            'support_email': branding.support_email,
            'website_url': branding.website_url,
            'current_year': timezone.now().year,
        })
        
        html = self.html_content
        
        # Replace variables
        for key, value in context_data.items():
            html = html.replace('{{' + key + '}}', str(value))
            html = html.replace('{{ ' + key + ' }}', str(value))
        
        return html

    def render_text(self, context_data):
        """Render the plain text content with context variables"""
        if not self.text_content:
            return ""
        text = self.text_content
        for key, value in context_data.items():
            text = text.replace('{{' + key + '}}', str(value))
            text = text.replace('{{ ' + key + ' }}', str(value))
        return text

    def send_email(self, to_email, context_data, from_email=None):
        """Send this email template to a recipient using SSL-fixed email sending"""
        if not self.is_active:
            return False

        subject = self.render_subject(context_data)
        html_content = self.render_html(context_data)
        text_content = self.render_text(context_data) or "Please view this email in an HTML-compatible email client."

        # Use SSL-fixed email sending to avoid certificate verification issues
        import ssl
        import smtplib
        from email.mime.text import MIMEText
        from email.mime.multipart import MIMEMultipart
        
        try:
            ssl_context = ssl.create_default_context()
            ssl_context.check_hostname = False
            ssl_context.verify_mode = ssl.CERT_NONE
            
            msg = MIMEMultipart('alternative')
            msg.attach(MIMEText(text_content, 'plain'))
            msg.attach(MIMEText(html_content, 'html'))
            
            msg['Subject'] = subject
            msg['From'] = settings.DEFAULT_FROM_EMAIL
            msg['To'] = to_email if isinstance(to_email, str) else ', '.join(to_email)
            
            with smtplib.SMTP(settings.EMAIL_HOST, settings.EMAIL_PORT) as server:
                server.starttls(context=ssl_context)
                server.login(settings.EMAIL_HOST_USER, settings.EMAIL_HOST_PASSWORD)
                recipients = [to_email] if isinstance(to_email, str) else to_email
                server.sendmail(settings.EMAIL_HOST_USER, recipients, msg.as_string())
            
            print(f"✅ Email sent successfully to {to_email}")
            return True
        except Exception as e:
            print(f"❌ Failed to send email: {e}")
            return False

    @classmethod
    def get_template(cls, template_type):
        """Get a template by type, or return None if not found/inactive"""
        try:
            return cls.objects.get(template_type=template_type, is_active=True)
        except cls.DoesNotExist:
            return None

    @classmethod
    def send_template_email(cls, template_type, to_email, context_data, from_email=None):
        """Convenience method to send an email by template type"""
        template = cls.get_template(template_type)
        if template:
            return template.send_email(to_email, context_data, from_email)
        return False

    @classmethod
    def create_default_templates(cls):
        """Create default email templates if they don't exist"""
        defaults = cls._get_default_templates()
        
        created_count = 0
        for template_type, data in defaults.items():
            _, created = cls.objects.get_or_create(
                template_type=template_type,
                defaults=data
            )
            if created:
                created_count += 1
        
        return created_count

    @classmethod
    def _get_default_templates(cls):
        """Get default template definitions with full HTML"""
        branding = EmailBranding.get_branding()
        primary = branding.primary_color
        secondary = branding.secondary_color
        company = branding.company_name
        
        return {
            # ============================================
            # WELCOME EMAIL
            # ============================================
            'welcome': {
                'name': 'Welcome Email',
                'subject': '🎉 Welcome to {{company_name}}!',
                'html_content': '''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to {{company_name}}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); max-width: 600px; overflow: hidden;">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, {{primary_color}} 0%, {{secondary_color}} 100%); padding: 40px 40px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 600;">
                                🎉 Welcome to {{company_name}}!
                            </h1>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 40px 20px 40px;">
                            <p style="margin: 0 0 20px 0; font-size: 18px; line-height: 1.6; color: {{primary_color}}; font-weight: 500;">
                                Hello {{user_name}}! 👋
                            </p>

                            <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                                Your account setup is complete. You now have full access to the platform as a <strong>{{user_role}}</strong>.
                            </p>

                            <!-- Go to Dashboard Button -->
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" style="padding: 20px 0;">
                                        <a href="{{dashboard_url}}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, {{primary_color}} 0%, {{secondary_color}} 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(124, 58, 237, 0.4);">
                                            🚀 Go to Your Dashboard
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <!-- What You Can Do -->
                            <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin: 20px 0;">
                                <p style="margin: 0 0 15px 0; font-size: 16px; font-weight: 600; color: #166534;">
                                    ✨ What you can do:
                                </p>
                                <ul style="margin: 0; padding-left: 20px; color: #166534; font-size: 14px; line-height: 2;">
                                    <li>Access your personalized dashboard</li>
                                    <li>View and manage reports</li>
                                    <li>Communicate with the team</li>
                                    <li>Receive important notifications</li>
                                </ul>
                            </div>

                            <!-- Security Reminder -->
                            <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 20px; margin: 20px 0;">
                                <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: 600; color: #1e40af;">
                                    🔒 Security is enabled
                                </p>
                                <p style="margin: 0; font-size: 14px; color: #1e40af; line-height: 1.6;">
                                    Two-Factor Authentication is active on your account. You can manage your security settings anytime.
                                </p>
                            </div>
                        </td>
                    </tr>

                    <!-- Signature -->
                    <tr>
                        <td style="padding: 20px 40px 30px 40px;">
                            <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #4a4a4a;">
                                Welcome aboard! 🚀<br>
                                <strong style="color: {{primary_color}};">{{company_name}} Team</strong>
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 30px 40px; border-top: 1px solid #e5e7eb;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center">
                                        <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #1a1a1a;">
                                            {{company_name}}
                                        </p>
                                        <p style="margin: 0; font-size: 11px; color: #9ca3af;">
                                            © {{current_year}} {{company_name}}. All rights reserved.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>''',
                'text_content': '''Welcome to {{company_name}}, {{user_name}}!

Your account setup is complete. You now have full access to the platform as a {{user_role}}.

Go to your dashboard: {{dashboard_url}}

What you can do:
- Access your personalized dashboard
- View and manage reports
- Communicate with the team
- Receive important notifications

Security is enabled - Two-Factor Authentication is active on your account.

Welcome aboard!
{{company_name}} Team''',
                'available_variables': ['user_name', 'user_email', 'user_role', 'dashboard_url'],
            },

            # ============================================
            # USER CREATION - Set Up Account
            # ============================================
            'user_invited': {
                'name': 'User Creation',
                'subject': 'Welcome to {{company_name}} - Set Up Your Account',
                'html_content': '''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to {{company_name}}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); max-width: 600px; overflow: hidden;">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, {{primary_color}} 0%, {{secondary_color}} 100%); padding: 50px 40px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
                                Welcome to {{company_name}}
                            </h1>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 40px 20px 40px;">
                            <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: {{primary_color}}; font-weight: 500;">
                                Dear {{user_name}},
                            </p>

                            <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                                Your <strong>{{role}}</strong> account has been created on {{company_name}}. We're excited to have you on board!
                            </p>

                            <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                                To get started, please set up your password by clicking the button below:
                            </p>

                            <!-- Set Up Account Button -->
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" style="padding: 20px 0;">
                                        <a href="{{invite_url}}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, {{primary_color}} 0%, {{secondary_color}} 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(139, 92, 246, 0.3);">
                                            Set Up Your Account
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <!-- What Happens Next -->
                            <div style="border-left: 4px solid #dc2626; padding: 15px 20px; margin: 25px 0; background-color: #ffffff;">
                                <p style="margin: 0 0 15px 0; font-size: 15px; font-weight: 600; color: #1a1a1a;">
                                    What happens next:
                                </p>
                                <ul style="margin: 0; padding-left: 20px; color: #4a4a4a; font-size: 14px; line-height: 1.8;">
                                    <li>Create a secure password for your account</li>
                                    <li>Set up Two-Factor Authentication for enhanced security</li>
                                    <li>Complete your profile information</li>
                                    <li>Start using the platform!</li>
                                </ul>
                            </div>

                            <!-- Note -->
                            <p style="margin: 25px 0; font-size: 14px; line-height: 1.6; color: #4a4a4a;">
                                <strong>Note:</strong> This link will expire in <strong>{{expiry_hours}} hours</strong>. If you didn't expect this email, please contact support.
                            </p>

                            <!-- Fallback Link -->
                            <p style="margin: 0 0 10px 0; font-size: 13px; color: #6b7280;">
                                Or copy and paste this link into your browser:
                            </p>
                            <p style="margin: 0; font-size: 13px; word-break: break-all;">
                                <a href="{{invite_url}}" style="color: {{primary_color}}; text-decoration: none;">{{invite_url}}</a>
                            </p>
                        </td>
                    </tr>

                    <!-- Signature -->
                    <tr>
                        <td style="padding: 20px 40px 30px 40px;">
                            <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #4a4a4a;">
                                Warm regards,<br>
                                <strong style="color: {{primary_color}};">{{company_name}} Team</strong>
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 30px 40px; border-top: 1px solid #e5e7eb;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center">
                                        <p style="margin: 0 0 5px 0; font-size: 14px; font-weight: 600; color: #1a1a1a;">
                                            {{company_name}}
                                        </p>
                                        <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                                            {{footer_text}}
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>''',
                'text_content': '''Welcome to {{company_name}}!

Dear {{user_name}},

Your {{role}} account has been created on {{company_name}}. We're excited to have you on board!

To get started, please set up your password by clicking the link below:
{{invite_url}}

What happens next:
- Create a secure password for your account
- Set up Two-Factor Authentication for enhanced security
- Complete your profile information
- Start using the platform!

Note: This link will expire in {{expiry_hours}} hours. If you didn't expect this email, please contact support.

Warm regards,
{{company_name}} Team''',
                'available_variables': ['user_name', 'invite_url', 'expiry_hours', 'role'],
            },

            # ============================================
            # PASSWORD RESET
            # ============================================
            'password_reset': {
                'name': 'Password Reset Request',
                'subject': '🔐 Reset Your Password - {{company_name}}',
                'html_content': '''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); max-width: 600px; overflow: hidden;">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, {{primary_color}} 0%, {{secondary_color}} 100%); padding: 40px 40px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
                                🔐 Password Reset Request
                            </h1>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 40px 20px 40px;">
                            <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                                Hello {{user_name}},
                            </p>

                            <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                                We received a request to reset your password. Click the button below to create a new password:
                            </p>

                            <!-- Reset Button -->
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" style="padding: 20px 0;">
                                        <a href="{{reset_url}}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, {{primary_color}} 0%, {{secondary_color}} 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600;">
                                            🔑 Reset Password
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <!-- Expiry Notice -->
                            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 0 8px 8px 0; padding: 15px 20px; margin: 20px 0;">
                                <p style="margin: 0; font-size: 14px; color: #92400e;">
                                    ⏰ This link will expire in <strong>{{expiry_hours}} hours</strong>.
                                </p>
                            </div>

                            <!-- Didn't Request -->
                            <div style="background-color: #f8f9fa; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
                                <p style="margin: 0; font-size: 14px; color: #6b7280;">
                                    If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.
                                </p>
                            </div>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 30px 40px; border-top: 1px solid #e5e7eb;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center">
                                        <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #1a1a1a;">
                                            {{company_name}}
                                        </p>
                                        <p style="margin: 0; font-size: 11px; color: #9ca3af;">
                                            © {{current_year}} {{company_name}}. All rights reserved.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>''',
                'text_content': '''Password Reset Request

Hello {{user_name}},

We received a request to reset your password. Click the link below to create a new password:

{{reset_url}}

This link will expire in {{expiry_hours}} hours.

If you didn't request this password reset, you can safely ignore this email.

{{company_name}} Team''',
                'available_variables': ['user_name', 'user_email', 'reset_url', 'expiry_hours'],
            },

            # ============================================
            # PASSWORD RESET SUCCESS
            # ============================================
            'password_reset_success': {
                'name': 'Password Reset Confirmation',
                'subject': '✅ Password Reset Successful - {{company_name}}',
                'html_content': '''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset Successful</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); max-width: 600px; overflow: hidden;">
                    <!-- Header - Green Success -->
                    <tr>
                        <td style="background: linear-gradient(135deg, {{primary_color}} 0%, {{secondary_color}} 100%); padding: 40px 40px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
                                Password Reset Successful
                            </h1>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 40px 20px 40px;">
                            <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                                Hello {{user_name}},
                            </p>

                            <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                                Your password has been successfully reset for your {{company_name}} account.
                            </p>

                            <!-- Success Box -->
                            <div style="background-color: #f0fdf4; border: 2px solid #10b981; border-radius: 12px; padding: 30px; margin: 25px 0; text-align: center;">
                                <div style="width: 70px; height: 70px; background: linear-gradient(135deg, #059669 0%, #10b981 100%); border-radius: 50%; margin: 0 auto 15px auto; display: flex; align-items: center; justify-content: center;">
                                    <span style="font-size: 36px; color: #ffffff;">✓</span>
                                </div>
                                <p style="margin: 0; font-size: 16px; color: #065f46; font-weight: 500;">
                                    You can now log in with your new password.
                                </p>
                            </div>

                            <!-- Login Button -->
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" style="padding: 20px 0;">
                                        <a href="{{login_url}}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, {{primary_color}} 0%, {{secondary_color}} 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600;">
                                            🔑 Go to Login
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <!-- Security Notice -->
                            <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; border-radius: 0 8px 8px 0; padding: 20px; margin: 20px 0;">
                                <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: 600; color: #991b1b;">
                                    🚨 Didn't request this change?
                                </p>
                                <p style="margin: 0; font-size: 14px; color: #991b1b; line-height: 1.6;">
                                    If you didn't reset your password, someone may have access to your account. Please contact support immediately.
                                </p>
                            </div>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 30px 40px; border-top: 1px solid #e5e7eb;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center">
                                        <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #1a1a1a;">
                                            {{company_name}}
                                        </p>
                                        <p style="margin: 0; font-size: 11px; color: #9ca3af;">
                                            © {{current_year}} {{company_name}}. All rights reserved.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>''',
                'text_content': '''Password Reset Successful

Hello {{user_name}},

Your password has been successfully reset for your {{company_name}} account.

You can now log in with your new password.

Go to login: {{login_url}}

If you didn't reset your password, someone may have access to your account. Please contact support immediately.

{{company_name}} Team''',
                'available_variables': ['user_name', 'login_url'],
            },

            # ============================================
            # PASSWORD CHANGED
            # ============================================
            'password_changed': {
                'name': 'Password Changed Confirmation',
                'subject': '✅ Password Changed Successfully - {{company_name}}',
                'html_content': '''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Changed</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); max-width: 600px; overflow: hidden;">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 40px 40px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
                                ✅ Password Changed Successfully
                            </h1>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 40px 20px 40px;">
                            <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                                Hello {{user_name}},
                            </p>

                            <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                                Your password was successfully changed.
                            </p>

                            <!-- Change Details -->
                            <div style="background-color: #f8f9fa; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
                                <p style="margin: 0 0 15px 0; font-size: 14px; font-weight: 600; color: #1a1a1a;">
                                    📋 Change Details
                                </p>
                                <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 14px;">
                                    <tr>
                                        <td style="padding: 8px 0; color: #6b7280; width: 140px;">🕒 Time:</td>
                                        <td style="padding: 8px 0; color: #1a1a1a; font-weight: 500;">{{change_time}}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #6b7280;">🌐 IP Address:</td>
                                        <td style="padding: 8px 0; color: #1a1a1a; font-weight: 500;">{{ip_address}}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #6b7280;">📍 Location:</td>
                                        <td style="padding: 8px 0; color: #1a1a1a; font-weight: 500;">{{location}}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #6b7280;">💻 Device:</td>
                                        <td style="padding: 8px 0; color: #1a1a1a; font-weight: 500;">{{device}}</td>
                                    </tr>
                                </table>
                            </div>

                            <!-- Warning -->
                            <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; border-radius: 0 8px 8px 0; padding: 20px; margin: 20px 0;">
                                <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: 600; color: #991b1b;">
                                    🚨 Didn't make this change?
                                </p>
                                <p style="margin: 0; font-size: 14px; color: #991b1b; line-height: 1.6;">
                                    If you didn't change your password, your account may be compromised. Please contact support immediately.
                                </p>
                            </div>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 30px 40px; border-top: 1px solid #e5e7eb;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center">
                                        <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #1a1a1a;">
                                            {{company_name}}
                                        </p>
                                        <p style="margin: 0; font-size: 11px; color: #9ca3af;">
                                            © {{current_year}} {{company_name}}. All rights reserved.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>''',
                'text_content': '''Password Changed Successfully

Hello {{user_name}},

Your password was successfully changed.

Change Details:
- Time: {{change_time}}
- IP Address: {{ip_address}}
- Location: {{location}}
- Device: {{device}}

If you didn't make this change, your account may be compromised. Please contact support immediately.

{{company_name}} Team''',
                'available_variables': ['user_name', 'change_time', 'ip_address', 'location', 'device', 'browser', 'os'],
            },

            # ============================================
            # 2FA SETUP CODE - For enabling 2FA
            # ============================================
            '2fa_setup_code': {
                'name': 'Two-Factor Authentication Setup',
                'subject': '🔐 Two-Factor Authentication - {{company_name}}',
                'html_content': '''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Two-Factor Authentication</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); max-width: 600px; overflow: hidden;">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, {{primary_color}} 0%, {{secondary_color}} 100%); padding: 40px 40px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
                                Two-Factor Authentication
                            </h1>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 40px 20px 40px;">
                            <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                                Hello {{user_name}},
                            </p>

                            <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                                {{setup_message}}
                            </p>

                            <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                                Use the verification code below to complete the setup:
                            </p>

                            <!-- Code Box -->
                            <div style="background: linear-gradient(135deg, #f8f9fa 0%, #f3f4f6 100%); border: 2px dashed {{primary_color}}; border-radius: 12px; padding: 30px; margin: 25px 0; text-align: center;">
                                <p style="margin: 0; font-size: 48px; font-weight: 700; letter-spacing: 12px; color: {{primary_color}}; font-family: 'Courier New', monospace;">
                                    {{code}}
                                </p>
                            </div>

                            <!-- Expiry Warning -->
                            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 0 8px 8px 0; padding: 15px 20px; margin: 20px 0;">
                                <p style="margin: 0; font-size: 14px; color: #92400e;">
                                    ⏰ This code will expire in <strong>{{expiry_minutes}} minutes</strong>.
                                </p>
                            </div>

                            <!-- Security Info -->
                            <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 20px; margin: 20px 0;">
                                <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: 600; color: #1e40af;">
                                    🛡️ Why Two-Factor Authentication?
                                </p>
                                <ul style="margin: 0; padding-left: 20px; color: #1e40af; font-size: 14px; line-height: 1.8;">
                                    <li>Adds an extra layer of security to your account</li>
                                    <li>Protects against unauthorized access</li>
                                    <li>Requires verification code for each login</li>
                                </ul>
                            </div>

                            <!-- Security Notice -->
                            <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; margin: 20px 0;">
                                <p style="margin: 0; font-size: 14px; color: #991b1b;">
                                    🔒 <strong>Never share this code.</strong> {{company_name}} will never ask you for this code.
                                </p>
                            </div>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 30px 40px; border-top: 1px solid #e5e7eb;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center">
                                        <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #1a1a1a;">
                                            {{company_name}}
                                        </p>
                                        <p style="margin: 0; font-size: 11px; color: #9ca3af;">
                                            © {{current_year}} {{company_name}}. All rights reserved.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>''',
                'text_content': '''Two-Factor Authentication

Hello {{user_name}},

{{setup_message}}

Use the verification code below to complete the setup:

Your code: {{code}}

This code will expire in {{expiry_minutes}} minutes.

Why Two-Factor Authentication?
- Adds an extra layer of security to your account
- Protects against unauthorized access
- Requires verification code for each login

Never share this code. {{company_name}} will never ask you for this code.

{{company_name}} Team''',
                'available_variables': ['user_name', 'code', 'expiry_minutes', 'setup_message'],
            },

            # ============================================
            # 2FA VERIFICATION CODE
            # ============================================
            '2fa_code': {
                'name': '2FA Verification Code',
                'subject': '🔐 Your Verification Code - {{company_name}}',
                'html_content': '''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verification Code</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); max-width: 600px; overflow: hidden;">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, {{primary_color}} 0%, {{secondary_color}} 100%); padding: 40px 40px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
                                🔐 Verification Code
                            </h1>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 40px 20px 40px;">
                            <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                                Hello {{user_name}},
                            </p>

                            <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                                Your verification code is:
                            </p>

                            <!-- Code Box -->
                            <div style="background: linear-gradient(135deg, #f8f9fa 0%, #f3f4f6 100%); border: 2px solid {{primary_color}}; border-radius: 12px; padding: 30px; margin: 25px 0; text-align: center;">
                                <p style="margin: 0; font-size: 48px; font-weight: 700; letter-spacing: 12px; color: {{primary_color}}; font-family: 'Courier New', monospace;">
                                    {{code}}
                                </p>
                            </div>

                            <!-- Expiry Warning -->
                            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 0 8px 8px 0; padding: 15px 20px; margin: 20px 0;">
                                <p style="margin: 0; font-size: 14px; color: #92400e;">
                                    ⏰ This code will expire in <strong>{{expiry_minutes}} minutes</strong>.
                                </p>
                            </div>

                            <!-- Security Notice -->
                            <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; margin: 20px 0;">
                                <p style="margin: 0; font-size: 14px; color: #991b1b;">
                                    🔒 <strong>Never share this code.</strong> {{company_name}} will never ask you for this code.
                                </p>
                            </div>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 30px 40px; border-top: 1px solid #e5e7eb;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center">
                                        <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #1a1a1a;">
                                            {{company_name}}
                                        </p>
                                        <p style="margin: 0; font-size: 11px; color: #9ca3af;">
                                            © {{current_year}} {{company_name}}. All rights reserved.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>''',
                'text_content': '''Verification Code

Hello {{user_name}},

Your verification code is: {{code}}

This code will expire in {{expiry_minutes}} minutes.

Never share this code. {{company_name}} will never ask you for this code.

{{company_name}} Team''',
                'available_variables': ['user_name', 'code', 'expiry_minutes'],
            },

            # ============================================
            # 2FA ENABLED
            # ============================================
            '2fa_enabled': {
                'name': '2FA Enabled Confirmation',
                'subject': '✅ Two-Factor Authentication Enabled - {{company_name}}',
                'html_content': '''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>2FA Enabled</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); max-width: 600px; overflow: hidden;">
                    <!-- Header - Green Success -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 40px 40px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
                                ✅ Two-Factor Authentication Enabled
                            </h1>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 40px 20px 40px;">
                            <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #059669; font-weight: 500;">
                                Hello {{user_name}},
                            </p>

                            <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                                Great news! Two-Factor Authentication has been <strong style="color: #059669;">successfully enabled</strong> on your {{company_name}} account.
                            </p>

                            <!-- Success Box -->
                            <div style="background-color: #f0fdf4; border: 2px solid #10b981; border-radius: 12px; padding: 25px; margin: 25px 0; text-align: center;">
                                <div style="font-size: 48px; margin-bottom: 15px;">🔐</div>
                                <h2 style="margin: 0 0 10px 0; font-size: 20px; color: #065f46; font-weight: 600;">
                                    Your Account is Now More Secure
                                </h2>
                                <p style="margin: 0; font-size: 14px; color: #047857; line-height: 1.6;">
                                    Two-factor authentication adds an extra layer of security to your account.
                                </p>
                            </div>

                            <!-- Setup Details Box -->
                            <div style="background-color: #f8f9fa; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
                                <p style="margin: 0 0 15px 0; font-size: 14px; font-weight: 600; color: #1a1a1a;">
                                    🔒 Setup Details
                                </p>
                                <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 14px;">
                                    <tr>
                                        <td style="padding: 8px 0; color: #6b7280; width: 140px;">🕒 Time:</td>
                                        <td style="padding: 8px 0; color: #1a1a1a; font-weight: 500;">{{change_time}}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #6b7280;">🌐 IP Address:</td>
                                        <td style="padding: 8px 0; color: #1a1a1a; font-weight: 500;">{{ip_address}}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #6b7280;">📍 Location:</td>
                                        <td style="padding: 8px 0; color: #1a1a1a; font-weight: 500;">{{location}}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #6b7280;">💻 Device:</td>
                                        <td style="padding: 8px 0; color: #1a1a1a; font-weight: 500;">{{device}}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #6b7280;">🌐 Browser:</td>
                                        <td style="padding: 8px 0; color: #1a1a1a; font-weight: 500;">{{browser}}</td>
                                    </tr>
                                </table>
                            </div>

                            <!-- Security Benefits -->
                            <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 0 8px 8px 0; padding: 20px; margin: 20px 0;">
                                <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: 600; color: #1e40af;">
                                    🛡️ What this means for you:
                                </p>
                                <ul style="margin: 0; padding-left: 20px; color: #1e40af; font-size: 14px; line-height: 1.8;">
                                    <li>Extra protection against unauthorized access</li>
                                    <li>Verification code required for each login</li>
                                    <li>Immediate alerts for suspicious activity</li>
                                    <li>Peace of mind for your account security</li>
                                </ul>
                            </div>

                            <!-- Manage Security Button -->
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" style="padding: 20px 0;">
                                        <a href="{{security_url}}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, {{primary_color}} 0%, {{secondary_color}} 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600;">
                                            ⚙️ Manage Security Settings
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <!-- Didn't Do This -->
                            <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; border-radius: 0 8px 8px 0; padding: 20px; margin: 20px 0;">
                                <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: 600; color: #991b1b;">
                                    🚨 Didn't enable this?
                                </p>
                                <p style="margin: 0; font-size: 14px; color: #991b1b; line-height: 1.6;">
                                    If you didn't make this change, please secure your account immediately by contacting support.
                                </p>
                            </div>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 30px 40px; border-top: 1px solid #e5e7eb;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center">
                                        <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #1a1a1a;">
                                            {{company_name}}
                                        </p>
                                        <p style="margin: 0; font-size: 11px; color: #9ca3af;">
                                            © {{current_year}} {{company_name}}. All rights reserved.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>''',
                'text_content': '''✅ Two-Factor Authentication Enabled

Hello {{user_name}},

Great news! Two-Factor Authentication has been successfully enabled on your {{company_name}} account.

Your Account is Now More Secure
Two-factor authentication adds an extra layer of security to your account.

Setup Details:
- Time: {{change_time}}
- IP Address: {{ip_address}}
- Location: {{location}}
- Device: {{device}}
- Browser: {{browser}}

What this means for you:
- Extra protection against unauthorized access
- Verification code required for each login
- Immediate alerts for suspicious activity
- Peace of mind for your account security

Manage your security settings: {{security_url}}

If you didn't make this change, please secure your account immediately by contacting support.

{{company_name}} Team''',
                'available_variables': ['user_name', 'change_time', 'ip_address', 'location', 'device', 'browser', 'os', 'security_url'],
            },

            # ============================================
            # 2FA DISABLED
            # ============================================
            '2fa_disabled': {
                'name': '2FA Disabled Confirmation',
                'subject': '⚠️ Two-Factor Authentication Disabled - {{company_name}}',
                'html_content': '''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>2FA Disabled</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); max-width: 600px; overflow: hidden;">
                    <!-- Header - Warning Orange/Red -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #f59e0b 0%, #dc2626 100%); padding: 40px 40px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
                                ⚠️ Two-Factor Authentication Disabled
                            </h1>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 40px 20px 40px;">
                            <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #dc2626; font-weight: 500;">
                                Hello {{user_name}},
                            </p>

                            <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                                Two-Factor Authentication has been <strong style="color: #dc2626;">DISABLED</strong> on your {{company_name}} account.
                            </p>

                            <!-- Security Details Box -->
                            <div style="background-color: #f8f9fa; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
                                <p style="margin: 0 0 15px 0; font-size: 14px; font-weight: 600; color: #1a1a1a;">
                                    🔓 Change Details
                                </p>
                                <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 14px;">
                                    <tr>
                                        <td style="padding: 8px 0; color: #6b7280; width: 140px;">🕒 Time:</td>
                                        <td style="padding: 8px 0; color: #1a1a1a; font-weight: 500;">{{change_time}}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #6b7280;">🌐 IP Address:</td>
                                        <td style="padding: 8px 0; color: #1a1a1a; font-weight: 500;">{{ip_address}}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #6b7280;">📍 Location:</td>
                                        <td style="padding: 8px 0; color: #1a1a1a; font-weight: 500;">{{location}}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #6b7280;">💻 Device:</td>
                                        <td style="padding: 8px 0; color: #1a1a1a; font-weight: 500;">{{device}}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #6b7280;">🌐 Browser:</td>
                                        <td style="padding: 8px 0; color: #1a1a1a; font-weight: 500;">{{browser}}</td>
                                    </tr>
                                </table>
                            </div>

                            <!-- Warning Box -->
                            <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; border-radius: 0 8px 8px 0; padding: 20px; margin: 20px 0;">
                                <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: 600; color: #991b1b;">
                                    ⚠️ Your account is now less secure
                                </p>
                                <p style="margin: 0 0 15px 0; font-size: 14px; color: #991b1b; line-height: 1.6;">
                                    Without Two-Factor Authentication, anyone with your password can access your account.
                                </p>
                                <table width="100%" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td align="center">
                                            <a href="{{security_url}}" style="display: inline-block; padding: 12px 24px; background-color: #059669; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 600;">
                                                🔒 Re-enable 2FA
                                            </a>
                                        </td>
                                    </tr>
                                </table>
                            </div>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 30px 40px; border-top: 1px solid #e5e7eb;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center">
                                        <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #1a1a1a;">
                                            {{company_name}}
                                        </p>
                                        <p style="margin: 0; font-size: 11px; color: #9ca3af;">
                                            © {{current_year}} {{company_name}}. All rights reserved.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>''',
                'text_content': '''⚠️ Two-Factor Authentication Disabled

Hello {{user_name}},

Two-Factor Authentication has been DISABLED on your {{company_name}} account.

Change Details:
- Time: {{change_time}}
- IP Address: {{ip_address}}
- Location: {{location}}
- Device: {{device}}
- Browser: {{browser}}

Your account is now less secure. Without 2FA, anyone with your password can access your account.

Re-enable 2FA: {{security_url}}

{{company_name}} Team''',
                'available_variables': ['user_name', 'change_time', 'ip_address', 'location', 'device', 'browser', 'os', 'security_url'],
            },

            # ============================================
            # 2FA ENABLED NOTIFICATION
            # ============================================
            '2fa_enabled_notification': {
                'name': '2FA Enabled Notification',
                'subject': '🔐 Two-Factor Authentication Has Been Enabled - {{company_name}}',
                'html_content': '''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>2FA Enabled</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); max-width: 600px; overflow: hidden;">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 40px 40px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
                                🔐 Two-Factor Authentication Enabled
                            </h1>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 40px 20px 40px;">
                            <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #1d4ed8; font-weight: 500;">
                                Hello {{user_name}},
                            </p>

                            <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                                Two-Factor Authentication has been enabled on your {{company_name}} account. This adds an important layer of security to protect your account.
                            </p>

                            <!-- Info Box -->
                            <div style="background-color: #eff6ff; border: 2px solid #3b82f6; border-radius: 12px; padding: 25px; margin: 25px 0; text-align: center;">
                                <div style="font-size: 48px; margin-bottom: 15px;">🛡️</div>
                                <h2 style="margin: 0 0 10px 0; font-size: 20px; color: #1e40af; font-weight: 600;">
                                    Security Enhancement Active
                                </h2>
                                <p style="margin: 0; font-size: 14px; color: #3b82f6; line-height: 1.6;">
                                    Your account now requires a verification code for each login.
                                </p>
                            </div>

                            <!-- What This Means -->
                            <div style="background-color: #f8f9fa; border-left: 4px solid #3b82f6; border-radius: 0 8px 8px 0; padding: 20px; margin: 20px 0;">
                                <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: 600; color: #1a1a1a;">
                                    ℹ️ What this means:
                                </p>
                                <ul style="margin: 0; padding-left: 20px; color: #4a4a4a; font-size: 14px; line-height: 1.8;">
                                    <li>You'll receive a verification code via email when logging in</li>
                                    <li>Your account is protected against unauthorized access</li>
                                    <li>You can manage 2FA settings in your security preferences</li>
                                </ul>
                            </div>

                            <!-- Manage Security Button -->
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" style="padding: 20px 0;">
                                        <a href="{{security_url}}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, {{primary_color}} 0%, {{secondary_color}} 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600;">
                                            ⚙️ Manage Security Settings
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <!-- Didn't Do This -->
                            <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; border-radius: 0 8px 8px 0; padding: 20px; margin: 20px 0;">
                                <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: 600; color: #991b1b;">
                                    🚨 Didn't enable this?
                                </p>
                                <p style="margin: 0; font-size: 14px; color: #991b1b; line-height: 1.6;">
                                    If you didn't make this change, please contact support immediately.
                                </p>
                            </div>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 30px 40px; border-top: 1px solid #e5e7eb;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center">
                                        <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #1a1a1a;">
                                            {{company_name}}
                                        </p>
                                        <p style="margin: 0; font-size: 11px; color: #9ca3af;">
                                            © {{current_year}} {{company_name}}. All rights reserved.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>''',
                'text_content': '''🔐 Two-Factor Authentication Enabled

Hello {{user_name}},

Two-Factor Authentication has been enabled on your {{company_name}} account. This adds an important layer of security to protect your account.

What this means:
- You'll receive a verification code via email when logging in
- Your account is protected against unauthorized access
- You can manage 2FA settings in your security preferences

Manage your security settings: {{security_url}}

If you didn't make this change, please contact support immediately.

{{company_name}} Team''',
                'available_variables': ['user_name', 'security_url'],
            },

            # ============================================
            # NEW DEVICE LOGIN
            # ============================================
            'new_device_login': {
                'name': 'New Device Login Alert',
                'subject': '🔔 New Device Login - {{company_name}}',
                'html_content': '''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Device Login</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); max-width: 600px; overflow: hidden;">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 40px 40px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
                                🔔 New Device Login Detected
                            </h1>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 40px 20px 40px;">
                            <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #1d4ed8; font-weight: 500;">
                                Hello {{user_name}},
                            </p>

                            <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                                We noticed a login to your {{company_name}} account from a new device.
                            </p>

                            <!-- Login Details Box -->
                            <div style="background-color: #f8f9fa; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
                                <p style="margin: 0 0 15px 0; font-size: 14px; font-weight: 600; color: #1a1a1a;">
                                    🖥️ Login Details
                                </p>
                                <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 14px;">
                                    <tr>
                                        <td style="padding: 8px 0; color: #6b7280; width: 140px;">🕒 Time:</td>
                                        <td style="padding: 8px 0; color: #1a1a1a; font-weight: 500;">{{login_time}}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #6b7280;">🌐 IP Address:</td>
                                        <td style="padding: 8px 0; color: #1a1a1a; font-weight: 500;">{{ip_address}}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #6b7280;">📍 Location:</td>
                                        <td style="padding: 8px 0; color: #1a1a1a; font-weight: 500;">{{location}}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #6b7280;">💻 Device:</td>
                                        <td style="padding: 8px 0; color: #1a1a1a; font-weight: 500;">{{device}}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #6b7280;">🌐 Browser:</td>
                                        <td style="padding: 8px 0; color: #1a1a1a; font-weight: 500;">{{browser}}</td>
                                    </tr>
                                </table>
                            </div>

                            <!-- Was This You? -->
                            <div style="text-align: center; margin: 30px 0; padding: 20px; background-color: #f8f9fa; border-radius: 8px;">
                                <p style="margin: 0 0 15px 0; font-size: 18px; font-weight: 600; color: #1a1a1a;">
                                    Was this you?
                                </p>
                                <p style="margin: 0; font-size: 14px; color: #6b7280;">
                                    ✅ Yes - You can ignore this email
                                </p>
                            </div>

                            <!-- Warning Box -->
                            <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; border-radius: 0 8px 8px 0; padding: 20px; margin: 20px 0;">
                                <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: 600; color: #991b1b;">
                                    🚨 If this wasn't you
                                </p>
                                <p style="margin: 0 0 15px 0; font-size: 14px; color: #991b1b; line-height: 1.6;">
                                    Someone may have accessed your account. Take action immediately:
                                </p>
                                <table width="100%" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td align="center">
                                            <a href="{{security_url}}" style="display: inline-block; padding: 12px 24px; background-color: #dc2626; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 600;">
                                                🛡️ Secure Your Account
                                            </a>
                                        </td>
                                    </tr>
                                </table>
                            </div>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 30px 40px; border-top: 1px solid #e5e7eb;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center">
                                        <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #1a1a1a;">
                                            {{company_name}}
                                        </p>
                                        <p style="margin: 0; font-size: 11px; color: #9ca3af;">
                                            © {{current_year}} {{company_name}}. All rights reserved.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>''',
                'text_content': '''🔔 New Device Login Detected

Hello {{user_name}},

We noticed a login to your {{company_name}} account from a new device.

Login Details:
- Time: {{login_time}}
- IP Address: {{ip_address}}
- Location: {{location}}
- Device: {{device}}
- Browser: {{browser}}

Was this you?
✅ Yes - You can ignore this email

If this wasn't you, someone may have accessed your account. Secure your account: {{security_url}}

{{company_name}} Team''',
                'available_variables': ['user_name', 'login_time', 'ip_address', 'location', 'device', 'browser', 'os', 'security_url'],
            },

            # ============================================
            # SUSPICIOUS LOGIN
            # ============================================
            'suspicious_login': {
                'name': 'Suspicious Login Activity',
                'subject': '🚨 Suspicious Login Activity - {{company_name}}',
                'html_content': '''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Suspicious Login Activity</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); max-width: 600px; overflow: hidden;">
                    <!-- Header - Red Alert -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 40px 40px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
                                🚨 Suspicious Login Activity Detected
                            </h1>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 40px 20px 40px;">
                            <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #dc2626; font-weight: 500;">
                                Hello {{user_name}},
                            </p>

                            <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                                We detected suspicious login activity on your {{company_name}} account.
                            </p>

                            <!-- Alert Box -->
                            <div style="background-color: #fef2f2; border: 2px solid #dc2626; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
                                <p style="margin: 0; font-size: 48px; font-weight: bold; color: #dc2626;">
                                    {{failed_attempts}}
                                </p>
                                <p style="margin: 5px 0 0 0; font-size: 14px; color: #991b1b; font-weight: 600;">
                                    Failed Login Attempts
                                </p>
                            </div>

                            <!-- Attempt Details Box -->
                            <div style="background-color: #f8f9fa; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
                                <p style="margin: 0 0 15px 0; font-size: 14px; font-weight: 600; color: #1a1a1a;">
                                    📍 Attempt Details
                                </p>
                                <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 14px;">
                                    <tr>
                                        <td style="padding: 8px 0; color: #6b7280; width: 140px;">🕒 Time:</td>
                                        <td style="padding: 8px 0; color: #1a1a1a; font-weight: 500;">{{attempt_time}}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #6b7280;">🌐 IP Address:</td>
                                        <td style="padding: 8px 0; color: #1a1a1a; font-weight: 500;">{{ip_address}}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #6b7280;">📍 Location:</td>
                                        <td style="padding: 8px 0; color: #1a1a1a; font-weight: 500;">{{location}}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #6b7280;">💻 Device:</td>
                                        <td style="padding: 8px 0; color: #1a1a1a; font-weight: 500;">{{device}}</td>
                                    </tr>
                                </table>
                            </div>

                            <!-- If This Was You -->
                            <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 0 8px 8px 0; padding: 20px; margin: 20px 0;">
                                <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: 600; color: #1e40af;">
                                    💡 If this was you
                                </p>
                                <p style="margin: 0; font-size: 14px; color: #1e40af; line-height: 1.6;">
                                    You may have entered your password incorrectly multiple times. Try logging in again or reset your password.
                                </p>
                            </div>

                            <!-- If This Wasn't You -->
                            <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; border-radius: 0 8px 8px 0; padding: 20px; margin: 20px 0;">
                                <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: 600; color: #991b1b;">
                                    🚨 If this wasn't you
                                </p>
                                <p style="margin: 0 0 15px 0; font-size: 14px; color: #991b1b; line-height: 1.6;">
                                    Someone may be trying to access your account. Take action immediately:
                                </p>
                                <table width="100%" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td align="center">
                                            <a href="{{security_url}}" style="display: inline-block; padding: 12px 24px; background-color: #dc2626; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 600;">
                                                🛡️ Secure Your Account Now
                                            </a>
                                        </td>
                                    </tr>
                                </table>
                            </div>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 30px 40px; border-top: 1px solid #e5e7eb;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center">
                                        <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #1a1a1a;">
                                            {{company_name}}
                                        </p>
                                        <p style="margin: 0; font-size: 11px; color: #9ca3af;">
                                            © {{current_year}} {{company_name}}. All rights reserved.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>''',
                'text_content': '''🚨 Suspicious Login Activity Detected

Hello {{user_name}},

We detected suspicious login activity on your {{company_name}} account.

{{failed_attempts}} Failed Login Attempts

Attempt Details:
- Time: {{attempt_time}}
- IP Address: {{ip_address}}
- Location: {{location}}
- Device: {{device}}

If this was you: You may have entered your password incorrectly. Try logging in again or reset your password.

If this wasn't you: Someone may be trying to access your account. Secure your account: {{security_url}}

{{company_name}} Team''',
                'available_variables': ['user_name', 'failed_attempts', 'attempt_time', 'ip_address', 'location', 'device', 'browser', 'security_url'],
            },

            # ============================================
            # ACCOUNT LOCKED
            # ============================================
            'account_locked': {
                'name': 'Account Locked Notification',
                'subject': '🔒 Account Locked - {{company_name}}',
                'html_content': '''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Account Locked</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); max-width: 600px; overflow: hidden;">
                    <!-- Header - Red/Orange Alert -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #dc2626 0%, #ea580c 100%); padding: 40px 40px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
                                🔒 Account Temporarily Locked
                            </h1>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 40px 20px 40px;">
                            <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #dc2626; font-weight: 500;">
                                Hello {{user_name}},
                            </p>

                            <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                                Your {{company_name}} account has been <strong style="color: #dc2626;">temporarily locked</strong> due to multiple failed login attempts.
                            </p>

                            <!-- Lock Info Box -->
                            <div style="background-color: #fef2f2; border: 2px solid #dc2626; border-radius: 8px; padding: 25px; margin: 20px 0; text-align: center;">
                                <p style="margin: 0 0 10px 0; font-size: 36px; font-weight: bold; color: #dc2626;">
                                    {{failed_attempts}}
                                </p>
                                <p style="margin: 0 0 15px 0; font-size: 14px; color: #991b1b; font-weight: 600;">
                                    Failed Login Attempts
                                </p>
                                <div style="background-color: #ffffff; border-radius: 6px; padding: 15px; margin-top: 15px;">
                                    <p style="margin: 0; font-size: 14px; color: #6b7280;">
                                        Account will unlock at
                                    </p>
                                    <p style="margin: 5px 0 0 0; font-size: 20px; font-weight: 600; color: #059669;">
                                        {{unlock_time}}
                                    </p>
                                    <p style="margin: 5px 0 0 0; font-size: 12px; color: #9ca3af;">
                                        (in {{lockout_minutes}} minutes)
                                    </p>
                                </div>
                            </div>

                            <!-- What To Do -->
                            <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 0 8px 8px 0; padding: 20px; margin: 20px 0;">
                                <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: 600; color: #1e40af;">
                                    💡 What to do
                                </p>
                                <ul style="margin: 0 0 15px 0; padding-left: 20px; color: #1e40af; font-size: 14px; line-height: 1.8;">
                                    <li>Wait {{lockout_minutes}} minutes and try again</li>
                                    <li>Make sure you're using the correct password</li>
                                    <li>If you forgot your password, reset it below</li>
                                </ul>
                                <table width="100%" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td align="center">
                                            <a href="{{reset_url}}" style="display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 600;">
                                                🔑 Reset Password
                                            </a>
                                        </td>
                                    </tr>
                                </table>
                            </div>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 30px 40px; border-top: 1px solid #e5e7eb;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center">
                                        <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #1a1a1a;">
                                            {{company_name}}
                                        </p>
                                        <p style="margin: 0; font-size: 11px; color: #9ca3af;">
                                            © {{current_year}} {{company_name}}. All rights reserved.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>''',
                'text_content': '''🔒 Account Temporarily Locked

Hello {{user_name}},

Your {{company_name}} account has been temporarily locked due to {{failed_attempts}} failed login attempts.

Account will unlock in {{lockout_minutes}} minutes.

What to do:
- Wait {{lockout_minutes}} minutes and try again
- Make sure you're using the correct password
- If you forgot your password, reset it: {{reset_url}}

{{company_name}} Team''',
                'available_variables': ['user_name', 'failed_attempts', 'unlock_time', 'lockout_minutes', 'ip_address', 'location', 'device', 'reset_url'],
            },

            # ============================================
            # REPORT READY
            # ============================================
            'report_ready': {
                'name': 'Report Ready Notification',
                'subject': '📊 Your Report is Ready - {{report_name}}',
                'html_content': '''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Report is Ready</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); max-width: 600px; overflow: hidden;">
                    <!-- Header - Green Success -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 40px 40px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">
                                📊 Your Report is Ready!
                            </h1>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 40px 20px 40px;">
                            <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #059669; font-weight: 500;">
                                Hello {{user_name}}! 👋
                            </p>

                            <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                                Great news! Your report is now ready for viewing and download.
                            </p>

                            <!-- Report Card -->
                            <div style="background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%); border: 2px solid #10b981; border-radius: 12px; padding: 25px; margin: 25px 0; text-align: center;">
                                <div style="font-size: 48px; margin-bottom: 15px;">📊</div>
                                <h2 style="margin: 0 0 10px 0; font-size: 22px; color: #065f46; font-weight: 600;">
                                    {{report_name}}
                                </h2>
                                <p style="margin: 0 0 15px 0; font-size: 14px; color: #047857; line-height: 1.6;">{{report_description}}</p>
                                <p style="margin: 0; font-size: 12px; color: #6b7280;">
                                    Generated on {{generated_time}}
                                </p>
                            </div>

                            <!-- View Report Button -->
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" style="padding: 20px 0;">
                                        <a href="{{report_url}}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);">
                                            📥 View & Download Report
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <!-- Info Box -->
                            <div style="background-color: #f8f9fa; border-left: 4px solid {{primary_color}}; border-radius: 0 8px 8px 0; padding: 20px; margin: 20px 0;">
                                <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: 600; color: #1a1a1a;">
                                    💡 What you can do:
                                </p>
                                <ul style="margin: 0; padding-left: 20px; color: #4a4a4a; font-size: 14px; line-height: 1.8;">
                                    <li>View the report online</li>
                                    <li>Download in various formats (PDF, Excel)</li>
                                    <li>Share with your team members</li>
                                    <li>Request updates if needed</li>
                                </ul>
                            </div>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 30px 40px; border-top: 1px solid #e5e7eb;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center">
                                        <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #1a1a1a;">
                                            {{company_name}}
                                        </p>
                                        <p style="margin: 0; font-size: 11px; color: #9ca3af;">
                                            © {{current_year}} {{company_name}}. All rights reserved.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>''',
                'text_content': '''📊 Your Report is Ready!

Hello {{user_name}},

Great news! Your report is now ready for viewing and download.

Report: {{report_name}}
Description: {{report_description}}
Generated: {{generated_time}}

View your report: {{report_url}}

What you can do:
- View the report online
- Download in various formats (PDF, Excel)
- Share with your team members
- Request updates if needed

{{company_name}} Team''',
                'available_variables': ['user_name', 'report_name', 'report_description', 'report_url', 'generated_time'],
            },

            # ============================================
            # SYSTEM ANNOUNCEMENTS
            # ============================================
            'announcement_info': {
                'name': 'System Announcement (Info)',
                'subject': 'ℹ️ {{announcement_title}} - {{company_name}}',
                'html_content': '''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{announcement_title}}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); max-width: 600px; overflow: hidden;">
                    <!-- Header - Blue Info -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 40px 40px; text-align: center;">
                            <div style="font-size: 48px; margin-bottom: 15px;">ℹ️</div>
                            <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 600;">
                                {{announcement_title}}
                            </h1>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 40px 20px 40px;">
                            <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #1e40af; font-weight: 500;">
                                Hello {{user_name}},
                            </p>

                            <!-- Announcement Box -->
                            <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 0 8px 8px 0; padding: 25px; margin: 20px 0;">
                                <div style="font-size: 16px; line-height: 1.8; color: #4a4a4a;">
                                    {{announcement_content}}
                                </div>
                            </div>

                            <p style="margin: 20px 0 0 0; font-size: 12px; color: #9ca3af; text-align: center;">
                                Announcement Date: {{announcement_date}}
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 30px 40px; border-top: 1px solid #e5e7eb;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center">
                                        <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #1a1a1a;">
                                            {{company_name}}
                                        </p>
                                        <p style="margin: 0; font-size: 11px; color: #9ca3af;">
                                            © {{current_year}} {{company_name}}. All rights reserved.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>''',
                'text_content': '''ℹ️ {{announcement_title}}

Hello {{user_name}},

{{announcement_content}}

Date: {{announcement_date}}

{{company_name}} Team''',
                'available_variables': ['user_name', 'announcement_title', 'announcement_content', 'announcement_date', 'action_url', 'action_text'],
            },

            'announcement_warning': {
                'name': 'System Announcement (Warning)',
                'subject': '⚠️ {{announcement_title}} - {{company_name}}',
                'html_content': '''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{announcement_title}}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); max-width: 600px; overflow: hidden;">
                    <!-- Header - Yellow/Orange Warning -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 40px 40px; text-align: center;">
                            <div style="font-size: 48px; margin-bottom: 15px;">⚠️</div>
                            <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 600;">
                                {{announcement_title}}
                            </h1>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 40px 20px 40px;">
                            <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #92400e; font-weight: 500;">
                                Hello {{user_name}},
                            </p>

                            <!-- Announcement Box -->
                            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 0 8px 8px 0; padding: 25px; margin: 20px 0;">
                                <div style="font-size: 16px; line-height: 1.8; color: #4a4a4a;">
                                    {{announcement_content}}
                                </div>
                            </div>

                            <p style="margin: 20px 0 0 0; font-size: 12px; color: #9ca3af; text-align: center;">
                                Announcement Date: {{announcement_date}}
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 30px 40px; border-top: 1px solid #e5e7eb;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center">
                                        <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #1a1a1a;">
                                            {{company_name}}
                                        </p>
                                        <p style="margin: 0; font-size: 11px; color: #9ca3af;">
                                            © {{current_year}} {{company_name}}. All rights reserved.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>''',
                'text_content': '''⚠️ {{announcement_title}}

Hello {{user_name}},

{{announcement_content}}

Date: {{announcement_date}}

{{company_name}} Team''',
                'available_variables': ['user_name', 'announcement_title', 'announcement_content', 'announcement_date', 'action_url', 'action_text'],
            },

            'announcement_success': {
                'name': 'System Announcement (Success)',
                'subject': '✅ {{announcement_title}} - {{company_name}}',
                'html_content': '''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{announcement_title}}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); max-width: 600px; overflow: hidden;">
                    <!-- Header - Green Success -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 40px 40px; text-align: center;">
                            <div style="font-size: 48px; margin-bottom: 15px;">✅</div>
                            <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 600;">
                                {{announcement_title}}
                            </h1>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 40px 20px 40px;">
                            <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #065f46; font-weight: 500;">
                                Hello {{user_name}},
                            </p>

                            <!-- Announcement Box -->
                            <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; border-radius: 0 8px 8px 0; padding: 25px; margin: 20px 0;">
                                <div style="font-size: 16px; line-height: 1.8; color: #4a4a4a;">
                                    {{announcement_content}}
                                </div>
                            </div>

                            <p style="margin: 20px 0 0 0; font-size: 12px; color: #9ca3af; text-align: center;">
                                Announcement Date: {{announcement_date}}
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 30px 40px; border-top: 1px solid #e5e7eb;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center">
                                        <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #1a1a1a;">
                                            {{company_name}}
                                        </p>
                                        <p style="margin: 0; font-size: 11px; color: #9ca3af;">
                                            © {{current_year}} {{company_name}}. All rights reserved.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>''',
                'text_content': '''✅ {{announcement_title}}

Hello {{user_name}},

{{announcement_content}}

Date: {{announcement_date}}

{{company_name}} Team''',
                'available_variables': ['user_name', 'announcement_title', 'announcement_content', 'announcement_date', 'action_url', 'action_text'],
            },

            'announcement_urgent': {
                'name': 'System Announcement (Urgent)',
                'subject': '🚨 {{announcement_title}} - {{company_name}}',
                'html_content': '''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{announcement_title}}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); max-width: 600px; overflow: hidden;">
                    <!-- Header - Red Urgent -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 40px 40px; text-align: center;">
                            <div style="font-size: 48px; margin-bottom: 15px;">🚨</div>
                            <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 600;">
                                {{announcement_title}}
                            </h1>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 40px 20px 40px;">
                            <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #991b1b; font-weight: 500;">
                                Hello {{user_name}},
                            </p>

                            <!-- Announcement Box -->
                            <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; border-radius: 0 8px 8px 0; padding: 25px; margin: 20px 0;">
                                <div style="font-size: 16px; line-height: 1.8; color: #4a4a4a;">
                                    {{announcement_content}}
                                </div>
                            </div>

                            <p style="margin: 20px 0 0 0; font-size: 12px; color: #9ca3af; text-align: center;">
                                Announcement Date: {{announcement_date}}
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 30px 40px; border-top: 1px solid #e5e7eb;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center">
                                        <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #1a1a1a;">
                                            {{company_name}}
                                        </p>
                                        <p style="margin: 0; font-size: 11px; color: #9ca3af;">
                                            © {{current_year}} {{company_name}}. All rights reserved.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>''',
                'text_content': '''🚨 {{announcement_title}}

Hello {{user_name}},

{{announcement_content}}

Date: {{announcement_date}}

{{company_name}} Team''',
                'available_variables': ['user_name', 'announcement_title', 'announcement_content', 'announcement_date', 'action_url', 'action_text'],
            },
        }
