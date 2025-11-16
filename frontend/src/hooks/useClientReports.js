// frontend/src/hooks/useClientReports.js

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import api from '../utils/api';

export const useClientReportData = (reportId, filters) => {
  return useQuery({
    queryKey: ['client-report-data', reportId, filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        report_id: reportId,
        page: filters.page || 1,
        page_size: filters.page_size || 25,
      });

      if (filters.search?.trim()) {
        params.append('search', filters.search.trim());
      }
      if (filters.ordering) {
        params.append('ordering', filters.ordering);
      }
      if (filters.countries?.length > 0) {
        params.append('countries', filters.countries.join(','));
      }

      // NEW: Handle filter groups (now with technicalFilters support)
      if (filters.filter_groups) {
        params.append('filter_groups', filters.filter_groups);
      }

      Object.keys(filters).forEach(key => {
        if (['report_id', 'page', 'page_size', 'search', 'ordering', 'countries', 'filter_groups'].includes(key)) {
          return;
        }
        if (filters[key] !== undefined) {
          params.append(key, filters[key]);
        }
      });

      const response = await api.get(`/api/client/report-data/?${params.toString()}`);
      return response.data;
    },
    enabled: !!reportId,
    placeholderData: keepPreviousData,
    staleTime: 30000,
  });
};

export const useClientReportStats = (reportId, filters) => {
  return useQuery({
    queryKey: ['client-report-stats', reportId, filters],
    queryFn: async () => {
      const params = new URLSearchParams({ report_id: reportId });

      if (filters.search?.trim()) {
        params.append('search', filters.search.trim());
      }
      if (filters.countries?.length > 0) {
        params.append('countries', filters.countries.join(','));
      }

      // NEW: Handle filter groups (now with technicalFilters support)
      if (filters.filter_groups) {
        params.append('filter_groups', filters.filter_groups);
      }

      Object.keys(filters).forEach(key => {
        if (['report_id', 'page', 'page_size', 'ordering', 'search', 'countries', 'filter_groups'].includes(key)) {
          return;
        }
        if (filters[key] !== undefined) {
          params.append(key, filters[key]);
        }
      });

      const response = await api.get(`/api/client/report-stats/?${params.toString()}`);
      return response.data;
    },
    enabled: !!reportId,
    staleTime: 60000,
  });
};

export const useClientReportCountries = (reportId) => {
  return useQuery({
    queryKey: ['client-report-countries', reportId],
    queryFn: async () => {
      const response = await api.get(`/api/client/report-stats/?report_id=${reportId}`);
      return response.data.all_countries || [];
    },
    enabled: !!reportId,
    staleTime: 300000,
  });
};

export const useClientReportFilterOptions = (reportId) => {
  return useQuery({
    queryKey: ['client-report-filters', reportId],
    queryFn: async () => {
      const response = await api.get(`/api/client/filter-options/?report_id=${reportId}`);
      return response.data;
    },
    enabled: !!reportId,
    staleTime: 300000,
  });
};

// NEW: Hook for client report technical filter options
export const useClientReportTechnicalFilterOptions = (reportId) => {
  return useQuery({
    queryKey: ['client-report-technical-filters', reportId],
    queryFn: async () => {
      // You'll need to create this endpoint in your backend
      const response = await api.get(`/api/client/technical-filter-options/?report_id=${reportId}`);
      return response.data;
    },
    enabled: !!reportId,
    staleTime: 300000,
  });
};

export const useClientReportAccess = (reportId) => {
  return useQuery({
    queryKey: ['client-report-access', reportId],
    queryFn: async () => {
      const response = await api.get('/api/client/subscriptions/');
      const subscription = response.data.find(
        sub => sub.report_id === reportId && sub.is_active
      );
      return subscription;
    },
    enabled: !!reportId,
    retry: 1,
    staleTime: 0,  // Always fetch fresh data
    cacheTime: 0,  // Don't cache at all for subscription data
  });
};