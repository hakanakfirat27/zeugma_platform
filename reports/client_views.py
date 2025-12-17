# reports/client_views.py
# NOTE: Updated to use Company Database instead of Superdatabase

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
from .models import Subscription, CustomReport, SubscriptionStatus, ReportFeedback
from .company_models import Company, ProductionSiteVersion, CompanyStatus
from .company_serializers import CompanyListSerializer
from .pagination import CustomPagination
import csv
import json
from .client_serializers import ClientReportRecordSerializer
from .company_models import Company, ProductionSite, ProductionSiteVersion, CompanyStatus
from .models import HelpArticleFeedback
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
    Includes report filter_criteria for proper initialization.
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
                'amount_paid': float(sub.amount_paid) if sub.amount_paid else 0,
                # Include report filter criteria for proper initialization
                'filter_criteria': sub.report.filter_criteria or {}
            })

        return Response(data)


class ClientReportDataAPIView(generics.ListAPIView):
    """
    Returns filtered database records based on the client's purchased report criteria.
    NOW USES: Company Database (Company model with ProductionSiteVersion)
    Supports filter_groups with OR logic within groups, AND logic between groups
    """
    permission_classes = [IsAuthenticated]  # Removed IsClientUser, we check role manually below
    serializer_class = ClientReportRecordSerializer  # CHANGED from SuperdatabaseRecordSerializer
    filter_backends = [SearchFilter]  # Removed OrderingFilter - we handle ordering manually
    # FIXED: Use related lookup for ProductionSite -> Company fields
    search_fields = ['company__company_name', 'company__country', 'company__address_1']
    pagination_class = CustomPagination

    def get_queryset(self):
        """
        Returns ProductionSite objects (not Company objects!) 
        filtered by report criteria and user filters.
        
        Each ProductionSite represents one category for one company.
        The serializer expects ProductionSite objects.
        """
        # Only allow clients to access this
        if self.request.user.role != UserRole.CLIENT:
            from .company_models import ProductionSite
            return ProductionSite.objects.none()

        # Get report_id from query params
        report_id = self.request.query_params.get('report_id')

        if not report_id:
            from .company_models import ProductionSite
            return ProductionSite.objects.none()

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
            from .company_models import ProductionSite
            return ProductionSite.objects.none()

        # Get the report's filter criteria
        report = subscription.report
        filter_criteria = report.filter_criteria or {}

        # ✅ KEY CHANGE: Start with ProductionSite objects, not Company objects!
        # Filter out production sites whose parent company is deleted
        from .company_models import ProductionSite
        queryset = ProductionSite.objects.exclude(
            company__status=CompanyStatus.DELETED
        ).select_related('company')  # Optimize query

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

                    # Handle boolean filters (query current version)
                    for field_name, field_value in filters.items():
                        try:
                            ProductionSiteVersion._meta.get_field(field_name)

                            if field_value is True:
                                group_query |= Q(
                                    versions__is_current=True,
                                    **{f'versions__{field_name}': True}
                                )
                            elif field_value is False:
                                group_query |= (
                                    Q(
                                        versions__is_current=True,
                                        **{f'versions__{field_name}': False}
                                    ) |
                                    Q(
                                        versions__is_current=True,
                                        **{f'versions__{field_name}__isnull': True}
                                    )
                                )
                        except Exception:
                            continue

                    # Handle technical filters (with equals and range modes)
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
                                            versions__is_current=True,
                                            **{f'versions__{field_name}': equals_val}
                                        )
                                    except (ValueError, TypeError):
                                        pass

                            elif mode == 'range':
                                min_val = filter_config.get('min', '')
                                max_val = filter_config.get('max', '')
                                range_query = Q(versions__is_current=True)

                                if min_val != '' and min_val is not None:
                                    try:
                                        if field.get_internal_type() == 'FloatField':
                                            min_val = float(min_val)
                                        else:
                                            min_val = int(min_val)
                                        range_query &= Q(**{f'versions__{field_name}__gte': min_val})
                                    except (ValueError, TypeError):
                                        pass

                                if max_val != '' and max_val is not None:
                                    try:
                                        if field.get_internal_type() == 'FloatField':
                                            max_val = float(max_val)
                                        else:
                                            max_val = int(max_val)
                                        range_query &= Q(**{f'versions__{field_name}__lte': max_val})
                                    except (ValueError, TypeError):
                                        pass

                                group_query |= range_query
                        except Exception:
                            continue

                    # AND this group with the queryset
                    if group_query:
                        queryset = queryset.filter(group_query).distinct()

        # ========================================
        # STEP 2: Apply report's BASE FILTERS (legacy support)
        # ========================================
        # Handle categories (filter at ProductionSite level)
        report_categories = None
        if 'categories' in filter_criteria:
            report_categories = filter_criteria['categories']
        elif 'category' in filter_criteria:
            report_categories = filter_criteria['category']
        
        if report_categories:
            if isinstance(report_categories, list) and len(report_categories) > 0:
                queryset = queryset.filter(
                    category__in=report_categories  # ✅ Changed from production_sites__category__in
                )
            elif isinstance(report_categories, str) and report_categories:
                queryset = queryset.filter(
                    category=report_categories  # ✅ Changed from production_sites__category
                )

        # Handle country filter (filter by company's country)
        if 'country' in filter_criteria:
            countries = filter_criteria['country']
            if isinstance(countries, list) and len(countries) > 0:
                queryset = queryset.filter(company__country__in=countries)  # ✅ Changed to company__country__in
            elif isinstance(countries, str) and countries:
                queryset = queryset.filter(company__country=countries)  # ✅ Changed to company__country

        # ========================================
        # STEP 3: Apply USER'S FILTER GROUPS (from query params)
        # ========================================
        user_filter_groups_param = self.request.query_params.get('filter_groups')
        if user_filter_groups_param:
            try:
                user_filter_groups = json.loads(user_filter_groups_param)
                if isinstance(user_filter_groups, list):
                    for group in user_filter_groups:
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
                                ProductionSiteVersion._meta.get_field(field_name)

                                if field_value is True:
                                    group_query |= Q(
                                        versions__is_current=True,
                                        **{f'versions__{field_name}': True}
                                    )
                                elif field_value is False:
                                    group_query |= (
                                        Q(
                                            versions__is_current=True,
                                            **{f'versions__{field_name}': False}
                                        ) |
                                        Q(
                                            versions__is_current=True,
                                            **{f'versions__{field_name}__isnull': True}
                                        )
                                    )
                            except Exception:
                                continue

                        # Handle technical filters
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
                                                versions__is_current=True,
                                                **{f'versions__{field_name}': equals_val}
                                            )
                                        except (ValueError, TypeError):
                                            pass

                                elif mode == 'range':
                                    min_val = filter_config.get('min', '')
                                    max_val = filter_config.get('max', '')
                                    range_query = Q(versions__is_current=True)

                                    if min_val != '' and min_val is not None:
                                        try:
                                            if field.get_internal_type() == 'FloatField':
                                                min_val = float(min_val)
                                            else:
                                                min_val = int(min_val)
                                            range_query &= Q(**{f'versions__{field_name}__gte': min_val})
                                        except (ValueError, TypeError):
                                            pass

                                    if max_val != '' and max_val is not None:
                                        try:
                                            if field.get_internal_type() == 'FloatField':
                                                max_val = float(max_val)
                                            else:
                                                max_val = int(max_val)
                                            range_query &= Q(**{f'versions__{field_name}__lte': max_val})
                                        except (ValueError, TypeError):
                                            pass

                                    group_query |= range_query
                            except Exception:
                                continue

                        # AND this group with the queryset
                        if group_query:
                            queryset = queryset.filter(group_query).distinct()
            except json.JSONDecodeError:
                pass

        # ========================================
        # STEP 4: Handle additional category filter from user
        # ========================================
        categories_param = self.request.query_params.get('categories')
        if categories_param:
            if categories_param == '__NONE__':
                # Return empty queryset when no categories are selected
                return queryset.none()
            else:
                category_list = [c.strip() for c in categories_param.split(',') if c.strip()]
                if category_list:
                    queryset = queryset.filter(
                        category__in=category_list  # ✅ Changed from production_sites__category__in
                    )

        # ========================================
        # STEP 5: Handle additional country filter from user
        # ========================================
        countries_param = self.request.query_params.get('countries')
        if countries_param:
            if countries_param == '__NONE__':
                return queryset.none()
            else:
                country_list = [c.strip() for c in countries_param.split(',') if c.strip()]
                if country_list:
                    queryset = queryset.filter(company__country__in=country_list)  # ✅ Changed to company__country__in

        # ========================================
        # STEP 6: Handle status filter from user
        # ========================================
        status_param = self.request.query_params.get('status')
        if status_param:
            if status_param == '__NONE__':
                return queryset.none()
            else:
                status_list = [s.strip() for s in status_param.split(',') if s.strip()]
                if status_list:
                    queryset = queryset.filter(company__status__in=status_list)  # ✅ Changed to company__status__in

        # ========================================
        # STEP 7: Apply ordering (at the end, after all filters)
        # ========================================
        ordering = self.request.query_params.get('ordering', '')
        if ordering:
            # Map simple field names to their actual database paths
            ordering_map = {
                'company_name': 'company__company_name',
                '-company_name': '-company__company_name',
                'country': 'company__country',
                '-country': '-company__country',
                'categories': 'category',
                '-categories': '-category',
                'status': 'company__status',
                '-status': '-company__status',
            }
            mapped_ordering = ordering_map.get(ordering, ordering)
            return queryset.distinct().order_by(mapped_ordering)

        return queryset.distinct()


class ClientReportStatsAPIView(APIView):
    """
    Returns statistics for a specific client report.
    NOW USES: Company Database
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
        base_queryset = Company.objects.exclude(status=CompanyStatus.DELETED)

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
                        base_queryset = base_queryset.filter(group_query).distinct()

        # Apply report's category filters (handle both singular 'category' and plural 'categories' keys)
        report_categories = None
        if 'categories' in filter_criteria:
            report_categories = filter_criteria['categories']
        elif 'category' in filter_criteria:
            report_categories = filter_criteria['category']
        
        if report_categories:
            if isinstance(report_categories, list) and len(report_categories) > 0:
                base_queryset = base_queryset.filter(
                    production_sites__category__in=report_categories
                ).distinct()
            elif isinstance(report_categories, str) and report_categories:
                base_queryset = base_queryset.filter(
                    production_sites__category=report_categories
                ).distinct()

        # Apply report's country filters
        if 'country' in filter_criteria:
            countries = filter_criteria['country']
            if isinstance(countries, list) and len(countries) > 0:
                base_queryset = base_queryset.filter(country__in=countries)
            elif isinstance(countries, str) and countries:
                base_queryset = base_queryset.filter(country=countries)

        # Get all countries from base queryset (for filter sidebar)
        all_countries = list(
            base_queryset.values_list('country', flat=True)
            .distinct()
            .exclude(country__isnull=True)
            .exclude(country='')
            .order_by('country')
        )

        # ===== FIX: Get available_categories from report configuration, not from data =====
        # Get configured categories from report's filter_criteria
        if 'categories' in filter_criteria:
            categories_config = filter_criteria['categories']
            if isinstance(categories_config, list):
                available_categories = sorted(categories_config)
            elif isinstance(categories_config, str):
                available_categories = [categories_config]
            else:
                available_categories = []
        elif 'category' in filter_criteria:
            available_categories = [filter_criteria['category']]
        else:
            # If no category filter is set in report, get all distinct categories from data
            available_categories = list(
                base_queryset.filter(production_sites__versions__is_current=True)
                .values_list('production_sites__category', flat=True)
                .distinct()
                .exclude(production_sites__category__isnull=True)
                .exclude(production_sites__category='')
                .order_by('production_sites__category')
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
                            filtered_queryset = filtered_queryset.filter(group_query).distinct()
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

        # Apply user's status filter
        status_param = request.query_params.get('status')
        if status_param:
            # Check for special "__NONE__" marker indicating empty selection (should return 0 results)
            if status_param == '__NONE__':
                # Empty queryset when no status is selected
                filtered_queryset = Company.objects.none()
            # Note: Status filtering is legacy from Superdatabase (COMPLETE/INCOMPLETE)
            # Company Database uses different status model (ACTIVE/INACTIVE/DELETED)
            # For now, we just handle the __NONE__ case to return empty results

        # Apply user's category filters
        categories_param = request.query_params.get('categories')
        if categories_param:
            # Check for special "__NONE__" marker indicating empty selection (should return 0 results)
            if categories_param == '__NONE__':
                # Empty queryset when no categories are selected
                filtered_queryset = Company.objects.none()
            else:
                category_list = [c.strip() for c in categories_param.split(',') if c.strip()]
                if category_list:
                    filtered_queryset = filtered_queryset.filter(
                        production_sites__category__in=category_list
                    ).distinct()

        # Apply user's material filters (from filter sidebar)
        for key in request.query_params.keys():
            if key not in ['report_id', 'search', 'countries', 'categories', 'filter_groups', 'page', 'page_size', 'ordering']:
                value = request.query_params.get(key)
                if value in ['true', 'True', True]:
                    filtered_queryset = filtered_queryset.filter(
                        production_sites__versions__is_current=True,
                        **{f'production_sites__versions__{key}': True}
                    ).distinct()
                elif value in ['false', 'False', False]:
                    filtered_queryset = filtered_queryset.filter(
                        production_sites__versions__is_current=True,
                        **{f'production_sites__versions__{key}': False}
                    ).distinct()

        # Calculate stats
        total_count = filtered_queryset.count()
        countries_count = filtered_queryset.values('country').distinct().count()

        # Top countries (from filtered queryset) - top 10 for charts
        top_countries = list(
            filtered_queryset.values('country')
            .annotate(count=Count('id'))
            .filter(country__isnull=False, country__gt='')
            .order_by('-count')[:10]
        )

        # ALL countries with counts (for map and full display)
        all_countries_with_counts = list(
            filtered_queryset.values('country')
            .annotate(count=Count('id'))
            .filter(country__isnull=False, country__gt='')
            .order_by('-count')
        )

        # Category breakdown (from filtered queryset)
        categories = list(
            filtered_queryset.filter(production_sites__versions__is_current=True)
            .values('production_sites__category')
            .annotate(count=Count('id', distinct=True))
            .order_by('-count')
        )
        # Rename key for consistency
        categories = [
            {'category': item['production_sites__category'], 'count': item['count']}
            for item in categories if item['production_sites__category']
        ]

        return Response({
            'total_count': total_count,
            'countries_count': countries_count,
            'top_countries': top_countries,
            'all_countries_with_counts': all_countries_with_counts,  # All countries for map
            'all_countries': all_countries,
            'available_categories': available_categories,
            'categories': categories,
        })


class ClientFilterOptionsAPIView(APIView):
    """
    Returns available filter options for a specific report.
    NOW USES: Company Database (ProductionSiteVersion)
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

        # Build queryset - start with current versions
        queryset = ProductionSiteVersion.objects.filter(is_current=True)

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
                            ProductionSiteVersion._meta.get_field(field_name)
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
                                        group_query |= Q(**{field_name: equals_val})
                                    except (ValueError, TypeError):
                                        pass

                            elif mode == 'range':
                                min_val = filter_config.get('min', '')
                                max_val = filter_config.get('max', '')
                                range_query = Q()

                                if min_val != '' and min_val is not None:
                                    try:
                                        if field.get_internal_type() == 'FloatField':
                                            min_val = float(min_val)
                                        else:
                                            min_val = int(min_val)
                                        range_query &= Q(**{f'{field_name}__gte': min_val})
                                    except (ValueError, TypeError):
                                        pass

                                if max_val != '' and max_val is not None:
                                    try:
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

        # Apply report's category filters (handle both singular 'category' and plural 'categories' keys)
        report_categories = None
        if 'categories' in filter_criteria:
            report_categories = filter_criteria['categories']
        elif 'category' in filter_criteria:
            report_categories = filter_criteria['category']
        
        if report_categories:
            if isinstance(report_categories, list) and len(report_categories) > 0:
                queryset = queryset.filter(production_site__category__in=report_categories)
            elif isinstance(report_categories, str) and report_categories:
                queryset = queryset.filter(production_site__category=report_categories)

        # Apply report's country filters
        if 'country' in filter_criteria:
            countries = filter_criteria['country']
            if isinstance(countries, list) and len(countries) > 0:
                queryset = queryset.filter(production_site__company__country__in=countries)
            elif isinstance(countries, str) and countries:
                queryset = queryset.filter(production_site__company__country=countries)

        # Get categories from the filtered queryset
        categories = queryset.values_list('production_site__category', flat=True).distinct()

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

        # Get field labels from ProductionSiteVersion
        field_labels = {
            field.name: field.verbose_name
            for field in ProductionSiteVersion._meta.fields
        }

        filter_options = []
        for field in all_fields:
            # Skip non-boolean fields
            try:
                field_obj = ProductionSiteVersion._meta.get_field(field)
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
    NOW USES: Company Database (ProductionSiteVersion)
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

        # Build queryset - start with current versions
        queryset = ProductionSiteVersion.objects.filter(is_current=True)

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
                            ProductionSiteVersion._meta.get_field(field_name)
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
                                        group_query |= Q(**{field_name: equals_val})
                                    except (ValueError, TypeError):
                                        pass

                            elif mode == 'range':
                                min_val = filter_config.get('min', '')
                                max_val = filter_config.get('max', '')
                                range_query = Q()

                                if min_val != '' and min_val is not None:
                                    try:
                                        if field.get_internal_type() == 'FloatField':
                                            min_val = float(min_val)
                                        else:
                                            min_val = int(min_val)
                                        range_query &= Q(**{f'{field_name}__gte': min_val})
                                    except (ValueError, TypeError):
                                        pass

                                if max_val != '' and max_val is not None:
                                    try:
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

        # Apply report's category filters
        if 'categories' in filter_criteria:
            categories = filter_criteria['categories']
            if isinstance(categories, list) and len(categories) > 0:
                queryset = queryset.filter(production_site__category__in=categories)
            elif isinstance(categories, str) and categories:
                queryset = queryset.filter(production_site__category=categories)

        # Apply report's country filters
        if 'country' in filter_criteria:
            countries = filter_criteria['country']
            if isinstance(countries, list) and len(countries) > 0:
                queryset = queryset.filter(production_site__company__country__in=countries)
            elif isinstance(countries, str) and countries:
                queryset = queryset.filter(production_site__company__country=countries)

        # Get categories from the filtered queryset
        categories = queryset.values_list('production_site__category', flat=True).distinct()

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
            for field in ProductionSiteVersion._meta.fields
        }

        technical_filter_options = []
        for field in all_fields:
            # Only include IntegerField and FloatField
            try:
                field_obj = ProductionSiteVersion._meta.get_field(field)
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
    NOW USES: Company Database
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

        # Build queryset using Company Database
        filter_criteria = report.filter_criteria or {}
        queryset = Company.objects.exclude(status=CompanyStatus.DELETED)

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

        # Apply report's category filters
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

        # Apply report's country filters
        if 'country' in filter_criteria:
            countries = filter_criteria['country']
            if isinstance(countries, list) and len(countries) > 0:
                queryset = queryset.filter(country__in=countries)
            elif isinstance(countries, str) and countries:
                queryset = queryset.filter(country=countries)

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
        response['Content-Disposition'] = f'attachment; filename="{report.title}_{timezone.now().strftime("%Y%m%d")}.csv"'

        writer = csv.writer(response)

        # Write header
        headers = ['Company Name', 'Country', 'Region', 'Address', 'Phone', 'Email', 'Website', 'Categories']
        writer.writerow(headers)

        # Write data
        from .models import CompanyCategory
        for company in queryset:
            # Get categories from production sites
            categories = list(company.production_sites.values_list('category', flat=True).distinct())
            category_names = [dict(CompanyCategory.choices).get(cat, cat) for cat in categories]
            
            writer.writerow([
                company.company_name,
                company.country,
                company.region,
                company.address_1,
                company.phone_number,
                company.company_email,
                company.website,
                ', '.join(category_names)
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
    NOW USES: Company Database (ProductionSiteVersion for field definitions)
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

        # Get categories from current user filters or report filters
        categories_param = request.query_params.get('categories', '')

        if categories_param:
            categories = [c.strip() for c in categories_param.split(',') if c.strip()]
        else:
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
                queryset = Company.objects.exclude(status=CompanyStatus.DELETED)

                # Apply report filters
                if 'country' in filter_criteria:
                    countries = filter_criteria['country']
                    if isinstance(countries, list) and len(countries) > 0:
                        queryset = queryset.filter(country__in=countries)
                    elif isinstance(countries, str) and countries:
                        queryset = queryset.filter(country=countries)

                categories = list(
                    queryset.filter(production_sites__versions__is_current=True)
                    .values_list('production_sites__category', flat=True)
                    .distinct()
                )

        # Get model field labels from ProductionSiteVersion
        field_labels = {
            field.name: field.verbose_name
            for field in ProductionSiteVersion._meta.fields
        }

        # Also get Company field labels
        company_field_labels = {
            field.name: field.verbose_name
            for field in Company._meta.fields
        }
        field_labels.update(company_field_labels)

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

        # Collect all field keys
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

        # Build the column list
        available_columns = []

        # 1. Add Common fields
        for field_key in COMMON_FIELDS:
            if field_key in all_field_keys:
                available_columns.append({
                    'key': field_key,
                    'label': field_labels.get(field_key, field_key.replace('_', ' ').title()),
                    'category': 'Common'
                })

        # 2. Add Contact fields
        for field_key in CONTACT_FIELDS:
            if field_key in all_field_keys:
                available_columns.append({
                    'key': field_key,
                    'label': field_labels.get(field_key, field_key.replace('_', ' ').title()),
                    'category': 'Contact'
                })

        # 3. Add category-specific fields
        added_keys = {col['key'] for col in available_columns}

        for cat in categories:
            if cat in CATEGORY_FIELDS_MAP:
                category_display = CATEGORY_DISPLAY_NAMES.get(cat, cat)

                for field_key in CATEGORY_FIELDS_MAP[cat]:
                    if field_key in added_keys:
                        continue

                    available_columns.append({
                        'key': field_key,
                        'label': field_labels.get(field_key, field_key.replace('_', ' ').title()),
                        'category': category_display
                    })
                    added_keys.add(field_key)

        # Define smart default columns
        default_columns = [
            'company_name',
            'country',
            'address_1',
            'region',
            'phone_number',
            'company_email',
            'website'
        ]

        # Filter default columns to only include ones that exist
        available_keys = {col['key'] for col in available_columns}
        default_columns = [col for col in default_columns if col in available_keys]

        return Response({
            'available_columns': available_columns,
            'default_columns': default_columns,
            'report_title': report.title,
            'report_categories': categories,
            'total_fields': len(available_columns)
        })


class ClientMaterialStatsAPIView(APIView):
    """
    Returns material statistics for a specific client report with filters applied.
    This endpoint calculates material counts from filtered data.
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

        # Start with ProductionSiteVersion (current versions only)
        queryset = ProductionSiteVersion.objects.filter(is_current=True)

        # Exclude deleted companies
        queryset = queryset.exclude(production_site__company__status=CompanyStatus.DELETED)

        # ========================================
        # Apply report's filter groups
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

                    group_query = Q()

                    for field_name, field_value in filters.items():
                        try:
                            ProductionSiteVersion._meta.get_field(field_name)
                            if field_value is True:
                                group_query |= Q(**{field_name: True})
                            elif field_value is False:
                                group_query |= Q(**{field_name: False}) | Q(**{f'{field_name}__isnull': True})
                        except Exception:
                            continue

                    if group_query:
                        queryset = queryset.filter(group_query)

        # Apply report's category filters
        report_categories = None
        if 'categories' in filter_criteria:
            report_categories = filter_criteria['categories']
        elif 'category' in filter_criteria:
            report_categories = filter_criteria['category']
        
        if report_categories:
            if isinstance(report_categories, list) and len(report_categories) > 0:
                queryset = queryset.filter(production_site__category__in=report_categories)
            elif isinstance(report_categories, str) and report_categories:
                queryset = queryset.filter(production_site__category=report_categories)

        # Apply report's country filters
        if 'country' in filter_criteria:
            countries = filter_criteria['country']
            if isinstance(countries, list) and len(countries) > 0:
                queryset = queryset.filter(production_site__company__country__in=countries)
            elif isinstance(countries, str) and countries:
                queryset = queryset.filter(production_site__company__country=countries)

        # ========================================
        # Apply user filters from query params
        # ========================================
        
        # User's filter groups
        user_filter_groups_param = request.query_params.get('filter_groups')
        if user_filter_groups_param:
            try:
                user_filter_groups = json.loads(user_filter_groups_param)
                if isinstance(user_filter_groups, list):
                    for group in user_filter_groups:
                        if not isinstance(group, dict):
                            continue

                        filters = group.get('filters', {})
                        technical_filters = group.get('technicalFilters', {})

                        if not filters and not technical_filters:
                            continue

                        group_query = Q()

                        for field_name, field_value in filters.items():
                            try:
                                ProductionSiteVersion._meta.get_field(field_name)
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
                                            group_query |= Q(**{field_name: equals_val})
                                        except (ValueError, TypeError):
                                            pass

                                elif mode == 'range':
                                    min_val = filter_config.get('min', '')
                                    max_val = filter_config.get('max', '')
                                    range_query = Q()

                                    if min_val != '' and min_val is not None:
                                        try:
                                            if field.get_internal_type() == 'FloatField':
                                                min_val = float(min_val)
                                            else:
                                                min_val = int(min_val)
                                            range_query &= Q(**{f'{field_name}__gte': min_val})
                                        except (ValueError, TypeError):
                                            pass

                                    if max_val != '' and max_val is not None:
                                        try:
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
            except (json.JSONDecodeError, TypeError):
                pass

        # User's search filter
        search = request.query_params.get('search', '').strip()
        if search:
            queryset = queryset.filter(
                Q(production_site__company__company_name__icontains=search) |
                Q(production_site__company__country__icontains=search)
            )

        # User's country filter
        countries_param = request.query_params.get('countries')
        if countries_param:
            if countries_param == '__NONE__':
                queryset = ProductionSiteVersion.objects.none()
            else:
                country_list = [c.strip() for c in countries_param.split(',') if c.strip()]
                if country_list:
                    queryset = queryset.filter(production_site__company__country__in=country_list)

        # User's category filter
        categories_param = request.query_params.get('categories')
        if categories_param:
            if categories_param == '__NONE__':
                queryset = ProductionSiteVersion.objects.none()
            else:
                category_list = [c.strip() for c in categories_param.split(',') if c.strip()]
                if category_list:
                    queryset = queryset.filter(production_site__category__in=category_list)

        # User's status filter
        status_param = request.query_params.get('status')
        if status_param:
            if status_param == '__NONE__':
                queryset = ProductionSiteVersion.objects.none()
            else:
                status_list = [s.strip() for s in status_param.split(',') if s.strip()]
                if status_list:
                    queryset = queryset.filter(production_site__company__status__in=status_list)

        # ========================================
        # Calculate material counts
        # ========================================
        MATERIAL_FIELDS = [
            'ldpe', 'lldpe', 'hdpe', 'pp', 'ps', 'pvc', 'pet', 'pa', 'pc', 'abs',
            'san', 'pmma', 'pom', 'pbt', 'peek', 'ppo', 'psu', 'tpes', 'eva', 'xlpe',
            'mdpe', 'petg', 'apet', 'cpet', 'rigid_pvc', 'flexible_pvc',
            'bioresins', 'thermosets'
        ]

        MATERIAL_LABELS = {
            'ldpe': 'LDPE', 'lldpe': 'LLDPE', 'hdpe': 'HDPE', 'pp': 'PP', 'ps': 'PS',
            'pvc': 'PVC', 'pet': 'PET', 'pa': 'PA', 'pc': 'PC', 'abs': 'ABS',
            'san': 'SAN', 'pmma': 'PMMA', 'pom': 'POM', 'pbt': 'PBT', 'peek': 'PEEK',
            'ppo': 'PPO', 'psu': 'PSU', 'tpes': 'TPEs', 'eva': 'EVA', 'xlpe': 'XLPE',
            'mdpe': 'MDPE', 'petg': 'PETG', 'apet': 'APET', 'cpet': 'CPET',
            'rigid_pvc': 'Rigid PVC', 'flexible_pvc': 'Flexible PVC',
            'bioresins': 'Bioresins', 'thermosets': 'Thermosets',
        }

        # Count each material field
        material_stats = []
        for field in MATERIAL_FIELDS:
            try:
                # Check if field exists in model
                ProductionSiteVersion._meta.get_field(field)
                count = queryset.filter(**{field: True}).count()
                if count > 0:
                    material_stats.append({
                        'field': field,
                        'label': MATERIAL_LABELS.get(field, field),
                        'count': count
                    })
            except Exception:
                continue

        # Sort by count descending
        material_stats.sort(key=lambda x: x['count'], reverse=True)

        return Response({
            'materials': material_stats,
            'top_materials': material_stats[:3],  # Top 3 for stat card
            'total_records': queryset.count()
        })


# ========================================
# HELP CENTER ARTICLE FEEDBACK API
# ========================================
class HelpArticleFeedbackAPIView(APIView):
    """
    API for submitting and retrieving Help Center article feedback.
    Clients can rate whether articles were helpful.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """
        Get all feedback submitted by the current user.
        Returns a dictionary mapping article_id to feedback status.
        """
        if request.user.role != UserRole.CLIENT:
            return Response(
                {'error': 'Only clients can access this endpoint'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Get all feedback for this user
        feedbacks = HelpArticleFeedback.objects.filter(user=request.user)
        
        # Build response dict
        feedback_dict = {}
        for fb in feedbacks:
            feedback_dict[fb.article_id] = {
                'helpful': fb.is_helpful,
                'comment': fb.comment,
                'timestamp': fb.created_at.isoformat()
            }

        return Response(feedback_dict)

    def post(self, request):
        """
        Submit feedback for a Help Center article.
        Creates or updates existing feedback.
        """
        if request.user.role != UserRole.CLIENT:
            return Response(
                {'error': 'Only clients can access this endpoint'},
                status=status.HTTP_403_FORBIDDEN
            )

        article_id = request.data.get('article_id')
        is_helpful = request.data.get('is_helpful')
        comment = request.data.get('comment', '')

        # Validation
        if not article_id:
            return Response(
                {'error': 'article_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if is_helpful is None:
            return Response(
                {'error': 'is_helpful is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create or update feedback
        feedback, created = HelpArticleFeedback.objects.update_or_create(
            user=request.user,
            article_id=article_id,
            defaults={
                'is_helpful': is_helpful,
                'comment': comment
            }
        )

        return Response({
            'success': True,
            'message': 'Feedback submitted successfully',
            'data': {
                'article_id': feedback.article_id,
                'is_helpful': feedback.is_helpful,
                'comment': feedback.comment,
                'timestamp': feedback.created_at.isoformat(),
                'created': created
            }
        }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


# ========================================
# REPORT FEEDBACK API
# ========================================
class ReportFeedbackAPIView(APIView):
    """
    API for submitting and retrieving report feedback from clients.
    Clients can rate reports they have access to.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """
        Get feedback for a specific report or all feedback by current user.
        Query params:
        - report_id: Get feedback for a specific report
        - (no params): Get all feedback submitted by the user
        """
        if request.user.role != UserRole.CLIENT:
            return Response(
                {'error': 'Only clients can access this endpoint'},
                status=status.HTTP_403_FORBIDDEN
            )

        report_id = request.query_params.get('report_id')

        if report_id:
            # Get feedback for a specific report
            try:
                feedback = ReportFeedback.objects.get(
                    user=request.user,
                    report__report_id=report_id
                )
                return Response({
                    'has_feedback': True,
                    'feedback': {
                        'feedback_id': str(feedback.feedback_id),
                        'report_id': str(feedback.report.report_id),
                        'report_title': feedback.report.title,
                        'rating': feedback.rating,
                        'comment': feedback.comment,
                        'data_quality_rating': feedback.data_quality_rating,
                        'data_completeness_rating': feedback.data_completeness_rating,
                        'ease_of_use_rating': feedback.ease_of_use_rating,
                        'created_at': feedback.created_at.isoformat(),
                        'updated_at': feedback.updated_at.isoformat()
                    }
                })
            except ReportFeedback.DoesNotExist:
                return Response({'has_feedback': False, 'feedback': None})
        else:
            # Get all feedback by this user
            feedbacks = ReportFeedback.objects.filter(user=request.user).select_related('report')
            data = []
            for fb in feedbacks:
                data.append({
                    'feedback_id': str(fb.feedback_id),
                    'report_id': str(fb.report.report_id),
                    'report_title': fb.report.title,
                    'rating': fb.rating,
                    'comment': fb.comment,
                    'data_quality_rating': fb.data_quality_rating,
                    'data_completeness_rating': fb.data_completeness_rating,
                    'ease_of_use_rating': fb.ease_of_use_rating,
                    'created_at': fb.created_at.isoformat(),
                    'updated_at': fb.updated_at.isoformat()
                })
            return Response(data)

    def post(self, request):
        """
        Submit feedback for a report.
        Creates or updates existing feedback.
        """
        if request.user.role != UserRole.CLIENT:
            return Response(
                {'error': 'Only clients can access this endpoint'},
                status=status.HTTP_403_FORBIDDEN
            )

        report_id = request.data.get('report_id')
        rating = request.data.get('rating')
        comment = request.data.get('comment', '')
        data_quality_rating = request.data.get('data_quality_rating')
        data_completeness_rating = request.data.get('data_completeness_rating')
        ease_of_use_rating = request.data.get('ease_of_use_rating')

        # Validation
        if not report_id:
            return Response(
                {'error': 'report_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if rating is None:
            return Response(
                {'error': 'rating is required (1-5)'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            rating = int(rating)
            if rating < 1 or rating > 5:
                raise ValueError()
        except (ValueError, TypeError):
            return Response(
                {'error': 'rating must be an integer between 1 and 5'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Verify user has access to this report (active subscription)
        today = timezone.now().date()
        try:
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
                {'error': 'You do not have access to this report'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Build defaults dict
        defaults = {
            'rating': rating,
            'comment': comment,
        }
        
        # Add optional ratings if provided
        if data_quality_rating is not None:
            try:
                data_quality_rating = int(data_quality_rating)
                if 1 <= data_quality_rating <= 5:
                    defaults['data_quality_rating'] = data_quality_rating
            except (ValueError, TypeError):
                pass
        
        if data_completeness_rating is not None:
            try:
                data_completeness_rating = int(data_completeness_rating)
                if 1 <= data_completeness_rating <= 5:
                    defaults['data_completeness_rating'] = data_completeness_rating
            except (ValueError, TypeError):
                pass
        
        if ease_of_use_rating is not None:
            try:
                ease_of_use_rating = int(ease_of_use_rating)
                if 1 <= ease_of_use_rating <= 5:
                    defaults['ease_of_use_rating'] = ease_of_use_rating
            except (ValueError, TypeError):
                pass

        # Create or update feedback
        feedback, created = ReportFeedback.objects.update_or_create(
            user=request.user,
            report=report,
            defaults=defaults
        )

        return Response({
            'success': True,
            'message': 'Feedback submitted successfully',
            'data': {
                'feedback_id': str(feedback.feedback_id),
                'report_id': str(feedback.report.report_id),
                'report_title': feedback.report.title,
                'rating': feedback.rating,
                'comment': feedback.comment,
                'data_quality_rating': feedback.data_quality_rating,
                'data_completeness_rating': feedback.data_completeness_rating,
                'ease_of_use_rating': feedback.ease_of_use_rating,
                'created_at': feedback.created_at.isoformat(),
                'created': created
            }
        }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    def delete(self, request):
        """
        Delete feedback for a report.
        """
        if request.user.role != UserRole.CLIENT:
            return Response(
                {'error': 'Only clients can access this endpoint'},
                status=status.HTTP_403_FORBIDDEN
            )

        report_id = request.query_params.get('report_id')
        
        if not report_id:
            return Response(
                {'error': 'report_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            feedback = ReportFeedback.objects.get(
                user=request.user,
                report__report_id=report_id
            )
            feedback.delete()
            return Response({
                'success': True,
                'message': 'Feedback deleted successfully'
            })
        except ReportFeedback.DoesNotExist:
            return Response(
                {'error': 'Feedback not found'},
                status=status.HTTP_404_NOT_FOUND
            )


# ========================================
# CLIENT SINGLE RECORD DETAIL API
# ========================================
class ClientRecordDetailAPIView(APIView):
    """
    Get a single company record details for a client.
    Used when viewing favorite companies or collection items.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, report_id, record_id):
        """
        Get detailed company information for a specific record.
        record_id is the site_id (UUID) from ProductionSite model.
        """
        if request.user.role != UserRole.CLIENT:
            return Response(
                {'error': 'Only clients can access this endpoint'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Verify the client has an active subscription to this report
        today = timezone.now().date()
        try:
            subscription = Subscription.objects.get(
                client=request.user,
                report__report_id=report_id,
                status=SubscriptionStatus.ACTIVE,
                start_date__lte=today,
                end_date__gte=today
            )
        except Subscription.DoesNotExist:
            return Response(
                {'error': 'You do not have access to this report'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Find the production site by site_id (UUID) field
        try:
            production_site = ProductionSite.objects.select_related('company').prefetch_related(
                'versions'
            ).get(site_id=record_id)
        except ProductionSite.DoesNotExist:
            return Response(
                {'error': 'Record not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            # Handle invalid UUID format
            return Response(
                {'error': 'Invalid record ID format'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Verify the company is not deleted
        if production_site.company.status == CompanyStatus.DELETED:
            return Response(
                {'error': 'Record not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Serialize the record using the same serializer as the list view
        serializer = ClientReportRecordSerializer(production_site)
        return Response(serializer.data)