from django.db.models import Q, Count
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend  # ADD THIS
from rest_framework.filters import SearchFilter, OrderingFilter  # ADD THIS
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
from .filters import SuperdatabaseRecordFilter
from notifications.services import NotificationService

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
    Supports both single category and multiple categories.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        filter_criteria = request.data.get('filter_criteria', {})
        # Start with all records
        queryset = SuperdatabaseRecord.objects.all()

        # Handle categories (can be single string or array of strings)
        if 'categories' in filter_criteria:
            categories = filter_criteria['categories']
            if isinstance(categories, list) and len(categories) > 0:
                # Multiple categories - use OR logic
                category_query = Q()
                for category in categories:
                    category_query |= Q(category__iexact=category)
                queryset = queryset.filter(category_query)
                print(f"✅ Applied multiple categories filter. Count: {queryset.count()}")
            elif isinstance(categories, str):
                # Single category as string
                queryset = queryset.filter(category__iexact=categories)
                print(f"✅ Applied single category filter. Count: {queryset.count()}")

        # Backward compatibility: handle old 'category' field (single category)
        elif 'category' in filter_criteria and filter_criteria['category']:
            queryset = queryset.filter(category__iexact=filter_criteria['category'])
            print(f"✅ Applied legacy 'category' filter. Count: {queryset.count()}")

        # Apply country filter
        if 'country' in filter_criteria:
            countries = filter_criteria['country']
            if isinstance(countries, list) and len(countries) > 0:
                queryset = queryset.filter(country__in=countries)
                print(f"🌍 Applied country filter: {countries}. Count: {queryset.count()}")

        # NEW: Handle filter groups with both boolean AND technical filters
        if 'filter_groups' in filter_criteria:
            filter_groups = filter_criteria['filter_groups']
            if isinstance(filter_groups, list):
                for group in filter_groups:
                    if not isinstance(group, dict):
                        continue

                    # Build OR query for all filters within this group
                    group_query = Q()

                    # Handle boolean filters
                    filters = group.get('filters', {})
                    if filters:
                        for field_name, field_value in filters.items():
                            try:
                                SuperdatabaseRecord._meta.get_field(field_name)

                                if field_value is True:
                                    group_query |= Q(**{field_name: True})
                                elif field_value is False:
                                    group_query |= Q(**{field_name: False}) | Q(**{f'{field_name}__isnull': True})
                            except Exception:
                                continue

                    # Handle technical filters (with equals and range modes)
                    technical_filters = group.get('technicalFilters', {})
                    if technical_filters:
                        for field_name, filter_config in technical_filters.items():
                            if not isinstance(filter_config, dict):
                                continue

                            try:
                                SuperdatabaseRecord._meta.get_field(field_name)

                                mode = filter_config.get('mode', 'range')

                                if mode == 'equals':
                                    equals_val = filter_config.get('equals', '')

                                    if equals_val != '' and equals_val is not None:
                                        try:
                                            field = SuperdatabaseRecord._meta.get_field(field_name)
                                            if field.get_internal_type() == 'FloatField':
                                                equals_val = float(equals_val)
                                            else:
                                                equals_val = int(equals_val)

                                            group_query |= Q(**{field_name: equals_val})
                                        except (ValueError, TypeError):
                                            pass

                                elif mode == 'range':
                                    min_val = filter_config.get('min', '')
                                    max_val = filter_config.get('max', '')

                                    range_query = Q()

                                    if min_val != '' and min_val is not None:
                                        try:
                                            field = SuperdatabaseRecord._meta.get_field(field_name)
                                            if field.get_internal_type() == 'FloatField':
                                                min_val = float(min_val)
                                            else:
                                                min_val = int(min_val)
                                            range_query &= Q(**{f'{field_name}__gte': min_val})
                                        except (ValueError, TypeError):
                                            pass

                                    if max_val != '' and max_val is not None:
                                        try:
                                            field = SuperdatabaseRecord._meta.get_field(field_name)
                                            if field.get_internal_type() == 'FloatField':
                                                max_val = float(max_val)
                                            else:
                                                max_val = int(max_val)
                                            range_query &= Q(**{f'{field_name}__lte': max_val})
                                        except (ValueError, TypeError):
                                            pass

                                    if range_query:
                                        group_query |= range_query

                            except Exception:
                                continue

                    # AND this group with the queryset
                    if group_query:
                        queryset = queryset.filter(group_query)
                        print(f"🔧 Applied filter group. Count: {queryset.count()}")

        # Apply remaining boolean filters (backward compatibility - not in filter_groups)
        for field, value in filter_criteria.items():
            if field not in ['category', 'categories', 'country', 'filter_groups']:
                if isinstance(value, bool):
                    queryset = queryset.filter(**{field: value})
                    print(f"🔧 Applied boolean filter {field}={value}. Count: {queryset.count()}")

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
        ).filter(country__isnull=False).order_by('-count')[:10]
        field_breakdown['countries'] = list(country_breakdown)

        return Response({
            'total_records': total_records,
            'filter_criteria': filter_criteria,
            'sample_records': SuperdatabaseRecordSerializer(sample_records, many=True).data,
            'field_breakdown': field_breakdown
        })

class ReportRecordsAPIView(generics.ListAPIView):
    """
    Get all records for a specific custom report.
    Staff can access any report. Clients can only access reports they have active subscriptions to.
    Supports multi-category filtering.
    """
    serializer_class = SuperdatabaseRecordSerializer
    pagination_class = CustomPagination
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = SuperdatabaseRecordFilter
    search_fields = ['company_name', 'country', 'region']
    ordering_fields = ['company_name', 'country', 'last_updated']
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        from accounts.models import UserRole
        import json

        # Get report_id from URL
        report_id = self.kwargs.get('report_id')

        if not report_id:
            return SuperdatabaseRecord.objects.none()

        try:
            # Get the report
            report = CustomReport.objects.get(report_id=report_id)
        except CustomReport.DoesNotExist:
            return SuperdatabaseRecord.objects.none()

        # Check permissions
        if self.request.user.role == UserRole.CLIENT:
            # Clients need an active subscription
            from django.utils import timezone
            today = timezone.now().date()

            try:
                subscription = Subscription.objects.get(
                    client=self.request.user,
                    report=report,
                    status=SubscriptionStatus.ACTIVE,
                    start_date__lte=today,
                    end_date__gte=today
                )
            except Subscription.DoesNotExist:
                return SuperdatabaseRecord.objects.none()
        elif self.request.user.role not in [UserRole.SUPERADMIN, UserRole.STAFF_ADMIN]:
            # Only staff and clients can access reports
            return SuperdatabaseRecord.objects.none()

        # Start with all records
        queryset = SuperdatabaseRecord.objects.all()

        # Apply report's filter criteria
        filter_criteria = report.filter_criteria or {}

        # ========================================
        # STEP 1: Apply report's FILTER GROUPS (if exists)
        # ========================================
        if 'filter_groups' in filter_criteria:
            filter_groups = filter_criteria['filter_groups']
            if isinstance(filter_groups, list):
                for group in filter_groups:
                    if not isinstance(group, dict) or 'filters' not in group:
                        continue

                    filters = group.get('filters', {})
                    if not filters:
                        continue

                    # Build OR query for all filters within this group
                    group_query = Q()

                    for field_name, field_value in filters.items():
                        try:
                            SuperdatabaseRecord._meta.get_field(field_name)

                            if field_value is True:
                                group_query |= Q(**{field_name: True})
                            elif field_value is False:
                                group_query |= Q(**{field_name: False}) | Q(**{f'{field_name}__isnull': True})
                        except Exception:
                            continue

                    # AND this group with the queryset
                    if group_query:
                        queryset = queryset.filter(group_query)
                        print(f"✅ Applied filter group with {len(filters)} filters")

        # ========================================
        # STEP 2: Build Q object for OTHER filters (legacy support)
        # ========================================
        filter_q = Q()

        # Handle categories (can be single string or array of strings)
        if 'categories' in filter_criteria:
            categories = filter_criteria['categories']
            if isinstance(categories, list) and len(categories) > 0:
                # Multiple categories - use OR logic
                category_query = Q()
                for category in categories:
                    category_query |= Q(category__iexact=category)
                filter_q &= category_query
            elif isinstance(categories, str):
                # Single category as string
                filter_q &= Q(category__iexact=categories)
        # Backward compatibility: handle old 'category' field (single category)
        elif 'category' in filter_criteria and filter_criteria['category']:
            filter_q &= Q(category__iexact=filter_criteria['category'])
        # Handle country filter
        if 'country' in filter_criteria:
            countries = filter_criteria['country']
            if isinstance(countries, list) and len(countries) > 0:
                filter_q &= Q(country__in=countries)
        # NEW: Handle filter groups with both boolean AND technical filters
        if 'filter_groups' in filter_criteria:
            filter_groups = filter_criteria['filter_groups']
            if isinstance(filter_groups, list):
                for group in filter_groups:
                    if not isinstance(group, dict):
                        continue

                    # Build OR query for all filters within this group
                    group_query = Q()

                    # Handle boolean filters
                    filters = group.get('filters', {})
                    if filters:
                        for field_name, field_value in filters.items():
                            try:
                                SuperdatabaseRecord._meta.get_field(field_name)

                                if field_value is True:
                                    group_query |= Q(**{field_name: True})
                                elif field_value is False:
                                    group_query |= Q(**{field_name: False}) | Q(**{f'{field_name}__isnull': True})
                            except Exception:
                                continue

                    # Handle technical filters (with equals and range modes)
                    technical_filters = group.get('technicalFilters', {})
                    if technical_filters:
                        for field_name, filter_config in technical_filters.items():
                            if not isinstance(filter_config, dict):
                                continue

                            try:
                                SuperdatabaseRecord._meta.get_field(field_name)

                                mode = filter_config.get('mode', 'range')

                                if mode == 'equals':
                                    equals_val = filter_config.get('equals', '')

                                    if equals_val != '' and equals_val is not None:
                                        try:
                                            field = SuperdatabaseRecord._meta.get_field(field_name)
                                            if field.get_internal_type() == 'FloatField':
                                                equals_val = float(equals_val)
                                            else:
                                                equals_val = int(equals_val)

                                            group_query |= Q(**{field_name: equals_val})
                                        except (ValueError, TypeError):
                                            pass

                                elif mode == 'range':
                                    min_val = filter_config.get('min', '')
                                    max_val = filter_config.get('max', '')

                                    range_query = Q()

                                    if min_val != '' and min_val is not None:
                                        try:
                                            field = SuperdatabaseRecord._meta.get_field(field_name)
                                            if field.get_internal_type() == 'FloatField':
                                                min_val = float(min_val)
                                            else:
                                                min_val = int(min_val)
                                            range_query &= Q(**{f'{field_name}__gte': min_val})
                                        except (ValueError, TypeError):
                                            pass

                                    if max_val != '' and max_val is not None:
                                        try:
                                            field = SuperdatabaseRecord._meta.get_field(field_name)
                                            if field.get_internal_type() == 'FloatField':
                                                max_val = float(max_val)
                                            else:
                                                max_val = int(max_val)
                                            range_query &= Q(**{f'{field_name}__lte': max_val})
                                        except (ValueError, TypeError):
                                            pass

                                    if range_query:
                                        group_query |= range_query

                            except Exception:
                                continue

                    # AND this group with the queryset
                    if group_query:
                        queryset = queryset.filter(group_query)
                        print(f"🔧 Applied filter group. Count: {queryset.count()}")

        # Handle all other filters (materials, properties, etc.)
        for field, value in filter_criteria.items():
            # Skip already processed fields
            if field in ['category', 'categories', 'country', 'filter_groups']:
                continue

            if value is not None:
                if isinstance(value, bool):
                    # Boolean filter
                    filter_q &= Q(**{field: value})
                elif isinstance(value, list):
                    # List of values
                    if len(value) > 0:
                        filter_q &= Q(**{f"{field}__in": value})
        # Apply all filters
        if filter_q:
            queryset = queryset.filter(filter_q)

        # ========================================
        # STEP 3: Apply USER'S FILTER GROUPS (from query params)
        # ========================================
        user_filter_groups_param = self.request.query_params.get('filter_groups')
        if user_filter_groups_param:
            try:
                user_filter_groups = json.loads(user_filter_groups_param)
                if isinstance(user_filter_groups, list):
                    for group in user_filter_groups:
                        if not isinstance(group, dict) or 'filters' not in group:
                            continue

                        filters = group.get('filters', {})
                        if not filters:
                            continue

                        # Build OR query for all filters within this group
                        group_query = Q()

                        for field_name, field_value in filters.items():
                            try:
                                SuperdatabaseRecord._meta.get_field(field_name)

                                if field_value is True:
                                    group_query |= Q(**{field_name: True})
                                elif field_value is False:
                                    group_query |= Q(**{field_name: False}) | Q(**{f'{field_name}__isnull': True})
                            except Exception:
                                continue

                        # AND this group with the queryset
                        if group_query:
                            queryset = queryset.filter(group_query)
                            print(f"✅ Applied user filter group with {len(filters)} filters")
            except (json.JSONDecodeError, TypeError):
                pass

        count = queryset.count()
        return queryset

# ============= SUBSCRIPTION VIEWS =============

class SubscriptionListCreateAPIView(generics.ListCreateAPIView):
    """
    List all subscriptions or create a new one.
    Staff can see all, clients see only their own.
    """
    permission_classes = [IsAuthenticated]
    pagination_class = CustomPagination

    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status']
    search_fields = ['client__username', 'client__email', 'report__title', 'plan']
    ordering_fields = [
        'client__username', 'report__title', 'plan', 'status',
        'start_date', 'end_date', 'created_at'
    ]

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

        # Filter by status is now handled by DjangoFilterBackend

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

        # Save the subscription
        subscription = serializer.save()

        # 🔔 CREATE NOTIFICATIONS FOR THE CLIENT
        try:
            # Always create report notification
            NotificationService.create_report_notification(
                user=subscription.client,
                report_id=subscription.report.id,
                report_title=subscription.report.title
            )

            # Calculate days remaining
            days_remaining = (subscription.end_date - timezone.now().date()).days

            # Create subscription renewal reminder based on plan type
            should_notify = False

            if subscription.plan == SubscriptionPlan.ANNUAL:
                # Only notify if less than 30 days remaining for annual subscriptions
                if days_remaining <= 30:
                    should_notify = True
            elif subscription.plan == SubscriptionPlan.MONTHLY:
                # Only notify if less than 15 days remaining for monthly subscriptions
                if days_remaining <= 15:
                    should_notify = True

            if should_notify:
                NotificationService.create_subscription_expiry_notification(
                    user=subscription.client,
                    subscription_id=subscription.id,
                    days_remaining=days_remaining
                )
                print(
                    f"✅ Subscription renewal reminder created for {subscription.client.username} ({days_remaining} days remaining)")
            else:
                print(
                    f"ℹ️ No renewal reminder needed for {subscription.client.username} ({days_remaining} days remaining)")
        except Exception as e:
            print(f"❌ Error creating notification: {str(e)}")

class SubscriptionDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update or delete a subscription.
    Clients can view their own, staff can manage all.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = SubscriptionSerializer
    lookup_field = 'subscription_id'

    def get_serializer_class(self):
        """
        Use SubscriptionCreateSerializer for updates (PUT/PATCH)
        and SubscriptionSerializer for retrieval (GET).
        """
        if self.request.method == 'PUT' or self.request.method == 'PATCH':
            return SubscriptionCreateSerializer
        return SubscriptionSerializer

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

        # --- FIX 1: Partial update (PATCH) is allowed, use full update (PUT) logic ---
        # We need to provide the instance to the serializer
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        if getattr(instance, '_prefetched_objects_cache', None):
            # If 'prefetch_related' has been used, we need to
            # forcibly invalidate the prefetch cache on the instance.
            instance._prefetched_objects_cache = {}

        # Return the detailed view, not the update view
        return Response(SubscriptionSerializer(instance).data)

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

        total_clients = Subscription.objects.values("client").distinct().count()

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
            'total_clients': total_clients,
            'top_reports': top_reports_data
        })

class ClientSearchAPIView(generics.ListAPIView):
    """
    Server-side search endpoint for clients.
    Used in subscription creation modal for searching through large client lists.

    Query params:
    - q: search term (searches name, email, company, username)

    Example: /api/clients/search/?q=john
    """
    serializer_class = ClientSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Only staff can search clients
        if self.request.user.role not in [UserRole.SUPERADMIN, UserRole.STAFF_ADMIN]:
            return User.objects.none()

        # Get search term from query parameters
        search_term = self.request.query_params.get('q', '').strip()

        # Base queryset - only clients
        queryset = User.objects.filter(role=UserRole.CLIENT)

        # Apply search filter if search term provided
        if search_term:
            queryset = queryset.filter(
                Q(full_name__icontains=search_term) |
                Q(email__icontains=search_term) |
                Q(company_name__icontains=search_term) |
                Q(username__icontains=search_term)
            )

        # Order by name for consistent results
        queryset = queryset.order_by('full_name', 'username')

        # Limit to 20 results for performance
        return queryset[:20]

class ReportSearchAPIView(generics.ListAPIView):
    """
    Server-side search endpoint for reports.
    Used in subscription creation modal for searching through large report lists.

    Query params:
    - q: search term (searches title, description)

    Example: /api/reports/search/?q=annual
    """
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Only staff can search reports
        if self.request.user.role not in [UserRole.SUPERADMIN, UserRole.STAFF_ADMIN]:
            return CustomReport.objects.none()

        # Get search term from query parameters
        search_term = self.request.query_params.get('q', '').strip()

        # Base queryset - only active reports
        queryset = CustomReport.objects.filter(is_active=True)

        # Apply search filter if search term provided
        if search_term:
            queryset = queryset.filter(
                Q(title__icontains=search_term) |
                Q(description__icontains=search_term)
            )

        # Order by title
        queryset = queryset.order_by('title')

        # Limit to 20 results for performance
        return queryset[:20]

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()

        # Format the response
        data = []
        for report in queryset:
            data.append({
                'report_id': str(report.report_id),
                'title': report.title,
                'description': report.description,
                'record_count': report.record_count,
                'is_active': report.is_active,
            })

        return Response(data)