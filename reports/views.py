from django.db.models import Q, Count
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from django.contrib.auth import get_user_model
from django.http import HttpResponse
import csv
import traceback
from io import StringIO
from django.db.models import Count

from .models import CustomReport, SuperdatabaseRecord, Subscription, DashboardWidget, SubscriptionStatus
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
from .serializers import SuperdatabaseRecordSerializer, DashboardWidgetSerializer, SuperdatabaseRecordDetailSerializer
from .filters import SuperdatabaseRecordFilter
from .fields import (
    INJECTION_FIELDS, BLOW_FIELDS, ROTO_FIELDS, PE_FILM_FIELDS, SHEET_FIELDS,
    PIPE_FIELDS, TUBE_HOSE_FIELDS, PROFILE_FIELDS, CABLE_FIELDS, COMPOUNDER_FIELDS, ALL_COMMONS
)
from notifications.services import NotificationService

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


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def report_preview(request):
    """
    Preview how many records will be in a custom report based on filter criteria.
    Supports both single category and multiple categories.
    """
    filter_criteria = request.data.get('filter_criteria', {})

    # Start with all records
    queryset = SuperdatabaseRecord.objects.all()

    # Handle categories (can be single string or array of strings)
    if 'categories' in filter_criteria:
        categories = filter_criteria['categories']

        if isinstance(categories, list) and len(categories) > 0:
            # Multiple categories - use OR logic
            from django.db.models import Q
            category_query = Q()
            for category in categories:
                category_query |= Q(category__iexact=category)
            queryset = queryset.filter(category_query)
        elif isinstance(categories, str):
            # Single category as string
            queryset = queryset.filter(category__iexact=categories)

    # Backward compatibility: handle old 'category' field (single category)
    elif 'category' in filter_criteria and filter_criteria['category']:
        queryset = queryset.filter(category__iexact=filter_criteria['category'])

    # Apply country filter
    if 'country' in filter_criteria:
        countries = filter_criteria['country']
        if isinstance(countries, list) and len(countries) > 0:
            queryset = queryset.filter(country__in=countries)

    # Apply boolean filters (materials, properties, etc.)
    for field, value in filter_criteria.items():
        if field not in ['category', 'categories', 'country']:
            if isinstance(value, bool):
                queryset = queryset.filter(**{field: value})

    # Get total count
    total_records = queryset.count()

    # Get breakdown by category
    category_breakdown = list(
        queryset.values('category')
        .annotate(count=Count('id'))
        .order_by('-count')
    )

    # Get breakdown by country
    country_breakdown = list(
        queryset.values('country')
        .annotate(count=Count('id'))
        .filter(country__isnull=False)
        .order_by('-count')[:10]
    )

    return Response({
        'total_records': total_records,
        'field_breakdown': {
            'categories': category_breakdown,
            'countries': country_breakdown
        }
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def client_report_export(request):
    """Export client report data to CSV"""
    try:
        report_id = request.GET.get('report_id')

        if not report_id:
            return Response({'error': 'Report ID is required'}, status=400)

        # Verify user has active subscription
        today = timezone.now().date()
        subscription = Subscription.objects.filter(
            client=request.user,
            report__report_id=report_id,  # Use report__report_id to access CustomReport
            status=SubscriptionStatus.ACTIVE,
            start_date__lte=today,
            end_date__gte=today
        ).first()

        if not subscription:
            return Response({'error': 'No active subscription found'}, status=403)

        # Get the CustomReport
        report = subscription.report

        # Get filtered records based on report's filter_criteria
        queryset = report.get_filtered_records()

        # Apply additional user filters
        search = request.GET.get('search')
        if search:
            queryset = queryset.filter(
                Q(company_name__icontains=search) |
                Q(country__icontains=search) |
                Q(address_1__icontains=search) |
                Q(address_2__icontains=search) |
                Q(address_3__icontains=search) |
                Q(address_4__icontains=search)
            )

        # Country filter
        countries = request.GET.get('countries')
        if countries:
            country_list = [c.strip() for c in countries.split(',')]
            queryset = queryset.filter(country__in=country_list)

        # Boolean filters
        from django.db import models
        for field in SuperdatabaseRecord._meta.get_fields():
            if isinstance(field, models.BooleanField) and field.name in request.GET:
                value = request.GET.get(field.name)
                if value == 'true':
                    queryset = queryset.filter(**{field.name: True})
                elif value == 'false':
                    queryset = queryset.filter(**{field.name: False})

        # Create CSV response
        response = HttpResponse(content_type='text/csv; charset=utf-8')
        filename = f"{report.title.replace(' ', '_')}_export.csv"
        response['Content-Disposition'] = f'attachment; filename="{filename}"'

        writer = csv.writer(response)

        # Get fields to export
        fields_to_export = [
            'company_name', 'category', 'country', 'address_1', 'address_2',
            'address_3', 'address_4', 'phone_number', 'company_email', 'website'
        ]

        # Write header
        headers = [field.replace('_', ' ').title() for field in fields_to_export]
        writer.writerow(headers)

        # Write data
        for record in queryset:
            row = []
            for field in fields_to_export:
                value = getattr(record, field, '')
                if field == 'category':
                    value = record.get_category_display() if hasattr(record, 'get_category_display') else value
                row.append(value if value is not None else '')
            writer.writerow(row)

        return response

    except CustomReport.DoesNotExist:
        return Response({'error': 'Report not found'}, status=404)
    except Exception as e:
        print(f"Export error: {str(e)}")
        traceback.print_exc()
        return Response({'error': str(e)}, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def client_report_stats(request):
    """Get statistics for a client's report"""
    try:
        report_id = request.GET.get('report_id')

        print(f"\n{'=' * 60}")
        print(f"📊 CLIENT REPORT STATS REQUEST")
        print(f"   Report ID: {report_id}")
        print(f"   User: {request.user.username}")
        print(f"{'=' * 60}")

        if not report_id:
            return Response({'error': 'Report ID is required'}, status=400)

        # Verify subscription
        today = timezone.now().date()

        print(f"\n🔍 Looking for subscription...")
        print(f"   Client: {request.user}")
        print(f"   Report ID: {report_id}")
        print(f"   Today: {today}")

        subscription = Subscription.objects.filter(
            client=request.user,
            report__report_id=report_id,
            status=SubscriptionStatus.ACTIVE,
            start_date__lte=today,
            end_date__gte=today
        ).first()

        if not subscription:
            print(f"❌ No active subscription found")
            # Let's check what subscriptions exist
            all_subs = Subscription.objects.filter(client=request.user)
            print(f"   User has {all_subs.count()} total subscriptions:")
            for sub in all_subs:
                print(
                    f"     - Report: {sub.report.title}, Status: {sub.status}, Start: {sub.start_date}, End: {sub.end_date}")

            return Response({'error': 'No active subscription'}, status=403)

        print(f"✅ Found subscription: {subscription}")
        print(f"   Report: {subscription.report.title}")
        print(f"   Status: {subscription.status}")
        print(f"   Dates: {subscription.start_date} to {subscription.end_date}")

        # Get the CustomReport
        report = subscription.report

        print(f"\n📋 Report details:")
        print(f"   Title: {report.title}")
        print(f"   Filter Criteria: {report.filter_criteria}")

        # Get filtered records based on report's filter_criteria
        queryset = report.get_filtered_records()

        # Apply additional user filters
        search = request.GET.get('search')
        if search:
            queryset = queryset.filter(
                Q(company_name__icontains=search) |
                Q(country__icontains=search) |
                Q(address_1__icontains=search) |
                Q(address_2__icontains=search) |
                Q(address_3__icontains=search) |
                Q(address_4__icontains=search)
            )

        countries = request.GET.get('countries')
        if countries:
            country_list = [c.strip() for c in countries.split(',')]
            queryset = queryset.filter(country__in=country_list)

        # Boolean filters
        from django.db import models
        for field in SuperdatabaseRecord._meta.get_fields():
            if isinstance(field, models.BooleanField) and field.name in request.GET:
                value = request.GET.get(field.name)
                if value == 'true':
                    queryset = queryset.filter(**{field.name: True})
                elif value == 'false':
                    queryset = queryset.filter(**{field.name: False})

        # Calculate stats
        total_count = queryset.count()

        # Country stats
        country_stats = queryset.values('country').annotate(
            count=Count('id')
        ).order_by('-count')

        top_countries = [
            {'name': item['country'], 'count': item['count']}
            for item in country_stats[:10]
            if item['country']
        ]

        all_countries = sorted([
            item['country']
            for item in country_stats
            if item['country']
        ])

        countries_count = len(all_countries)

        # Category stats - Show category display names
        category_stats = queryset.values('category').annotate(
            count=Count('id')
        ).order_by('-count')

        # Map category codes to display names
        from .models import CompanyCategory
        categories = [
            {
                'category': dict(CompanyCategory.choices).get(item['category'], item['category']),
                'count': item['count']
            }
            for item in category_stats
            if item['category']
        ]

        return Response({
            'total_count': total_count,
            'countries_count': countries_count,
            'top_countries': top_countries,
            'all_countries': all_countries,
            'categories': categories,
        })

    except CustomReport.DoesNotExist:
        return Response({'error': 'Report not found'}, status=404)
    except Exception as e:
        print(f"Stats error: {str(e)}")
        traceback.print_exc()
        return Response({'error': str(e)}, status=500)


# --- Dashboard Stats APIView Class ---
class DashboardStatsAPIView(APIView):
    """
    Returns REAL dashboard statistics - NO MOCK DATA
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, format=None):
        now = timezone.now()
        thirty_days_ago = now - timedelta(days=30)

        # REAL counts from database
        total_records = SuperdatabaseRecord.objects.count()
        total_clients = User.objects.filter(role=UserRole.CLIENT).count()
        total_staff = User.objects.filter(role=UserRole.STAFF_ADMIN).count()
        total_guests = User.objects.filter(role=UserRole.GUEST).count()
        total_reports = CustomReport.objects.count()

        # Real active subscriptions count
        today = timezone.now().date()
        active_subscriptions = Subscription.objects.filter(
            start_date__lte=today,
            end_date__gte=today
        ).count()

        # Recent records added in last 30 days
        recent_records = SuperdatabaseRecord.objects.filter(
            date_added__gte=thirty_days_ago
        ).count()

        # Recent activity (updated records in last 30 days)
        recent_activity = SuperdatabaseRecord.objects.filter(
            last_updated__gte=thirty_days_ago
        ).count()

        # New clients in last 30 days
        new_clients = User.objects.filter(
            role=UserRole.CLIENT,
            date_joined__gte=thirty_days_ago
        ).count()

        # Staff members count
        staff_members = User.objects.filter(role=UserRole.STAFF_ADMIN).count()

        # Guest users count
        guest_users = User.objects.filter(role=UserRole.GUEST).count()

        # Records by category - REAL DATA
        records_by_category = list(
            SuperdatabaseRecord.objects.values('category')
            .annotate(count=Count('id'))
            .order_by('-count')
        )

        category_labels = []
        category_data = []
        for item in records_by_category:
            try:
                from .models import CompanyCategory
                category_display = dict(CompanyCategory.choices).get(
                    item['category'],
                    item['category']
                )
            except:
                category_display = item['category']

            category_labels.append(category_display)
            category_data.append(item['count'])

        # Top countries - REAL DATA
        top_countries = list(
            SuperdatabaseRecord.objects.values('country')
            .annotate(count=Count('id'))
            .filter(country__isnull=False, country__gt='')
            .order_by('-count')[:10]
        )

        # Top materials - REAL DATA
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

        # Monthly trend - REAL DATA (last 6 months)
        monthly_data = []
        for i in range(5, -1, -1):
            month_start = timezone.now().replace(day=1) - timedelta(days=30 * i)
            month_end = (month_start + timedelta(days=32)).replace(day=1)

            count = SuperdatabaseRecord.objects.filter(
                date_added__gte=month_start,
                date_added__lt=month_end
            ).count()

            monthly_data.append({
                'month': month_start.strftime('%b'),
                'count': count
            })

        return Response({
            # Overview stats - ALL REAL
            'total_records': total_records,
            'total_clients': total_clients,
            'total_staff': total_staff,
            'staff_members': staff_members,
            'total_guests': total_guests,
            'guest_users': guest_users,
            'total_reports': total_reports,
            'custom_reports': total_reports,
            'active_subscriptions': active_subscriptions,

            # Activity stats - ALL REAL
            'recent_records': recent_records,
            'recent_activity': recent_activity,
            'new_clients': new_clients,

            # Chart data - ALL REAL
            'records_by_category': {
                'labels': category_labels,
                'data': category_data
            },
            'top_countries': top_countries,
            'top_materials': materials_data,
            'monthly_trend': monthly_data,
        })

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
    search_fields = ['company_name', 'region']
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
    serializer_class = SuperdatabaseRecordDetailSerializer
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


def create_report(request):
    # ... your report creation logic
    report = Report.objects.create(
        user=user,
        title="Monthly Analytics",
        # ... other fields
    )

    # Create notification
    NotificationService.create_subscription_expiry_notification(
        user=subscription.client,
        subscription_id=subscription.id,
        days_remaining=(subscription.end_date - timezone.now()).days
    )

    return Response({"message": "Report created"})

