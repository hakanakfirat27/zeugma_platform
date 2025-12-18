// frontend/src/components/database/CompanyFilterSidebar.jsx
/**
 * Filter Sidebar for Company Database - Design 1: Vertical Tabs Navigation
 * 
 * Features:
 * - Filter Groups with OR logic
 * - Company Status filter
 * - Categories filter (dynamically updates countries and technical filters)
 * - Countries filter (filtered by selected categories)
 * - Material Filters (Boolean)
 * - Technical Filters (Range/Equals)
 */

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { 
  X, Search, Plus, Trash2, Copy, Check, AlertCircle,
  CheckCircle, Folder, Globe, Beaker, Settings, Sliders, HelpCircle, Briefcase
} from 'lucide-react';
import { CATEGORIES } from '../../constants/categories';
import api from '../../utils/api';

// Status configuration
const STATUS_OPTIONS = [
  { value: 'COMPLETE', label: 'Complete', icon: Check, color: 'bg-green-100 text-green-800 border-green-300', bgColor: 'bg-green-500' },
  { value: 'INCOMPLETE', label: 'Incomplete', icon: AlertCircle, color: 'bg-yellow-100 text-yellow-800 border-yellow-300', bgColor: 'bg-yellow-500' },
  { value: 'DELETED', label: 'Deleted', icon: Trash2, color: 'bg-red-100 text-red-800 border-red-300', bgColor: 'bg-gray-400' },
  { value: 'NONE', label: 'None', icon: HelpCircle, color: 'bg-gray-100 text-gray-800 border-gray-300', bgColor: 'bg-gray-300' }
];

// Tab configuration
const TABS = [
  { id: 'status', label: 'Status', icon: CheckCircle, color: 'text-green-500' },
  { id: 'categories', label: 'Categories', icon: Folder, color: 'text-purple-500' },
  { id: 'countries', label: 'Countries', icon: Globe, color: 'text-teal-500' },
  { id: 'businessType', label: 'Business Type', icon: Briefcase, color: 'text-amber-500' },
  { id: 'materials', label: 'Materials', icon: Beaker, color: 'text-orange-500' },
  { id: 'technical', label: 'Technical', icon: Settings, color: 'text-cyan-500' }
];

// Business Type fields to separate from Materials
const BUSINESS_TYPE_FIELDS = ['custom', 'proprietary_products', 'in_house'];

// Categories that have Business Type fields (most processing categories)
const CATEGORIES_WITH_BUSINESS_TYPE = [
  'INJECTION', 'BLOW', 'ROTO', 'PE_FILM', 'SHEET', 
  'PIPE', 'TUBE_HOSE', 'PROFILE', 'CABLE', 'COMPOUNDER'
];

const CompanyFilterSidebar = ({
  isOpen,
  onClose,
  filterGroups = [],
  filterOptions: externalFilterOptions = [],
  technicalFilterOptions: externalTechnicalOptions = [],
  // Report context props
  isReportContext = false,
  reportStatusFilters = [],
  reportFilterGroups = [],  // Original filter groups from report criteria
  // Status filters
  statusFilters = [],
  onStatusFilterChange,
  // Country filters
  countryFilters = [],
  onCountryFilterChange,
  allCountries: externalCountries = [],
  // Category filters
  categoryFilters = [],
  onCategoryFilterChange = () => {},
  availableCategories = [],
  onApply,
  onReset
}) => {
  // State for managing filter groups
  const [groups, setGroups] = useState(filterGroups.length > 0 ? filterGroups : [
    {
      id: Date.now().toString(),
      name: 'Filter Group 1',
      filters: {},
      technicalFilters: {}
    }
  ]);

  const [searchQuery, setSearchQuery] = useState('');
  const [countrySearch, setCountrySearch] = useState('');
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const [technicalSearchQuery, setTechnicalSearchQuery] = useState('');
  const [activeGroupId, setActiveGroupId] = useState(groups[0]?.id);

  // Dynamic filter options based on selected categories
  const [dynamicFilterOptions, setDynamicFilterOptions] = useState([]);
  const [dynamicTechnicalOptions, setDynamicTechnicalOptions] = useState([]);
  const [dynamicCountries, setDynamicCountries] = useState([]);
  const [isLoadingFilters, setIsLoadingFilters] = useState(false);

  // Active tab state - for vertical tabs navigation
  const [activeTab, setActiveTab] = useState('status');

  // Get active group - MUST be defined before using it in useMemo
  const activeGroup = groups.find(g => g.id === activeGroupId) || groups[0];

  // Use external options if provided, otherwise use dynamic
  // In report context, ALWAYS use external options (don't fall back to dynamic)
  const filterOptions = useMemo(() => {
    if (isReportContext) {
      console.log('Using external filter options (report context):', externalFilterOptions?.length);
      return externalFilterOptions || [];
    }
    return dynamicFilterOptions.length > 0 ? dynamicFilterOptions : externalFilterOptions;
  }, [isReportContext, externalFilterOptions, dynamicFilterOptions]);

  const technicalFilterOptions = useMemo(() => {
    if (isReportContext) {
      console.log('Using external technical options (report context):', externalTechnicalOptions?.length);
      return externalTechnicalOptions || [];
    }
    return dynamicTechnicalOptions.length > 0 ? dynamicTechnicalOptions : externalTechnicalOptions;
  }, [isReportContext, externalTechnicalOptions, dynamicTechnicalOptions]);

  const allCountries = useMemo(() => {
    if (isReportContext) {
      console.log('Using external countries (report context):', externalCountries?.length);
      return externalCountries || [];
    }
    return dynamicCountries.length > 0 ? dynamicCountries : externalCountries;
  }, [isReportContext, externalCountries, dynamicCountries]);

  // Fetch filter options when categories change
  const fetchFilterOptions = useCallback(async (categories) => {
    try {
      setIsLoadingFilters(true);
      
      if (categories.length === 0) {
        const filterResponse = await api.get('/api/filter-options/', { params: { category: 'ALL' } });
        setDynamicFilterOptions(filterResponse.data || []);
        
        const technicalResponse = await api.get('/api/technical-filter-options/', { params: { category: 'ALL' } });
        setDynamicTechnicalOptions(technicalResponse.data || []);
        
        const statsResponse = await api.get('/api/database-stats/');
        setDynamicCountries(statsResponse.data?.all_countries || []);
      } else {
        const allFilterOptions = [];
        const allTechnicalOptions = [];
        const seenFilterFields = new Set();
        const seenTechnicalFields = new Set();
        
        for (const category of categories) {
          const filterResponse = await api.get('/api/filter-options/', { params: { category } });
          for (const option of (filterResponse.data || [])) {
            if (!seenFilterFields.has(option.field)) {
              seenFilterFields.add(option.field);
              allFilterOptions.push(option);
            }
          }
          
          const technicalResponse = await api.get('/api/technical-filter-options/', { params: { category } });
          for (const option of (technicalResponse.data || [])) {
            if (!seenTechnicalFields.has(option.field)) {
              seenTechnicalFields.add(option.field);
              allTechnicalOptions.push(option);
            }
          }
        }
        
        setDynamicFilterOptions(allFilterOptions);
        setDynamicTechnicalOptions(allTechnicalOptions);
        
        const statsResponse = await api.get('/api/database-stats/', { params: { categories: categories.join(',') } });
        setDynamicCountries(statsResponse.data?.all_countries || []);
      }
    } catch (error) {
      console.error('Error fetching filter options:', error);
    } finally {
      setIsLoadingFilters(false);
    }
  }, []);

  useEffect(() => {
    // In report context, use externally provided options - don't fetch dynamically
    if (isReportContext) return;
    fetchFilterOptions(categoryFilters);
  }, [categoryFilters, fetchFilterOptions, isReportContext]);

  useEffect(() => {
    // In report context, use externally provided options - don't fetch dynamically
    if (isReportContext) return;
    fetchFilterOptions(categoryFilters);
  }, [isReportContext]);

  // Sync groups with parent's filterGroups when they change externally (e.g., Clear All)
  useEffect(() => {
    const parentGroupsJson = JSON.stringify(filterGroups);
    
    // Skip sync if this change matches what we last applied
    // This means the change came from our own apply, not external
    if (parentGroupsJson === lastAppliedGroupsJson.current) {
      console.log('Skipping sync - this is our own apply bouncing back');
      return;
    }
    
    const localGroupsJson = JSON.stringify(groups);
    
    // If parent has different groups than local, update local
    if (parentGroupsJson !== localGroupsJson) {
      console.log('Syncing groups from parent (external change):', filterGroups);
      if (filterGroups.length > 0) {
        setGroups(filterGroups);
        setActiveGroupId(filterGroups[0]?.id);
        // Update prevGroupsJson to prevent apply effect from re-triggering
        prevGroupsJson.current = parentGroupsJson;
      } else {
        // If parent cleared groups, reset to empty group
        const newGroupId = Date.now().toString();
        const newGroups = [{ id: newGroupId, name: 'Filter Group 1', filters: {}, technicalFilters: {} }];
        setGroups(newGroups);
        setActiveGroupId(newGroupId);
        // Update prevGroupsJson to prevent apply effect from re-triggering
        prevGroupsJson.current = JSON.stringify(newGroups);
      }
      // Clear lastAppliedGroupsJson since we're accepting external state
      lastAppliedGroupsJson.current = '';
    }
  }, [filterGroups]);

  // Filtered options based on search - EXCLUDE business type fields from materials
  const filteredOptions = useMemo(() => {
    const activeFilters = activeGroup?.filters || {};
    // Filter out business type fields and already selected filters
    const availableOptions = filterOptions.filter(option => 
      !BUSINESS_TYPE_FIELDS.includes(option.field) && activeFilters[option.field] === undefined
    );
    if (!searchQuery) return availableOptions;
    const query = searchQuery.toLowerCase();
    return availableOptions.filter(option =>
      option.label.toLowerCase().includes(query) || option.field.toLowerCase().includes(query)
    );
  }, [filterOptions, searchQuery, activeGroup]);

  // Business Type options - only the 3 specific fields
  const filteredBusinessTypeOptions = useMemo(() => {
    const activeFilters = activeGroup?.filters || {};
    return filterOptions.filter(option => 
      BUSINESS_TYPE_FIELDS.includes(option.field) && activeFilters[option.field] === undefined
    );
  }, [filterOptions, activeGroup]);

  const filteredTechnicalOptions = useMemo(() => {
    if (!technicalSearchQuery) return technicalFilterOptions;
    const query = technicalSearchQuery.toLowerCase();
    return technicalFilterOptions.filter(option =>
      option.label.toLowerCase().includes(query) || option.field.toLowerCase().includes(query)
    );
  }, [technicalFilterOptions, technicalSearchQuery]);

  const filteredCountries = useMemo(() => {
    if (!countrySearch) return allCountries;
    return allCountries.filter(country => country.toLowerCase().includes(countrySearch.toLowerCase()));
  }, [allCountries, countrySearch]);

  const filteredCategories = useMemo(() => {
    // In report context, don't show "All Categories" option - only show report's categories
    const categoriesToShow = isReportContext 
      ? availableCategories  // Only report's categories, no "All Categories"
      : ['All Categories', ...availableCategories];  // Normal mode with "All Categories"
    
    if (!categorySearchQuery) return categoriesToShow;
    const query = categorySearchQuery.toLowerCase();
    return categoriesToShow.filter(cat => {
      if (cat === 'All Categories') return cat.toLowerCase().includes(query);
      const categoryData = CATEGORIES.find(c => c.value === cat);
      const label = categoryData?.label || cat;
      return cat.toLowerCase().includes(query) || label.toLowerCase().includes(query);
    });
  }, [availableCategories, categorySearchQuery, isReportContext]);

  // Filter status options based on report context
  const availableStatusOptions = useMemo(() => {
    if (isReportContext && reportStatusFilters.length > 0) {
      // Only show status options that were configured in the report
      return STATUS_OPTIONS.filter(opt => reportStatusFilters.includes(opt.value));
    }
    // In normal mode, show all status options
    return STATUS_OPTIONS;
  }, [isReportContext, reportStatusFilters]);

  // Determine if Business Type tab should be shown
  // Business Type is not applicable for RECYCLER category
  const showBusinessTypeTab = useMemo(() => {
    // If we have categories selected, check if any of them support business type
    const categoriesToCheck = categoryFilters.length > 0 
      ? categoryFilters 
      : availableCategories;
    
    // If any selected/available category supports business type, show the tab
    return categoriesToCheck.some(cat => CATEGORIES_WITH_BUSINESS_TYPE.includes(cat));
  }, [categoryFilters, availableCategories]);

  // Filter tabs based on context
  const visibleTabs = useMemo(() => {
    return TABS.filter(tab => {
      // Hide Business Type tab if no categories support it
      if (tab.id === 'businessType' && !showBusinessTypeTab) {
        return false;
      }
      return true;
    });
  }, [showBusinessTypeTab]);

  // Group management functions
  const addGroup = () => {
    const newGroup = {
      id: Date.now().toString(),
      name: `Filter Group ${groups.length + 1}`,
      filters: {},
      technicalFilters: {}
    };
    setGroups([...groups, newGroup]);
    setActiveGroupId(newGroup.id);
  };

  const deleteGroup = (groupId) => {
    if (groups.length === 1) {
      alert('You must have at least one filter group');
      return;
    }
    const newGroups = groups.filter(g => g.id !== groupId);
    setGroups(newGroups);
    if (activeGroupId === groupId) {
      setActiveGroupId(newGroups[0]?.id);
    }
  };

  const duplicateGroup = (groupId) => {
    const groupToDuplicate = groups.find(g => g.id === groupId);
    if (!groupToDuplicate) return;
    const newGroup = {
      id: Date.now().toString(),
      name: `${groupToDuplicate.name} (Copy)`,
      filters: { ...groupToDuplicate.filters },
      technicalFilters: JSON.parse(JSON.stringify(groupToDuplicate.technicalFilters))
    };
    setGroups([...groups, newGroup]);
    setActiveGroupId(newGroup.id);
  };

  const renameGroup = (groupId, newName) => {
    setGroups(groups.map(g => g.id === groupId ? { ...g, name: newName } : g));
  };

  const updateGroupFilter = (groupId, field, value) => {
    setGroups(groups.map(g => {
      if (g.id !== groupId) return g;
      const newFilters = { ...g.filters };
      if (value === undefined) {
        delete newFilters[field];
      } else {
        newFilters[field] = value;
      }
      return { ...g, filters: newFilters };
    }));
  };

  const updateGroupTechnicalFilter = (groupId, field, mode, value, minValue, maxValue) => {
    setGroups(groups.map(g => {
      if (g.id !== groupId) return g;
      const newTechnicalFilters = { ...g.technicalFilters };
      const currentFilter = newTechnicalFilters[field];

      if (mode === 'equals') {
        const equalsValue = value !== undefined ? value : (currentFilter?.min || '');
        newTechnicalFilters[field] = { mode: 'equals', equals: equalsValue, min: undefined, max: undefined };
      } else if (mode === 'range') {
        const min = minValue !== undefined ? minValue : (currentFilter?.equals || '');
        const max = maxValue !== undefined ? maxValue : (currentFilter?.equals || '');
        newTechnicalFilters[field] = { mode: 'range', equals: undefined, min: min, max: max };
      }

      if (value === '' && minValue === '' && maxValue === '' && !currentFilter?.mode && mode === 'range') {
        delete newTechnicalFilters[field];
      }

      return { ...g, technicalFilters: newTechnicalFilters };
    }));
  };

  const clearGroupFilters = (groupId) => {
    setGroups(groups.map(g => g.id !== groupId ? g : { ...g, filters: {}, technicalFilters: {} }));
  };

  // Toggle functions
  const toggleStatus = (status) => {
    const newStatusFilters = statusFilters.includes(status)
      ? statusFilters.filter(s => s !== status)
      : [...statusFilters, status];
    onStatusFilterChange(newStatusFilters);
  };

  const toggleCountry = (country) => {
    const newCountryFilters = countryFilters.includes(country)
      ? countryFilters.filter(c => c !== country)
      : [...countryFilters, country];
    onCountryFilterChange(newCountryFilters);
  };

  const toggleCategory = (category) => {
    if (category === 'All Categories') {
      onCategoryFilterChange([]);
    } else {
      const newCategoryFilters = categoryFilters.includes(category)
        ? categoryFilters.filter(c => c !== category)
        : [...categoryFilters, category];
      onCategoryFilterChange(newCategoryFilters);
    }
  };

  // Reset to report's original values (for Active Filters Clear All - doesn't close sidebar)
  const handleResetToReportValues = () => {
    console.log('handleResetToReportValues called');
    console.log('isReportContext:', isReportContext);
    console.log('reportFilterGroups:', reportFilterGroups);
    console.log('availableCategories:', availableCategories);
    console.log('externalCountries:', externalCountries);
    
    // Reset the first render flag so changes will be applied
    isFirstRender.current = false;
    
    // In report context, restore report's original filter groups (includes materials)
    if (isReportContext && reportFilterGroups.length > 0) {
      // Deep copy the report's filter groups
      const restoredGroups = reportFilterGroups.map(group => ({
        ...group,
        id: group.id || Date.now().toString() + Math.random().toString(36).substr(2, 9),
        filters: { ...(group.filters || {}) },
        technicalFilters: { ...(group.technicalFilters || {}) }
      }));
      console.log('Restoring filter groups:', restoredGroups);
      setGroups(restoredGroups);
      setActiveGroupId(restoredGroups[0]?.id);
      // Force update the prevGroupsJson so next change will be detected
      prevGroupsJson.current = JSON.stringify(restoredGroups);
      // Also apply the groups immediately
      onApply(restoredGroups);
    } else if (isReportContext) {
      // Report context but no filter groups defined - create empty group
      const newGroupId = Date.now().toString();
      const emptyGroup = { id: newGroupId, name: 'Filter Group 1', filters: {}, technicalFilters: {} };
      setGroups([emptyGroup]);
      setActiveGroupId(newGroupId);
      prevGroupsJson.current = JSON.stringify([emptyGroup]);
      onApply([]);
    } else {
      // Reset to empty groups (no materials/technical filters)
      const newGroupId = Date.now().toString();
      const emptyGroup = { id: newGroupId, name: 'Filter Group 1', filters: {}, technicalFilters: {} };
      setGroups([emptyGroup]);
      setActiveGroupId(newGroupId);
      prevGroupsJson.current = JSON.stringify([emptyGroup]);
      // Apply empty groups
      onApply([]);
    }
    
    setSearchQuery('');
    setCountrySearch('');
    setCategorySearchQuery('');
    setTechnicalSearchQuery('');
    
    // In report context, reset to report's values; in normal mode, reset to defaults
    if (isReportContext) {
      // Reset status to report's status
      onStatusFilterChange(reportStatusFilters.length > 0 ? [...reportStatusFilters] : ['COMPLETE']);
      // Reset categories to report's categories (all selected)
      onCategoryFilterChange([...availableCategories]);
      // Reset countries to report's countries (all selected)
      onCountryFilterChange([...externalCountries]);
    } else {
      // Normal mode - reset to defaults (Complete only)
      onStatusFilterChange(['COMPLETE']);
      onCategoryFilterChange([]);
      onCountryFilterChange([]);
    }
  };

  const handleClearAll = () => {
    const newGroupId = Date.now().toString();
    setGroups([{ id: newGroupId, name: 'Filter Group 1', filters: {}, technicalFilters: {} }]);
    setActiveGroupId(newGroupId); // Fix: Update activeGroupId to the new group
    setSearchQuery('');
    setCountrySearch('');
    setCategorySearchQuery('');
    setTechnicalSearchQuery('');
    onReset();
  };

  // Normal mode defaults
  const NORMAL_MODE_DEFAULT_STATUS = ['COMPLETE'];
  
  // Count active filters
  // Only count filters that DIFFER from defaults
  // Normal mode defaults: status=['COMPLETE'], categories=[], countries=[]
  // Report mode defaults: all categories, all countries, report's status
  const getUserAppliedFilterCount = () => {
    let count = 0;
    
    // Material/Business Type filters from groups - always count these
    count += groups.reduce((sum, group) => {
      const booleanFilters = Object.keys(group.filters).filter(key => group.filters[key] !== undefined).length;
      const techFilters = Object.entries(group.technicalFilters || {}).filter(([field, filter]) => {
        if (filter.mode === 'equals') return filter.equals !== '' && filter.equals !== undefined;
        return (filter.min !== '' && filter.min !== undefined) || (filter.max !== '' && filter.max !== undefined);
      }).length;
      return sum + booleanFilters + techFilters;
    }, 0);
    
    if (isReportContext) {
      // In report context, only count deviations from report defaults
      // Status: count if different from report's status
      const reportStatusSet = new Set(reportStatusFilters);
      const statusDiffers = reportStatusFilters.length !== statusFilters.length || 
        !statusFilters.every(s => reportStatusSet.has(s));
      if (statusDiffers) count += statusFilters.length;
      
      // Categories: count if not all report categories selected
      const allCategoriesSelected = categoryFilters.length === availableCategories.length;
      if (!allCategoriesSelected && categoryFilters.length > 0) {
        count += categoryFilters.length;
      } else if (categoryFilters.length === 0 && availableCategories.length > 0) {
        // None selected is a deviation
        count += 1;
      }
      
      // Countries: count only if NOT all selected (all selected is default)
      const allCountriesSelected = allCountries.length > 0 && countryFilters.length === allCountries.length;
      if (!allCountriesSelected && countryFilters.length > 0) {
        count += countryFilters.length;
      } else if (countryFilters.length === 0 && allCountries.length > 0) {
        // None selected is a deviation
        count += 1;
      }
    } else {
      // Normal mode - only count deviations from defaults
      // Default status is ['COMPLETE'] - only count if different
      const isDefaultStatus = statusFilters.length === 1 && statusFilters[0] === 'COMPLETE';
      if (!isDefaultStatus) {
        count += statusFilters.length;
      }
      
      // Default categories is [] (none selected = all) - count if any selected
      count += categoryFilters.length;
      
      // Default countries is [] (none selected = all) - count if any selected
      count += countryFilters.length;
    }
    
    return count;
  };
  
  const totalActiveFilters = getUserAppliedFilterCount();

  // Get count for each tab
  const getTabCount = (tabId) => {
    switch (tabId) {
      case 'status': 
        // In report context, only count if different from report's status
        if (isReportContext) {
          const reportStatusSet = new Set(reportStatusFilters);
          const statusDiffers = reportStatusFilters.length !== statusFilters.length || 
            !statusFilters.every(s => reportStatusSet.has(s));
          return statusDiffers ? statusFilters.length : 0;
        }
        // In normal mode, only count if different from default ['COMPLETE']
        const isDefaultStatus = statusFilters.length === 1 && statusFilters[0] === 'COMPLETE';
        return isDefaultStatus ? 0 : statusFilters.length;
      case 'categories': 
        // In report context, only count if not all categories selected
        if (isReportContext) {
          const allSelected = categoryFilters.length === availableCategories.length;
          return allSelected ? 0 : categoryFilters.length;
        }
        return categoryFilters.length;
      case 'countries': 
        // In report context, only count if NOT all selected (all selected is default)
        if (isReportContext) {
          const allCountriesSelected = allCountries.length > 0 && countryFilters.length === allCountries.length;
          return allCountriesSelected ? 0 : countryFilters.length;
        }
        return countryFilters.length;
      case 'businessType': 
        // Count business type filters that are set
        return Object.keys(activeGroup?.filters || {}).filter(key => BUSINESS_TYPE_FIELDS.includes(key)).length;
      case 'materials': 
        // Count material filters excluding business type fields
        return Object.keys(activeGroup?.filters || {}).filter(key => !BUSINESS_TYPE_FIELDS.includes(key)).length;
      case 'technical': return Object.entries(activeGroup?.technicalFilters || {}).filter(([_, f]) => 
        f.mode === 'equals' ? f.equals !== '' && f.equals !== undefined : (f.min !== '' && f.min !== undefined) || (f.max !== '' && f.max !== undefined)
      ).length;
      default: return 0;
    }
  };

  // Real-time updates - trigger whenever groups change
  // Use a ref to track if this is the first render to avoid immediate overwrite
  const isFirstRender = useRef(true);
  const prevGroupsJson = useRef('');
  // Use ref for onApply to avoid stale closures while keeping it out of dependency array
  const onApplyRef = useRef(onApply);
  // Track the last groups we sent to parent to prevent sync effect from overwriting
  const lastAppliedGroupsJson = useRef('');
  
  // Keep onApply ref updated
  useEffect(() => {
    onApplyRef.current = onApply;
  }, [onApply]);
  
  useEffect(() => {
    // Skip the first render to avoid overwriting parent's filterGroups
    if (isFirstRender.current) {
      isFirstRender.current = false;
      prevGroupsJson.current = JSON.stringify(groups);
      return;
    }
    
    // Also skip if groups haven't actually changed (prevents unnecessary updates)
    const currentGroupsJson = JSON.stringify(groups);
    if (currentGroupsJson === prevGroupsJson.current) {
      return;
    }
    prevGroupsJson.current = currentGroupsJson;
    
    // Send ALL groups, not just those with filters
    // This ensures empty groups still trigger a refresh
    const cleanedGroups = groups.map(g => ({
      id: g.id, 
      name: g.name, 
      filters: g.filters || {},
      technicalFilters: Object.fromEntries(
        Object.entries(g.technicalFilters || {}).filter(([_, filter]) => {
          if (filter.mode === 'equals') return filter.equals !== '' && filter.equals !== undefined;
          return (filter.min !== '' && filter.min !== undefined) || (filter.max !== '' && filter.max !== undefined);
        })
      )
    }));
    
    // Only send groups that have actual filters
    const groupsWithFilters = cleanedGroups.filter(g => 
      Object.keys(g.filters).length > 0 || Object.keys(g.technicalFilters).length > 0
    );
    
    // Track what we're applying so sync effect knows to ignore it
    lastAppliedGroupsJson.current = JSON.stringify(groupsWithFilters);
    
    console.log('Applying filter groups (changed):', groupsWithFilters);
    // Use ref to call onApply to avoid dependency on onApply
    onApplyRef.current(groupsWithFilters);
  }, [groups]); // Removed onApply from dependencies - using ref instead

  if (!isOpen) return null;

  const formatTechnicalFilterDisplay = (filter) => {
    if (filter.mode === 'equals') return filter.equals !== '' && filter.equals !== undefined ? `= ${filter.equals}` : '= (empty)';
    const min = filter.min || '∞';
    const max = filter.max || '∞';
    return `${min} - ${max}`;
  };

  const isAllCategoriesSelected = categoryFilters.length === 0;

  // Only show Active Filters bar when user has deviated from defaults
  // Normal mode default: status=['COMPLETE'], categories=[], countries=[]
  // Report mode default: report's status, all categories, all countries
  const hasUserAppliedFilters = totalActiveFilters > 0;  // Already calculates only user deviations for both modes

  // Check if status differs from report default
  const statusDiffersFromReport = isReportContext && (
    reportStatusFilters.length !== statusFilters.length || 
    !statusFilters.every(s => new Set(reportStatusFilters).has(s))
  );
  
  // Check if categories differ from report default (all selected)
  const categoriesDifferFromReport = isReportContext && categoryFilters.length !== availableCategories.length;
  
  // Check if countries differ from report default (all selected)
  const countriesDifferFromReport = isReportContext && 
    !(allCountries.length > 0 && countryFilters.length === allCountries.length);

  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'status':
        return (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Company Status</h3>
              {/* Info tooltip */}
              <div className="relative group">
                <HelpCircle className="w-4 h-4 text-gray-400 hover:text-indigo-600 cursor-help" />
                <div className="absolute left-0 top-6 z-50 w-64 p-3 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-2">Status Definitions</h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-start gap-2">
                      <span className="w-2 h-2 mt-1 rounded-full bg-green-500 flex-shrink-0"></span>
                      <p className="text-gray-700 dark:text-gray-300"><strong>Complete:</strong> All required fields filled</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="w-2 h-2 mt-1 rounded-full bg-yellow-500 flex-shrink-0"></span>
                      <p className="text-gray-700 dark:text-gray-300"><strong>Incomplete:</strong> Missing some data</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="w-2 h-2 mt-1 rounded-full bg-gray-400 flex-shrink-0"></span>
                      <p className="text-gray-700 dark:text-gray-300"><strong>Deleted:</strong> Marked for removal</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="w-2 h-2 mt-1 rounded-full bg-gray-300 flex-shrink-0"></span>
                      <p className="text-gray-700 dark:text-gray-300"><strong>None:</strong> No status assigned</p>
                    </div>
                    <p className="text-red-600 mt-2">⚠️ Unchecking all statuses will show 0 results</p>
                  </div>
                  <div className="absolute -top-2 left-2 w-3 h-3 bg-white dark:bg-gray-800 border-l border-t border-gray-200 dark:border-gray-700 transform rotate-45"></div>
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {isReportContext 
                ? `This report includes ${availableStatusOptions.length} status type${availableStatusOptions.length !== 1 ? 's' : ''}. ${statusFilters.length === 0 ? '(None selected - showing 0 results)' : ''}`
                : 'Select one or more statuses to filter companies'
              }
            </p>
            
            {/* Warning when no status selected */}
            {statusFilters.length === 0 && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700 font-medium">⚠️ No status selected - results will be empty</p>
              </div>
            )}
            
            <div className="space-y-2">
              {availableStatusOptions.map(option => {
                const isChecked = statusFilters.includes(option.value);
                const Icon = option.icon;
                return (
                  <label
                    key={option.value}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer border-2 transition-all ${
                      isChecked ? `${option.color} border-current` : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleStatus(option.value)}
                      className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className={`w-7 h-7 ${option.bgColor} rounded-md flex items-center justify-center`}>
                      <Icon className="w-3.5 h-3.5 text-white" />
                    </div>
                    <span className={`text-sm font-medium ${isChecked ? '' : 'text-gray-700'}`}>{option.label}</span>
                  </label>
                );
              })}
            </div>
          </div>
        );

      case 'categories':
        // In report context: categoryFilters = availableCategories means "All Categories" selected
        // In normal mode: categoryFilters = [] means "All Categories" (no filter = all)
        const isAllCategoriesSelectedForDisplay = isReportContext 
          ? (availableCategories.length > 0 && categoryFilters.length === availableCategories.length)
          : (categoryFilters.length === 0);
        
        return (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Categories</h3>
              {/* Info tooltip */}
              <div className="relative group">
                <HelpCircle className="w-4 h-4 text-gray-400 hover:text-indigo-600 cursor-help" />
                <div className="absolute left-0 top-6 z-50 w-72 p-3 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-2">Production Categories</h4>
                  <div className="space-y-2 text-xs text-gray-700 dark:text-gray-300">
                    <p>Categories represent the types of production processes a company has.</p>
                    <p><strong>Multi-select:</strong> Choose multiple categories to see companies with any of those processes.</p>
                    <p className="text-indigo-600">💡 Selecting categories updates available Countries and Technical Filters</p>
                    {isReportContext && <p className="text-red-600">⚠️ Unchecking all categories will show 0 results</p>}
                  </div>
                  <div className="absolute -top-2 left-2 w-3 h-3 bg-white border-l border-t border-gray-200 transform rotate-45"></div>
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {isReportContext 
                ? `${availableCategories.length} categor${availableCategories.length !== 1 ? 'ies' : 'y'} in this report's scope. ${categoryFilters.length} selected`
                : 'Select categories to filter companies by production type'
              }
            </p>
            
            {/* Search box for categories */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={categorySearchQuery}
                onChange={(e) => setCategorySearchQuery(e.target.value)}
                placeholder="Search categories..."
                className="w-full pl-10 pr-10 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
              />
              {categorySearchQuery && (
                <button onClick={() => setCategorySearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Warning when no categories selected */}
            {isReportContext && categoryFilters.length === 0 && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700 font-medium">⚠️ No categories selected - results will be empty</p>
              </div>
            )}

            <div className="max-h-80 overflow-y-auto space-y-1">
              {/* All Categories checkbox - show when not searching and in report context */}
              {!categorySearchQuery && availableCategories.length > 0 && (
                <label
                  className={`flex items-center gap-3 cursor-pointer p-3 rounded-lg transition-colors border-b-2 border-gray-200 mb-2 pb-4 ${
                    isAllCategoriesSelectedForDisplay ? 'bg-purple-50 border-2 border-purple-300' : 'hover:bg-gray-50 border-2 border-transparent'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isAllCategoriesSelectedForDisplay}
                    onChange={() => {
                      if (isReportContext) {
                        // Report mode: toggle between all selected and none
                        if (categoryFilters.length === availableCategories.length) {
                          onCategoryFilterChange([]);
                        } else {
                          onCategoryFilterChange([...availableCategories]);
                        }
                      } else {
                        // Normal mode: "All Categories" means clear filter (categoryFilters = [])
                        if (categoryFilters.length > 0) {
                          onCategoryFilterChange([]);
                        }
                      }
                    }}
                    className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span className={`text-sm font-bold ${isAllCategoriesSelectedForDisplay ? 'text-purple-800 dark:text-purple-300' : 'text-gray-900 dark:text-gray-100'}`}>
                    All Categories ({availableCategories.length})
                  </span>
                </label>
              )}
              
              {/* Individual category checkboxes */}
              {(categorySearchQuery ? filteredCategories.filter(c => c !== 'All Categories') : availableCategories).map(category => {
                // When all categories are selected, don't show individual checks
                const isChecked = !isAllCategoriesSelectedForDisplay && categoryFilters.includes(category);
                const categoryLabel = CATEGORIES.find(cat => cat.value === category)?.label || category;

                return (
                  <label
                    key={category}
                    className={`flex items-center gap-3 cursor-pointer p-3 rounded-lg transition-colors ${
                      isChecked ? 'bg-purple-50 border-2 border-purple-300' : 'hover:bg-gray-50 border-2 border-transparent'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {
                        if (isAllCategoriesSelectedForDisplay) {
                          // When clicking individual category while "All" is selected,
                          // select only this category
                          onCategoryFilterChange([category]);
                        } else {
                          toggleCategory(category);
                        }
                      }}
                      className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className={`text-sm ${isChecked ? 'font-medium text-purple-800 dark:text-purple-300' : 'text-gray-700 dark:text-gray-300'}`}>
                      {categoryLabel}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        );

      case 'countries':
        // In normal mode: countryFilters = [] means "All Countries" (no filter = all)
        // In report mode: countryFilters = allCountries means "All Countries" (all report countries selected)
        const isAllCountriesSelectedForDisplay = isReportContext 
          ? (allCountries.length > 0 && countryFilters.length === allCountries.length)
          : (countryFilters.length === 0);
        
        return (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Countries</h3>
              {/* Info tooltip */}
              <div className="relative group">
                <HelpCircle className="w-4 h-4 text-gray-400 hover:text-indigo-600 cursor-help" />
                <div className="absolute left-0 top-6 z-50 w-64 p-3 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-2">Country Filter</h4>
                  <div className="space-y-2 text-xs text-gray-700 dark:text-gray-300">
                    <p>Filter companies by their registered country location.</p>
                    <p><strong>Multi-select:</strong> Choose multiple countries to see companies from any of them.</p>
                    <p className="text-indigo-600">💡 List updates based on selected categories</p>
                    {isReportContext && <p className="text-red-600">⚠️ Unchecking all countries will show 0 results</p>}
                  </div>
                  <div className="absolute -top-2 left-2 w-3 h-3 bg-white border-l border-t border-gray-200 transform rotate-45"></div>
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {isReportContext 
                ? `${allCountries.length} countries in this report's scope. ${countryFilters.length === 0 ? '(None selected - showing 0 results)' : `${countryFilters.length} selected`}`
                : `${allCountries.length} countries available`
              }
            </p>
            
            {/* Warning when no countries selected - only in report context */}
            {isReportContext && countryFilters.length === 0 && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700 font-medium">⚠️ No countries selected - results will be empty</p>
              </div>
            )}
            
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={countrySearch}
                onChange={(e) => setCountrySearch(e.target.value)}
                placeholder="Search countries..."
                className="w-full pl-10 pr-10 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
              />
              {countrySearch && (
                <button onClick={() => setCountrySearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto space-y-1">
              {filteredCountries.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">No countries found</p>
              ) : (
                <>
                  {/* All Countries checkbox - only show when not searching */}
                  {!countrySearch && allCountries.length > 0 && (
                    <label
                      className={`flex items-center gap-3 cursor-pointer p-3 rounded-lg transition-colors border-b-2 border-gray-200 mb-2 pb-4 ${
                        isAllCountriesSelectedForDisplay ? 'bg-teal-50 border-2 border-teal-300' : 'hover:bg-gray-50 border-2 border-transparent'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isAllCountriesSelectedForDisplay}
                        onChange={() => {
                          if (isReportContext) {
                            // Report mode: toggle between all selected and none
                            if (countryFilters.length === allCountries.length) {
                              onCountryFilterChange([]);
                            } else {
                              onCountryFilterChange([...allCountries]);
                            }
                          } else {
                            // Normal mode: "All Countries" means clear filter (countryFilters = [])
                            // Clicking when already "All" does nothing (can't uncheck "All" to select none)
                            if (countryFilters.length > 0) {
                              onCountryFilterChange([]);
                            }
                          }
                        }}
                        className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                      />
                      <span className={`text-sm font-bold ${isAllCountriesSelectedForDisplay ? 'text-teal-800 dark:text-teal-300' : 'text-gray-900 dark:text-gray-100'}`}>
                        All Countries ({allCountries.length})
                      </span>
                    </label>
                  )}
                  {/* Individual country checkboxes - NOT checked when "All Countries" is selected */}
                  {filteredCountries.map(country => {
                    // When all countries are selected, don't show individual checks
                    const isChecked = !isAllCountriesSelectedForDisplay && countryFilters.includes(country);
                    
                    return (
                      <label
                        key={country}
                        className={`flex items-center gap-3 cursor-pointer p-3 rounded-lg transition-colors ${
                          isChecked ? 'bg-teal-50 border-2 border-teal-300' : 'hover:bg-gray-50 border-2 border-transparent'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isAllCountriesSelectedForDisplay) {
                              // When clicking individual country while "All" is selected,
                              // select only this country
                              onCountryFilterChange([country]);
                            } else {
                              toggleCountry(country);
                            }
                          }}
                          className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                        />
                        <span className={`text-sm ${isChecked ? 'font-medium text-teal-800 dark:text-teal-300' : 'text-gray-700 dark:text-gray-300'}`}>
                          {country}
                        </span>
                      </label>
                    );
                  })}
                </>
              )}
            </div>
          </div>
        );

      case 'businessType':
        return (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Business Type</h3>
              {/* Info tooltip */}
              <div className="relative group">
                <HelpCircle className="w-4 h-4 text-gray-400 hover:text-indigo-600 cursor-help" />
                <div className="absolute left-0 top-6 z-50 w-72 p-3 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-2">Business Type Definitions</h4>
                  <div className="space-y-2 text-xs text-gray-700 dark:text-gray-300">
                    <div className="flex items-start gap-2">
                      <span className="flex-shrink-0 px-1.5 py-0.5 bg-amber-100 rounded text-xs font-medium">Custom</span>
                      <p>Company does custom manufacturing for clients</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="flex-shrink-0 px-1.5 py-0.5 bg-amber-100 rounded text-xs font-medium">Proprietary</span>
                      <p>Company sells their own branded products</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="flex-shrink-0 px-1.5 py-0.5 bg-amber-100 rounded text-xs font-medium">In House</span>
                      <p>Company produces for internal use only</p>
                    </div>
                  </div>
                  <div className="absolute -top-2 left-2 w-3 h-3 bg-white border-l border-t border-gray-200 transform rotate-45"></div>
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Filter companies by their business model</p>

            {filteredBusinessTypeOptions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p className="text-sm dark:text-gray-400">No business type filters available for selected categories</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredBusinessTypeOptions.map(option => {
                  const currentValue = activeGroup?.filters[option.field];
                  const isActive = currentValue !== undefined;

                  return (
                    <div key={option.field} className={`bg-white dark:bg-gray-800 border rounded-lg p-4 transition-all ${isActive ? 'border-amber-400 dark:border-amber-500 shadow-sm' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}`}>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-gray-900 dark:text-white text-sm">{option.label}</h4>
                        <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">{option.count}</span>
                      </div>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name={`${activeGroupId}-${option.field}`} checked={currentValue === undefined} onChange={() => updateGroupFilter(activeGroupId, option.field, undefined)} className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-600 dark:text-gray-400">Any</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name={`${activeGroupId}-${option.field}`} checked={currentValue === true} onChange={() => updateGroupFilter(activeGroupId, option.field, true)} className="w-4 h-4 text-green-600" />
                          <span className="text-sm font-medium text-green-700">Include</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name={`${activeGroupId}-${option.field}`} checked={currentValue === false} onChange={() => updateGroupFilter(activeGroupId, option.field, false)} className="w-4 h-4 text-red-600" />
                          <span className="text-sm font-medium text-red-700">Exclude</span>
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );

      case 'materials':
        return (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Material Filters</h3>
              {/* Info tooltip for OR/AND logic */}
              <div className="relative group">
                <HelpCircle className="w-4 h-4 text-gray-400 hover:text-indigo-600 cursor-help" />
                <div className="absolute left-0 top-6 z-50 w-72 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-3">How Filter Groups Work</h4>
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <span className="flex-shrink-0 px-2 py-0.5 bg-orange-100 border border-orange-300 rounded text-xs font-bold text-orange-700">OR</span>
                      <div>
                        <p className="text-xs text-gray-700 dark:text-gray-300"><strong>Same group:</strong> Filters combine with OR</p>
                        <p className="text-xs text-gray-500">PVC <em>or</em> PP → Either material</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="flex-shrink-0 px-2 py-0.5 bg-blue-100 border border-blue-300 rounded text-xs font-bold text-blue-700">AND</span>
                      <div>
                        <p className="text-xs text-gray-700 dark:text-gray-300"><strong>Different groups:</strong> Combine with AND</p>
                        <p className="text-xs text-gray-500">Group 1 + Group 2 → Both required</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 pt-2 border-t border-gray-100">
                    <p className="text-xs text-indigo-600">💡 Use "+ Add Group" for AND conditions</p>
                  </div>
                  {/* Arrow */}
                  <div className="absolute -top-2 left-2 w-3 h-3 bg-white border-l border-t border-gray-200 transform rotate-45"></div>
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {isReportContext 
                ? `${filteredOptions.length} material filters for this report's categories`
                : `${filteredOptions.length} material filters available`
              }
            </p>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search material filters..."
                className="w-full pl-10 pr-10 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="max-h-72 overflow-y-auto space-y-3">
              {filteredOptions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-sm dark:text-gray-400">No filters found</p>
                </div>
              ) : (
                filteredOptions.map(option => {
                  const currentValue = activeGroup?.filters[option.field];
                  const isActive = currentValue !== undefined;

                  return (
                    <div key={option.field} className={`bg-white dark:bg-gray-800 border rounded-lg p-4 transition-all ${isActive ? 'border-indigo-400 dark:border-indigo-500 shadow-sm' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'}`}>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-gray-900 dark:text-white text-sm">{option.label}</h4>
                        <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">{option.count}</span>
                      </div>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name={`${activeGroupId}-${option.field}`} checked={currentValue === undefined} onChange={() => updateGroupFilter(activeGroupId, option.field, undefined)} className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-600 dark:text-gray-400">Any</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name={`${activeGroupId}-${option.field}`} checked={currentValue === true} onChange={() => updateGroupFilter(activeGroupId, option.field, true)} className="w-4 h-4 text-green-600" />
                          <span className="text-sm font-medium text-green-700 dark:text-green-400">Include</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name={`${activeGroupId}-${option.field}`} checked={currentValue === false} onChange={() => updateGroupFilter(activeGroupId, option.field, false)} className="w-4 h-4 text-red-600" />
                          <span className="text-sm font-medium text-red-700 dark:text-red-400">Exclude</span>
                        </label>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );

      case 'technical':
        return (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Technical Filters</h3>
              {/* Info tooltip */}
              <div className="relative group">
                <HelpCircle className="w-4 h-4 text-gray-400 hover:text-indigo-600 cursor-help" />
                <div className="absolute left-0 top-6 z-50 w-72 p-3 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-2">Technical Specifications</h4>
                  <div className="space-y-2 text-xs text-gray-700 dark:text-gray-300">
                    <p>Filter by machine specifications and capacities.</p>
                    <div className="flex items-start gap-2">
                      <span className="flex-shrink-0 px-1.5 py-0.5 bg-gray-100 rounded text-xs font-medium">Equals</span>
                      <p>Find exact value matches</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="flex-shrink-0 px-1.5 py-0.5 bg-gray-100 rounded text-xs font-medium">Range</span>
                      <p>Set min/max boundaries</p>
                    </div>
                    <p className="text-indigo-600">💡 Leave min or max empty for open-ended ranges</p>
                  </div>
                  <div className="absolute -top-2 left-2 w-3 h-3 bg-white border-l border-t border-gray-200 transform rotate-45"></div>
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {isReportContext 
                ? `${filteredTechnicalOptions.length} technical filters for this report's categories`
                : `${filteredTechnicalOptions.length} technical filters available`
              }
            </p>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={technicalSearchQuery}
                onChange={(e) => setTechnicalSearchQuery(e.target.value)}
                placeholder="Search technical filters..."
                className="w-full pl-10 pr-10 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
              />
              {technicalSearchQuery && (
                <button onClick={() => setTechnicalSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="max-h-72 overflow-y-auto space-y-3">
              {filteredTechnicalOptions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-sm dark:text-gray-400">No technical filters found</p>
                </div>
              ) : (
                filteredTechnicalOptions.map(option => {
                  const currentFilter = activeGroup?.technicalFilters?.[option.field] || { mode: 'range', equals: '', min: '', max: '' };
                  const mode = currentFilter.mode || 'range';

                  return (
                    <div key={option.field} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-gray-300 dark:hover:border-gray-600 transition-all">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-gray-900 dark:text-white text-sm">{option.label}</h4>
                        <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                          {option.min !== null && option.max !== null ? `${option.min} - ${option.max}` : 'Range'}
                        </span>
                      </div>

                      <div className="flex gap-4 mb-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name={`${activeGroupId}-${option.field}-mode`}
                            checked={mode === 'equals'}
                            onChange={() => {
                              const cf = activeGroup?.technicalFilters?.[option.field];
                              updateGroupTechnicalFilter(activeGroupId, option.field, 'equals', cf?.min || cf?.equals || '', '', '');
                            }}
                            className="w-4 h-4 text-indigo-600"
                          />
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Equals</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name={`${activeGroupId}-${option.field}-mode`}
                            checked={mode === 'range'}
                            onChange={() => {
                              const cf = activeGroup?.technicalFilters?.[option.field];
                              updateGroupTechnicalFilter(activeGroupId, option.field, 'range', '', cf?.equals || cf?.min || '', cf?.equals || cf?.max || '');
                            }}
                            className="w-4 h-4 text-indigo-600"
                          />
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Range</span>
                        </label>
                      </div>

                      {mode === 'equals' ? (
                        <input
                          type="number"
                          value={currentFilter.equals || ''}
                          onChange={(e) => updateGroupTechnicalFilter(activeGroupId, option.field, 'equals', e.target.value, '', '')}
                          placeholder="Enter exact value"
                          step={option.type === 'FloatField' ? '0.1' : '1'}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 dark:text-white"
                        />
                      ) : (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Min</label>
                            <input
                              type="number"
                              value={currentFilter.min || ''}
                              onChange={(e) => updateGroupTechnicalFilter(activeGroupId, option.field, 'range', '', e.target.value, currentFilter.max)}
                              placeholder={option.min !== null ? String(option.min) : "Min"}
                              step={option.type === 'FloatField' ? '0.1' : '1'}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 dark:text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Max</label>
                            <input
                              type="number"
                              value={currentFilter.max || ''}
                              onChange={(e) => updateGroupTechnicalFilter(activeGroupId, option.field, 'range', '', currentFilter.min, e.target.value)}
                              placeholder={option.max !== null ? String(option.max) : "Max"}
                              step={option.type === 'FloatField' ? '0.1' : '1'}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 dark:text-white"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={onClose} />

      {/* Sidebar */}
      <div className="fixed right-0 top-0 h-full w-full md:w-[750px] bg-white dark:bg-gray-900 shadow-2xl z-50 flex flex-col animate-slide-in">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Advanced Filters</h2>
                <p className="text-sm text-white/70">{totalActiveFilters} active filter{totalActiveFilters !== 1 ? 's' : ''}</p>
              </div>
            </div>
            <button onClick={onClose} className="w-10 h-10 hover:bg-white/20 rounded-lg transition-colors flex items-center justify-center">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Main Content - Two Column Layout */}
        <div className="flex flex-1 overflow-hidden">
          
          {/* Left Vertical Tabs */}
          <div className="w-56 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col flex-shrink-0">
            <div className="p-3 flex-1 overflow-y-auto">
              <nav className="space-y-1">
                {visibleTabs.map(tab => {
                  const Icon = tab.icon;
                  const count = getTabCount(tab.id);
                  const isActive = activeTab === tab.id;
                  
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center justify-between px-3 py-3 rounded-lg text-left transition-all ${
                        isActive 
                          ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md' 
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className={`w-4 h-4 ${isActive ? 'text-white' : tab.color}`} />
                        <span className="font-medium text-sm">{tab.label}</span>
                      </div>
                      {count > 0 && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                          isActive ? 'bg-white/30 text-white' : 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300'
                        }`}>
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Filter Groups Section */}
            <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800/50">
              <div className="flex items-center gap-1 mb-2 px-1">
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Filter Groups</p>
                {/* Info tooltip */}
                <div className="relative group">
                  <HelpCircle className="w-3.5 h-3.5 text-gray-400 hover:text-indigo-600 cursor-help" />
                  <div className="absolute left-0 bottom-6 z-50 w-56 p-3 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                    <h4 className="text-xs font-bold text-gray-900 dark:text-white mb-2">Filter Groups</h4>
                    <div className="space-y-1.5 text-xs text-gray-700 dark:text-gray-300">
                      <p>Groups let you build complex filter logic.</p>
                      <p><span className="px-1 py-0.5 bg-orange-100 text-orange-700 rounded font-medium">OR</span> within same group</p>
                      <p><span className="px-1 py-0.5 bg-blue-100 text-blue-700 rounded font-medium">AND</span> between groups</p>
                    </div>
                    {/* Arrow pointing down */}
                    <div className="absolute -bottom-2 left-2 w-3 h-3 bg-white dark:bg-gray-800 border-r border-b border-gray-200 dark:border-gray-700 transform rotate-45"></div>
                  </div>
                </div>
              </div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {groups.map(group => (
                  <div
                    key={group.id}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-all ${
                      activeGroupId === group.id 
                        ? 'bg-indigo-100 dark:bg-indigo-900/40 border-2 border-indigo-400 dark:border-indigo-500' 
                        : 'bg-white dark:bg-gray-700 border-2 border-transparent hover:border-gray-200 dark:hover:border-gray-600'
                    }`}
                    onClick={() => setActiveGroupId(group.id)}
                  >
                    <input
                      type="text"
                      value={group.name}
                      onChange={(e) => renameGroup(group.id, e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="bg-transparent border-none outline-none text-xs font-medium w-20 cursor-pointer dark:text-gray-200"
                    />
                    <div className="flex items-center gap-1">
                      <button onClick={(e) => { e.stopPropagation(); duplicateGroup(group.id); }} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded" title="Duplicate">
                        <Copy className="w-3 h-3 text-gray-500" />
                      </button>
                      {groups.length > 1 && (
                        <button onClick={(e) => { e.stopPropagation(); deleteGroup(group.id); }} className="p-1 hover:bg-red-100 rounded" title="Delete">
                          <Trash2 className="w-3 h-3 text-red-500" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={addGroup}
                className="w-full mt-2 flex items-center justify-center gap-1 px-3 py-2 text-xs text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors font-medium"
              >
                <Plus className="w-3 h-3" />
                Add Group
              </button>
            </div>
          </div>

          {/* Right Content Area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            
            {/* Active Filters Bar - Only show when user has applied filters different from report defaults */}
            {hasUserAppliedFilters && (
              <div className="p-4 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Active Filters</span>
                  <button
                    onClick={handleResetToReportValues}
                    className="text-xs text-red-500 hover:text-red-600 font-semibold"
                  >
                    Clear All
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 max-h-20 overflow-y-auto">
                  {/* Status chips - only show if different from default (Complete only in normal mode, report's status in report mode) */}
                  {(isReportContext ? statusDiffersFromReport : !(statusFilters.length === 1 && statusFilters[0] === 'COMPLETE')) && statusFilters.map(status => {
                    const opt = STATUS_OPTIONS.find(s => s.value === status);
                    return (
                      <span key={status} className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${opt?.color || 'bg-gray-100'}`}>
                        {opt?.label || status}
                        <button onClick={() => toggleStatus(status)} className="hover:bg-black/10 rounded-full p-0.5"><X className="w-3 h-3" /></button>
                      </span>
                    );
                  })}
                  {/* Category chips - only show if not all categories selected (different from report default) */}
                  {(!isReportContext || categoriesDifferFromReport) && categoryFilters.map(cat => {
                    const label = CATEGORIES.find(c => c.value === cat)?.label || cat;
                    return (
                      <span key={cat} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        📁 {label}
                        <button onClick={() => toggleCategory(cat)} className="hover:bg-black/10 rounded-full p-0.5"><X className="w-3 h-3" /></button>
                      </span>
                    );
                  })}
                  {/* Country chips - only show if NOT all selected (different from report default) */}
                  {(!isReportContext || countriesDifferFromReport) && countryFilters.length > 0 && countryFilters.length < allCountries.length && (
                    countryFilters.map(country => (
                      <span key={country} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-teal-100 text-teal-800">
                        🌍 {country}
                        <button onClick={() => toggleCountry(country)} className="hover:bg-black/10 rounded-full p-0.5"><X className="w-3 h-3" /></button>
                      </span>
                    ))
                  )}
                  {/* Material chips */}
                  {Object.entries(activeGroup?.filters || {}).map(([field, value]) => {
                    const opt = filterOptions.find(o => o.field === field);
                    return (
                      <span key={field} className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {opt?.label || field} {value ? '✓' : '✗'}
                        <button onClick={() => updateGroupFilter(activeGroupId, field, undefined)} className="hover:bg-black/10 rounded-full p-0.5"><X className="w-3 h-3" /></button>
                      </span>
                    );
                  })}
                  {/* Technical chips */}
                  {Object.entries(activeGroup?.technicalFilters || {}).filter(([_, f]) => 
                    f.mode === 'equals' ? f.equals !== '' && f.equals !== undefined : (f.min !== '' && f.min !== undefined) || (f.max !== '' && f.max !== undefined)
                  ).map(([field, filter]) => {
                    const opt = technicalFilterOptions.find(o => o.field === field);
                    return (
                      <span key={field} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        📊 {opt?.label || field}: {formatTechnicalFilterDisplay(filter)}
                        <button onClick={() => updateGroupTechnicalFilter(activeGroupId, field, 'range', '', '', '')} className="hover:bg-black/10 rounded-full p-0.5"><X className="w-3 h-3" /></button>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {renderTabContent()}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span className="font-medium">Live: Filters auto-applied</span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleResetToReportValues}
                className="px-6 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 font-medium text-gray-700 dark:text-gray-300 transition-colors"
              >
                Reset
              </button>
              <button
                onClick={onClose}
                className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 font-medium transition-colors shadow-md"
              >
                Apply & Close
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slide-in {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </>
  );
};

export default CompanyFilterSidebar;
