# zeugma_core/settings/base.py
"""
Django Base Settings - Shared between all environments

These settings are inherited by both development.py and production.py.
Environment-specific settings should NOT be placed here.
"""

from pathlib import Path
import os
from decouple import config

# =============================================================================
# PATH CONFIGURATION
# =============================================================================

# Build paths inside the project like this: BASE_DIR / 'subdir'.
# Note: BASE_DIR points to the project root (zeugma_platform/)
BASE_DIR = Path(__file__).resolve().parent.parent.parent


# =============================================================================
# APPLICATION DEFINITION
# =============================================================================

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Project apps
    'accounts',
    'reports',
    'dashboard',
    'notifications',
    'chat',
    'announcements',
    
    # Third-party apps
    'channels',
    'rest_framework',
    'corsheaders',
    'django_filters',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'accounts.middleware.UpdateLastActivityMiddleware',
    'accounts.middleware.SessionTimeoutMiddleware',
]

ROOT_URLCONF = 'zeugma_core.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [os.path.join(BASE_DIR, 'templates')],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'zeugma_core.wsgi.application'
ASGI_APPLICATION = 'zeugma_core.asgi.application'


# =============================================================================
# PASSWORD VALIDATION
# =============================================================================

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]


# =============================================================================
# INTERNATIONALIZATION
# =============================================================================

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True


# =============================================================================
# STATIC FILES (CSS, JavaScript, Images)
# =============================================================================

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_DIRS = [BASE_DIR / "static"]


# =============================================================================
# MEDIA FILES (User uploads)
# =============================================================================

MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')


# =============================================================================
# DEFAULT FIELD SETTINGS
# =============================================================================

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
AUTH_USER_MODEL = 'accounts.User'


# =============================================================================
# AUTHENTICATION URLS
# =============================================================================

LOGIN_REDIRECT_URL = '/dashboard/'
LOGOUT_REDIRECT_URL = '/accounts/login/'
LOGIN_URL = '/accounts/login/'


# =============================================================================
# REST FRAMEWORK CONFIGURATION
# =============================================================================

REST_FRAMEWORK = {
    'DEFAULT_FILTER_BACKENDS': ['django_filters.rest_framework.DjangoFilterBackend'],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
}


# =============================================================================
# CORS SETTINGS
# =============================================================================

CORS_ALLOW_CREDENTIALS = True
CORS_EXPOSE_HEADERS = ['Content-Type', 'X-CSRFToken']
CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
    'cookie',
]


# =============================================================================
# CSRF SETTINGS
# =============================================================================

CSRF_COOKIE_NAME = 'csrftoken'
CSRF_COOKIE_HTTPONLY = False
CSRF_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_DOMAIN = None
CSRF_COOKIE_PATH = '/'


# =============================================================================
# SESSION CONFIGURATION
# =============================================================================

SESSION_ENGINE = 'django.contrib.sessions.backends.db'
SESSION_COOKIE_NAME = 'sessionid'
SESSION_COOKIE_AGE = 2592000  # 30 days
SESSION_SAVE_EVERY_REQUEST = False
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'
SESSION_COOKIE_DOMAIN = None
SESSION_EXPIRE_AT_BROWSER_CLOSE = False
SESSION_COOKIE_PATH = '/'


# =============================================================================
# EMAIL CONFIGURATION
# =============================================================================

EMAIL_HOST = config('EMAIL_HOST', default='smtp.gmail.com')
EMAIL_PORT = config('EMAIL_PORT', default=587, cast=int)
EMAIL_USE_TLS = config('EMAIL_USE_TLS', default=True, cast=bool)
EMAIL_USE_SSL = config('EMAIL_USE_SSL', default=False, cast=bool)
EMAIL_HOST_USER = config('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='')
DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL', default='A Data <zeugma.research@gmail.com>')


# =============================================================================
# CELERY CONFIGURATION (Background tasks)
# =============================================================================

CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = 'UTC'


# =============================================================================
# AI CONFIGURATION
# =============================================================================

GEMINI_API_KEY = config('GEMINI_API_KEY', default='')


# =============================================================================
# PUSH NOTIFICATIONS (VAPID)
# =============================================================================

VAPID_PUBLIC_KEY = config('VAPID_PUBLIC_KEY', default='')
VAPID_PRIVATE_KEY = config('VAPID_PRIVATE_KEY', default='')
VAPID_CLAIMS_EMAIL = config('VAPID_CLAIMS_EMAIL', default='admin@zeugma.com')


# =============================================================================
# FRONTEND URL
# =============================================================================

FRONTEND_URL = config('FRONTEND_URL', default='http://localhost:5173')
