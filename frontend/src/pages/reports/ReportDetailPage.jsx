// frontend/src/pages/ReportDetailPage.jsx

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { getBreadcrumbs } from '../../utils/breadcrumbConfig';
import { useAuth } from '../../contexts/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import LoadingSpinner from '../../components/LoadingSpinner';
import DataTable, { CATEGORY_COLORS, CATEGORY_LABELS, STATUS_COLORS, STATUS_LABELS } from '../../components/database/DataTable';
import Pagination from '../../components/database/Pagination';
import CompanyFilterSidebar from '../../components/database/CompanyFilterSidebar';
import api from '../../utils/api';
import { CATEGORIES } from '../..//constants/categories';
import { useCustomReportDetail, useCustomReportRecords } from '../../hooks/useCustomReports';
import {
  ArrowLeft,
  FileText,
  Users,
  Calendar,
  Filter as FilterIcon,
  Download,
  Edit,
  Trash2,
  BarChart3,
  Globe,
  Layers,
  Search,
  X,
  SlidersHorizontal
} from 'lucide-react';

const ReportDetailPage = () => {
  const { reportId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isStaff = user?.role === 'SUPERADMIN' || user?.role === 'STAFF_ADMIN';

  const [selectedRecord, setSelectedRecord] = useState(null);
  const [selectedRecords, setSelectedRecords] = useState(new Set());

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Search and filters - these will be initialized from report criteria
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({});
  const [countryFilters, setCountryFilters] = useState([]);
  const [categoryFilters, setCategoryFilters] = useState([]);
  const [statusFilters, setStatusFilters] = useState([]);
  const [filterGroups, setFilterGroups] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [ordering, setOrdering] = useState('');
  const [filtersInitialized, setFiltersInitialized] = useState(false);

  // Filter options
  const [filterOptions, setFilterOptions] = useState([]);
  const [allCountries, setAllCountries] = useState([]);

  const availableCategories = CATEGORIES
    .filter(cat => cat.value !== 'ALL')
    .map(cat => cat.value);

  // Fetch report details using React Query - MUST be before useMemo that uses report
  const { data: report, isLoading: loading } = useCustomReportDetail(reportId);

  // Available categories/countries from report criteria (for sidebar display)
  const reportCategories = useMemo(() => {
    if (!report?.filter_criteria) return [];
    const criteria = report.filter_criteria;
    console.log('Report filter_criteria:', criteria); // Debug log
    
    // Handle categories as array
    if (Array.isArray(criteria.categories) && criteria.categories.length > 0) {
      return criteria.categories;
    }
    // Handle categories as single string value
    if (typeof criteria.categories === 'string' && criteria.categories) {
      return [criteria.categories];
    }
    // Handle category (singular) as string
    if (criteria.category) {
      return [criteria.category];
    }
    return [];
  }, [report]);

  const reportCountries = useMemo(() => {
    if (!report?.filter_criteria) return [];
    const criteria = report.filter_criteria;
    if (Array.isArray(criteria.country)) return criteria.country;
    return [];
  }, [report]);

  // Get status filters from report criteria
  const reportStatusFilters = useMemo(() => {
    if (!report?.filter_criteria) return ['COMPLETE'];
    const criteria = report.filter_criteria;
    console.log('Report status criteria:', criteria.status); // Debug log
    if (Array.isArray(criteria.status) && criteria.status.length > 0) {
      return criteria.status;
    }
    if (criteria.status) {
      return [criteria.status];
    }
    return ['COMPLETE']; // Default
  }, [report]);

  // Get filter groups from report criteria (including legacy materials)
  const reportFilterGroups = useMemo(() => {
    if (!report?.filter_criteria) return [];
    const criteria = report.filter_criteria;
    
    // If filter_groups exists, use it
    if (Array.isArray(criteria.filter_groups) && criteria.filter_groups.length > 0) {
      return criteria.filter_groups;
    }
    
    // Otherwise, check for legacy materials at top level
    const legacyMaterials = {};
    const excludedKeys = ['category', 'categories', 'country', 'status', 'filter_groups'];
    Object.keys(criteria).forEach(key => {
      if (!excludedKeys.includes(key) && typeof criteria[key] === 'boolean') {
        legacyMaterials[key] = criteria[key];
      }
    });
    
    // If legacy materials exist, return them as a filter group
    if (Object.keys(legacyMaterials).length > 0) {
      return [{
        id: 'legacy-materials',
        name: 'Filter Group 1',
        filters: legacyMaterials,
        technicalFilters: {}
      }];
    }
    
    return [];
  }, [report]);

  // Initialize filters from report criteria when report loads
  useEffect(() => {
    if (report && !filtersInitialized) {
      const criteria = report.filter_criteria || {};
      
      // Initialize status filters
      if (Array.isArray(criteria.status) && criteria.status.length > 0) {
        setStatusFilters(criteria.status);
      } else if (criteria.status) {
        setStatusFilters([criteria.status]);
      } else {
        // Default based on report - if report was created with specific status, use it
        setStatusFilters(['COMPLETE']); // Most reports are for complete companies
      }
      
      // Initialize category filters from report
      if (Array.isArray(criteria.categories) && criteria.categories.length > 0) {
        setCategoryFilters(criteria.categories);
      } else if (typeof criteria.categories === 'string' && criteria.categories) {
        // Handle categories as a single string
        setCategoryFilters([criteria.categories]);
      } else if (criteria.category) {
        setCategoryFilters([criteria.category]);
      }
      
      // Initialize country filters from report
      if (Array.isArray(criteria.country) && criteria.country.length > 0) {
        setCountryFilters(criteria.country);
      }
      
      // Initialize filter groups from report (including legacy materials)
      if (Array.isArray(criteria.filter_groups) && criteria.filter_groups.length > 0) {
        setFilterGroups(criteria.filter_groups);
      } else {
        // Check for legacy material filters at top level of filter_criteria
        const legacyMaterials = {};
        const excludedKeys = ['category', 'categories', 'country', 'status', 'filter_groups'];
        Object.keys(criteria).forEach(key => {
          if (!excludedKeys.includes(key) && typeof criteria[key] === 'boolean') {
            legacyMaterials[key] = criteria[key];
          }
        });
        
        // If there are legacy materials, create a filter group with them
        if (Object.keys(legacyMaterials).length > 0) {
          setFilterGroups([{
            id: Date.now().toString(),
            name: 'Filter Group 1',
            filters: legacyMaterials,
            technicalFilters: {}
          }]);
          console.log('Created filter group from legacy materials:', legacyMaterials);
        }
      }
      
      setFiltersInitialized(true);
      console.log('Filters initialized from report criteria:', criteria);
    }
  }, [report, filtersInitialized]);

  // Auto-select all countries when they're fetched and report doesn't specify countries
  // This ensures UI matches data (all countries selected = showing all countries' records)
  useEffect(() => {
    // Only run when:
    // 1. Filters have been initialized
    // 2. Report doesn't specify countries (reportCountries is empty)
    // 3. All countries have been fetched (allCountries has items)
    // 4. No countries are currently selected
    if (filtersInitialized && 
        reportCountries.length === 0 && 
        allCountries.length > 0 && 
        countryFilters.length === 0) {
      console.log('Auto-selecting all countries:', allCountries.length);
      setCountryFilters([...allCountries]);
    }
  }, [filtersInitialized, reportCountries, allCountries, countryFilters.length]);


  const location = useLocation();
  const breadcrumbs = getBreadcrumbs(location.pathname, {
    reportName: report?.title
  });  

  // Build query filters for React Query
  // Logic for when to send filters:
  // - Status & Categories: Always send (report always has these)
  // - Countries: Only send if report specifies countries (otherwise show all)
  // - Empty array = user explicitly deselected all = 0 results
  const queryFilters = useMemo(() => {
    console.log('Building queryFilters:', {
      status: statusFilters,
      categories: categoryFilters,
      countries: countryFilters,
      reportCountries,
      filterGroups,
      filtersInitialized
    });
    
    // Only apply filters after initialization is complete
    // This prevents sending empty filters before report criteria is loaded
    if (!filtersInitialized) {
      return {
        page: currentPage,
        page_size: pageSize,
        search: searchQuery,
        ordering: ordering,
        ...filters
      };
    }
    
    // Build the query object
    const query = {
      page: currentPage,
      page_size: pageSize,
      search: searchQuery,
      ordering: ordering,
      // Categories and status are always defined in reports
      categories: categoryFilters,
      status: statusFilters,
      // Always include filter_groups
      filter_groups: JSON.stringify(filterGroups),
      ...filters
    };
    
    // Only include countries filter if:
    // 1. The report originally specified countries (reportCountries.length > 0), OR
    // 2. The user has explicitly selected countries (countryFilters.length > 0)
    // If report doesn't specify countries and user hasn't selected any, don't filter by country
    if (reportCountries.length > 0 || countryFilters.length > 0) {
      query.countries = countryFilters;
    }
    
    return query;
  }, [currentPage, pageSize, searchQuery, ordering, countryFilters, categoryFilters, statusFilters, filterGroups, filters, filtersInitialized, reportCountries]);

  // Fetch records using React Query
  const { data: recordsData, isLoading: recordsLoading } = useCustomReportRecords(reportId, queryFilters);

  // Extract data from React Query responses
  const records = recordsData?.results || [];
  const totalCount = recordsData?.count || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  // Fetch technical filter options based on report categories
  // We need to store them in state since we're fetching for multiple categories
  const [combinedTechnicalOptions, setCombinedTechnicalOptions] = useState([]);

  // Fetch filter options and technical options for ALL report categories
  useEffect(() => {
    if (report?.filter_criteria) {
      const criteria = report.filter_criteria;
      
      // Extract categories handling all possible formats
      let categories = [];
      if (Array.isArray(criteria.categories) && criteria.categories.length > 0) {
        categories = criteria.categories;
      } else if (typeof criteria.categories === 'string' && criteria.categories) {
        categories = [criteria.categories];
      } else if (criteria.category) {
        categories = [criteria.category];
      }
      
      console.log('Fetching options for categories:', categories); // Debug
      
      // If no categories specified, fetch for 'ALL'
      const categoriesToFetch = categories.length > 0 ? categories : ['ALL'];
      
      fetchFilterOptionsForCategories(categoriesToFetch);
      fetchTechnicalOptionsForCategories(categoriesToFetch);
      fetchAllCountriesForCategories(categoriesToFetch);
    }
  }, [report]);

  const fetchFilterOptionsForCategories = async (categories) => {
    try {
      console.log('Fetching filter options for:', categories);
      // Fetch filter options for all categories and combine
      const allOptions = [];
      const seenFields = new Set();
      
      for (const category of categories) {
        const response = await api.get('/api/filter-options/', {
          params: { category: category || 'ALL' }
        });
        
        console.log(`Filter options for ${category}:`, response.data?.length);
        
        // Add unique options
        for (const option of (response.data || [])) {
          if (!seenFields.has(option.field)) {
            seenFields.add(option.field);
            allOptions.push(option);
          }
        }
      }
      
      console.log('Total filter options:', allOptions.length);
      setFilterOptions(allOptions);
    } catch (error) {
      console.error('Error fetching filter options:', error);
    }
  };

  const fetchTechnicalOptionsForCategories = async (categories) => {
    try {
      console.log('Fetching technical options for:', categories);
      // Fetch technical filter options for all categories and combine
      const allOptions = [];
      const seenFields = new Set();
      
      for (const category of categories) {
        const response = await api.get('/api/technical-filter-options/', {
          params: { category: category || 'ALL' }
        });
        
        console.log(`Technical options for ${category}:`, response.data?.length);
        
        // Add unique options
        for (const option of (response.data || [])) {
          if (!seenFields.has(option.field)) {
            seenFields.add(option.field);
            allOptions.push(option);
          }
        }
      }
      
      console.log('Total technical options:', allOptions.length);
      setCombinedTechnicalOptions(allOptions);
    } catch (error) {
      console.error('Error fetching technical filter options:', error);
    }
  };

  const fetchAllCountriesForCategories = async (categories) => {
    try {
      console.log('Fetching countries for categories:', categories);
      
      // Build params for the API call
      // Note: The backend may support filtering by categories parameter
      const params = {};
      if (categories.length > 0 && categories[0] !== 'ALL') {
        params.categories = categories.join(',');
        // Also try with 'category' param for backward compatibility
        params.category = categories.join(',');
      }
      
      const response = await api.get('/api/database-stats/', { params });
      console.log('Database stats response:', response.data);
      
      // Try different ways to extract countries from response
      let countries = [];
      
      if (response.data.all_countries && response.data.all_countries.length > 0) {
        countries = response.data.all_countries;
      } else if (response.data.by_country && response.data.by_country.length > 0) {
        countries = response.data.by_country.map(c => c.country).filter(Boolean).sort();
      }
      
      console.log('Fetched countries:', countries.length);
      setAllCountries(countries);
    } catch (error) {
      console.error('Error fetching countries:', error);
    }
  };


  const handleEditReport = () => {
    navigate(`/custom-reports/${reportId}/edit`);
  };

  const handleDeleteReport = async () => {
    if (!window.confirm('Are you sure you want to delete this report? This action cannot be undone.')) {
      return;
    }

    try {
      await api.delete(`/api/custom-reports/${reportId}/`);
      alert('Report deleted successfully');
      navigate('/custom-reports');
    } catch (error) {
      console.error('Error deleting report:', error);
      alert('Failed to delete report');
    }
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (countryFilters.length > 0) params.append('countries', countryFilters.join(','));
      if (categoryFilters.length > 0) params.append('categories', categoryFilters.join(','));
      if (filterGroups.length > 0) params.append('filter_groups', JSON.stringify(filterGroups));

      Object.keys(filters).forEach(key => {
        if (filters[key] !== undefined) {
          params.append(key, filters[key].toString());
        }
      });

      const response = await api.get(
        `/api/custom-reports/${reportId}/records/?${params.toString()}&format=xlsx`,
        { responseType: 'blob' }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${report.title.replace(/\s+/g, '_')}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Failed to export data');
    }
  };

  const toggleRecordSelection = (companyId) => {
    const newSelected = new Set(selectedRecords);
    if (newSelected.has(companyId)) {
      newSelected.delete(companyId);
    } else {
      newSelected.add(companyId);
    }
    setSelectedRecords(newSelected);
  };

  const selectAllRecords = () => {
    if (selectedRecords.size === records.length) {
      setSelectedRecords(new Set());
    } else {
      setSelectedRecords(new Set(records.map(r => r.company_id)));
    }
  };

  // Custom columns for Company Database data
  const customColumns = useMemo(() => [
    {
      accessorKey: 'company_name',
      header: 'Company Name',
      minSize: 300,
      cell: ({ row }) => (
        <div className="font-medium text-gray-900 truncate">
          {row.original.company_name}
        </div>
      ),
      enableSorting: true,
    },
    {
      accessorKey: 'country',
      header: 'Country',
      size: 150,
      cell: ({ row }) => (
        <div className="text-gray-700">
          {row.original.country || '-'}
        </div>
      ),
      enableSorting: true,
    },
    {
      accessorKey: 'all_categories',
      header: 'Categories',
      size: 250,
      cell: ({ row }) => {
        // Get categories from all_categories (returned by API) or production_sites
        const categories = row.original.all_categories || row.original.production_sites?.map(site => site.category) || [];
        const uniqueCategories = [...new Set(categories)].filter(Boolean);
        
        if (uniqueCategories.length === 0) {
          return <span className="text-gray-400">-</span>;
        }
        
        return (
          <div className="flex flex-wrap gap-1">
            {uniqueCategories.slice(0, 3).map((category, index) => {
              const colorClass = CATEGORY_COLORS[category] || 'bg-gray-100 text-gray-800';
              const label = CATEGORY_LABELS[category] || category;
              return (
                <span
                  key={index}
                  className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${colorClass}`}
                >
                  {label}
                </span>
              );
            })}
            {uniqueCategories.length > 3 && (
              <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                +{uniqueCategories.length - 3}
              </span>
            )}
          </div>
        );
      },
      enableSorting: false,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      size: 130,
      cell: ({ row }) => {
        const status = row.original.status;
        const colorClass = STATUS_COLORS[status] || 'bg-gray-100 text-gray-800';
        const label = STATUS_LABELS[status] || status || 'Unknown';
        return (
          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${colorClass}`}>
            {label}
          </span>
        );
      },
      enableSorting: true,
    },
  ], []);

    const getFilterCriteriaSummary = () => {
      if (!report?.filter_criteria) return [];

      const criteria = report.filter_criteria;
      const items = [];

      // Categories
      if (criteria.categories) {
        if (Array.isArray(criteria.categories) && criteria.categories.length > 0) {
          const categoryLabels = criteria.categories.map(cat =>
            CATEGORIES.find(c => c.value === cat)?.label || cat
          );
          items.push({
            label: 'Categories',
            value: categoryLabels.join(', '),
            type: 'category'
          });
        } else if (typeof criteria.categories === 'string') {
          const catLabel = CATEGORIES.find(c => c.value === criteria.categories)?.label || criteria.categories;
          items.push({
            label: 'Category',
            value: catLabel,
            type: 'category'
          });
        }
      } else if (criteria.category) {
        const catLabel = CATEGORIES.find(c => c.value === criteria.category)?.label || criteria.category;
        items.push({
          label: 'Category',
          value: catLabel,
          type: 'category'
        });
      }

      // Countries (from report criteria)
      if (criteria.country && Array.isArray(criteria.country) && criteria.country.length > 0) {
        items.push({
          label: 'Countries',
          value: criteria.country.length <= 3
            ? criteria.country.join(', ')
            : `${criteria.country.slice(0, 3).join(', ')} +${criteria.country.length - 3} more`,
          type: 'country'
        });
      }

      // Filter Groups (from report criteria)
      if (criteria.filter_groups && Array.isArray(criteria.filter_groups)) {
        criteria.filter_groups.forEach((group, index) => {
          // Boolean Material Filters
          const groupFilters = Object.entries(group.filters || {}).map(([field, value]) => {
            const option = filterOptions.find(opt => opt.field === field);
            const label = option?.label || field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            return `${label}: ${value ? 'Include' : 'Exclude'}`;
          });

          // Technical Filters
          const technicalFilters = Object.entries(group.technicalFilters || {}).map(([field, config]) => {
            const option = combinedTechnicalOptions.find(opt => opt.field === field);
            const label = option?.label || field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

            if (config.mode === 'equals') {
              return `${label} = ${config.equals}`;
            } else if (config.mode === 'range') {
              const min = config.min !== '' && config.min !== undefined ? config.min : null;
              const max = config.max !== '' && config.max !== undefined ? config.max : null;

              if (min !== null && max !== null) {
                return `${label}: ${min} - ${max}`;
              } else if (min !== null) {
                return `${label} ≥ ${min}`;
              } else if (max !== null) {
                return `${label} ≤ ${max}`;
              }
            }
            return null;
          }).filter(Boolean);

          // Combine all filters in this group
          const allFilters = [...groupFilters, ...technicalFilters];

          if (allFilters.length > 0) {
            items.push({
              label: `Filter Group ${index + 1}`,
              value: allFilters.join(', '),
              isFilterGroup: true,
              type: 'filter_group'
            });
          }
        });
      }

      // Legacy Material filters (backward compatibility)
      Object.keys(criteria).forEach(key => {
        if (!['category', 'categories', 'country', 'filter_groups'].includes(key)) {
          if (typeof criteria[key] === 'boolean') {
            const option = filterOptions.find(opt => opt.field === key);
            const label = option?.label || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            items.push({
              label,
              value: criteria[key] ? 'Include' : 'Exclude',
              isBoolean: true,
              boolValue: criteria[key],
              type: 'material'
            });
          }
        }
      });

      return items;
    };

    // NEW: Get active filters applied by user (not from report criteria)
    const getUserAppliedFilters = () => {
      const items = [];

      // User-selected categories
      if (categoryFilters.length > 0) {
        const categoryLabels = categoryFilters.map(cat =>
          CATEGORIES.find(c => c.value === cat)?.label || cat
        );
        items.push({
          label: 'Categories (User)',
          value: categoryLabels.join(', '),
          type: 'user_category',
          isUserFilter: true
        });
      }

      // User-selected countries
      if (countryFilters.length > 0) {
        items.push({
          label: 'Countries (User)',
          value: countryFilters.length <= 3
            ? countryFilters.join(', ')
            : `${countryFilters.slice(0, 3).join(', ')} +${countryFilters.length - 3} more`,
          type: 'user_country',
          isUserFilter: true
        });
      }

      // User-applied filter groups
      if (filterGroups.length > 0) {
        filterGroups.forEach((group, index) => {
          // Boolean Material Filters
          const groupFilters = Object.entries(group.filters || {}).map(([field, value]) => {
            const option = filterOptions.find(opt => opt.field === field);
            const label = option?.label || field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            return `${label}: ${value ? 'Include' : 'Exclude'}`;
          });

          // Technical Filters
          const technicalFilters = Object.entries(group.technicalFilters || {}).map(([field, config]) => {
            const option = combinedTechnicalOptions.find(opt => opt.field === field);
            const label = option?.label || field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

            if (config.mode === 'equals') {
              return `${label} = ${config.equals}`;
            } else if (config.mode === 'range') {
              const min = config.min !== '' && config.min !== undefined ? config.min : null;
              const max = config.max !== '' && config.max !== undefined ? config.max : null;

              if (min !== null && max !== null) {
                return `${label}: ${min} - ${max}`;
              } else if (min !== null) {
                return `${label} ≥ ${min}`;
              } else if (max !== null) {
                return `${label} ≤ ${max}`;
              }
            }
            return null;
          }).filter(Boolean);

          // Combine all filters in this group
          const allFilters = [...groupFilters, ...technicalFilters];

          if (allFilters.length > 0) {
            items.push({
              label: `User Filter Group ${index + 1}`,
              value: allFilters.join(', '),
              isFilterGroup: true,
              isUserFilter: true,
              type: 'user_filter_group'
            });
          }
        });
      }

      return items;
    };

      // NEW: Handle applying filter groups - memoized to prevent infinite loops
    const handleApplyFilterGroups = useCallback((newGroups) => {
      console.log('Applying filter groups:', newGroups);
      setFilterGroups(newGroups);
      setCurrentPage(1); // Reset to first page when filters change
      // Don't close the sidebar here - let the user close it manually
    }, []);

      // NEW: Reset filter groups - reset to report's original filter criteria
    const handleResetFilterGroups = () => {
      console.log('Resetting filter groups to report criteria');
      
      const criteria = report?.filter_criteria || {};
      
      // Reset to report's original filter groups (including materials)
      let restoredFilterGroups = [];
      
      if (Array.isArray(criteria.filter_groups) && criteria.filter_groups.length > 0) {
        // Deep copy the original filter groups
        restoredFilterGroups = criteria.filter_groups.map(group => ({
          id: group.id || Date.now().toString() + Math.random().toString(36).substr(2, 9),
          name: group.name || 'Filter Group 1',
          filters: { ...(group.filters || {}) },
          technicalFilters: { ...(group.technicalFilters || {}) }
        }));
        console.log('Reset to original filter groups:', restoredFilterGroups);
      } else {
        // Check for legacy material filters at top level of filter_criteria
        const legacyMaterials = {};
        const excludedKeys = ['category', 'categories', 'country', 'status', 'filter_groups'];
        Object.keys(criteria).forEach(key => {
          if (!excludedKeys.includes(key) && typeof criteria[key] === 'boolean') {
            legacyMaterials[key] = criteria[key];
          }
        });
        
        // If there are legacy materials, create a filter group with them
        if (Object.keys(legacyMaterials).length > 0) {
          restoredFilterGroups = [{
            id: Date.now().toString(),
            name: 'Filter Group 1',
            filters: legacyMaterials,
            technicalFilters: {}
          }];
          console.log('Reset to legacy materials:', legacyMaterials);
        }
      }
      
      setFilterGroups(restoredFilterGroups);
      
      // Reset to report's original countries (or all available if none specified)
      if (Array.isArray(criteria.country) && criteria.country.length > 0) {
        setCountryFilters([...criteria.country]);
      } else {
        // If report doesn't specify countries, select ALL available countries
        setCountryFilters([...allCountries]);
      }
      
      // Reset to report's original categories (select all available if none specified)
      if (Array.isArray(criteria.categories) && criteria.categories.length > 0) {
        setCategoryFilters([...criteria.categories]);
      } else if (criteria.category) {
        setCategoryFilters([criteria.category]);
      } else {
        // If report doesn't specify categories, keep the reportCategories (scope)
        setCategoryFilters([...reportCategories]);
      }
      
      // Reset to report's original status
      if (Array.isArray(criteria.status) && criteria.status.length > 0) {
        setStatusFilters([...criteria.status]);
      } else if (criteria.status) {
        setStatusFilters([criteria.status]);
      } else {
        setStatusFilters(['COMPLETE']);
      }
      
      setFilters({});
      setCurrentPage(1);
    };

  // Calculate active filters count - ONLY count user-applied filters that differ from report defaults
  // In report context:
  // - Status: only count if different from reportStatusFilters
  // - Categories: only count if different from reportCategories (user deselected some)
  // - Countries: only count if user selected specific countries (not all)
  // - Materials/Technical: always count (these are additional user refinements)
  const groupFilterCount = filterGroups.reduce((sum, group) => {
    const booleanCount = Object.keys(group.filters || {}).length;
    const technicalCount = Object.entries(group.technicalFilters || {}).filter(([field, filter]) => {
      if (filter.mode === 'equals') {
        return filter.equals !== '' && filter.equals !== undefined;
      } else {
        return (filter.min !== '' && filter.min !== undefined) ||
               (filter.max !== '' && filter.max !== undefined);
      }
    }).length;
    return sum + booleanCount + technicalCount;
  }, 0);

  // Check if status differs from report default
  const reportStatusSet = new Set(reportStatusFilters);
  const statusDiffersFromReport = reportStatusFilters.length !== statusFilters.length || 
    !statusFilters.every(s => reportStatusSet.has(s));
  
  // Check if categories differ from report default (all report categories selected)
  const categoriesDifferFromReport = categoryFilters.length !== reportCategories.length;
  
  // Check if countries differ from report default (all countries selected)
  const allCountriesSelected = allCountries.length > 0 && countryFilters.length === allCountries.length;
  const countriesDifferFromReport = !allCountriesSelected && countryFilters.length > 0;

  // Only count deviations from defaults, plus material/technical filters
  const activeFiltersCount =
    (statusDiffersFromReport ? statusFilters.length : 0) +
    (categoriesDifferFromReport ? categoryFilters.length : 0) +
    (countriesDifferFromReport ? countryFilters.length : 0) +
    groupFilterCount +
    Object.keys(filters).filter(key => filters[key] !== undefined).length;

  const filterCriteriaSummary = getFilterCriteriaSummary();

  // Handle row click - navigate to client company view (read-only, filtered by report categories)
  const handleRowClick = (record) => {
    navigate(`/custom-reports/${reportId}/companies/${record.company_id}`);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <LoadingSpinner />
        </div>
      </DashboardLayout>
    );
  }

  if (!report) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Report not found</h3>
            <button
              onClick={() => navigate('/custom-reports')}
              className="text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Back to Reports
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Define page subtitle
  const pageSubtitle = (
    <p className="text-sm text-white-500 mt-1">{report.description}</p>
  );

  const pageHeaderActions = null;

  return (
    <DashboardLayout
      pageTitle={report.title}
      pageSubtitleBottom={pageSubtitle}
      headerActions={pageHeaderActions}
      breadcrumbs={breadcrumbs}
    >
      {/* Content */}
      <div className="flex-1 overflow-auto bg-white">
        <div className="max-w-7xl mx-auto px-8 py-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-600 font-medium">Total Records</p>
                  <p className="text-2xl font-bold text-blue-900">{totalCount.toLocaleString()}</p>
                </div>
                <FileText className="w-8 h-8 text-blue-600 opacity-75" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-purple-600 font-medium">Subscribers</p>
                  <p className="text-2xl font-bold text-purple-900">{report.subscription_count || 0}</p>
                </div>
                <Users className="w-8 h-8 text-purple-600 opacity-75" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-green-600 font-medium">Status</p>
                  <p className="text-sm font-bold text-green-900 mt-1">
                    {report.is_active ? 'Active' : 'Inactive'}
                  </p>
                </div>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  report.is_active ? 'bg-green-600' : 'bg-gray-400'
                }`}>
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-orange-600 font-medium">Created</p>
                  <p className="text-sm font-bold text-orange-900 mt-1">
                    {new Date(report.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Calendar className="w-8 h-8 text-orange-600 opacity-75" />
              </div>
            </div>
          </div>

            {/* Filter Criteria - REMOVED: Don't show report filters to clients */}

          {/* Action Bar */}
          <div className="flex items-center justify-between mb-6">
            {/* Left side: Filter Button */}
            <button
              onClick={() => setShowFilters(true)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-white bg-purple-600 hover:bg-purple-700 flex items-center gap-2 "
            >
              <SlidersHorizontal className="w-4 h-4" />
              Additional Filters
              {activeFiltersCount > 0 && (
                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {/* Right side: Export/Edit/Delete Buttons */}
            <div className="flex items-center gap-3">
               <button
                 onClick={handleExport}
                 className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 text-sm"
               >
                 <Download className="w-4 h-4" />
                 Export Data
               </button>
               {isStaff && (
                 <>
                   <button
                     onClick={handleEditReport}
                     className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg transition flex items-center gap-2 text-sm"
                   >
                     <Edit className="w-4 h-4" />
                     Edit
                   </button>
                   <button
                     onClick={handleDeleteReport}
                     className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition flex items-center gap-2 text-sm"
                   >
                     <Trash2 className="w-4 h-4" />
                     Delete
                   </button>
                 </>
               )}
            </div>
          </div>

          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search records..."
                className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setCurrentPage(1);
                  }}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Results Count */}
          <div className="mb-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm font-medium text-green-900">
                {totalCount} records found
              </span>
            </div>
          </div>

          {/* Data Table */}
          {recordsLoading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : records.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Search className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No records found</p>
            </div>
          ) : (
            <>
              <div className="border rounded-lg overflow-hidden mb-4">
                <DataTable
                  data={records}
                  onRowClick={handleRowClick}
                  isGuest={false}
                  selectedRecords={selectedRecords}
                  onSelectRecord={toggleRecordSelection}
                  onSelectAll={selectAllRecords}
                  onSort={setOrdering}
                  currentSort={ordering}
                  customColumns={customColumns}
                  idField="company_id"
                />
              </div>

              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalCount={totalCount}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setCurrentPage(1);
                }}
                showFirstLast={true}
              />
            </>
          )}
        </div>
      </div>

      {/* Filter Sidebar - Company Database */}
      {showFilters && (
        <CompanyFilterSidebar
          isOpen={showFilters}
          onClose={() => setShowFilters(false)}

          // Report context - restrict to report's filters
          isReportContext={true}
          reportStatusFilters={reportStatusFilters}
          reportFilterGroups={report?.filter_criteria?.filter_groups || []}

          // Filter Groups
          filterGroups={filterGroups}

          // Filter Options - category-specific from parent
          filterOptions={filterOptions}
          technicalFilterOptions={combinedTechnicalOptions}

          // Status Filters
          statusFilters={statusFilters}
          onStatusFilterChange={setStatusFilters}

          // Countries - if report specifies countries, use those; otherwise use all countries for the categories
          countryFilters={countryFilters}
          onCountryFilterChange={setCountryFilters}
          allCountries={reportCountries.length > 0 ? reportCountries : allCountries}

          // Categories - report's categories only
          categoryFilters={categoryFilters}
          onCategoryFilterChange={setCategoryFilters}
          availableCategories={reportCategories}

          // Actions - pass memoized handler directly to avoid new function references
          onApply={handleApplyFilterGroups}
          onReset={() => {
            handleResetFilterGroups();
            setShowFilters(false);
          }}
        />
      )}
    </DashboardLayout>
  );
};

export default ReportDetailPage;
