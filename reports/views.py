from django.db.models import Count, Q
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from django.contrib.auth import get_user_model

from .models import CustomReport, SuperdatabaseRecord, Subscription, DashboardWidget
from accounts.models import User, UserRole

from rest_framework import generics, viewsets, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action

from datetime import timedelta
from .pagination import CustomPagination
from .serializers import SuperdatabaseRecordSerializer, DashboardWidgetSerializer
from .filters import SuperdatabaseRecordFilter
from .fields import (
    INJECTION_FIELDS, BLOW_FIELDS, ROTO_FIELDS, PE_FILM_FIELDS, SHEET_FIELDS,
    PIPE_FIELDS, TUBE_HOSE_FIELDS, PROFILE_FIELDS, CABLE_FIELDS, COMPOUNDER_FIELDS, ALL_COMMONS
)

User = get_user_model()


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    """Return REAL dashboard statistics from database"""
    try:
        from .models import SuperDatabaseRecord

        now = timezone.now()
        thirty_days_ago = now - timedelta(days=30)
        sixty_days_ago = now - timedelta(days=60)

        # Count records
        total_records = SuperDatabaseRecord.objects.count()

        # Count users by type
        total_clients = User.objects.filter(user_type='CLIENT').count()
        staff_members = User.objects.filter(user_type='STAFF').count()
        guest_users = User.objects.filter(user_type='GUEST').count()

        # Recent records
        try:
            recent_records = SuperDatabaseRecord.objects.filter(
                created_at__gte=thirty_days_ago
            ).count()
        except:
            recent_records = 0

        # Recent activity
        try:
            recent_activity = SuperDatabaseRecord.objects.filter(
                updated_at__gte=thirty_days_ago
            ).count()
        except:
            recent_activity = recent_records

        # New clients this month
        new_clients = User.objects.filter(
            user_type='CLIENT',
            date_joined__gte=thirty_days_ago
        ).count()

        # Conversion rate
        converted_clients = User.objects.filter(
            user_type='CLIENT',
            date_joined__gte=thirty_days_ago
        ).count()

        previous_converted = User.objects.filter(
            user_type='CLIENT',
            date_joined__gte=sixty_days_ago,
            date_joined__lt=thirty_days_ago
        ).count()

        previous_guests = User.objects.filter(
            user_type='GUEST',
            date_joined__gte=sixty_days_ago,
            date_joined__lt=thirty_days_ago
        ).count()

        previous_conversion_rate = (
            (previous_converted / previous_guests * 100)
            if previous_guests > 0 else 0
        )

        stats = {
            'total_records': total_records,
            'total_clients': total_clients,
            'staff_members': staff_members,
            'guest_users': guest_users,
            'recent_records': recent_records,
            'recent_activity': recent_activity,
            'new_clients': new_clients,
            'converted_clients': converted_clients,
            'previous_conversion_rate': round(previous_conversion_rate, 1),
            'custom_reports': 0,
            'active_subscriptions': 0,
            'total_subscriptions': 0,
        }

        return Response(stats)

    except Exception as e:
        print(f"Error: {str(e)}")
        return Response({
            'total_records': 0,
            'total_clients': 0,
            'staff_members': 0,
            'guest_users': 0,
            'recent_records': 0,
            'recent_activity': 0,
            'new_clients': 0,
            'converted_clients': 0,
            'previous_conversion_rate': 0,
            'custom_reports': 0,
            'active_subscriptions': 0,
            'total_subscriptions': 0,
        })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_widget_order(request):
    """
    Update the display order of widgets
    """
    try:
        from .models import DashboardWidget

        widgets_data = request.data.get('widgets', [])

        if not widgets_data:
            return Response(
                {'error': 'No widget data provided'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Update each widget's display_order
        for widget_data in widgets_data:
            widget_id = widget_data.get('id')
            display_order = widget_data.get('display_order')

            if widget_id and display_order is not None:
                DashboardWidget.objects.filter(id=widget_id).update(
                    display_order=display_order
                )

        return Response({
            'success': True,
            'message': f'Updated order for {len(widgets_data)} widgets'
        })

    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )




# --- Dashboard Stats APIView Class ---
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


# --- Superdatabase Record List APIView Class ---
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


# --- Filter Options APIView Class ---
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


# --- Superdatabase Record Detail APIView Class ---
class SuperdatabaseRecordDetailAPIView(generics.RetrieveAPIView):
    """
    An API view to retrieve the full details of a single record by its factory_id.
    """
    queryset = SuperdatabaseRecord.objects.all()
    serializer_class = SuperdatabaseRecordSerializer
    lookup_field = 'factory_id' # Tell the view to find records by our UUID field
    permission_classes = [IsAuthenticated]


# --- Database Stats APIView Class ---
class DatabaseStatsAPIView(APIView):
    """Efficient stats endpoint"""
    permission_classes = [IsAuthenticated]

    def get(self, request, format=None):
        queryset = SuperdatabaseRecord.objects.all()
        filterset = SuperdatabaseRecordFilter(request.GET, queryset=queryset)
        queryset = filterset.qs

        total_count = queryset.count()

        countries_data = queryset.values('country').annotate(
            count=Count('id')
        ).filter(
            country__isnull=False
        ).order_by('-count')

        top_countries = list(countries_data[:10])
        countries_count = countries_data.count()

        all_countries = list(
            queryset.values_list('country', flat=True)
            .distinct()
            .order_by('country')
        )
        all_countries = [c for c in all_countries if c]

        return Response({
            'total_count': total_count,
            'countries_count': countries_count,
            'top_countries': [
                {'name': item['country'], 'count': item['count']}
                for item in top_countries
            ],
            'all_countries': all_countries
        })


# --- Enhanced Dashboard Stats APIView Class ---
class EnhancedDashboardStatsAPIView(APIView):
    """
    Comprehensive API view for staff dashboard statistics.
    Provides data for cards, charts, and insights.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, format=None):
        # Basic counts
        total_records = SuperdatabaseRecord.objects.count()
        total_clients = User.objects.filter(role=UserRole.CLIENT).count()
        total_staff = User.objects.filter(role__in=[UserRole.STAFF_ADMIN, UserRole.SUPERADMIN]).count()
        total_guests = User.objects.filter(role=UserRole.GUEST).count()
        total_reports = CustomReport.objects.count()

        # Active subscriptions (current date within start_date and end_date)
        today = timezone.now().date()
        active_subscriptions = Subscription.objects.filter(
            start_date__lte=today,
            end_date__gte=today
        ).count()

        # Records by category
        records_by_category = list(
            SuperdatabaseRecord.objects.values('category')
            .annotate(count=Count('id'))
            .order_by('-count')
        )

        # Format category data for charts
        category_labels = []
        category_counts = []
        for item in records_by_category:
            # Get the display name for the category
            try:
                category_display = dict(SuperdatabaseRecord._meta.get_field('category').choices).get(
                    item['category'],
                    item['category']
                )
            except:
                category_display = item['category']

            category_labels.append(category_display)
            category_counts.append(item['count'])

        # Top 10 countries by record count
        top_countries = list(
            SuperdatabaseRecord.objects.values('country')
            .annotate(count=Count('id'))
            .filter(country__isnull=False, country__gt='')
            .order_by('-count')[:10]
        )

        # Recent activity - records added in last 30 days
        thirty_days_ago = timezone.now() - timedelta(days=30)
        recent_records = SuperdatabaseRecord.objects.filter(
            date_added__gte=thirty_days_ago
        ).count()

        # Records updated in last 7 days
        seven_days_ago = timezone.now() - timedelta(days=7)
        recently_updated = SuperdatabaseRecord.objects.filter(
            last_updated__gte=seven_days_ago
        ).count()

        # User growth - new users in last 30 days
        new_users = User.objects.filter(
            date_joined__gte=thirty_days_ago
        ).count()

        # Subscription status breakdown
        all_subscriptions = Subscription.objects.all()
        expired_subscriptions = sum(1 for sub in all_subscriptions if not sub.is_active)
        total_subscriptions = all_subscriptions.count()

        # Top materials (example: top 5 polymer types used)
        material_fields = ['hdpe', 'ldpe', 'pp', 'pvc', 'pet', 'pa', 'abs', 'ps']
        materials_data = []
        for field in material_fields:
            count = SuperdatabaseRecord.objects.filter(**{field: True}).count()
            if count > 0:
                materials_data.append({
                    'name': field.upper(),
                    'count': count
                })
        materials_data = sorted(materials_data, key=lambda x: x['count'], reverse=True)[:8]

        # Monthly trend - records added per month (last 6 months)
        monthly_data = []
        for i in range(5, -1, -1):
            month_start = timezone.now().replace(day=1) - timedelta(days=30 * i)
            month_end = (month_start + timedelta(days=32)).replace(day=1)

            count = SuperdatabaseRecord.objects.filter(
                date_added__gte=month_start,
                date_added__lt=month_end
            ).count()

            monthly_data.append({
                'month': month_start.strftime('%b %Y'),
                'records': count
            })

        return Response({
            # Overview stats
            'total_records': total_records,
            'total_clients': total_clients,
            'total_staff': total_staff,
            'total_guests': total_guests,
            'total_reports': total_reports,
            'active_subscriptions': active_subscriptions,
            'total_subscriptions': total_subscriptions,
            'expired_subscriptions': expired_subscriptions,

            # Activity stats
            'recent_records': recent_records,
            'recently_updated': recently_updated,
            'new_users': new_users,

            # Chart data
            'records_by_category': {
                'labels': category_labels,
                'data': category_counts
            },
            'top_countries': top_countries,
            'top_materials': materials_data,
            'monthly_trend': monthly_data,
        })


# --- Dashboard Widget ViewSet Class ---
class DashboardWidgetViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing dashboard widgets.
    Allows CRUD operations on widgets.
    """
    queryset = DashboardWidget.objects.all()
    serializer_class = DashboardWidgetSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Optionally filter to only enabled widgets.
        """
        queryset = super().get_queryset()

        # Filter by enabled status if requested
        enabled_only = self.request.query_params.get('enabled_only', None)
        if enabled_only and enabled_only.lower() == 'true':
            queryset = queryset.filter(is_enabled=True)

        # Filter by category if requested
        category = self.request.query_params.get('category', None)
        if category:
            queryset = queryset.filter(category=category)

        return queryset.order_by('display_order')

    @action(detail=True, methods=['post'])
    def toggle_enabled(self, request, pk=None):
        """
        Toggle the enabled status of a widget.
        """
        widget = self.get_object()
        widget.is_enabled = not widget.is_enabled
        widget.save()

        serializer = self.get_serializer(widget)
        return Response({
            'message': f'Widget {"enabled" if widget.is_enabled else "disabled"} successfully',
            'widget': serializer.data
        })

    @action(detail=False, methods=['post'])
    def reorder(self, request):
        """
        Update the display order of multiple widgets.
        Expects: { "widgets": [{"id": 1, "display_order": 0}, ...] }
        """
        widget_orders = request.data.get('widgets', [])

        updated_widgets = []
        for item in widget_orders:
            try:
                widget = DashboardWidget.objects.get(id=item['id'])
                widget.display_order = item['display_order']
                widget.save()
                updated_widgets.append(widget)
            except DashboardWidget.DoesNotExist:
                pass

        serializer = self.get_serializer(updated_widgets, many=True)
        return Response({
            'message': f'{len(updated_widgets)} widgets reordered successfully',
            'widgets': serializer.data
        })

    @action(detail=False, methods=['post'])
    def bulk_toggle(self, request):
        """
        Enable or disable multiple widgets at once.
        Expects: { "widget_ids": [1, 2, 3], "enabled": true }
        """
        widget_ids = request.data.get('widget_ids', [])
        enabled = request.data.get('enabled', True)

        widgets = DashboardWidget.objects.filter(id__in=widget_ids)
        count = widgets.update(is_enabled=enabled)

        return Response({
            'message': f'{count} widgets {"enabled" if enabled else "disabled"} successfully',
            'count': count
        })


# --- Enabled Widgets APIView Class ---
class EnabledWidgetsAPIView(APIView):
    """
    Get all enabled widgets for the dashboard.
    This is the main endpoint the dashboard will call.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, format=None):
        widgets = DashboardWidget.objects.filter(is_enabled=True).order_by('display_order')
        serializer = DashboardWidgetSerializer(widgets, many=True)
        return Response(serializer.data)