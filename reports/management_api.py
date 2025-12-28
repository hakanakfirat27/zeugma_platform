# reports/management_api.py
"""
Management Command API - Allows running management commands via API
Only accessible to superadmins
"""

import subprocess
import os
import sys
from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response


def is_superadmin(user):
    """Check if user is superadmin"""
    from accounts.models import UserRole
    return user.is_authenticated and (user.is_superuser or user.role == UserRole.SUPERADMIN)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def sync_widgets_api(request):
    """
    Run the sync_widgets management command
    """
    if not is_superadmin(request.user):
        return Response(
            {'error': 'Only superadmins can run this command'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        # Get the delete_orphans parameter
        delete_orphans = request.data.get('delete_orphans', False)
        
        # Run the management command
        from django.core.management import call_command
        from io import StringIO
        
        output = StringIO()
        
        if delete_orphans:
            call_command('sync_widgets', '--delete-orphans', stdout=output, stderr=output)
        else:
            call_command('sync_widgets', stdout=output, stderr=output)
        
        output_text = output.getvalue()
        
        return Response({
            'success': True,
            'message': 'Widget synchronization completed successfully',
            'output': output_text,
            'delete_orphans': delete_orphans
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def build_frontend_api(request):
    """
    Run npm run build for frontend
    """
    if not is_superadmin(request.user):
        return Response(
            {'error': 'Only superadmins can run this command'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        # Get the frontend directory
        base_dir = settings.BASE_DIR
        frontend_dir = os.path.join(base_dir, 'frontend')
        
        if not os.path.exists(frontend_dir):
            return Response({
                'success': False,
                'error': 'Frontend directory not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Check if package.json exists
        package_json = os.path.join(frontend_dir, 'package.json')
        if not os.path.exists(package_json):
            return Response({
                'success': False,
                'error': 'package.json not found in frontend directory'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Determine npm command based on OS
        npm_cmd = 'npm.cmd' if sys.platform == 'win32' else 'npm'
        
        # Run npm run build
        result = subprocess.run(
            [npm_cmd, 'run', 'build'],
            cwd=frontend_dir,
            capture_output=True,
            text=True,
            timeout=300  # 5 minute timeout
        )
        
        if result.returncode == 0:
            return Response({
                'success': True,
                'message': 'Frontend build completed successfully',
                'output': result.stdout[-2000:] if len(result.stdout) > 2000 else result.stdout,  # Last 2000 chars
            })
        else:
            return Response({
                'success': False,
                'error': 'Build failed',
                'output': result.stderr[-2000:] if len(result.stderr) > 2000 else result.stderr,
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
    except subprocess.TimeoutExpired:
        return Response({
            'success': False,
            'error': 'Build timed out after 5 minutes'
        }, status=status.HTTP_504_GATEWAY_TIMEOUT)
    except FileNotFoundError:
        return Response({
            'success': False,
            'error': 'npm not found. Make sure Node.js is installed.'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def clear_cache_api(request):
    """
    Clear Django cache
    """
    if not is_superadmin(request.user):
        return Response(
            {'error': 'Only superadmins can run this command'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        from django.core.cache import cache
        cache.clear()
        
        return Response({
            'success': True,
            'message': 'Cache cleared successfully'
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAdminUser])
def collect_static_api(request):
    """
    Run collectstatic management command
    """
    if not is_superadmin(request.user):
        return Response(
            {'error': 'Only superadmins can run this command'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        from django.core.management import call_command
        from io import StringIO
        
        output = StringIO()
        call_command('collectstatic', '--noinput', stdout=output, stderr=output)
        
        return Response({
            'success': True,
            'message': 'Static files collected successfully',
            'output': output.getvalue()
        })
        
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
