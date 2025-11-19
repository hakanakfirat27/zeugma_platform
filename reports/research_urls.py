# Add these URLs to your reports/research_urls.py

from django.urls import path
from .research_views import (
    research_company,
    get_research_quota,
    batch_research_companies,
)
from .research_history_views import (
    list_research_history,
    get_research_detail,
    update_research,
    delete_research,
    bulk_delete_research,
    get_research_stats,
    toggle_favorite,
)

urlpatterns = [
    # =========================================================================
    # COMPANY RESEARCH (AI Search)
    # =========================================================================
    
    # Single company research
    path(
        'research-company/',
        research_company,
        name='research-company'
    ),
    
    # Get current research quota
    path(
        'research-quota/',
        get_research_quota,
        name='research-quota'
    ),
    
    # Batch company research (up to 5 at once)
    path(
        'batch-research/',
        batch_research_companies,
        name='batch-research-companies'
    ),
    
    # =========================================================================
    # RESEARCH HISTORY (Saved Results)
    # =========================================================================
    
    # List all research history with filters and pagination
    path(
        'research-history/',
        list_research_history,
        name='research-history-list'
    ),
    
    # Get specific research result details
    path(
        'research-history/<uuid:research_id>/',
        get_research_detail,
        name='research-history-detail'
    ),
    
    # Update research result (favorite, notes)
    path(
        'research-history/<uuid:research_id>/update/',
        update_research,
        name='research-history-update'
    ),
    
    # Delete single research result
    path(
        'research-history/<uuid:research_id>/delete/',
        delete_research,
        name='research-history-delete'
    ),
    
    # Toggle favorite status
    path(
        'research-history/<uuid:research_id>/toggle-favorite/',
        toggle_favorite,
        name='research-history-toggle-favorite'
    ),
    
    # Bulk delete research results
    path(
        'research-history/bulk-delete/',
        bulk_delete_research,
        name='research-history-bulk-delete'
    ),
    
    # Get research statistics
    path(
        'research-history/stats/',
        get_research_stats,
        name='research-history-stats'
    ),
]