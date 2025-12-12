# reports/views.py
# NOTE: Superdatabase has been deprecated. All data now uses Company Database.

from django.db.models import Q, Count
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from django.contrib.auth import get_user_model
from django.http import HttpResponse
import csv
import traceback
from io import StringIO
from django.db.models import Count

from .models import CustomReport, Subscription, DashboardWidget, SubscriptionStatus
from .company_models import Company, ProductionSiteVersion, CompanyStatus
from accounts.models import User, UserRole

from rest_framework import generics, viewsets, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from django.db.models import Min, Max

from datetime import timedelta
from .pagination import CustomPagination
from .serializers import DashboardWidgetSerializer
from .fields import (
    INJECTION_FIELDS, BLOW_FIELDS, ROTO_FIELDS, PE_FILM_FIELDS, SHEET_FIELDS,
    PIPE_FIELDS, TUBE_HOSE_FIELDS, PROFILE_FIELDS, CABLE_FIELDS, COMPOUNDER_FIELDS, RECYCLER_FIELDS, ALL_COMMONS
)
from notifications.services import NotificationService

User = get_user_model()


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    """Return REAL dashboard statistics from Company Database"""
    try:
        now = timezone.now()
        thirty_days_ago = now - timedelta(days=30)
        sixty_days_ago = now - timedelta(days=60)

        # Count records (Companies, excluding deleted)
        total_records = Company.objects.exclude(status=CompanyStatus.DELETED).count()

        # Count users by role
        total_clients = User.objects.filter(role=UserRole.CLIENT).count()
        staff_members = User.objects.filter(role__in=[UserRole.STAFF_ADMIN, UserRole.SUPERADMIN]).count()
        guest_users = User.objects.filter(role=UserRole.GUEST).count()

        # Recent records
        try:
            recent_records = Company.objects.filter(
                created_at__gte=thirty_days_ago
            ).exclude(status=CompanyStatus.DELETED).count()
        except:
            recent_records = 0

        # Recent activity
        try:
            recent_activity = Company.objects.filter(
                updated_at__gte=thirty_days_ago
            ).exclude(status=CompanyStatus.DELETED).count()
        except:
            recent_activity = recent_records

        # New clients this month
        new_clients = User.objects.filter(
            role=UserRole.CLIENT,
            date_joined__gte=thirty_days_ago
        ).count()

        # Conversion rate
        converted_clients = User.objects.filter(
            role=UserRole.CLIENT,
            date_joined__gte=thirty_days_ago
        ).count()

        previous_converted = User.objects.filter(
            role=UserRole.CLIENT,
            date_joined__gte=sixty_days_ago,
            date_joined__lt=thirty_days_ago
        ).count()

        previous_guests = User.objects.filter(
            role=UserRole.GUEST,
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
            'custom_reports': CustomReport.objects.count(),
            'active_subscriptions': Subscription.objects.filter(
                status=SubscriptionStatus.ACTIVE,
                start_date__lte=timezone.now().date(),
                end_date__gte=timezone.now().date()
            ).count(),
            'total_subscriptions': Subscription.objects.count(),
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
    Supports both single category, multiple categories, and filter groups.
    NOTE: Now queries Company Database instead of Superdatabase.
    """
    filter_criteria = request.data.get('filter_criteria', {})

    # Start with all non-deleted companies
    queryset = Company.objects.exclude(status=CompanyStatus.DELETED)

    # Handle status filters
    if 'status' in filter_criteria:
        status_list = filter_criteria['status']
        if isinstance(status_list, list) and len(status_list) > 0:
            queryset = queryset.filter(status__in=status_list)

    # Handle filter groups (with OR logic within groups, AND between groups)
    if 'filter_groups' in filter_criteria:
        filter_groups = filter_criteria['filter_groups']
        if isinstance(filter_groups, list):
            for group in filter_groups:
                if not isinstance(group, dict):
                    continue

                group_query = Q()

                # Handle boolean filters (materials)
                filters = group.get('filters', {})
                if filters:
                    for field_name, field_value in filters.items():
                        try:
                            ProductionSiteVersion._meta.get_field(field_name)
                            if field_value is True:
                                group_query |= Q(
                                    production_sites__versions__is_current=True,
                                    **{f'production_sites__versions__{field_name}': True}
                                )
                            elif field_value is False:
                                group_query |= (
                                    Q(
                                        production_sites__versions__is_current=True,
                                        **{f'production_sites__versions__{field_name}': False}
                                    ) |
                                    Q(
                                        production_sites__versions__is_current=True,
                                        **{f'production_sites__versions__{field_name}__isnull': True}
                                    )
                                )
                        except Exception:
                            continue

                # Handle technical filters (equals and range modes)
                technical_filters = group.get('technicalFilters', {})
                if technical_filters:
                    for field_name, filter_config in technical_filters.items():
                        if not isinstance(filter_config, dict):
                            continue

                        try:
                            field = ProductionSiteVersion._meta.get_field(field_name)
                            mode = filter_config.get('mode', 'range')

                            if mode == 'equals':
                                equals_val = filter_config.get('equals', '')
                                if equals_val != '' and equals_val is not None:
                                    try:
                                        if field.get_internal_type() == 'FloatField':
                                            equals_val = float(equals_val)
                                        else:
                                            equals_val = int(equals_val)
                                        group_query |= Q(
                                            production_sites__versions__is_current=True,
                                            **{f'production_sites__versions__{field_name}': equals_val}
                                        )
                                    except (ValueError, TypeError):
                                        pass

                            elif mode == 'range':
                                min_val = filter_config.get('min', '')
                                max_val = filter_config.get('max', '')
                                range_query = Q(production_sites__versions__is_current=True)

                                if min_val != '' and min_val is not None:
                                    try:
                                        if field.get_internal_type() == 'FloatField':
                                            min_val = float(min_val)
                                        else:
                                            min_val = int(min_val)
                                        range_query &= Q(**{f'production_sites__versions__{field_name}__gte': min_val})
                                    except (ValueError, TypeError):
                                        pass

                                if max_val != '' and max_val is not None:
                                    try:
                                        if field.get_internal_type() == 'FloatField':
                                            max_val = float(max_val)
                                        else:
                                            max_val = int(max_val)
                                        range_query &= Q(**{f'production_sites__versions__{field_name}__lte': max_val})
                                    except (ValueError, TypeError):
                                        pass

                                group_query |= range_query

                        except Exception:
                            continue

                if group_query:
                    queryset = queryset.filter(group_query).distinct()

    # Handle categories (filter companies with production sites in these categories)
    if 'categories' in filter_criteria:
        categories = filter_criteria['categories']
        if isinstance(categories, list) and len(categories) > 0:
            queryset = queryset.filter(
                production_sites__category__in=categories
            ).distinct()
        elif isinstance(categories, str) and categories:
            queryset = queryset.filter(
                production_sites__category=categories
            ).distinct()
    elif 'category' in filter_criteria and filter_criteria['category']:
        queryset = queryset.filter(
            production_sites__category=filter_criteria['category']
        ).distinct()

    # Apply country filter
    if 'country' in filter_criteria:
        countries = filter_criteria['country']
        if isinstance(countries, list) and len(countries) > 0:
            queryset = queryset.filter(country__in=countries)
        elif isinstance(countries, str) and countries:
            queryset = queryset.filter(country=countries)

    # Get total count
    total_records = queryset.count()

    # Get breakdown by category (from production sites)
    category_breakdown = list(
        queryset.filter(
            production_sites__versions__is_current=True
        ).values('production_sites__category')
        .annotate(count=Count('id', distinct=True))
        .order_by('-count')
    )
    # Rename key for consistency
    category_breakdown = [
        {'category': item['production_sites__category'], 'count': item['count']}
        for item in category_breakdown if item['production_sites__category']
    ]

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
    """Export client report data to CSV
    NOTE: Now exports from Company Database instead of Superdatabase
    """
    try:
        report_id = request.GET.get('report_id')

        if not report_id:
            return Response({'error': 'Report ID is required'}, status=400)

        # Verify user has active subscription
        today = timezone.now().date()
        subscription = Subscription.objects.filter(
            client=request.user,
            report__report_id=report_id,
            status=SubscriptionStatus.ACTIVE,
            start_date__lte=today,
            end_date__gte=today
        ).first()

        if not subscription:
            return Response({'error': 'No active subscription found'}, status=403)

        # Get the CustomReport
        report = subscription.report

        # Get filtered records based on report's filter_criteria
        # This now returns Company objects
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

        # Boolean filters (from production site versions)
        from django.db import models
        for field in ProductionSiteVersion._meta.get_fields():
            if isinstance(field, models.BooleanField) and field.name in request.GET:
                value = request.GET.get(field.name)
                if value == 'true':
                    queryset = queryset.filter(
                        production_sites__versions__is_current=True,
                        **{f'production_sites__versions__{field.name}': True}
                    ).distinct()
                elif value == 'false':
                    queryset = queryset.filter(
                        production_sites__versions__is_current=True,
                        **{f'production_sites__versions__{field.name}': False}
                    ).distinct()

        # Create CSV response
        response = HttpResponse(content_type='text/csv; charset=utf-8')
        filename = f"{report.title.replace(' ', '_')}_export.csv"
        response['Content-Disposition'] = f'attachment; filename="{filename}"'

        writer = csv.writer(response)

        # Get fields to export (Company-level fields)
        fields_to_export = [
            'company_name', 'country', 'address_1', 'address_2',
            'address_3', 'address_4', 'phone_number', 'company_email', 'website'
        ]

        # Write header (add 'Categories' column)
        headers = [field.replace('_', ' ').title() for field in fields_to_export]
        headers.append('Categories')
        writer.writerow(headers)

        # Write data
        for company in queryset:
            row = []
            for field in fields_to_export:
                value = getattr(company, field, '')
                row.append(value if value is not None else '')
            
            # Add categories from production sites
            categories = list(company.production_sites.values_list('category', flat=True).distinct())
            from .models import CompanyCategory
            category_names = [dict(CompanyCategory.choices).get(cat, cat) for cat in categories]
            row.append(', '.join(category_names))
            
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
    """Get statistics for a client's report
    NOTE: Now queries Company Database instead of Superdatabase
    """
    try:
        report_id = request.GET.get('report_id')

        if not report_id:
            return Response({'error': 'Report ID is required'}, status=400)

        # Verify subscription
        today = timezone.now().date()

        subscription = Subscription.objects.filter(
            client=request.user,
            report__report_id=report_id,
            status=SubscriptionStatus.ACTIVE,
            start_date__lte=today,
            end_date__gte=today
        ).first()

        if not subscription:
            return Response({'error': 'No active subscription'}, status=403)

        # Get the CustomReport
        report = subscription.report

        # Get filtered records based on report's filter_criteria
        # This now returns Company objects
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

        # Boolean filters (from production site versions)
        from django.db import models
        for field in ProductionSiteVersion._meta.get_fields():
            if isinstance(field, models.BooleanField) and field.name in request.GET:
                value = request.GET.get(field.name)
                if value == 'true':
                    queryset = queryset.filter(
                        production_sites__versions__is_current=True,
                        **{f'production_sites__versions__{field.name}': True}
                    ).distinct()
                elif value == 'false':
                    queryset = queryset.filter(
                        production_sites__versions__is_current=True,
                        **{f'production_sites__versions__{field.name}': False}
                    ).distinct()

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

        # Category stats from production sites
        category_stats = queryset.filter(
            production_sites__versions__is_current=True
        ).values('production_sites__category').annotate(
            count=Count('id', distinct=True)
        ).order_by('-count')

        # Map category codes to display names
        from .models import CompanyCategory
        categories = [
            {
                'category': dict(CompanyCategory.choices).get(item['production_sites__category'], item['production_sites__category']),
                'count': item['count']
            }
            for item in category_stats
            if item['production_sites__category']
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
    Returns REAL dashboard statistics from Company Database
    NOTE: Now queries Company Database instead of Superdatabase
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, format=None):
        now = timezone.now()
        thirty_days_ago = now - timedelta(days=30)

        # REAL counts from Company Database
        total_records = Company.objects.exclude(status=CompanyStatus.DELETED).count()
        total_clients = User.objects.filter(role=UserRole.CLIENT).count()
        total_staff = User.objects.filter(role__in=[UserRole.STAFF_ADMIN, UserRole.SUPERADMIN]).count()
        total_guests = User.objects.filter(role=UserRole.GUEST).count()
        total_reports = CustomReport.objects.count()

        # Real active subscriptions count
        today = timezone.now().date()
        active_subscriptions = Subscription.objects.filter(
            start_date__lte=today,
            end_date__gte=today,
            status=SubscriptionStatus.ACTIVE
        ).count()

        # Recent records added in last 30 days
        recent_records = Company.objects.filter(
            created_at__gte=thirty_days_ago
        ).exclude(status=CompanyStatus.DELETED).count()

        # Recent activity (updated records in last 30 days)
        recent_activity = Company.objects.filter(
            updated_at__gte=thirty_days_ago
        ).exclude(status=CompanyStatus.DELETED).count()

        # New clients in last 30 days
        new_clients = User.objects.filter(
            role=UserRole.CLIENT,
            date_joined__gte=thirty_days_ago
        ).count()

        # Staff members count
        staff_members = User.objects.filter(role__in=[UserRole.STAFF_ADMIN, UserRole.SUPERADMIN]).count()

        # Guest users count
        guest_users = User.objects.filter(role=UserRole.GUEST).count()

        # Records by category - from production sites
        from .models import CompanyCategory
        records_by_category = list(
            Company.objects.exclude(status=CompanyStatus.DELETED)
            .filter(production_sites__versions__is_current=True)
            .values('production_sites__category')
            .annotate(count=Count('id', distinct=True))
            .order_by('-count')
        )

        category_labels = []
        category_data = []
        for item in records_by_category:
            cat = item['production_sites__category']
            if cat:
                category_display = dict(CompanyCategory.choices).get(cat, cat)
                category_labels.append(category_display)
                category_data.append(item['count'])

        # Top countries - REAL DATA
        top_countries = list(
            Company.objects.exclude(status=CompanyStatus.DELETED)
            .values('country')
            .annotate(count=Count('id'))
            .filter(country__isnull=False, country__gt='')
            .order_by('-count')[:10]
        )

        # Top materials - from ProductionSiteVersion
        material_fields = ['hdpe', 'ldpe', 'pp', 'pvc', 'pet', 'pa', 'abs', 'ps']
        materials_data = []
        for field in material_fields:
            count = ProductionSiteVersion.objects.filter(
                is_current=True,
                **{field: True}
            ).values('production_site__company').distinct().count()
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

            count = Company.objects.filter(
                created_at__gte=month_start,
                created_at__lt=month_end
            ).exclude(status=CompanyStatus.DELETED).count()

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
# DEPRECATED: This class is kept for backward compatibility but now queries Company Database
class SuperdatabaseRecordListAPIView(generics.ListAPIView):
    """
    DEPRECATED: Use CompanyListCreateAPIView from company_views.py instead.
    This view is kept for backward compatibility and redirects to Company Database.
    """
    permission_classes = [IsAuthenticated]
    pagination_class = CustomPagination
    
    def get_queryset(self):
        # Return Company objects instead of SuperdatabaseRecord
        return Company.objects.exclude(status=CompanyStatus.DELETED)
    
    def list(self, request, *args, **kwargs):
        from rest_framework import status
        return Response(
            {'message': 'This endpoint is deprecated. Please use /api/companies/ instead.'},
            status=status.HTTP_301_MOVED_PERMANENTLY
        )


# --- Filter Options APIView Class ---
class FilterOptionsAPIView(APIView):
    """
    Provides a list of filter options and their counts, contextually based on the
    selected category and respecting the order from fields.py.
    
    Now queries Company Database (ProductionSiteVersion) instead of Superdatabase.
    """
    permission_classes = [IsAuthenticated]
    CATEGORY_FIELD_MAP = {
        'INJECTION': INJECTION_FIELDS, 'BLOW': BLOW_FIELDS, 'ROTO': ROTO_FIELDS,
        'PE_FILM': PE_FILM_FIELDS, 'SHEET': SHEET_FIELDS, 'PIPE': PIPE_FIELDS,
        'TUBE_HOSE': TUBE_HOSE_FIELDS, 'PROFILE': PROFILE_FIELDS, 'CABLE': CABLE_FIELDS,
        'COMPOUNDER': COMPOUNDER_FIELDS, 'RECYCLER': RECYCLER_FIELDS, 'ALL': ALL_COMMONS,
    }

    def get(self, request, format=None):
        from .company_models import ProductionSiteVersion
        
        # Get base queryset - only current versions
        base_queryset = ProductionSiteVersion.objects.filter(is_current=True)
        
        # Apply category filter if provided
        category = request.query_params.get('category', 'ALL').upper()
        if category != 'ALL':
            categories = [c.strip() for c in category.split(',')]
            base_queryset = base_queryset.filter(
                production_site__category__in=categories
            )
        
        # Apply search filter if provided
        search = request.query_params.get('search', '')
        if search:
            base_queryset = base_queryset.filter(
                Q(production_site__company__company_name__icontains=search) |
                Q(production_site__company__region__icontains=search)
            )
        
        # Get target fields for the category
        target_fields = self.CATEGORY_FIELD_MAP.get(category, [])
        if not target_fields:
            return Response([])
        
        # Get boolean fields from ProductionSiteVersion model
        boolean_model_fields = {f.name for f in ProductionSiteVersion._meta.get_fields() 
                                if hasattr(f, 'get_internal_type') and f.get_internal_type() == 'BooleanField'}
        
        fields_to_aggregate = [field for field in target_fields if field in boolean_model_fields]
        if not fields_to_aggregate:
            return Response([])
        
        # Build aggregation queries
        aggregation_queries = {
            f'{field}_count': Count('pk', filter=Q(**{f'{field}': True})) 
            for field in fields_to_aggregate
        }
        
        counts = base_queryset.aggregate(**aggregation_queries)
        
        # Build response data
        response_data = []
        for field_name in fields_to_aggregate:
            try:
                label = ProductionSiteVersion._meta.get_field(field_name).verbose_name or field_name
                if label:
                    label = label[0].upper() + label[1:]
            except:
                label = field_name.replace('_', ' ').title()
            
            response_data.append({
                "field": field_name, 
                "label": label, 
                "count": counts.get(f'{field_name}_count', 0)
            })
        
        return Response(response_data)


# --- Superdatabase Record Detail APIView Class ---
# DEPRECATED: This class is kept for backward compatibility but now redirects to Company Database
class SuperdatabaseRecordDetailAPIView(generics.RetrieveAPIView):
    """
    DEPRECATED: Use CompanyDetailAPIView from company_views.py instead.
    This view is kept for backward compatibility and redirects to Company Database.
    """
    permission_classes = [IsAuthenticated]
    
    def retrieve(self, request, *args, **kwargs):
        from rest_framework import status
        return Response(
            {'message': 'This endpoint is deprecated. Please use /api/companies/<id>/ instead.'},
            status=status.HTTP_301_MOVED_PERMANENTLY
        )


# --- Database Stats APIView Class ---
class DatabaseStatsAPIView(APIView):
    """
    Efficient stats endpoint with filter groups support.
    Now queries Company Database (Company model) instead of Superdatabase.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, format=None):
        import json
        from .company_models import Company, ProductionSiteVersion, CompanyStatus
        
        # Start with all non-deleted companies
        queryset = Company.objects.exclude(status=CompanyStatus.DELETED)
        
        # Apply category filter if provided
        categories_param = request.query_params.get('categories')
        if categories_param:
            categories = [c.strip() for c in categories_param.split(',')]
            queryset = queryset.filter(
                production_sites__category__in=categories,
                production_sites__versions__is_current=True
            ).distinct()
        
        # Apply country filter if provided
        countries_param = request.query_params.get('countries')
        if countries_param:
            countries = [c.strip() for c in countries_param.split(',')]
            queryset = queryset.filter(country__in=countries)
        
        # Apply filter groups (material and technical filters)
        filter_groups_param = request.query_params.get('filter_groups')
        if filter_groups_param:
            try:
                filter_groups = json.loads(filter_groups_param)
                if isinstance(filter_groups, list):
                    for group in filter_groups:
                        if not isinstance(group, dict):
                            continue
                        
                        group_query = Q()
                        
                        # Handle boolean/material filters
                        filters = group.get('filters', {})
                        if filters:
                            for field_name, field_value in filters.items():
                                try:
                                    ProductionSiteVersion._meta.get_field(field_name)
                                    if field_value is True:
                                        group_query |= Q(
                                            production_sites__versions__is_current=True,
                                            **{f'production_sites__versions__{field_name}': True}
                                        )
                                    elif field_value is False:
                                        group_query |= (
                                            Q(
                                                production_sites__versions__is_current=True,
                                                **{f'production_sites__versions__{field_name}': False}
                                            ) |
                                            Q(
                                                production_sites__versions__is_current=True,
                                                **{f'production_sites__versions__{field_name}__isnull': True}
                                            )
                                        )
                                except Exception:
                                    continue
                        
                        # Handle technical filters
                        technical_filters = group.get('technicalFilters', {})
                        if technical_filters:
                            for field_name, filter_config in technical_filters.items():
                                if not isinstance(filter_config, dict):
                                    continue
                                try:
                                    field = ProductionSiteVersion._meta.get_field(field_name)
                                    mode = filter_config.get('mode', 'range')
                                    
                                    if mode == 'equals':
                                        equals_val = filter_config.get('equals', '')
                                        if equals_val != '' and equals_val is not None:
                                            try:
                                                if field.get_internal_type() == 'FloatField':
                                                    equals_val = float(equals_val)
                                                else:
                                                    equals_val = int(equals_val)
                                                group_query |= Q(
                                                    production_sites__versions__is_current=True,
                                                    **{f'production_sites__versions__{field_name}': equals_val}
                                                )
                                            except (ValueError, TypeError):
                                                pass
                                    elif mode == 'range':
                                        min_val = filter_config.get('min', '')
                                        max_val = filter_config.get('max', '')
                                        range_query = Q(production_sites__versions__is_current=True)
                                        
                                        if min_val != '' and min_val is not None:
                                            try:
                                                if field.get_internal_type() == 'FloatField':
                                                    min_val = float(min_val)
                                                else:
                                                    min_val = int(min_val)
                                                range_query &= Q(**{f'production_sites__versions__{field_name}__gte': min_val})
                                            except (ValueError, TypeError):
                                                pass
                                        
                                        if max_val != '' and max_val is not None:
                                            try:
                                                if field.get_internal_type() == 'FloatField':
                                                    max_val = float(max_val)
                                                else:
                                                    max_val = int(max_val)
                                                range_query &= Q(**{f'production_sites__versions__{field_name}__lte': max_val})
                                            except (ValueError, TypeError):
                                                pass
                                        
                                        group_query |= range_query
                                except Exception:
                                    continue
                        
                        if group_query:
                            queryset = queryset.filter(group_query).distinct()
            except json.JSONDecodeError:
                pass
        
        total_count = queryset.count()
        
        # Get country statistics
        countries_data = queryset.values('country').annotate(
            count=Count('id')
        ).filter(
            country__isnull=False
        ).order_by('-count')
        
        top_countries = list(countries_data[:10])
        countries_count = countries_data.count()
        
        # Get all unique countries for the filter dropdown
        all_countries = list(
            queryset.values_list('country', flat=True)
            .distinct()
            .order_by('country')
        )
        all_countries = [c for c in all_countries if c]
        
        # Get category breakdown
        category_data = queryset.filter(
            production_sites__versions__is_current=True
        ).values(
            'production_sites__category'
        ).annotate(
            count=Count('id', distinct=True)
        ).order_by('-count')
        
        categories = [
            {'category': item['production_sites__category'], 'count': item['count']}
            for item in category_data if item['production_sites__category']
        ]
        
        return Response({
            'total_count': total_count,
            'countries_count': countries_count,
            'top_countries': [
                {'name': item['country'], 'count': item['count']}
                for item in top_countries
            ],
            'all_countries': all_countries,
            'categories': categories
        })


# --- Enhanced Dashboard Stats APIView Class ---
class EnhancedDashboardStatsAPIView(APIView):
    """
    Comprehensive API view for staff dashboard statistics.
    Provides data for cards, charts, and insights.
    NOTE: Now queries Company Database instead of Superdatabase.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, format=None):
        from .models import CompanyCategory
        
        # Basic counts from Company Database
        total_records = Company.objects.exclude(status=CompanyStatus.DELETED).count()
        total_clients = User.objects.filter(role=UserRole.CLIENT).count()
        total_staff = User.objects.filter(role__in=[UserRole.STAFF_ADMIN, UserRole.SUPERADMIN]).count()
        total_guests = User.objects.filter(role=UserRole.GUEST).count()
        total_reports = CustomReport.objects.count()

        # Active subscriptions (current date within start_date and end_date)
        today = timezone.now().date()
        active_subscriptions = Subscription.objects.filter(
            start_date__lte=today,
            end_date__gte=today,
            status=SubscriptionStatus.ACTIVE
        ).count()

        # Records by category (from production sites)
        records_by_category = list(
            Company.objects.exclude(status=CompanyStatus.DELETED)
            .filter(production_sites__versions__is_current=True)
            .values('production_sites__category')
            .annotate(count=Count('id', distinct=True))
            .order_by('-count')
        )

        # Format category data for charts
        category_labels = []
        category_counts = []
        for item in records_by_category:
            cat = item['production_sites__category']
            if cat:
                category_display = dict(CompanyCategory.choices).get(cat, cat)
                category_labels.append(category_display)
                category_counts.append(item['count'])

        # Top 10 countries by record count
        top_countries = list(
            Company.objects.exclude(status=CompanyStatus.DELETED)
            .values('country')
            .annotate(count=Count('id'))
            .filter(country__isnull=False, country__gt='')
            .order_by('-count')[:10]
        )

        # Recent activity - records added in last 30 days
        thirty_days_ago = timezone.now() - timedelta(days=30)
        recent_records = Company.objects.filter(
            created_at__gte=thirty_days_ago
        ).exclude(status=CompanyStatus.DELETED).count()

        # Records updated in last 7 days
        seven_days_ago = timezone.now() - timedelta(days=7)
        recently_updated = Company.objects.filter(
            updated_at__gte=seven_days_ago
        ).exclude(status=CompanyStatus.DELETED).count()

        # User growth - new users in last 30 days
        new_users = User.objects.filter(
            date_joined__gte=thirty_days_ago
        ).count()

        # Subscription status breakdown
        all_subscriptions = Subscription.objects.all()
        expired_subscriptions = sum(1 for sub in all_subscriptions if not sub.is_active)
        total_subscriptions = all_subscriptions.count()

        # Top materials from ProductionSiteVersion
        material_fields = ['hdpe', 'ldpe', 'pp', 'pvc', 'pet', 'pa', 'abs', 'ps']
        materials_data = []
        for field in material_fields:
            count = ProductionSiteVersion.objects.filter(
                is_current=True,
                **{field: True}
            ).values('production_site__company').distinct().count()
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

            count = Company.objects.filter(
                created_at__gte=month_start,
                created_at__lt=month_end
            ).exclude(status=CompanyStatus.DELETED).count()

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


class TechnicalFilterOptionsAPIView(APIView):
    """
    Provides a list of technical (IntegerField and FloatField) filter options
    with their min/max ranges. Returns ALL fields that belong to the selected category,
    even if they don't have data yet.
    
    Now queries Company Database (ProductionSiteVersion) instead of Superdatabase.
    """
    permission_classes = [IsAuthenticated]

    CATEGORY_FIELD_MAP = {
        'INJECTION': INJECTION_FIELDS,
        'BLOW': BLOW_FIELDS,
        'ROTO': ROTO_FIELDS,
        'PE_FILM': PE_FILM_FIELDS,
        'SHEET': SHEET_FIELDS,
        'PIPE': PIPE_FIELDS,
        'TUBE_HOSE': TUBE_HOSE_FIELDS,
        'PROFILE': PROFILE_FIELDS,
        'CABLE': CABLE_FIELDS,
        'COMPOUNDER': COMPOUNDER_FIELDS,
        'RECYCLER': RECYCLER_FIELDS,
        'ALL': ALL_COMMONS,
    }

    # Complete list of all technical fields (IntegerField AND FloatField)
    TECHNICAL_FIELDS = [
        # General/Common
        'polymer_range_number',

        # Injection Moulding
        'minimal_lock_tonnes',
        'maximum_lock_tonnes',
        'minimum_shot_grammes',
        'maximum_shot_grammes',
        'number_of_machines',

        # Blow Moulding
        'extrusion_blow_moulding_machines',
        'injection_blow_moulding_machines',
        'injection_stretch_blow_moulding_stage_1_machines',
        'injection_stretch_blow_moulding_stage_2_machines',
        'buy_in_preform_percentage',
        'number_of_colours',

        # PE Film Extrusion
        'minimum_width_mm',
        'maximum_width_mm',
        'number_of_layers',
        'cast_lines',
        'blown_lines',

        # Sheet Extrusion
        'minimum_gauge_mm',
        'maximum_gauge_mm',
        'number_of_extrusion_lines',
        'number_of_coextrusion_lines',
        'number_of_calendering_lines',
        'number_of_pressed_lines',
        'number_of_lcc_line',

        # Pipe/Tube/Profile Extrusion
        'minimum_diameter_mm',
        'maximum_diameter_mm',

        # Compounding
        'compounds_percentage',
        'masterbatch_percentage',
        'twin_screw_extruders',
        'single_screw_extruders',
        'batch_mixers',
        'production_volume_number',

        # Roto Moulding
        'minimum_size',
        'maximum_size',

        # Recycling
        'number_of_recycling_lines',
        'single_screws',
        'twin_screws',
    ]

    def get(self, request, format=None):
        from .company_models import ProductionSiteVersion
        
        # Get the category from query params
        category = request.query_params.get('category', 'ALL').upper()

        # Get the fields that belong to this category
        category_fields = self.CATEGORY_FIELD_MAP.get(category, [])

        if not category_fields:
            return Response([])

        # Filter technical fields to only those in the category
        relevant_technical_fields = [
            field for field in self.TECHNICAL_FIELDS
            if field in category_fields
        ]

        if not relevant_technical_fields:
            return Response([])

        # Get the base queryset - only current versions
        base_queryset = ProductionSiteVersion.objects.filter(is_current=True)

        # Apply category filter if not ALL
        if category != 'ALL':
            categories = [c.strip() for c in category.split(',')]
            base_queryset = base_queryset.filter(
                production_site__category__in=categories
            )

        # Build aggregation queries for min/max of each technical field
        aggregation_queries = {}
        for field in relevant_technical_fields:
            aggregation_queries[f'{field}_min'] = Min(field)
            aggregation_queries[f'{field}_max'] = Max(field)

        # Get min/max values
        ranges = base_queryset.aggregate(**aggregation_queries)

        # Build response data - ALWAYS include all relevant fields for the category
        response_data = []
        for field_name in relevant_technical_fields:
            try:
                # Get the field's verbose name and type from ProductionSiteVersion
                model_field = ProductionSiteVersion._meta.get_field(field_name)
                label = model_field.verbose_name or field_name
                # Capitalize first letter
                if label:
                    label = label[0].upper() + label[1:]

                # Get field type (IntegerField or FloatField)
                field_type = model_field.get_internal_type()

            except:
                # Fallback to formatted field name
                label = field_name.replace('_', ' ').title()
                field_type = 'IntegerField'  # Default assumption

            min_val = ranges.get(f'{field_name}_min')
            max_val = ranges.get(f'{field_name}_max')

            # ALWAYS include fields for the category, even without data
            response_data.append({
                'field': field_name,
                'label': label,
                'min': min_val,
                'max': max_val,
                'type': field_type
            })

        return Response(response_data)