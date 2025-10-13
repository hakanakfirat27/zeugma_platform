from django.db.models import Q, Count
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from dateutil.relativedelta import relativedelta

from accounts.models import User, UserRole
from .models import (
    CustomReport, Subscription, SuperdatabaseRecord,
    SubscriptionPlan, SubscriptionStatus
)
from .serializers import (
    CustomReportSerializer, CustomReportListSerializer,
    SubscriptionSerializer, SubscriptionCreateSerializer,
    ClientSerializer, ReportPreviewSerializer,
    SuperdatabaseRecordSerializer
)
from .pagination import CustomPagination


class CustomReportListCreateAPIView(generics.ListCreateAPIView):
    """
    List all custom reports or create a new one.
    Staff can create reports, clients can view available reports.
    """
    permission_classes = [IsAuthenticated]
    pagination_class = CustomPagination

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return CustomReportSerializer
        return CustomReportListSerializer

    def get_queryset(self):
        user = self.request.user
        queryset = CustomReport.objects.all()

        # Clients only see active reports
        if user.role == UserRole.CLIENT:
            queryset = queryset.filter(is_active=True)

        # Filter by search query
        search = self.request.query_params.get('search', '')
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) |
                Q(description__icontains=search)
            )

        # Filter by featured
        featured = self.request.query_params.get('featured', '')
        if featured == 'true':
            queryset = queryset.filter(is_featured=True)

        return queryset

    def perform_create(self, serializer):
        # Only staff can create reports
        if self.request.user.role not in [UserRole.SUPERADMIN, UserRole.STAFF_ADMIN]:
            raise PermissionError("Only staff can create custom reports.")
        serializer.save()


class CustomReportDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update or delete a custom report.
    Only staff can update/delete.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = CustomReportSerializer
    lookup_field = 'report_id'

    def get_queryset(self):
        user = self.request.user
        queryset = CustomReport.objects.all()

        # Clients only see active reports
        if user.role == UserRole.CLIENT:
            queryset = queryset.filter(is_active=True)

        return queryset

    def update(self, request, *args, **kwargs):
        # Only staff can update
        if request.user.role not in [UserRole.SUPERADMIN, UserRole.STAFF_ADMIN]:
            return Response(
                {"error": "Only staff can update reports."},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        # Only staff can delete
        if request.user.role not in [UserRole.SUPERADMIN, UserRole.STAFF_ADMIN]:
            return Response(
                {"error": "Only staff can delete reports."},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().destroy(request, *args, **kwargs)


class ReportPreviewAPIView(APIView):
    """
    Preview a report based on filter criteria.
    Returns sample records and statistics.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        filter_criteria = request.data.get('filter_criteria', {})

        # Build query
        queryset = SuperdatabaseRecord.objects.all()

        if filter_criteria:
            filter_q = Q()
            for field, value in filter_criteria.items():
                if isinstance(value, list):
                    # Handle multiple values (OR condition)
                    field_q = Q()
                    for v in value:
                        if isinstance(v, bool):
                            field_q |= Q(**{field: v})
                        else:
                            field_q |= Q(**{f'{field}__icontains': v}) if isinstance(v, str) else Q(**{field: v})
                    filter_q &= field_q
                else:
                    if isinstance(value, bool):
                        filter_q &= Q(**{field: value})
                    else:
                        filter_q &= Q(**{f'{field}__icontains': value}) if isinstance(value, str) else Q(
                            **{field: value})

            queryset = queryset.filter(filter_q)

        total_records = queryset.count()

        # Get sample records (first 10)
        sample_records = queryset[:10]

        # Get field breakdown
        field_breakdown = {}

        # Count by category
        category_breakdown = queryset.values('category').annotate(
            count=Count('id')
        ).order_by('-count')
        field_breakdown['categories'] = list(category_breakdown)

        # Count by country (top 10)
        country_breakdown = queryset.values('country').annotate(
            count=Count('id')
        ).order_by('-count')[:10]
        field_breakdown['countries'] = list(country_breakdown)

        # Serialize response
        serializer = ReportPreviewSerializer(data={
            'total_records': total_records,
            'filter_criteria': filter_criteria,
            'sample_records': sample_records,
            'field_breakdown': field_breakdown
        })
        serializer.is_valid()

        return Response({
            'total_records': total_records,
            'filter_criteria': filter_criteria,
            'sample_records': SuperdatabaseRecordSerializer(sample_records, many=True).data,
            'field_breakdown': field_breakdown
        })


class ReportRecordsAPIView(generics.ListAPIView):
    """
    Get all records for a specific custom report.
    Clients can only access reports they have active subscriptions to.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = SuperdatabaseRecordSerializer
    pagination_class = CustomPagination

    def get_queryset(self):
        report_id = self.kwargs.get('report_id')
        user = self.request.user

        try:
            report = CustomReport.objects.get(report_id=report_id)
        except CustomReport.DoesNotExist:
            return SuperdatabaseRecord.objects.none()

        # Check if client has active subscription
        if user.role == UserRole.CLIENT:
            has_subscription = Subscription.objects.filter(
                client=user,
                report=report,
                status=SubscriptionStatus.ACTIVE,
                start_date__lte=timezone.now().date(),
                end_date__gte=timezone.now().date()
            ).exists()

            if not has_subscription:
                return SuperdatabaseRecord.objects.none()

        # Return filtered records
        return report.get_filtered_records()


# ============= SUBSCRIPTION VIEWS =============

class SubscriptionListCreateAPIView(generics.ListCreateAPIView):
    """
    List all subscriptions or create a new one.
    Staff can see all, clients see only their own.
    """
    permission_classes = [IsAuthenticated]
    pagination_class = CustomPagination

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return SubscriptionCreateSerializer
        return SubscriptionSerializer

    def get_queryset(self):
        user = self.request.user
        queryset = Subscription.objects.select_related('client', 'report')

        # Clients only see their own subscriptions
        if user.role == UserRole.CLIENT:
            queryset = queryset.filter(client=user)

        # Filter by status
        status_filter = self.request.query_params.get('status', '')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        # Filter by report
        report_id = self.request.query_params.get('report_id', '')
        if report_id:
            queryset = queryset.filter(report__report_id=report_id)

        # Filter by client
        client_id = self.request.query_params.get('client_id', '')
        if client_id and user.role in [UserRole.SUPERADMIN, UserRole.STAFF_ADMIN]:
            queryset = queryset.filter(client_id=client_id)

        return queryset

    def perform_create(self, serializer):
        # Only staff can create subscriptions
        if self.request.user.role not in [UserRole.SUPERADMIN, UserRole.STAFF_ADMIN]:
            raise PermissionError("Only staff can create subscriptions.")

        serializer.save()


class SubscriptionDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update or delete a subscription.
    Clients can view their own, staff can manage all.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = SubscriptionSerializer
    lookup_field = 'subscription_id'

    def get_queryset(self):
        user = self.request.user
        queryset = Subscription.objects.select_related('client', 'report')

        # Clients only see their own subscriptions
        if user.role == UserRole.CLIENT:
            queryset = queryset.filter(client=user)

        return queryset

    def update(self, request, *args, **kwargs):
        # Only staff can update
        if request.user.role not in [UserRole.SUPERADMIN, UserRole.STAFF_ADMIN]:
            return Response(
                {"error": "Only staff can update subscriptions."},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        # Only staff can delete
        if request.user.role not in [UserRole.SUPERADMIN, UserRole.STAFF_ADMIN]:
            return Response(
                {"error": "Only staff can delete subscriptions."},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().destroy(request, *args, **kwargs)


class MySubscriptionsAPIView(generics.ListAPIView):
    """
    Get current user's subscriptions
    """
    permission_classes = [IsAuthenticated]
    serializer_class = SubscriptionSerializer
    pagination_class = CustomPagination

    def get_queryset(self):
        return Subscription.objects.filter(
            client=self.request.user
        ).select_related('report').order_by('-created_at')


class MyActiveReportsAPIView(generics.ListAPIView):
    """
    Get reports that the current user has active subscriptions to
    """
    permission_classes = [IsAuthenticated]
    serializer_class = CustomReportListSerializer

    def get_queryset(self):
        user = self.request.user

        # Get reports with active subscriptions
        active_subscription_report_ids = Subscription.objects.filter(
            client=user,
            status=SubscriptionStatus.ACTIVE,
            start_date__lte=timezone.now().date(),
            end_date__gte=timezone.now().date()
        ).values_list('report_id', flat=True)

        return CustomReport.objects.filter(
            id__in=active_subscription_report_ids,
            is_active=True
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def renew_subscription(request, subscription_id):
    """
    Renew a subscription
    """
    # Only staff can renew subscriptions
    if request.user.role not in [UserRole.SUPERADMIN, UserRole.STAFF_ADMIN]:
        return Response(
            {"error": "Only staff can renew subscriptions."},
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        subscription = Subscription.objects.get(subscription_id=subscription_id)
    except Subscription.DoesNotExist:
        return Response(
            {"error": "Subscription not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    plan = request.data.get('plan', subscription.plan)
    subscription.renew(plan=plan)

    serializer = SubscriptionSerializer(subscription)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def cancel_subscription(request, subscription_id):
    """
    Cancel a subscription
    """
    # Only staff can cancel subscriptions
    if request.user.role not in [UserRole.SUPERADMIN, UserRole.STAFF_ADMIN]:
        return Response(
            {"error": "Only staff can cancel subscriptions."},
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        subscription = Subscription.objects.get(subscription_id=subscription_id)
    except Subscription.DoesNotExist:
        return Response(
            {"error": "Subscription not found."},
            status=status.HTTP_404_NOT_FOUND
        )

    subscription.cancel()

    serializer = SubscriptionSerializer(subscription)
    return Response(serializer.data)


class ClientListAPIView(generics.ListAPIView):
    """
    List all client users.
    Only accessible by staff.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = ClientSerializer
    pagination_class = CustomPagination

    def get_queryset(self):
        # Only staff can access
        if self.request.user.role not in [UserRole.SUPERADMIN, UserRole.STAFF_ADMIN]:
            return User.objects.none()

        queryset = User.objects.filter(role=UserRole.CLIENT)

        # Search by name or email
        search = self.request.query_params.get('search', '')
        if search:
            queryset = queryset.filter(
                Q(username__icontains=search) |
                Q(email__icontains=search) |
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search)
            )

        return queryset.order_by('username')


class SubscriptionStatsAPIView(APIView):
    """
    Get subscription statistics for dashboard
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Only staff can access
        if request.user.role not in [UserRole.SUPERADMIN, UserRole.STAFF_ADMIN]:
            return Response(
                {"error": "Only staff can access statistics."},
                status=status.HTTP_403_FORBIDDEN
            )

        today = timezone.now().date()

        # Total subscriptions
        total_subscriptions = Subscription.objects.count()

        # Active subscriptions
        active_subscriptions = Subscription.objects.filter(
            status=SubscriptionStatus.ACTIVE,
            start_date__lte=today,
            end_date__gte=today
        ).count()

        # Expiring soon (within 30 days)
        expiring_soon = Subscription.objects.filter(
            status=SubscriptionStatus.ACTIVE,
            end_date__gte=today,
            end_date__lte=today + timezone.timedelta(days=30)
        ).count()

        # Monthly revenue (active subscriptions)
        from django.db.models import Sum
        from decimal import Decimal

        monthly_subscriptions = Subscription.objects.filter(
            status=SubscriptionStatus.ACTIVE,
            plan=SubscriptionPlan.MONTHLY,
            start_date__lte=today,
            end_date__gte=today
        )
        monthly_revenue = monthly_subscriptions.aggregate(
            total=Sum('amount_paid')
        )['total'] or Decimal('0.00')

        # Annual revenue (active subscriptions divided by 12)
        annual_subscriptions = Subscription.objects.filter(
            status=SubscriptionStatus.ACTIVE,
            plan=SubscriptionPlan.ANNUAL,
            start_date__lte=today,
            end_date__gte=today
        )
        annual_revenue = annual_subscriptions.aggregate(
            total=Sum('amount_paid')
        )['total'] or Decimal('0.00')
        annual_monthly_equivalent = annual_revenue / 12

        total_monthly_revenue = monthly_revenue + annual_monthly_equivalent

        # Top reports by subscription count
        top_reports = CustomReport.objects.annotate(
            active_subscription_count=Count(
                'subscriptions',
                filter=Q(
                    subscriptions__status=SubscriptionStatus.ACTIVE,
                    subscriptions__start_date__lte=today,
                    subscriptions__end_date__gte=today
                )
            )
        ).filter(active_subscription_count__gt=0).order_by('-active_subscription_count')[:5]

        top_reports_data = [
            {
                'report_id': str(report.report_id),
                'title': report.title,
                'subscription_count': report.active_subscription_count
            }
            for report in top_reports
        ]

        return Response({
            'total_subscriptions': total_subscriptions,
            'active_subscriptions': active_subscriptions,
            'expiring_soon': expiring_soon,
            'monthly_revenue': float(total_monthly_revenue),
            'top_reports': top_reports_data
        })