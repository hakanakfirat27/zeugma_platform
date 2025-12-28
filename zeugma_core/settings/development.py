# zeugma_core/settings/development.py
"""
Django Development Settings

Use this for local development with:
- DEBUG mode enabled
- SQLite database
- In-memory cache
- Console email backend
- Relaxed security settings

Usage:
    set DJANGO_ENV=development
    python manage.py runserver
"""

from .base import *
from decouple import config

# =============================================================================
# CORE SETTINGS
# =============================================================================

SECRET_KEY = config('SECRET_KEY')
DEBUG = True
ALLOWED_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0']


# =============================================================================
# DATABASE - SQLite or PostgreSQL based on .env
# =============================================================================

DB_ENGINE = config('DB_ENGINE', default='django.db.backends.sqlite3')

if 'postgresql' in DB_ENGINE:
    # PostgreSQL configuration
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': config('DB_NAME', default='zeugma_db'),
            'USER': config('DB_USER', default='zeugma_user'),
            'PASSWORD': config('DB_PASSWORD', default=''),
            'HOST': config('DB_HOST', default='localhost'),
            'PORT': config('DB_PORT', default='5432'),
            'CONN_MAX_AGE': 60,  # Keep connections for 1 minute
        }
    }
    DB_DISPLAY = f"PostgreSQL ({config('DB_NAME', default='zeugma_db')})"
else:
    # SQLite configuration (default)
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / config('DB_NAME', default='db.sqlite3'),
        }
    }
    DB_DISPLAY = f"SQLite ({config('DB_NAME', default='db.sqlite3')})"


# =============================================================================
# CACHE - Simple in-memory cache (no Redis required)
# =============================================================================

CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'unique-snowflake',
    }
}


# =============================================================================
# CELERY - Redis for background tasks
# =============================================================================

CELERY_BROKER_URL = config('REDIS_URL', default='redis://localhost:6379/0')
CELERY_RESULT_BACKEND = config('REDIS_URL', default='redis://localhost:6379/0')


# =============================================================================
# CHANNELS - In-memory for development
# =============================================================================

CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels.layers.InMemoryChannelLayer'
    },
}


# =============================================================================
# EMAIL - Console backend (prints to terminal)
# =============================================================================

EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'


# =============================================================================
# CORS SETTINGS - Allow localhost
# =============================================================================

CORS_ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
]

CSRF_TRUSTED_ORIGINS = [
    'http://localhost:5173',
    'http://localhost:8000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:8000',
]


# =============================================================================
# SECURITY - Relaxed for development
# =============================================================================

CSRF_COOKIE_SECURE = False
SESSION_COOKIE_SECURE = False
SECURE_SSL_REDIRECT = False


# =============================================================================
# DEBUGGING TOOLS (Optional)
# =============================================================================

# Uncomment to enable Django Debug Toolbar
# INSTALLED_APPS += ['debug_toolbar']
# MIDDLEWARE.insert(0, 'debug_toolbar.middleware.DebugToolbarMiddleware')
# INTERNAL_IPS = ['127.0.0.1']

# Enable SQL query logging (shows all queries in console)
# LOGGING = {
#     'version': 1,
#     'disable_existing_loggers': False,
#     'handlers': {
#         'console': {
#             'class': 'logging.StreamHandler',
#         },
#     },
#     'loggers': {
#         'django.db.backends': {
#             'handlers': ['console'],
#             'level': 'DEBUG',
#         },
#     },
# }


# =============================================================================
# PRINT SETTINGS INFO ON STARTUP
# =============================================================================

print("=" * 60)
print("🚀 DEVELOPMENT MODE ACTIVE")
print("=" * 60)
print(f"   DEBUG: {DEBUG}")
print(f"   Database: {DB_DISPLAY}")
print(f"   Cache: In-Memory (LocMemCache)")
print(f"   Email: Console Backend")
print("=" * 60)
