# reports/filters.py

import django_filters
from django.db.models import Q
from .models import SuperdatabaseRecord
from .fields import ALL_COMMONS


class SuperdatabaseRecordFilter(django_filters.FilterSet):
    # UPDATED: Changed from 'category' to 'categories' for multi-select support
    categories = django_filters.CharFilter(method='filter_by_categories')
    countries = django_filters.CharFilter(method='filter_by_countries')

    class Meta:
        model = SuperdatabaseRecord
        fields = ALL_COMMONS

    def filter_by_categories(self, queryset, name, value):
        """
        Handle comma-separated categories or 'ALL'.
        Examples:
          - categories=ALL → returns all records
          - categories=INJECTION → returns only injection moulders
          - categories=INJECTION,BLOW → returns injection OR blow moulders
        """
        if not value or value.upper() == 'ALL':
            return queryset

        # Split comma-separated categories
        categories = [c.strip() for c in value.split(',') if c.strip()]
        if not categories:
            return queryset

        # Build OR query for multiple categories
        query = Q()
        for category in categories:
            query |= Q(category__iexact=category)

        return queryset.filter(query)

    def filter_by_countries(self, queryset, name, value):
        """
        Handle comma-separated countries.
        Example: countries=Germany,France,Italy
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