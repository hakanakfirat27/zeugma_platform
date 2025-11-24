# reports/project_urls.py

"""
URL Configuration for Project-based Unverified Sites Management
"""

from django.urls import path
from .project_views import (
    # Project CRUD
    ProjectListCreateAPIView,
    ProjectDetailAPIView,
    ProjectSitesListAPIView,
    AddSiteToProjectAPIView,
    UpdateSiteInProjectAPIView,
    DeleteSiteFromProjectAPIView,
    SiteDetailAPIView,
    check_duplicate_site,
    UpdateSiteInProjectAPIView,
    
    # Review workflow
    send_for_revision,
    resubmit_site,
    
    # Bulk actions
    bulk_project_action,
    
    # Statistics
    project_stats,
    my_tasks,
)

from .notes_views import (
    # Review notes CRUD
    SiteReviewNotesListCreateAPIView,
    ReviewNoteDetailAPIView,
    get_site_notes_summary,
)

urlpatterns = [
    # =========================================================================
    # PROJECT MANAGEMENT
    # =========================================================================
    
    # List all projects and create new project
    path('projects/', ProjectListCreateAPIView.as_view(), name='project-list-create'),
    
    # Get, update, delete specific project
    path('projects/<uuid:project_id>/', ProjectDetailAPIView.as_view(), name='project-detail'),
    
    # List all sites in a project
    path('projects/<uuid:project_id>/sites/', ProjectSitesListAPIView.as_view(), name='project-sites-list'),
    
    # Add new site to a project (using the APIView - this is the correct one)
    path('projects/<uuid:project_id>/sites/add/', AddSiteToProjectAPIView.as_view(), name='project-add-site'),
    
    path('projects/sites/<uuid:site_id>/', SiteDetailAPIView.as_view(), name='project-site-detail'),

    # Update site in a project
    path('projects/sites/<uuid:site_id>/update/', UpdateSiteInProjectAPIView.as_view(), name='project-update-site'),
    
    # Delete site from a project
    path('projects/sites/<uuid:site_id>/delete/', DeleteSiteFromProjectAPIView.as_view(), name='project-delete-site'),

    path('projects/<uuid:project_id>/check-duplicate/', check_duplicate_site, name='check-duplicate-site'),
    

    path('sites/<uuid:site_id>/', UpdateSiteInProjectAPIView.as_view(), name='site-direct-update'),    
    # =========================================================================
    # REVIEW WORKFLOW
    # =========================================================================
    
    # Send site back for revision (Staff/Superadmin)
    path('sites/<uuid:site_id>/send-for-revision/', send_for_revision, name='send-for-revision'),
    
    # Resubmit revised site (Data Collector)
    path('sites/<uuid:site_id>/resubmit/', resubmit_site, name='resubmit-site'),
    
    # =========================================================================
    # REVIEW NOTES
    # =========================================================================
    
    # List and create review notes for a site
    path('sites/<uuid:site_id>/notes/', 
         SiteReviewNotesListCreateAPIView.as_view(), name='site-notes'),
    
    # Get, update, delete a specific note
    path('notes/<uuid:note_id>/', 
         ReviewNoteDetailAPIView.as_view(), name='note-detail'),
    
    # Get notes summary for a site
    path('sites/<uuid:site_id>/notes/summary/', 
         get_site_notes_summary, name='site-notes-summary'),
    
    # =========================================================================
    # BULK ACTIONS
    # =========================================================================
    
    # Bulk actions on sites within a project
    path('projects/<uuid:project_id>/bulk-action/', bulk_project_action, name='project-bulk-action'),
    
    # =========================================================================
    # STATISTICS & TASKS
    # =========================================================================
    
    # Get overall project statistics
    path('projects/stats/overview/', project_stats, name='project-stats'),
    
    # Get user's tasks (needs revision or pending review)
    path('my-tasks/', my_tasks, name='my-tasks'),
]