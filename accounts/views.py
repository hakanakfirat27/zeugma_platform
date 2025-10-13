# accounts/views.py

from django.contrib.auth import authenticate, login as auth_login, logout as auth_logout
from django.views.decorators.csrf import ensure_csrf_cookie
from django.http import JsonResponse
import json

# --- NEW IMPORTS ---
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .serializers import UserSerializer # Import your UserSerializer

# --- UPDATED: login_view ---
# Now uses @api_view decorator and the UserSerializer
@api_view(['POST'])
@ensure_csrf_cookie
def login_view(request):
    data = request.data
    username = data.get('username')
    password = data.get('password')

    user = authenticate(request, username=username, password=password)

    if user is not None:
        auth_login(request, user)
        # Use the serializer to get the full user data
        serializer = UserSerializer(user)
        return Response({'user': serializer.data})
    else:
        return Response({'error': 'Invalid credentials'}, status=400)

# --- UPDATED: logout_view ---
# Now uses @api_view decorator
@api_view(['POST'])
def logout_view(request):
    auth_logout(request)
    return Response({'message': 'Logged out successfully'})

# --- UPDATED: signup_view ---
# This view was missing but is needed by your frontend AuthContext
@api_view(['POST'])
@ensure_csrf_cookie
def signup_view(request):
    # (Implementation for signup can be added here if needed)
    # For now, we'll return an error to avoid confusion
    return Response({'error': 'Signup not implemented on this endpoint'}, status=501)

# --- UPDATED: user_view ---
# This is the most important change.
# It now uses the UserSerializer to return the full user object.
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_view(request):
    serializer = UserSerializer(request.user)
    return Response(serializer.data)

# --- This view is no longer needed as login_view handles it ---
# @ensure_csrf_cookie
# def csrf_view(request):
#     return JsonResponse({'message': 'CSRF cookie set'})