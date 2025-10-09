from django.db.models import Count, Q
from rest_framework import generics
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend

# --- THIS IS THE FIX: Import the IsAuthenticated permission class ---
from rest_framework.permissions import IsAuthenticated

from accounts.models import User, UserRole
from .models import CustomReport, SuperdatabaseRecord
from .pagination import CustomPagination
from .serializers import SuperdatabaseRecordSerializer
from .filters import SuperdatabaseRecordFilter
from .fields import (
    INJECTION_FIELDS, BLOW_FIELDS, ROTO_FIELDS, PE_FILM_FIELDS, SHEET_FIELDS,
    PIPE_FIELDS, TUBE_HOSE_FIELDS, PROFILE_FIELDS, CABLE_FIELDS, COMPOUNDER_FIELDS, ALL_COMMONS
)


class DashboardStatsAPIView(APIView):
    """
    An API view to provide summary statistics for the dashboard homepage.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, format=None):
        client_count = User.objects.filter(role=UserRole.CLIENT).count()
        report_count = CustomReport.objects.count()
        data = {'total_clients': client_count, 'total_reports': report_count}
        return Response(data)


class SuperdatabaseRecordListAPIView(generics.ListAPIView):
    """
    The main, powerful API view for fetching, filtering, searching, and sorting records.
    """
    queryset = SuperdatabaseRecord.objects.all()
    serializer_class = SuperdatabaseRecordSerializer
    pagination_class = CustomPagination
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = SuperdatabaseRecordFilter
    search_fields = ['company_name', 'country', 'region']
    ordering_fields = ['company_name', 'country', 'last_updated']
    permission_classes = [IsAuthenticated] # Also securing this view


class FilterOptionsAPIView(APIView):
    """
    Provides a list of filter options and their counts, contextually based on the
    selected category and respecting the order from fields.py.
    """
    permission_classes = [IsAuthenticated]
    CATEGORY_FIELD_MAP = {
        'INJECTION': INJECTION_FIELDS, 'BLOW': BLOW_FIELDS, 'ROTO': ROTO_FIELDS,
        'PE_FILM': PE_FILM_FIELDS, 'SHEET': SHEET_FIELDS, 'PIPE': PIPE_FIELDS,
        'TUBE_HOSE': TUBE_HOSE_FIELDS, 'PROFILE': PROFILE_FIELDS, 'CABLE': CABLE_FIELDS,
        'COMPOUNDER': COMPOUNDER_FIELDS, 'ALL': ALL_COMMONS,
    }
    search_fields = SuperdatabaseRecordListAPIView.search_fields

    def get(self, request, format=None):
        base_queryset = SuperdatabaseRecord.objects.all()
        filterset = SuperdatabaseRecordFilter(request.GET, queryset=base_queryset)
        base_queryset = filterset.qs
        search_filter = SearchFilter()
        base_queryset = search_filter.filter_queryset(request, base_queryset, self)
        category = request.query_params.get('category', 'ALL').upper()
        target_fields = self.CATEGORY_FIELD_MAP.get(category, [])
        if not target_fields: return Response([])
        boolean_model_fields = {f.name for f in SuperdatabaseRecord._meta.get_fields() if f.get_internal_type() == 'BooleanField'}
        fields_to_aggregate = [field for field in target_fields if field in boolean_model_fields]
        if not fields_to_aggregate: return Response([])
        aggregation_queries = {f'{field}_count': Count('pk', filter=Q(**{f'{field}': True})) for field in fields_to_aggregate}
        counts = base_queryset.aggregate(**aggregation_queries)
        response_data = []
        for field_name in fields_to_aggregate:
            try:
                label = SuperdatabaseRecord._meta.get_field(field_name).verbose_name or field_name
                if label: label = label[0].upper() + label[1:]
            except:
                label = field_name.replace('_', ' ').title()
            response_data.append({"field": field_name, "label": label, "count": counts.get(f'{field_name}_count', 0)})
        return Response(response_data)




class SuperdatabaseRecordDetailAPIView(generics.RetrieveAPIView):
    """
    An API view to retrieve the full details of a single record by its factory_id.
    """
    queryset = SuperdatabaseRecord.objects.all()
    serializer_class = SuperdatabaseRecordSerializer
    lookup_field = 'factory_id' # Tell the view to find records by our UUID field
    permission_classes = [IsAuthenticated]