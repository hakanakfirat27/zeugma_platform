# reports/pagination.py

"""
Custom pagination class for REST API views
"""

from rest_framework.pagination import PageNumberPagination


class CustomPagination(PageNumberPagination):
    """
    Custom pagination for project and site list views
    """
    page_size = 10  # Default page size
    page_size_query_param = 'page_size'  # Allow client to override page size
    max_page_size = 100  # Maximum allowed page size
    page_query_param = 'page'  # Query parameter name for page number
    
    def get_paginated_response(self, data):
        """
        Return a standard paginated response format:
        {
            "count": total_count,
            "next": next_page_url,
            "previous": previous_page_url,
            "results": [...]
        }
        """
        return super().get_paginated_response(data)