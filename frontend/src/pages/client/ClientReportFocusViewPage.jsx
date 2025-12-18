// frontend/src/pages/client/ClientReportFocusViewPage.jsx
// Focus View - Excel-like display of all companies with all fields

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { getBreadcrumbs } from '../../utils/breadcrumbConfig';
import {
  ArrowLeft, Download, Search, X, Filter, CheckCircle, MinusCircle,
  ChevronLeft, ChevronRight, Maximize2, Minimize2, Columns,
  Eye, EyeOff, Settings, RefreshCw, FileSpreadsheet, ChevronDown,
  CheckSquare, Square, Minus, FileDown, Users, Table, BarChart2
} from 'lucide-react';
import ClientDashboardLayout from '../../components/layout/ClientDashboardLayout';
import LoadingSpinner from '../../components/LoadingSpinner';
import Pagination from '../../components/database/Pagination';
import CompanyFilterSidebar from '../../components/database/CompanyFilterSidebar';
import RecordDetailModal from '../../components/database/RecordDetailModal';
import ReportFeedbackModal from '../../components/client/ReportFeedbackModal';
import api from '../../utils/api';
import {
  useClientReportAccess,
  useClientReportStats,
  useClientReportCountries,
  useClientReportFilterOptions,
  useClientReportTechnicalFilterOptions
} from '../../hooks/useClientReports';

// Category labels
const CATEGORY_LABELS = {
  INJECTION: 'Injection Moulders',
  BLOW: 'Blow Moulders',
  ROTO: 'Rotational Moulders',
  PE_FILM: 'PE Film Producers',
  SHEET: 'Sheet Producers',
  PIPE: 'Pipe Producers',
  TUBE_HOSE: 'Tube & Hose Producers',
  PROFILE: 'Profile Producers',
  CABLE: 'Cable Producers',
  COMPOUNDER: 'Compounders',
};

// Short category labels for badges
const CATEGORY_SHORT_LABELS = {
  INJECTION: 'Injection',
  BLOW: 'Blow',
  ROTO: 'Roto',
  PE_FILM: 'PE Film',
  SHEET: 'Sheet',
  PIPE: 'Pipe',
  TUBE_HOSE: 'Tube & Hose',
  PROFILE: 'Profile',
  CABLE: 'Cable',
  COMPOUNDER: 'Compounder',
};

// All possible categories
const ALL_CATEGORIES = ['INJECTION', 'BLOW', 'ROTO', 'PE_FILM', 'SHEET', 'PIPE', 'TUBE_HOSE', 'PROFILE', 'CABLE', 'COMPOUNDER'];

// Company info fields (always shown first)
const COMPANY_INFO_FIELDS = [
  { key: 'company_name', label: 'Company Name', group: 'Company' },
  { key: 'address_1', label: 'Address 1', group: 'Company' },
  { key: 'address_2', label: 'Address 2', group: 'Company' },
  { key: 'address_3', label: 'Address 3', group: 'Company' },
  { key: 'address_4', label: 'Address 4', group: 'Company' },
  { key: 'region', label: 'Region', group: 'Company' },
  { key: 'country', label: 'Country', group: 'Company' },
  { key: 'geographical_coverage', label: 'Geographical Coverage', group: 'Company' },
  { key: 'phone_number', label: 'Phone Number', group: 'Company' },
  { key: 'company_email', label: 'Company Email', group: 'Company' },
  { key: 'website', label: 'Website', group: 'Company' },
  { key: 'accreditation', label: 'Accreditation', group: 'Company' },
  { key: 'parent_company', label: 'Parent Company', group: 'Company' },
];

// Contact fields
const CONTACT_FIELDS = [
  { key: 'title_1', label: 'Title 1', group: 'Contact 1' },
  { key: 'initials_1', label: 'Initials 1', group: 'Contact 1' },
  { key: 'surname_1', label: 'Surname 1', group: 'Contact 1' },
  { key: 'position_1', label: 'Position 1', group: 'Contact 1' },
  { key: 'title_2', label: 'Title 2', group: 'Contact 2' },
  { key: 'initials_2', label: 'Initials 2', group: 'Contact 2' },
  { key: 'surname_2', label: 'Surname 2', group: 'Contact 2' },
  { key: 'position_2', label: 'Position 2', group: 'Contact 2' },
  { key: 'title_3', label: 'Title 3', group: 'Contact 3' },
  { key: 'initials_3', label: 'Initials 3', group: 'Contact 3' },
  { key: 'surname_3', label: 'Surname 3', group: 'Contact 3' },
  { key: 'position_3', label: 'Position 3', group: 'Contact 3' },
  { key: 'title_4', label: 'Title 4', group: 'Contact 4' },
  { key: 'initials_4', label: 'Initials 4', group: 'Contact 4' },
  { key: 'surname_4', label: 'Surname 4', group: 'Contact 4' },
  { key: 'position_4', label: 'Position 4', group: 'Contact 4' },
];

// Fields to exclude from technical fields (these are company/contact or internal fields)
const EXCLUDED_FIELDS = new Set([
  'id', 'factory_id', 'company_name', 'status', 'categories', 'last_updated',
  'address_1', 'address_2', 'address_3', 'address_4', 'region', 'country',
  'geographical_coverage', 'phone_number', 'company_email', 'website',
  'accreditation', 'parent_company',
  'title_1', 'initials_1', 'surname_1', 'position_1',
  'title_2', 'initials_2', 'surname_2', 'position_2',
  'title_3', 'initials_3', 'surname_3', 'position_3',
  'title_4', 'initials_4', 'surname_4', 'position_4',
  '_state', 'version_id', 'production_site', 'production_site_id',
  'version_number', 'created_at', 'updated_at', 'is_active', 'is_current',
  'created_by', 'created_by_id', 'company', 'company_id',
  'verified_at', 'verified_by', 'verified_by_id', 'version_notes',
  'company_data_snapshot', 'contact_data_snapshot', 'notes_snapshot',
  'technical_data_snapshot', 'is_initial', 'category'
]);

const ClientReportFocusViewPage = () => {
  const { reportId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const breadcrumbs = getBreadcrumbs(location.pathname);
  const tableRef = useRef(null);
  const metadataFetchedRef = useRef(false);

  // Get filters from URL query params (passed from main report page)
  const queryParams = new URLSearchParams(location.search);
  
  // State
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [metadataLoading, setMetadataLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState(queryParams.get('search') || '');
  const [debouncedSearch, setDebouncedSearch] = useState(queryParams.get('search') || '');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState({});
  const [technicalFieldMeta, setTechnicalFieldMeta] = useState([]);
  const [columnsInitialized, setColumnsInitialized] = useState(false);
  
  // Filter state
  const [showFilters, setShowFilters] = useState(false);
  const [countryFilters, setCountryFilters] = useState([]);
  const [categoryFilters, setCategoryFilters] = useState([]);
  const [statusFilters, setStatusFilters] = useState([]);
  const [filterGroups, setFilterGroups] = useState([]);
  const [filtersInitialized, setFiltersInitialized] = useState(false);
  
  // Report default values (for reset functionality)
  const [reportDefaultStatus, setReportDefaultStatus] = useState(['COMPLETE', 'INCOMPLETE']);
  const [reportDefaultFilterGroups, setReportDefaultFilterGroups] = useState([]);
  
  // Selection state
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showExportModal, setShowExportModal] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportType, setExportType] = useState('all');

  // Drag to scroll state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [scrollStart, setScrollStart] = useState({ x: 0, y: 0 });
  const hasDraggedRef = useRef(false); // Use ref for more reliable tracking across event handlers
  const DRAG_THRESHOLD = 5; // Pixels of movement before considering it a drag
  
  // Company detail modal state
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [showCompanyModal, setShowCompanyModal] = useState(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1); // Reset to first page on search
    }, 400); // 400ms delay

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // React Query hooks
  const { data: reportAccess, isLoading: accessLoading } = useClientReportAccess(reportId);
  const { data: stats } = useClientReportStats(reportId, {});
  const { data: allCountries = [] } = useClientReportCountries(reportId);
  const { data: filterOptions = [] } = useClientReportFilterOptions(reportId);
  const { data: technicalFilterOptions = [] } = useClientReportTechnicalFilterOptions(reportId);

  // Custom breadcrumbs with report name
  const customBreadcrumbs = useMemo(() => {
    if (!reportAccess?.report_title) return breadcrumbs;
    
    return [
      { label: 'Client Dashboard', path: '/client/dashboard' },
      { label: 'Reports', path: '/client/reports' },
      { label: reportAccess.report_title, path: `/client/reports/${reportId}` },
      { label: 'Focus View', path: `/client/reports/${reportId}/focus` }
    ];
  }, [reportAccess, reportId, breadcrumbs]);

  // Extract report criteria from subscription data
  const reportCriteria = useMemo(() => {
    const criteria = reportAccess?.report_filter_criteria || {};
    return criteria;
  }, [reportAccess]);

  // Get report's configured categories
  const reportCriteriaCategories = useMemo(() => {
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
    return categories;
  }, [reportCriteria]);

  // Get report's configured countries
  const reportCriteriaCountries = useMemo(() => {
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
      status = ['COMPLETE'];
    }
    return status;
  }, [reportCriteria]);

  // Get report's configured filter groups
  const reportFilterGroupsCriteria = useMemo(() => {
    if (!reportCriteria) return [];
    
    if (Array.isArray(reportCriteria.filter_groups) && reportCriteria.filter_groups.length > 0) {
      return reportCriteria.filter_groups;
    }
    
    return [];
  }, [reportCriteria]);

  // Get available categories from stats
  const availableCategories = stats?.available_categories || [];

  // Categories for metadata fetch - use URL params, report criteria, or stats
  const categoriesFromUrl = queryParams.get('categories') || '';
  const reportCategories = useMemo(() => {
    if (categoriesFromUrl) {
      return categoriesFromUrl.split(',').filter(Boolean);
    }
    if (reportCriteriaCategories.length > 0) {
      return reportCriteriaCategories;
    }
    if (availableCategories.length > 0) {
      return availableCategories;
    }
    return ALL_CATEGORIES;
  }, [categoriesFromUrl, reportCriteriaCategories, availableCategories]);
  
  // Stable string for dependency tracking
  const categoriesKey = reportCategories.join(',');

  // Initialize filters from URL or report criteria
  useEffect(() => {
    if (filtersInitialized) return;
    if (!reportAccess) return;
    
    // Initialize from URL params first, then fall back to report criteria
    const urlCountries = queryParams.get('countries');
    const urlCategories = queryParams.get('categories');
    const urlStatus = queryParams.get('status');
    const urlFilterGroups = queryParams.get('filter_groups');
    
    // Countries
    if (urlCountries) {
      setCountryFilters(urlCountries.split(',').filter(Boolean));
    } else if (reportCriteriaCountries.length > 0) {
      setCountryFilters([...reportCriteriaCountries]);
    } else if (allCountries.length > 0) {
      setCountryFilters([...allCountries]);
    }
    
    // Categories
    if (urlCategories) {
      setCategoryFilters(urlCategories.split(',').filter(Boolean));
    } else if (reportCriteriaCategories.length > 0) {
      setCategoryFilters([...reportCriteriaCategories]);
    } else if (availableCategories.length > 0) {
      setCategoryFilters([...availableCategories]);
    }
    
    // Status
    if (urlStatus) {
      setStatusFilters(urlStatus.split(',').filter(Boolean));
    } else {
      setStatusFilters([...reportStatusFiltersCriteria]);
    }
    setReportDefaultStatus([...reportStatusFiltersCriteria]);
    
    // Filter groups
    if (urlFilterGroups) {
      try {
        setFilterGroups(JSON.parse(urlFilterGroups));
      } catch (e) {
        setFilterGroups([...reportFilterGroupsCriteria]);
      }
    } else {
      setFilterGroups([...reportFilterGroupsCriteria]);
    }
    setReportDefaultFilterGroups([...reportFilterGroupsCriteria]);
    
    setFiltersInitialized(true);
  }, [reportAccess, reportCriteriaCountries, reportCriteriaCategories, reportStatusFiltersCriteria, 
      reportFilterGroupsCriteria, allCountries, availableCategories, filtersInitialized]);

  // Fetch field metadata for all categories (only once)
  useEffect(() => {
    if (metadataFetchedRef.current) return;
    if (!categoriesKey) {
      setMetadataLoading(false);
      return;
    }
    
    const fetchFieldMetadata = async () => {
      metadataFetchedRef.current = true;
      setMetadataLoading(true);
      
      const allTechnicalFields = [];
      const seenFields = new Set();
      const categories = categoriesKey.split(',').filter(Boolean);

      for (const category of categories) {
        try {
          const response = await api.get(`/api/fields/metadata/${category}/`);
          const fields = response.data.category_fields || [];
          
          fields.forEach(field => {
            if (!seenFields.has(field.name) && !EXCLUDED_FIELDS.has(field.name)) {
              seenFields.add(field.name);
              allTechnicalFields.push({
                key: field.name,
                label: field.label || field.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                group: CATEGORY_LABELS[category] || 'Technical',
                type: field.type,
                category: category
              });
            }
          });
        } catch (error) {
          console.error(`Error fetching metadata for ${category}:`, error);
        }
      }

      setTechnicalFieldMeta(allTechnicalFields);
      setMetadataLoading(false);
    };

    fetchFieldMetadata();
  }, [categoriesKey]);

  // Initialize visible columns (ALL checked by default)
  useEffect(() => {
    if (columnsInitialized) return;
    if (metadataLoading) return;

    const initialVisibility = {};
    COMPANY_INFO_FIELDS.forEach(f => { initialVisibility[f.key] = true; });
    CONTACT_FIELDS.forEach(f => { initialVisibility[f.key] = true; });
    technicalFieldMeta.forEach(f => { initialVisibility[f.key] = true; });

    setVisibleColumns(initialVisibility);
    setColumnsInitialized(true);
  }, [technicalFieldMeta, metadataLoading, columnsInitialized]);

  // Filter technical fields based on selected categories
  const filteredTechnicalFieldMeta = useMemo(() => {
    if (categoryFilters.length === 0) {
      // If no category filter, show all technical fields
      return technicalFieldMeta;
    }
    // Only show fields belonging to selected categories
    return technicalFieldMeta.filter(field => categoryFilters.includes(field.category));
  }, [technicalFieldMeta, categoryFilters]);

  // Update visible columns when new technical fields are added (from category changes)
  useEffect(() => {
    if (!columnsInitialized) return;
    
    // Add visibility for any new fields that aren't in visibleColumns yet
    setVisibleColumns(prev => {
      const newVisibility = { ...prev };
      let hasChanges = false;
      
      filteredTechnicalFieldMeta.forEach(f => {
        if (newVisibility[f.key] === undefined) {
          newVisibility[f.key] = true;
          hasChanges = true;
        }
      });
      
      return hasChanges ? newVisibility : prev;
    });
  }, [filteredTechnicalFieldMeta, columnsInitialized]);

  // Build query filters for API call
  const queryFilters = useMemo(() => {
    const filters = {};
    
    if (countryFilters.length > 0) {
      filters.countries = countryFilters.join(',');
    }
    if (categoryFilters.length > 0) {
      filters.categories = categoryFilters.join(',');
    }
    if (statusFilters.length > 0) {
      filters.status = statusFilters.join(',');
    }
    if (filterGroups.length > 0) {
      filters.filter_groups = JSON.stringify(filterGroups);
    }
    
    return filters;
  }, [countryFilters, categoryFilters, statusFilters, filterGroups]);

  // Fetch data with all filters
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        report_id: reportId,
        page: currentPage,
        page_size: pageSize,
      });

      if (debouncedSearch.trim()) {
        params.append('search', debouncedSearch.trim());
      }

      // Apply filters from state
      Object.entries(queryFilters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      const response = await api.get(`/api/client/report-data/?${params.toString()}`);
      const results = response.data.results || [];
      
      setData(results);
      setTotalCount(response.data.count || 0);
    } catch (error) {
      console.error('Error fetching focus view data:', error);
    } finally {
      setLoading(false);
    }
  }, [reportId, currentPage, pageSize, debouncedSearch, queryFilters]);

  useEffect(() => {
    if (reportId && filtersInitialized) {
      fetchData();
    }
  }, [fetchData, reportId, filtersInitialized]);

  // Clear selections when data changes
  useEffect(() => {
    setSelectedIds(new Set());
  }, [data]);

  // Build all columns - Company + Contact + Technical (filtered by category)
  const allColumns = useMemo(() => {
    return [...COMPANY_INFO_FIELDS, ...CONTACT_FIELDS, ...filteredTechnicalFieldMeta];
  }, [filteredTechnicalFieldMeta]);

  // Visible columns only
  const displayColumns = useMemo(() => {
    return allColumns.filter(col => visibleColumns[col.key]);
  }, [allColumns, visibleColumns]);

  // Group columns by category for the header
  const columnGroups = useMemo(() => {
    const groups = {};
    const groupOrder = ['Company', 'Contact 1', 'Contact 2', 'Contact 3', 'Contact 4'];
    
    // Use categoryFilters for ordering (current selection)
    const activeCategories = categoryFilters.length > 0 ? categoryFilters : reportCategories;
    activeCategories.forEach(cat => {
      const label = CATEGORY_LABELS[cat] || cat;
      if (!groupOrder.includes(label)) {
        groupOrder.push(label);
      }
    });
    
    if (!groupOrder.includes('Technical')) {
      groupOrder.push('Technical');
    }
    
    displayColumns.forEach(col => {
      const group = col.group || 'Technical';
      if (!groups[group]) {
        groups[group] = [];
      }
      groups[group].push(col);
    });
    
    const orderedGroups = {};
    groupOrder.forEach(g => {
      if (groups[g]) {
        orderedGroups[g] = groups[g];
      }
    });
    
    Object.keys(groups).forEach(g => {
      if (!orderedGroups[g]) {
        orderedGroups[g] = groups[g];
      }
    });
    
    return orderedGroups;
  }, [displayColumns, categoryFilters, reportCategories]);

  // Get unique groups from all columns
  const allGroups = useMemo(() => {
    const groups = new Set();
    allColumns.forEach(col => groups.add(col.group));
    return Array.from(groups);
  }, [allColumns]);

  // Calculate active filters count
  const reportDefaultCountries = reportCriteriaCountries.length > 0 ? reportCriteriaCountries : allCountries;
  const reportDefaultCategories = reportCriteriaCategories.length > 0 ? reportCriteriaCategories : availableCategories;
  
  const isCountriesAtDefault = reportDefaultCountries.length > 0 && 
    countryFilters.length === reportDefaultCountries.length &&
    countryFilters.every(c => reportDefaultCountries.includes(c));
  
  const isCategoriesAtDefault = reportDefaultCategories.length > 0 && 
    categoryFilters.length === reportDefaultCategories.length &&
    categoryFilters.every(c => reportDefaultCategories.includes(c));
  
  const isStatusAtDefault = statusFilters.length === reportStatusFiltersCriteria.length &&
    statusFilters.every(s => reportStatusFiltersCriteria.includes(s));
  
  const isFilterGroupsAtDefault = JSON.stringify(filterGroups) === JSON.stringify(reportFilterGroupsCriteria) ||
    (filterGroups.length === 0 && reportFilterGroupsCriteria.length === 0);
  
  const groupFilterCount = filterGroups.reduce((sum, group) => {
    const materialCount = Object.keys(group.filters || {}).length;
    const technicalCount = Object.entries(group.technicalFilters || {}).filter(([_, f]) => {
      if (f.mode === 'equals') return f.equals !== '' && f.equals !== undefined;
      return (f.min !== '' && f.min !== undefined) || (f.max !== '' && f.max !== undefined);
    }).length;
    return sum + materialCount + technicalCount;
  }, 0);
  
  const activeFiltersCount =
    (!isCountriesAtDefault && countryFilters.length > 0 ? countryFilters.length : 0) +
    (!isCategoriesAtDefault && categoryFilters.length > 0 ? categoryFilters.length : 0) +
    (!isStatusAtDefault ? statusFilters.length : 0) +
    (!isFilterGroupsAtDefault ? groupFilterCount : 0);

  // Selection helpers
  const isAllSelected = data.length > 0 && data.every(record => selectedIds.has(record.id));
  const isSomeSelected = data.some(record => selectedIds.has(record.id));
  const selectedCount = selectedIds.size;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      const newSelected = new Set(selectedIds);
      data.forEach(record => newSelected.delete(record.id));
      setSelectedIds(newSelected);
    } else {
      const newSelected = new Set(selectedIds);
      data.forEach(record => newSelected.add(record.id));
      setSelectedIds(newSelected);
    }
  };

  const toggleSelectRow = (id) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  // Filter handlers
  const handleApplyFilterGroups = (newGroups) => {
    setFilterGroups(newGroups);
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setFilterGroups([...reportFilterGroupsCriteria]);
    setCountryFilters(reportCriteriaCountries.length > 0 ? [...reportCriteriaCountries] : [...allCountries]);
    setCategoryFilters(reportCriteriaCategories.length > 0 ? [...reportCriteriaCategories] : [...availableCategories]);
    setStatusFilters([...reportStatusFiltersCriteria]);
    setCurrentPage(1);
  };

  const clearAllFilters = () => {
    handleResetFilters();
    setSearchQuery('');
    setDebouncedSearch('');
  };

  const removeCountryFilter = (country) => {
    setCountryFilters(prev => prev.filter(c => c !== country));
    setCurrentPage(1);
  };

  const removeCategoryFilter = (category) => {
    setCategoryFilters(prev => prev.filter(c => c !== category));
    setCurrentPage(1);
  };

  // Export functions
  const exportToExcel = async () => {
    setExporting(true);
    
    try {
      let exportData = [];
      
      if (exportType === 'selected') {
        exportData = data.filter(record => selectedIds.has(record.id));
      } else if (exportType === 'page') {
        exportData = data;
      } else if (exportType === 'all') {
        const params = new URLSearchParams({
          report_id: reportId,
          page_size: 10000,
        });

        if (debouncedSearch.trim()) {
          params.append('search', debouncedSearch.trim());
        }

        Object.entries(queryFilters).forEach(([key, value]) => {
          if (value) params.append(key, value);
        });

        const response = await api.get(`/api/client/report-data/?${params.toString()}`);
        exportData = response.data.results || [];
      }

      if (exportData.length === 0) {
        alert('No data to export');
        setExporting(false);
        return;
      }

      const XLSX = await import('xlsx-js-style');
      const wb = XLSX.utils.book_new();

      // Group data by category
      const dataByCategory = {};
      exportData.forEach(record => {
        const category = record.category || 'Other';
        if (!dataByCategory[category]) {
          dataByCategory[category] = [];
        }
        dataByCategory[category].push(record);
      });

      // Sheet name mapping (Excel has 31 char limit for sheet names)
      const SHEET_NAMES = {
        'INJECTION': 'Injection Moulders',
        'BLOW': 'Blow Moulders',
        'ROTO': 'Rotational Moulders',
        'PE_FILM': 'PE Film Producers',
        'SHEET': 'Sheet Producers',
        'PIPE': 'Pipe Producers',
        'TUBE_HOSE': 'Tube & Hose Producers',
        'PROFILE': 'Profile Producers',
        'CABLE': 'Cable Producers',
        'COMPOUNDER': 'Compounders',
        'Other': 'Other'
      };

      // Get columns for each category
      const getColumnsForCategory = (category) => {
        // Company and Contact fields are always included
        const baseColumns = [...COMPANY_INFO_FIELDS, ...CONTACT_FIELDS];
        
        // Get technical fields for this category
        const categoryTechnicalFields = technicalFieldMeta.filter(
          field => field.category === category
        );
        
        // Combine and filter by visibility
        const allCategoryColumns = [...baseColumns, ...categoryTechnicalFields];
        return allCategoryColumns.filter(col => visibleColumns[col.key]);
      };

      // Helper function to create a worksheet
      const createWorksheet = (categoryData, columns, XLSX) => {
        const headers = columns.map(col => col.label);
        const wsData = [headers];
        const booleanCells = [];

        categoryData.forEach((record, rowIdx) => {
          const row = columns.map((col, colIdx) => {
            const value = record[col.key];
            if (value === true) {
              booleanCells.push({ row: rowIdx + 1, col: colIdx, value: true });
              return '✓';
            }
            if (value === false) {
              booleanCells.push({ row: rowIdx + 1, col: colIdx, value: false });
              return '✗';
            }
            if (value === null || value === undefined) return '';
            return String(value);
          });
          wsData.push(row);
        });

        const ws = XLSX.utils.aoa_to_sheet(wsData);

        // Set column widths
        const colWidths = columns.map((col) => {
          let maxLen = col.label.length;
          categoryData.forEach(record => {
            const value = record[col.key];
            if (value !== null && value !== undefined) {
              const len = String(value).length;
              if (len > maxLen) maxLen = len;
            }
          });
          return { wch: Math.min(Math.max(maxLen + 2, 8), 50) };
        });
        ws['!cols'] = colWidths;

        // Style header row
        const range = XLSX.utils.decode_range(ws['!ref']);
        for (let col = range.s.c; col <= range.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
          if (!ws[cellAddress]) continue;
          ws[cellAddress].s = {
            fill: { fgColor: { rgb: 'FFFF00' } },
            font: { bold: true, sz: 11 },
            alignment: { horizontal: 'center', vertical: 'center' },
            border: {
              top: { style: 'thin', color: { rgb: '000000' } },
              bottom: { style: 'thin', color: { rgb: '000000' } },
              left: { style: 'thin', color: { rgb: '000000' } },
              right: { style: 'thin', color: { rgb: '000000' } }
            }
          };
        }

        // Style boolean cells
        booleanCells.forEach(({ row, col, value }) => {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
          if (!ws[cellAddress]) return;
          ws[cellAddress].s = {
            font: { 
              bold: true, 
              sz: 12,
              color: { rgb: value ? '008000' : 'CC0000' }
            },
            alignment: { horizontal: 'center', vertical: 'center' }
          };
        });

        ws['!freeze'] = { xSplit: 0, ySplit: 1 };

        return ws;
      };

      // Create a sheet for each category
      const categoryOrder = ['INJECTION', 'BLOW', 'ROTO', 'PE_FILM', 'SHEET', 'PIPE', 'TUBE_HOSE', 'PROFILE', 'CABLE', 'COMPOUNDER', 'Other'];
      
      categoryOrder.forEach(category => {
        if (dataByCategory[category] && dataByCategory[category].length > 0) {
          const categoryData = dataByCategory[category];
          const columns = getColumnsForCategory(category);
          const sheetName = SHEET_NAMES[category] || category;
          // Truncate sheet name to 31 chars (Excel limit)
          const safeSheetName = sheetName.substring(0, 31);
          
          const ws = createWorksheet(categoryData, columns, XLSX);
          XLSX.utils.book_append_sheet(wb, ws, safeSheetName);
        }
      });

      // Handle any categories not in the order list
      Object.keys(dataByCategory).forEach(category => {
        if (!categoryOrder.includes(category) && dataByCategory[category].length > 0) {
          const categoryData = dataByCategory[category];
          const columns = getColumnsForCategory(category);
          const sheetName = (SHEET_NAMES[category] || category).substring(0, 31);
          
          const ws = createWorksheet(categoryData, columns, XLSX);
          XLSX.utils.book_append_sheet(wb, ws, sheetName);
        }
      });

      const reportTitle = reportAccess?.report_title || 'Report';
      const date = new Date().toISOString().split('T')[0];
      const filename = `${reportTitle.replace(/[^a-z0-9]/gi, '_')}_${exportType}_${date}.xlsx`;

      XLSX.writeFile(wb, filename);
      setShowExportModal(false);
      
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export data. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  // Clear search
  const clearSearch = () => {
    setSearchQuery('');
    setDebouncedSearch('');
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Toggle all columns in a group
  const toggleColumnGroup = (group, visible) => {
    const newVisibility = { ...visibleColumns };
    allColumns
      .filter(col => col.group === group)
      .forEach(col => {
        newVisibility[col.key] = visible;
      });
    setVisibleColumns(newVisibility);
  };

  // Render cell value
  const renderCellValue = (record, column) => {
    const value = record[column.key];
    
    if (column.type === 'checkbox' || typeof value === 'boolean') {
      if (value === true) {
        return (
          <div className="flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-emerald-500" />
          </div>
        );
      } else if (value === false) {
        return (
          <div className="flex items-center justify-center">
            <MinusCircle className="w-5 h-5 text-red-400" />
          </div>
        );
      }
      return <span className="text-gray-400 dark:text-gray-500">-</span>;
    }

    if (column.key === 'categories' && Array.isArray(value)) {
      return value.map(cat => CATEGORY_LABELS[cat] || cat).join(', ');
    }

    if (column.key === 'website' && value) {
      return (
        <a
          href={value.startsWith('http') ? value : `https://${value}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline truncate block max-w-[200px]"
          onClick={(e) => e.stopPropagation()}
        >
          {value}
        </a>
      );
    }

    if (column.key === 'company_email' && value) {
      return (
        <a
          href={`mailto:${value}`}
          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline truncate block max-w-[200px]"
          onClick={(e) => e.stopPropagation()}
        >
          {value}
        </a>
      );
    }

    if (value === null || value === undefined || value === '') {
      return <span className="text-gray-400 dark:text-gray-500">-</span>;
    }

    return <span className="truncate block max-w-[200px]">{String(value)}</span>;
  };

  // Get background color for group header
  const getGroupColor = (group) => {
    const colors = {
      'Company': 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-700',
      'Contact 1': 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200 border-green-200 dark:border-green-700',
      'Contact 2': 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200 border-green-200 dark:border-green-700',
      'Contact 3': 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200 border-green-200 dark:border-green-700',
      'Contact 4': 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200 border-green-200 dark:border-green-700',
      'Injection Moulders': 'bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-200 border-purple-200 dark:border-purple-700',
      'Blow Moulders': 'bg-pink-100 dark:bg-pink-900/40 text-pink-800 dark:text-pink-200 border-pink-200 dark:border-pink-700',
      'Rotational Moulders': 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-200 border-indigo-200 dark:border-indigo-700',
      'PE Film Producers': 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-700',
      'Sheet Producers': 'bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-200 border-orange-200 dark:border-orange-700',
      'Pipe Producers': 'bg-teal-100 dark:bg-teal-900/40 text-teal-800 dark:text-teal-200 border-teal-200 dark:border-teal-700',
      'Tube & Hose Producers': 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-800 dark:text-cyan-200 border-cyan-200 dark:border-cyan-700',
      'Profile Producers': 'bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-700',
      'Cable Producers': 'bg-lime-100 dark:bg-lime-900/40 text-lime-800 dark:text-lime-200 border-lime-200 dark:border-lime-700',
      'Compounders': 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-700',
      'Technical': 'bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-500',
    };
    return colors[group] || 'bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-500';
  };

  const totalPages = Math.ceil(totalCount / pageSize);

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
      pageTitle={reportAccess?.report_title || 'Focus View'}
      pageSubtitleBottom={reportAccess?.report_description || 'All Fields View'}
      breadcrumbs={customBreadcrumbs}
    >
      <div className={`p-6 ${isFullscreen ? 'fixed inset-0 z-50 bg-white dark:bg-gray-900 overflow-auto' : ''}`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate(`/client/reports/${reportId}`)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Report
          </button>
        </div>

        {/* Active Filters Display */}
        {(debouncedSearch || activeFiltersCount > 0) && (
          <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Active filters:</span>
              <button
                onClick={clearAllFilters}
                className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium"
              >
                Clear all
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {/* Search Badge */}
              {debouncedSearch && (
                <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 rounded-full text-sm">
                  Search: "{debouncedSearch}"
                  <button onClick={clearSearch} className="hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full p-0.5">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              )}
              
              {/* Category Filters */}
              {!isCategoriesAtDefault && categoryFilters.length > 0 && categoryFilters.map(cat => (
                <span
                  key={cat}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-200 border border-purple-300 dark:border-purple-700 rounded-full text-sm font-medium"
                >
                  {CATEGORY_SHORT_LABELS[cat] || cat}
                  <button onClick={() => removeCategoryFilter(cat)} className="hover:opacity-70">
                    <X className="w-4 h-4" />
                  </button>
                </span>
              ))}
              
              {/* Country Filters (show count if too many) */}
              {!isCountriesAtDefault && countryFilters.length > 0 && (
                countryFilters.length <= 3 ? (
                  countryFilters.map(country => (
                    <span
                      key={country}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200 border border-green-300 dark:border-green-700 rounded-full text-sm font-medium"
                    >
                      {country}
                      <button onClick={() => removeCountryFilter(country)} className="hover:opacity-70">
                        <X className="w-4 h-4" />
                      </button>
                    </span>
                  ))
                ) : (
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200 border border-green-300 dark:border-green-700 rounded-full text-sm font-medium">
                    {countryFilters.length} countries selected
                  </span>
                )
              )}
              
              {/* Filter Groups */}
              {!isFilterGroupsAtDefault && filterGroups.length > 0 && (
                <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-200 border border-indigo-300 dark:border-indigo-700 rounded-full text-sm font-medium">
                  {groupFilterCount} material/technical filters
                </span>
              )}
            </div>
          </div>
        )}

        {/* Toolbar - Search, Filters, Export, Columns, etc. */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 mb-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            {/* Left side - Stats */}
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
                <span className="text-sm font-medium text-green-800 dark:text-green-300">
                  {totalCount.toLocaleString()} companies
                </span>
              </div>
              {selectedCount > 0 && (
                <div className="inline-flex items-center gap-3 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                  <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
                    {selectedCount} selected
                  </span>
                  <button
                    onClick={clearSelection}
                    className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>

            {/* Right side - Controls */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search companies..."
                  className="pl-10 pr-8 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                  >
                    <X className="w-4 h-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
                  </button>
                )}
              </div>

              {/* Visualization Button */}
              <button
                onClick={() => {
                  // Build URL with current filters
                  const params = new URLSearchParams();
                  if (countryFilters.length > 0) params.set('countries', countryFilters.join(','));
                  if (categoryFilters.length > 0) params.set('categories', categoryFilters.join(','));
                  if (statusFilters.length > 0) params.set('status', statusFilters.join(','));
                  if (filterGroups.length > 0) params.set('filter_groups', JSON.stringify(filterGroups));
                  if (debouncedSearch) params.set('search', debouncedSearch);
                  
                  const queryString = params.toString();
                  navigate(`/client/reports/${reportId}/visualization${queryString ? `?${queryString}` : ''}`);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                <BarChart2 className="w-4 h-4" />
                Visualization
              </button>

              {/* Filter Button */}
              <button
                onClick={() => setShowFilters(true)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 relative"
              >
                <Filter className="w-4 h-4" />
                Filters
                {activeFiltersCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {activeFiltersCount}
                  </span>
                )}
              </button>

              {/* Export Button */}
              <button
                onClick={() => setShowExportModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Export
              </button>

              {/* Column Selector */}
              <div className="relative">
                <button
                  onClick={() => setShowColumnSelector(!showColumnSelector)}
                  className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  <Columns className="w-4 h-4" />
                  Columns ({displayColumns.length}/{allColumns.length})
                </button>
                
                {showColumnSelector && (
                  <div className="absolute right-0 top-full mt-2 w-96 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 max-h-[600px] overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                      <h3 className="font-semibold text-gray-900 dark:text-white">Toggle Columns</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {Object.values(visibleColumns).filter(Boolean).length} of {allColumns.length} columns visible
                      </p>
                    </div>
                    
                    <div className="p-4 space-y-4 overflow-y-auto flex-1">
                      {allGroups.map(group => {
                        const groupCols = allColumns.filter(c => c.group === group);
                        if (groupCols.length === 0) return null;
                        
                        const allVisible = groupCols.every(c => visibleColumns[c.key]);
                        const someVisible = groupCols.some(c => visibleColumns[c.key]);
                        
                        return (
                          <div key={group} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={allVisible}
                                  ref={input => {
                                    if (input) input.indeterminate = someVisible && !allVisible;
                                  }}
                                  onChange={(e) => toggleColumnGroup(group, e.target.checked)}
                                  className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                />
                                <span className={`font-medium px-2 py-0.5 rounded text-sm ${getGroupColor(group)}`}>
                                  {group}
                                </span>
                              </label>
                              <span className="text-xs text-gray-500">
                                {groupCols.filter(c => visibleColumns[c.key]).length}/{groupCols.length}
                              </span>
                            </div>
                            
                            <div className="ml-6 grid grid-cols-2 gap-1 max-h-32 overflow-y-auto">
                              {groupCols.map(col => (
                                <label key={col.key} className="flex items-center gap-2 cursor-pointer text-sm py-0.5">
                                  <input
                                    type="checkbox"
                                    checked={visibleColumns[col.key] || false}
                                    onChange={(e) => setVisibleColumns(prev => ({
                                      ...prev,
                                      [col.key]: e.target.checked
                                    }))}
                                    className="w-3 h-3 rounded border-gray-300 dark:border-gray-600 text-purple-600 focus:ring-purple-500"
                                  />
                                  <span className="text-gray-700 dark:text-gray-300 truncate" title={col.label}>{col.label}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => {
                          const all = {};
                          allColumns.forEach(c => all[c.key] = true);
                          setVisibleColumns(all);
                        }}
                        className="flex-1 px-3 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                      >
                        Show All
                      </button>
                      <button
                        onClick={() => {
                          const minimal = {};
                          allColumns.forEach(c => minimal[c.key] = false);
                          minimal['company_name'] = true;
                          minimal['country'] = true;
                          setVisibleColumns(minimal);
                        }}
                        className="flex-1 px-3 py-2 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                      >
                        Minimal
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Refresh */}
              <button
                onClick={fetchData}
                className="p-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"
                title="Refresh data"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>

              {/* Fullscreen toggle */}
              <button
                onClick={toggleFullscreen}
                className="p-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"
                title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Excel-like Table */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <LoadingSpinner />
          </div>
        ) : data.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-16 text-center">
            <Search className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No results found</h3>
            <p className="text-gray-600 dark:text-gray-400">Try adjusting your filters or search terms</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div 
              ref={tableRef}
              className={`overflow-auto focus:outline-none select-none ${isDragging ? 'cursor-grabbing' : ''}`}
              style={{ maxHeight: isFullscreen ? 'calc(100vh - 280px)' : '600px' }}
              tabIndex={0}
              onMouseDown={(e) => {
                // Don't start drag if clicking on interactive elements
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'A' || e.target.tagName === 'BUTTON') {
                  return;
                }
                setIsDragging(true);
                hasDraggedRef.current = false; // Reset drag tracking
                setDragStart({ x: e.clientX, y: e.clientY });
                setScrollStart({ 
                  x: tableRef.current?.scrollLeft || 0, 
                  y: tableRef.current?.scrollTop || 0 
                });
              }}
              onMouseMove={(e) => {
                if (!isDragging) return;
                const container = tableRef.current;
                if (!container) return;
                
                const deltaX = e.clientX - dragStart.x;
                const deltaY = e.clientY - dragStart.y;
                
                // Only consider it a drag if moved beyond threshold
                if (Math.abs(deltaX) > DRAG_THRESHOLD || Math.abs(deltaY) > DRAG_THRESHOLD) {
                  hasDraggedRef.current = true;
                }
                
                container.scrollLeft = scrollStart.x - deltaX;
                container.scrollTop = scrollStart.y - deltaY;
              }}
              onMouseUp={() => {
                setIsDragging(false);
              }}
              onMouseLeave={() => {
                setIsDragging(false);
              }}
              onKeyDown={(e) => {
                const container = tableRef.current;
                if (!container) return;
                
                const scrollAmount = 40;
                
                switch (e.key) {
                  case 'ArrowUp':
                    container.scrollTop -= scrollAmount;
                    e.preventDefault();
                    break;
                  case 'ArrowDown':
                    container.scrollTop += scrollAmount;
                    e.preventDefault();
                    break;
                  case 'ArrowLeft':
                    container.scrollLeft -= scrollAmount;
                    e.preventDefault();
                    break;
                  case 'ArrowRight':
                    container.scrollLeft += scrollAmount;
                    e.preventDefault();
                    break;
                  case 'PageUp':
                    container.scrollTop -= container.clientHeight;
                    e.preventDefault();
                    break;
                  case 'PageDown':
                    container.scrollTop += container.clientHeight;
                    e.preventDefault();
                    break;
                  case 'Home':
                    if (e.ctrlKey) {
                      container.scrollTop = 0;
                      container.scrollLeft = 0;
                    } else {
                      container.scrollLeft = 0;
                    }
                    e.preventDefault();
                    break;
                  case 'End':
                    if (e.ctrlKey) {
                      container.scrollTop = container.scrollHeight;
                      container.scrollLeft = container.scrollWidth;
                    } else {
                      container.scrollLeft = container.scrollWidth;
                    }
                    e.preventDefault();
                    break;
                }
              }}
            >
              <table className="w-full border-collapse min-w-max">
                {/* Column Header Row */}
                <thead className="sticky top-0 z-20">
                  <tr className="bg-gray-100 dark:bg-gray-700">
                    <th className="sticky left-0 z-30 bg-gray-100 dark:bg-gray-700 px-3 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300 border-b border-r border-gray-200 dark:border-gray-600 w-12">
                      <div className="flex items-center justify-center">
                        <input
                          type="checkbox"
                          checked={isAllSelected}
                          ref={input => {
                            if (input) input.indeterminate = isSomeSelected && !isAllSelected;
                          }}
                          onChange={toggleSelectAll}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </div>
                    </th>
                    {displayColumns.map((col) => (
                      <th
                        key={col.key}
                        className={`px-3 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300 border-b border-r border-gray-200 dark:border-gray-600 whitespace-nowrap ${getGroupColor(col.group)} ${
                          col.key === 'company_name' ? 'sticky left-12 z-20 text-left' : ''
                        } ${col.type === 'checkbox' ? 'text-center' : 'text-left'}`}
                        style={{ minWidth: col.key === 'company_name' ? '250px' : col.type === 'checkbox' ? '100px' : '120px' }}
                        title={col.label}
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                
                <tbody>
                  {data.map((record, rowIndex) => {
                    const isSelected = selectedIds.has(record.id);
                    const rowBg = rowIndex % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-slate-50 dark:bg-gray-900/50';
                    return (
                      <tr
                        key={record.id || rowIndex}
                        className={`hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors border-b border-gray-100 dark:border-gray-700 cursor-pointer ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : rowBg}`}
                        onClick={() => {
                          // Only open modal if it wasn't a drag
                          if (!hasDraggedRef.current) {
                            setSelectedCompany(record);
                            setShowCompanyModal(true);
                          }
                        }}
                      >
                        <td 
                          className={`sticky left-0 z-10 ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : rowBg} px-3 py-2.5 border-r border-gray-200 dark:border-gray-700`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectRow(record.id)}
                              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                          </div>
                        </td>
                        {displayColumns.map((col) => (
                          <td
                            key={col.key}
                            className={`px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 border-r border-gray-100 dark:border-gray-700 ${
                              col.key === 'company_name' 
                                ? `sticky left-12 z-10 ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : rowBg} font-medium` 
                                : ''
                            } ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                          >
                            {renderCellValue(record, col)}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination */}
        {!loading && data.length > 0 && (
          <div className="mt-6">
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
              pageSizeOptions={[25, 50, 100, 200]}
            />
          </div>
        )}
      </div>

      {/* Click outside to close dropdowns */}
      {showColumnSelector && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowColumnSelector(false)}
        />
      )}

      {/* Filter Sidebar */}
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
          onReset={handleResetFilters}
        />
      )}

      {/* Company Detail Modal */}
      {showCompanyModal && selectedCompany && (
        <RecordDetailModal
          record={selectedCompany}
          onClose={() => {
            setShowCompanyModal(false);
            setSelectedCompany(null);
          }}
        />
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => !exporting && setShowExportModal(false)}
          />
          
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden border border-gray-200 dark:border-gray-700">
            <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <FileSpreadsheet className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Export to Excel</h2>
                    <p className="text-emerald-100 text-sm">Choose what to export</p>
                  </div>
                </div>
                <button
                  onClick={() => !exporting && setShowExportModal(false)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  disabled={exporting}
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="space-y-3">
                <label 
                  className={`flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                    exportType === 'selected' 
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' 
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600'
                  } ${selectedCount === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <input
                    type="radio"
                    name="exportType"
                    value="selected"
                    checked={exportType === 'selected'}
                    onChange={(e) => setExportType(e.target.value)}
                    disabled={selectedCount === 0}
                    className="w-5 h-5 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CheckSquare className="w-5 h-5 text-blue-600" />
                      <span className="font-semibold text-gray-900 dark:text-white">Export Selected</span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {selectedCount > 0 
                        ? `Export ${selectedCount} selected compan${selectedCount === 1 ? 'y' : 'ies'}`
                        : 'No companies selected'
                      }
                    </p>
                  </div>
                  {selectedCount > 0 && (
                    <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium">
                      {selectedCount}
                    </span>
                  )}
                </label>

                <label 
                  className={`flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                    exportType === 'page' 
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' 
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="exportType"
                    value="page"
                    checked={exportType === 'page'}
                    onChange={(e) => setExportType(e.target.value)}
                    className="w-5 h-5 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Table className="w-5 h-5 text-purple-600" />
                      <span className="font-semibold text-gray-900 dark:text-white">Export Current Page</span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Export all {data.length} companies on this page
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded-full text-sm font-medium">
                    {data.length}
                  </span>
                </label>

                <label 
                  className={`flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                    exportType === 'all' 
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' 
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="exportType"
                    value="all"
                    checked={exportType === 'all'}
                    onChange={(e) => setExportType(e.target.value)}
                    className="w-5 h-5 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-emerald-600" />
                      <span className="font-semibold text-gray-900 dark:text-white">Export All Companies</span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Export all {totalCount.toLocaleString()} companies matching current filters
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 rounded-full text-sm font-medium">
                    {totalCount.toLocaleString()}
                  </span>
                </label>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowExportModal(false)}
                disabled={exporting}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={exportToExcel}
                disabled={exporting || (exportType === 'selected' && selectedCount === 0)}
                className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {exporting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Export to Excel
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING FEEDBACK BUTTON & MODAL */}
      <ReportFeedbackModal 
        reportId={reportId} 
        reportTitle={reportAccess?.report_title}
      />
    </ClientDashboardLayout>
  );
};

export default ClientReportFocusViewPage;
