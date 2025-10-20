// frontend/src/hooks/useDatabase.js

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import api from '../utils/api';

export const useRecords = (filters) => {
  return useQuery({
    queryKey: ['records', filters],
    queryFn: async () => {
      const params = new URLSearchParams();

      // UPDATED: Changed from 'category' to 'categories'
      if (filters.categories && filters.categories !== 'ALL') {
        params.append('categories', filters.categories);
      }

      if (filters.search) {
        params.append('search', filters.search);
      }
      if (filters.page) {
        params.append('page', filters.page);
      }
      if (filters.page_size) {
        params.append('page_size', filters.page_size);
      }
      // Handle ordering/sorting
      if (filters.ordering) {
        params.append('ordering', filters.ordering);
      }
      // Handle country filter
      if (filters.countries) {
        params.append('countries', filters.countries);
      }

      // Add boolean filters - Handle both true AND false
      Object.keys(filters).forEach(key => {
        // UPDATED: Skip 'categories' instead of 'category'
        if (['categories', 'search', 'page', 'page_size', 'ordering', 'countries'].includes(key)) {
          return;
        }

        // Handle boolean filters (both include=true and exclude=false)
        if (typeof filters[key] === 'boolean') {
          params.append(key, filters[key].toString());
        }
      });

      const response = await api.get(`/api/records/?${params.toString()}`);
      return response.data;
    },
    // Show previous data while loading new data
    placeholderData: keepPreviousData,
  });
};

export const useFilterOptions = (category) => {
  return useQuery({
    queryKey: ['filter-options', category],
    queryFn: async () => {
      const response = await api.get(`/api/filter-options/?category=${category || 'ALL'}`);
      return response.data;
    },
  });
};

export const useRecordDetail = (factoryId) => {
  return useQuery({
    queryKey: ['record', factoryId],
    queryFn: async () => {
      const response = await api.get(`/api/records/${factoryId}/`);
      return response.data;
    },
    enabled: !!factoryId,
  });
};