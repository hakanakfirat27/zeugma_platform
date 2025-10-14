
from django.contrib.auth import authenticate, login as auth_login, logout as auth_logout
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework.filters import SearchFilter, OrderingFilter
from django.contrib.auth import get_user_model
from .serializers import UserSerializer, UserManagementSerializer
from .pagination import CustomPagination
from django.http import JsonResponse
import json
from .serializers import UserSerializer # Import your UserSerializer

User = get_user_model()


class UserViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows staff users to be viewed or edited.
    """
    queryset = User.objects.all().order_by('-date_joined')
    permission_classes = [IsAdminUser] # Only staff can access
    pagination_class = CustomPagination
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['username', 'email', 'first_name', 'last_name']
    ordering_fields = ['username', 'email', 'date_joined', 'last_login', 'role']

    def get_serializer_class(self):
        # Use a different, more detailed serializer for management actions
        if self.action in ['create', 'update', 'partial_update']:
            return UserManagementSerializer
        return UserSerializer # Use the safe, read-only serializer for listing/retrieving


@api_view(['POST'])
@ensure_csrf_cookie
def login_view(request):
    data = request.data
    username = data.get('username')
    password = data.get('password')
    user = authenticate(request, username=username, password=password)
    if user is not None:
        auth_login(request, user)
        serializer = UserSerializer(user)
        return Response({'user': serializer.data})
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
        # You can choose to log them in directly or require email verification
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_view(request):
    serializer = UserSerializer(request.user)
    return Response(serializer.data)
