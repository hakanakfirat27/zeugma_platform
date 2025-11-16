// frontend/src/pages/UnverifiedSitesPage.jsx
/**
 * Unverified Sites Management Page
 * Main page for managing unverified company data before verification
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Eye, EyeOff, CheckCircle, XCircle, Edit, Trash2, MoreVertical,
  Upload, Download, Filter, Search, RefreshCw, AlertTriangle
} from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import LoadingSpinner from '../components/LoadingSpinner';
import UnverifiedSiteDetailModal from '../components/UnverifiedSiteDetailModal';
import api from '../utils/api';
import { CATEGORIES, CATEGORY_COLORS } from '../constants/categories';

const UnverifiedSitesPage = () => {
  const navigate = useNavigate();
  
  // State
  const [activeTab, setActiveTab] = useState('ALL');
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSites, setSelectedSites] = useState(new Set());
  const [selectedSite, setSelectedSite] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [stats, setStats] = useState(null);
  
  // Filters
  const [filters, setFilters] = useState({
    category: 'ALL',
    country: '',
    priority: '',
    search: '',
  });
  
  // Tab definitions
  const tabs = [
    { key: 'ALL', label: 'All Sites', status: '' },
    { key: 'PENDING', label: 'Pending', status: 'PENDING' },
    { key: 'UNDER_REVIEW', label: 'Under Review', status: 'UNDER_REVIEW' },
    { key: 'APPROVED', label: 'Approved', status: 'APPROVED' },
    { key: 'REJECTED', label: 'Rejected', status: 'REJECTED' },
  ];
  
  // Fetch data
  useEffect(() => {
    fetchSites();
    fetchStats();
  }, [activeTab, filters]);
  
  const fetchSites = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      
      // Add status filter from active tab
      const currentTab = tabs.find(t => t.key === activeTab);
      if (currentTab?.status) {
        params.append('status', currentTab.status);
      }
      
      // Add other filters
      if (filters.category && filters.category !== 'ALL') {
        params.append('category', filters.category);
      }
      if (filters.country) {
        params.append('country', filters.country);
      }
      if (filters.priority) {
        params.append('priority', filters.priority);
      }
      if (filters.search) {
        params.append('search', filters.search);
      }
      
      const response = await api.get(`/api/unverified-sites/?${params.toString()}`);
      setSites(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching sites:', error);
    } finally {
      setLoading(false);
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
  
  // Detail modal
  const handleViewDetails = (site) => {
    setSelectedSite(site);
    setDetailModalOpen(true);
  };
  
  // Quick actions
  const handleQuickApprove = async (siteId, e) => {
    e.stopPropagation();
    try {
      await api.post(`/api/unverified-sites/${siteId}/approve/`, {
        comments: 'Quick approval',
      });
      fetchSites();
      fetchStats();
    } catch (error) {
      console.error('Error approving site:', error);
      alert('Failed to approve site');
    }
  };
  
  const handleQuickReject = async (siteId, e) => {
    e.stopPropagation();
    const reason = prompt('Rejection reason:');
    if (!reason) return;
    
    try {
      await api.post(`/api/unverified-sites/${siteId}/reject/`, {
        rejection_reason: reason,
      });
      fetchSites();
      fetchStats();
    } catch (error) {
      console.error('Error rejecting site:', error);
      alert('Failed to reject site');
    }
  };
  
  // Bulk actions
  const handleBulkApprove = async () => {
    if (selectedSites.size === 0) return;
    
    if (!confirm(`Approve ${selectedSites.size} sites?`)) return;
    
    try {
      await api.post('/api/unverified-sites/bulk-action/', {
        site_ids: Array.from(selectedSites),
        action: 'approve',
      });
      setSelectedSites(new Set());
      fetchSites();
      fetchStats();
    } catch (error) {
      console.error('Error bulk approving:', error);
      alert('Failed to approve sites');
    }
  };
  
  const handleBulkReject = async () => {
    if (selectedSites.size === 0) return;
    
    const reason = prompt('Rejection reason:');
    if (!reason) return;
    
    try {
      await api.post('/api/unverified-sites/bulk-action/', {
        site_ids: Array.from(selectedSites),
        action: 'reject',
        comments: reason,
      });
      setSelectedSites(new Set());
      fetchSites();
      fetchStats();
    } catch (error) {
      console.error('Error bulk rejecting:', error);
      alert('Failed to reject sites');
    }
  };
  
  // Get status badge color
  const getStatusColor = (status) => {
    switch (status) {
      case 'PENDING':
        return 'bg-gray-100 text-gray-800';
      case 'UNDER_REVIEW':
        return 'bg-blue-100 text-blue-800';
      case 'APPROVED':
        return 'bg-green-100 text-green-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Get priority badge color
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'LOW':
        return 'bg-gray-100 text-gray-600';
      case 'MEDIUM':
        return 'bg-blue-100 text-blue-600';
      case 'HIGH':
        return 'bg-orange-100 text-orange-600';
      case 'URGENT':
        return 'bg-red-100 text-red-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };
  
  // Get quality color
  const getQualityColor = (score) => {
    if (score >= 70) return 'text-green-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };
  
  // Header actions
  const headerActions = (
    <>
      <button
        onClick={fetchSites}
        className="px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg transition-all flex items-center gap-2"
      >
        <RefreshCw className="w-4 h-4" />
        <span className="hidden sm:inline">Refresh</span>
      </button>
      <button
        onClick={() => navigate('/superdatabase')}
        className="px-4 py-2 bg-white/90 hover:bg-white text-indigo-600 rounded-lg transition-all flex items-center gap-2 font-semibold shadow-lg"
      >
        <Upload className="w-4 h-4" />
        <span className="hidden sm:inline">Import Data</span>
      </button>
    </>
  );
  
  return (
    <DashboardLayout
      pageTitle="Unverified Sites"
      pageSubtitleBottom="Review and verify company data before adding to Superdatabase"
      headerActions={headerActions}
    >
      <div className="flex-1 overflow-auto bg-gray-50">
        <div className="max-w-7xl mx-auto p-8">
          
          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-lg shadow p-4">
                <div className="text-sm text-gray-600">Total Sites</div>
                <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <div className="text-sm text-gray-600">Pending Review</div>
                <div className="text-2xl font-bold text-orange-600">{stats.pending_review}</div>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <div className="text-sm text-gray-600">Approved</div>
                <div className="text-2xl font-bold text-green-600">
                  {stats.by_status?.APPROVED || 0}
                </div>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <div className="text-sm text-gray-600">Avg Quality</div>
                <div className={`text-2xl font-bold ${getQualityColor(stats.avg_quality_score)}`}>
                  {stats.avg_quality_score}%
                </div>
              </div>
            </div>
          )}
          
          {/* Tabs */}
          <div className="bg-white rounded-lg shadow mb-6">
            <div className="flex border-b">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-6 py-3 font-medium transition-colors ${
                    activeTab === tab.key
                      ? 'border-b-2 border-indigo-600 text-indigo-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {tab.label}
                  {stats?.by_status && tab.status && (
                    <span className="ml-2 text-xs text-gray-500">
                      ({stats.by_status[tab.status] || 0})
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
          
          {/* Filters */}
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search companies..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              
              <select
                value={filters.category}
                onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
              
              <select
                value={filters.priority}
                onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">All Priorities</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
              
              <button
                onClick={() => setFilters({ category: 'ALL', country: '', priority: '', search: '' })}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>
          
          {/* Bulk Actions Toolbar */}
          {selectedSites.size > 0 && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="font-medium text-indigo-900">
                    {selectedSites.size} selected
                  </span>
                  <button
                    onClick={handleBulkApprove}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Approve
                  </button>
                  <button
                    onClick={handleBulkReject}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-2"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject
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
          <div className="bg-white rounded-lg shadow overflow-hidden">
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
                          className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Company
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Country
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Priority
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quality
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
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
                        onClick={() => handleViewDetails(site)}
                      >
                        <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedSites.has(site.site_id)}
                            onChange={() => handleSelectSite(site.site_id)}
                            className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
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
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            CATEGORY_COLORS[site.category] || 'bg-gray-100 text-gray-800'
                          }`}>
                            {site.category_display}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">{site.country}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(site.verification_status)}`}>
                            {site.verification_status_display}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(site.priority)}`}>
                            {site.priority_display}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-sm font-semibold ${getQualityColor(site.data_quality_score)}`}>
                            {site.data_quality_score}%
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {new Date(site.collected_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={(e) => handleQuickApprove(site.site_id, e)}
                              className="text-green-600 hover:text-green-700 p-1"
                              title="Quick Approve"
                            >
                              <CheckCircle className="w-5 h-5" />
                            </button>
                            <button
                              onClick={(e) => handleQuickReject(site.site_id, e)}
                              className="text-red-600 hover:text-red-700 p-1"
                              title="Quick Reject"
                            >
                              <XCircle className="w-5 h-5" />
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
        </div>
      </div>
      
      {/* Detail Modal */}
      {selectedSite && (
        <UnverifiedSiteDetailModal
          open={detailModalOpen}
          onClose={() => {
            setDetailModalOpen(false);
            setSelectedSite(null);
          }}
          site={selectedSite}
          onUpdate={() => {
            fetchSites();
            fetchStats();
          }}
        />
      )}
    </DashboardLayout>
  );
};

export default UnverifiedSitesPage;