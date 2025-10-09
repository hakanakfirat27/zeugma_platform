from django.contrib.auth import login, authenticate
from django.contrib.auth.forms import AuthenticationForm
from django.shortcuts import render, redirect
from django.urls import reverse_lazy
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from .forms import GuestSignUpForm
from .models import UserRole
from django.views import generic
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from .serializers import UserSerializer


# NEW: API-based Login View
class LoginAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')

        if not username or not password:
            return Response(
                {'detail': 'Username and password are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = authenticate(request, username=username, password=password)

        if user is not None:
            login(request, user)

            # Force session to be saved
            request.session.save()

            serializer = UserSerializer(user)

            response = Response({
                'detail': 'Login successful',
                'user': serializer.data
            }, status=status.HTTP_200_OK)

            # Ensure session cookie is set in response
            if request.session.session_key:
                response.set_cookie(
                    key='sessionid',
                    value=request.session.session_key,
                    max_age=1209600,
                    httponly=True,
                    samesite='Lax',
                    secure=False,
                )

            return response
        else:
            return Response(
                {'detail': 'Invalid credentials'},
                status=status.HTTP_401_UNAUTHORIZED
            )


# NEW: API-based Logout View
class LogoutAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        from django.contrib.auth import logout
        logout(request)
        return Response({'detail': 'Logout successful'}, status=status.HTTP_200_OK)


# NEW: API-based Signup View
class SignupAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        from django.contrib.auth.password_validation import validate_password
        from django.core.exceptions import ValidationError

        username = request.data.get('username')
        email = request.data.get('email')
        first_name = request.data.get('first_name', '')
        last_name = request.data.get('last_name', '')
        password1 = request.data.get('password1')
        password2 = request.data.get('password2')

        # Validation
        if not username or not email or not password1 or not password2:
            return Response(
                {'detail': 'All required fields must be filled'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if password1 != password2:
            return Response(
                {'detail': 'Passwords do not match'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if username exists
        from .models import User
        if User.objects.filter(username=username).exists():
            return Response(
                {'detail': 'Username already exists'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if User.objects.filter(email=email).exists():
            return Response(
                {'detail': 'Email already exists'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate password strength
        try:
            validate_password(password1)
        except ValidationError as e:
            return Response(
                {'detail': ' '.join(e.messages)},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create user
        user = User.objects.create_user(
            username=username,
            email=email,
            first_name=first_name,
            last_name=last_name,
            password=password1,
            role=UserRole.GUEST
        )

        return Response(
            {'detail': 'User created successfully'},
            status=status.HTTP_201_CREATED
        )


@method_decorator(csrf_exempt, name='dispatch')
class SignUpView(generic.CreateView):
    form_class = GuestSignUpForm
    success_url = reverse_lazy('accounts:login')
    template_name = 'accounts/signup.html'


class HomeView(generic.TemplateView):
    template_name = 'home.html'


def custom_login_view(request):
    if request.method == 'POST':
        form = AuthenticationForm(request, data=request.POST)
        if form.is_valid():
            username = form.cleaned_data.get('username')
            password = form.cleaned_data.get('password')
            user = authenticate(username=username, password=password)
            if user is not None:
                login(request, user)

                if user.role in [UserRole.SUPERADMIN, UserRole.STAFF_ADMIN] or user.is_superuser:
                    return redirect('dashboard:staff_dashboard')
                elif user.role == UserRole.CLIENT:
                    return redirect('dashboard:client_dashboard')
                else:
                    return redirect('dashboard:guest_dashboard')
    else:
        form = AuthenticationForm()

    return render(request, 'accounts/login.html', {'form': form})


class CurrentUserAPIView(APIView):
    permission_classes = [AllowAny]  # Changed from IsAuthenticated

    def get(self, request):
        if request.user.is_authenticated:
            serializer = UserSerializer(request.user)
            return Response(serializer.data, status=status.HTTP_200_OK)
        else:
            return Response(None, status=status.HTTP_200_OK)