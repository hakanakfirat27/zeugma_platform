# accounts/views.py
from django.contrib.auth import authenticate, login as auth_login, logout as auth_logout, get_user_model
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import ensure_csrf_cookie
import json

User = get_user_model()


@require_http_methods(["POST"])
def login_view(request):
    """Handle user login"""
    try:
        data = json.loads(request.body)
        username = data.get('username')
        password = data.get('password')

        print(f"Login attempt for username: {username}")

        user = authenticate(request, username=username, password=password)

        if user is not None:
            auth_login(request, user)

            user_data = {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'role': user.role,
                'is_staff': user.is_staff,
                'is_superuser': user.is_superuser,
            }

            print(f"✓ Login successful for {username}, role: {user.role}")

            return JsonResponse({
                'success': True,
                'user': user_data
            })
        else:
            print(f"✗ Login failed for {username}: Invalid credentials")
            return JsonResponse({
                'success': False,
                'error': 'Invalid username or password'
            }, status=401)

    except Exception as e:
        print(f"Login error: {str(e)}")
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)


@require_http_methods(["POST"])
def logout_view(request):
    """Handle user logout"""
    if request.user.is_authenticated:
        print(f"User {request.user.username} logging out")
    auth_logout(request)
    return JsonResponse({'success': True, 'message': 'Logged out successfully'})


@require_http_methods(["GET"])
def user_view(request):
    """Get current authenticated user data"""
    print(f"User endpoint called. Authenticated: {request.user.is_authenticated}")

    if request.user.is_authenticated:
        user_data = {
            'id': request.user.id,
            'username': request.user.username,
            'email': request.user.email,
            'role': request.user.role,
            'is_staff': request.user.is_staff,
            'is_superuser': request.user.is_superuser,
        }
        print(f"Returning user data for {request.user.username}")
        return JsonResponse(user_data)
    else:
        print("User not authenticated")
        return JsonResponse({
            'error': 'Not authenticated'
        }, status=401)


@require_http_methods(["POST"])
def signup_view(request):
    """Handle user registration"""
    try:
        data = json.loads(request.body)
        username = data.get('username')
        email = data.get('email')
        password = data.get('password')

        print(f"Signup attempt for username: {username}")

        if User.objects.filter(username=username).exists():
            return JsonResponse({
                'success': False,
                'error': 'Username already exists'
            }, status=400)

        if User.objects.filter(email=email).exists():
            return JsonResponse({
                'success': False,
                'error': 'Email already exists'
            }, status=400)

        user = User.objects.create_user(
            username=username,
            email=email,
            password=password
        )

        print(f"✓ User created: {username}, role: {user.role}")

        auth_login(request, user)

        user_data = {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'role': user.role,
            'is_staff': user.is_staff,
        }

        return JsonResponse({
            'success': True,
            'user': user_data
        })

    except Exception as e:
        print(f"Signup error: {str(e)}")
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)


@ensure_csrf_cookie
def csrf_view(request):
    """Get CSRF token"""
    return JsonResponse({'detail': 'CSRF cookie set'})