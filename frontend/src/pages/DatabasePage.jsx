import { useState } from 'react';
import { Search, Download, Filter as FilterIcon, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useRecords, useFilterOptions } from '../hooks/useDatabase';
import { CATEGORIES } from '../constants/categories';
import FilterPanel from '../components/database/FilterPanel';
import DataTable from '../components/database/DataTable';
import RecordDetailModal from '../components/database/RecordDetailModal';
import Pagination from '../components/database/Pagination';
import LoadingSpinner from '../components/LoadingSpinner';

const DatabasePage = () => {
  const { user, isGuest, isClient, isStaffAdmin } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showFilters, setShowFilters] = useState(true);

  // Fetch data
  const { data: recordsData, isLoading: recordsLoading } = useRecords({
    category: selectedCategory,
    search: searchQuery,
    page: currentPage,
    page_size: pageSize,
    ...filters,
  });

  const { data: filterOptions = [], isLoading: filtersLoading } = useFilterOptions(selectedCategory);

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    setFilters({});
    setCurrentPage(1);
  };

  const handleSearchChange = (value) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value,
    }));
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setFilters({});
    setCurrentPage(1);
  };

  const handleExport = () => {
    if (isGuest) {
      alert('Export feature is available for subscribed clients only. Please upgrade your account.');
      return;
    }
    // TODO: Implement Excel export
    alert('Export functionality will be implemented');
  };

  const records = recordsData?.results || [];
  const totalCount = recordsData?.count || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  // Limit records for guests
  const displayRecords = isGuest ? records.slice(0, 5) : records;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-30">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Database</h1>
              <p className="text-sm text-gray-600">
                {isGuest && 'Limited preview - Showing first 5 results only'}
                {isClient && 'Full access to subscribed databases'}
                {isStaffAdmin && 'Full administrative access'}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="btn-secondary flex items-center gap-2"
              >
                <FilterIcon className="w-4 h-4" />
                {showFilters ? 'Hide' : 'Show'} Filters
              </button>

              <button
                onClick={handleExport}
                className="btn-primary flex items-center gap-2"
                disabled={isGuest}
              >
                <Download className="w-4 h-4" />
                Export to Excel
              </button>
            </div>
          </div>

          {/* Category Selector */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {CATEGORIES.map(category => (
              <button
                key={category.value}
                onClick={() => handleCategoryChange(category.value)}
                className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                  selectedCategory === category.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category.label}
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <div className="mt-4 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search by company name, country, or region..."
              className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {searchQuery && (
              <button
                onClick={() => handleSearchChange('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Filter Sidebar */}
        {showFilters && (
          <div className="w-80 flex-shrink-0">
            {filtersLoading ? (
              <div className="p-8">
                <LoadingSpinner />
              </div>
            ) : (
              <FilterPanel
                filters={filters}
                onFilterChange={handleFilterChange}
                filterOptions={filterOptions}
                onClear={handleClearFilters}
              />
            )}
          </div>
        )}

        {/* Data Table */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-auto bg-white">
            {recordsLoading ? (
              <div className="flex items-center justify-center h-full">
                <LoadingSpinner />
              </div>
            ) : displayRecords.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <Search className="w-16 h-16 mb-4 text-gray-300" />
                <h3 className="text-lg font-medium">No results found</h3>
                <p className="text-sm mt-2">Try adjusting your filters or search query</p>
              </div>
            ) : (
              <>
                {isGuest && records.length > 5 && (
                  <div className="bg-yellow-50 border-b border-yellow-200 px-6 py-3">
                    <p className="text-sm text-yellow-800">
                      <strong>Limited Preview:</strong> Showing 5 of {totalCount} results.
                      <button className="ml-2 text-blue-600 hover:text-blue-700 font-medium">
                        Upgrade to view all
                      </button>
                    </p>
                  </div>
                )}
                <DataTable
                  data={displayRecords}
                  onRowClick={(record) => setSelectedRecord(record.factory_id)}
                  isGuest={isGuest}
                />
              </>
            )}
          </div>

          {/* Pagination */}
          {!recordsLoading && displayRecords.length > 0 && !isGuest && (
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
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedRecord && (
        <RecordDetailModal
          factoryId={selectedRecord}
          onClose={() => setSelectedRecord(null)}
          isGuest={isGuest}
        />
      )}
    </div>
  );
};

export default DatabasePage;