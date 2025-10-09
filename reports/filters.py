# reports/filters.py

import django_filters
from .models import SuperdatabaseRecord
from .fields import ALL_COMMONS


class SuperdatabaseRecordFilter(django_filters.FilterSet):
    # We explicitly define the 'category' filter to use our custom logic method.
    category = django_filters.CharFilter(method='filter_by_category')

    class Meta:
        model = SuperdatabaseRecord
        # The fields list contains all our boolean tags.
        # 'category' is handled by the explicit definition above.
        fields = ALL_COMMONS

    def filter_by_category(self, queryset, name, value):
        """
        Custom filter method for the 'category' field.
        If the value is 'ALL', it returns the queryset without changes.
        Otherwise, it filters by the given category value.
        """
        # Make the check case-insensitive
        if value and value.upper() == 'ALL':
            return queryset
        # If a specific category is given, filter by it.
        if value:
            return queryset.filter(category=value)
        # If no category is provided at all, do nothing.
        return queryset