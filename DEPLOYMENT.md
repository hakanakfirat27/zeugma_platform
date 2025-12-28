# 🚀 Zeugma Platform - Deployment Guide

This guide explains how to configure and deploy the Zeugma Platform for different environments.

## Table of Contents

- [Environment Configuration](#environment-configuration)
- [Development Setup](#development-setup)
- [Production Setup](#production-setup)
- [Docker Quick Start](#docker-quick-start)
- [Performance Optimization](#performance-optimization)
- [Security Checklist](#security-checklist)

---

## Environment Configuration

The platform uses a split settings structure:

```
zeugma_core/
├── settings/
│   ├── __init__.py     # Auto-selects environment
│   ├── base.py         # Shared settings
│   ├── development.py  # Local development
│   └── production.py   # Production deployment
```

### Switching Environments

Set the `DJANGO_ENV` variable in your `.env` file:

```bash
# For development (default)
DJANGO_ENV=development

# For production
DJANGO_ENV=production
```

---

## Development Setup

### 1. Basic Setup (Current)

Your current setup works out of the box:

```bash
# Activate virtual environment
venv\Scripts\activate

# Run development server
python manage.py runserver
```

**What you get:**
- ✅ SQLite database
- ✅ In-memory cache
- ✅ Console email (prints to terminal)
- ✅ Debug mode enabled

### 2. With Redis (Optional)

For testing background tasks and caching locally:

**Option A: Docker (Recommended)**
```bash
# Start Redis only
docker-compose up -d redis

# Verify Redis is running
docker-compose ps
```

**Option B: Windows Native**
1. Download from: https://github.com/microsoftarchive/redis/releases
2. Install and start the service

**Test Redis connection:**
```bash
python -c "import redis; r = redis.from_url('redis://localhost:6379/0'); print(r.ping())"
```

### 3. With PostgreSQL (Optional)

For testing with production-like database:

```bash
# Start PostgreSQL
docker-compose up -d postgres

# Update .env
DB_ENGINE=django.db.backends.postgresql
DB_NAME=zeugma_db
DB_USER=zeugma_user
DB_PASSWORD=zeugma_dev_password
DB_HOST=localhost
DB_PORT=5432

# Run migrations
python manage.py migrate
```

---

## Production Setup

### 1. Install Production Dependencies

```bash
pip install -r requirements-production.txt
```

### 2. Configure Environment

Copy the example file and fill in your values:

```bash
cp .env.production.example .env
```

**Critical settings to change:**
- `SECRET_KEY` - Generate a new one!
- `DEBUG=False`
- `ALLOWED_HOSTS` - Your domain
- Database credentials
- Email credentials

### 3. Prepare Database

```bash
# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Collect static files
python manage.py collectstatic --noinput
```

### 4. Run Production Server

```bash
# Using Gunicorn (recommended)
gunicorn zeugma_core.wsgi:application --bind 0.0.0.0:8000 --workers 4

# Or with Daphne (for WebSockets)
daphne -b 0.0.0.0 -p 8000 zeugma_core.asgi:application
```

### 5. Start Background Workers

```bash
# Celery worker
celery -A zeugma_core worker -l info

# Celery beat (scheduled tasks)
celery -A zeugma_core beat -l info
```

---

## Docker Quick Start

### Development with Docker

```bash
# Start all services (Redis + PostgreSQL)
docker-compose up -d

# Start only Redis
docker-compose up -d redis

# View logs
docker-compose logs -f

# Stop everything
docker-compose down

# Start with admin tools (Redis Commander + pgAdmin)
docker-compose --profile tools up -d
```

**Service URLs:**
- Redis: `redis://localhost:6379`
- PostgreSQL: `localhost:5432`
- Redis Commander: http://localhost:8081 (with tools profile)
- pgAdmin: http://localhost:8082 (with tools profile)

---

## Performance Optimization

### Database Indexes

Your models already have optimized indexes! Key indexes include:

**Company Model:**
- `company_name` - Fast name searches
- `country` + `status` - Composite for filtered queries
- `unique_key` - Quick lookups
- `company_name_normalized` - Duplicate detection

**ProductionSite Model:**
- `company` + `category` - Fast category lookups
- `source_project_code` - Project filtering

### Query Optimization Tips

```python
# ❌ Bad - N+1 queries
companies = Company.objects.all()
for company in companies:
    sites = company.production_sites.all()  # Extra query each loop!

# ✅ Good - Single query with prefetch
companies = Company.objects.prefetch_related('production_sites').all()

# ✅ Good - Select related for foreign keys
sites = ProductionSite.objects.select_related('company').all()
```

### Cache Configuration

**Development:** In-memory cache (automatic)

**Production:** Redis cache with these settings:
- Default timeout: 5 minutes
- Key prefix: `zeugma`
- Session storage: Redis

---

## Security Checklist

### Before Going Live

- [ ] Generate new `SECRET_KEY`
- [ ] Set `DEBUG=False`
- [ ] Configure `ALLOWED_HOSTS`
- [ ] Enable HTTPS (`SECURE_SSL_REDIRECT=True`)
- [ ] Set up SSL certificate (Let's Encrypt)
- [ ] Configure firewall (only ports 80, 443, 22)
- [ ] Set up database backups
- [ ] Configure error logging
- [ ] Set up monitoring

### Already Implemented ✅

- ✅ Two-Factor Authentication
- ✅ Session Management
- ✅ Password Policy
- ✅ API Keys Management
- ✅ Login Security (rate limiting)
- ✅ Audit Logs
- ✅ CSRF Protection
- ✅ XSS Prevention
- ✅ HSTS Headers (production)

---

## Troubleshooting

### Redis Connection Failed

```bash
# Check if Redis is running
docker-compose ps

# Start Redis
docker-compose up -d redis
```

### Database Connection Failed

```bash
# Check PostgreSQL status
docker-compose ps

# View PostgreSQL logs
docker-compose logs postgres
```

### Static Files Not Loading

```bash
# Collect static files
python manage.py collectstatic --noinput

# Check STATIC_ROOT
python -c "from django.conf import settings; print(settings.STATIC_ROOT)"
```

---

## Support

For issues or questions, contact the development team.
