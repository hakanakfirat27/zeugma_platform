# reports/filters.py

import django_filters
from django.db.models import Q
from .models import SuperdatabaseRecord
from .fields import ALL_COMMONS
import json


class SuperdatabaseRecordFilter(django_filters.FilterSet):
    categories = django_filters.CharFilter(method='filter_by_categories')
    countries = django_filters.CharFilter(method='filter_by_countries')
    filter_groups = django_filters.CharFilter(method='filter_by_groups')

    class Meta:
        model = SuperdatabaseRecord
        fields = ALL_COMMONS

    def filter_by_categories(self, queryset, name, value):
        """
        Handle comma-separated categories or 'ALL'.
        """
        if not value or value.upper() == 'ALL':
            return queryset

        categories = [c.strip() for c in value.split(',') if c.strip()]
        if not categories:
            return queryset

        query = Q()
        for category in categories:
            query |= Q(category__iexact=category)

        return queryset.filter(query)

    def filter_by_countries(self, queryset, name, value):
        """
        Handle comma-separated countries.
        """
        if not value:
            return queryset

        countries = [c.strip() for c in value.split(',') if c.strip()]
        if not countries:
            return queryset

        query = Q()
        for country in countries:
            query |= Q(country__iexact=country)

        return queryset.filter(query)

    def filter_by_groups(self, queryset, name, value):
        """
        Handle filter groups with OR logic within groups and AND logic between groups.
        NOW SUPPORTS: Boolean filters, Range filters (min/max), AND Equals filters.

        Expected format (JSON string):
        [
            {
                "id": "group1",
                "name": "Materials",
                "filters": {"pp": true, "ps": true},
                "technicalFilters": {
                    "polymer_range_number": {
                        "mode": "equals",
                        "equals": "2"
                    },
                    "number_of_machines": {
                        "mode": "range",
                        "min": "10",
                        "max": "50"
                    }
                }
            }
        ]

        Logic:
        - Within a group: (pp=true OR ps=true OR polymer_range=2 OR machines 10-50)
        - Between groups: group1 AND group2
        """
        if not value:
            return queryset

        try:
            groups = json.loads(value)
        except (json.JSONDecodeError, TypeError):
            return queryset

        if not groups or not isinstance(groups, list):
            return queryset

        # Start with the base queryset - we'll AND all groups together
        for group in groups:
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
                            # EQUALS MODE: field = exact_value
                            equals_val = filter_config.get('equals', '')

                            if equals_val != '' and equals_val is not None:
                                try:
                                    # Try to convert to appropriate type
                                    field = SuperdatabaseRecord._meta.get_field(field_name)
                                    if field.get_internal_type() == 'FloatField':
                                        equals_val = float(equals_val)
                                    else:
                                        equals_val = int(equals_val)

                                    # Add equals query with OR logic
                                    group_query |= Q(**{field_name: equals_val})
                                except (ValueError, TypeError):
                                    pass

                        elif mode == 'range':
                            # RANGE MODE: field >= min AND field <= max
                            min_val = filter_config.get('min', '')
                            max_val = filter_config.get('max', '')

                            # Build range query for this field
                            range_query = Q()

                            # Add minimum constraint if provided
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

                            # Add maximum constraint if provided
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

                            # Add to group query with OR logic
                            if range_query:
                                group_query |= range_query

                    except Exception:
                        continue

            # If we have filters in this group, AND it with the queryset
            if group_query:
                queryset = queryset.filter(group_query)

        return queryset