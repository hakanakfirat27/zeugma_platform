// frontend/src/pages/CreateReportPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import DashboardLayout from '../components/layout/DashboardLayout';
import LoadingSpinner from '../components/LoadingSpinner';
import api from '../utils/api';
import { CATEGORIES } from '../constants/categories';
import { ArrowLeft, X, Search, ChevronRight, CheckCircle2, Filter, BarChart3, Globe, Layers } from 'lucide-react';

const CreateReportPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  const navigationState = location.state || {};
  const preloadedFilters = navigationState.filterCriteria || {};
  const preloadedRecordCount = navigationState.recordCount || 0;
  const preloadedCategory = navigationState.selectedCategory || 'SELECT';

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    is_active: true,
    is_featured: false,
    filter_criteria: {}
  });

  const [availableFilters, setAvailableFilters] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(preloadedCategory);
  const [selectedFilters, setSelectedFilters] = useState({});
  const [selectedCountries, setSelectedCountries] = useState([]);
  const [availableCountries, setAvailableCountries] = useState([]);
  const [countrySearch, setCountrySearch] = useState('');
  const [materialSearch, setMaterialSearch] = useState('');
  const [liveStats, setLiveStats] = useState({
    total_records: preloadedRecordCount,
    field_breakdown: null
  });
  const [statsLoading, setStatsLoading] = useState(false);

  useEffect(() => {
    if (selectedCategory === 'SELECT') {
      setLiveStats({ total_records: 0, field_breakdown: null });
      return;
    }
    const timer = setTimeout(() => {
      fetchLiveStats();
    }, 500);
    return () => clearTimeout(timer);
  }, [selectedCategory, selectedFilters, selectedCountries]);

useEffect(() => {
  if (Object.keys(preloadedFilters).length > 0) {
    console.log('📦 Preloaded Filters:', preloadedFilters);

    // Set category
    if (preloadedFilters.category) {
      setSelectedCategory(preloadedFilters.category);
    } else {
      // If no category specified, it means "All Categories"
      setSelectedCategory('');
    }

    // Set country filters
    if (preloadedFilters.country && Array.isArray(preloadedFilters.country)) {
      setSelectedCountries(preloadedFilters.country);
    }

    // Set material/property filters (BOTH true AND false values)
    const materialFilters = {};
    Object.keys(preloadedFilters).forEach(key => {
      if (key !== 'category' && key !== 'country') {
        // Include both true (include) and false (exclude) filters
        if (preloadedFilters[key] === true || preloadedFilters[key] === false) {
          materialFilters[key] = preloadedFilters[key];
        }
      }
    });

    console.log('🎯 Material Filters:', materialFilters);
    setSelectedFilters(materialFilters);

    // Generate title
    const categoryName = preloadedFilters.category
      ? CATEGORIES.find(c => c.value === preloadedFilters.category)?.label
      : 'All Categories';

    const countryText = preloadedFilters.country?.length > 0
      ? ` in ${preloadedFilters.country.slice(0, 2).join(', ')}${preloadedFilters.country.length > 2 ? ` +${preloadedFilters.country.length - 2} more` : ''}`
      : '';

    const filterCount = Object.keys(materialFilters).length;
    const filterText = filterCount > 0 ? ` with ${filterCount} filters` : '';

    setFormData(prev => ({
      ...prev,
      title: `${categoryName}${countryText}${filterText}`,
      description: `Custom report with ${preloadedRecordCount} companies`
    }));
  }
}, []); // Run only once on mount

  useEffect(() => {
    fetchAvailableCountries();
  }, []);

  // ===== FIX 1: Allow fetching filters for "All Categories" (empty string) =====
  useEffect(() => {
    if (selectedCategory !== 'SELECT') {
      fetchFilterOptions();
    }
  }, [selectedCategory]);

  const fetchAvailableCountries = async () => {
    try {
      const response = await api.get('/api/database-stats/');
      setAvailableCountries(response.data.all_countries || []);
    } catch (error) {
      console.error('Error fetching countries:', error);
    }
  };

  const fetchFilterOptions = async () => {
    try {
      // ===== FIX 2: Send empty string for "All Categories" =====
      const categoryParam = selectedCategory === '' ? 'ALL' : selectedCategory;
      const response = await api.get('/api/filter-options/', {
        params: { category: categoryParam }
      });
      setAvailableFilters(response.data || []);
    } catch (error) {
      console.error('Error fetching filter options:', error);
    }
  };

  const fetchLiveStats = async () => {
    setStatsLoading(true);
    try {
      const criteria = buildFilterCriteria();
      const response = await api.post('/api/report-preview/', {
        filter_criteria: criteria
      });
      setLiveStats({
        total_records: response.data.total_records,
        field_breakdown: response.data.field_breakdown
      });
    } catch (error) {
      console.error('Error fetching live stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // ===== FIX 3: New function for radio button filters (Any/Include/Exclude) =====
  const handleFilterChange = (filterField, value) => {
    setSelectedFilters(prev => {
      const newFilters = { ...prev };

      if (value === undefined || value === null) {
        // "Any" selected - remove the filter
        delete newFilters[filterField];
      } else {
        // "Include" (true) or "Exclude" (false) selected
        newFilters[filterField] = value;
      }

      return newFilters;
    });
  };

  const handleCountryToggle = (country) => {
    setSelectedCountries(prev => {
      if (prev.includes(country)) {
        return prev.filter(c => c !== country);
      } else {
        return [...prev, country];
      }
    });
  };

  const removeFilter = (filterField) => {
    setSelectedFilters(prev => {
      const newFilters = { ...prev };
      delete newFilters[filterField];
      return newFilters;
    });
  };

  const removeCountry = (country) => {
    setSelectedCountries(prev => prev.filter(c => c !== country));
  };

const buildFilterCriteria = () => {
  const criteria = {};

  // Handle category
  if (selectedCategory && selectedCategory !== 'SELECT') {
    // If empty string, don't add category field (means ALL categories)
    if (selectedCategory !== '') {
      criteria.category = selectedCategory;
    }
  }

  // Add material filters (both true AND false)
  Object.keys(selectedFilters).forEach(field => {
    // Only add if it's actually true or false (not undefined)
    if (selectedFilters[field] === true || selectedFilters[field] === false) {
      criteria[field] = selectedFilters[field];
    }
  });

  // Add country filters
  if (selectedCountries.length > 0) {
    criteria.country = selectedCountries;
  }

  console.log('📋 Building Filter Criteria:', criteria);

  return criteria;
};

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (currentStep !== 3) return;
    if (!formData.title.trim()) {
      alert('Please enter a report title');
      return;
    }
    if (!formData.description.trim()) {
      alert('Please enter a report description');
      return;
    }
    try {
      setLoading(true);
      const criteria = buildFilterCriteria();

      console.log('📤 Submitting report with criteria:', criteria);

      const submitData = {
        ...formData,
        filter_criteria: criteria
      };

      console.log('📤 Full submit data:', submitData);

      await api.post('/api/custom-reports/', submitData);
      alert('Report created successfully!');
      navigate(`/custom-reports`);
    } catch (error) {
      console.error('Error creating report:', error);
      alert('Failed to create report');
    } finally {
      setLoading(false);
    }
  };

  const filteredCountries = availableCountries.filter(country =>
    country.toLowerCase().includes(countrySearch.toLowerCase())
  );

  const filteredMaterials = availableFilters.filter(filter =>
    filter.label.toLowerCase().includes(materialSearch.toLowerCase())
  );

  const activeFiltersCount = Object.keys(selectedFilters).length + selectedCountries.length;

  const steps = [
    { number: 1, title: 'Basic Info', icon: <BarChart3 className="w-5 h-5" /> },
    { number: 2, title: 'Filters', icon: <Filter className="w-5 h-5" /> },
    { number: 3, title: 'Review', icon: <CheckCircle2 className="w-5 h-5" /> }
  ];

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white px-8 py-8 shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => navigate('/custom-reports')} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold">Create Custom Report</h1>
        </div>
        <p className="text-indigo-100 text-sm ml-12">Define filters to create a custom database report</p>

        {Object.keys(preloadedFilters).length > 0 && (
          <div className="mt-4 ml-12 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-white mt-0.5" />
              <div>
                <p className="text-sm font-medium text-white">Filters imported from Superdatabase</p>
                <p className="text-sm text-indigo-100 mt-1">{preloadedRecordCount} records found with your selected filters.</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-7xl mx-auto px-8 py-8">
          {/* Progress Steps */}
          <div className="mb-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => (
                <React.Fragment key={step.number}>
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                      currentStep >= step.number
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                        : 'bg-gray-200 text-gray-500'
                    }`}>
                      {step.icon}
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Step {step.number}</div>
                      <div className={`text-sm font-medium ${currentStep >= step.number ? 'text-gray-900' : 'text-gray-500'}`}>
                        {step.title}
                      </div>
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div className="flex-1 mx-4">
                      <div className={`h-1 rounded-full transition-all ${
                        currentStep > step.number ? 'bg-gradient-to-r from-indigo-600 to-purple-600' : 'bg-gray-200'
                      }`} />
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-6">
                {/* Step 1: Basic Information */}
                {currentStep === 1 && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center text-white">
                          <BarChart3 className="w-5 h-5" />
                        </div>
                        <div>
                          <h2 className="text-lg font-semibold text-gray-900">Report Information</h2>
                          <p className="text-sm text-gray-600">Basic details about your custom report</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-6 space-y-5">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Report Title *
                        </label>
                        <input
                          type="text"
                          name="title"
                          value={formData.title}
                          onChange={handleInputChange}
                          required
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                          placeholder="e.g., European PVC Manufacturers"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Description *
                        </label>
                        <textarea
                          name="description"
                          value={formData.description}
                          onChange={handleInputChange}
                          required
                          rows={4}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                          placeholder="Describe what this report contains..."
                        />
                      </div>

                      <div className="flex gap-4 pt-2">
                        <label className="flex items-center gap-3 cursor-pointer group">
                          <div className="relative">
                            <input
                              type="checkbox"
                              name="is_active"
                              checked={formData.is_active}
                              onChange={handleInputChange}
                              className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">Active Report</span>
                        </label>

                        <label className="flex items-center gap-3 cursor-pointer group">
                          <div className="relative">
                            <input
                              type="checkbox"
                              name="is_featured"
                              checked={formData.is_featured}
                              onChange={handleInputChange}
                              className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">Featured</span>
                        </label>
                      </div>
                    </div>

                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          if (!formData.title.trim()) {
                            alert('Please enter a report title');
                            return;
                          }
                          if (!formData.description.trim()) {
                            alert('Please enter a report description');
                            return;
                          }
                          setCurrentStep(2);
                        }}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-2.5 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all font-medium shadow-md flex items-center gap-2"
                      >
                        Next: Filters
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 2: Filters */}
                {currentStep === 2 && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-6 py-4 border-b border-gray-200">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg flex items-center justify-center text-white">
                          <Filter className="w-5 h-5" />
                        </div>
                        <div>
                          <h2 className="text-lg font-semibold text-gray-900">Filter Criteria</h2>
                          <p className="text-sm text-gray-600">Define which records to include</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-6 space-y-6">
                      <div>
                        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                          <Layers className="w-4 h-4 text-indigo-600" />
                          Category
                        </label>
                        <select
                          value={selectedCategory}
                          onChange={(e) => setSelectedCategory(e.target.value)}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all bg-white"
                        >
                          <option value="SELECT" disabled>Select Category</option>
                          <option value="">All Categories</option>
                          {CATEGORIES
                            .filter(cat => cat.label !== 'All Categories')
                            .map((category) => (
                              <option key={category.value} value={category.value}>{category.label}</option>
                          ))}
                        </select>
                      </div>

                      {/* Active Filters */}
                      {activeFiltersCount > 0 && (
                        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-semibold text-gray-900">
                              Active Filters ({activeFiltersCount})
                            </span>
                            <button
                              type="button"
                              onClick={() => { setSelectedFilters({}); setSelectedCountries([]); }}
                              className="text-xs font-medium text-indigo-600 hover:text-indigo-800 underline"
                            >
                              Clear all
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {selectedCountries.map(country => (
                              <span key={country} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-purple-300 text-purple-800 rounded-full text-xs font-medium shadow-sm">
                                <Globe className="w-3 h-3" />
                                {country}
                                <button type="button" onClick={() => removeCountry(country)} className="hover:opacity-70">
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </span>
                            ))}
                            {Object.keys(selectedFilters).map(field => {
                              const option = availableFilters.find(opt => opt.field === field);
                              const value = selectedFilters[field];
                              const colorClass = value === true ? 'border-green-300 text-green-800' : 'border-red-300 text-red-800';
                              const label = value === true ? 'Include' : 'Exclude';

                              return (
                                <span key={field} className={`inline-flex items-center gap-1.5 px-3 py-1.5 bg-white ${colorClass} rounded-full text-xs font-medium shadow-sm border`}>
                                  {option?.label || field.replace(/_/g, ' ')}: {label}
                                  <button type="button" onClick={() => removeFilter(field)} className="hover:opacity-70">
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Countries */}
                      <div>
                        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                          <Globe className="w-4 h-4 text-purple-600" />
                          Countries <span className="text-xs font-normal text-gray-500">({selectedCountries.length} selected)</span>
                        </label>
                        <div className="relative mb-3">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                          <input
                            type="text"
                            value={countrySearch}
                            onChange={(e) => setCountrySearch(e.target.value)}
                            placeholder="Search countries..."
                            className="w-full pl-10 pr-10 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                          />
                          {countrySearch && (
                            <button type="button" onClick={() => setCountrySearch('')} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600">
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <div className="border-2 border-gray-200 rounded-lg p-3 max-h-52 overflow-y-auto bg-gray-50">
                          {filteredCountries.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center py-3">No countries found</p>
                          ) : (
                            <div className="grid grid-cols-2 gap-1.5">
                              {filteredCountries.map((country) => (
                                <label key={country} className="flex items-center gap-2 cursor-pointer hover:bg-white p-2 rounded-lg transition-colors">
                                  <input
                                    type="checkbox"
                                    checked={selectedCountries.includes(country)}
                                    onChange={() => handleCountryToggle(country)}
                                    className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                                  />
                                  <span className="text-sm text-gray-700">{country}</span>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* ===== FIX 5: Show materials for ALL categories including empty string ===== */}
                      {availableFilters.length > 0 && (
                        <div>
                          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                            <Layers className="w-4 h-4 text-green-600" />
                            Materials/Properties <span className="text-xs font-normal text-gray-500">({Object.keys(selectedFilters).length} selected)</span>
                          </label>
                          <div className="relative mb-3">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input
                              type="text"
                              value={materialSearch}
                              onChange={(e) => setMaterialSearch(e.target.value)}
                              placeholder="Search materials..."
                              className="w-full pl-10 pr-10 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                            />
                            {materialSearch && (
                              <button type="button" onClick={() => setMaterialSearch('')} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                          <div className="border-2 border-gray-200 rounded-lg p-3 max-h-96 overflow-y-auto bg-gray-50">
                            {filteredMaterials.length === 0 ? (
                              <p className="text-sm text-gray-500 text-center py-3">No materials found</p>
                            ) : (
                              <div className="space-y-3">
                                {/* ===== FIX 6: Use Radio Buttons with Any/Include/Exclude ===== */}
                                {filteredMaterials.map((filter) => (
                                  <div key={filter.field} className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
                                    <div className="flex items-center justify-between mb-3">
                                      <h4 className="font-semibold text-gray-900 text-sm">{filter.label}</h4>
                                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                        {filter.count}
                                      </span>
                                    </div>

                                    <div className="space-y-2">
                                      <label className="flex items-center gap-2 cursor-pointer group">
                                        <input
                                          type="radio"
                                          name={filter.field}
                                          checked={selectedFilters[filter.field] === undefined}
                                          onChange={() => handleFilterChange(filter.field, undefined)}
                                          className="w-4 h-4 text-gray-400 border-gray-300 focus:ring-indigo-500"
                                        />
                                        <span className="text-sm text-gray-600 group-hover:text-gray-900">Any</span>
                                      </label>

                                      <label className="flex items-center gap-2 cursor-pointer group">
                                        <input
                                          type="radio"
                                          name={filter.field}
                                          checked={selectedFilters[filter.field] === true}
                                          onChange={() => handleFilterChange(filter.field, true)}
                                          className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                                        />
                                        <span className="text-sm text-gray-900 font-medium group-hover:text-indigo-600">Include</span>
                                      </label>

                                      <label className="flex items-center gap-2 cursor-pointer group">
                                        <input
                                          type="radio"
                                          name={filter.field}
                                          checked={selectedFilters[filter.field] === false}
                                          onChange={() => handleFilterChange(filter.field, false)}
                                          className="w-4 h-4 text-red-600 border-gray-300 focus:ring-red-500"
                                        />
                                        <span className="text-sm text-gray-900 font-medium group-hover:text-red-600">Exclude</span>
                                      </label>
                                    </div>
                                  </div>
                                ))}
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
                        Previous
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentStep(3)}
                        className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-2.5 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all font-medium shadow-md flex items-center gap-2"
                      >
                        Next: Review
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 3: Review - SAME AS BEFORE */}
                {currentStep === 3 && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-4 border-b border-gray-200">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg flex items-center justify-center text-white">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div>
                          <h2 className="text-lg font-semibold text-gray-900">Review Your Report</h2>
                          <p className="text-sm text-gray-600">Check everything before creating</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-6 space-y-6">
                      {/* Report Info */}
                      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <BarChart3 className="w-4 h-4 text-blue-600" />
                          Report Information
                        </h3>
                        <div className="space-y-2">
                          <div>
                            <span className="text-xs text-gray-600">Title:</span>
                            <p className="text-sm font-medium text-gray-900">{formData.title || 'Not set'}</p>
                          </div>
                          <div>
                            <span className="text-xs text-gray-600">Description:</span>
                            <p className="text-sm text-gray-700">{formData.description || 'Not set'}</p>
                          </div>
                          <div className="flex gap-4 pt-2">
                            <span className={`text-xs px-2 py-1 rounded-full ${formData.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                              {formData.is_active ? '✓ Active' : 'Inactive'}
                            </span>
                            {formData.is_featured && (
                              <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-800">
                                ⭐ Featured
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Filters Summary */}
                      <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <Filter className="w-4 h-4 text-purple-600" />
                          Filter Criteria
                        </h3>
                        <div className="space-y-3">
                          {selectedCategory !== 'SELECT' && (
                            <div>
                              <span className="text-xs text-gray-600">Category:</span>
                              <p className="text-sm font-medium text-gray-900">
                                {selectedCategory === '' ? 'All Categories' : (CATEGORIES.find(c => c.value === selectedCategory)?.label || 'All Categories')}
                              </p>
                            </div>
                          )}

                          {selectedCountries.length > 0 && (
                            <div>
                              <span className="text-xs text-gray-600">Countries ({selectedCountries.length}):</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {selectedCountries.map(country => (
                                  <span key={country} className="text-xs px-2 py-1 bg-white border border-purple-300 text-purple-800 rounded-full">
                                    {country}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {Object.keys(selectedFilters).length > 0 && (
                            <div>
                              <span className="text-xs text-gray-600">Material Filters ({Object.keys(selectedFilters).length}):</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {Object.keys(selectedFilters).map(field => {
                                  const option = availableFilters.find(opt => opt.field === field);
                                  const value = selectedFilters[field];
                                  const colorClass = value === true ? 'border-green-300 text-green-800 bg-green-50' : 'border-red-300 text-red-800 bg-red-50';
                                  const label = value === true ? 'Include' : 'Exclude';

                                  return (
                                    <span key={field} className={`text-xs px-2 py-1 border rounded-full ${colorClass}`}>
                                      {option?.label || field.replace(/_/g, ' ')}: {label}
                                    </span>
                                  );
                                })}
                              </div>
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
                            Creating...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-5 h-5" />
                            Create Report
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Live Preview */}
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
                              {liveStats.field_breakdown.categories.slice(0, 5).map((cat) => (
                                <div key={cat.category} className="flex justify-between items-center text-sm">
                                  <span className="text-gray-600">{cat.category}</span>
                                  <span className="font-semibold text-gray-900">{cat.count}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {liveStats.field_breakdown?.countries && liveStats.field_breakdown.countries.length > 0 && (
                          <div className="bg-gray-50 rounded-lg p-4">
                            <h4 className="text-xs font-semibold text-gray-700 mb-3 uppercase tracking-wide">Top Countries</h4>
                            <div className="space-y-2">
                              {liveStats.field_breakdown.countries.slice(0, 5).map((country) => (
                                <div key={country.country} className="flex justify-between items-center text-sm">
                                  <span className="text-gray-600">{country.country}</span>
                                  <span className="font-semibold text-gray-900">{country.count}</span>
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
                          Creating...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-5 h-5" />
                          Create Report
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