from rest_framework.pagination import PageNumberPagination

class CustomPagination(PageNumberPagination):
    page_size = 25  # Default number of users per page
    page_size_query_param = 'page_size' # Allow client to change page size e.g., ?page_size=50
    max_page_size = 100 # Maximum page size allowed