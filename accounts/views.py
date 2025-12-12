from .models import User, LoginHistory
from django.contrib.auth import authenticate, login as auth_login, logout as auth_logout
from django.views.decorators.csrf import ensure_csrf_cookie
from django.core.mail import send_mail
from django.conf import settings
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.contrib.auth.tokens import default_token_generator
from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny
from rest_framework.response import Response
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db.models import Count, Q
from .serializers import UserSerializer, UserManagementSerializer
from .pagination import CustomPagination
import json
import re
from datetime import timedelta
import datetime
from django_ratelimit.decorators import ratelimit
import pyotp
import qrcode
import io
import base64
from django.core.mail import EmailMultiAlternatives
import ssl
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart


User = get_user_model()


def send_email_with_ssl_fix(to_email, subject, text_message, html_message=None):
    """
    Helper function to send email with SSL certificate verification disabled.
    This fixes the SSL: CERTIFICATE_VERIFY_FAILED error in development.
    """
    try:
        # Create unverified SSL context for development
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

def broadcast_user_status(user_id, username, is_online):
    """
    Broadcast user online/offline status via WebSocket
    """
    try:
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync

        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            "user_status",
            {
                "type": "user_status_update",
                "user_id": user_id,
                "username": username,
                "is_online": is_online
            }
        )
        print(f"✅ Broadcasted status: User {username} is {'ONLINE' if is_online else 'OFFLINE'}")
    except Exception as e:
        print(f"⚠️ Failed to broadcast user status: {e}")


def generate_username_suggestions(first_name='', last_name='', email=''):
    """
    Generate username suggestions based on user info
    """
    suggestions = []

    # Extract email username part
    email_base = email.split('@')[0] if email else ''

    # Create base suggestions
    if first_name and last_name:
        base = f"{first_name.lower()}.{last_name.lower()}"
        suggestions.append(base)
        suggestions.append(f"{first_name.lower()}{last_name.lower()}")
        suggestions.append(f"{first_name[0].lower()}{last_name.lower()}")

    if email_base:
        suggestions.append(email_base.lower())

    if first_name:
        suggestions.append(first_name.lower())

    # Add numbers to make unique
    final_suggestions = []
    for base in suggestions[:3]:  # Take top 3 base suggestions
        # Clean the base (remove special characters)
        clean_base = re.sub(r'[^a-z0-9]', '', base)

        if not User.objects.filter(username=clean_base).exists():
            final_suggestions.append(clean_base)

        # Add variations with numbers
        for num in range(1, 100):
            username = f"{clean_base}{num}"
            if not User.objects.filter(username=username).exists():
                final_suggestions.append(username)
                if len(final_suggestions) >= 3:
                    break

        if len(final_suggestions) >= 3:
            break

    return final_suggestions[:3]


@api_view(['POST'])
@permission_classes([AllowAny])
def check_email_availability(request):
    """
    Check if email is available
    """
    email = request.data.get('email', '').strip().lower()
    user_id = request.data.get('user_id', None)  # For edit mode

    if not email:
        return Response({
            'available': False,
            'message': 'Email is required'
        }, status=status.HTTP_400_BAD_REQUEST)

    # Check if email exists (excluding current user if editing)
    query = User.objects.filter(email__iexact=email)
    if user_id:
        query = query.exclude(pk=user_id)

    is_available = not query.exists()

    response_data = {
        'available': is_available,
        'email': email,
    }

    if is_available:
        response_data['message'] = 'Email is available'
    else:
        response_data[
            'message'] = 'An account with this email already exists. Only one user can be registered per email address. Please use a different email or contact support if you need assistance.'

    return Response(response_data)


@api_view(['POST'])
@permission_classes([AllowAny])
def check_username_availability(request):
    """
    Check if username is available and suggest alternatives
    """
    username = request.data.get('username', '').strip().lower()
    first_name = request.data.get('first_name', '')
    last_name = request.data.get('last_name', '')
    email = request.data.get('email', '')

    if not username:
        return Response({
            'available': False,
            'message': 'Username is required'
        }, status=status.HTTP_400_BAD_REQUEST)

    # Check if username exists
    is_available = not User.objects.filter(username__iexact=username).exists()

    response_data = {
        'available': is_available,
        'username': username,
    }

    if is_available:
        response_data['message'] = 'Username is available'
    else:
        response_data['message'] = 'Someone already has that username. Try another?'
        # Generate suggestions
        suggestions = generate_username_suggestions(first_name, last_name, email)
        # Filter out the taken username
        suggestions = [s for s in suggestions if s != username.lower()]
        response_data['suggestions'] = suggestions

    return Response(response_data)


@api_view(['POST'])
@permission_classes([AllowAny])
def generate_username(request):
    """
    Generate username suggestions based on user info
    """
    first_name = request.data.get('first_name', '')
    last_name = request.data.get('last_name', '')
    email = request.data.get('email', '')

    suggestions = generate_username_suggestions(first_name, last_name, email)

    return Response({
        'suggestions': suggestions
    })


@api_view(['POST'])
@permission_classes([IsAdminUser])
def create_user_send_email(request):
    """
    Create user without password and send password creation link
    """
    serializer = UserManagementSerializer(data=request.data)

    if serializer.is_valid():
        # Create user without password
        user = serializer.save()
        # Password is already set as unusable in serializer.create()

        # Generate password reset token
        token = default_token_generator.make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))

        # Create password creation link
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
        password_link = f"{frontend_url}/create-password/{uid}/{token}/"

        # Send email
        subject = 'Welcome to A Data - Create Your Password'
        message = f"""
Hello {user.first_name or user.username},

Welcome to A Data! Your account has been created.

Please click the link below to create your password and complete your profile:

{password_link}

This link will expire in 24 hours.

Best regards,
A Data Team
        """

        success, error = send_email_with_ssl_fix(user.email, subject, message)
        
        if success:
            return Response({
                'success': True,
                'message': 'User created successfully. Password creation email sent.',
                'user': UserSerializer(user).data
            }, status=status.HTTP_201_CREATED)
        else:
            # If email fails, delete the user and return error
            user.delete()
            return Response({
                'success': False,
                'message': f'Failed to send email: {error}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def validate_password_token(request, uidb64, token):
    """
    Validate password creation token
    """
    try:
        uid = force_str(urlsafe_base64_decode(uidb64))
        user = User.objects.get(pk=uid)
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        return Response({
            'valid': False,
            'message': 'Invalid link'
        }, status=status.HTTP_400_BAD_REQUEST)

    if default_token_generator.check_token(user, token):
        return Response({
            'valid': True,
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'phone_number': user.phone_number,
                'company_name': user.company_name,
                'role': user.role,
            }
        })

    return Response({
        'valid': False,
        'message': 'Link has expired or is invalid'
    }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def create_password(request, uidb64, token):
    """
    Create password for new user
    """
    try:
        uid = force_str(urlsafe_base64_decode(uidb64))
        user = User.objects.get(pk=uid)
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        return Response({
            'success': False,
            'message': 'Invalid link'
        }, status=status.HTTP_400_BAD_REQUEST)

    if not default_token_generator.check_token(user, token):
        return Response({
            'success': False,
            'message': 'Link has expired or is invalid'
        }, status=status.HTTP_400_BAD_REQUEST)

    password = request.data.get('password')

    if not password:
        return Response({
            'success': False,
            'message': 'Password is required'
        }, status=status.HTTP_400_BAD_REQUEST)

    # Validate password strength
    if len(password) < 8:
        return Response({
            'success': False,
            'message': 'Password must be at least 8 characters'
        }, status=status.HTTP_400_BAD_REQUEST)

    if not re.search(r'[A-Z]', password):
        return Response({
            'success': False,
            'message': 'Password must contain at least one uppercase letter'
        }, status=status.HTTP_400_BAD_REQUEST)

    if not re.search(r'[a-z]', password):
        return Response({
            'success': False,
            'message': 'Password must contain at least one lowercase letter'
        }, status=status.HTTP_400_BAD_REQUEST)

    if not re.search(r'[0-9]', password):
        return Response({
            'success': False,
            'message': 'Password must contain at least one number'
        }, status=status.HTTP_400_BAD_REQUEST)

    # Set password
    user.set_password(password)
    user.save()

    return Response({
        'success': True,
        'message': 'Password created successfully',
        'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'role': user.role,
        }
    })


class UserViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows staff users to be viewed or edited.
    Supports filtering by role, searching, and ordering.
    """
    queryset = User.objects.all().order_by('-date_joined')
    permission_classes = [IsAdminUser]
    pagination_class = CustomPagination
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['role', 'is_active']
    search_fields = ['username', 'email', 'first_name', 'last_name', 'company_name']
    ordering_fields = [
        'username',
        'email',
        'first_name',
        'last_name',
        'company_name',
        'role',
        'is_active',
        'date_joined',
        'last_login'
    ]

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return UserManagementSerializer
        return UserSerializer


@api_view(['POST'])
@ensure_csrf_cookie
def login_view(request):
    """
    Login view with Email 2FA support, Remember Me, and real-time status updates
    """
    data = request.data
    username_or_email = data.get('username', '').strip()
    password = data.get('password', '')
    remember_me = data.get('remember_me', False)  # NEW: Get remember_me flag

    # Try to determine if input is email or username
    user = None

    # Add this variable to track user even if auth fails
    attempted_user = None

    if '@' in username_or_email:
        try:
            user_obj = User.objects.get(email__iexact=username_or_email)
            user = authenticate(request, username=user_obj.username, password=password)
        except User.DoesNotExist:
            user = None
    else:
        user = authenticate(request, username=username_or_email, password=password)
        # Try to get user object for failed login recording
        if user is None:
            try:
                attempted_user = User.objects.get(username__iexact=username_or_email)
            except User.DoesNotExist:
                pass

    if user is None and '@' not in username_or_email:
        try:
            user_obj = User.objects.get(email__iexact=username_or_email)
            user = authenticate(request, username=user_obj.username, password=password)
        except User.DoesNotExist:
            user = None

    if user is not None:
        # Check if 2FA is enabled
        if user.two_factor_enabled:
            # Generate and send code
            code = user.generate_2fa_code()

            subject = 'Your Login Verification Code'
            current_year = datetime.datetime.now().year

            # Plain text version (fallback)
            text_message = f"""
            Hello {user.first_name or user.username},

            Your verification code is: {code}

            This code will expire in 10 minutes.

            If you didn't try to log in, please secure your account immediately.

            Best regards,
            A Data Team
                        """

            # Professional HTML version
            html_message = f"""
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Your Login Verification Code</title>
            </head>
            <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
                <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
                    <tr>
                        <td align="center">
                            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); max-width: 600px;">
                                <!-- Header -->
                                <tr>
                                    <td style="padding: 40px 40px 30px 40px;">
                                        <h1 style="margin: 0; font-size: 28px; font-weight: 600; color: #1a1a1a; line-height: 1.3;">
                                            Your Login Verification Code
                                        </h1>
                                    </td>
                                </tr>

                                <!-- Content -->
                                <tr>
                                    <td style="padding: 0 40px 30px 40px;">
                                        <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                                            Hello {user.first_name or user.username},
                                        </p>

                                        <p style="margin: 0 0 30px 0; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                                            We received a login attempt for your A Data account. Use the verification code below to complete your login:
                                        </p>

                                        <!-- Verification Code Box -->
                                        <div style="background-color: #f8f9fa; border: 2px dashed #d1d5db; border-radius: 8px; padding: 24px; text-align: center; margin: 30px 0;">
                                            <div style="font-size: 36px; font-weight: bold; color: #1a1a1a; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                                                {code}
                                            </div>
                                        </div>

                                        <p style="margin: 30px 0 20px 0; font-size: 14px; line-height: 1.6; color: #6b7280;">
                                            This code will expire in <strong>10 minutes</strong>.
                                        </p>

                                        <p style="margin: 0 0 10px 0; font-size: 14px; line-height: 1.6; color: #6b7280;">
                                            If you didn't try to log in, please secure your account immediately or contact support.
                                        </p>
                                    </td>
                                </tr>

                                <!-- Footer -->
                                <tr>
                                    <td style="padding: 30px 40px 40px 40px; border-top: 1px solid #e5e7eb;">
                                        <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #9ca3af; text-align: center;">
                                            © {current_year} A Data. All rights reserved.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
                        """

            try:
                success, error = send_email_with_ssl_fix(user.email, subject, text_message, html_message)
                if not success:
                    return Response({
                        'error': f'Failed to send verification code: {error}'
                    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            except Exception as e:
                return Response({
                    'error': 'Failed to send verification code. Please try again.'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            # Don't login yet, require 2FA code
            return Response({
                'requires_2fa': True,
                'username': user.username,
                'email': user.email,
                'message': f'Verification code sent to {user.email}'
            })

        # Check if 2FA setup is required (first login)
        if user.is_2fa_setup_required:
            # Login but flag that 2FA setup is required
            auth_logout(request)
            auth_login(request, user)

            # NEW: Set session expiry based on remember_me
            if remember_me:
                # Remember for 30 days
                request.session.set_expiry(2592000)  # 30 days in seconds
            else:
                # Session expires when browser closes
                request.session.set_expiry(0)

            user.update_last_activity()

            # SET USER ONLINE
            user.is_online = True
            user.save(update_fields=['is_online'])

            # BROADCAST STATUS
            broadcast_user_status(user.id, user.username, True)

            user.record_login(
                ip_address=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT')
            )

            return Response({
                'requires_2fa_setup': True,
                'user': UserSerializer(user).data,
                'message': '2FA setup required'
            })

        # Regular login without 2FA
        auth_logout(request)
        auth_login(request, user)

        # NEW: Set session expiry based on remember_me
        if remember_me:
            # Remember for 30 days
            request.session.set_expiry(2592000)  # 30 days in seconds
        else:
            # Session expires when browser closes
            request.session.set_expiry(0)

        user.update_last_activity()

        # SET USER ONLINE
        user.is_online = True
        user.save(update_fields=['is_online'])

        # BROADCAST STATUS
        broadcast_user_status(user.id, user.username, True)

        user.record_login(
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT')
        )

        serializer = UserSerializer(user)

        return Response({
            'user': serializer.data,
            'message': 'Login successful'
        })
    else:
        # RECORD FAILED LOGIN ATTEMPT
        if attempted_user:
            LoginHistory.objects.create(
                user=attempted_user,
                ip_address=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT'),
                success=False
            )
        return Response({
            'error': 'Invalid credentials. Please check your username/email and password.'
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
def logout_view(request):
    """
    Logout view with real-time status updates
    """
    user = request.user

    if user.is_authenticated:
        # 🆕 SET USER OFFLINE
        user.is_online = False
        user.save(update_fields=['is_online'])

        # 🆕 BROADCAST STATUS
        broadcast_user_status(user.id, user.username, False)

    auth_logout(request)
    return Response({'message': 'Logged out successfully'})


@api_view(['POST'])
@ensure_csrf_cookie
def signup_view(request):
    serializer = UserManagementSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def user_profile_view(request):
    """
    Get or update current user's profile
    """
    if request.method == 'GET':
        request.user.update_last_activity()
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    elif request.method == 'PATCH':
        # Update user profile
        serializer = UserManagementSerializer(
            request.user,
            data=request.data,
            partial=True
        )
        if serializer.is_valid():
            serializer.save()
            return Response(UserSerializer(request.user).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@ensure_csrf_cookie
@permission_classes([AllowAny])
def csrf_view(request):
    """
    Return CSRF token for client
    """
    return Response({
        'detail': 'CSRF cookie set'
    })


@api_view(['POST'])
@ensure_csrf_cookie
@permission_classes([AllowAny])
def signup_with_verification(request):
    """
    Create user account and send email verification link
    User account will be inactive until email is verified
    """
    serializer = UserManagementSerializer(data=request.data)

    if serializer.is_valid():
        # Create user with inactive status
        user = serializer.save()
        user.is_active = False  # Set inactive until email verified
        user.save()

        # Generate email verification token
        token = default_token_generator.make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))

        # Create verification link
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
        verification_link = f"{frontend_url}/verify-email/{uid}/{token}/"

        # Send verification email
        subject = 'Verify Your Email - A Data'
        message = f"""
Hello {user.first_name or user.username},

Thank you for signing up for A Data!

Please verify your email address by clicking the link below:

{verification_link}

This link will expire in 24 hours.

If you didn't create an account, please ignore this email.

Best regards,
A Data Team
        """

        try:
            success, error = send_email_with_ssl_fix(user.email, subject, message)
            
            if success:
                return Response({
                    'success': True,
                    'message': 'Account created successfully. Please check your email to verify your account.',
                    'email': user.email
                }, status=status.HTTP_201_CREATED)
            else:
                # If email fails, delete the user
                user.delete()
                return Response({
                    'success': False,
                    'message': f'Failed to send verification email: {error}'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        except Exception as e:
            # If email fails, delete the user
            user.delete()
            return Response({
                'success': False,
                'message': f'Failed to send verification email: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def verify_email(request, uidb64, token):
    """
    Verify user's email and activate their account
    """
    try:
        uid = force_str(urlsafe_base64_decode(uidb64))
        user = User.objects.get(pk=uid)
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        return Response({
            'success': False,
            'message': 'Invalid verification link'
        }, status=status.HTTP_400_BAD_REQUEST)

    if user.is_active:
        return Response({
            'success': False,
            'message': 'This account is already verified'
        }, status=status.HTTP_400_BAD_REQUEST)

    if default_token_generator.check_token(user, token):
        user.is_active = True
        user.save()

        return Response({
            'success': True,
            'message': 'Email verified successfully! You can now log in.',
            'user': {
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
            }
        })

    return Response({
        'success': False,
        'message': 'Verification link has expired or is invalid'
    }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def resend_verification_email(request):
    """
    Resend verification email to user
    """
    email = request.data.get('email', '').strip().lower()

    if not email:
        return Response({
            'success': False,
            'message': 'Email is required'
        }, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.get(email__iexact=email)

        if user.is_active:
            return Response({
                'success': False,
                'message': 'This account is already verified'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Generate new token
        token = default_token_generator.make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))

        # Create verification link
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
        verification_link = f"{frontend_url}/verify-email/{uid}/{token}/"

        # Send email
        subject = 'Verify Your Email - A Data'
        message = f"""
Hello {user.first_name or user.username},

Here is your new email verification link:

{verification_link}

This link will expire in 24 hours.

Best regards,
A Data Team
        """

        success, error = send_email_with_ssl_fix(user.email, subject, message)
        
        if success:
            return Response({
                'success': True,
                'message': 'Verification email sent successfully'
            })
        else:
            return Response({
                'success': False,
                'message': f'Failed to send email: {error}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    except User.DoesNotExist:
        return Response({
            'success': False,
            'message': 'No account found with this email address'
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({
            'success': False,
            'message': f'Failed to send email: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def disable_2fa(request):
    """
    Disable 2FA for user (requires password confirmation)
    """
    user = request.user
    password = request.data.get('password', '')

    # Verify password
    if not user.check_password(password):
        return Response(
            {'success': False, 'message': 'Invalid password'},
            status=status.HTTP_400_BAD_REQUEST
        )

    user.two_factor_enabled = False
    user.clear_2fa_code()
    user.save()

    return Response({
        'success': True,
        'message': '2FA disabled successfully'
    })


@api_view(['POST'])
@ensure_csrf_cookie
def verify_2fa_login(request):
    """
    Verify 2FA code during login with Remember Me and real-time status updates
    """
    username = request.data.get('username', '')
    code = request.data.get('code', '')
    remember_me = request.data.get('remember_me', False)  # NEW: Get remember_me flag

    if not username or not code:
        return Response(
            {'success': False, 'message': 'Username and code are required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        # Find user
        if '@' in username:
            user = User.objects.get(email__iexact=username)
        else:
            user = User.objects.get(username__iexact=username)
    except User.DoesNotExist:
        return Response(
            {'success': False, 'message': 'Invalid credentials'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Verify code
    if user.verify_2fa_code(code):
        # Clear the code
        user.clear_2fa_code()

        # Login user
        auth_login(request, user)

        # NEW: Set session expiry based on remember_me
        if remember_me:
            # Remember for 30 days
            request.session.set_expiry(2592000)  # 30 days in seconds
        else:
            # Session expires when browser closes
            request.session.set_expiry(0)

        user.update_last_activity()

        # SET USER ONLINE
        user.is_online = True
        user.save(update_fields=['is_online'])

        # BROADCAST STATUS
        broadcast_user_status(user.id, user.username, True)

        user.record_login(
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT')
        )

        return Response({
            'success': True,
            'user': UserSerializer(user).data,
            'message': 'Login successful'
        })
    else:
        # RECORD FAILED 2FA ATTEMPT
        LoginHistory.objects.create(
            user=user,
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT'),
            success=False
        )
        return Response(
            {'success': False, 'message': 'Invalid or expired code'},
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    """
    Change user password
    """
    user = request.user
    current_password = request.data.get('current_password', '')
    new_password = request.data.get('new_password', '')

    # Verify current password
    if not user.check_password(current_password):
        return Response(
            {'success': False, 'message': 'Current password is incorrect'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Validate new password
    if len(new_password) < 8:
        return Response(
            {'success': False, 'message': 'Password must be at least 8 characters'},
            status=status.HTTP_400_BAD_REQUEST
        )

    if not re.search(r'[A-Z]', new_password):
        return Response(
            {'success': False, 'message': 'Password must contain at least one uppercase letter'},
            status=status.HTTP_400_BAD_REQUEST
        )

    if not re.search(r'[a-z]', new_password):
        return Response(
            {'success': False, 'message': 'Password must contain at least one lowercase letter'},
            status=status.HTTP_400_BAD_REQUEST
        )

    if not re.search(r'[0-9]', new_password):
        return Response(
            {'success': False, 'message': 'Password must contain at least one number'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Set new password
    user.set_password(new_password)
    user.save()

    return Response({
        'success': True,
        'message': 'Password changed successfully'
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def enable_email_2fa(request):
    """
    Enable email-based 2FA for user
    Sends a verification code to confirm
    """
    user = request.user

    # Generate and send verification code
    code = user.generate_2fa_code()

    # Send email
    subject = 'Enable Two-Factor Authentication'
    current_year = datetime.datetime.now().year

    # Plain text version (fallback)
    text_message = f"""
    Hello {user.first_name or user.username},

    You have requested to enable Two-Factor Authentication for your account.

    Your verification code is: {code}

    This code will expire in 10 minutes.

    If you didn't request this, please ignore this email.

    Best regards,
    A Data Team
        """

    # Professional HTML version
    html_message = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Enable Two-Factor Authentication</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
            <tr>
                <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); max-width: 600px;">
                        <!-- Header -->
                        <tr>
                            <td style="padding: 40px 40px 30px 40px;">
                                <h1 style="margin: 0; font-size: 28px; font-weight: 600; color: #1a1a1a; line-height: 1.3;">
                                    Enable Two-Factor Authentication
                                </h1>
                            </td>
                        </tr>

                        <!-- Content -->
                        <tr>
                            <td style="padding: 0 40px 30px 40px;">
                                <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                                    Hello {user.first_name or user.username},
                                </p>

                                <p style="margin: 0 0 30px 0; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                                    You have requested to enable Two-Factor Authentication for your A Data account. This adds an extra layer of security to protect your account.
                                </p>

                                <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                                    Use the verification code below to complete the setup:
                                </p>

                                <!-- Verification Code Box -->
                                <div style="background-color: #f8f9fa; border: 2px dashed #d1d5db; border-radius: 8px; padding: 24px; text-align: center; margin: 30px 0;">
                                    <div style="font-size: 36px; font-weight: bold; color: #1a1a1a; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                                        {code}
                                    </div>
                                </div>

                                <p style="margin: 30px 0 20px 0; font-size: 14px; line-height: 1.6; color: #6b7280;">
                                    This code will expire in <strong>10 minutes</strong>.
                                </p>

                                <p style="margin: 0 0 10px 0; font-size: 14px; line-height: 1.6; color: #6b7280;">
                                    If you didn't request this, you can safely ignore this email.
                                </p>
                            </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                            <td style="padding: 30px 40px 40px 40px; border-top: 1px solid #e5e7eb;">
                                <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #9ca3af; text-align: center;">
                                    © {current_year} A Data. All rights reserved.
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
        """

    try:
        success, error = send_email_with_ssl_fix(user.email, subject, text_message, html_message)
        
        if success:
            return Response({
                'success': True,
                'message': f'Verification code sent to {user.email}'
            })
        else:
            return Response({
                'success': False,
                'message': f'Failed to send email: {error}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    except Exception as e:
        return Response({
            'success': False,
            'message': f'Failed to send email: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def verify_enable_2fa(request):
    """
    Verify code and enable 2FA
    """
    user = request.user
    code = request.data.get('code', '')

    if not code:
        return Response(
            {'success': False, 'message': 'Verification code is required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Verify code
    if user.verify_2fa_code(code):
        user.two_factor_enabled = True
        user.is_2fa_setup_required = False
        user.clear_2fa_code()
        user.save()

        return Response({
            'success': True,
            'message': '2FA enabled successfully'
        })
    else:
        return Response(
            {'success': False, 'message': 'Invalid or expired code'},
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def send_2fa_code(request):
    """
    Send 2FA code to user's email during login
    """
    username = request.data.get('username', '')

    if not username:
        return Response(
            {'success': False, 'message': 'Username is required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        # Find user by username or email
        if '@' in username:
            user = User.objects.get(email__iexact=username)
        else:
            user = User.objects.get(username__iexact=username)
    except User.DoesNotExist:
        return Response(
            {'success': False, 'message': 'User not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    if not user.two_factor_enabled:
        return Response(
            {'success': False, 'message': '2FA is not enabled for this user'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Generate and send code
    code = user.generate_2fa_code()

    # Get current year for the email template
    current_year = datetime.datetime.now().year

    subject = 'Your Login Verification Code'
    current_year = datetime.datetime.now().year

    # Plain text version (fallback)
    text_message = f"""
    Hello {user.first_name or user.username},

    Your verification code is: {code}

    This code will expire in 10 minutes.

    If you didn't try to log in, please secure your account immediately.

    Best regards,
    A Data Team
        """

    # Professional HTML version
    html_message = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your Login Verification Code</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
            <tr>
                <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); max-width: 600px;">
                        <!-- Header -->
                        <tr>
                            <td style="padding: 40px 40px 30px 40px;">
                                <h1 style="margin: 0; font-size: 28px; font-weight: 600; color: #1a1a1a; line-height: 1.3;">
                                    Your Login Verification Code
                                </h1>
                            </td>
                        </tr>

                        <!-- Content -->
                        <tr>
                            <td style="padding: 0 40px 30px 40px;">
                                <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                                    Hello {user.first_name or user.username},
                                </p>

                                <p style="margin: 0 0 30px 0; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                                    Here is your verification code to complete your login to A Data:
                                </p>

                                <!-- Verification Code Box -->
                                <div style="background-color: #f8f9fa; border: 2px dashed #d1d5db; border-radius: 8px; padding: 24px; text-align: center; margin: 30px 0;">
                                    <div style="font-size: 36px; font-weight: bold; color: #1a1a1a; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                                        {code}
                                    </div>
                                </div>

                                <p style="margin: 30px 0 20px 0; font-size: 14px; line-height: 1.6; color: #6b7280;">
                                    This code is valid for <strong>10 minutes</strong>.
                                </p>

                                <p style="margin: 0 0 10px 0; font-size: 14px; line-height: 1.6; color: #6b7280;">
                                    If you did not request this code, please ignore this email and contact support if you have concerns about your account security.
                                </p>
                            </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                            <td style="padding: 30px 40px 40px 40px; border-top: 1px solid #e5e7eb;">
                                <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #9ca3af; text-align: center;">
                                    © {current_year} A Data. All rights reserved.
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
        """

    try:
        success, error = send_email_with_ssl_fix(user.email, subject, text_message, html_message)
        
        if success:
            return Response({
                'success': True,
                'message': f'Verification code sent to {user.email}',
                'email': user.email
            })
        else:
            return Response({
                'success': False,
                'message': f'Failed to send email: {error}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    except Exception as e:
        return Response({
            'success': False,
            'message': f'Failed to send email: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_admin_users(request):
    """
    Get list of admin users for clients to chat with
    Only returns basic info for SUPERADMIN and STAFF_ADMIN users
    """
    # Get all admin users
    admin_users = User.objects.filter(
        role__in=['SUPERADMIN', 'STAFF_ADMIN'],
        is_active=True
    ).order_by('first_name', 'username')

    # Return simplified user data
    users_data = [{
        'id': user.id,
        'username': user.username,
        'full_name': user.full_name or user.username,
        'email': user.email,
        'role': user.role
    } for user in admin_users]

    return Response(users_data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_activity_stats(request):
    """
    Get comprehensive user activity statistics
    """
    # Only staff can view activity stats
    if not request.user.is_staff:
        return Response({'error': 'Permission denied'}, status=403)

    now = timezone.now()
    thirty_days_ago = now - timedelta(days=30)
    seven_days_ago = now - timedelta(days=7)

    # Get most active users (by login count)
    most_active_users = User.objects.filter(
        is_active=True
    ).order_by('-login_count')[:10].values(
        'id',
        'username',
        'first_name',
        'last_name',
        'email',
        'role',
        'login_count',
        'last_login',
        'last_login_ip',
        #'initials'
    )

    # Add full_name and initials to each user
    for user in most_active_users:
        first_name = user['first_name'] or ''
        last_name = user['last_name'] or ''
        if first_name and last_name:
            user['full_name'] = f"{first_name} {last_name}"
            user['initials'] = f"{first_name[0]}{last_name[0]}".upper()
        elif first_name:
            user['full_name'] = first_name
            user['initials'] = first_name[0].upper()
        elif last_name:
            user['full_name'] = last_name
            user['initials'] = last_name[0].upper()
        else:
            user['full_name'] = user['username']
            user['initials'] = user['username'][0].upper() if user['username'] else '?'

    # Get login trends (last 30 days)
    login_history_30d = LoginHistory.objects.filter(
        login_time__gte=thirty_days_ago,
        success=True
    ).extra(select={'date': 'DATE(login_time)'}).values('date').annotate(
        count=Count('id')
    ).order_by('date')

    # Get login trends (last 7 days)
    login_history_7d = LoginHistory.objects.filter(
        login_time__gte=seven_days_ago,
        success=True
    ).extra(select={'date': 'DATE(login_time)'}).values('date').annotate(
        count=Count('id')
    ).order_by('date')

    # Get total stats
    total_users = User.objects.filter(is_active=True).count()
    total_logins_30d = LoginHistory.objects.filter(
        login_time__gte=thirty_days_ago,
        success=True
    ).count()

    total_logins_7d = LoginHistory.objects.filter(
        login_time__gte=seven_days_ago,
        success=True
    ).count()

    # Get unique active users in last 30 days
    active_users_30d = LoginHistory.objects.filter(
        login_time__gte=thirty_days_ago,
        success=True
    ).values('user').distinct().count()

    return Response({
        'most_active_users': list(most_active_users),
        'login_trends_30d': list(login_history_30d),
        'login_trends_7d': list(login_history_7d),
        'total_users': total_users,
        'total_logins_30d': total_logins_30d,
        'total_logins_7d': total_logins_7d,
        'active_users_30d': active_users_30d,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_login_history(request, user_id):
    """
    Get login history for a specific user
    """
    # Only staff or the user themselves can view login history
    if not request.user.is_staff and request.user.id != user_id:
        return Response({'error': 'Permission denied'}, status=403)

    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=404)

    # Get pagination parameters
    page = int(request.GET.get('page', 1))
    page_size = int(request.GET.get('page_size', 20))

    # Get login history
    login_history = LoginHistory.objects.filter(
        user=user
    ).order_by('-login_time')

    # Paginate
    start = (page - 1) * page_size
    end = start + page_size
    total_count = login_history.count()

    history_data = login_history[start:end].values(
        'id',
        'login_time',
        'ip_address',
        'user_agent',
        'success'
    )

    return Response({
        'count': total_count,
        'next': page + 1 if end < total_count else None,
        'previous': page - 1 if page > 1 else None,
        'results': list(history_data),
        'user': {
            'id': user.id,
            'username': user.username,
            'full_name': user.full_name,
            'login_count': user.login_count,
            'last_login': user.last_login,
            'last_login_ip': user.last_login_ip,
        }
    })


@ratelimit(key='ip', rate='5/h', method='POST')
@api_view(['POST'])
def request_password_reset(request):
    """
    Send password reset link to user's email
    """
    email = request.data.get('email', '').strip().lower()

    if not email:
        return Response({
            'success': False,
            'message': 'Email is required'
        }, status=status.HTTP_400_BAD_REQUEST)

    try:
        user = User.objects.get(email__iexact=email)

        # Generate password reset token
        token = default_token_generator.make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))

        # Create password reset link
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
        reset_link = f"{frontend_url}/reset-password/{uid}/{token}/"

        # Get current year for email template
        current_year = datetime.datetime.now().year

        # Send email
        subject = 'Reset Your Password - A Data'
        message = f"""
Hello {user.first_name or user.username},

We received a request to reset your password for your A Data account.

Click the link below to reset your password:

{reset_link}

This link will expire in 24 hours.

If you didn't request a password reset, you can safely ignore this email.

Best regards,
A Data Team
        """

        # HTML version
        html_message = f"""
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Reset Your Password</title>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ width: 90%; max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }}
                .header {{ font-size: 24px; font-weight: bold; color: #000; margin-bottom: 20px; }}
                .button {{ display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }}
                .footer {{ margin-top: 20px; font-size: 12px; color: #888; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">Reset Your Password</div>
                <p>Hello {user.first_name or user.username},</p>
                <p>We received a request to reset your password for your A Data account.</p>
                <p>Click the button below to reset your password:</p>
                <a href="{reset_link}" class="button">Reset Password</a>
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #2563eb;">{reset_link}</p>
                <p>This link will expire in 24 hours.</p>
                <p>If you didn't request a password reset, you can safely ignore this email.</p>
                <div class="footer">
                    <p>&copy; {current_year} A Data. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """

        try:
            success, error = send_email_with_ssl_fix(user.email, subject, message, html_message)

            if success:
                return Response({
                    'success': True,
                    'message': f'Password reset instructions have been sent to {email}'
                })
            else:
                return Response({
                    'success': False,
                    'message': f'Failed to send email: {error}'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        except Exception as e:
            return Response({
                'success': False,
                'message': f'Failed to send email: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    except User.DoesNotExist:
        # Don't reveal whether email exists (security best practice)
        return Response({
            'success': True,
            'message': f'If an account exists with {email}, you will receive password reset instructions.'
        })


@api_view(['POST'])
@permission_classes([AllowAny])
def reset_password(request, uidb64, token):
    """
    Reset password using token from email
    """
    new_password = request.data.get('password', '')

    if not new_password:
        return Response({
            'success': False,
            'message': 'Password is required'
        }, status=status.HTTP_400_BAD_REQUEST)

    # Validate password strength
    if len(new_password) < 8:
        return Response({
            'success': False,
            'message': 'Password must be at least 8 characters long'
        }, status=status.HTTP_400_BAD_REQUEST)

    if not re.search(r'[A-Z]', new_password):
        return Response({
            'success': False,
            'message': 'Password must contain at least one uppercase letter'
        }, status=status.HTTP_400_BAD_REQUEST)

    if not re.search(r'[a-z]', new_password):
        return Response({
            'success': False,
            'message': 'Password must contain at least one lowercase letter'
        }, status=status.HTTP_400_BAD_REQUEST)

    if not re.search(r'[0-9]', new_password):
        return Response({
            'success': False,
            'message': 'Password must contain at least one number'
        }, status=status.HTTP_400_BAD_REQUEST)

    try:
        uid = force_str(urlsafe_base64_decode(uidb64))
        user = User.objects.get(pk=uid)
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        return Response({
            'success': False,
            'message': 'Invalid password reset link'
        }, status=status.HTTP_400_BAD_REQUEST)

    if default_token_generator.check_token(user, token):
        user.set_password(new_password)
        user.save()

        return Response({
            'success': True,
            'message': 'Password has been reset successfully. You can now log in with your new password.'
        })

    return Response({
        'success': False,
        'message': 'Password reset link has expired or is invalid'
    }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([AllowAny])
def validate_reset_token(request, uidb64, token):
    """
    Validate if password reset token is still valid
    """
    try:
        uid = force_str(urlsafe_base64_decode(uidb64))
        user = User.objects.get(pk=uid)
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        return Response({
            'valid': False,
            'message': 'Invalid reset link'
        }, status=status.HTTP_400_BAD_REQUEST)

    if default_token_generator.check_token(user, token):
        return Response({
            'valid': True,
            'email': user.email,
            'username': user.username
        })

    return Response({
        'valid': False,
        'message': 'Reset link has expired'
    }, status=status.HTTP_400_BAD_REQUEST)