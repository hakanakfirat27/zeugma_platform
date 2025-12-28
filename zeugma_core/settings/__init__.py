# zeugma_core/settings/__init__.py
"""
Django Settings Package

This package contains environment-specific settings:
- base.py: Shared settings for all environments
- development.py: Local development settings (SQLite, debug mode)
- production.py: Production settings (PostgreSQL, Redis, security)

Usage:
------
Set the DJANGO_SETTINGS_MODULE environment variable:

Development (default):
    set DJANGO_SETTINGS_MODULE=zeugma_core.settings.development

Production:
    set DJANGO_SETTINGS_MODULE=zeugma_core.settings.production

Or in manage.py / wsgi.py / asgi.py, it will default to development.
"""

import os

# Default to development settings
environment = os.environ.get('DJANGO_ENV', 'development')

if environment == 'production':
    from .production import *
else:
    from .development import *
