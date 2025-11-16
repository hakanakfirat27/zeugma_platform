# backend/announcements/permissions.py
from rest_framework import permissions


class IsStaffOrSuperAdmin(permissions.BasePermission):
    """
    Permission to allow only STAFF_ADMIN and SUPERADMIN users
    """

    def has_permission(self, request, view):
        return (
                request.user and
                request.user.is_authenticated and
                request.user.role in ['SUPERADMIN', 'STAFF_ADMIN']
        )

    def has_object_permission(self, request, view, obj):
        return (
                request.user and
                request.user.is_authenticated and
                request.user.role in ['SUPERADMIN', 'STAFF_ADMIN']
        )