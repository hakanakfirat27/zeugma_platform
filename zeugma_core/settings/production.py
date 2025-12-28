# zeugma_core/settings/production.py
"""
Django Production Settings

Use this for production deployment with:
- DEBUG mode disabled
- PostgreSQL database with connection pooling
- Redis cache and session storage
- SMTP email backend
- Full security settings (HTTPS, HSTS, secure cookies)

Usage:
    set DJANGO_ENV=production
    gunicorn zeugma_core.wsgi:application

Required Environment Variables:
    - SECRET_KEY: Django secret key (generate a new one!)
    - DB_NAME, DB_USER, DB_PASSWORD, DB_HOST: PostgreSQL connection
    - REDIS_URL: Redis connection URL
    - EMAIL_HOST_USER, EMAIL_HOST_PASSWORD: SMTP credentials
    - ALLOWED_HOSTS: Your domain names
"""

from .base import *
from decouple import config
import os

# =============================================================================
# CORE SETTINGS
# =============================================================================

SECRET_KEY = config('SECRET_KEY')
DEBUG = False
ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='localhost').split(',')


# =============================================================================
# DATABASE - PostgreSQL with Connection Pooling
# =============================================================================

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': config('DB_NAME'),
        'USER': config('DB_USER'),
        'PASSWORD': config('DB_PASSWORD'),
        'HOST': config('DB_HOST', default='localhost'),
        'PORT': config('DB_PORT', default='5432'),
        
        # Connection pooling settings
        'CONN_MAX_AGE': 600,  # Keep connections alive for 10 minutes
        'CONN_HEALTH_CHECKS': True,  # Verify connections before use
        
        'OPTIONS': {
            'connect_timeout': 10,
            # Enable SSL in production (uncomment if your DB requires it)
            # 'sslmode': 'require',
        },
    }
}


# =============================================================================
# CACHE - Redis for high performance
# =============================================================================

REDIS_URL = config('REDIS_URL', default='redis://localhost:6379/0')

CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': REDIS_URL,
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        },
        'KEY_PREFIX': 'zeugma',
        'TIMEOUT': 300,  # 5 minutes default cache timeout
    }
}


# =============================================================================
# SESSION - Store in Redis for performance
# =============================================================================

SESSION_ENGINE = 'django.contrib.sessions.backends.cache'
SESSION_CACHE_ALIAS = 'default'


# =============================================================================
# CELERY - Redis as message broker
# =============================================================================

CELERY_BROKER_URL = REDIS_URL
CELERY_RESULT_BACKEND = REDIS_URL

# Celery performance settings
CELERY_BROKER_CONNECTION_RETRY_ON_STARTUP = True
CELERY_TASK_ACKS_LATE = True
CELERY_WORKER_PREFETCH_MULTIPLIER = 1


# =============================================================================
# CHANNELS - Redis for WebSocket support
# =============================================================================

CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            'hosts': [REDIS_URL],
            'capacity': 1500,
            'expiry': 10,
        },
    },
}


# =============================================================================
# EMAIL - Real SMTP backend
# =============================================================================

EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'


# =============================================================================
# CORS & CSRF SETTINGS
# =============================================================================

CORS_ALLOWED_ORIGINS = config('CORS_ORIGINS', default='').split(',')
CSRF_TRUSTED_ORIGINS = config('CSRF_ORIGINS', default='').split(',')


# =============================================================================
# SECURITY SETTINGS - Full production hardening
# =============================================================================

# HTTPS Settings
SECURE_SSL_REDIRECT = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# HSTS - Force HTTPS for 1 year
SECURE_HSTS_SECONDS = 31536000  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# Security Headers
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'

# Secure Cookies
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_HTTPONLY = True


# =============================================================================
# STATIC FILES - WhiteNoise for serving static files
# =============================================================================

# Add WhiteNoise to middleware (after SecurityMiddleware)
MIDDLEWARE.insert(1, 'whitenoise.middleware.WhiteNoiseMiddleware')

# WhiteNoise settings
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'


# =============================================================================
# LOGGING - Production logging configuration
# =============================================================================

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {asctime} {message}',
            'style': '{',
        },
    },
    'filters': {
        'require_debug_false': {
            '()': 'django.utils.log.RequireDebugFalse',
        },
    },
    'handlers': {
        'console': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'simple',
        },
        'file': {
            'level': 'WARNING',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': BASE_DIR / 'logs' / 'django.log',
            'maxBytes': 10485760,  # 10 MB
            'backupCount': 5,
            'formatter': 'verbose',
        },
        'mail_admins': {
            'level': 'ERROR',
            'filters': ['require_debug_false'],
            'class': 'django.utils.log.AdminEmailHandler',
        },
    },
    'root': {
        'handlers': ['console', 'file'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': False,
        },
        'django.request': {
            'handlers': ['file', 'mail_admins'],
            'level': 'ERROR',
            'propagate': False,
        },
        'django.security': {
            'handlers': ['file', 'mail_admins'],
            'level': 'ERROR',
            'propagate': False,
        },
    },
}

# Create logs directory if it doesn't exist
LOGS_DIR = BASE_DIR / 'logs'
LOGS_DIR.mkdir(exist_ok=True)


# =============================================================================
# PERFORMANCE OPTIMIZATIONS
# =============================================================================

# Template caching
TEMPLATES[0]['OPTIONS']['loaders'] = [
    ('django.template.loaders.cached.Loader', [
        'django.template.loaders.filesystem.Loader',
        'django.template.loaders.app_directories.Loader',
    ]),
]
# Remove APP_DIRS when using custom loaders
del TEMPLATES[0]['APP_DIRS']


# =============================================================================
# ADMIN SETTINGS
# =============================================================================

# Email addresses that receive error notifications
ADMINS = [
    ('Admin', config('ADMIN_EMAIL', default='admin@example.com')),
]

MANAGERS = ADMINS


# =============================================================================
# PRINT SETTINGS INFO ON STARTUP
# =============================================================================

print("=" * 60)
print("🔒 PRODUCTION MODE ACTIVE")
print("=" * 60)
print(f"   DEBUG: {DEBUG}")
print(f"   Database: PostgreSQL")
print(f"   Cache: Redis")
print(f"   Sessions: Redis")
print(f"   SSL Redirect: {SECURE_SSL_REDIRECT}")
print("=" * 60)
