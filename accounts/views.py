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
    email = request.data.get('email', '').strip()
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
    username = request.data.get('username', '').strip()
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
        user.set_unusable_password()  # Mark as no password set
        user.save()

        # Generate password reset token
        token = default_token_generator.make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))

        # Create password creation link
        frontend_url = settings.FRONTEND_URL
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
        'message': 'Password created successfully'
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
    data = request.data
    username = data.get('username')
    password = data.get('password')
    user = authenticate(request, username=username, password=password)
    if user is not None:
        # Logout any existing user in this session/browser
        auth_logout(request)

        # Login the new user
        auth_login(request, user)
        user.update_last_activity()
        serializer = UserSerializer(user)

        return Response({
            'user': serializer.data,
            'message': 'Login successful'
        })
    else:
        return Response({'error': 'Invalid credentials'}, status=status.HTTP_400_BAD_REQUEST)


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