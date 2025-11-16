from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class CustomPagination(PageNumberPagination):
    """
    Custom pagination class for User Management
    - Default page size: 25
    - Allows client to override via page_size parameter
    - Maximum page size: 100
    """
    page_size = 25  # Default number of users per page
    page_size_query_param = 'page_size'  # Allow client to change page size e.g., ?page_size=50
    max_page_size = 100  # Maximum page size allowed

    def get_paginated_response(self, data):
        """
        Override to provide detailed pagination information
        """
        return Response({
            'count': self.page.paginator.count,
            'next': self.get_next_link(),
            'previous': self.get_previous_link(),
            'results': data,
            'page_size': self.page_size,
            'total_pages': self.page.paginator.num_pages,
            'current_page': self.page.number,
        })