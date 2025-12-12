// frontend/src/pages/client/ClientReportViewPage.jsx

import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { getBreadcrumbs } from '../../utils/breadcrumbConfig';
import {
  Database, Search, X, Filter, Download, ArrowLeft, FileText,
  Globe, BarChart3, PieChart, TrendingUp, Calendar, AlertCircle,
  Users, Package, MapPin, Clock, TableProperties
} from 'lucide-react';
import {
  BarChart, Bar, PieChart as RechartsPie, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import ClientDashboardLayout from '../../components/layout/ClientDashboardLayout';
import DataTable from '../../components/database/DataTable';
import RecordDetailModal from '../../components/database/RecordDetailModal';
import Pagination from '../../components/database/Pagination';
import LoadingSpinner from '../../components/LoadingSpinner';
import CompanyFilterSidebar from '../../components/database/CompanyFilterSidebar';
import SavedSearchManager from '../../components/client/SavedSearchManager';
import { getSavedSearches } from '../../services/savedSearchService';
import ExportModal from '../../components/client/ExportModal';
import api from '../../utils/api';
import {
  useClientReportData,
  useClientReportStats,
  useClientReportCountries,
  useClientReportFilterOptions,
  useClientReportTechnicalFilterOptions,
  useClientReportAccess,
  useClientMaterialStats
} from '../../hooks/useClientReports';

const COLORS = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4', '#6366F1'];

const ClientReportViewPage = () => {
  const { reportId } = useParams();
  const navigate = useNavigate();

  // STATE DECLARATIONS
  const [selectedRecords, setSelectedRecords] = useState(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({});
  const [countryFilters, setCountryFilters] = useState([]);
  const [categoryFilters, setCategoryFilters] = useState([]);
  const [statusFilters, setStatusFilters] = useState([]);
  const [filterGroups, setFilterGroups] = useState([]);
  const [ordering, setOrdering] = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [defaultSearchLoaded, setDefaultSearchLoaded] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [filtersInitialized, setFiltersInitialized] = useState(false);
  
  // Report default values (for reset functionality)
  const [reportDefaultStatus, setReportDefaultStatus] = useState(['COMPLETE', 'INCOMPLETE']);
  const [reportDefaultFilterGroups, setReportDefaultFilterGroups] = useState([]);
  const location = useLocation();  
  const breadcrumbs = getBreadcrumbs(location.pathname);   

  // REACT QUERY HOOKS
  const { data: reportAccess, isLoading: accessLoading } = useClientReportAccess(reportId);

  // Custom breadcrumbs with report name
  const customBreadcrumbs = useMemo(() => {
    if (!reportAccess?.report_title) return breadcrumbs;
    
    return [
      { label: 'Client Dashboard', path: '/client/dashboard' },
      { label: 'Reports', path: '/client/reports' },
      { label: reportAccess.report_title, path: `/client/reports/${reportId}` }
    ];
  }, [reportAccess, reportId, breadcrumbs]);

    const queryFilters = useMemo(() => ({
      page: currentPage,
      page_size: pageSize,
      search: searchQuery,
      ordering: ordering,
      countries: countryFilters,
      categories: categoryFilters,
      status: statusFilters,
      filter_groups: filterGroups.length > 0 ? JSON.stringify(filterGroups) : undefined,
      ...filters
    }), [currentPage, pageSize, searchQuery, ordering, countryFilters, categoryFilters, statusFilters, filterGroups, filters]);

  const { data: reportData, isLoading: dataLoading } = useClientReportData(
    reportId,
    queryFilters
  );

    const statsFilters = useMemo(() => ({
      search: searchQuery,
      countries: countryFilters,
      categories: categoryFilters,
      filter_groups: filterGroups.length > 0 ? JSON.stringify(filterGroups) : undefined,
      ...filters
    }), [searchQuery, countryFilters, categoryFilters, filterGroups, filters]);

  const { data: stats, isLoading: statsLoading } = useClientReportStats(
    reportId,
    statsFilters
  );

  // Material stats with filters applied
  const { data: materialStats, isLoading: materialStatsLoading } = useClientMaterialStats(
    reportId,
    statsFilters
  );

  const { data: allCountries = [] } = useClientReportCountries(reportId);
  const { data: filterOptions = [] } = useClientReportFilterOptions(reportId);
  const { data: technicalFilterOptions = [] } = useClientReportTechnicalFilterOptions(reportId);

  const customColumns = useMemo(() => [
    {
      accessorKey: 'company_name',
      header: 'COMPANY NAME',
      minSize: 250,
      cell: ({ row }) => (
        <div className="font-medium text-gray-900 truncate text-sm">
          {row.original.company_name || '-'}
        </div>
      ),
      enableSorting: true,
    },
    {
      accessorKey: 'country',
      header: 'COUNTRY',
      size: 120,
      cell: ({ row }) => (
        <div className="text-gray-700 text-sm">
          {row.original.country || '-'}
        </div>
      ),
      enableSorting: true,
    },
    {
      accessorKey: 'categories',
      header: 'CATEGORIES',
      size: 150,
      cell: ({ row }) => {
        const categories = row.original.categories || [];
        
        if (!categories || categories.length === 0) {
          return <span className="text-gray-400 text-sm">-</span>;
        }

        const CATEGORY_LABELS = {
          INJECTION: 'Injection', BLOW: 'Blow', ROTO: 'Roto',
          PE_FILM: 'PE Film', SHEET: 'Sheet', PIPE: 'Pipe',
          TUBE_HOSE: 'Tube & Hose', PROFILE: 'Profile',
          CABLE: 'Cable', COMPOUNDER: 'Compounder',
        };

        const CATEGORY_COLORS = {
          INJECTION: 'bg-blue-100 text-blue-800',
          BLOW: 'bg-green-100 text-green-800',
          ROTO: 'bg-purple-100 text-purple-800',
          PE_FILM: 'bg-yellow-100 text-yellow-800',
          SHEET: 'bg-red-100 text-red-800',
          PIPE: 'bg-indigo-100 text-indigo-800',
          TUBE_HOSE: 'bg-pink-100 text-pink-800',
          PROFILE: 'bg-orange-100 text-orange-800',
          CABLE: 'bg-teal-100 text-teal-800',
          COMPOUNDER: 'bg-cyan-100 text-cyan-800',
        };

        const firstCategory = categories[0];
        const colorClass = CATEGORY_COLORS[firstCategory] || 'bg-gray-100 text-gray-800';
        const label = CATEGORY_LABELS[firstCategory] || firstCategory;

        return (
          <div className="flex items-center gap-1">
            <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${colorClass}`}>
              {label}
            </span>
            {categories.length > 1 && (
              <span className="text-xs text-gray-500">+{categories.length - 1}</span>
            )}
          </div>
        );
      },
      enableSorting: true,
    },
    {
      accessorKey: 'status',
      header: 'STATUS',
      size: 100,
      cell: ({ row }) => {
        const status = row.original.status || 'ACTIVE';
        
        const STATUS_COLORS = {
          ACTIVE: 'bg-green-100 text-green-800',
          INACTIVE: 'bg-yellow-100 text-yellow-800',
          DELETED: 'bg-red-100 text-red-800',
        };

        const STATUS_LABELS = {
          ACTIVE: 'Complete',
          INACTIVE: 'Incomplete',
          DELETED: 'Deleted',
        };

        const colorClass = STATUS_COLORS[status] || 'bg-gray-100 text-gray-800';
        const label = STATUS_LABELS[status] || status;

        return (
          <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${colorClass}`}>
            {label}
          </span>
        );
      },
      enableSorting: true,
    },
  ], []);

  // NO TRANSFORMATION NEEDED - Backend returns correct format
  const records = useMemo(() => {
    const rawRecords = reportData?.results || [];
    
    // Debug: Log raw data from API (only once)
    if (rawRecords.length > 0 && !window.__client_report_logged) {
      console.log('📊 Raw API record:', rawRecords[0]);
      window.__client_report_logged = true;
    }
    
    // Return records as-is - backend already provides correct structure
    return rawRecords;
  }, [reportData]);

  // Extract data from React Query responses
  const totalCount = reportData?.count || 0;
  const totalPages = Math.ceil(totalCount / pageSize);
  const availableCategories = stats?.available_categories || [];

  // Extract report criteria from subscription data
  const reportCriteria = useMemo(() => {
    // Backend sends 'report_filter_criteria' field from SubscriptionSerializer
    const criteria = reportAccess?.report_filter_criteria || {};
    console.log('🔍 Report criteria from subscription:', criteria);
    return criteria;
  }, [reportAccess]);

  // Get report's configured categories
  const reportCategories = useMemo(() => {
    if (!reportCriteria || Object.keys(reportCriteria).length === 0) return [];
    
    let categories = [];
    if (Array.isArray(reportCriteria.categories) && reportCriteria.categories.length > 0) {
      categories = reportCriteria.categories;
    } else if (typeof reportCriteria.categories === 'string' && reportCriteria.categories) {
      categories = [reportCriteria.categories];
    } else if (reportCriteria.category) {
      categories = Array.isArray(reportCriteria.category) 
        ? reportCriteria.category 
        : [reportCriteria.category];
    }
    
    console.log('📦 Report categories from criteria:', categories);
    return categories;
  }, [reportCriteria]);

  // Get report's configured countries
  const reportCountries = useMemo(() => {
    if (!reportCriteria) return [];
    if (Array.isArray(reportCriteria.country)) return reportCriteria.country;
    return [];
  }, [reportCriteria]);

  // Get report's configured status filters
  const reportStatusFiltersCriteria = useMemo(() => {
    if (!reportCriteria || Object.keys(reportCriteria).length === 0) return ['COMPLETE'];
    
    let status = [];
    if (Array.isArray(reportCriteria.status) && reportCriteria.status.length > 0) {
      status = reportCriteria.status;
    } else if (reportCriteria.status) {
      status = [reportCriteria.status];
    } else {
      status = ['COMPLETE']; // Default
    }
    
    console.log('✅ Report status from criteria:', status);
    return status;
  }, [reportCriteria]);

  // Get report's configured filter groups
  const reportFilterGroupsCriteria = useMemo(() => {
    if (!reportCriteria) return [];
    
    // If filter_groups exists, use it
    if (Array.isArray(reportCriteria.filter_groups) && reportCriteria.filter_groups.length > 0) {
      return reportCriteria.filter_groups;
    }
    
    // Check for legacy materials at top level
    const legacyMaterials = {};
    const excludedKeys = ['category', 'categories', 'country', 'status', 'filter_groups'];
    Object.keys(reportCriteria).forEach(key => {
      if (!excludedKeys.includes(key) && typeof reportCriteria[key] === 'boolean') {
        legacyMaterials[key] = reportCriteria[key];
      }
    });
    
    if (Object.keys(legacyMaterials).length > 0) {
      return [{
        id: 'legacy-materials',
        name: 'Filter Group 1',
        filters: legacyMaterials,
        technicalFilters: {}
      }];
    }
    
    return [];
  }, [reportCriteria]);

  // Initialize filters from report criteria when data is loaded
  useEffect(() => {
    if (filtersInitialized) return;
    
    // Wait for report access data to be loaded
    if (!reportAccess) {
      console.log('⏳ Waiting for reportAccess...');
      return;
    }
    
    // Wait for stats to load (we need availableCategories and allCountries for fallbacks)
    // But only if report doesn't specify them
    const needsAvailableCategories = reportCategories.length === 0;
    const needsAllCountries = reportCountries.length === 0;
    
    if (needsAvailableCategories && availableCategories.length === 0) {
      console.log('⏳ Waiting for availableCategories...');
      return;
    }
    
    if (needsAllCountries && allCountries.length === 0) {
      console.log('⏳ Waiting for allCountries...');
      return;
    }
    
    console.log('🚀 Initializing client report filters:', {
      reportCriteria,
      reportCategories,
      reportCountries,
      reportStatusFiltersCriteria,
      availableCategories,
      allCountries: allCountries.length
    });
    
    // Initialize status from report criteria
    setStatusFilters([...reportStatusFiltersCriteria]);
    setReportDefaultStatus([...reportStatusFiltersCriteria]);
    
    // Initialize categories from report criteria
    // If report has specific categories, use them; otherwise use all available from stats
    if (reportCategories.length > 0) {
      console.log('✅ Setting category filters from report:', reportCategories);
      setCategoryFilters([...reportCategories]);
    } else if (availableCategories.length > 0) {
      console.log('⚠️ Falling back to all available categories:', availableCategories);
      setCategoryFilters([...availableCategories]);
    }
    
    // Initialize countries from report criteria
    // If report has specific countries, use them; otherwise use all available from stats
    if (reportCountries.length > 0) {
      console.log('✅ Setting country filters from report:', reportCountries);
      setCountryFilters([...reportCountries]);
    } else if (allCountries.length > 0) {
      console.log('⚠️ Falling back to all available countries:', allCountries.length);
      setCountryFilters([...allCountries]);
    }
    
    // Initialize filter groups from report criteria
    if (reportFilterGroupsCriteria.length > 0) {
      setFilterGroups([...reportFilterGroupsCriteria]);
      setReportDefaultFilterGroups([...reportFilterGroupsCriteria]);
    }
    
    // Mark initialization complete
    setFiltersInitialized(true);
    console.log('✅ Filters initialized successfully');
  }, [reportAccess, reportCriteria, reportStatusFiltersCriteria, reportCategories, reportCountries, reportFilterGroupsCriteria, availableCategories, allCountries, filtersInitialized]);

  // Format the expiry date
  const formattedExpiryDate = reportAccess?.end_date
    ? new Date(reportAccess.end_date).toLocaleDateString('tr-TR', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric'
      })
    : 'N/A';

  // Calculate days remaining
  const daysRemaining = reportAccess?.end_date
    ? Math.ceil((new Date(reportAccess.end_date) - new Date()) / (1000 * 60 * 60 * 24))
    : 0;

  // Get top materials (top 3) - from backend endpoint with filters applied
  const topMaterials = useMemo(() => {
    if (!materialStats?.top_materials) return [];
    
    return materialStats.top_materials.map(item => ({
      material: item.label,
      count: item.count
    }));
  }, [materialStats]);

  // Get top countries (try multiple possible field names)
  const topCountries = useMemo(() => {
    if (!stats) return [];

    // Try different possible field names
    if (stats.top_countries && Array.isArray(stats.top_countries)) {
      return stats.top_countries.slice(0, 3);
    }

    if (stats.country_distribution && Array.isArray(stats.country_distribution)) {
      return stats.country_distribution.slice(0, 3);
    }

    if (stats.countries && Array.isArray(stats.countries)) {
      return stats.countries.slice(0, 3);
    }

    return [];
  }, [stats]);

  useEffect(() => {
    const loadDefaultSearch = async () => {
      // Only load once when component mounts
      if (defaultSearchLoaded || !reportId) return;

      try {
        const response = await getSavedSearches(reportId);
        const savedSearches = response.results || [];

        // Find the default search
        const defaultSearch = savedSearches.find(search => search.is_default);

        if (defaultSearch) {
          console.log('Loading default search:', defaultSearch.name);
          console.log('Default search filter params:', defaultSearch.filter_params);

          // IMPORTANT: Use the proper handleLoadSavedSearch function
          handleLoadSavedSearch(defaultSearch.filter_params);

          // Show a subtle notification (optional)
          console.log(`Default search "${defaultSearch.name}" loaded`);
        }

        setDefaultSearchLoaded(true);
      } catch (error) {
        console.error('Error loading default search:', error);
        setDefaultSearchLoaded(true);
      }
    };

    loadDefaultSearch();
  }, [reportId]); // Run when reportId changes

  // SECURITY: Copy & Screenshot Protection
  useEffect(() => {
    const handleContextMenu = (e) => {
      e.preventDefault();
      return false;
    };

    const handleKeyDown = (e) => {
      if (
        (e.ctrlKey && (e.key === 'c' || e.key === 'x' || e.key === 's' || e.key === 'p')) ||
        (e.metaKey && (e.key === 'c' || e.key === 'x' || e.key === 's' || e.key === 'p')) ||
        e.key === 'PrintScreen'
      ) {
        e.preventDefault();
        return false;
      }
    };

    const disableSelection = (e) => {
      e.preventDefault();
      return false;
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('selectstart', disableSelection);
    document.addEventListener('copy', disableSelection);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('selectstart', disableSelection);
      document.removeEventListener('copy', disableSelection);
    };
  }, []);

  // Verify access on mount
  useEffect(() => {
    if (!accessLoading && !reportAccess) {
      alert('You do not have access to this report');
      navigate('/client/reports');
    }
  }, [reportAccess, accessLoading, navigate]);

  // EXPORT FUNCTION
  const handleExport = () => {
    setShowExportModal(true);
  };

  // HELPER: Build query string from current filters for visualization
  const buildFilterQueryString = () => {
    const params = new URLSearchParams();

    if (searchQuery) {
      params.append('search', searchQuery);
    }

    if (countryFilters.length > 0) {
      params.append('countries', countryFilters.join(','));
    }

    if (categoryFilters.length > 0) {
      params.append('categories', categoryFilters.join(','));
    }

    if (filterGroups.length > 0) {
      params.append('filter_groups', JSON.stringify(filterGroups));
    }

    Object.entries(filters).forEach(([key, value]) => {
      params.append(key, value);
    });

    return params.toString();
  };

  // Navigate to visualization with filters
  const navigateToVisualization = () => {
    const queryString = buildFilterQueryString();
    const url = `/client/reports/${reportId}/visualization${queryString ? `?${queryString}` : ''}`;
    navigate(url);
  };

  // Navigate to focus view with filters
  const navigateToFocusView = () => {
    const params = new URLSearchParams();
    
    if (searchQuery) params.append('search', searchQuery);
    if (countryFilters.length > 0) params.append('countries', countryFilters.join(','));
    if (categoryFilters.length > 0) params.append('categories', categoryFilters.join(','));
    if (statusFilters.length > 0) params.append('status', statusFilters.join(','));
    if (filterGroups.length > 0) params.append('filter_groups', JSON.stringify(filterGroups));
    
    const queryString = params.toString();
    const url = `/client/reports/${reportId}/focus${queryString ? `?${queryString}` : ''}`;
    navigate(url);
  };

  /**
   * CRITICAL FIX: Handle loading saved searches with proper filter separation
   * This properly handles countries, categories, and other filters
   */
  const handleLoadSavedSearch = (filterParams) => {
    console.log('🔍 Loading saved search with params:', filterParams);

    // 1. Handle COUNTRIES (array)
    if (filterParams.countries) {
      if (Array.isArray(filterParams.countries)) {
        console.log('✅ Setting country filters:', filterParams.countries);
        setCountryFilters(filterParams.countries);
      } else {
        console.warn('⚠️ Countries is not an array:', filterParams.countries);
        setCountryFilters([]);
      }
    } else {
      setCountryFilters([]);
    }

    // 2. Handle CATEGORIES (array)
    if (filterParams.categories) {
      if (Array.isArray(filterParams.categories)) {
        console.log('✅ Setting category filters:', filterParams.categories);
        setCategoryFilters(filterParams.categories);
      } else {
        console.warn('⚠️ Categories is not an array:', filterParams.categories);
        setCategoryFilters([]);
      }
    } else {
      setCategoryFilters([]);
    }

    // 3. Handle SEARCH
    if (filterParams.search) {
      console.log('✅ Setting search query:', filterParams.search);
      setSearchQuery(filterParams.search);
    } else {
      setSearchQuery('');
    }

    // 4. Handle OTHER FILTERS (everything except countries, categories, search)
    const otherFilters = {};
    Object.keys(filterParams).forEach(key => {
      if (key !== 'countries' && key !== 'categories' && key !== 'search' && key !== 'filter_groups') {
        otherFilters[key] = filterParams[key];
      }
    });

    if (Object.keys(otherFilters).length > 0) {
      console.log('✅ Setting other filters:', otherFilters);
      setFilters(otherFilters);
    } else {
      setFilters({});
    }

    if (filterParams.filter_groups) {
      if (Array.isArray(filterParams.filter_groups)) {
        console.log('✅ Setting filter groups:', filterParams.filter_groups);
        setFilterGroups(filterParams.filter_groups);
      } else {
        console.warn('⚠️ Filter groups is not an array:', filterParams.filter_groups);
        setFilterGroups([]);
      }
    } else {
      setFilterGroups([]);
    }

    // 5. Reset pagination
    setCurrentPage(1);

    console.log('✅ Saved search loaded successfully!');
  };

  const toggleRecordSelection = (factoryId) => {
    const newSelection = new Set(selectedRecords);
    if (newSelection.has(factoryId)) {
      newSelection.delete(factoryId);
    } else {
      newSelection.add(factoryId);
    }
    setSelectedRecords(newSelection);
  };

  const selectAllRecords = (checked) => {
    if (checked) {
      const allIds = records.map(r => r.id);
      setSelectedRecords(new Set(allIds));
    } else {
      setSelectedRecords(new Set());
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setCurrentPage(1);
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      setCurrentPage(1);
    }
  };

  const removeCountryFilter = (country) => {
    setCountryFilters(prev => prev.filter(c => c !== country));
    setCurrentPage(1);
  };

  const removeCategoryFilter = (category) => {
    setCategoryFilters(prev => prev.filter(c => c !== category));
    setCurrentPage(1);
  };

  const removeFilter = (key) => {
    setFilters(prev => {
      const newFilters = { ...prev };
      delete newFilters[key];
      return newFilters;
    });
    setCurrentPage(1);
  };

    // Reset all filters to report defaults
    const clearAllFilters = () => {
      setFilters({});
      // Reset to report criteria defaults
      setCountryFilters(reportCountries.length > 0 ? [...reportCountries] : [...allCountries]);
      setCategoryFilters(reportCategories.length > 0 ? [...reportCategories] : [...availableCategories]);
      setStatusFilters([...reportStatusFiltersCriteria]);
      setFilterGroups([...reportFilterGroupsCriteria]);
      setSearchQuery('');
      setCurrentPage(1);
    };

    const handleApplyFilterGroups = (newGroups) => {
      setFilterGroups(newGroups);
      setCurrentPage(1);
    };

    // Reset filter groups to report defaults (called from sidebar Reset button)
    const handleResetFilterGroups = () => {
      // Reset to report criteria defaults
      setFilterGroups([...reportFilterGroupsCriteria]);
      setCountryFilters(reportCountries.length > 0 ? [...reportCountries] : [...allCountries]);
      setCategoryFilters(reportCategories.length > 0 ? [...reportCategories] : [...availableCategories]);
      setStatusFilters([...reportStatusFiltersCriteria]);
      setFilters({});
      setCurrentPage(1);
    };

    // Count material/technical filters from filter groups
    const groupFilterCount = filterGroups.reduce((sum, group) => {
      const materialCount = Object.keys(group.filters || {}).length;
      const technicalCount = Object.entries(group.technicalFilters || {}).filter(([_, f]) => {
        if (f.mode === 'equals') return f.equals !== '' && f.equals !== undefined;
        return (f.min !== '' && f.min !== undefined) || (f.max !== '' && f.max !== undefined);
      }).length;
      return sum + materialCount + technicalCount;
    }, 0);

    // Count report default filter groups
    const reportGroupFilterCount = reportFilterGroupsCriteria.reduce((sum, group) => {
      const materialCount = Object.keys(group.filters || {}).length;
      const technicalCount = Object.entries(group.technicalFilters || {}).filter(([_, f]) => {
        if (f.mode === 'equals') return f.equals !== '' && f.equals !== undefined;
        return (f.min !== '' && f.min !== undefined) || (f.max !== '' && f.max !== undefined);
      }).length;
      return sum + materialCount + technicalCount;
    }, 0);

    // Calculate active filters count - only count DEVIATIONS from report criteria defaults
    // Report defaults come from filter_criteria
    const reportDefaultCountries = reportCountries.length > 0 ? reportCountries : allCountries;
    const reportDefaultCategories = reportCategories.length > 0 ? reportCategories : availableCategories;
    
    const isCountriesAtDefault = reportDefaultCountries.length > 0 && 
      countryFilters.length === reportDefaultCountries.length &&
      countryFilters.every(c => reportDefaultCountries.includes(c));
    
    const isCategoriesAtDefault = reportDefaultCategories.length > 0 && 
      categoryFilters.length === reportDefaultCategories.length &&
      categoryFilters.every(c => reportDefaultCategories.includes(c));
    
    const isStatusAtDefault = statusFilters.length === reportStatusFiltersCriteria.length &&
      statusFilters.every(s => reportStatusFiltersCriteria.includes(s));
    
    // Check if filter groups match report defaults
    const isFilterGroupsAtDefault = JSON.stringify(filterGroups) === JSON.stringify(reportFilterGroupsCriteria) ||
      (filterGroups.length === 0 && reportFilterGroupsCriteria.length === 0);
    
    const activeFiltersCount =
      // Countries: only count if different from report default
      (!isCountriesAtDefault && countryFilters.length > 0 ? countryFilters.length : 0) +
      // Categories: only count if different from report default
      (!isCategoriesAtDefault && categoryFilters.length > 0 ? categoryFilters.length : 0) +
      // Status: only count if different from report default
      (!isStatusAtDefault ? statusFilters.length : 0) +
      // Filter groups: count deviation from default
      (!isFilterGroupsAtDefault ? groupFilterCount : 0) +
      // Legacy filters
      Object.keys(filters).filter(key => filters[key] !== undefined).length;

  if (accessLoading) {
    return (
      <ClientDashboardLayout>
        <div className="flex items-center justify-center h-full">
          <LoadingSpinner />
        </div>
      </ClientDashboardLayout>
    );
  }

  return (
    <ClientDashboardLayout
      pageTitle={reportAccess?.report_title || 'Report View'}
      pageSubtitleBottom={reportAccess?.report_description || 'View and analyze report data'}
      breadcrumbs={customBreadcrumbs}
    >
      <div className="p-6">
        {/* STATS CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Records Card */}
          <div className="relative overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg p-6 text-white">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-xl rounded-xl flex items-center justify-center">
                  <Database className="w-6 h-6" />
                </div>
                <BarChart3 className="w-8 h-8 text-white/30" />
              </div>
              <p className="text-sm text-blue-100 mb-1 font-medium">Total Records</p>
              <p className="text-3xl font-bold">{totalCount.toLocaleString()}</p>
              <p className="text-xs text-blue-100 mt-2">Companies in database</p>
            </div>
          </div>

          {/* Top Materials Card */}
          <div className="relative overflow-hidden bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-lg p-6 text-white">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-xl rounded-xl flex items-center justify-center">
                  <Package className="w-6 h-6" />
                </div>
                <TrendingUp className="w-8 h-8 text-white/30" />
              </div>
              <p className="text-sm text-purple-100 mb-2 font-medium">Top Materials</p>
              {materialStatsLoading ? (
                <p className="text-sm text-purple-100">Loading...</p>
              ) : topMaterials.length > 0 ? (
                <div className="space-y-1">
                  {topMaterials.map((item, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span className="text-purple-50 truncate">
                        {item.material}
                      </span>
                      <span className="text-purple-100 font-semibold ml-2">
                        {item.count}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-purple-100">No data available</p>
              )}
            </div>
          </div>

          {/* Top Countries Card */}
          <div className="relative overflow-hidden bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-lg p-6 text-white">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-xl rounded-xl flex items-center justify-center">
                  <MapPin className="w-6 h-6" />
                </div>
                <Globe className="w-8 h-8 text-white/30" />
              </div>
              <p className="text-sm text-green-100 mb-2 font-medium">Top Countries</p>
              {statsLoading ? (
                <p className="text-sm text-green-100">Loading...</p>
              ) : topCountries.length > 0 ? (
                <div className="space-y-1">
                  {topCountries.map((country, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span className="text-green-50 truncate">
                        {country.country || country.name || 'Unknown'}
                      </span>
                      <span className="text-green-100 font-semibold ml-2">
                        {country.count || country.value || 0}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-green-100">No data available</p>
              )}
            </div>
          </div>

          {/* Expiry Date Card */}
          <div className={`relative overflow-hidden rounded-2xl shadow-lg p-6 text-white ${
            daysRemaining <= 30 ? 'bg-gradient-to-br from-orange-500 to-orange-600' : 'bg-gradient-to-br from-indigo-500 to-indigo-600'
          }`}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-xl rounded-xl flex items-center justify-center">
                  <Calendar className="w-6 h-6" />
                </div>
                {daysRemaining <= 30 ? (
                  <AlertCircle className="w-8 h-8 text-white/30" />
                ) : (
                  <Clock className="w-8 h-8 text-white/30" />
                )}
              </div>
              <p className={`text-sm mb-1 font-medium ${daysRemaining <= 30 ? 'text-orange-100' : 'text-indigo-100'}`}>
                Expiry Date
              </p>
              <p className="text-xl font-bold mb-1">{formattedExpiryDate}</p>
              <p className={`text-xs mt-2 ${daysRemaining <= 30 ? 'text-orange-100' : 'text-indigo-100'}`}>
                {daysRemaining > 0 ? `${daysRemaining} days remaining` : 'Expired'}
              </p>
            </div>
          </div>
        </div>

        {/* SAVED SEARCH MANAGER */}
        <div className="mb-6">
          <SavedSearchManager
            reportId={reportId}
            currentFilters={{
              search: searchQuery,
              countries: countryFilters,
              categories: categoryFilters,
              filter_groups: filterGroups,
              ...filters
            }}
            onLoadSearch={handleLoadSavedSearch}
          />
        </div>

        {/* SEARCH & FILTERS */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
              <Database className="w-6 h-6 text-purple-600" />
              Search & Filter Companies
            </h2>
          </div>

          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search companies..."
                className="w-full pl-12 pr-10 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              {searchQuery && (
                <button
                  onClick={handleClearSearch}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2"
                >
                  <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>

            <button
              onClick={() => setShowFilters(true)}
              className="px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 flex items-center gap-2 shadow-sm relative"
            >
              <Filter className="w-5 h-5" />
              Filters
              {activeFiltersCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </button>
              <button
              onClick={navigateToVisualization}
              className="px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 flex items-center gap-2 shadow-lg"
              >
              <BarChart3 className="w-5 h-5" />
              Visualization
              </button>
            <button
              onClick={navigateToFocusView}
              className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 flex items-center gap-2 shadow-lg"
              title="View all companies with all fields in Excel-like format"
            >
              <TableProperties className="w-5 h-5" />
              Focus View
            </button>
            {/* Export button - commented out for now, will use later
            <button
              onClick={handleExport}
              disabled={exportLoading}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all shadow-md disabled:opacity-50"
            >
              <Download className="w-5 h-5" />
              Export
            </button>
            */}

          </div>

          {/* Active Filters Display */}
          {activeFiltersCount > 0 && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-gray-700">Active filters:</span>
                <button
                  onClick={clearAllFilters}
                  className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  Clear all
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {/* Category Filter Chips - only show if NOT at report default */}
                {!isCategoriesAtDefault && categoryFilters.length > 0 && (
                  <>
                    {categoryFilters.map(categoryValue => (
                      <span
                        key={categoryValue}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-800 border border-blue-300 rounded-full text-sm font-medium"
                      >
                        Category: {categoryValue}
                        <button
                          onClick={() => removeCategoryFilter(categoryValue)}
                          className="hover:opacity-70"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </span>
                    ))}
                  </>
                )}

                {/* Filter Group Chips */}
                {filterGroups.map((group, groupIndex) => (
                  <div key={group.id} className="inline-flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-1 rounded">
                      {group.name}:
                    </span>
                    {Object.entries(group.filters || {}).map(([field, value]) => {
                      const option = filterOptions.find(opt => opt.field === field);
                      return (
                        <span
                          key={field}
                          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                            value === true
                              ? 'bg-green-100 text-green-800 border border-green-300'
                              : 'bg-red-100 text-red-800 border border-red-300'
                          }`}
                        >
                          {option?.label || field.replace(/_/g, ' ')}: {value ? 'Include' : 'Exclude'}
                          <button
                            onClick={() => {
                              const newGroups = filterGroups.map((g, idx) => {
                                if (idx !== groupIndex) return g;
                                const newFilters = { ...g.filters };
                                delete newFilters[field];
                                return { ...g, filters: newFilters };
                              }).filter(g => Object.keys(g.filters || {}).length > 0);
                              setFilterGroups(newGroups);
                              setCurrentPage(1);
                            }}
                            className="hover:opacity-70"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </span>
                      );
                    })}

                    {/* Technical Filters */}
                    {Object.entries(group.technicalFilters || {}).map(([field, filterData]) => {
                      const option = technicalFilterOptions.find(opt => opt.field === field);
                      let displayValue = '';

                      if (filterData.mode === 'equals') {
                        displayValue = `= ${filterData.equals}`;
                      } else if (filterData.mode === 'range') {
                        if (filterData.min && filterData.max) {
                          displayValue = `${filterData.min} - ${filterData.max}`;
                        } else if (filterData.min) {
                          displayValue = `≥ ${filterData.min}`;
                        } else if (filterData.max) {
                          displayValue = `≤ ${filterData.max}`;
                        }
                      }

                      if (!displayValue) return null;

                      return (
                        <span
                          key={field}
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-100 text-indigo-800 border border-indigo-300 rounded-full text-sm font-medium"
                        >
                          {option?.label || field.replace(/_/g, ' ')}: {displayValue}
                          <button
                            onClick={() => {
                              const newGroups = filterGroups.map((g, idx) => {
                                if (idx !== groupIndex) return g;
                                const newTechnicalFilters = { ...g.technicalFilters };
                                delete newTechnicalFilters[field];
                                return { ...g, technicalFilters: newTechnicalFilters };
                              }).filter(g =>
                                Object.keys(g.filters || {}).length > 0 ||
                                Object.keys(g.technicalFilters || {}).length > 0
                              );
                              setFilterGroups(newGroups);
                              setCurrentPage(1);
                            }}
                            className="hover:opacity-70"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                ))}

                {/* Country Filters - only show if NOT at report default */}
                {!isCountriesAtDefault && countryFilters.length > 0 && countryFilters.map(country => (
                  <span
                    key={country}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-100 text-purple-800 border border-purple-300 rounded-full text-sm font-medium"
                  >
                    Country: {country}
                    <button
                      onClick={() => removeCountryFilter(country)}
                      className="hover:opacity-70"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </span>
                ))}

                {/* Legacy filters (if any) */}
                {Object.entries(filters).map(([key, value]) => {
                  if (value === undefined) return null;
                  const option = filterOptions.find(opt => opt.field === key);
                  return (
                    <span
                      key={key}
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                        value
                          ? 'bg-green-100 text-green-800 border border-green-300'
                          : 'bg-red-100 text-red-800 border border-red-300'
                      }`}
                    >
                      {option?.label || key.replace(/_/g, ' ')}: {value ? 'Include' : 'Exclude'}
                      <button onClick={() => removeFilter(key)} className="hover:opacity-70">
                        <X className="w-4 h-4" />
                      </button>
                    </span>
                  );
                })}
              </div>

              {/* Active Results Summary */}
              <div className="mt-4 bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-lg p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center shadow-md">
                      <span className="text-white text-lg">📊</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-indigo-900 mb-2 flex items-center gap-2">
                      <span>Active Results Summary</span>
                      <span className="text-xs bg-indigo-200 text-indigo-800 px-2 py-0.5 rounded-full font-normal">
                        Live
                      </span>
                    </h4>

                    {/* Summary Text */}
                    <div className="text-sm text-indigo-800 leading-relaxed space-y-1">
                      {(() => {
                        const sections = [];

                        // 1. Build Category Section
                        if (categoryFilters.length > 0) {
                          // Check if all categories are selected
                          const allCategoriesSelected = availableCategories.length > 0 && 
                            categoryFilters.length === availableCategories.length &&
                            categoryFilters.every(c => availableCategories.includes(c));
                          
                          if (allCategoriesSelected) {
                            sections.push(
                              <div key="categories">
                                <strong>Category:</strong> All categories ({availableCategories.length})
                              </div>
                            );
                          } else if (categoryFilters.length <= 5) {
                            // Show individual categories if 5 or fewer
                            sections.push(
                              <div key="categories">
                                <strong>Category:</strong> {categoryFilters.join(', ')}
                              </div>
                            );
                          } else {
                            // Show count if more than 5 categories
                            sections.push(
                              <div key="categories">
                                <strong>Category:</strong> {categoryFilters.length} categories selected
                              </div>
                            );
                          }
                        }

                        // 2. Build Country Section
                        if (countryFilters.length > 0) {
                          // Check if all countries are selected
                          const allCountriesSelected = allCountries.length > 0 && 
                            countryFilters.length === allCountries.length &&
                            countryFilters.every(c => allCountries.includes(c));
                          
                          if (allCountriesSelected) {
                            sections.push(
                              <div key="countries">
                                <strong>Country:</strong> All countries ({allCountries.length})
                              </div>
                            );
                          } else if (countryFilters.length <= 5) {
                            // Show individual countries if 5 or fewer
                            sections.push(
                              <div key="countries">
                                <strong>Country:</strong> {countryFilters.join(', ')}
                              </div>
                            );
                          } else {
                            // Show count if more than 5 countries
                            sections.push(
                              <div key="countries">
                                <strong>Country:</strong> {countryFilters.length} countries selected
                              </div>
                            );
                          }
                        }

                        // 3. Build Filter Groups Section (OR within groups, AND between groups)
if (filterGroups.length > 0) {
  const groupDescriptions = filterGroups.map((group) => {
    const filterDescriptions = [];

    // Material/Boolean filters
    const materialFilters = Object.entries(group.filters || {}).map(([field, value]) => {
      const option = filterOptions.find(opt => opt.field === field);
      const label = option?.label || field.replace(/_/g, ' ');
      const action = value
        ? '<span class="text-green-700 font-semibold">Include</span>'
        : '<span class="text-red-700 font-semibold">Exclude</span>';
      return `${label}: ${action}`;
    });

    // ✅ ADDED: Technical filters
    const technicalFilters = Object.entries(group.technicalFilters || {}).map(([field, filterData]) => {
      const option = technicalFilterOptions.find(opt => opt.field === field);
      const label = option?.label || field.replace(/_/g, ' ');

      let valueText = '';
      if (filterData.mode === 'equals') {
        valueText = `= ${filterData.equals}`;
      } else if (filterData.mode === 'range') {
        if (filterData.min && filterData.max) {
          valueText = `${filterData.min} - ${filterData.max}`;
        } else if (filterData.min) {
          valueText = `≥ ${filterData.min}`;
        } else if (filterData.max) {
          valueText = `≤ ${filterData.max}`;
        }
      }

      return valueText ? `${label}: <span class="text-indigo-700 font-semibold">${valueText}</span>` : '';
    }).filter(Boolean);

    // Combine both material and technical filters
    const allFilters = [...materialFilters, ...technicalFilters];

    // Within a group: OR logic
    if (allFilters.length === 0) return '';
    if (allFilters.length === 1) return `(${allFilters[0]})`;
    return `(${allFilters.join(' <strong>or</strong> ')})`;
  }).filter(Boolean);

  if (groupDescriptions.length > 0) {
    // Between groups: AND logic
    const filterText = groupDescriptions.length === 1
      ? groupDescriptions[0]
      : groupDescriptions.join(' <strong>and</strong> ');
    sections.push(
      <div key="filters" dangerouslySetInnerHTML={{ __html: `<strong>Filters:</strong> ${filterText}` }} />
    );
  }
}

                        // 4. Handle No Filters Case
                        if (sections.length === 0) {
                          return <em className="text-gray-500">No filters applied - showing all results</em>;
                        }

                        // 5. Return all sections (each on its own line)
                        return sections;
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
        {/* RESULTS COUNT */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-bold text-green-900">
              {totalCount.toLocaleString()} companies found
            </span>
          </div>
        </div>

        {/* DATA TABLE */}
        {dataLoading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner />
          </div>
        ) : records.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-16 text-center border border-gray-100">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No results found</h3>
            <p className="text-gray-600">Try adjusting your filters or search terms</p>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-6 border border-gray-100">
              <DataTable
                data={records}
                onRowClick={(record) => setSelectedRecord(record)}
                isGuest={false}
                onSort={setOrdering}
                currentSort={ordering}
                selectedRecords={selectedRecords}
                onSelectRecord={toggleRecordSelection}
                onSelectAll={selectAllRecords}
                customColumns={customColumns}  // ADD THIS
                idField="id"  // ADD THIS
              />
            </div>

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalCount={totalCount}
              pageSize={pageSize}
              onPageChange={(page) => {
                setCurrentPage(page);
              }}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setCurrentPage(1);
              }}
              showFirstLast={true}
            />
          </>
        )}
      </div>

      {/* FILTER DRAWER */}
        {/* Filter Sidebar - Report Context */}
        {showFilters && (
          <CompanyFilterSidebar
            isOpen={showFilters}
            onClose={() => setShowFilters(false)}
            filterGroups={filterGroups}
            filterOptions={filterOptions}
            technicalFilterOptions={technicalFilterOptions}
            // Report context props
            isReportContext={true}
            reportStatusFilters={reportDefaultStatus}
            reportFilterGroups={reportDefaultFilterGroups}
            // Status filters
            statusFilters={statusFilters}
            onStatusFilterChange={setStatusFilters}
            // Country filters
            countryFilters={countryFilters}
            onCountryFilterChange={setCountryFilters}
            allCountries={allCountries}
            // Category filters
            categoryFilters={categoryFilters}
            onCategoryFilterChange={setCategoryFilters}
            availableCategories={availableCategories}
            // Actions
            onApply={handleApplyFilterGroups}
            onReset={handleResetFilterGroups}
          />
        )}

      {/* DETAIL MODAL */}
      {selectedRecord && (
        <RecordDetailModal
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
          isGuest={false}
        />
      )}

      {/* EXPORT MODAL */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        reportId={reportId}
        currentFilters={{
          search: searchQuery,
          countries: countryFilters,
          categories: categoryFilters,
          ...filters
        }}
      />
    </ClientDashboardLayout>
  );
};

export default ClientReportViewPage;