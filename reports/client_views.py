# reports/client_views.py

from django.db import models
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
import json

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
    NOW SUPPORTS: filter_groups with OR logic within groups, AND logic between groups
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

        # ========================================
        # STEP 1: Apply report's FILTER GROUPS (if exists)
        # ========================================
        if 'filter_groups' in filter_criteria:
            filter_groups = filter_criteria['filter_groups']
            if isinstance(filter_groups, list):
                for group in filter_groups:
                    if not isinstance(group, dict):
                        continue

                    filters = group.get('filters', {})
                    technical_filters = group.get('technicalFilters', {})

                    if not filters and not technical_filters:
                        continue

                    # Build OR query for all filters within this group
                    group_query = Q()

                    # Handle boolean filters
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

        # ========================================
        # STEP 2: Apply report's BASE FILTERS (legacy support)
        # ========================================
        filter_q = Q()
        for field, value in filter_criteria.items():
            # Skip filter_groups as it's already handled
            if field == 'filter_groups':
                continue

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
            except (json.JSONDecodeError, TypeError):
                pass

        # ========================================
        # STEP 4: Handle additional category filter from user (not from report criteria)
        # ========================================
        categories_param = self.request.query_params.get('categories')
        if categories_param:
            # This is when user selects specific categories in the filter sidebar
            category_list = [c.strip() for c in categories_param.split(',') if c.strip()]
            if category_list:
                queryset = queryset.filter(category__in=category_list)

        # ========================================
        # STEP 5: Apply other filters (search, ordering, etc.) through DjangoFilterBackend
        # ========================================
        filterset = SuperdatabaseRecordFilter(self.request.GET, queryset=queryset)
        queryset = filterset.qs

        return queryset


class ClientReportStatsAPIView(APIView):
    """
    Returns statistics for a specific client report, similar to DatabaseStatsAPIView
    but filtered by the report's criteria.
    NOW SUPPORTS: filter_groups with OR logic within groups, AND logic between groups
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

        # ========================================
        # Apply report's FILTER GROUPS (if exists)
        # ========================================
        if 'filter_groups' in filter_criteria:
            filter_groups = filter_criteria['filter_groups']
            if isinstance(filter_groups, list):
                for group in filter_groups:
                    if not isinstance(group, dict):
                        continue

                    filters = group.get('filters', {})
                    technical_filters = group.get('technicalFilters', {})

                    if not filters and not technical_filters:
                        continue

                    # Build OR query for all filters within this group
                    group_query = Q()

                    # Handle boolean filters
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
                        base_queryset = base_queryset.filter(group_query)

        # Apply report's base filters
        filter_q = Q()
        for field, value in filter_criteria.items():
            # Skip filter_groups as it's already handled
            if field == 'filter_groups':
                continue

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

        # Get all countries from base queryset (for filter sidebar)
        all_countries = list(
            base_queryset.values_list('country', flat=True)
            .distinct()
            .exclude(country__isnull=True)
            .exclude(country='')
            .order_by('country')
        )

        # Get available categories from base queryset
        available_categories = list(
            base_queryset.values_list('category', flat=True)
            .distinct()
            .exclude(category__isnull=True)
            .exclude(category='')
            .order_by('category')
        )

        # ========================================
        # Now apply USER FILTERS on top of base queryset for filtered stats
        # ========================================
        filtered_queryset = base_queryset

        # Apply user's filter groups
        user_filter_groups_param = request.query_params.get('filter_groups')
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

                        if group_query:
                            filtered_queryset = filtered_queryset.filter(group_query)
            except (json.JSONDecodeError, TypeError):
                pass

        # Apply user's search
        search = request.query_params.get('search', '').strip()
        if search:
            filtered_queryset = filtered_queryset.filter(
                Q(company_name__icontains=search) |
                Q(country__icontains=search)
            )

        # Apply user's country filters
        countries_param = request.query_params.get('countries')
        if countries_param:
            country_list = [c.strip() for c in countries_param.split(',') if c.strip()]
            if country_list:
                filtered_queryset = filtered_queryset.filter(country__in=country_list)

        # Apply user's category filters
        categories_param = request.query_params.get('categories')
        if categories_param:
            category_list = [c.strip() for c in categories_param.split(',') if c.strip()]
            if category_list:
                filtered_queryset = filtered_queryset.filter(category__in=category_list)

        # Apply user's material filters (from filter sidebar)
        for key in request.query_params.keys():
            if key not in ['report_id', 'search', 'countries', 'categories', 'filter_groups', 'page', 'page_size',
                           'ordering']:
                value = request.query_params.get(key)
                if value in ['true', 'True', True]:
                    filtered_queryset = filtered_queryset.filter(**{key: True})
                elif value in ['false', 'False', False]:
                    filtered_queryset = filtered_queryset.filter(**{key: False})

        # Calculate stats
        total_count = filtered_queryset.count()
        countries_count = filtered_queryset.values('country').distinct().count()

        # Top countries (from filtered queryset)
        top_countries = list(
            filtered_queryset.values('country')
            .annotate(count=Count('id'))
            .filter(country__isnull=False, country__gt='')
            .order_by('-count')[:10]
        )

        # Category breakdown (from filtered queryset)
        categories = list(
            filtered_queryset.values('category')
            .annotate(count=Count('id'))
            .order_by('-count')
        )

        return Response({
            'total_count': total_count,
            'countries_count': countries_count,
            'top_countries': top_countries,
            'all_countries': all_countries,
            'available_categories': available_categories,
            'categories': categories,
        })


class ClientFilterOptionsAPIView(APIView):
    """
    Returns available filter options for a specific report.
    Shows material types, properties etc. that client can filter by.
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

        # Get the report and its filter criteria
        report = subscription.report
        filter_criteria = report.filter_criteria or {}

        # Build queryset with report's filter criteria
        queryset = SuperdatabaseRecord.objects.all()

        # Apply report's filter groups (if exists)
        if 'filter_groups' in filter_criteria:
            filter_groups = filter_criteria['filter_groups']
            if isinstance(filter_groups, list):
                for group in filter_groups:
                    if not isinstance(group, dict):
                        continue

                    filters = group.get('filters', {})
                    technical_filters = group.get('technicalFilters', {})

                    if not filters and not technical_filters:
                        continue

                    # Build OR query for all filters within this group
                    group_query = Q()

                    # Handle boolean filters
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

                    if group_query:
                        queryset = queryset.filter(group_query)

        # Apply report's base filters
        filter_q = Q()
        for field, value in filter_criteria.items():
            if field == 'filter_groups':
                continue

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

        # Get categories from the filtered queryset
        categories = queryset.values_list('category', flat=True).distinct()

        # Import field definitions
        from .fields import (
            COMMON_FIELDS, INJECTION_FIELDS, BLOW_FIELDS, ROTO_FIELDS,
            PE_FILM_FIELDS, SHEET_FIELDS, PIPE_FIELDS, TUBE_HOSE_FIELDS,
            PROFILE_FIELDS, CABLE_FIELDS, COMPOUNDER_FIELDS
        )

        # Map categories to their fields
        category_fields_map = {
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

        # Collect all unique fields
        all_fields = set(COMMON_FIELDS)
        for category in categories:
            if category in category_fields_map:
                all_fields.update(category_fields_map[category])

        # Get field counts
        field_labels = {
            field.name: field.verbose_name
            for field in SuperdatabaseRecord._meta.fields
        }

        filter_options = []
        for field in all_fields:
            # Skip non-boolean fields
            try:
                field_obj = SuperdatabaseRecord._meta.get_field(field)
                if field_obj.get_internal_type() != 'BooleanField':
                    continue
            except:
                continue

            count = queryset.filter(**{field: True}).count()
            if count > 0:
                filter_options.append({
                    'field': field,
                    'label': field_labels.get(field, field.replace('_', ' ').title()),
                    'count': count
                })

        # Sort by count (descending)
        filter_options.sort(key=lambda x: x['count'], reverse=True)

        return Response(filter_options)


class ClientTechnicalFilterOptionsAPIView(APIView):
    """
    Returns available technical filter options (numeric/integer fields) for a specific report.
    Shows fields like polymer_range_number, number_of_machines, etc. that client can filter by.
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

        # Get the report and its filter criteria
        report = subscription.report
        filter_criteria = report.filter_criteria or {}

        # Build queryset with report's filter criteria
        queryset = SuperdatabaseRecord.objects.all()

        # Apply report's filter groups (if exists)
        if 'filter_groups' in filter_criteria:
            filter_groups = filter_criteria['filter_groups']
            if isinstance(filter_groups, list):
                for group in filter_groups:
                    if not isinstance(group, dict):
                        continue

                    filters = group.get('filters', {})
                    technical_filters = group.get('technicalFilters', {})

                    if not filters and not technical_filters:
                        continue

                    # Build OR query for all filters within this group
                    group_query = Q()

                    # Handle boolean filters
                    for field_name, field_value in filters.items():
                        try:
                            SuperdatabaseRecord._meta.get_field(field_name)

                            if field_value is True:
                                group_query |= Q(**{field_name: True})
                            elif field_value is False:
                                group_query |= Q(**{field_name: False}) | Q(**{f'{field_name}__isnull': True})
                        except Exception:
                            continue

                    # Handle technical filters
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

                    if group_query:
                        queryset = queryset.filter(group_query)

        # Apply report's base filters
        filter_q = Q()
        for field, value in filter_criteria.items():
            if field == 'filter_groups':
                continue

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

        # Get categories from the filtered queryset
        categories = queryset.values_list('category', flat=True).distinct()

        # Import field definitions
        from .fields import (
            COMMON_FIELDS, INJECTION_FIELDS, BLOW_FIELDS, ROTO_FIELDS,
            PE_FILM_FIELDS, SHEET_FIELDS, PIPE_FIELDS, TUBE_HOSE_FIELDS,
            PROFILE_FIELDS, CABLE_FIELDS, COMPOUNDER_FIELDS
        )

        # Map categories to their fields
        category_fields_map = {
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

        # Collect all unique fields
        all_fields = set(COMMON_FIELDS)
        for category in categories:
            if category in category_fields_map:
                all_fields.update(category_fields_map[category])

        # Get field labels
        field_labels = {
            field.name: field.verbose_name
            for field in SuperdatabaseRecord._meta.fields
        }

        technical_filter_options = []
        for field in all_fields:
            # Only include IntegerField and FloatField
            try:
                field_obj = SuperdatabaseRecord._meta.get_field(field)
                field_type = field_obj.get_internal_type()

                if field_type not in ['IntegerField', 'FloatField', 'PositiveIntegerField']:
                    continue
            except:
                continue

            # Get min and max values for the field
            aggregation = queryset.aggregate(
                min_value=models.Min(field),
                max_value=models.Max(field)
            )

            technical_filter_options.append({
                'field': field,
                'label': field_labels.get(field, field.replace('_', ' ').title()),
                'type': field_type,
                'min': aggregation['min_value'],
                'max': aggregation['max_value'],
            })

        # Sort by label
        technical_filter_options.sort(key=lambda x: x['label'])

        return Response(technical_filter_options)


class ClientReportExportAPIView(APIView):
    """
    Export client report data to CSV.
    Respects all active filters.
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
            report = subscription.report
        except Subscription.DoesNotExist:
            return Response(
                {"error": "No active subscription found for this report"},
                status=status.HTTP_403_FORBIDDEN
            )

        # Build queryset (same logic as ClientReportDataAPIView)
        filter_criteria = report.filter_criteria or {}
        queryset = SuperdatabaseRecord.objects.all()

        # Apply report's filter groups
        if 'filter_groups' in filter_criteria:
            filter_groups = filter_criteria['filter_groups']
            if isinstance(filter_groups, list):
                for group in filter_groups:
                    if not isinstance(group, dict):
                        continue

                    filters = group.get('filters', {})
                    technical_filters = group.get('technicalFilters', {})

                    if not filters and not technical_filters:
                        continue

                    group_query = Q()

                    # Handle boolean filters
                    for field_name, field_value in filters.items():
                        try:
                            SuperdatabaseRecord._meta.get_field(field_name)

                            if field_value is True:
                                group_query |= Q(**{field_name: True})
                            elif field_value is False:
                                group_query |= Q(**{field_name: False}) | Q(**{f'{field_name}__isnull': True})
                        except Exception:
                            continue

                    # Handle technical filters
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

                    if group_query:
                        queryset = queryset.filter(group_query)

        # Apply report's base filters
        filter_q = Q()
        for field, value in filter_criteria.items():
            if field == 'filter_groups':
                continue

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

        # Apply user filters (search, countries, etc.)
        search = request.query_params.get('search', '').strip()
        if search:
            queryset = queryset.filter(company_name__icontains=search)

        countries_param = request.query_params.get('countries')
        if countries_param:
            country_list = [c.strip() for c in countries_param.split(',') if c.strip()]
            if country_list:
                queryset = queryset.filter(country__in=country_list)

        # Create CSV response
        response = HttpResponse(content_type='text/csv')
        response[
            'Content-Disposition'] = f'attachment; filename="{report.title}_{timezone.now().strftime("%Y%m%d")}.csv"'

        writer = csv.writer(response)

        # Write header
        headers = ['Company Name', 'Country', 'Region', 'Address', 'Phone', 'Email', 'Website']
        writer.writerow(headers)

        # Write data
        for record in queryset:
            writer.writerow([
                record.company_name,
                record.country,
                record.region,
                record.address_1,
                record.phone_number,
                record.company_email,
                record.website
            ])

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
                    if field == 'categories' or field == 'filter_groups':
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