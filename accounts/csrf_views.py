from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.middleware.csrf import get_token


@require_http_methods(["GET"])
def get_csrf_token(request):
    token = get_token(request)

    response = JsonResponse({
        'detail': 'CSRF cookie set',
        'csrfToken': token
    })

    # Explicitly set the cookie with correct attributes
    response.set_cookie(
        key='csrftoken',
        value=token,
        max_age=31449600,  # 1 year
        httponly=False,  # JS needs to read it
        samesite='Lax',  # Lax allows it to be sent with GET requests
        secure=False,  # False for HTTP
        path='/',
    )

    return response