// frontend/src/hooks/useCustomReports.js

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import api from '../utils/api';

/**
 * Hook to fetch custom report details
 */
export const useCustomReportDetail = (reportId) => {
  return useQuery({
    queryKey: ['custom-report', reportId],
    queryFn: async () => {
      const response = await api.get(`/api/custom-reports/${reportId}/`);
      return response.data;
    },
    enabled: !!reportId,
    staleTime: 60000, // 1 minute
  });
};

/**
 * Hook to fetch custom report records with pagination and filters
 * NOW SUPPORTS: filter_groups with OR logic within groups, AND logic between groups
 */
export const useCustomReportRecords = (reportId, filters) => {
  return useQuery({
    queryKey: ['custom-report-records', reportId, filters],
    queryFn: async () => {
      const params = new URLSearchParams({
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

      // NEW: Handle filter groups
      if (filters.filter_groups) {
        params.append('filter_groups', filters.filter_groups);
      }

      // Add any additional filters
      Object.keys(filters).forEach(key => {
        if (['page', 'page_size', 'search', 'ordering', 'countries', 'filter_groups'].includes(key)) {
          return;
        }
        if (filters[key] !== undefined) {
          params.append(key, filters[key]);
        }
      });

      const response = await api.get(`/api/custom-reports/${reportId}/records/?${params.toString()}`);
      return response.data;
    },
    enabled: !!reportId,
    placeholderData: keepPreviousData, // THIS IS KEY - keeps previous data while loading
    staleTime: 30000, // 30 seconds
  });
};

/**
 * Hook to fetch all custom reports
 */
export const useCustomReports = (filters = {}) => {
  return useQuery({
    queryKey: ['custom-reports', filters],
    queryFn: async () => {
      const params = new URLSearchParams();

      if (filters.search) {
        params.append('search', filters.search);
      }
      if (filters.featured !== undefined) {
        params.append('featured', filters.featured);
      }

      const response = await api.get(`/api/custom-reports/?${params.toString()}`);
      return response.data.results || response.data;
    },
    staleTime: 60000, // 1 minute
  });
};