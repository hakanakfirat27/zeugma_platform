import { useState } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { useRecords, useFilterOptions } from '../hooks/useDatabase';
import { CATEGORIES } from '../constants/categories';
import DashboardLayout from '../components/layout/DashboardLayout';
import FilterSidebar from '../components/database/FilterSidebar';
import DataTable from '../components/database/DataTable';
import RecordDetailModal from '../components/database/RecordDetailModal';
import Pagination from '../components/database/Pagination';
import LoadingSpinner from '../components/LoadingSpinner';

const SuperdatabasePage = () => {
  const [selectedCategory, setSelectedCategory] = useState('INJECTION');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  const { data: recordsData, isLoading } = useRecords({
    category: selectedCategory,
    search: searchQuery,
    page: currentPage,
    page_size: pageSize,
    ...filters,
  });

  const { data: filterOptions = [] } = useFilterOptions(selectedCategory);

  const records = recordsData?.results || [];
  const totalCount = recordsData?.count || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  const handleApplyFilters = (newFilters) => {
    setFilters(newFilters);
    setCurrentPage(1);
    setShowFilters(false);
  };

  const handleResetFilters = () => {
    setFilters({});
    setCurrentPage(1);
  };

  const activeFiltersCount = Object.values(filters).filter(v => v !== undefined).length;

  // Get active filter chips
  const activeFilterChips = Object.entries(filters)
    .filter(([_, value]) => value !== undefined)
    .map(([key, value]) => {
      const option = filterOptions.find(opt => opt.field === key);
      return {
        key,
        label: option?.label || key,
        type: value === true ? 'Include' : 'Exclude',
        color: value === true ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
      };
    });

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="bg-indigo-600 text-white px-8 py-6">
        <h1 className="text-2xl font-bold">Zeugma Research Staff Dashboard</h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto bg-white">
        <div className="max-w-7xl mx-auto px-8 py-6">
          {/* Title and Filter Button */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Superdatabase Explorer</h2>
              <p className="text-gray-600 mt-1">Browse and filter company records</p>
            </div>
            <button
              onClick={() => setShowFilters(true)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters ({activeFiltersCount})
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by company name, country..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Category Tabs */}
          <div className="border-b mb-6">
            <div className="flex gap-1 overflow-x-auto">
              {CATEGORIES.filter(c => c.value !== 'ALL').map(category => (
                <button
                  key={category.value}
                  onClick={() => {
                    setSelectedCategory(category.value);
                    setCurrentPage(1);
                  }}
                  className={`px-6 py-3 font-medium whitespace-nowrap border-b-2 transition-colors ${
                    selectedCategory === category.value
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                  }`}
                >
                  {category.label}
                </button>
              ))}
            </div>
          </div>

          {/* Results Count and Active Filters */}
          <div className="mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium text-green-900">
                    {totalCount} companies has been found
                  </span>
                </div>
              </div>
            </div>

            {/* Active Filter Chips */}
            {activeFilterChips.length > 0 && (
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <span className="text-sm text-gray-600">Active filters:</span>
                {activeFilterChips.map(chip => (
                  <span
                    key={chip.key}
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${chip.color}`}
                  >
                    {chip.label}: {chip.type}
                    <button
                      onClick={() => {
                        const newFilters = { ...filters };
                        delete newFilters[chip.key];
                        setFilters(newFilters);
                      }}
                      className="ml-1 hover:opacity-70"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Data Table */}
          {isLoading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : records.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Search className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No results found</p>
            </div>
          ) : (
            <>
              <div className="border rounded-lg overflow-hidden mb-4">
                <DataTable
                  data={records}
                  onRowClick={(record) => setSelectedRecord(record.factory_id)}
                  isGuest={false}
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
              />
            </>
          )}
        </div>
      </div>

      {/* Filter Sidebar */}
      <FilterSidebar
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        filters={filters}
        onFilterChange={setFilters}
        filterOptions={filterOptions}
        onApply={handleApplyFilters}
        onReset={handleResetFilters}
      />

      {/* Detail Modal */}
      {selectedRecord && (
        <RecordDetailModal
          factoryId={selectedRecord}
          onClose={() => setSelectedRecord(null)}
          isGuest={false}
        />
      )}
    </DashboardLayout>
  );
};

export default SuperdatabasePage;