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
                'report_id': str(sub.report.report_id),  # ✅ FIXED: Use report_id UUID
                'report_title': sub.report.title,
                'report_description': sub.report.description,
                'start_date': sub.start_date,
                'end_date': sub.end_date,
                'is_active': sub.is_active,
                'days_remaining': (sub.end_date - today).days,
                'plan': sub.plan,  # Added plan info
                'amount_paid': float(sub.amount_paid) if sub.amount_paid else 0  # Added pricing
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
    search_fields = ['company_name', 'country', 'region']
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
                report__report_id=report_id,  # ✅ FIXED: Use report_id for lookup
                status=SubscriptionStatus.ACTIVE,  # ✅ FIXED: Check status field
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

        # Apply report's filter criteria
        # The filter_criteria is a JSON object like:
        # {"country": "Germany", "pvc": True, "category": "INJECTION"}
        filter_q = Q()
        for field, value in filter_criteria.items():
            if value is not None:
                # Handle list values (multiple countries, etc.)
                if isinstance(value, list):
                    if len(value) > 0:
                        filter_q &= Q(**{f"{field}__in": value})
                else:
                    filter_q &= Q(**{field: value})

        if filter_q:
            queryset = queryset.filter(filter_q)

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
                report__report_id=report_id,  # ✅ FIXED: Use report_id
                status=SubscriptionStatus.ACTIVE,  # ✅ FIXED: Check status
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
            if value is not None:
                # Handle list values
                if isinstance(value, list):
                    if len(value) > 0:
                        filter_q &= Q(**{f"{field}__in": value})
                else:
                    filter_q &= Q(**{field: value})

        if filter_q:
            queryset = queryset.filter(filter_q)

        # Apply additional user filters from request
        filterset = SuperdatabaseRecordFilter(request.GET, queryset=queryset)
        queryset = filterset.qs

        # Calculate stats
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

        # Get category distribution
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
            'categories': list(categories_data)
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
                report__report_id=report_id,  # ✅ FIXED: Use report_id
                status=SubscriptionStatus.ACTIVE,  # ✅ FIXED: Check status
                start_date__lte=today,
                end_date__gte=today
            )
        except Subscription.DoesNotExist:
            return Response([], status=status.HTTP_200_OK)

        # Get the report's filter criteria
        report = subscription.report
        filter_criteria = report.filter_criteria or {}

        # Build base queryset with report criteria
        queryset = SuperdatabaseRecord.objects.all()

        filter_q = Q()
        for field, value in filter_criteria.items():
            if value is not None:
                # Handle list values
                if isinstance(value, list):
                    if len(value) > 0:
                        filter_q &= Q(**{f"{field}__in": value})
                else:
                    filter_q &= Q(**{field: value})

        if filter_q:
            queryset = queryset.filter(filter_q)

        # Apply additional filters from request
        filterset = SuperdatabaseRecordFilter(request.GET, queryset=queryset)
        queryset = filterset.qs

        # Get all boolean fields
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

        # Build response
        response_data = []
        for field_name in boolean_model_fields:
            count = counts.get(f'{field_name}_count', 0)
            if count > 0:  # Only show fields with data
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

        # Sort by count descending
        response_data.sort(key=lambda x: x['count'], reverse=True)

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
                report__report_id=report_id,  # ✅ FIXED: Use report_id
                status=SubscriptionStatus.ACTIVE,  # ✅ FIXED: Check status
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
            if value is not None:
                # Handle list values
                if isinstance(value, list):
                    if len(value) > 0:
                        filter_q &= Q(**{f"{field}__in": value})
                else:
                    filter_q &= Q(**{field: value})

        if filter_q:
            queryset = queryset.filter(filter_q)

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