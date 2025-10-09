import { useQuery } from '@tanstack/react-query';
import api from '../utils/api';

export const useRecords = (filters) => {
  return useQuery({
    queryKey: ['records', filters],
    queryFn: async () => {
      const params = new URLSearchParams();

      // Add filters to query params
      if (filters.category && filters.category !== 'ALL') {
        params.append('category', filters.category);
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
      if (filters.ordering) {
        params.append('ordering', filters.ordering);
      }

      // Add boolean filters
      Object.keys(filters).forEach(key => {
        if (typeof filters[key] === 'boolean' && filters[key]) {
          params.append(key, 'true');
        }
      });

      const response = await api.get(`/api/records/?${params.toString()}`);
      return response.data;
    },
    keepPreviousData: true,
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