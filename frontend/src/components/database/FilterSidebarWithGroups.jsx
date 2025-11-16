import { useState, useMemo, useEffect } from 'react';
import { X, Search, Plus, Trash2, Copy, ChevronDown, ChevronUp } from 'lucide-react';
import { CATEGORIES } from '../../constants/categories';

const FilterSidebarWithGroups = ({
  isOpen,
  onClose,
  filterGroups = [],
  filterOptions,
  technicalFilterOptions = [],
  countryFilters = [],
  onCountryFilterChange,
  allCountries = [],
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

  // Accordion state - only one section can be open at a time
  const [openSection, setOpenSection] = useState('categories');

  // Get active group - MUST be defined before using it in useMemo
  const activeGroup = groups.find(g => g.id === activeGroupId) || groups[0];

  // Live filter based on search query AND exclude already selected filters
  const filteredOptions = useMemo(() => {
    const activeFilters = activeGroup?.filters || {};

    // Filter out already selected filters (where value is true or false, not undefined)
    const availableOptions = filterOptions.filter(option =>
      activeFilters[option.field] === undefined
    );

    if (!searchQuery) return availableOptions;

    const query = searchQuery.toLowerCase();
    return availableOptions.filter(option =>
      option.label.toLowerCase().includes(query) ||
      option.field.toLowerCase().includes(query)
    );
  }, [filterOptions, searchQuery, activeGroup]);

  // Filter technical options based on search
  const filteredTechnicalOptions = useMemo(() => {
    if (!technicalSearchQuery) return technicalFilterOptions;
    const query = technicalSearchQuery.toLowerCase();
    return technicalFilterOptions.filter(option =>
      option.label.toLowerCase().includes(query) ||
      option.field.toLowerCase().includes(query)
    );
  }, [technicalFilterOptions, technicalSearchQuery]);

  // Filter countries based on search
  const filteredCountries = useMemo(() => {
    if (!countrySearch) return allCountries;
    return allCountries.filter(country =>
      country.toLowerCase().includes(countrySearch.toLowerCase())
    );
  }, [allCountries, countrySearch]);

  // Filter categories based on search - NOW INCLUDING "All Categories"
    const filteredCategories = useMemo(() => {
      const categoriesWithAll = ['All Categories', ...availableCategories];
      if (!categorySearchQuery) return categoriesWithAll;

      const query = categorySearchQuery.toLowerCase();
      return categoriesWithAll.filter(cat => {
        if (cat === 'All Categories') return cat.toLowerCase().includes(query);

        // ✅ IMPROVED: Search both value and label
        const categoryData = CATEGORIES.find(c => c.value === cat);
        const label = categoryData?.label || cat;
        return cat.toLowerCase().includes(query) || label.toLowerCase().includes(query);
      });
    }, [availableCategories, categorySearchQuery]);

  // Add a new filter group
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

  // Delete a filter group
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

  // Duplicate a filter group
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

  // Rename a filter group
  const renameGroup = (groupId, newName) => {
    setGroups(groups.map(g =>
      g.id === groupId ? { ...g, name: newName } : g
    ));
  };

  // Update a filter in a specific group
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

  // Update a technical filter in a specific group
  const updateGroupTechnicalFilter = (groupId, field, mode, value, minValue, maxValue) => {
    setGroups(groups.map(g => {
      if (g.id !== groupId) return g;

      const newTechnicalFilters = { ...g.technicalFilters };
      const currentFilter = newTechnicalFilters[field];

      // When switching modes, try to preserve existing values
      if (mode === 'equals') {
        const equalsValue = value !== undefined ? value : (currentFilter?.min || '');

        newTechnicalFilters[field] = {
          mode: 'equals',
          equals: equalsValue,
          min: undefined,
          max: undefined
        };
      } else if (mode === 'range') {
        const min = minValue !== undefined ? minValue : (currentFilter?.equals || '');
        const max = maxValue !== undefined ? maxValue : (currentFilter?.equals || '');

        newTechnicalFilters[field] = {
          mode: 'range',
          equals: undefined,
          min: min,
          max: max
        };
      }

      // Only remove the filter if explicitly requested
      if (value === '' && minValue === '' && maxValue === '' &&
          !currentFilter?.mode && mode === 'range') {
        delete newTechnicalFilters[field];
      }

      return { ...g, technicalFilters: newTechnicalFilters };
    }));
  };

  // Clear all filters in a specific group
  const clearGroupFilters = (groupId) => {
    setGroups(groups.map(g => {
      if (g.id !== groupId) return g;
      return { ...g, filters: {}, technicalFilters: {} };
    }));
  };

  // Toggle country filter
  const toggleCountry = (country) => {
    let newCountryFilters;
    if (countryFilters.includes(country)) {
      newCountryFilters = countryFilters.filter(c => c !== country);
    } else {
      newCountryFilters = [...countryFilters, country];
    }
    onCountryFilterChange(newCountryFilters);
  };

  // NEW: Toggle category filter with "All Categories" logic
  const toggleCategory = (category) => {
    if (category === 'All Categories') {
      // If All Categories is clicked, clear all other selections
      onCategoryFilterChange([]);
    } else {
      let newCategoryFilters;
      if (categoryFilters.includes(category)) {
        newCategoryFilters = categoryFilters.filter(c => c !== category);
      } else {
        newCategoryFilters = [...categoryFilters, category];
      }
      onCategoryFilterChange(newCategoryFilters);
    }
  };

  // Apply all filters
  const handleApplyFilters = () => {
    // Convert groups to the format expected by the backend
    const cleanedGroups = groups.map(g => ({
      id: g.id,
      name: g.name,
      filters: g.filters,
      technicalFilters: Object.fromEntries(
        Object.entries(g.technicalFilters || {}).filter(([field, filter]) => {
          if (filter.mode === 'equals') {
            return filter.equals !== '' && filter.equals !== undefined;
          } else {
            return (filter.min !== '' && filter.min !== undefined) ||
                   (filter.max !== '' && filter.max !== undefined);
          }
        })
      )
    })).filter(g => Object.keys(g.filters).length > 0 || Object.keys(g.technicalFilters).length > 0);

    onApply(cleanedGroups);
    onClose();
  };

  // Clear all filters
  const handleClearAll = () => {
    setGroups([{
      id: Date.now().toString(),
      name: 'Filter Group 1',
      filters: {},
      technicalFilters: {}
    }]);
    setSearchQuery('');
    setCountrySearch('');
    setCategorySearchQuery('');
    setTechnicalSearchQuery('');
    onReset();
  };

  // Count active filters across all groups (only count filters with actual values)
  const totalActiveFilters = groups.reduce((sum, group) => {
    const booleanFilters = Object.keys(group.filters).filter(key => group.filters[key] !== undefined).length;
    const techFilters = Object.entries(group.technicalFilters || {}).filter(([field, filter]) => {
      if (filter.mode === 'equals') {
        return filter.equals !== '' && filter.equals !== undefined;
      } else {
        return (filter.min !== '' && filter.min !== undefined) ||
               (filter.max !== '' && filter.max !== undefined);
      }
    }).length;
    return sum + booleanFilters + techFilters;
  }, 0) + countryFilters.length + categoryFilters.length;

  // Real-time updates: Apply filters whenever groups change
  useEffect(() => {
    const cleanedGroups = groups.map(g => ({
      id: g.id,
      name: g.name,
      filters: g.filters,
      technicalFilters: Object.fromEntries(
        Object.entries(g.technicalFilters || {}).filter(([field, filter]) => {
          if (filter.mode === 'equals') {
            return filter.equals !== '' && filter.equals !== undefined;
          } else {
            return (filter.min !== '' && filter.min !== undefined) ||
                   (filter.max !== '' && filter.max !== undefined);
          }
        })
      )
    })).filter(g => Object.keys(g.filters).length > 0 || Object.keys(g.technicalFilters).length > 0);

    onApply(cleanedGroups);
  }, [groups]);

  if (!isOpen) return null;

  // Accordion toggle function
  const toggleSection = (section) => {
    setOpenSection(openSection === section ? null : section);
  };

  // Helper function to format technical filter display
  const formatTechnicalFilterDisplay = (filter) => {
    if (filter.mode === 'equals') {
      return filter.equals !== '' && filter.equals !== undefined ? `= ${filter.equals}` : '= (empty)';
    } else {
      const min = filter.min || '∞';
      const max = filter.max || '∞';
      return `${min} - ${max}`;
    }
  };

  // Check if "All Categories" is selected (no category filters = all)
  const isAllCategoriesSelected = categoryFilters.length === 0;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />

      {/* Sidebar */}
      <div className="fixed right-0 top-0 h-full w-full md:w-[700px] bg-white shadow-2xl z-50 flex flex-col animate-slide-in">
        {/* Header */}
        <div className="border-b p-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Advanced Filters</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {totalActiveFilters > 0 && (
            <div className="bg-white/20 rounded-lg px-4 py-2 backdrop-blur-sm">
              <p className="text-sm font-medium">
                {totalActiveFilters} active filter{totalActiveFilters !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>

        {/* Filter Groups Management */}
        <div className="border-b p-4 bg-gray-50 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Filter Groups</h3>
            <button
              onClick={addGroup}
              className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              Add Group
            </button>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2">
            {groups.map((group) => (
              <div
                key={group.id}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all flex-shrink-0 ${
                  activeGroupId === group.id
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <input
                  type="text"
                  value={group.name}
                  onChange={(e) => renameGroup(group.id, e.target.value)}
                  onClick={() => setActiveGroupId(group.id)}
                  className="bg-transparent border-none outline-none text-sm font-medium min-w-0 w-32 cursor-pointer"
                />
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => duplicateGroup(group.id)}
                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                    title="Duplicate group"
                  >
                    <Copy className="w-3.5 h-3.5 text-gray-600" />
                  </button>
                  {groups.length > 1 && (
                    <button
                      onClick={() => deleteGroup(group.id)}
                      className="p-1 hover:bg-red-100 rounded transition-colors"
                      title="Delete group"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-600" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* UPDATED: Active filters display - NOW INCLUDING Categories and Countries */}
          {(categoryFilters.length > 0 || countryFilters.length > 0 ||
            Object.keys(activeGroup?.filters || {}).length > 0 ||
            Object.keys(activeGroup?.technicalFilters || {}).length > 0) && (
            <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-700">Active Filters:</span>
                <button
                  onClick={() => {
                    clearGroupFilters(activeGroupId);
                    onCategoryFilterChange([]);
                    onCountryFilterChange([]);
                  }}
                  className="text-xs text-red-600 hover:text-red-700 font-medium"
                >
                  Clear All
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {/* Category Filter Tags */}
                {categoryFilters.map((category) => (
                  <span
                    key={category}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-purple-100 text-purple-800 border border-purple-300"
                  >
                    📁 {category}
                    <button
                      onClick={() => toggleCategory(category)}
                      className="ml-1 hover:bg-black/10 rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}

                {/* Country Filter Tags */}
                {countryFilters.map((country) => (
                  <span
                    key={country}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-teal-100 text-teal-800 border border-teal-300"
                  >
                    🌍 {country}
                    <button
                      onClick={() => toggleCountry(country)}
                      className="ml-1 hover:bg-black/10 rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}

                {/* Boolean Filter Tags */}
                {Object.entries(activeGroup?.filters || {}).map(([field, value]) => {
                  const option = filterOptions.find(opt => opt.field === field);
                  return (
                    <span
                      key={field}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border ${
                        value === true
                          ? 'bg-green-100 text-green-800 border-green-300'
                          : 'bg-red-100 text-red-800 border-red-300'
                      }`}
                    >
                      {option?.label || field}
                      {value === true ? ' ✓' : ' ✗'}
                      <button
                        onClick={() => updateGroupFilter(activeGroupId, field, undefined)}
                        className="ml-1 hover:bg-black/10 rounded-full p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}

                {/* Technical Filter Tags */}
                {Object.entries(activeGroup?.technicalFilters || {}).filter(([field, filter]) => {
                  if (filter.mode === 'equals') {
                    return filter.equals !== '' && filter.equals !== undefined;
                  } else {
                    return (filter.min !== '' && filter.min !== undefined) ||
                           (filter.max !== '' && filter.max !== undefined);
                  }
                }).map(([field, filter]) => {
                  const option = technicalFilterOptions.find(opt => opt.field === field);
                  return (
                    <span
                      key={field}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800 border border-blue-300"
                    >
                      📊 {option?.label || field}: {formatTechnicalFilterDisplay(filter)}
                      <button
                        onClick={() => updateGroupTechnicalFilter(activeGroupId, field, 'range', '', '', '')}
                        className="ml-1 hover:bg-black/10 rounded-full p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Filters Content with Accordion */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Categories Accordion - NOW WITH "All Categories" */}
          <div className="mb-4 border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => toggleSection('categories')}
              className="w-full flex items-center justify-between p-4 bg-blue-50 hover:bg-blue-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-gray-900 text-sm">Categories</h4>
                {categoryFilters.length > 0 && (
                  <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-xs font-medium">
                    {categoryFilters.length} selected
                  </span>
                )}
                {categoryFilters.length === 0 && (
                  <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs font-medium">
                    All
                  </span>
                )}
              </div>
              {openSection === 'categories' ? (
                <ChevronUp className="w-5 h-5 text-gray-600" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-600" />
              )}
            </button>

            {openSection === 'categories' && (
              <div className="p-4 bg-white">
                {availableCategories.length > 8 && (
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      value={categorySearchQuery}
                      onChange={(e) => setCategorySearchQuery(e.target.value)}
                      placeholder="Search categories..."
                      className="w-full pl-9 pr-9 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    {categorySearchQuery && (
                      <button
                        onClick={() => setCategorySearchQuery('')}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}

                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {filteredCategories.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-8">No categories found</p>
                  ) : (
                    filteredCategories.map(category => {
                      const isAllCategories = category === 'All Categories';
                      const isChecked = isAllCategories ? isAllCategoriesSelected : categoryFilters.includes(category);

                      const categoryLabel = isAllCategories
                        ? 'All Categories'
                        : CATEGORIES.find(cat => cat.value === category)?.label || category;

                      return (
                        <label
                          key={category}
                          className={`flex items-center gap-2 cursor-pointer p-2 hover:bg-indigo-50 rounded transition-colors ${
                            isAllCategories ? 'border-b border-gray-200 mb-2 pb-3' : ''
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleCategory(category)}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 flex-shrink-0"
                          />
                          <span className={`text-sm ${isAllCategories ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                            {categoryLabel}
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Countries Accordion */}
          {allCountries.length > 0 && (
            <div className="mb-4 border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleSection('countries')}
                className="w-full flex items-center justify-between p-4 bg-blue-50 hover:bg-blue-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-gray-900 text-sm">Countries</h4>
                  <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs font-medium">
                    {allCountries.length} available
                  </span>
                  {countryFilters.length > 0 && (
                    <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-xs font-medium">
                      {countryFilters.length} selected
                    </span>
                  )}
                </div>
                {openSection === 'countries' ? (
                  <ChevronUp className="w-5 h-5 text-gray-600" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-600" />
                )}
              </button>

              {openSection === 'countries' && (
                <div className="p-4 bg-white">
                  {allCountries.length > 8 && (
                    <div className="relative mb-3">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        value={countrySearch}
                        onChange={(e) => setCountrySearch(e.target.value)}
                        placeholder="Search countries..."
                        className="w-full pl-9 pr-9 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                      {countrySearch && (
                        <button
                          onClick={() => setCountrySearch('')}
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}

                  <div className="space-y-1 max-h-64 overflow-y-auto">
                    {filteredCountries.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-8">No countries found</p>
                    ) : (
                      filteredCountries.map(country => (
                        <label
                          key={country}
                          className="flex items-center gap-2 cursor-pointer p-2 hover:bg-indigo-50 rounded transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={countryFilters.includes(country)}
                            onChange={() => toggleCountry(country)}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 flex-shrink-0"
                          />
                          <span className="text-sm text-gray-700">{country}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Material Filters (Boolean) Accordion */}
          {filterOptions.length > 0 && (
            <div className="mb-4 border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleSection('booleanFilters')}
                className="w-full flex items-center justify-between p-4 bg-blue-50 hover:bg-blue-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-gray-900 text-sm">Material Filters</h4>
                  <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs font-medium">
                    {filterOptions.length} available
                  </span>
                  {Object.keys(activeGroup?.filters || {}).length > 0 && (
                    <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-xs font-medium">
                      {Object.keys(activeGroup.filters).length} selected
                    </span>
                  )}
                </div>
                {openSection === 'booleanFilters' ? (
                  <ChevronUp className="w-5 h-5 text-gray-600" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-600" />
                )}
              </button>

              {openSection === 'booleanFilters' && (
                <div className="p-4 bg-white">
                  {filteredOptions.length > 0 && (
                    <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 mb-4">
                      <p className="text-xs text-indigo-900">
                        <strong>OR Logic:</strong> Select filters to add them to this group. Companies matching ANY filter in this group will be included.
                      </p>
                    </div>
                  )}

                  {filteredOptions.length === 0 && filterOptions.length > 0 && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4 text-center">
                      <p className="text-sm text-green-900 font-medium mb-1">✔ All filters have been selected!</p>
                      <p className="text-xs text-green-700">
                        Remove filters from the tags above to make them available again.
                      </p>
                    </div>
                  )}

                  {/* Search Box */}
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search material ilters..."
                      className="w-full pl-9 pr-9 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Filter List */}
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {filteredOptions.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <p className="text-sm">No filters found</p>
                        {searchQuery && (
                          <button
                            onClick={() => setSearchQuery('')}
                            className="text-xs text-indigo-600 hover:text-indigo-700 mt-2"
                          >
                            Clear search
                          </button>
                        )}
                      </div>
                    ) : (
                      filteredOptions.map(option => {
                        const currentValue = activeGroup?.filters[option.field];
                        const isActive = currentValue !== undefined;

                        return (
                          <div
                            key={option.field}
                            className={`bg-white border rounded-lg p-4 hover:border-gray-300 transition-all ${
                              isActive ? 'border-indigo-400 shadow-sm' : 'border-gray-200'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-semibold text-gray-900 text-sm">{option.label}</h4>
                              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                {option.count}
                              </span>
                            </div>

                            <div className="space-y-2">
                              <label className="flex items-center gap-2 cursor-pointer group">
                                <input
                                  type="radio"
                                  name={`${activeGroupId}-${option.field}`}
                                  checked={currentValue === undefined}
                                  onChange={() => updateGroupFilter(activeGroupId, option.field, undefined)}
                                  className="w-4 h-4 text-gray-400 border-gray-300 focus:ring-indigo-500"
                                />
                                <span className="text-sm text-gray-600 group-hover:text-gray-900">Any</span>
                              </label>

                              <label className="flex items-center gap-2 cursor-pointer group">
                                <input
                                  type="radio"
                                  name={`${activeGroupId}-${option.field}`}
                                  checked={currentValue === true}
                                  onChange={() => updateGroupFilter(activeGroupId, option.field, true)}
                                  className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                                />
                                <span className="text-sm text-gray-900 font-medium group-hover:text-indigo-600">Include</span>
                              </label>

                              <label className="flex items-center gap-2 cursor-pointer group">
                                <input
                                  type="radio"
                                  name={`${activeGroupId}-${option.field}`}
                                  checked={currentValue === false}
                                  onChange={() => updateGroupFilter(activeGroupId, option.field, false)}
                                  className="w-4 h-4 text-red-600 border-gray-300 focus:ring-red-500"
                                />
                                <span className="text-sm text-gray-900 font-medium group-hover:text-red-600">Exclude</span>
                              </label>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Technical Filters Accordion */}
          {technicalFilterOptions.length > 0 && (
            <div className="mb-4 border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleSection('technicalFilters')}
                className="w-full flex items-center justify-between p-4 bg-blue-50 hover:bg-blue-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-gray-900 text-sm">Technical Filters</h4>
                  <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs font-medium">
                    {technicalFilterOptions.length} available
                  </span>
                  {Object.entries(activeGroup?.technicalFilters || {}).filter(([field, filter]) => {
                    if (filter.mode === 'equals') {
                      return filter.equals !== '' && filter.equals !== undefined;
                    } else {
                      return (filter.min !== '' && filter.min !== undefined) ||
                             (filter.max !== '' && filter.max !== undefined);
                    }
                  }).length > 0 && (
                    <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-xs font-medium">
                      {Object.entries(activeGroup.technicalFilters).filter(([field, filter]) => {
                        if (filter.mode === 'equals') {
                          return filter.equals !== '' && filter.equals !== undefined;
                        } else {
                          return (filter.min !== '' && filter.min !== undefined) ||
                                 (filter.max !== '' && filter.max !== undefined);
                        }
                      }).length} selected
                    </span>
                  )}
                </div>
                {openSection === 'technicalFilters' ? (
                  <ChevronUp className="w-5 h-5 text-gray-600" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-600" />
                )}
              </button>

              {openSection === 'technicalFilters' && (
                <div className="p-4 bg-white">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                    <p className="text-xs text-blue-900">
                      <strong>Equals or Range:</strong> Select "Equals" for exact values or "Range" for min/max. Leave blank for no limit.
                    </p>
                  </div>

                  {/* Search Box */}
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      value={technicalSearchQuery}
                      onChange={(e) => setTechnicalSearchQuery(e.target.value)}
                      placeholder="Search technical filters..."
                      className="w-full pl-9 pr-9 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    {technicalSearchQuery && (
                      <button
                        onClick={() => setTechnicalSearchQuery('')}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Technical Filter List */}
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {filteredTechnicalOptions.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <p className="text-sm">No technical filters found</p>
                        {technicalSearchQuery && (
                          <button
                            onClick={() => setTechnicalSearchQuery('')}
                            className="text-xs text-indigo-600 hover:text-indigo-700 mt-2"
                          >
                            Clear search
                          </button>
                        )}
                      </div>
                    ) : (
                      filteredTechnicalOptions.map(option => {
                        const currentFilter = activeGroup?.technicalFilters?.[option.field] || { mode: 'range', equals: '', min: '', max: '' };
                        const mode = currentFilter.mode || 'range';

                        return (
                          <div
                            key={option.field}
                            className="bg-white border rounded-lg p-4 hover:border-gray-300 transition-all border-gray-200"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-semibold text-gray-900 text-sm">{option.label}</h4>
                              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                {option.min !== null && option.max !== null
                                  ? `${option.min} - ${option.max}`
                                  : 'Range'}
                              </span>
                            </div>

                            {/* Mode Toggle */}
                            <div className="flex gap-2 mb-3">
                              <label className="flex items-center gap-2 cursor-pointer group">
                                <input
                                  type="radio"
                                  name={`${activeGroupId}-${option.field}-mode`}
                                  checked={mode === 'equals'}
                                  onChange={() => {
                                    const currentFilter = activeGroup?.technicalFilters?.[option.field];
                                    const initialValue = currentFilter?.min || currentFilter?.equals || '';
                                    updateGroupTechnicalFilter(activeGroupId, option.field, 'equals', initialValue, '', '');
                                  }}
                                  className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                                />
                                <span className="text-sm text-gray-900 font-medium group-hover:text-indigo-600">Equals</span>
                              </label>

                              <label className="flex items-center gap-2 cursor-pointer group">
                                <input
                                  type="radio"
                                  name={`${activeGroupId}-${option.field}-mode`}
                                  checked={mode === 'range'}
                                  onChange={() => {
                                    const currentFilter = activeGroup?.technicalFilters?.[option.field];
                                    const initialMin = currentFilter?.equals || currentFilter?.min || '';
                                    const initialMax = currentFilter?.equals || currentFilter?.max || '';
                                    updateGroupTechnicalFilter(activeGroupId, option.field, 'range', '', initialMin, initialMax);
                                  }}
                                  className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                                />
                                <span className="text-sm text-gray-900 font-medium group-hover:text-indigo-600">Range</span>
                              </label>
                            </div>

                            {/* Input Fields Based on Mode */}
                            {mode === 'equals' ? (
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">Exact Value</label>
                                <input
                                  type="number"
                                  value={currentFilter.equals || ''}
                                  onChange={(e) => updateGroupTechnicalFilter(
                                    activeGroupId,
                                    option.field,
                                    'equals',
                                    e.target.value,
                                    '',
                                    ''
                                  )}
                                  placeholder="Enter exact value"
                                  step={option.type === 'FloatField' ? '0.1' : '1'}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                />
                              </div>
                            ) : (
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-xs text-gray-600 mb-1">Minimum</label>
                                  <input
                                    type="number"
                                    value={currentFilter.min || ''}
                                    onChange={(e) => updateGroupTechnicalFilter(
                                      activeGroupId,
                                      option.field,
                                      'range',
                                      '',
                                      e.target.value,
                                      currentFilter.max
                                    )}
                                    placeholder={option.min !== null ? String(option.min) : "Min"}
                                    step={option.type === 'FloatField' ? '0.1' : '1'}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs text-gray-600 mb-1">Maximum</label>
                                  <input
                                    type="number"
                                    value={currentFilter.max || ''}
                                    onChange={(e) => updateGroupTechnicalFilter(
                                      activeGroupId,
                                      option.field,
                                      'range',
                                      '',
                                      currentFilter.min,
                                      e.target.value
                                    )}
                                    placeholder={option.max !== null ? String(option.max) : "Max"}
                                    step={option.type === 'FloatField' ? '0.1' : '1'}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-4 bg-gray-50 flex-shrink-0">
          {totalActiveFilters > 0 && (
            <div className="mb-3 flex items-center justify-center gap-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg py-2 px-3">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span className="font-medium">Filters are auto-applied in real-time</span>
            </div>
          )}
          <div className="flex items-center gap-3">
            <button
              onClick={handleClearAll}
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-white font-medium transition-colors text-gray-700 text-sm"
            >
              Clear All
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 font-medium transition-colors shadow-sm text-sm"
            >
              Close
            </button>
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

export default FilterSidebarWithGroups;