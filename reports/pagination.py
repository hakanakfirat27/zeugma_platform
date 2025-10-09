from rest_framework.pagination import PageNumberPagination

class CustomPagination(PageNumberPagination):
    # This is the crucial line. It tells DRF to look for a URL parameter
    # named 'page_size' to determine how many items to show per page.
    page_size_query_param = 'page_size'
    max_page_size = 1000 # Sets a maximum limit for safety