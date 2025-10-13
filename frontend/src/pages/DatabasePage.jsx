import { useState, useMemo } from 'react';
import { Search, Download, SlidersHorizontal, X, BarChart3, Globe, Package, TrendingUp, Save, Clock, Star, CheckSquare, Square } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useRecords, useFilterOptions } from '../hooks/useDatabase';
import { exportToExcel, exportSelectedRecords } from '../utils/excelExport';
import FilterSidebar from '../components/database/FilterSidebar';
import Pagination from '../components/database/Pagination';

const CATEGORIES = [
  { value: 'ALL', label: 'All Categories' },
  { value: 'INJECTION', label: 'Injection Moulders' },
  { value: 'BLOW', label: 'Blow Moulders' },
  { value: 'SHEET', label: 'Sheet Extruders' },
];

const SAVED_FILTERS = [
  { id: 1, name: 'Automotive PVC', filters: { pvc: true, automotive: true } },
  { id: 2, name: 'Medical Grade', filters: { medical: true } },
  { id: 3, name: 'European Packaging', filters: { packaging: true } },
];

const EnhancedDatabasePage = () => {
  const { user, isGuest, isClient, isStaffAdmin } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({});
  const [countryFilters, setCountryFilters] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showFilters, setShowFilters] = useState(true);
  const [showSaveFilter, setShowSaveFilter] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedRecords, setSelectedRecords] = useState(new Set());

  const { data: recordsData, isLoading: recordsLoading } = useRecords({
    category: selectedCategory,
    search: searchQuery,
    page: currentPage,
    page_size: pageSize,
    countries: countryFilters.join(','),
    ...filters,
  });

  const { data: filterOptions = [], isLoading: filtersLoading } = useFilterOptions(selectedCategory);

  const records = recordsData?.results || [];
  const totalCount = recordsData?.count || 0;
  const displayRecords = isGuest ? records.slice(0, 5) : records;

  // Calculate quick stats
  const stats = useMemo(() => {
    const countries = new Set(records.map(r => r.country));
    const categories = new Set(records.map(r => r.category));

    return {
      total: totalCount,
      countries: countries.size,
      categories: categories.size,
      showing: displayRecords.length,
      allCountries: Array.from(countries).sort()
    };
  }, [records, totalCount, displayRecords.length]);

  const handleExportToExcel = async () => {
    if (isGuest) {
      setShowUpgradeModal(true);
      return;
    }

    try {
      const exportButton = document.querySelector('[data-export-button]');
      if (exportButton) {
        exportButton.disabled = true;
        exportButton.textContent = 'Exporting...';
      }

      let result;

      if (selectedRecords.size > 0) {
        result = await exportSelectedRecords(
          selectedRecords,
          records,
          {
            filename: 'zeugma_selected_export',
            isGuest: isGuest,
            category: selectedCategory,
            filters: filters,
            userEmail: user?.email || user?.username
          }
        );
      } else {
        result = await exportToExcel(
          displayRecords,
          {
            filename: 'zeugma_database_export',
            isGuest: isGuest,
            category: selectedCategory,
            filters: filters,
            userEmail: user?.email || user?.username
          }
        );
      }

      if (result.success) {
        alert(`✅ Success! Exported ${result.recordCount} records to ${result.filename}`);
      }

      if (exportButton) {
        exportButton.disabled = false;
        exportButton.textContent = selectedRecords.size > 0
          ? `Export (${selectedRecords.size})`
          : 'Export All';
      }

    } catch (error) {
      console.error('Export failed:', error);
      alert('❌ Export failed. Please try again.');
    }
  };

  const handleApplySavedFilter = (savedFilter) => {
    setFilters(savedFilter.filters);
    setCurrentPage(1);
  };

  const toggleRecordSelection = (factoryId) => {
    const newSelected = new Set(selectedRecords);
    if (newSelected.has(factoryId)) {
      newSelected.delete(factoryId);
    } else {
      newSelected.add(factoryId);
    }
    setSelectedRecords(newSelected);
  };

  const selectAllRecords = () => {
    if (selectedRecords.size === displayRecords.length) {
      setSelectedRecords(new Set());
    } else {
      setSelectedRecords(new Set(displayRecords.map(r => r.factory_id)));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-30">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Database Explorer</h1>
              <p className="text-sm text-gray-600">
                {isGuest && '🔒 Limited preview - Upgrade for full access'}
                {isClient && '✓ Full access to subscribed databases'}
                {isStaffAdmin && '⚡ Full administrative access'}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
              >
                <SlidersHorizontal className="w-4 h-4" />
                {showFilters ? 'Hide' : 'Show'} Filters
                {(Object.keys(filters).length + countryFilters.length) > 0 && (
                  <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
                    {Object.keys(filters).length + countryFilters.length}
                  </span>
                )}
              </button>

              <button
                onClick={handleExportToExcel}
                data-export-button
                className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                  isGuest
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
                disabled={isGuest}
              >
                <Download className="w-4 h-4" />
                Export {selectedRecords.size > 0 ? `(${selectedRecords.size})` : 'All'}
              </button>

              {isGuest && (
                <button
                  onClick={() => setShowUpgradeModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <Star className="w-4 h-4" />
                  Upgrade Now
                </button>
              )}
            </div>
          </div>

          {/* Quick Stats Cards */}
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 font-medium">Total Records</p>
                  <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
                </div>
                <Package className="w-10 h-10 text-blue-600 opacity-75" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600 font-medium">Countries</p>
                  <p className="text-2xl font-bold text-green-900">{stats.countries}</p>
                </div>
                <Globe className="w-10 h-10 text-green-600 opacity-75" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600 font-medium">Categories</p>
                  <p className="text-2xl font-bold text-purple-900">{stats.categories}</p>
                </div>
                <BarChart3 className="w-10 h-10 text-purple-600 opacity-75" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-600 font-medium">Showing</p>
                  <p className="text-2xl font-bold text-orange-900">{stats.showing}</p>
                </div>
                <TrendingUp className="w-10 h-10 text-orange-600 opacity-75" />
              </div>
            </div>
          </div>

          {/* Category Pills */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
            {CATEGORIES.map(category => (
              <button
                key={category.value}
                onClick={() => {
                  setSelectedCategory(category.value);
                  setCurrentPage(1);
                }}
                className={`px-4 py-2 rounded-lg whitespace-nowrap transition-all ${
                  selectedCategory === category.value
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border'
                }`}
              >
                {category.label}
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by company name, country, or region..."
              className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Saved Filters */}
          {!isGuest && (
            <div className="mt-4 flex items-center gap-2 overflow-x-auto">
              <Clock className="w-4 h-4 text-gray-500 flex-shrink-0" />
              <span className="text-sm text-gray-600 flex-shrink-0">Quick filters:</span>
              {SAVED_FILTERS.map(saved => (
                <button
                  key={saved.id}
                  onClick={() => handleApplySavedFilter(saved)}
                  className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-sm text-gray-700 transition-colors whitespace-nowrap"
                >
                  {saved.name}
                </button>
              ))}
              <button
                onClick={() => setShowSaveFilter(true)}
                className="px-3 py-1 border border-dashed border-gray-300 hover:border-gray-400 rounded-full text-sm text-gray-600 flex items-center gap-1 whitespace-nowrap"
              >
                <Save className="w-3 h-3" />
                Save current
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Filter Sidebar */}
        <FilterSidebar
          isOpen={showFilters}
          onClose={() => setShowFilters(false)}
          filters={filters}
          onFilterChange={setFilters}
          filterOptions={filterOptions}
          countryFilters={countryFilters}
          onCountryFilterChange={setCountryFilters}
          allCountries={stats.allCountries || []}
          onApply={(newFilters) => {
            setFilters(newFilters);
            setCurrentPage(1);
          }}
          onReset={() => {
            setFilters({});
            setCountryFilters([]);
            setCurrentPage(1);
          }}
        />

        {/* Data Table Area */}
        <div className="flex-1 flex flex-col bg-white overflow-hidden">
          {/* Selection Bar */}
          {selectedRecords.size > 0 && !isGuest && (
            <div className="bg-blue-50 border-b border-blue-200 px-6 py-3 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-blue-900">
                  {selectedRecords.size} record{selectedRecords.size !== 1 ? 's' : ''} selected
                </span>
                <button
                  onClick={() => setSelectedRecords(new Set())}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Clear selection
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportToExcel}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export Selected
                </button>
              </div>
            </div>
          )}

          {/* Guest Warning */}
          {isGuest && records.length > 5 && (
            <div className="bg-yellow-50 border-b border-yellow-200 px-6 py-3">
              <p className="text-sm text-yellow-800">
                <strong>Limited Preview:</strong> Showing 5 of {totalCount} results.
                <button
                  onClick={() => setShowUpgradeModal(true)}
                  className="ml-2 text-blue-600 hover:text-blue-700 font-medium underline"
                >
                  Upgrade to view all →
                </button>
              </p>
            </div>
          )}

          {/* Table */}
          <div className="flex-1 overflow-auto">
            {recordsLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading records...</p>
                </div>
              </div>
            ) : displayRecords.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <Search className="w-16 h-16 mb-4 text-gray-300" />
                <h3 className="text-lg font-medium mb-2">No results found</h3>
                <p className="text-sm">Try adjusting your filters or search query</p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    {!isGuest && (
                      <th className="px-6 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={selectedRecords.size === displayRecords.length && displayRecords.length > 0}
                          onChange={selectAllRecords}
                          className="rounded border-gray-300"
                        />
                      </th>
                    )}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Country</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Updated</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {displayRecords.map(record => (
                    <tr
                      key={record.factory_id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => !isGuest && setSelectedRecord(record.factory_id)}
                    >
                      {!isGuest && (
                        <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedRecords.has(record.factory_id)}
                            onChange={() => toggleRecordSelection(record.factory_id)}
                            className="rounded border-gray-300"
                          />
                        </td>
                      )}
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">
                          {isGuest ? '████████' : record.company_name}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                          {record.get_category_display}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-700">{record.country}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(record.last_updated).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
        {!recordsLoading && totalCount > 0 && !isGuest && (
            <Pagination
                currentPage={currentPage}
                totalPages={Math.ceil(totalCount / pageSize)}
                totalCount={totalCount}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={(size) => {
                    setPageSize(size);
                    setCurrentPage(1); // Reset to page 1 when size changes
                }}
            />
        )}
        </div>
      </div>

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900">Upgrade Your Account</h2>
                <button onClick={() => setShowUpgradeModal(false)}>
                  <X className="w-6 h-6 text-gray-500 hover:text-gray-700" />
                </button>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg p-6 mb-6">
                <h3 className="text-xl font-bold text-blue-900 mb-2">Get Full Access</h3>
                <p className="text-blue-800">Unlock all {totalCount} records and premium features</p>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-2">✓ Full Database Access</h4>
                  <p className="text-sm text-gray-600">View all company details without restrictions</p>
                </div>
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-2">✓ Excel Export</h4>
                  <p className="text-sm text-gray-600">Download data in Excel format</p>
                </div>
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-2">✓ Advanced Filters</h4>
                  <p className="text-sm text-gray-600">Save and reuse filter presets</p>
                </div>
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-2">✓ Regular Updates</h4>
                  <p className="text-sm text-gray-600">Get the latest industry data</p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => alert('Contact sales: sales@zeugmaresearch.com')}
                  className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold"
                >
                  Contact Sales
                </button>
                <button
                  onClick={() => setShowUpgradeModal(false)}
                  className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Maybe Later
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedDatabasePage;