# reports/filters.py

import django_filters
from django.db.models import Q
from .models import SuperdatabaseRecord
from .fields import ALL_COMMONS


class SuperdatabaseRecordFilter(django_filters.FilterSet):
    category = django_filters.CharFilter(method='filter_by_category')
    countries = django_filters.CharFilter(method='filter_by_countries')  # NEW

    class Meta:
        model = SuperdatabaseRecord
        fields = ALL_COMMONS

    def filter_by_category(self, queryset, name, value):
        if value and value.upper() == 'ALL':
            return queryset
        if value:
            return queryset.filter(category=value)
        return queryset

    def filter_by_countries(self, queryset, name, value):
        """Handle comma-separated countries"""
        if not value:
            return queryset

        countries = [c.strip() for c in value.split(',') if c.strip()]
        if not countries:
            return queryset

        query = Q()
        for country in countries:
            query |= Q(country__iexact=country)

        return queryset.filter(query)