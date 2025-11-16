# reports/permissions.py
"""
Custom permissions for the Unverified Sites verification system.
"""

from rest_framework import permissions
from accounts.models import UserRole


class IsStaffOrDataCollector(permissions.BasePermission):
    """
    Permission for Staff Admin, Superadmin, or Data Collector.
    Used for viewing and importing unverified sites.
    """
    message = "You must be a Staff Admin, Superadmin, or Data Collector to perform this action."
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        return request.user.role in [
            UserRole.SUPERADMIN,
            UserRole.STAFF_ADMIN,
            UserRole.DATA_COLLECTOR
        ]


class IsStaffOnly(permissions.BasePermission):
    """
    Permission for Staff Admin and Superadmin only (excludes Data Collector).
    Used for viewing all sites and administrative functions.
    """
    message = "You must be a Staff Admin or Superadmin to perform this action."
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        return request.user.role in [
            UserRole.SUPERADMIN,
            UserRole.STAFF_ADMIN
        ]


class CanVerifySites(permissions.BasePermission):
    """
    Permission to verify/approve/reject sites.
    Only Staff Admins and Superadmins can verify.
    """
    message = "Only Staff Admins and Superadmins can verify sites."
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        return request.user.role in [
            UserRole.SUPERADMIN,
            UserRole.STAFF_ADMIN
        ]


class CanImportData(permissions.BasePermission):
    """
    Permission to import unverified data from Excel files.
    Available to Staff, Superadmins, and Data Collectors.
    """
    message = "You don't have permission to import data."
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        return request.user.role in [
            UserRole.SUPERADMIN,
            UserRole.STAFF_ADMIN,
            UserRole.DATA_COLLECTOR
        ]


class CanTransferSites(permissions.BasePermission):
    """
    Permission to transfer approved sites to Superdatabase.
    Only Staff Admins and Superadmins can transfer.
    """
    message = "Only Staff Admins and Superadmins can transfer sites to Superdatabase."
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        return request.user.role in [
            UserRole.SUPERADMIN,
            UserRole.STAFF_ADMIN
        ]


class CanAssignReviewers(permissions.BasePermission):
    """
    Permission to assign sites to reviewers.
    Only Staff Admins and Superadmins can assign.
    """
    message = "Only Staff Admins and Superadmins can assign reviewers."
    
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        return request.user.role in [
            UserRole.SUPERADMIN,
            UserRole.STAFF_ADMIN
        ]