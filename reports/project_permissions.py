# reports/project_permissions.py
"""
Helper functions for checking project-based permissions.
This ensures consistent permission logic across all views.
"""

from accounts.models import UserRole


def user_can_access_project(user, project):
    """
    Check if a user can access a project.
    
    Returns True if:
    - User is SUPERADMIN or STAFF_ADMIN (can access all projects)
    - User is DATA_COLLECTOR and created the project
    - User is DATA_COLLECTOR and is assigned to the project
    
    Args:
        user: The user to check permissions for
        project: The DataCollectionProject instance
    
    Returns:
        bool: True if user can access, False otherwise
    """
    # Admins can access all projects
    if user.role in [UserRole.SUPERADMIN, UserRole.STAFF_ADMIN]:
        return True
    
    # Data collectors can access projects they created or are assigned to
    if user.role == UserRole.DATA_COLLECTOR:
        return project.created_by == user or project.assigned_to == user
    
    # No other roles should have access
    return False


def user_can_access_site(user, site):
    """
    Check if a user can access a site.
    
    This checks project-level permissions, not individual site permissions.
    
    Returns True if:
    - User is SUPERADMIN or STAFF_ADMIN (can access all sites)
    - User can access the site's project (created or assigned to it)
    
    Args:
        user: The user to check permissions for
        site: The UnverifiedSite instance
    
    Returns:
        bool: True if user can access, False otherwise
    """
    # Admins can access all sites
    if user.role in [UserRole.SUPERADMIN, UserRole.STAFF_ADMIN]:
        return True
    
    # If site has no project, check collected_by (legacy support)
    if not site.project:
        return site.collected_by == user
    
    # Check project-level access
    return user_can_access_project(user, site.project)


def get_user_accessible_projects(user):
    """
    Get all projects accessible to a user.
    
    Returns:
        QuerySet: Projects the user can access
    """
    from .models import DataCollectionProject
    from django.db.models import Q
    
    # Admins see all projects
    if user.role in [UserRole.SUPERADMIN, UserRole.STAFF_ADMIN]:
        return DataCollectionProject.objects.all()
    
    # Data collectors see projects they created or are assigned to
    if user.role == UserRole.DATA_COLLECTOR:
        return DataCollectionProject.objects.filter(
            Q(created_by=user) | Q(assigned_to=user)
        )
    
    # No other roles
    return DataCollectionProject.objects.none()


def get_user_accessible_sites(user):
    """
    Get all sites accessible to a user.
    
    Returns:
        QuerySet: Sites the user can access
    """
    from .models import UnverifiedSite
    from django.db.models import Q
    
    # Admins see all sites
    if user.role in [UserRole.SUPERADMIN, UserRole.STAFF_ADMIN]:
        return UnverifiedSite.objects.all()
    
    # Data collectors see sites in their projects
    if user.role == UserRole.DATA_COLLECTOR:
        return UnverifiedSite.objects.filter(
            Q(project__created_by=user) | Q(project__assigned_to=user)
        )
    
    # No other roles
    return UnverifiedSite.objects.none()