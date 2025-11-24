// frontend/src/pages/database/UnverifiedSitesPage.jsx
/**
 * Unverified Sites Management Page
 * Main page for managing unverified company data before verification
 * UPDATED: Added pagination, Add Site button, Edit and Delete buttons
 * UPDATED: Single debounced search, column sorting, refresh button
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Eye, EyeOff, CheckCircle, XCircle, Edit2, Trash2, MoreVertical,
  Upload, Download, Filter, Search, RefreshCw, AlertTriangle, Plus,
  Clock, Send, AlertCircle, ArrowUpDown, ArrowUp, ArrowDown, X
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import LoadingSpinner from '../../components/LoadingSpinner';
import Pagination from '../../components/database/Pagination';
import DeleteConfirmationModal from '../../components/modals/DeleteConfirmationModal';
import BulkActionModal from '../../components/modals/BulkActionModal';
import api from '../../utils/api';
import { CATEGORIES, CATEGORY_COLORS } from '../../constants/categories';

const UnverifiedSitesPage = () => {
  const navigate = useNavigate();
  
  // State
  const [activeTab, setActiveTab] = useState('ALL');
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedSites, setSelectedSites] = useState(new Set());
  const [stats, setStats] = useState(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  
  // Sorting state
  const [sortField, setSortField] = useState('collected_date');
  const [sortDirection, setSortDirection] = useState('desc');
  
  // Search state (debounced)
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingSite, setDeletingSite] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Bulk action modal state
  const [showBulkActionModal, setShowBulkActionModal] = useState(false);
  const [isBulkActionSubmitting, setIsBulkActionSubmitting] = useState(false);
  
  // Filters
  const [filters, setFilters] = useState({
    category: 'ALL',
  });
  
  // Tab definitions
  const tabs = [
    { key: 'ALL', label: 'All Sites', status: '' },
    { key: 'PENDING', label: 'Pending', status: 'PENDING' },
    { key: 'UNDER_REVIEW', label: 'Under Review', status: 'UNDER_REVIEW' },
    { key: 'NEEDS_REVISION', label: 'Needs Revision', status: 'NEEDS_REVISION' },
    { key: 'APPROVED', label: 'Approved', status: 'APPROVED' },
    { key: 'REJECTED', label: 'Rejected', status: 'REJECTED' },
    { key: 'TRANSFERRED', label: 'Transferred', status: 'TRANSFERRED' },
  ];
  
  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);
  
  // Fetch data
  useEffect(() => {
    fetchSites();
    fetchStats();
  }, [activeTab, filters, currentPage, pageSize, sortField, sortDirection, debouncedSearch]);
  
  const fetchSites = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      
      // Add pagination params
      params.append('page', currentPage);
      params.append('page_size', pageSize);
      
      // Add sorting
      const ordering = sortDirection === 'desc' ? `-${sortField}` : sortField;
      params.append('ordering', ordering);
      
      // Add status filter from active tab
      const currentTab = tabs.find(t => t.key === activeTab);
      if (currentTab?.status) {
        params.append('status', currentTab.status);
      }
      
      // Add other filters
      if (filters.category && filters.category !== 'ALL') {
        params.append('category', filters.category);
      }
      if (debouncedSearch) {
        params.append('search', debouncedSearch);
      }
      
      const response = await api.get(`/api/unverified-sites/?${params.toString()}`);
      setSites(response.data.results || response.data);
      setTotalCount(response.data.count || response.data.length || 0);
    } catch (error) {
      console.error('Error fetching sites:', error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };
  
  const fetchStats = async () => {
    try {
      const response = await api.get('/api/unverified-sites/stats/');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };
  
  // Refresh handler
  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchSites();
    fetchStats();
  };
  
  // Sorting handler
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };
  
  // Get sort icon for column header
  const getSortIcon = (field) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="w-4 h-4 text-indigo-600" />
      : <ArrowDown className="w-4 h-4 text-indigo-600" />;
  };
  
  // Pagination handlers
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    setSelectedSites(new Set());
  };

  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize);
    setCurrentPage(1);
    setSelectedSites(new Set());
  };
  
  // Selection handlers
  const handleSelectSite = (siteId) => {
    const newSelected = new Set(selectedSites);
    if (newSelected.has(siteId)) {
      newSelected.delete(siteId);
    } else {
      newSelected.add(siteId);
    }
    setSelectedSites(newSelected);
  };
  
  const handleSelectAll = () => {
    if (selectedSites.size === sites.length) {
      setSelectedSites(new Set());
    } else {
      setSelectedSites(new Set(sites.map(site => site.site_id)));
    }
  };
   
  // Edit handler
  const handleEditSite = (siteId, e) => {
    e.stopPropagation();
    navigate(`/unverified-sites/${siteId}/edit`);
  };
  
  // Delete handlers
  const handleDeleteClick = (site, e) => {
    e.stopPropagation();
    setDeletingSite(site);
    setShowDeleteModal(true);
  };
  
  const handleDeleteConfirm = async () => {
    if (!deletingSite) return;
    
    setIsDeleting(true);
    try {
      await api.delete(`/api/unverified-sites/${deletingSite.site_id}/`);
      setShowDeleteModal(false);
      setDeletingSite(null);
      fetchSites();
      fetchStats();
    } catch (error) {
      console.error('Error deleting site:', error);
      alert('Failed to delete site');
    } finally {
      setIsDeleting(false);
    }
  };
  
  // Add Site handler
  const handleAddSite = () => {
    navigate('/unverified-sites/add');
  };
  
  // Clear all filters
  const handleClearFilters = () => {
    setSearchQuery('');
    setFilters({ category: 'ALL' });
    setCurrentPage(1);
  };
  
  // Bulk actions
  
  // Comprehensive bulk action handler
  const handleBulkAction = async ({ action, note }) => {
    if (selectedSites.size === 0) return;
    
    setIsBulkActionSubmitting(true);
    try {
      await api.post('/api/unverified-sites/bulk-action/', {
        site_ids: Array.from(selectedSites),
        action: action,
        comments: note || '',
      });
      setSelectedSites(new Set());
      setShowBulkActionModal(false);
      fetchSites();
      fetchStats();
    } catch (error) {
      console.error('Error performing bulk action:', error);
      alert(`Failed to perform bulk action: ${error.response?.data?.detail || error.message}`);
    } finally {
      setIsBulkActionSubmitting(false);
    }
  };
  
  // Get status badge with icon (consistent with AdminProjectDetailPage)
  const getStatusBadge = (status) => {
    const badges = {
      PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending', icon: <Clock className="w-3 h-3" /> },
      UNDER_REVIEW: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Under Review', icon: <RefreshCw className="w-3 h-3" /> },
      NEEDS_REVISION: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Needs Revision', icon: <AlertCircle className="w-3 h-3" /> },
      APPROVED: { bg: 'bg-green-100', text: 'text-green-800', label: 'Approved', icon: <CheckCircle className="w-3 h-3" /> },
      REJECTED: { bg: 'bg-red-100', text: 'text-red-800', label: 'Rejected', icon: <XCircle className="w-3 h-3" /> },
      TRANSFERRED: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Transferred', icon: <Send className="w-3 h-3" /> },
    };
    const badge = badges[status] || badges.PENDING;
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        {badge.icon}
        {badge.label}
      </span>
    );
  };
   
  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, filters]);

  // --- Define the header subtitle ---
  const pageSubtitle = (
    <p className="text-sm text-white-700">Manage and verify company data before adding to superdatabase</p>
  );

  // Check if any filters are active
  const hasActiveFilters = searchQuery || filters.category !== 'ALL';

  return (
    <DashboardLayout
      pageTitle="Unverified Sites"
      pageSubtitleBottom={pageSubtitle}  
    >
      <div className="p-6">
        
        {/* Add Site Button */}
        <div className="flex justify-end mb-6">
          <button
            onClick={handleAddSite}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Site
          </button>
        </div>
        
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-7 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-600">Total Sites</div>
              <div className="text-2xl font-bold text-gray-900 mt-2">{stats.total}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-600">Pending Review</div>
              <div className="text-2xl font-bold text-yellow-600 mt-2">{stats.by_status?.PENDING || 0}</div>
            </div>            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-600">Under Review</div>
              <div className="text-2xl font-bold text-blue-600 mt-2">{stats.by_status?.UNDER_REVIEW || 0}</div>
            </div>   
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-600">Needs Revision</div>
              <div className="text-2xl font-bold text-yellow-600 mt-2">{stats.by_status?.NEEDS_REVISION || 0}</div>
            </div>                      
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-600">Approved</div>
              <div className="text-2xl font-bold text-green-600 mt-2">{stats.by_status?.APPROVED || 0}</div>              
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-600">Rejected</div>
              <div className="text-2xl font-bold text-red-600 mt-2">{stats.by_status?.REJECTED || 0}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-600">Transferred</div>
              <div className="text-2xl font-bold text-purple-600 mt-2">{stats.by_status?.TRANSFERRED || 0}</div>
            </div>            
          </div>
        )}
        
        {/* Main Content */}
        <div className="bg-white rounded-lg shadow">
          {/* Tabs - Without Badges */}
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px px-6">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-6 py-4 font-medium transition-colors ${
                    activeTab === tab.key
                      ? 'border-b-2 border-indigo-600 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
          
          {/* Filters */}
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <div className="flex flex-wrap gap-4 items-center">
              {/* Single Search Input */}
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search by company name or country..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Category Filter */}
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                <select
                  value={filters.category}
                  onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                  className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent appearance-none bg-white min-w-[200px]"
                >
                  <option value="ALL">All Categories</option>
                  {CATEGORIES.filter(cat => cat.value !== 'ALL').map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Refresh Button */}
              <button
                onClick={handleRefresh}
                disabled={isRefreshing || loading}
                className="p-2 border border-gray-300 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-colors disabled:opacity-50"
                title="Refresh"
              >
                <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Active Filters Display */}
            {hasActiveFilters && (
              <div className="mt-3 flex flex-wrap gap-2">
                {searchQuery && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                    Search: "{searchQuery}"
                    <button onClick={() => setSearchQuery('')} className="hover:text-blue-900">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {filters.category !== 'ALL' && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                    Category: {CATEGORIES.find(cat => cat.value === filters.category)?.label || filters.category}
                    <button onClick={() => setFilters({ ...filters, category: 'ALL' })} className="hover:text-blue-900">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                <button
                  onClick={handleClearFilters}
                  className="text-sm text-red-600 hover:text-red-700"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>
          
          {/* Bulk Actions Toolbar */}
          {selectedSites.size > 0 && (
            <div className="bg-indigo-50 border-b border-indigo-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="font-medium text-indigo-900">
                    {selectedSites.size} selected
                  </span>
                  <button
                    onClick={() => setShowBulkActionModal(true)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Bulk Actions
                  </button>
                </div>
                <button
                  onClick={() => setSelectedSites(new Set())}
                  className="text-gray-600 hover:text-gray-900"
                >
                  Clear Selection
                </button>
              </div>
            </div>
          )}
          
          {/* Table */}
          <div className="overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner />
              </div>
            ) : sites.length === 0 ? (
              <div className="text-center py-12">
                <AlertTriangle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No sites found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={selectedSites.size === sites.length && sites.length > 0}
                          onChange={handleSelectAll}
                          className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleSort('company_name')}
                      >
                        <div className="flex items-center gap-2">
                          Company
                          {getSortIcon('company_name')}
                        </div>
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleSort('country')}
                      >
                        <div className="flex items-center gap-2">
                          Country
                          {getSortIcon('country')}
                        </div>
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleSort('project_name')}
                      >
                        <div className="flex items-center gap-2">
                          Project
                          {getSortIcon('project_name')}
                        </div>
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleSort('category')}
                      >
                        <div className="flex items-center gap-2">
                          Category
                          {getSortIcon('category')}
                        </div>
                      </th>                      
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleSort('verification_status')}
                      >
                        <div className="flex items-center gap-2">
                          Status
                          {getSortIcon('verification_status')}
                        </div>
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => handleSort('collected_date')}
                      >
                        <div className="flex items-center gap-2">
                          Date
                          {getSortIcon('collected_date')}
                        </div>
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sites.map((site) => (
                      <tr
                        key={site.site_id}
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => navigate(`/unverified-sites/${site.site_id}`)}
                      >
                        <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedSites.has(site.site_id)}
                            onChange={() => handleSelectSite(site.site_id)}
                            className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">{site.company_name}</div>
                          {site.is_duplicate && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Duplicate
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">{site.country}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {site.project_name ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                              {site.project_name}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {site.category ? (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${CATEGORY_COLORS[site.category] || 'bg-gray-100 text-gray-800'}`}>
                              {CATEGORIES.find(cat => cat.value === site.category)?.label || site.category}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>                        
                        <td className="px-6 py-4">
                          {getStatusBadge(site.verification_status)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {new Date(site.collected_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={(e) => handleEditSite(site.site_id, e)}
                              className="text-gray-600 hover:text-gray-700 p-1"
                              title="Edit"
                            >
                              <Edit2 className="w-5 h-5" />
                            </button>
                            <button
                              onClick={(e) => handleDeleteClick(site, e)}
                              className="text-red-600 hover:text-red-700 p-1"
                              title="Delete"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          
          {/* Pagination */}
          {!loading && totalCount > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(totalCount / pageSize)}
              totalCount={totalCount}
              pageSize={pageSize}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
              showFirstLast={true}
            />
          )}
        </div>
      </div>
      
      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingSite && (
        <DeleteConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => {
            setShowDeleteModal(false);
            setDeletingSite(null);
          }}
          onConfirm={handleDeleteConfirm}
          title="Delete Site"
          message="Are you sure you want to delete this site? This action cannot be undone."
          itemName={deletingSite.company_name}
          isDeleting={isDeleting}
        />
      )}
      
      {/* Bulk Action Modal */}
      <BulkActionModal
        isOpen={showBulkActionModal}
        onClose={() => setShowBulkActionModal(false)}
        onSubmit={handleBulkAction}
        selectedCount={selectedSites.size}
        isSubmitting={isBulkActionSubmitting}
        selectedSites={sites.filter(site => selectedSites.has(site.site_id))}
      />
    </DashboardLayout>
  );
};

export default UnverifiedSitesPage;
