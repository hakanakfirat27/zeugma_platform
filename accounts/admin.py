# accounts/admin.py

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User

# This is the customized admin view for our User model.
class CustomUserAdmin(UserAdmin):
    # This adds the 'role' field to the detail view in the admin panel.
    fieldsets = UserAdmin.fieldsets + (
        (None, {'fields': ('role',)}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        (None, {'fields': ('role',)}),
    )

    # These are the new additions to make the user list more powerful!

    # list_display: Controls which columns are shown in the user list.
    list_display = ['username', 'email', 'first_name', 'last_name', 'role', 'is_staff']

    # list_filter: Adds a sidebar to filter the user list.
    list_filter = ['role', 'is_staff', 'is_superuser', 'is_active']

    # search_fields: Adds a search bar at the top of the user list.
    search_fields = ['username', 'first_name', 'last_name', 'email']


# Register your User model with the new, customized admin view.
admin.site.register(User, CustomUserAdmin)