import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import DashboardLayout from '../components/layout/DashboardLayout';
import DataCollectorLayout from '../components/layout/DataCollectorLayout';
import CountrySelector from '../components/form/CountrySelector';
import CompanyDetailsModal from '../components/modals/CompanyDetailsModal';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import Pagination from '../components/database/Pagination';

const CompanyResearchPage = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    company_name: '',
    country: ''
  });
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [favoriteFilter, setFavoriteFilter] = useState(false);
  const [quota, setQuota] = useState(null);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Delete modal states
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  
  const { success, error, warning } = useToast();

  const Layout = user?.role === 'DATA_COLLECTOR' ? DataCollectorLayout : DashboardLayout;

  // Format date to DD.MM.YYYY HH:mm
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${day}.${month}.${year} ${hours}:${minutes}`;
  };

  // Load quota and results on mount
  useEffect(() => {
    loadQuota();
    loadResults();
  }, []);

  // Load results when page, pageSize, searchFilter, or favoriteFilter changes
  useEffect(() => {
    loadResults();
  }, [currentPage, pageSize, searchFilter, favoriteFilter]);

  const loadQuota = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.get('/api/research-quota/', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setQuota(response.data);
    } catch (err) {
      console.error('Error loading quota:', err);
    }
  };

  const loadResults = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const params = new URLSearchParams({
        page: currentPage.toString(),
        page_size: pageSize.toString()
      });
      
      if (searchFilter.trim()) {
        params.append('search', searchFilter.trim());
      }

      if (favoriteFilter) {
        params.append('is_favorite', 'true');
      }
      
      const response = await axios.get(`/api/research-history/?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      setResults(response.data.results || []);
      setTotalCount(response.data.count || 0);
      setTotalPages(Math.ceil((response.data.count || 0) / pageSize));
    } catch (err) {
      console.error('Error loading results:', err);
      if (err.response?.status !== 404) {
        error('Failed to load research history');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCountryChange = (countryName) => {
    setFormData(prev => ({ ...prev, country: countryName }));
  };

  const handleSearch = async (e) => {
    e.preventDefault();

    if (!formData.company_name.trim()) {
      error('Please enter a company name');
      return;
    }

    setIsSearching(true);

    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.post(
        '/api/research-company/',
        {
          company_name: formData.company_name.trim(),
          country: formData.country.trim() || 'Unknown'
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        success(`Company information found and saved for ${formData.company_name}`);
        
        // Update quota
        setQuota(response.data.quota);
        
        // Show quota warning if low
        if (response.data.quota.remaining <= 3) {
          warning(`You have ${response.data.quota.remaining} searches remaining today`);
        }
        
        // Reload results to show new search
        setCurrentPage(1); // Go to first page to see new result
        loadResults();
        
        // Clear form
        setFormData({
          company_name: '',
          country: formData.country // Keep country selected
        });
      }
    } catch (err) {
      console.error('Error researching company:', err);
      
      if (err.response?.status === 429) {
        error(err.response.data.details || 'Daily search limit reached');
        if (err.response.data.quota) {
          setQuota(err.response.data.quota);
        }
      } else if (err.response?.status === 503) {
        error(err.response.data.details || 'AI service temporarily unavailable');
      } else {
        error(err.response?.data?.details || 'Failed to research company');
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleRowClick = async (researchItem) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.get(
        `/api/research-history/${researchItem.research_id}/`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      
      setSelectedCompany(response.data.result_data);
      setIsModalOpen(true);
    } catch (err) {
      console.error('Error loading research details:', err);
      error('Failed to load company details');
    }
  };

  const handleDeleteClick = (researchId, companyName, e) => {
    e.stopPropagation();
    setItemToDelete({ id: researchId, name: companyName });
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;

    setIsDeleting(true);
    
    try {
      const token = localStorage.getItem('access_token');
      await axios.delete(`/api/research-history/${itemToDelete.id}/delete/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      success('Research result deleted');
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
      loadResults(); // Reload the list
    } catch (err) {
      console.error('Error deleting research:', err);
      error('Failed to delete research result');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setIsDeleteModalOpen(false);
    setItemToDelete(null);
  };

  const handleToggleFavorite = async (researchId, e) => {
    e.stopPropagation();
    
    try {
      const token = localStorage.getItem('access_token');
      await axios.post(
        `/api/research-history/${researchId}/toggle-favorite/`,
        {},
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      
      // Reload results to show updated favorite status
      loadResults();
    } catch (err) {
      console.error('Error toggling favorite:', err);
    }
  };

  const handleSearchFilterChange = (e) => {
    setSearchFilter(e.target.value);
    setCurrentPage(1); // Reset to first page when filtering
  };

  const handleFavoriteFilterToggle = () => {
    setFavoriteFilter(!favoriteFilter);
    setCurrentPage(1); // Reset to first page when toggling filter
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize);
    setCurrentPage(1); // Reset to first page when changing page size
  };

  return (
    <Layout>
      <div className="p-6">
        
        {/* Header */}
        <div className="mb-6 flex items-start space-x-3">
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-2.5 rounded-lg flex-shrink-0">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Company Research</h1>
            <p className="text-sm text-gray-600 mt-1">
              AI-powered company information lookup for preliminary research
            </p>
          </div>
        </div>

        {/* Quota Display */}
        {quota && (
          <div className="mb-6 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-purple-100 p-2 rounded-lg">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Daily Search Quota</h3>
                  <p className="text-xs text-gray-600">
                    {quota.searches_used} of {quota.daily_limit} searches used today
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-purple-600">
                  {quota.remaining}
                </div>
                <div className="text-xs text-gray-600">remaining</div>
              </div>
            </div>
            <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-purple-600 to-indigo-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(quota.searches_used / quota.daily_limit) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Search Form */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-6">
          <form onSubmit={handleSearch}>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              {/* Company Name */}
              <div className="md:col-span-5">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="company_name"
                  value={formData.company_name}
                  onChange={handleInputChange}
                  placeholder="Enter company name"
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                  disabled={isSearching}
                />
              </div>

              {/* Country */}
              <div className="md:col-span-5">
                <CountrySelector
                  label="Country (Optional)"
                  value={formData.country}
                  onChange={handleCountryChange}
                  placeholder="Select a country..."
                  disabled={isSearching}
                />
              </div>

              {/* Search Button */}
              <div className="md:col-span-2 flex items-end">
                <button
                  type="submit"
                  disabled={isSearching || !formData.company_name.trim()}
                  className="w-full px-4 py-2.5 mb-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 font-medium text-sm"
                >
                  {isSearching ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      <span>Searching...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <span>Search</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Results Section */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          {/* Results Header */}
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h2 className="text-lg font-bold text-white">Research Results</h2>
                <span className="bg-white/20 px-2.5 py-0.5 rounded-full text-xs text-white">
                  {totalCount} total
                </span>
              </div>
              
              {/* Search and Filter */}
              <div className="flex items-center space-x-3">
                {/* Favorite Filter Button */}
                <button
                  type="button"
                  onClick={handleFavoriteFilterToggle}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1.5 ${
                    favoriteFilter
                      ? 'bg-yellow-400 text-gray-900 hover:bg-yellow-300'
                      : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
                >
                  <svg
                    className="w-4 h-4"
                    fill={favoriteFilter ? "currentColor" : "none"}
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                  <span>{favoriteFilter ? 'Favorites' : 'All'}</span>
                </button>

                {/* Live Search */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search results..."
                    value={searchFilter}
                    onChange={handleSearchFilterChange}
                    className="pl-9 pr-3 py-1.5 rounded-lg border-2 border-white/20 bg-white/10 text-white placeholder-white/70 focus:outline-none focus:border-white/40 focus:bg-white/20 text-sm w-48"
                  />
                  <svg className="w-4 h-4 text-white/70 absolute left-3 top-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Loading State */}
          {isLoading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-purple-200 border-t-purple-600 mb-3"></div>
              <p className="text-sm text-gray-600">Loading research results...</p>
            </div>
          ) : results.length === 0 ? (
            /* Empty State */
            <div className="p-12 text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-r from-purple-100 to-indigo-100 rounded-full mb-3">
                <svg className="w-7 h-7 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-base font-medium text-gray-900 mb-1.5">
                {searchFilter || favoriteFilter ? 'No results found' : 'No research results yet'}
              </h3>
              <p className="text-sm text-gray-600">
                {searchFilter || favoriteFilter
                  ? 'Try adjusting your search terms or filters'
                  : 'Start by searching for a company above. Results will appear here.'
                }
              </p>
            </div>
          ) : (
            <>
              {/* Results Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Company
                      </th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Industry
                      </th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Website
                      </th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-4 py-2.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {results.map((item) => (
                      <tr
                        key={item.research_id}
                        onClick={() => handleRowClick(item)}
                        className="hover:bg-purple-50 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-9 w-9 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                              {(item.official_name || item.company_name)?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <div className="ml-3">
                              <div className="text-sm font-medium text-gray-900">
                                {item.official_name || item.company_name || 'N/A'}
                              </div>
                              <div className="text-xs text-gray-500">
                                {item.country}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-900">{item.city || 'N/A'}</div>
                        </td>
                        <td className="px-4 py-3">
                          {item.industry ? (
                            <span className="px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                              {item.industry}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400">N/A</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {item.website && item.website !== 'Not found' ? (
                            <a
                              href={item.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-purple-600 hover:text-purple-800 text-sm flex items-center space-x-1"
                            >
                              <span>Visit</span>
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>
                          ) : (
                            <span className="text-gray-400 text-sm">N/A</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
                          {formatDate(item.searched_at)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center space-x-1.5">
                            {/* Favorite Button */}
                            <button
                              type="button"
                              onClick={(e) => handleToggleFavorite(item.research_id, e)}
                              className="p-1.5 text-yellow-600 hover:bg-yellow-50 rounded transition-colors"
                              title={item.is_favorite ? "Remove from favorites" : "Add to favorites"}
                            >
                              <svg
                                className="w-4 h-4"
                                fill={item.is_favorite ? "currentColor" : "none"}
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                              </svg>
                            </button>
                            
                            {/* Delete Button */}
                            <button
                              type="button"
                              onClick={(e) => handleDeleteClick(item.research_id, item.official_name || item.company_name, e)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Delete"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalCount={totalCount}
                pageSize={pageSize}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
                showFirstLast={true}
              />
            </>
          )}
        </div>
      </div>

      {/* Company Details Modal */}
      <CompanyDetailsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        company={selectedCompany}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Research Result"
        message="Are you sure you want to delete this research result?"
        itemName={itemToDelete?.name}
        isDeleting={isDeleting}
      />
    </Layout>
  );
};

export default CompanyResearchPage;