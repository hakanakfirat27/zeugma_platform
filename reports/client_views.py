from django.db.models import Q, Count
from django.utils import timezone
from django.http import HttpResponse
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from accounts.models import UserRole
from .models import Subscription, CustomReport, SuperdatabaseRecord, SubscriptionStatus
from .serializers import SuperdatabaseRecordSerializer
from .pagination import CustomPagination
from .filters import SuperdatabaseRecordFilter
import csv

import datetime
from .fields import (
    COMMON_FIELDS,
    CONTACT_FIELDS,
    INJECTION_FIELDS,
    BLOW_FIELDS,
    ROTO_FIELDS,
    PE_FILM_FIELDS,
    SHEET_FIELDS,
    PIPE_FIELDS,
    TUBE_HOSE_FIELDS,
    PROFILE_FIELDS,
    CABLE_FIELDS,
    COMPOUNDER_FIELDS
)

class ClientSubscriptionsAPIView(APIView):
    """
    Returns all active subscriptions for the authenticated client user.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Only allow clients to access this
        if request.user.role != UserRole.CLIENT:
            return Response(
                {"error": "Only clients can access this endpoint"},
                status=status.HTTP_403_FORBIDDEN
            )

        today = timezone.now().date()

        # Get all active subscriptions using the status field AND date check
        subscriptions = Subscription.objects.filter(
            client=request.user,
            status=SubscriptionStatus.ACTIVE,
            start_date__lte=today,
            end_date__gte=today
        ).select_related('report')

        data = []
        for sub in subscriptions:
            data.append({
                'id': sub.id,
                'report_id': str(sub.report.report_id),
                'report_title': sub.report.title,
                'report_description': sub.report.description,
                'start_date': sub.start_date,
                'end_date': sub.end_date,
                'is_active': sub.is_active,
                'days_remaining': (sub.end_date - datetime.date.today()).days,
                'plan': sub.plan,
                'amount_paid': float(sub.amount_paid) if sub.amount_paid else 0
            })

        return Response(data)


class ClientReportDataAPIView(generics.ListAPIView):
    """
    Returns filtered database records based on the client's purchased report criteria.
    Supports all the same filtering, searching, and sorting as Superdatabase.
    """
    serializer_class = SuperdatabaseRecordSerializer
    pagination_class = CustomPagination
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = SuperdatabaseRecordFilter
    search_fields = ['company_name']
    ordering_fields = ['company_name', 'country', 'last_updated']
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Only allow clients to access this
        if self.request.user.role != UserRole.CLIENT:
            return SuperdatabaseRecord.objects.none()

        # Get report_id from query params
        report_id = self.request.query_params.get('report_id')

        if not report_id:
            return SuperdatabaseRecord.objects.none()

        try:
            # Verify the client has an active subscription to this report
            today = timezone.now().date()
            subscription = Subscription.objects.get(
                client=self.request.user,
                report__report_id=report_id,
                status=SubscriptionStatus.ACTIVE,
                start_date__lte=today,
                end_date__gte=today
            )
        except Subscription.DoesNotExist:
            return SuperdatabaseRecord.objects.none()

        # Get the report's filter criteria
        report = subscription.report
        filter_criteria = report.filter_criteria or {}

        # Start with all records
        queryset = SuperdatabaseRecord.objects.all()

        # Apply report's base filter criteria
        filter_q = Q()
        for field, value in filter_criteria.items():
            if field == 'categories':
                if isinstance(value, list) and len(value) > 0:
                    filter_q &= Q(category__in=value)
                elif isinstance(value, str) and value:
                    filter_q &= Q(category=value)
                continue

            if value is not None:
                if isinstance(value, list):
                    if len(value) > 0:
                        filter_q &= Q(**{f"{field}__in": value})
                else:
                    filter_q &= Q(**{field: value})

        if filter_q:
            queryset = queryset.filter(filter_q)

        # Handle additional category filter from user (not from report criteria)
        categories_param = self.request.query_params.get('categories')
        if categories_param:
            # This is when user selects specific categories in the filter sidebar
            category_list = [c.strip() for c in categories_param.split(',') if c.strip()]
            if category_list:
                queryset = queryset.filter(category__in=category_list)

        # Apply other filters (search, ordering, etc.)
        filterset = SuperdatabaseRecordFilter(self.request.GET, queryset=queryset)
        queryset = filterset.qs

        return queryset


class ClientReportStatsAPIView(APIView):
    """
    Returns statistics for a specific client report, similar to DatabaseStatsAPIView
    but filtered by the report's criteria.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Only allow clients to access this
        if request.user.role != UserRole.CLIENT:
            return Response(
                {"error": "Only clients can access this endpoint"},
                status=status.HTTP_403_FORBIDDEN
            )

        report_id = request.query_params.get('report_id')

        if not report_id:
            return Response(
                {"error": "report_id is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Verify the client has an active subscription
            today = timezone.now().date()
            subscription = Subscription.objects.get(
                client=request.user,
                report__report_id=report_id,
                status=SubscriptionStatus.ACTIVE,
                start_date__lte=today,
                end_date__gte=today
            )
        except Subscription.DoesNotExist:
            return Response(
                {"error": "No active subscription found for this report"},
                status=status.HTTP_403_FORBIDDEN
            )

        # Get the report's filter criteria
        report = subscription.report
        filter_criteria = report.filter_criteria or {}

        # Build BASE queryset with ONLY report criteria (not user filters)
        base_queryset = SuperdatabaseRecord.objects.all()

        filter_q = Q()
        for field, value in filter_criteria.items():
            if field == 'categories':
                if isinstance(value, list) and len(value) > 0:
                    filter_q &= Q(category__in=value)
                elif isinstance(value, str) and value:
                    filter_q &= Q(category=value)
                continue

            if value is not None:
                if isinstance(value, list):
                    if len(value) > 0:
                        filter_q &= Q(**{f"{field}__in": value})
                else:
                    filter_q &= Q(**{field: value})

        if filter_q:
            base_queryset = base_queryset.filter(filter_q)

        # Get available categories from BASE queryset (before user filters)
        # This ensures all categories in the report stay visible in the filter
        available_categories = list(
            base_queryset.values_list('category', flat=True).distinct().order_by('category')
        )

        # NOW apply user filters for stats calculation
        queryset = base_queryset

        # Handle additional category filter from user
        categories_param = request.query_params.get('categories')
        if categories_param:
            category_list = [c.strip() for c in categories_param.split(',') if c.strip()]
            if category_list:
                queryset = queryset.filter(category__in=category_list)

        # Apply additional user filters from request
        filterset = SuperdatabaseRecordFilter(request.GET, queryset=queryset)
        queryset = filterset.qs

        # Calculate stats on FILTERED queryset
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

        # Get category distribution from FILTERED queryset
        categories_data = queryset.values('category').annotate(
            count=Count('id')
        ).order_by('-count')

        return Response({
            'total_count': total_count,
            'countries_count': countries_count,
            'top_countries': [
                {'name': item['country'], 'count': item['count']}
                for item in top_countries
            ],
            'all_countries': all_countries,
            'categories': list(categories_data),
            'available_categories': available_categories,  # From BASE queryset
        })


class ClientFilterOptionsAPIView(APIView):
    """
    Provides filter options for a specific client report.
    Similar to FilterOptionsAPIView but respects the report's base criteria.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Only allow clients to access this
        if request.user.role != UserRole.CLIENT:
            return Response(
                {"error": "Only clients can access this endpoint"},
                status=status.HTTP_403_FORBIDDEN
            )

        report_id = request.query_params.get('report_id')

        if not report_id:
            return Response([], status=status.HTTP_200_OK)

        try:
            # Verify the client has an active subscription
            today = timezone.now().date()
            subscription = Subscription.objects.get(
                client=request.user,
                report__report_id=report_id,
                status=SubscriptionStatus.ACTIVE,
                start_date__lte=today,
                end_date__gte=today
            )
        except Subscription.DoesNotExist:
            return Response([], status=status.HTTP_200_OK)

        # Get the report's filter criteria
        report = subscription.report
        filter_criteria = report.filter_criteria or {}

        # Start with base queryset filtered by report criteria
        queryset = SuperdatabaseRecord.objects.all()

        # Apply ONLY the report's base filter criteria (not user's additional filters)
        filter_q = Q()
        for field, value in filter_criteria.items():
            if field == 'categories':
                if isinstance(value, list) and len(value) > 0:
                    filter_q &= Q(category__in=value)
                elif isinstance(value, str) and value:
                    filter_q &= Q(category=value)
                continue

            if value is not None:
                if isinstance(value, list):
                    if len(value) > 0:
                        filter_q &= Q(**{f"{field}__in": value})
                else:
                    filter_q &= Q(**{field: value})

        if filter_q:
            queryset = queryset.filter(filter_q)

        # Get all boolean fields from the model
        boolean_model_fields = {
            f.name for f in SuperdatabaseRecord._meta.get_fields()
            if f.get_internal_type() == 'BooleanField'
        }

        # Calculate counts for each boolean field
        aggregation_queries = {
            f'{field}_count': Count('pk', filter=Q(**{f'{field}': True}))
            for field in boolean_model_fields
        }
        counts = queryset.aggregate(**aggregation_queries)

        # Build response - include ALL fields, even those with 0 count
        response_data = []
        for field_name in sorted(boolean_model_fields):
            count = counts.get(f'{field_name}_count', 0)

            # Get the verbose name from the model
            try:
                label = SuperdatabaseRecord._meta.get_field(field_name).verbose_name or field_name
                if label:
                    label = label[0].upper() + label[1:]
            except:
                label = field_name.replace('_', ' ').title()

            response_data.append({
                "field": field_name,
                "label": label,
                "count": count
            })

        # Sort by count descending, then by label
        response_data.sort(key=lambda x: (-x['count'], x['label']))

        return Response(response_data)


class ClientReportExportAPIView(APIView):
    """
    Export client report data to CSV format.
    Clients can export their purchased report data with applied filters.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Only allow clients to access this
        if request.user.role != UserRole.CLIENT:
            return Response(
                {"error": "Only clients can access this endpoint"},
                status=status.HTTP_403_FORBIDDEN
            )

        report_id = request.query_params.get('report_id')

        if not report_id:
            return Response(
                {"error": "report_id is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Verify the client has an active subscription
            today = timezone.now().date()
            subscription = Subscription.objects.get(
                client=request.user,
                report__report_id=report_id,
                status=SubscriptionStatus.ACTIVE,
                start_date__lte=today,
                end_date__gte=today
            )
        except Subscription.DoesNotExist:
            return Response(
                {"error": "No active subscription found for this report"},
                status=status.HTTP_403_FORBIDDEN
            )

        # Get the report's filter criteria
        report = subscription.report
        filter_criteria = report.filter_criteria or {}

        # Build base queryset with report criteria
        queryset = SuperdatabaseRecord.objects.all()

        filter_q = Q()
        for field, value in filter_criteria.items():
            if field == 'categories':
                if isinstance(value, list) and len(value) > 0:
                    filter_q &= Q(category__in=value)
                elif isinstance(value, str) and value:
                    filter_q &= Q(category=value)
                continue

            if value is not None:
                if isinstance(value, list):
                    if len(value) > 0:
                        filter_q &= Q(**{f"{field}__in": value})
                else:
                    filter_q &= Q(**{field: value})

        if filter_q:
            queryset = queryset.filter(filter_q)

        # Handle category filter from user
        categories_param = request.query_params.get('categories')
        if categories_param:
            category_list = [c.strip() for c in categories_param.split(',') if c.strip()]
            if category_list:
                queryset = queryset.filter(category__in=category_list)

        # Apply additional user filters from request
        filterset = SuperdatabaseRecordFilter(request.GET, queryset=queryset)
        queryset = filterset.qs

        # Limit export to prevent abuse (max 10000 records)
        max_records = 10000
        if queryset.count() > max_records:
            return Response(
                {
                    "error": f"Export limited to {max_records} records. Please apply more filters.",
                    "current_count": queryset.count()
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create CSV response
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="{report.title.replace(" ", "_")}_export.csv"'

        writer = csv.writer(response)

        # Define export columns
        export_fields = [
            'company_name', 'category', 'country', 'region',
            'address_1', 'address_2', 'phone_number', 'company_email', 'website',
            'main_materials', 'main_applications', 'last_updated'
        ]

        # Write header
        header = [field.replace('_', ' ').title() for field in export_fields]
        writer.writerow(header)

        # Write data rows
        for record in queryset:
            row = []
            for field in export_fields:
                value = getattr(record, field, '')

                # Format special fields
                if field == 'category':
                    value = record.get_category_display() if hasattr(record, 'get_category_display') else value
                elif field == 'last_updated':
                    value = value.strftime('%Y-%m-%d') if value else ''

                row.append(value if value else '')

            writer.writerow(row)

        # Add footer with export info
        writer.writerow([])
        writer.writerow(['Export Information'])
        writer.writerow(['Report', report.title])
        writer.writerow(['Exported by', request.user.username])
        writer.writerow(['Export date', timezone.now().strftime('%Y-%m-%d %H:%M:%S')])
        writer.writerow(['Total records', queryset.count()])

        return response


class ClientReportColumnsAPIView(APIView):
    """
    Get available columns for a specific report.
    Returns columns based on the CURRENT filter criteria (what user has filtered).
    Uses the existing fields.py definitions for consistency.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get available columns for export based on current filters"""

        if request.user.role != UserRole.CLIENT:
            return Response(
                {"error": "Only clients can access this endpoint"},
                status=status.HTTP_403_FORBIDDEN
            )

        report_id = request.query_params.get('report_id')

        if not report_id:
            return Response(
                {"error": "report_id is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            report = CustomReport.objects.get(report_id=report_id)
        except CustomReport.DoesNotExist:
            return Response(
                {"error": "Report not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        # Verify access
        today = timezone.now().date()
        has_subscription = Subscription.objects.filter(
            client=request.user,
            report=report,
            status='ACTIVE',
            start_date__lte=today,
            end_date__gte=today
        ).exists()

        if not has_subscription:
            return Response(
                {"error": "You don't have access to this report"},
                status=status.HTTP_403_FORBIDDEN
            )

        # IMPORTANT: Get categories from CURRENT USER FILTERS (not report filters)
        categories_param = request.query_params.get('categories', '')

        if categories_param:
            # User has filtered specific categories
            categories = [c.strip() for c in categories_param.split(',') if c.strip()]
        else:
            # No category filter applied - use all categories from report
            filter_criteria = report.filter_criteria or {}

            if 'categories' in filter_criteria:
                if isinstance(filter_criteria['categories'], list):
                    categories = filter_criteria['categories']
                elif isinstance(filter_criteria['categories'], str):
                    categories = [filter_criteria['categories']]
                else:
                    categories = []
            else:
                # Get all categories from actual data
                queryset = SuperdatabaseRecord.objects.all()

                # Apply report filters
                filter_q = Q()
                for field, value in filter_criteria.items():
                    if field == 'categories':
                        continue
                    if value is not None:
                        if isinstance(value, list):
                            if len(value) > 0:
                                filter_q &= Q(**{f"{field}__in": value})
                        else:
                            filter_q &= Q(**{field: value})

                if filter_q:
                    queryset = queryset.filter(filter_q)

                categories = list(queryset.values_list('category', flat=True).distinct())

        # Get model field labels
        field_labels = {
            field.name: field.verbose_name
            for field in SuperdatabaseRecord._meta.fields
        }

        # Map categories to their field lists
        CATEGORY_FIELDS_MAP = {
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
        }

        # Map categories to human-readable names
        CATEGORY_DISPLAY_NAMES = {
            'INJECTION': 'Injection Molding',
            'BLOW': 'Blow Molding',
            'ROTO': 'Rotomolding',
            'PE_FILM': 'PE Film',
            'SHEET': 'Sheet',
            'PIPE': 'Pipe',
            'TUBE_HOSE': 'Tube & Hose',
            'PROFILE': 'Profile',
            'CABLE': 'Cable',
            'COMPOUNDER': 'Compounder',
        }

        # Collect all field keys that will be needed (to avoid duplicates)
        all_field_keys = set()

        # Add common fields first
        for field_key in COMMON_FIELDS:
            all_field_keys.add(field_key)

        # Add contact fields
        for field_key in CONTACT_FIELDS:
            all_field_keys.add(field_key)

        # Add category-specific fields
        for cat in categories:
            if cat in CATEGORY_FIELDS_MAP:
                for field_key in CATEGORY_FIELDS_MAP[cat]:
                    all_field_keys.add(field_key)

        # Now build the column list with proper categorization
        # We'll organize by: Common -> Contact -> Category-specific
        available_columns = []

        # 1. Add Common fields (only once)
        for field_key in COMMON_FIELDS:
            if field_key in all_field_keys:
                available_columns.append({
                    'key': field_key,
                    'label': field_labels.get(field_key, field_key.replace('_', ' ').title()),
                    'category': 'Common'
                })

        # 2. Add Contact fields (only once)
        for field_key in CONTACT_FIELDS:
            if field_key in all_field_keys:
                available_columns.append({
                    'key': field_key,
                    'label': field_labels.get(field_key, field_key.replace('_', ' ').title()),
                    'category': 'Contact'
                })

        # 3. Add category-specific fields (grouped by category)
        added_keys = {col['key'] for col in available_columns}  # Track what we've added

        for cat in categories:
            if cat in CATEGORY_FIELDS_MAP:
                category_display = CATEGORY_DISPLAY_NAMES.get(cat, cat)

                for field_key in CATEGORY_FIELDS_MAP[cat]:
                    # Skip if already added (from common/contact fields)
                    if field_key in added_keys:
                        continue

                    available_columns.append({
                        'key': field_key,
                        'label': field_labels.get(field_key, field_key.replace('_', ' ').title()),
                        'category': category_display
                    })
                    added_keys.add(field_key)

        # Define smart default columns (most commonly used)
        default_columns = [
            'company_name',
            'country',
            'address_1',
            'region',
            'phone_number',
            'company_email',
            'website'
        ]

        # Filter default columns to only include ones that exist in available columns
        available_keys = {col['key'] for col in available_columns}
        default_columns = [col for col in default_columns if col in available_keys]

        return Response({
            'available_columns': available_columns,
            'default_columns': default_columns,
            'report_title': report.title,
            'report_categories': categories,
            'total_fields': len(available_columns)
        })