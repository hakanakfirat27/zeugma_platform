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
from django.db.models import Q
from .serializers import UserSerializer, UserManagementSerializer
from .pagination import CustomPagination
import json
import re
from datetime import timedelta
import pyotp
import qrcode
import io
import base64
import datetime


User = get_user_model()


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
        subject = 'Welcome to Zeugma Platform - Create Your Password'
        message = f"""
Hello {user.first_name or user.username},

Welcome to Zeugma Platform! Your account has been created.

Please click the link below to create your password and complete your profile:

{password_link}

This link will expire in 24 hours.

Best regards,
Zeugma Platform Team
        """

        try:
            send_mail(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL,
                [user.email],
                fail_silently=False,
            )

            return Response({
                'success': True,
                'message': 'User created successfully. Password creation email sent.',
                'user': UserSerializer(user).data
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            # If email fails, delete the user and return error
            user.delete()
            return Response({
                'success': False,
                'message': f'Failed to send email: {str(e)}'
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
    Login view with Email 2FA support
    """
    data = request.data
    username_or_email = data.get('username', '').strip()
    password = data.get('password', '')

    # Try to determine if input is email or username
    user = None

    if '@' in username_or_email:
        try:
            user_obj = User.objects.get(email__iexact=username_or_email)
            user = authenticate(request, username=user_obj.username, password=password)
        except User.DoesNotExist:
            user = None
    else:
        user = authenticate(request, username=username_or_email, password=password)

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
            message = f"""
Hello {user.first_name or user.username},

Your verification code is: {code}

This code will expire in 10 minutes.

If you didn't try to log in, please secure your account immediately.

Best regards,
Zeugma Platform Team
            """

            try:
                send_mail(
                    subject,
                    message,
                    settings.DEFAULT_FROM_EMAIL,
                    [user.email],
                    fail_silently=False,
                )
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
            user.update_last_activity()

            return Response({
                'requires_2fa_setup': True,
                'user': UserSerializer(user).data,
                'message': '2FA setup required'
            })

        # Regular login without 2FA
        auth_logout(request)
        auth_login(request, user)
        user.update_last_activity()
        serializer = UserSerializer(user)

        return Response({
            'user': serializer.data,
            'message': 'Login successful'
        })
    else:
        return Response({
            'error': 'Invalid credentials. Please check your username/email and password.'
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
def logout_view(request):
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
        subject = 'Verify Your Email - Zeugma Platform'
        message = f"""
Hello {user.first_name or user.username},

Thank you for signing up for Zeugma Platform!

Please verify your email address by clicking the link below:

{verification_link}

This link will expire in 24 hours.

If you didn't create an account, please ignore this email.

Best regards,
Zeugma Platform Team
        """

        try:
            send_mail(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL,
                [user.email],
                fail_silently=False,
            )

            return Response({
                'success': True,
                'message': 'Account created successfully. Please check your email to verify your account.',
                'email': user.email
            }, status=status.HTTP_201_CREATED)

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
        subject = 'Verify Your Email - Zeugma Platform'
        message = f"""
Hello {user.first_name or user.username},

Here is your new email verification link:

{verification_link}

This link will expire in 24 hours.

Best regards,
Zeugma Platform Team
        """

        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [user.email],
            fail_silently=False,
        )

        return Response({
            'success': True,
            'message': 'Verification email sent successfully'
        })

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
@permission_classes([AllowAny])
def verify_2fa_login(request):
    """
    Verify 2FA code during login
    """
    username = request.data.get('username', '')
    code = request.data.get('code', '')

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
        user.update_last_activity()

        return Response({
            'success': True,
            'user': UserSerializer(user).data,
            'message': 'Login successful'
        })
    else:
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
    message = f"""
Hello {user.first_name or user.username},

You have requested to enable Two-Factor Authentication for your account.

Your verification code is: {code}

This code will expire in 10 minutes.

If you didn't request this, please ignore this email.

Best regards,
Zeugma Platform Team
    """

    try:
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [user.email],
            fail_silently=False,
        )

        return Response({
            'success': True,
            'message': f'Verification code sent to {user.email}'
        })
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

    subject = 'Your Login Verification Code'
    message = f"""
Hello {user.first_name or user.username},

Your verification code is: {code}

This code will expire in 10 minutes.

If you didn't try to log in, please secure your account immediately.

Best regards,
Zeugma Platform Team
    """

    # HTML version
    html_message = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your Verification Code</title>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ width: 90%; max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }}
            .header {{ font-size: 24px; font-weight: bold; color: #000; }}
            .code {{ font-size: 36px; font-weight: bold; color: #000; letter-spacing: 4px; margin: 25px 0; padding: 15px; background-color: #f4f4f4; text-align: center; border-radius: 4px; }}
            .footer {{ margin-top: 20px; font-size: 12px; color: #888; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">Zeugma Platform</div>
            <p>Hello {user.first_name or user.username},</p>
            <p>Here is your verification code to complete your login:</p>
            <div class="code">{code}</div>
            <p>This code is valid for 10 minutes.</p>
            <p>If you did not request this code, please ignore this email and contact support if you have concerns about your account security.</p>
            <div class="footer">
                <p>&copy; {current_year} Zeugma Platform. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    """

    try:
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [user.email],
            fail_silently=False,
        )

        return Response({
            'success': True,
            'message': f'Verification code sent to {user.email}',
            'email': user.email
        })
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