# accounts/email_notifications.py
# Centralized email notification functions for security and account events

import datetime
import hashlib
from django.conf import settings
from django.utils import timezone


def get_location_from_ip(ip_address):
    """
    Get location information from IP address using free API.
    Returns dict with city, region, country, or 'Unknown' values on failure.
    """
    import requests
    
    # Skip for localhost/private IPs
    if ip_address in ['127.0.0.1', 'localhost', '::1'] or ip_address.startswith('192.168.') or ip_address.startswith('10.'):
        return {
            'city': 'Local Network',
            'region': '',
            'country': '',
            'display': 'Local Network'
        }
    
    try:
        # Using ip-api.com (free, no API key needed, 45 requests/minute)
        response = requests.get(f'http://ip-api.com/json/{ip_address}', timeout=5)
        if response.status_code == 200:
            data = response.json()
            if data.get('status') == 'success':
                city = data.get('city', 'Unknown')
                region = data.get('regionName', '')
                country = data.get('country', 'Unknown')
                
                # Build display string
                parts = [p for p in [city, region, country] if p]
                display = ', '.join(parts) if parts else 'Unknown Location'
                
                return {
                    'city': city,
                    'region': region,
                    'country': country,
                    'display': display
                }
    except Exception as e:
        print(f"Failed to get location from IP: {e}")
    
    return {
        'city': 'Unknown',
        'region': '',
        'country': '',
        'display': 'Unknown Location'
    }


def parse_user_agent(user_agent):
    """
    Parse user agent string to extract browser and OS information.
    Returns dict with browser, os, and device info.
    """
    if not user_agent:
        return {
            'browser': 'Unknown Browser',
            'os': 'Unknown OS',
            'device': 'Unknown Device'
        }
    
    user_agent_lower = user_agent.lower()
    
    # Detect browser
    if 'edg/' in user_agent_lower or 'edge' in user_agent_lower:
        browser = 'Microsoft Edge'
    elif 'chrome' in user_agent_lower and 'chromium' not in user_agent_lower:
        browser = 'Google Chrome'
    elif 'firefox' in user_agent_lower:
        browser = 'Mozilla Firefox'
    elif 'safari' in user_agent_lower and 'chrome' not in user_agent_lower:
        browser = 'Apple Safari'
    elif 'opera' in user_agent_lower or 'opr/' in user_agent_lower:
        browser = 'Opera'
    elif 'msie' in user_agent_lower or 'trident' in user_agent_lower:
        browser = 'Internet Explorer'
    else:
        browser = 'Unknown Browser'
    
    # Detect OS
    if 'windows nt 10' in user_agent_lower:
        os_name = 'Windows 10/11'
    elif 'windows nt 6.3' in user_agent_lower:
        os_name = 'Windows 8.1'
    elif 'windows nt 6.2' in user_agent_lower:
        os_name = 'Windows 8'
    elif 'windows nt 6.1' in user_agent_lower:
        os_name = 'Windows 7'
    elif 'windows' in user_agent_lower:
        os_name = 'Windows'
    elif 'mac os x' in user_agent_lower:
        os_name = 'macOS'
    elif 'linux' in user_agent_lower and 'android' not in user_agent_lower:
        os_name = 'Linux'
    elif 'android' in user_agent_lower:
        os_name = 'Android'
    elif 'iphone' in user_agent_lower:
        os_name = 'iOS (iPhone)'
    elif 'ipad' in user_agent_lower:
        os_name = 'iOS (iPad)'
    elif 'ios' in user_agent_lower:
        os_name = 'iOS'
    else:
        os_name = 'Unknown OS'
    
    # Detect device type
    if 'mobile' in user_agent_lower or 'android' in user_agent_lower and 'tablet' not in user_agent_lower:
        if 'iphone' in user_agent_lower:
            device = 'iPhone'
        elif 'android' in user_agent_lower:
            device = 'Android Phone'
        else:
            device = 'Mobile Device'
    elif 'tablet' in user_agent_lower or 'ipad' in user_agent_lower:
        if 'ipad' in user_agent_lower:
            device = 'iPad'
        else:
            device = 'Tablet'
    else:
        device = 'Desktop/Laptop'
    
    return {
        'browser': browser,
        'os': os_name,
        'device': device
    }


def get_device_fingerprint(user_agent, ip_address):
    """
    Generate a simple device fingerprint for detecting new devices.
    """
    # Create a hash based on browser + OS (not IP, as that changes)
    device_info = parse_user_agent(user_agent)
    fingerprint_string = f"{device_info['browser']}|{device_info['os']}|{device_info['device']}"
    return hashlib.md5(fingerprint_string.encode()).hexdigest()[:16]


def send_email_with_ssl_fix(to_email, subject, text_message, html_message=None):
    """
    Helper function to send email with SSL certificate verification disabled.
    """
    import ssl
    import smtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart
    
    try:
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE
        
        if html_message:
            msg = MIMEMultipart('alternative')
            msg.attach(MIMEText(text_message, 'plain'))
            msg.attach(MIMEText(html_message, 'html'))
        else:
            msg = MIMEMultipart()
            msg.attach(MIMEText(text_message, 'plain'))
        
        msg['Subject'] = subject
        msg['From'] = settings.DEFAULT_FROM_EMAIL
        msg['To'] = to_email
        
        with smtplib.SMTP(settings.EMAIL_HOST, settings.EMAIL_PORT) as server:
            server.starttls(context=ssl_context)
            server.login(settings.EMAIL_HOST_USER, settings.EMAIL_HOST_PASSWORD)
            server.sendmail(settings.EMAIL_HOST_USER, [to_email], msg.as_string())
        
        return True, None
    except Exception as e:
        return False, str(e)


def send_welcome_email(user, ip_address=None, user_agent=None):
    """
    Send welcome email after user completes account setup (password + 2FA).
    Includes role-specific instructions and platform overview.
    
    Args:
        user: The user object
        ip_address: Optional IP address (for logging purposes)
        user_agent: Optional user agent string (for logging purposes)
    """
    from .email_models import EmailBranding
    
    try:
        branding = EmailBranding.get_branding()
        current_year = datetime.datetime.now().year
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
        
        # Role-specific content
        role_content = {
            'CLIENT': {
                'title': 'Client',
                'features': [
                    'View and download your reports',
                    'Track data collection progress',
                    'Communicate with our team via chat',
                    'Receive notifications on important updates',
                ],
                'dashboard_url': f'{frontend_url}/client-dashboard',
            },
            'DATA_COLLECTOR': {
                'title': 'Data Collector',
                'features': [
                    'Access assigned data collection tasks',
                    'Submit and manage company records',
                    'Track your collection progress',
                    'Communicate with project managers',
                ],
                'dashboard_url': f'{frontend_url}/staff-dashboard',
            },
            'STAFF_ADMIN': {
                'title': 'Staff Admin',
                'features': [
                    'Manage users and permissions',
                    'Create and manage reports',
                    'Monitor data collection activities',
                    'Access analytics and insights',
                    'Configure system settings',
                ],
                'dashboard_url': f'{frontend_url}/staff-dashboard',
            },
            'SUPERADMIN': {
                'title': 'Super Admin',
                'features': [
                    'Full platform administration',
                    'Manage all users and roles',
                    'Configure security settings',
                    'Access all reports and analytics',
                    'System configuration and maintenance',
                ],
                'dashboard_url': f'{frontend_url}/staff-dashboard',
            },
            'GUEST': {
                'title': 'Guest',
                'features': [
                    'View shared reports',
                    'Access limited platform features',
                ],
                'dashboard_url': f'{frontend_url}/guest-dashboard',
            },
        }
        
        role_info = role_content.get(user.role, role_content['GUEST'])
        profile_url = f'{frontend_url}/settings/profile'
        security_url = f'{frontend_url}/settings/security'
        
        # Build features HTML list
        features_html = ''.join([f'<li>{feature}</li>' for feature in role_info['features']])
        
        subject = f'Welcome to {branding.company_name}! 🎉'
        
        # Plain text version
        text_message = f"""
Welcome to {branding.company_name}, {user.first_name or user.username}!

Your account setup is complete. You now have full access to the platform as a {role_info['title']}.

What you can do:
{chr(10).join(['• ' + f for f in role_info['features']])}

Quick Actions:
- Go to your dashboard: {role_info['dashboard_url']}
- Complete your profile: {profile_url}
- Review security settings: {security_url}

Tips to get started:
1. Complete your profile with accurate information
2. Explore your dashboard to familiarize yourself with the platform
3. Keep your contact information up to date
4. Check notifications regularly for important updates

Need help? Our support team is here for you. Just reply to this email or use the chat feature in the platform.

Welcome aboard!

Best regards,
{branding.company_name} Team
        """

        # HTML version
        html_message = f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to {branding.company_name}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); max-width: 600px; overflow: hidden;">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, {branding.primary_color} 0%, #7c3aed 100%); padding: 40px 40px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 600;">
                                🎉 Welcome to {branding.company_name}!
                            </h1>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 40px 20px 40px;">
                            <p style="margin: 0 0 20px 0; font-size: 18px; line-height: 1.6; color: {branding.primary_color}; font-weight: 500;">
                                Hello {user.first_name or user.username}! 👋
                            </p>

                            <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                                Your account setup is complete. You now have full access to the platform as a <strong>{role_info['title']}</strong>.
                            </p>

                            <!-- Go to Dashboard Button -->
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" style="padding: 20px 0;">
                                        <a href="{role_info['dashboard_url']}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, {branding.primary_color} 0%, #7c3aed 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(124, 58, 237, 0.4);">
                                            🚀 Go to Your Dashboard
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <!-- What You Can Do -->
                            <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin: 20px 0;">
                                <p style="margin: 0 0 15px 0; font-size: 16px; font-weight: 600; color: #166534;">
                                    ✨ What you can do as a {role_info['title']}:
                                </p>
                                <ul style="margin: 0; padding-left: 20px; color: #166534; font-size: 14px; line-height: 2;">
                                    {features_html}
                                </ul>
                            </div>

                            <!-- Action Required: Complete Profile -->
                            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 0 8px 8px 0; padding: 20px; margin: 20px 0;">
                                <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: 600; color: #92400e;">
                                    📝 Action Required: Complete Your Profile
                                </p>
                                <p style="margin: 0 0 15px 0; font-size: 14px; color: #92400e; line-height: 1.6;">
                                    Keep your profile up-to-date so we can serve you better and keep you informed about important updates.
                                </p>
                                <a href="{profile_url}" style="display: inline-block; padding: 10px 20px; background-color: #f59e0b; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 600;">
                                    Complete Profile →
                                </a>
                            </div>

                            <!-- Getting Started Tips -->
                            <div style="background-color: #f8f9fa; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
                                <p style="margin: 0 0 15px 0; font-size: 14px; font-weight: 600; color: #1a1a1a;">
                                    💡 Tips to get started:
                                </p>
                                <ol style="margin: 0; padding-left: 20px; color: #4a4a4a; font-size: 14px; line-height: 2;">
                                    <li>Complete your profile with accurate information</li>
                                    <li>Explore your dashboard to familiarize yourself</li>
                                    <li>Keep your contact information up to date</li>
                                    <li>Check notifications regularly for important updates</li>
                                </ol>
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

                            <p style="margin: 30px 0 0 0; font-size: 14px; line-height: 1.6; color: #6b7280;">
                                Need help? Our support team is here for you. Just use the chat feature in the platform or reply to this email.
                            </p>
                        </td>
                    </tr>

                    <!-- Signature -->
                    <tr>
                        <td style="padding: 20px 40px 30px 40px;">
                            <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #4a4a4a;">
                                Welcome aboard! 🚀<br>
                                <strong style="color: {branding.primary_color};">{branding.company_name} Team</strong>
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
                                            {branding.company_name}
                                        </p>
                                        <p style="margin: 0 0 15px 0; font-size: 12px; color: #6b7280;">
                                            Professional Data Collection & Site Management
                                        </p>
                                        <p style="margin: 0; font-size: 11px; color: #9ca3af;">
                                            © {current_year} {branding.company_name}. All rights reserved.
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
</html>
        """

        print(f"📧 Sending welcome email to {user.email}...")
        success, error = send_email_with_ssl_fix(user.email, subject, text_message, html_message)
        
        if success:
            print(f"✅ Welcome email sent successfully to {user.email}")
        else:
            print(f"❌ Failed to send welcome email: {error}")
        
        return success, error
        
    except Exception as e:
        print(f"❌ Failed to send welcome email: {e}")
        return False, str(e)


def send_2fa_disabled_email(user, ip_address, user_agent):
    """
    Send security notification when user disables 2FA.
    """
    from .email_models import EmailBranding
    
    try:
        branding = EmailBranding.get_branding()
        current_year = datetime.datetime.now().year
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
        security_url = f'{frontend_url}/settings/security'
        
        # Get location and device info
        location_info = get_location_from_ip(ip_address)
        device_info = parse_user_agent(user_agent)
        change_time = timezone.now()
        formatted_time = change_time.strftime('%B %d, %Y at %I:%M %p UTC')
        
        subject = f'⚠️ Two-Factor Authentication Disabled - {branding.company_name}'
        
        # Plain text version
        text_message = f"""
Hello {user.first_name or user.username},

Two-Factor Authentication has been DISABLED on your {branding.company_name} account.

Change Details:
- Time: {formatted_time}
- IP Address: {ip_address}
- Location: {location_info['display']}
- Device: {device_info['device']}
- Browser: {device_info['browser']}
- Operating System: {device_info['os']}

⚠️ IMPORTANT: Your account is now less secure.

Without 2FA, anyone with your password can access your account. We strongly recommend keeping 2FA enabled.

If you made this change, you can ignore this email.

If you did NOT make this change:
1. Re-enable 2FA immediately: {security_url}
2. Change your password
3. Contact our support team

Best regards,
{branding.company_name} Team
        """

        # HTML version
        html_message = f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>2FA Disabled - Security Alert</title>
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
                                Hello {user.first_name or user.username},
                            </p>

                            <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                                Two-Factor Authentication has been <strong style="color: #dc2626;">DISABLED</strong> on your {branding.company_name} account.
                            </p>

                            <!-- Security Details Box -->
                            <div style="background-color: #f8f9fa; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
                                <p style="margin: 0 0 15px 0; font-size: 14px; font-weight: 600; color: #1a1a1a;">
                                    🔓 Change Details
                                </p>
                                <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 14px;">
                                    <tr>
                                        <td style="padding: 8px 0; color: #6b7280; width: 140px;">🕒 Time:</td>
                                        <td style="padding: 8px 0; color: #1a1a1a; font-weight: 500;">{formatted_time}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #6b7280;">🌐 IP Address:</td>
                                        <td style="padding: 8px 0; color: #1a1a1a; font-weight: 500;">{ip_address}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #6b7280;">📍 Location:</td>
                                        <td style="padding: 8px 0; color: #1a1a1a; font-weight: 500;">{location_info['display']}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #6b7280;">💻 Device:</td>
                                        <td style="padding: 8px 0; color: #1a1a1a; font-weight: 500;">{device_info['device']}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #6b7280;">🌐 Browser:</td>
                                        <td style="padding: 8px 0; color: #1a1a1a; font-weight: 500;">{device_info['browser']}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #6b7280;">🖥️ Operating System:</td>
                                        <td style="padding: 8px 0; color: #1a1a1a; font-weight: 500;">{device_info['os']}</td>
                                    </tr>
                                </table>
                            </div>

                            <!-- Warning Box -->
                            <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; border-radius: 0 8px 8px 0; padding: 20px; margin: 20px 0;">
                                <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: 600; color: #991b1b;">
                                    ⚠️ Your account is now less secure
                                </p>
                                <p style="margin: 0 0 15px 0; font-size: 14px; color: #991b1b; line-height: 1.6;">
                                    Without Two-Factor Authentication, anyone with your password can access your account. We strongly recommend keeping 2FA enabled for maximum security.
                                </p>
                                
                                <!-- Re-enable 2FA Button -->
                                <table width="100%" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td align="center">
                                            <a href="{security_url}" style="display: inline-block; padding: 12px 24px; background-color: #059669; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 600;">
                                                🔒 Re-enable Two-Factor Authentication
                                            </a>
                                        </td>
                                    </tr>
                                </table>
                            </div>

                            <!-- Didn't Do This -->
                            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 0 8px 8px 0; padding: 20px; margin: 20px 0;">
                                <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: 600; color: #92400e;">
                                    🚨 Didn't make this change?
                                </p>
                                <p style="margin: 0 0 10px 0; font-size: 14px; color: #92400e; line-height: 1.6;">
                                    If you did NOT disable 2FA, your account may be compromised:
                                </p>
                                <ul style="margin: 0; padding-left: 20px; color: #92400e; font-size: 14px; line-height: 1.8;">
                                    <li>Re-enable 2FA immediately</li>
                                    <li>Change your password</li>
                                    <li>Review recent account activity</li>
                                    <li>Contact our support team</li>
                                </ul>
                            </div>
                        </td>
                    </tr>

                    <!-- Signature -->
                    <tr>
                        <td style="padding: 20px 40px 30px 40px;">
                            <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #4a4a4a;">
                                Stay secure,<br>
                                <strong style="color: {branding.primary_color};">{branding.company_name} Team</strong>
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
                                            {branding.company_name}
                                        </p>
                                        <p style="margin: 0; font-size: 11px; color: #9ca3af;">
                                            © {current_year} {branding.company_name}. All rights reserved.
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
</html>
        """

        print(f"📧 Sending 2FA disabled notification to {user.email}...")
        success, error = send_email_with_ssl_fix(user.email, subject, text_message, html_message)
        
        if success:
            print(f"✅ 2FA disabled notification sent to {user.email}")
        else:
            print(f"❌ Failed to send 2FA disabled notification: {error}")
        
        return success, error
        
    except Exception as e:
        print(f"❌ Failed to send 2FA disabled notification: {e}")
        return False, str(e)


def send_new_device_login_email(user, ip_address, user_agent):
    """
    Send notification when user logs in from a new/different device.
    """
    from .email_models import EmailBranding
    
    try:
        branding = EmailBranding.get_branding()
        current_year = datetime.datetime.now().year
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
        security_url = f'{frontend_url}/settings/security'
        
        # Get location and device info
        location_info = get_location_from_ip(ip_address)
        device_info = parse_user_agent(user_agent)
        login_time = timezone.now()
        formatted_time = login_time.strftime('%B %d, %Y at %I:%M %p UTC')
        
        subject = f'🔔 New Device Login - {branding.company_name}'
        
        # Plain text version
        text_message = f"""
Hello {user.first_name or user.username},

We noticed a login to your {branding.company_name} account from a new device.

Login Details:
- Time: {formatted_time}
- IP Address: {ip_address}
- Location: {location_info['display']}
- Device: {device_info['device']}
- Browser: {device_info['browser']}
- Operating System: {device_info['os']}

Was this you?

If YES: Great! You can ignore this email.

If NO: Someone may have accessed your account. Please:
1. Change your password immediately
2. Enable Two-Factor Authentication
3. Review your account activity
4. Contact our support team

Secure your account: {security_url}

Best regards,
{branding.company_name} Team
        """

        # HTML version
        html_message = f"""
<!DOCTYPE html>
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
                                Hello {user.first_name or user.username},
                            </p>

                            <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                                We noticed a login to your {branding.company_name} account from a new device.
                            </p>

                            <!-- Login Details Box -->
                            <div style="background-color: #f8f9fa; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
                                <p style="margin: 0 0 15px 0; font-size: 14px; font-weight: 600; color: #1a1a1a;">
                                    🖥️ Login Details
                                </p>
                                <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 14px;">
                                    <tr>
                                        <td style="padding: 8px 0; color: #6b7280; width: 140px;">🕒 Time:</td>
                                        <td style="padding: 8px 0; color: #1a1a1a; font-weight: 500;">{formatted_time}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #6b7280;">🌐 IP Address:</td>
                                        <td style="padding: 8px 0; color: #1a1a1a; font-weight: 500;">{ip_address}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #6b7280;">📍 Location:</td>
                                        <td style="padding: 8px 0; color: #1a1a1a; font-weight: 500;">{location_info['display']}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #6b7280;">💻 Device:</td>
                                        <td style="padding: 8px 0; color: #1a1a1a; font-weight: 500;">{device_info['device']}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #6b7280;">🌐 Browser:</td>
                                        <td style="padding: 8px 0; color: #1a1a1a; font-weight: 500;">{device_info['browser']}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #6b7280;">🖥️ Operating System:</td>
                                        <td style="padding: 8px 0; color: #1a1a1a; font-weight: 500;">{device_info['os']}</td>
                                    </tr>
                                </table>
                            </div>

                            <!-- Was This You? Section -->
                            <div style="text-align: center; margin: 30px 0; padding: 20px; background-color: #f8f9fa; border-radius: 8px;">
                                <p style="margin: 0 0 15px 0; font-size: 18px; font-weight: 600; color: #1a1a1a;">
                                    Was this you?
                                </p>
                                
                                <table width="100%" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td align="center" style="padding: 5px;">
                                            <span style="display: inline-block; padding: 12px 30px; background-color: #e5e7eb; color: #374151; border-radius: 6px; font-size: 14px;">
                                                ✅ Yes - You can ignore this email
                                            </span>
                                        </td>
                                    </tr>
                                </table>
                            </div>

                            <!-- Warning Box -->
                            <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; border-radius: 0 8px 8px 0; padding: 20px; margin: 20px 0;">
                                <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: 600; color: #991b1b;">
                                    🚨 If this wasn't you
                                </p>
                                <p style="margin: 0 0 15px 0; font-size: 14px; color: #991b1b; line-height: 1.6;">
                                    Someone may have accessed your account. Take action immediately:
                                </p>
                                <ul style="margin: 0 0 20px 0; padding-left: 20px; color: #991b1b; font-size: 14px; line-height: 1.8;">
                                    <li>Change your password immediately</li>
                                    <li>Enable Two-Factor Authentication</li>
                                    <li>Review your account activity</li>
                                    <li>Contact our support team</li>
                                </ul>
                                
                                <!-- Secure Account Button -->
                                <table width="100%" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td align="center">
                                            <a href="{security_url}" style="display: inline-block; padding: 12px 24px; background-color: #dc2626; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 600;">
                                                🛡️ Secure Your Account
                                            </a>
                                        </td>
                                    </tr>
                                </table>
                            </div>
                        </td>
                    </tr>

                    <!-- Signature -->
                    <tr>
                        <td style="padding: 20px 40px 30px 40px;">
                            <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #4a4a4a;">
                                Stay secure,<br>
                                <strong style="color: {branding.primary_color};">{branding.company_name} Team</strong>
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
                                            {branding.company_name}
                                        </p>
                                        <p style="margin: 0; font-size: 11px; color: #9ca3af;">
                                            © {current_year} {branding.company_name}. All rights reserved.
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
</html>
        """

        print(f"📧 Sending new device login notification to {user.email}...")
        success, error = send_email_with_ssl_fix(user.email, subject, text_message, html_message)
        
        if success:
            print(f"✅ New device login notification sent to {user.email}")
        else:
            print(f"❌ Failed to send new device login notification: {error}")
        
        return success, error
        
    except Exception as e:
        print(f"❌ Failed to send new device login notification: {e}")
        return False, str(e)


def send_suspicious_login_email(user, ip_address, user_agent, failed_attempts):
    """
    Send notification when multiple failed login attempts are detected.
    Only sent after threshold (e.g., 3+ failed attempts).
    """
    from .email_models import EmailBranding
    
    try:
        branding = EmailBranding.get_branding()
        current_year = datetime.datetime.now().year
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
        security_url = f'{frontend_url}/settings/security'
        
        # Get location and device info
        location_info = get_location_from_ip(ip_address)
        device_info = parse_user_agent(user_agent)
        attempt_time = timezone.now()
        formatted_time = attempt_time.strftime('%B %d, %Y at %I:%M %p UTC')
        
        subject = f'🚨 Suspicious Login Activity - {branding.company_name}'
        
        # Plain text version
        text_message = f"""
Hello {user.first_name or user.username},

We detected suspicious login activity on your {branding.company_name} account.

{failed_attempts} failed login attempts were made from:
- Time: {formatted_time}
- IP Address: {ip_address}
- Location: {location_info['display']}
- Device: {device_info['device']}
- Browser: {device_info['browser']}

If this was you:
You may have entered your password incorrectly. Try again or reset your password.

If this wasn't you:
Someone may be trying to access your account. We recommend:
1. Changing your password immediately
2. Enabling Two-Factor Authentication
3. Reviewing your account activity

Secure your account: {security_url}

Best regards,
{branding.company_name} Team
        """

        # HTML version
        html_message = f"""
<!DOCTYPE html>
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
                                Hello {user.first_name or user.username},
                            </p>

                            <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                                We detected suspicious login activity on your {branding.company_name} account.
                            </p>

                            <!-- Alert Box -->
                            <div style="background-color: #fef2f2; border: 2px solid #dc2626; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
                                <p style="margin: 0; font-size: 48px; font-weight: bold; color: #dc2626;">
                                    {failed_attempts}
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
                                        <td style="padding: 8px 0; color: #1a1a1a; font-weight: 500;">{formatted_time}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #6b7280;">🌐 IP Address:</td>
                                        <td style="padding: 8px 0; color: #1a1a1a; font-weight: 500;">{ip_address}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #6b7280;">📍 Location:</td>
                                        <td style="padding: 8px 0; color: #1a1a1a; font-weight: 500;">{location_info['display']}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #6b7280;">💻 Device:</td>
                                        <td style="padding: 8px 0; color: #1a1a1a; font-weight: 500;">{device_info['device']}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #6b7280;">🌐 Browser:</td>
                                        <td style="padding: 8px 0; color: #1a1a1a; font-weight: 500;">{device_info['browser']}</td>
                                    </tr>
                                </table>
                            </div>

                            <!-- If This Was You -->
                            <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 0 8px 8px 0; padding: 20px; margin: 20px 0;">
                                <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: 600; color: #1e40af;">
                                    💡 If this was you
                                </p>
                                <p style="margin: 0; font-size: 14px; color: #1e40af; line-height: 1.6;">
                                    You may have entered your password incorrectly multiple times. Try logging in again or reset your password if you've forgotten it.
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
                                <ul style="margin: 0 0 20px 0; padding-left: 20px; color: #991b1b; font-size: 14px; line-height: 1.8;">
                                    <li>Change your password immediately</li>
                                    <li>Enable Two-Factor Authentication</li>
                                    <li>Review your account activity</li>
                                </ul>
                                
                                <!-- Secure Account Button -->
                                <table width="100%" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td align="center">
                                            <a href="{security_url}" style="display: inline-block; padding: 12px 24px; background-color: #dc2626; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 600;">
                                                🛡️ Secure Your Account Now
                                            </a>
                                        </td>
                                    </tr>
                                </table>
                            </div>
                        </td>
                    </tr>

                    <!-- Signature -->
                    <tr>
                        <td style="padding: 20px 40px 30px 40px;">
                            <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #4a4a4a;">
                                Stay secure,<br>
                                <strong style="color: {branding.primary_color};">{branding.company_name} Team</strong>
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
                                            {branding.company_name}
                                        </p>
                                        <p style="margin: 0; font-size: 11px; color: #9ca3af;">
                                            © {current_year} {branding.company_name}. All rights reserved.
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
</html>
        """

        print(f"📧 Sending suspicious login notification to {user.email}...")
        success, error = send_email_with_ssl_fix(user.email, subject, text_message, html_message)
        
        if success:
            print(f"✅ Suspicious login notification sent to {user.email}")
        else:
            print(f"❌ Failed to send suspicious login notification: {error}")
        
        return success, error
        
    except Exception as e:
        print(f"❌ Failed to send suspicious login notification: {e}")
        return False, str(e)


def is_new_device(user, user_agent):
    """
    Check if this is a new device for the user based on device fingerprint.
    Returns True if new device, False if known device.
    """
    from .security_models import UserSession
    
    # Get device fingerprint
    device_info = parse_user_agent(user_agent)
    device_signature = f"{device_info['browser']}|{device_info['os']}"
    
    # Check if we've seen this device before
    existing_sessions = UserSession.objects.filter(user=user)
    
    for session in existing_sessions:
        existing_signature = f"{session.browser}|{session.os}"
        if existing_signature == device_signature:
            return False  # Known device
    
    return True  # New device


def send_account_locked_email(user, ip_address, user_agent, failed_attempts, lockout_minutes):
    """
    Send notification when user's account is locked due to too many failed login attempts.
    """
    from .email_models import EmailBranding
    
    try:
        branding = EmailBranding.get_branding()
        current_year = datetime.datetime.now().year
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
        reset_url = f'{frontend_url}/forgot-password'
        security_url = f'{frontend_url}/settings/security'
        
        # Get location and device info
        location_info = get_location_from_ip(ip_address)
        device_info = parse_user_agent(user_agent)
        lock_time = timezone.now()
        formatted_time = lock_time.strftime('%B %d, %Y at %I:%M %p UTC')
        unlock_time = lock_time + datetime.timedelta(minutes=lockout_minutes)
        formatted_unlock_time = unlock_time.strftime('%I:%M %p UTC')
        
        subject = f'🔒 Account Locked - {branding.company_name}'
        
        # Plain text version
        text_message = f"""
Hello {user.first_name or user.username},

Your {branding.company_name} account has been temporarily LOCKED due to {failed_attempts} failed login attempts.

Lock Details:
- Time: {formatted_time}
- Unlock Time: {formatted_unlock_time} (in {lockout_minutes} minutes)
- IP Address: {ip_address}
- Location: {location_info['display']}
- Device: {device_info['device']}
- Browser: {device_info['browser']}

What to do:
1. Wait {lockout_minutes} minutes and try again
2. If you forgot your password, reset it here: {reset_url}

If this wasn't you:
Someone may be trying to access your account. We recommend:
1. Reset your password immediately
2. Enable Two-Factor Authentication
3. Review your account activity

Secure your account: {security_url}

Best regards,
{branding.company_name} Team
        """

        # HTML version
        html_message = f"""
<!DOCTYPE html>
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
                                Hello {user.first_name or user.username},
                            </p>

                            <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                                Your {branding.company_name} account has been <strong style="color: #dc2626;">temporarily locked</strong> due to multiple failed login attempts.
                            </p>

                            <!-- Lock Info Box -->
                            <div style="background-color: #fef2f2; border: 2px solid #dc2626; border-radius: 8px; padding: 25px; margin: 20px 0; text-align: center;">
                                <p style="margin: 0 0 10px 0; font-size: 36px; font-weight: bold; color: #dc2626;">
                                    {failed_attempts}
                                </p>
                                <p style="margin: 0 0 15px 0; font-size: 14px; color: #991b1b; font-weight: 600;">
                                    Failed Login Attempts
                                </p>
                                <div style="background-color: #ffffff; border-radius: 6px; padding: 15px; margin-top: 15px;">
                                    <p style="margin: 0; font-size: 14px; color: #6b7280;">
                                        Account will unlock at
                                    </p>
                                    <p style="margin: 5px 0 0 0; font-size: 20px; font-weight: 600; color: #059669;">
                                        {formatted_unlock_time}
                                    </p>
                                    <p style="margin: 5px 0 0 0; font-size: 12px; color: #9ca3af;">
                                        (in {lockout_minutes} minutes)
                                    </p>
                                </div>
                            </div>

                            <!-- Attempt Details Box -->
                            <div style="background-color: #f8f9fa; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
                                <p style="margin: 0 0 15px 0; font-size: 14px; font-weight: 600; color: #1a1a1a;">
                                    📍 Attempt Details
                                </p>
                                <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 14px;">
                                    <tr>
                                        <td style="padding: 8px 0; color: #6b7280; width: 140px;">🕒 Time:</td>
                                        <td style="padding: 8px 0; color: #1a1a1a; font-weight: 500;">{formatted_time}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #6b7280;">🌐 IP Address:</td>
                                        <td style="padding: 8px 0; color: #1a1a1a; font-weight: 500;">{ip_address}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #6b7280;">📍 Location:</td>
                                        <td style="padding: 8px 0; color: #1a1a1a; font-weight: 500;">{location_info['display']}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #6b7280;">💻 Device:</td>
                                        <td style="padding: 8px 0; color: #1a1a1a; font-weight: 500;">{device_info['device']}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #6b7280;">🌐 Browser:</td>
                                        <td style="padding: 8px 0; color: #1a1a1a; font-weight: 500;">{device_info['browser']}</td>
                                    </tr>
                                </table>
                            </div>

                            <!-- What To Do -->
                            <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 0 8px 8px 0; padding: 20px; margin: 20px 0;">
                                <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: 600; color: #1e40af;">
                                    💡 What to do
                                </p>
                                <ul style="margin: 0 0 15px 0; padding-left: 20px; color: #1e40af; font-size: 14px; line-height: 1.8;">
                                    <li>Wait {lockout_minutes} minutes and try again</li>
                                    <li>Make sure you're using the correct password</li>
                                    <li>If you forgot your password, reset it below</li>
                                </ul>
                                <table width="100%" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td align="center">
                                            <a href="{reset_url}" style="display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 600;">
                                                🔑 Reset Password
                                            </a>
                                        </td>
                                    </tr>
                                </table>
                            </div>

                            <!-- If This Wasn't You -->
                            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 0 8px 8px 0; padding: 20px; margin: 20px 0;">
                                <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: 600; color: #92400e;">
                                    🚨 If this wasn't you
                                </p>
                                <p style="margin: 0 0 15px 0; font-size: 14px; color: #92400e; line-height: 1.6;">
                                    Someone may be trying to access your account. Once unlocked:
                                </p>
                                <ul style="margin: 0 0 15px 0; padding-left: 20px; color: #92400e; font-size: 14px; line-height: 1.8;">
                                    <li>Change your password immediately</li>
                                    <li>Enable Two-Factor Authentication</li>
                                    <li>Review your account activity</li>
                                </ul>
                                <table width="100%" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td align="center">
                                            <a href="{security_url}" style="display: inline-block; padding: 12px 24px; background-color: #f59e0b; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 600;">
                                                🛡️ Secure Your Account
                                            </a>
                                        </td>
                                    </tr>
                                </table>
                            </div>
                        </td>
                    </tr>

                    <!-- Signature -->
                    <tr>
                        <td style="padding: 20px 40px 30px 40px;">
                            <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #4a4a4a;">
                                Stay secure,<br>
                                <strong style="color: {branding.primary_color};">{branding.company_name} Team</strong>
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
                                            {branding.company_name}
                                        </p>
                                        <p style="margin: 0; font-size: 11px; color: #9ca3af;">
                                            © {current_year} {branding.company_name}. All rights reserved.
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
</html>
        """

        print(f"📧 Sending account locked notification to {user.email}...")
        success, error = send_email_with_ssl_fix(user.email, subject, text_message, html_message)
        
        if success:
            print(f"✅ Account locked notification sent to {user.email}")
        else:
            print(f"❌ Failed to send account locked notification: {error}")
        
        return success, error
        
    except Exception as e:
        print(f"❌ Failed to send account locked notification: {e}")
        return False, str(e)


def send_report_ready_email(user, report_name, report_url=None, report_description=None):
    """
    Send notification when a report is ready for viewing/download.
    """
    from .email_models import EmailBranding
    
    try:
        branding = EmailBranding.get_branding()
        current_year = datetime.datetime.now().year
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
        
        if not report_url:
            report_url = f'{frontend_url}/reports'
        
        ready_time = timezone.now()
        formatted_time = ready_time.strftime('%B %d, %Y at %I:%M %p UTC')
        
        subject = f'📊 Your Report is Ready - {report_name}'
        
        # Plain text version
        text_message = f"""
Hello {user.first_name or user.username},

Great news! Your report "{report_name}" is now ready.

Report Details:
- Report Name: {report_name}
- Generated: {formatted_time}
{f'- Description: {report_description}' if report_description else ''}

View your report here: {report_url}

Best regards,
{branding.company_name} Team
        """

        # HTML version
        html_message = f"""
<!DOCTYPE html>
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
                                Hello {user.first_name or user.username}! 👋
                            </p>

                            <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                                Great news! Your report is now ready for viewing and download.
                            </p>

                            <!-- Report Card -->
                            <div style="background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%); border: 2px solid #10b981; border-radius: 12px; padding: 25px; margin: 25px 0; text-align: center;">
                                <div style="font-size: 48px; margin-bottom: 15px;">📊</div>
                                <h2 style="margin: 0 0 10px 0; font-size: 22px; color: #065f46; font-weight: 600;">
                                    {report_name}
                                </h2>
                                {f'<p style="margin: 0 0 15px 0; font-size: 14px; color: #047857; line-height: 1.6;">{report_description}</p>' if report_description else ''}
                                <p style="margin: 0; font-size: 12px; color: #6b7280;">
                                    Generated on {formatted_time}
                                </p>
                            </div>

                            <!-- View Report Button -->
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" style="padding: 20px 0;">
                                        <a href="{report_url}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);">
                                            📥 View & Download Report
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <!-- Info Box -->
                            <div style="background-color: #f8f9fa; border-left: 4px solid {branding.primary_color}; border-radius: 0 8px 8px 0; padding: 20px; margin: 20px 0;">
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

                            <p style="margin: 20px 0 0 0; font-size: 14px; line-height: 1.6; color: #6b7280;">
                                If you have any questions about this report, please don't hesitate to reach out to our team through the platform's chat feature.
                            </p>
                        </td>
                    </tr>

                    <!-- Signature -->
                    <tr>
                        <td style="padding: 20px 40px 30px 40px;">
                            <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #4a4a4a;">
                                Best regards,<br>
                                <strong style="color: {branding.primary_color};">{branding.company_name} Team</strong>
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
                                            {branding.company_name}
                                        </p>
                                        <p style="margin: 0 0 15px 0; font-size: 12px; color: #6b7280;">
                                            Professional Data Collection & Site Management
                                        </p>
                                        <p style="margin: 0; font-size: 11px; color: #9ca3af;">
                                            © {current_year} {branding.company_name}. All rights reserved.
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
</html>
        """

        print(f"📧 Sending report ready notification to {user.email}...")
        success, error = send_email_with_ssl_fix(user.email, subject, text_message, html_message)
        
        if success:
            print(f"✅ Report ready notification sent to {user.email}")
        else:
            print(f"❌ Failed to send report ready notification: {error}")
        
        return success, error
        
    except Exception as e:
        print(f"❌ Failed to send report ready notification: {e}")
        return False, str(e)


def send_2fa_enabled_email(user, ip_address=None, user_agent=None):
    """
    Send confirmation email when user successfully enables 2FA.
    """
    from .email_models import EmailBranding
    
    try:
        branding = EmailBranding.get_branding()
        current_year = datetime.datetime.now().year
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
        security_url = f'{frontend_url}/settings/security'
        
        # Get location and device info if provided
        location_display = 'Unknown Location'
        device_display = 'Unknown Device'
        browser_display = 'Unknown Browser'
        os_display = 'Unknown OS'
        
        if ip_address:
            location_info = get_location_from_ip(ip_address)
            location_display = location_info['display']
        
        if user_agent:
            device_info = parse_user_agent(user_agent)
            device_display = device_info['device']
            browser_display = device_info['browser']
            os_display = device_info['os']
        
        enabled_time = timezone.now()
        formatted_time = enabled_time.strftime('%B %d, %Y at %I:%M %p UTC')
        
        subject = f'✅ Two-Factor Authentication Enabled - {branding.company_name}'
        
        # Plain text version
        text_message = f"""
Hello {user.first_name or user.username},

Great news! Two-Factor Authentication has been successfully ENABLED on your {branding.company_name} account.

Your account is now more secure. Each time you log in, you'll need to enter a verification code sent to your email.

Setup Details:
- Time: {formatted_time}
- Device: {device_display}
- Browser: {browser_display}
- Location: {location_display}

IMPORTANT: Save Your Backup Codes!
Backup codes allow you to access your account if you can't receive verification emails. Keep them somewhere safe.

Manage your security settings: {security_url}

Best regards,
{branding.company_name} Team
        """

        # HTML version
        html_message = f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>2FA Enabled Successfully</title>
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
                                ✅ Two-Factor Authentication Enabled!
                            </h1>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 40px 20px 40px;">
                            <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #059669; font-weight: 500;">
                                Hello {user.first_name or user.username}! 🎉
                            </p>

                            <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                                Great news! Two-Factor Authentication has been <strong style="color: #059669;">successfully enabled</strong> on your {branding.company_name} account.
                            </p>

                            <!-- Success Icon -->
                            <div style="text-align: center; margin: 30px 0;">
                                <div style="display: inline-block; width: 80px; height: 80px; background: linear-gradient(135deg, #059669 0%, #10b981 100%); border-radius: 50%; line-height: 80px;">
                                    <span style="color: white; font-size: 40px;">🔒</span>
                                </div>
                            </div>

                            <p style="margin: 0 0 30px 0; font-size: 16px; line-height: 1.6; color: #4a4a4a; text-align: center;">
                                Your account is now more secure!<br>
                                Each time you log in, you'll need to enter a verification code sent to your email.
                            </p>

                            <!-- Setup Details Box -->
                            <div style="background-color: #f8f9fa; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
                                <p style="margin: 0 0 15px 0; font-size: 14px; font-weight: 600; color: #1a1a1a;">
                                    🔧 Setup Details
                                </p>
                                <table width="100%" cellpadding="0" cellspacing="0" style="font-size: 14px;">
                                    <tr>
                                        <td style="padding: 8px 0; color: #6b7280; width: 140px;">🕒 Time:</td>
                                        <td style="padding: 8px 0; color: #1a1a1a; font-weight: 500;">{formatted_time}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #6b7280;">💻 Device:</td>
                                        <td style="padding: 8px 0; color: #1a1a1a; font-weight: 500;">{device_display}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #6b7280;">🌐 Browser:</td>
                                        <td style="padding: 8px 0; color: #1a1a1a; font-weight: 500;">{browser_display}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #6b7280;">📍 Location:</td>
                                        <td style="padding: 8px 0; color: #1a1a1a; font-weight: 500;">{location_display}</td>
                                    </tr>
                                </table>
                            </div>

                            <!-- Important Notice - Backup Codes -->
                            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 0 8px 8px 0; padding: 20px; margin: 20px 0;">
                                <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: 600; color: #92400e;">
                                    ⚠️ Important: Save Your Backup Codes!
                                </p>
                                <p style="margin: 0 0 15px 0; font-size: 14px; color: #92400e; line-height: 1.6;">
                                    Backup codes allow you to access your account if you can't receive verification emails. Make sure you:
                                </p>
                                <ul style="margin: 0; padding-left: 20px; color: #92400e; font-size: 14px; line-height: 1.8;">
                                    <li>Save your backup codes in a secure location</li>
                                    <li>Don't share them with anyone</li>
                                    <li>Generate new codes if you run out</li>
                                </ul>
                            </div>

                            <!-- Security Tips -->
                            <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin: 20px 0;">
                                <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: 600; color: #166534;">
                                    🛡️ Security Benefits
                                </p>
                                <ul style="margin: 0; padding-left: 20px; color: #166534; font-size: 14px; line-height: 1.8;">
                                    <li>Protection against unauthorized access</li>
                                    <li>Extra security even if password is compromised</li>
                                    <li>Email verification on every login</li>
                                    <li>Backup codes for emergency access</li>
                                </ul>
                            </div>

                            <!-- Manage Security Button -->
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" style="padding: 20px 0;">
                                        <a href="{security_url}" style="display: inline-block; padding: 14px 35px; background: linear-gradient(135deg, {branding.primary_color} 0%, #7c3aed 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(124, 58, 237, 0.4);">
                                            🔧 Manage Security Settings
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <p style="margin: 20px 0 0 0; font-size: 14px; line-height: 1.6; color: #6b7280;">
                                If you didn't enable 2FA, please contact our support team immediately.
                            </p>
                        </td>
                    </tr>

                    <!-- Signature -->
                    <tr>
                        <td style="padding: 20px 40px 30px 40px;">
                            <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #4a4a4a;">
                                Stay secure,<br>
                                <strong style="color: {branding.primary_color};">{branding.company_name} Team</strong>
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
                                            {branding.company_name}
                                        </p>
                                        <p style="margin: 0 0 15px 0; font-size: 12px; color: #6b7280;">
                                            Professional Data Collection & Site Management
                                        </p>
                                        <p style="margin: 0; font-size: 11px; color: #9ca3af;">
                                            © {current_year} {branding.company_name}. All rights reserved.
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
</html>
        """

        print(f"📧 Sending 2FA enabled notification to {user.email}...")
        success, error = send_email_with_ssl_fix(user.email, subject, text_message, html_message)
        
        if success:
            print(f"✅ 2FA enabled notification sent to {user.email}")
        else:
            print(f"❌ Failed to send 2FA enabled notification: {error}")
        
        return success, error
        
    except Exception as e:
        print(f"❌ Failed to send 2FA enabled notification: {e}")
        return False, str(e)


def send_system_announcement_email(users, subject_text, announcement_title, announcement_body, 
                                    action_url=None, action_text=None, announcement_type='info'):
    """
    Send system announcement to multiple users.
    
    Parameters:
    - users: List of user objects or single user
    - subject_text: Email subject
    - announcement_title: Main title of the announcement
    - announcement_body: Body text of the announcement (can include HTML)
    - action_url: Optional URL for action button
    - action_text: Optional text for action button
    - announcement_type: 'info', 'warning', 'success', 'urgent'
    """
    from .email_models import EmailBranding
    
    # Ensure users is a list
    if not isinstance(users, (list, tuple)):
        users = [users]
    
    # Color schemes for different announcement types
    type_colors = {
        'info': {
            'gradient': 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            'icon': 'ℹ️',
            'bg': '#eff6ff',
            'border': '#3b82f6',
            'text': '#1e40af'
        },
        'warning': {
            'gradient': 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            'icon': '⚠️',
            'bg': '#fef3c7',
            'border': '#f59e0b',
            'text': '#92400e'
        },
        'success': {
            'gradient': 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
            'icon': '✅',
            'bg': '#f0fdf4',
            'border': '#10b981',
            'text': '#065f46'
        },
        'urgent': {
            'gradient': 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
            'icon': '🚨',
            'bg': '#fef2f2',
            'border': '#dc2626',
            'text': '#991b1b'
        }
    }
    
    colors = type_colors.get(announcement_type, type_colors['info'])
    
    try:
        branding = EmailBranding.get_branding()
        current_year = datetime.datetime.now().year
        announcement_time = timezone.now()
        formatted_time = announcement_time.strftime('%B %d, %Y')
        
        success_count = 0
        fail_count = 0
        
        for user in users:
            subject = f'{colors["icon"]} {subject_text} - {branding.company_name}'
            
            # Plain text version
            text_message = f"""
{announcement_title}

{announcement_body}

{f'Take action: {action_url}' if action_url else ''}

Date: {formatted_time}

Best regards,
{branding.company_name} Team
            """

            # Build action button HTML if provided
            action_button_html = ''
            if action_url and action_text:
                action_button_html = f'''
                <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                        <td align="center" style="padding: 25px 0;">
                            <a href="{action_url}" style="display: inline-block; padding: 14px 35px; background: {colors['gradient']}; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(0,0,0,0.2);">
                                {action_text}
                            </a>
                        </td>
                    </tr>
                </table>
                '''

            # HTML version
            html_message = f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{announcement_title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); max-width: 600px; overflow: hidden;">
                    <!-- Header -->
                    <tr>
                        <td style="background: {colors['gradient']}; padding: 40px 40px; text-align: center;">
                            <div style="font-size: 48px; margin-bottom: 15px;">{colors['icon']}</div>
                            <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 600;">
                                {announcement_title}
                            </h1>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 40px 20px 40px;">
                            <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: {colors['text']}; font-weight: 500;">
                                Hello {user.first_name or user.username},
                            </p>

                            <!-- Announcement Box -->
                            <div style="background-color: {colors['bg']}; border-left: 4px solid {colors['border']}; border-radius: 0 8px 8px 0; padding: 25px; margin: 20px 0;">
                                <div style="font-size: 16px; line-height: 1.8; color: #4a4a4a;">
                                    {announcement_body}
                                </div>
                            </div>

                            {action_button_html}

                            <p style="margin: 20px 0 0 0; font-size: 12px; color: #9ca3af; text-align: center;">
                                Announcement Date: {formatted_time}
                            </p>
                        </td>
                    </tr>

                    <!-- Signature -->
                    <tr>
                        <td style="padding: 20px 40px 30px 40px;">
                            <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #4a4a4a;">
                                Best regards,<br>
                                <strong style="color: {branding.primary_color};">{branding.company_name} Team</strong>
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
                                            {branding.company_name}
                                        </p>
                                        <p style="margin: 0 0 15px 0; font-size: 12px; color: #6b7280;">
                                            Professional Data Collection & Site Management
                                        </p>
                                        <p style="margin: 0; font-size: 11px; color: #9ca3af;">
                                            © {current_year} {branding.company_name}. All rights reserved.
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
</html>
            """

            success, error = send_email_with_ssl_fix(user.email, subject, text_message, html_message)
            
            if success:
                success_count += 1
                print(f"✅ Announcement sent to {user.email}")
            else:
                fail_count += 1
                print(f"❌ Failed to send to {user.email}: {error}")
        
        print(f"📧 System announcement complete: {success_count} sent, {fail_count} failed")
        return success_count, fail_count
        
    except Exception as e:
        print(f"❌ Failed to send system announcement: {e}")
        return 0, len(users)
