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
      
      // CRITICAL: Always send these params so backend knows if user explicitly deselected all
      // Empty string means "user deselected all" → return 0 results
      // Not present means "use report defaults"
      
      // Handle countries filter - ALWAYS send if the array exists
      if (filters.countries !== undefined) {
        const countriesValue = Array.isArray(filters.countries) ? filters.countries.join(',') : '';
        params.append('countries', countriesValue);
        console.log('Sending countries:', countriesValue || '(empty - will return 0 results)');
      }
      
      // Handle categories filter - ALWAYS send if the array exists
      if (filters.categories !== undefined) {
        const categoriesValue = Array.isArray(filters.categories) ? filters.categories.join(',') : '';
        params.append('categories', categoriesValue);
        console.log('Sending categories:', categoriesValue || '(empty - will return 0 results)');
      }
      
      // Handle status filter - ALWAYS send if the array exists
      if (filters.status !== undefined) {
        const statusValue = Array.isArray(filters.status) ? filters.status.join(',') : '';
        params.append('status', statusValue);
        console.log('Sending status:', statusValue || '(empty - will return 0 results)');
      }

      // Handle filter groups (materials, technical filters, business type)
      // ALWAYS send filter_groups if defined - even empty array means "no filters applied"
      if (filters.filter_groups !== undefined) {
        params.append('filter_groups', filters.filter_groups);
        console.log('Sending filter_groups:', filters.filter_groups);
      }

      // Add any additional filters
      Object.keys(filters).forEach(key => {
        if (['page', 'page_size', 'search', 'ordering', 'countries', 'filter_groups', 'status', 'categories'].includes(key)) {
          return;
        }
        if (filters[key] !== undefined) {
          params.append(key, filters[key]);
        }
      });

      const url = `/api/custom-reports/${reportId}/records/?${params.toString()}`;
      console.log('Fetching report records:', url);
      
      const response = await api.get(url);
      console.log('Response count:', response.data?.count || 0);
      return response.data;
    },
    enabled: !!reportId,
    placeholderData: keepPreviousData,
    staleTime: 30000,
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