// frontend/src/pages/CreateReportPage.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { getBreadcrumbs } from '../../utils/breadcrumbConfig';
import { ArrowLeft, X, Search, ChevronRight, CheckCircle2, Filter, BarChart3, Globe, Layers, SlidersHorizontal } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import LoadingSpinner from '../../components/LoadingSpinner';
import { ToastContainer } from '../../components/Toast';
import { useToast } from '../../hooks/useToast';
import api from '../../utils/api';
import { useFilterOptions, useTechnicalFilterOptions } from '../../hooks/useDatabase';
import { CATEGORIES } from '../../constants/categories';
import FilterSidebarWithGroups from '../../components/database/FilterSidebarWithGroups';

const CreateReportPage = () => {
  const navigate = useNavigate();
  const location = useLocation(); 
  const { reportId } = useParams();
  const isEditMode = !!reportId;
  const { toasts, success, error: showError, warning, removeToast } = useToast();

  const [loading, setLoading] = useState(isEditMode);
  const [currentStep, setCurrentStep] = useState(1);

  const navigationState = location.state || {};
  const preloadedFilters = navigationState.filterCriteria || {};
  const preloadedRecordCount = navigationState.recordCount || 0;

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    is_active: true,
    filter_criteria: {}
  });

  const breadcrumbs = getBreadcrumbs(location.pathname, {
    reportName: isEditMode ? formData.title : undefined
  });

  const [availableFilters, setAvailableFilters] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState(new Set(['SELECT']));
  const [filterGroups, setFilterGroups] = useState([]);
  const [countryFilters, setCountryFilters] = useState([]);
  const [categoryFilters, setCategoryFilters] = useState([]);
  const [showFilterSidebar, setShowFilterSidebar] = useState(false);
  const [availableCountries, setAvailableCountries] = useState([]);

  const [liveStats, setLiveStats] = useState({
    total_records: preloadedRecordCount,
    field_breakdown: null
  });
  const [statsLoading, setStatsLoading] = useState(false);

  // Load existing report data if in edit mode
  useEffect(() => {
    if (isEditMode && reportId) {
      fetchReportData();
    }
  }, [reportId, isEditMode]);

  const filterOptionsCategory = categoryFilters.length === 1
    ? categoryFilters[0]
    : (selectedCategories.size === 1 && !selectedCategories.has('ALL') && !selectedCategories.has('SELECT')
        ? Array.from(selectedCategories)[0]
        : 'ALL');

  // NEW: Fetch filter options and technical filter options
  const { data: filterOptions = [] } = useFilterOptions(filterOptionsCategory);
  const { data: technicalFilterOptions = [] } = useTechnicalFilterOptions(filterOptionsCategory);

  // NEW: Update availableFilters when filterOptions changes
  useEffect(() => {
    setAvailableFilters(filterOptions);
  }, [filterOptions]);

  // NEW: Available categories for FilterSidebarWithGroups
  const availableCategories = CATEGORIES
    .filter(cat => cat.value !== 'ALL' && cat.value !== 'SELECT')
    .map(cat => cat.value);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/custom-reports/${reportId}/`);
      const report = response.data;

      console.log('📋 Loading report for edit:', report);

      setFormData({
        title: report.title || '',
        description: report.description || '',
        is_active: report.is_active !== undefined ? report.is_active : true,
        filter_criteria: report.filter_criteria || {}
      });

      const criteria = report.filter_criteria || {};

      // Handle categories
      if (criteria.categories) {
        if (Array.isArray(criteria.categories)) {
          setSelectedCategories(new Set(criteria.categories));
          setCategoryFilters(criteria.categories); // NEW
        } else {
          setSelectedCategories(new Set([criteria.categories]));
          setCategoryFilters([criteria.categories]); // NEW
        }
      } else if (criteria.category) {
        setSelectedCategories(new Set([criteria.category]));
        setCategoryFilters([criteria.category]); // NEW
      } else {
        setSelectedCategories(new Set(['ALL']));
      }

      // Handle countries
      if (criteria.country && Array.isArray(criteria.country)) {
        setCountryFilters(criteria.country);
      }

        if (criteria.categories) {
          if (Array.isArray(criteria.categories)) {
            setCategoryFilters(criteria.categories);
          } else {
            setCategoryFilters([criteria.categories]);
          }
        } else if (criteria.category) {
          setCategoryFilters([criteria.category]);
        }

      // NEW: Handle filter groups
      if (criteria.filter_groups && Array.isArray(criteria.filter_groups)) {
        console.log('📦 Loading filter groups:', criteria.filter_groups);
        setFilterGroups(criteria.filter_groups);
      }

      setLiveStats({
        total_records: report.record_count || 0,
        field_breakdown: null
      });

    } catch (error) {
      console.error('Error loading report:', error);
      showError('Failed to load report');
      navigate('/custom-reports');
    } finally {
      setLoading(false);
    }
  };

  // Update stats when filters change
  useEffect(() => {
    if (selectedCategories.has('SELECT')) {
      setLiveStats({ total_records: 0, field_breakdown: null });
      return;
    }
    const timer = setTimeout(() => {
      fetchLiveStats();
    }, 500);
    return () => clearTimeout(timer);
  }, [selectedCategories, filterGroups, countryFilters, categoryFilters]);

  // Handle preloaded filters from SuperdatabasePage
  useEffect(() => {
    if (Object.keys(preloadedFilters).length > 0) {
      console.log('🔄 Preloaded Filters:', preloadedFilters);

      // Handle categories
      if (preloadedFilters.categories) {
        const categoriesValue = preloadedFilters.categories;
        if (Array.isArray(categoriesValue)) {
          setSelectedCategories(new Set(categoriesValue));
          setCategoryFilters(categoriesValue); // NEW
        } else {
          setSelectedCategories(new Set([categoriesValue]));
          setCategoryFilters([categoriesValue]); // NEW
        }
      } else if (preloadedFilters.category) {
        setSelectedCategories(new Set([preloadedFilters.category]));
        setCategoryFilters([preloadedFilters.category]); // NEW
      } else {
        setSelectedCategories(new Set(['ALL']));
      }

      // Set country filters
      if (preloadedFilters.country && Array.isArray(preloadedFilters.country)) {
        setCountryFilters(preloadedFilters.country);
      }

      // NEW: Handle filter groups
      if (preloadedFilters.filter_groups && Array.isArray(preloadedFilters.filter_groups)) {
        console.log('📦 Setting filter groups:', preloadedFilters.filter_groups);
        setFilterGroups(preloadedFilters.filter_groups);
      }

      setLiveStats(prev => ({
        ...prev,
        total_records: preloadedRecordCount
      }));
    }
  }, []);

  // Fetch available countries when categories change
  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const params = new URLSearchParams();
        if (!selectedCategories.has('ALL') && !selectedCategories.has('SELECT')) {
          params.append('categories', Array.from(selectedCategories).join(','));
        }

        const response = await api.get(`/api/database-stats/?${params.toString()}`);
        setAvailableCountries(response.data.all_countries || []);
      } catch (error) {
        console.error('Failed to fetch countries:', error);
      }
    };

    if (!selectedCategories.has('SELECT')) {
      fetchCountries();
    }
  }, [selectedCategories]);

  // Fetch available filters when categories change
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const filterOptionsCategory = categoryFilters.length === 1
          ? categoryFilters[0]
          : (selectedCategories.size === 1 && !selectedCategories.has('ALL') && !selectedCategories.has('SELECT')
              ? Array.from(selectedCategories)[0]
              : 'ALL');

        const response = await api.get(`/api/filter-options/?category=${filterOptionsCategory}`);
        setAvailableFilters(response.data || []);
      } catch (error) {
        console.error('Failed to fetch filters:', error);
      }
    };

    if (!selectedCategories.has('SELECT')) {
      fetchFilters();
    }
  }, [selectedCategories]);

  // Auto-generate title and description when filters are loaded (only for new reports from Superdatabase)
  useEffect(() => {
    // Only auto-generate if:
    // 1. Not in edit mode
    // 2. Coming from Superdatabase with preloaded filters
    // 3. Title is still empty (hasn't been manually set)
    // 4. Available filters are loaded (so we can use filter labels)
    if (!isEditMode &&
        Object.keys(preloadedFilters).length > 0 &&
        formData.title === '' &&
        availableFilters.length > 0 &&
        !selectedCategories.has('SELECT')) {

      const { title, description } = generateReportTitleAndDescription();

      console.log('🎯 Auto-generated report info:', { title, description });

      setFormData(prev => ({
        ...prev,
        title: title,
        description: description
      }));
    }
  }, [availableFilters, selectedCategories, countryFilters, filterGroups, isEditMode, preloadedFilters]);

  const buildFilterCriteria = () => {
    const criteria = {};

    // NEW: Handle categories with new logic
    if (categoryFilters.length > 0) {
      criteria.categories = categoryFilters.length === 1
        ? categoryFilters[0]
        : categoryFilters;
    } else if (!selectedCategories.has('SELECT') && !selectedCategories.has('ALL')) {
      const categoriesArray = Array.from(selectedCategories);
      if (categoriesArray.length === 1) {
        criteria.category = categoriesArray[0];
      } else if (categoriesArray.length > 1) {
        criteria.categories = categoriesArray;
      }
    }

    // Add filter groups
    if (filterGroups.length > 0) {
      criteria.filter_groups = filterGroups;
    }

    // Add country filters
    if (countryFilters.length > 0) {
      criteria.country = countryFilters;
    }

    console.log('🔨 Building Filter Criteria:', criteria);
    return criteria;
  };

  // Auto-generate report title and description based on filters
  const generateReportTitleAndDescription = () => {
    const titleParts = [];
    const descriptionParts = [];

    // 1. Add Category Info
    const categories = categoryFilters.length > 0 ? categoryFilters : Array.from(selectedCategories);

    if (!selectedCategories.has('SELECT') && !selectedCategories.has('ALL') && categories.length > 0) {
      const categoryNames = categories
        .map(val => {
          const cat = CATEGORIES.find(c => c.value === val);
          return cat?.label || val;
        });

      if (categoryNames.length === 1) {
        titleParts.push(categoryNames[0]);
        descriptionParts.push(`This report focuses on ${categoryNames[0]}.`);
      } else if (categoryNames.length === 2) {
        titleParts.push(categoryNames.join(' and '));
        descriptionParts.push(`This report covers ${categoryNames.join(' and ')}.`);
      } else {
        titleParts.push('Multiple Categories');
        descriptionParts.push(`This report covers ${categoryNames.slice(0, -1).join(', ')}, and ${categoryNames[categoryNames.length - 1]}.`);
      }
    } else {
      titleParts.push('All Manufacturers');
      descriptionParts.push('This report includes all manufacturer categories.');
    }

    // 2. Add Country Info
    if (countryFilters.length > 0) {
      if (countryFilters.length === 1) {
        titleParts.push(`in ${countryFilters[0]}`);
        descriptionParts.push(`Filtered by location: ${countryFilters[0]}.`);
      } else if (countryFilters.length === 2) {
        titleParts.push(`in ${countryFilters.join(' and ')}`);
        descriptionParts.push(`Filtered by locations: ${countryFilters.join(' and ')}.`);
      } else if (countryFilters.length <= 5) {
        titleParts.push(`in ${countryFilters.length} Countries`);
        descriptionParts.push(`Filtered by locations: ${countryFilters.join(', ')}.`);
      } else {
        titleParts.push(`in ${countryFilters.length} Countries`);
        descriptionParts.push(`Filtered by ${countryFilters.length} locations including ${countryFilters.slice(0, 3).join(', ')}, and others.`);
      }
    }

    // 3. Add Filter Groups Info
    if (filterGroups.length > 0) {
      const totalFilterCount = filterGroups.reduce((sum, group) => {
        return sum + Object.keys(group.filters || {}).length;
      }, 0);

      if (totalFilterCount > 0) {
        const filterDescriptions = [];

        filterGroups.forEach((group) => {
          const filters = Object.entries(group.filters || {}).map(([field, value]) => {
            const option = availableFilters.find(opt => opt.field === field);
            const label = option?.label || field.replace(/_/g, ' ');
            return `${label} (${value ? 'Include' : 'Exclude'})`;
          });

          if (filters.length > 0) {
            filterDescriptions.push(filters.join(', '));
          }
        });

        if (filterDescriptions.length > 0) {
          titleParts.push(`with ${totalFilterCount} Material ${totalFilterCount === 1 ? 'Filter' : 'Filters'}`);
          descriptionParts.push(`Material filters applied: ${filterDescriptions.join(' AND ')}.`);
        }
      }
    }

    // Generate final title
    const title = titleParts.join(' ');

    // Generate final description
    let description = descriptionParts.join(' ');
    if (preloadedRecordCount > 0) {
      description += ` This report includes ${preloadedRecordCount.toLocaleString()} matching records.`;
    }

    return { title, description };
  };

  const fetchLiveStats = async () => {
    if (selectedCategories.has('SELECT')) return;

    setStatsLoading(true);
    try {
      const params = new URLSearchParams();

      // Use categoryFilters if available, otherwise use selectedCategories
      const categories = categoryFilters.length > 0
        ? categoryFilters
        : (!selectedCategories.has('ALL') ? Array.from(selectedCategories) : []);

      if (categories.length > 0) {
        params.append('categories', categories.join(','));
      }

      if (countryFilters.length > 0) {
        params.append('countries', countryFilters.join(','));
      }

      if (filterGroups.length > 0) {
        params.append('filter_groups', JSON.stringify(filterGroups));
      }

      const response = await api.get(`/api/database-stats/?${params.toString()}`);
      setLiveStats({
        total_records: response.data.total_count || 0,
        field_breakdown: {
          categories: response.data.categories || [],
          countries: response.data.top_countries || []
        }
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      showError('Failed to fetch preview statistics');
    } finally {
      setStatsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title) {
      showError('Please enter a report title');
      return;
    }

    if (selectedCategories.has('SELECT')) {
      showError('Please select at least one category');
      return;
    }

    setLoading(true);

    try {
      const reportData = {
        ...formData,
        filter_criteria: buildFilterCriteria()
      };

      console.log('💾 Saving report:', reportData);

      if (isEditMode) {
        await api.put(`/api/custom-reports/${reportId}/`, reportData);
        success('Report updated successfully!');
      } else {
        await api.post('/api/custom-reports/', reportData);
        success('Report created successfully!');
      }

      setTimeout(() => {
        navigate('/custom-reports');
      }, 1000);
    } catch (error) {
      console.error('Error saving report:', error);
      showError(isEditMode ? 'Failed to update report' : 'Failed to create report');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Calculate active filters count
  const categoryFilterCount = categoryFilters.length > 0
    ? categoryFilters.length
    : (selectedCategories.has('ALL') || selectedCategories.has('SELECT') ? 0 : selectedCategories.size);

  const groupFilterCount = filterGroups.reduce((sum, group) => {
    const booleanCount = Object.keys(group.filters || {}).length;
    const technicalCount = Object.keys(group.technicalFilters || {}).length;
    return sum + booleanCount + technicalCount;
  }, 0);
  const activeFiltersCount = categoryFilterCount + groupFilterCount + countryFilters.length;

  // Helper function to format filter groups for display
  const formatFilterGroups = (groups, options, technicalOptions) => {
    if (!groups || groups.length === 0) return null;

    return groups.map((group) => {
      const parts = [];

      // Boolean filters
      const booleanFilters = Object.entries(group.filters || {}).map(([field, value]) => {
        const option = options.find(opt => opt.field === field);
        const label = option?.label || field.replace(/_/g, ' ');
        const action = value ? 'Include' : 'Exclude';
        return `${label}: ${action}`;
      });

      // Technical filters
      const techFilters = Object.entries(group.technicalFilters || {}).map(([field, config]) => {
        const option = technicalOptions.find(opt => opt.field === field);
        const label = option?.label || field.replace(/_/g, ' ');
        if (config.mode === 'equals') {
          return `${label} = ${config.equals}`;
        } else {
          const min = config.min || '∞';
          const max = config.max || '∞';
          return `${label}: ${min} - ${max}`;
        }
      });

      const allFilters = [...booleanFilters, ...techFilters];

      if (allFilters.length === 0) return null;
      if (allFilters.length === 1) return allFilters[0];
      return `(${allFilters.join(' OR ')})`;
    }).filter(Boolean).join(' AND ');
  };

  if (loading && isEditMode) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <LoadingSpinner />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      pageTitle={isEditMode ? 'Edit Custom Report' : 'Create Custom Report'}
      pageSubtitleBottom={
        <p className="text-sm text-white-700">
          {isEditMode ? 'Update your custom report settings' : 'Define filters to create a custom database report'}
        </p>
      }
      breadcrumbs={breadcrumbs}      
    >
      <ToastContainer toasts={toasts} removeToast={removeToast} />

    {/* Filter Sidebar with Groups */}
    {showFilterSidebar && (
        <FilterSidebarWithGroups
          isOpen={showFilterSidebar}
          onClose={() => setShowFilterSidebar(false)}
          filterGroups={filterGroups}
          filterOptions={availableFilters}
          technicalFilterOptions={technicalFilterOptions}
          countryFilters={countryFilters}
          onCountryFilterChange={setCountryFilters}
          allCountries={availableCountries}
          categoryFilters={categoryFilters}
          onCategoryFilterChange={(newCategories) => {
            // SYNC: Update both categoryFilters and selectedCategories
            setCategoryFilters(newCategories);
            if (newCategories.length === 0) {
              setSelectedCategories(new Set(['ALL']));
            } else {
              setSelectedCategories(new Set(newCategories));
            }
          }}
          availableCategories={availableCategories}
          onApply={(newGroups) => {
            setFilterGroups(newGroups);
          }}
          onReset={() => {
            setFilterGroups([]);
            setCountryFilters([]);
            setCategoryFilters([]);
            setSelectedCategories(new Set(['ALL']));
          }}
        />
    )}

      <div className="flex-1 overflow-auto bg-gray-50">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <form onSubmit={handleSubmit}>
            {/* Step Progress Indicator - EXACT MATCH TO OLD DESIGN */}
            <div className="mb-8">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 px-8 py-6">
                <div className="flex items-center">
                  {/* Step 1 */}
                  <div className="flex items-center gap-3">
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 ${
                      currentStep >= 1 ? 'bg-indigo-600 text-white' : 'bg-gray-300 text-gray-600'
                    }`}>
                      <BarChart3 className="w-6 h-6" />
                    </div>
                    <div className="flex flex-col">
                      <div className="text-xs text-gray-500">Step 1</div>
                      <div className={`text-base font-bold ${
                        currentStep >= 1 ? 'text-gray-900' : 'text-gray-400'
                      }`}>
                        Basic Info
                      </div>
                    </div>
                  </div>

                  {/* Progress Line 1-2 */}
                  <div className="flex-1 h-1 mx-8 rounded-full bg-gray-200 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        currentStep >= 2 ? 'bg-indigo-600' : 'bg-gray-200'
                      }`}
                      style={{ width: currentStep >= 2 ? '100%' : '0%' }}
                    />
                  </div>

                  {/* Step 2 */}
                  <div className="flex items-center gap-3">
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 ${
                      currentStep >= 2 ? 'bg-indigo-600 text-white' : 'bg-gray-300 text-gray-600'
                    }`}>
                      <Filter className="w-6 h-6" />
                    </div>
                    <div className="flex flex-col">
                      <div className="text-xs text-gray-500">Step 2</div>
                      <div className={`text-base font-bold ${
                        currentStep >= 2 ? 'text-gray-900' : 'text-gray-400'
                      }`}>
                        Filters
                      </div>
                    </div>
                  </div>

                  {/* Progress Line 2-3 */}
                  <div className="flex-1 h-1 mx-8 rounded-full bg-gray-200 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        currentStep >= 3 ? 'bg-indigo-600' : 'bg-gray-200'
                      }`}
                      style={{ width: currentStep >= 3 ? '100%' : '0%' }}
                    />
                  </div>

                  {/* Step 3 */}
                  <div className="flex items-center gap-3">
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 ${
                      currentStep >= 3 ? 'bg-indigo-600 text-white' : 'bg-gray-300 text-gray-600'
                    }`}>
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div className="flex flex-col">
                      <div className="text-xs text-gray-500">Step 3</div>
                      <div className={`text-base font-bold ${
                        currentStep >= 3 ? 'text-gray-900' : 'text-gray-400'
                      }`}>
                        Review
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                {/* Step 1: Basic Information */}
                {currentStep === 1 && (
                  <div className="bg-white rounded-xl shadow-lg border border-gray-200">
                    <div className="border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center text-white ${
                        currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
                      }`}>
                        <BarChart3 className="w-6 h-6" />
                      </div>
                      <div>
                          <h2 className="text-lg font-semibold text-gray-900">Report Information</h2>
                          <p className="text-xs text-gray-600">Basic details about your custom report</p>
                      </div>

                    </div>
                  </div>

                  {/* Info callout for auto-generated reports */}
                  {!isEditMode && Object.keys(preloadedFilters).length > 0 && (
                    <div className="mx-6 mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <div>
                          <h4 className="text-sm font-semibold text-blue-900 mb-1">Report Created from Superdatabase Filters</h4>
                          <p className="text-sm text-blue-800">
                            The title and description have been automatically generated based on your selected filters.
                            You can edit them or click "Regenerate" to update based on current filters.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="p-6 space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Report Title *
                        </label>
                        {!isEditMode && Object.keys(preloadedFilters).length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              const { title, description } = generateReportTitleAndDescription();
                              setFormData(prev => ({
                                ...prev,
                                title: title,
                                description: description
                              }));
                              success('Title and description regenerated!');
                            }}
                            className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Regenerate
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        name="title"
                        value={formData.title}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter report title"
                        required
                      />
                      {!isEditMode && Object.keys(preloadedFilters).length > 0 && formData.title && (
                        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                          <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Auto-generated based on your filters
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description *
                      </label>
                      <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows="3"
                        placeholder="Describe what this report includes"
                      />
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                      <input
                        type="checkbox"
                        id="is_active"
                        name="is_active"
                        checked={formData.is_active}
                        onChange={handleInputChange}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="is_active" className="text-sm text-gray-700">
                        Active (Report will be visible and accessible)
                      </label>
                    </div>
                  </div>

                  <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        if (!formData.title.trim()) {
                          warning('Please enter a report title');
                          return;
                        }
                        if (!formData.description.trim()) {
                          warning('Please enter a report description');
                          return;
                        }
                        setCurrentStep(2);
                      }}
                      className="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition-all font-medium flex items-center gap-2"
                    >
                      Next: Filters
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                )}

                {/* Step 2: Filter Configuration */}
                {currentStep === 2 && (
                  <div className="bg-white rounded-xl shadow-lg border border-gray-200">
                    <div className="border-b border-gray-200 bg-gradient-to-r from-purple-50 to-pink-50 px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg flex items-center justify-center text-white ${
                          currentStep >= 2 ? 'bg-purple-600 text-white' : 'bg-gray-300 text-gray-600'
                        }`}>
                         <Filter className="w-6 h-6" />
                        </div>
                        <div>
                          <h2 className="text-lg font-semibold text-gray-900">Filter Criteria</h2>
                          <p className="text-xs text-gray-600">Define which records to include</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-6 space-y-6">
                      {/* Category Selection */}
                      <div>
                        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                          <Layers className="w-4 h-4 text-indigo-600" />
                          Categories
                          <span className="text-xs font-normal text-gray-500">
                            ({selectedCategories.has('ALL') ? 'All' : selectedCategories.has('SELECT') ? 'None' : selectedCategories.size} selected)
                          </span>
                        </label>

                        <div className="bg-gray-50 rounded-lg border-2 border-gray-200 p-4">
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {/* "All Categories" Checkbox */}
                            <label className="flex items-center gap-2 p-3 hover:bg-white rounded-lg cursor-pointer border border-gray-200 transition-colors">
                              <input
                                type="checkbox"
                                checked={selectedCategories.has('ALL')}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedCategories(new Set(['ALL']));
                                  } else {
                                    setSelectedCategories(new Set());
                                  }
                                }}
                                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                              />
                              <span className="text-sm font-medium text-gray-900">All Categories</span>
                            </label>

                            {/* Individual Category Checkboxes */}
                            {CATEGORIES.filter(cat => cat.value !== 'ALL').map(category => (
                              <label
                                key={category.value}
                                className={`flex items-center gap-2 p-3 hover:bg-white rounded-lg cursor-pointer border transition-colors ${
                                  selectedCategories.has(category.value) && !selectedCategories.has('ALL')
                                    ? 'border-indigo-500 bg-indigo-50'
                                    : 'border-gray-200'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedCategories.has(category.value)}
                                  onChange={(e) => {
                                    const newSelected = new Set(selectedCategories);
                                    newSelected.delete('ALL');
                                    newSelected.delete('SELECT');

                                    if (e.target.checked) {
                                      newSelected.add(category.value);
                                    } else {
                                      newSelected.delete(category.value);
                                    }

                                    if (newSelected.size === 0) {
                                      newSelected.add('ALL');
                                    }

                                    setSelectedCategories(newSelected);

                                    // SYNC: Update categoryFilters for filter sidebar
                                    const categoriesArray = Array.from(newSelected).filter(
                                      c => c !== 'ALL' && c !== 'SELECT'
                                    );
                                    setCategoryFilters(categoriesArray);
                                  }}
                                  disabled={selectedCategories.has('ALL')}
                                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 disabled:opacity-50"
                                />
                                <span className={`text-sm ${
                                  selectedCategories.has('ALL') ? 'text-gray-400' : 'text-gray-900'
                                }`}>
                                  {category.label}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Configure Filters Button */}
                      {!selectedCategories.has('SELECT') && (
                        <div className="border-t border-gray-200 pt-6">
                          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 border-2 border-indigo-200">
                            <div className="flex items-start justify-between mb-4">
                              <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">Advanced Filters</h3>
                                <p className="text-sm text-gray-600">
                                  Configure complex filter combinations with OR/AND logic for countries, material and technical properties
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setShowFilterSidebar(true);
                                }}
                                className="px-5 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 flex items-center gap-2 shadow-lg transition-all font-medium"
                              >
                                <SlidersHorizontal className="w-5 h-5" />
                                Filters
                              </button>
                            </div>

                            {/* Display Active Filters */}
                            {(filterGroups.length > 0 || countryFilters.length > 0 || categoryFilterCount > 0) && (
                              <div className="mt-4 pt-4 border-t border-indigo-200">
                                <div className="flex items-center gap-2 mb-3">
                                  <span className="text-sm font-medium text-gray-700">Active filters:</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setFilterGroups([]);
                                      setCountryFilters([]);
                                      setCategoryFilters([]);
                                      setSelectedCategories(new Set(['ALL']));
                                      setCurrentPage(1);
                                    }}
                                    className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                                  >
                                    Clear all
                                  </button>
                                </div>

                                {/* Filter Tags */}
                                <div className="flex flex-wrap gap-2 mb-4">
                                  {/* Category Filter Chips */}
                                  {!selectedCategories.has('ALL') && !selectedCategories.has('SELECT') && selectedCategories.size > 0 && (
                                    <>
                                      {Array.from(selectedCategories).map(categoryValue => {
                                        const cat = CATEGORIES.find(c => c.value === categoryValue);
                                        return (
                                          <span
                                            key={categoryValue}
                                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-800 border border-blue-300 rounded-full text-sm font-medium"
                                          >
                                            Category: {cat?.label || categoryValue}
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const newSelected = new Set(selectedCategories);
                                                newSelected.delete(categoryValue);
                                                setSelectedCategories(newSelected.size === 0 ? new Set(['ALL']) : newSelected);
                                              }}
                                              className="hover:opacity-70"
                                            >
                                              <X className="w-4 h-4" />
                                            </button>
                                          </span>
                                        );
                                      })}
                                    </>
                                  )}

                                  {/* Filter Group Chips */}
                                  {filterGroups.map((group, groupIndex) => (
                                    <div key={group.id} className="inline-flex items-center gap-2">
                                      <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-1 rounded">
                                        {group.name}:
                                      </span>

                                      {/* Boolean Filters */}
                                      {Object.entries(group.filters || {}).map(([field, value]) => {
                                        const option = availableFilters.find(opt => opt.field === field);
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
                                              type="button"
                                              onClick={() => {
                                                const newGroups = filterGroups.map((g, idx) => {
                                                  if (idx !== groupIndex) return g;
                                                  const newFilters = { ...g.filters };
                                                  delete newFilters[field];
                                                  return { ...g, filters: newFilters };
                                                }).filter(g =>
                                                  Object.keys(g.filters || {}).length > 0 ||
                                                  Object.keys(g.technicalFilters || {}).length > 0
                                                );
                                                setFilterGroups(newGroups);
                                              }}
                                              className="hover:opacity-70"
                                            >
                                              <X className="w-4 h-4" />
                                            </button>
                                          </span>
                                        );
                                      })}

                                      {/* Technical Filters - NEW */}
                                      {Object.entries(group.technicalFilters || {}).map(([field, config]) => {
                                        const option = technicalFilterOptions.find(opt => opt.field === field);
                                        const label = option?.label || field.replace(/_/g, ' ');

                                        let displayText = '';
                                        if (config.mode === 'equals') {
                                          displayText = `${label} = ${config.equals}`;
                                        } else {
                                          const min = config.min !== '' && config.min !== null && config.min !== undefined ? config.min : '∞';
                                          const max = config.max !== '' && config.max !== null && config.max !== undefined ? config.max : '∞';
                                          displayText = `${label}: ${min} - ${max}`;
                                        }

                                        return (
                                          <span
                                            key={field}
                                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800 border border-blue-300"
                                          >
                                            📊 {displayText}
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const newGroups = filterGroups.map((g, idx) => {
                                                  if (idx !== groupIndex) return g;
                                                  const newTechFilters = { ...g.technicalFilters };
                                                  delete newTechFilters[field];
                                                  return { ...g, technicalFilters: newTechFilters };
                                                }).filter(g =>
                                                  Object.keys(g.filters || {}).length > 0 ||
                                                  Object.keys(g.technicalFilters || {}).length > 0
                                                );
                                                setFilterGroups(newGroups);
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

                                  {/* Country Filters */}
                                  {countryFilters.map(country => (
                                    <span
                                      key={country}
                                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-100 text-purple-800 border border-purple-300 rounded-full text-sm font-medium"
                                    >
                                      Country: {country}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setCountryFilters(countryFilters.filter(c => c !== country));
                                        }}
                                        className="hover:opacity-70"
                                      >
                                        <X className="w-4 h-4" />
                                      </button>
                                    </span>
                                  ))}
                                </div>

                                {/* Active Results Summary */}
                                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-lg p-4 shadow-sm">
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
                                          if (!selectedCategories.has('ALL') && !selectedCategories.has('SELECT') && selectedCategories.size > 0) {
                                            const categoryNames = Array.from(selectedCategories)
                                              .map(val => {
                                                const cat = CATEGORIES.find(c => c.value === val);
                                                return cat?.label || val;
                                              })
                                              .join(', ');
                                            sections.push(
                                              <div key="categories">
                                                <strong>Category:</strong> {categoryNames}
                                              </div>
                                            );
                                          }

                                          // 2. Build Country Section
                                          if (countryFilters.length > 0) {
                                            sections.push(
                                              <div key="countries">
                                                <strong>Country:</strong> {countryFilters.join(', ')}
                                              </div>
                                            );
                                          }

                                          // 3. Build Filter Groups Section (OR within groups, AND between groups)
                                          if (filterGroups.length > 0) {
                                            const groupDescriptions = filterGroups.map((group) => {
                                              const allFilters = [];

                                              // Add boolean filters
                                              const booleanFilters = Object.entries(group.filters || {}).map(([field, value]) => {
                                                const option = availableFilters.find(opt => opt.field === field);
                                                const label = option?.label || field.replace(/_/g, ' ');
                                                const action = value
                                                  ? '<span class="text-green-700 font-semibold">Include</span>'
                                                  : '<span class="text-red-700 font-semibold">Exclude</span>';
                                                return `${label}: ${action}`;
                                              });
                                              allFilters.push(...booleanFilters);

                                              // Add technical filters - NEW
                                              const techFilters = Object.entries(group.technicalFilters || {}).map(([field, config]) => {
                                                const option = technicalFilterOptions.find(opt => opt.field === field);
                                                const label = option?.label || field.replace(/_/g, ' ');

                                                if (config.mode === 'equals') {
                                                  return `${label} <span class="text-blue-700 font-semibold">= ${config.equals}</span>`;
                                                } else {
                                                  const min = config.min !== '' && config.min !== null && config.min !== undefined ? config.min : '∞';
                                                  const max = config.max !== '' && config.max !== null && config.max !== undefined ? config.max : '∞';
                                                  return `${label}: <span class="text-blue-700 font-semibold">${min} - ${max}</span>`;
                                                }
                                              });
                                              allFilters.push(...techFilters);

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
                        </div>
                      )}
                    </div>

                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between">
                      <button
                        type="button"
                        onClick={() => setCurrentStep(1)}
                        className="bg-white text-gray-700 px-6 py-2.5 rounded-lg border-2 border-gray-300 hover:bg-gray-50 transition-all font-medium flex items-center gap-2"
                      >
                        <ChevronRight className="w-4 h-4 rotate-180" />
                        Back
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentStep(3)}
                        disabled={selectedCategories.has('SELECT')}
                        className="bg-purple-600 text-white px-6 py-2.5 rounded-lg hover:bg-purple-700 transition-all font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next: Review
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 3: Review & Create */}
                {currentStep === 3 && (
                  <div className="bg-white rounded-xl shadow-lg border border-gray-200">
                    <div className="border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center text-white">
                          <CheckCircle2 className="w-6 h-6" />
                        </div>
                          <div>
                            <h2 className="text-lg font-semibold text-gray-900">Review Your Report</h2>
                            <p className="text-xs text-gray-600">Check everything before creating</p>
                          </div>
                      </div>
                    </div>

                    <div className="p-6 space-y-6">
                      {/* Report Summary */}
                      <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-200">
                        <h3 className="text-sm font-semibold text-gray-900 mb-3">Report Summary</h3>
                        <div className="space-y-2 text-sm">
                          <div>
                            <strong>Title:</strong> {formData.title || 'Untitled Report'}
                          </div>
                          {formData.description && (
                            <div>
                              <strong>Description:</strong> {formData.description}
                            </div>
                          )}
                          <div>
                            <strong>Status:</strong> {formData.is_active ? 'Active' : 'Inactive'}
                          </div>
                        </div>
                      </div>

                      {/* Active Filters Summary */}
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                        <h3 className="text-sm font-semibold text-gray-900 mb-3">Active Filters ({activeFiltersCount})</h3>
                        <div className="space-y-3 text-sm">
                          {/* Categories */}
                          {!selectedCategories.has('ALL') && !selectedCategories.has('SELECT') && (
                            <div>
                              <span className="text-xs text-gray-600">Categories ({selectedCategories.size}):</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {Array.from(selectedCategories).map(categoryValue => {
                                  const category = CATEGORIES.find(cat => cat.value === categoryValue);
                                  return (
                                    <span key={categoryValue} className="text-xs px-2 py-1 bg-white border border-blue-300 text-blue-800 rounded-full">
                                      {category?.label || categoryValue}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Countries */}
                          {countryFilters.length > 0 && (
                            <div>
                              <span className="text-xs text-gray-600">Countries ({countryFilters.length}):</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {countryFilters.map(country => (
                                  <span key={country} className="text-xs px-2 py-1 bg-white border border-purple-300 text-purple-800 rounded-full">
                                    {country}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Filter Groups */}
                          {filterGroups.length > 0 && (
                            <div>
                              <span className="text-xs text-gray-600">
                                Material Filters ({filterGroups.length} group{filterGroups.length !== 1 ? 's' : ''}):
                              </span>
                              <div className="mt-2 space-y-2">
                                {filterGroups.map((group) => {
                                  const booleanCount = Object.keys(group.filters || {}).length;
                                  const technicalCount = Object.keys(group.technicalFilters || {}).length;
                                  if (booleanCount === 0 && technicalCount === 0) return null;

                                  return (
                                    <div key={group.id} className="bg-white rounded-lg p-2 border border-indigo-200">
                                      <div className="text-xs font-semibold text-indigo-700 mb-1">{group.name}</div>
                                      <div className="flex flex-wrap gap-1">
                                        {/* Boolean Filters */}
                                        {Object.entries(group.filters || {}).map(([field, value]) => {
                                          const option = availableFilters.find(opt => opt.field === field);
                                          const label = option?.label || field.replace(/_/g, ' ');
                                          const colorClass = value ? 'border-green-300 text-green-800 bg-green-50' : 'border-red-300 text-red-800 bg-red-50';
                                          const action = value ? 'Include' : 'Exclude';

                                          return (
                                            <span key={field} className={`text-xs px-2 py-1 border rounded-full ${colorClass}`}>
                                              {label}: {action}
                                            </span>
                                          );
                                        })}

                                        {/* Technical Filters - NEW */}
                                        {Object.entries(group.technicalFilters || {}).map(([field, config]) => {
                                          const option = technicalFilterOptions.find(opt => opt.field === field);
                                          const label = option?.label || field.replace(/_/g, ' ');

                                          let displayText = '';
                                          if (config.mode === 'equals') {
                                            displayText = `${label} = ${config.equals}`;
                                          } else {
                                            const min = config.min !== '' && config.min !== null && config.min !== undefined ? config.min : '∞';
                                            const max = config.max !== '' && config.max !== null && config.max !== undefined ? config.max : '∞';
                                            displayText = `${label}: ${min} - ${max}`;
                                          }

                                          return (
                                            <span key={field} className="text-xs px-2 py-1 border rounded-full border-blue-300 text-blue-800 bg-blue-50">
                                              📊 {displayText}
                                            </span>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                              <p className="text-xs text-gray-600 mt-2 italic">
                                Logic: {formatFilterGroups(filterGroups, availableFilters, technicalFilterOptions)}
                              </p>
                            </div>
                          )}

                          {activeFiltersCount === 0 && (
                            <p className="text-sm text-gray-500 italic">No filters applied - all records will be included</p>
                          )}
                        </div>
                      </div>

                      {/* Expected Results */}
                      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg p-4 border border-indigo-200">
                        <h3 className="text-sm font-semibold text-gray-900 mb-2">Expected Results</h3>
                        <div className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-600">
                          {liveStats.total_records.toLocaleString()} records
                        </div>
                        <p className="text-xs text-gray-600 mt-1">will be included in this report</p>
                      </div>
                    </div>

                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between">
                      <button
                        type="button"
                        onClick={() => setCurrentStep(2)}
                        className="bg-white text-gray-700 px-6 py-2.5 rounded-lg border-2 border-gray-300 hover:bg-gray-50 transition-all font-medium flex items-center gap-2"
                      >
                        <ChevronRight className="w-4 h-4 rotate-180" />
                        Back to Filters
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-8 py-2.5 rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all font-medium shadow-md flex items-center gap-2 disabled:opacity-50"
                      >
                        {loading ? (
                          <>
                            <LoadingSpinner />
                            {isEditMode ? 'Updating...' : 'Creating...'}
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-5 h-5" />
                            {isEditMode ? 'Update Report' : 'Create Report'}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Sidebar - Live Preview */}
              <div className="space-y-6">
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden sticky top-4">
                  <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-4 text-white">
                    <h3 className="font-semibold flex items-center gap-2">
                      <BarChart3 className="w-5 h-5" />
                      Live Preview
                    </h3>
                  </div>
                  <div className="p-5">
                    {statsLoading ? (
                      <div className="flex justify-center py-8">
                        <LoadingSpinner />
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-5 rounded-xl border border-blue-200">
                          <div className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                            {liveStats.total_records.toLocaleString()}
                          </div>
                          <div className="text-sm font-medium text-gray-600 mt-1">Total Records</div>
                        </div>

                        {liveStats.field_breakdown?.categories && liveStats.field_breakdown.categories.length > 0 && (
                          <div className="bg-gray-50 rounded-lg p-4">
                            <h4 className="text-xs font-semibold text-gray-700 mb-3 uppercase tracking-wide">By Category</h4>
                            <div className="space-y-2">
                              {liveStats.field_breakdown.categories.slice(0, 5).map((cat, index) => (
                                <div key={cat.category || `category-${index}`} className="flex justify-between items-center text-sm">
                                  <span className="text-gray-600">{cat.category || 'Unknown'}</span>
                                  <span className="font-semibold text-gray-900">{cat.count || 0}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {liveStats.field_breakdown?.countries && liveStats.field_breakdown.countries.length > 0 && (
                          <div className="bg-gray-50 rounded-lg p-4">
                            <h4 className="text-xs font-semibold text-gray-700 mb-3 uppercase tracking-wide">Top Countries</h4>
                            <div className="space-y-2">
                              {liveStats.field_breakdown.countries.slice(0, 5).map((country, index) => (
                                <div key={country.country || `country-${index}`} className="flex justify-between items-center text-sm">
                                  <span className="text-gray-600">{country.name}</span>
                                  <span className="font-semibold text-gray-900">{country.count || 0}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="p-5 border-t border-gray-200 bg-gray-50 space-y-3">
                    <button
                      type="submit"
                      disabled={loading || currentStep !== 3}
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-3 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <>
                          <LoadingSpinner />
                          {isEditMode ? 'Updating...' : 'Creating...'}
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-5 h-5" />
                          {isEditMode ? 'Update Report' : 'Create Report'}
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate('/custom-reports')}
                      className="w-full bg-white text-gray-700 px-5 py-3 rounded-lg border-2 border-gray-300 hover:bg-gray-50 transition-all font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CreateReportPage;