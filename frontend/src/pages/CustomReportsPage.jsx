// frontend/src/pages/CustomReportsPage.jsx
// UPDATED: Added pagination, fixed sorting, Create Subscription button, and multi-user subscription modal

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import DashboardLayout from '../components/layout/DashboardLayout';
import LoadingSpinner from '../components/LoadingSpinner';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import Pagination from '../components/database/Pagination';
import { ToastContainer } from '../components/Toast';
import { useToast } from '../hooks/useToast';
import api from '../utils/api';
import {
  Search, X, FileText, Users, Calendar, Plus, Edit, Trash2, Eye,
  Grid, List, ChevronDown, User, Save, CheckCircle2, Database
} from 'lucide-react';

// Status Badge Component
const StatusBadge = ({ isActive }) => {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
      isActive
        ? 'bg-green-100 text-green-800 border-green-200'
        : 'bg-gray-100 text-gray-800 border-gray-200'
    }`}>
      {isActive ? (
        <>
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          Active
        </>
      ) : (
        <>
          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
          Inactive
        </>
      )}
    </span>
  );
};

// Stats Card Component
const StatsCard = ({ icon: Icon, label, value, subtext, gradient, iconColor }) => {
  return (
    <div className={`bg-gradient-to-br ${gradient} rounded-xl p-6 shadow-lg border border-white/20`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">{label}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          {subtext && (
            <p className="text-xs text-gray-500 mt-1">{subtext}</p>
          )}
        </div>
        <div className={`w-14 h-14 ${iconColor} rounded-xl flex items-center justify-center`}>
          <Icon className="w-7 h-7 text-white" />
        </div>
      </div>
    </div>
  );
};

// Sortable Table Header Component
const SortableHeader = ({ label, field, currentSort, onSort }) => {
  const isActive = currentSort.field === field;
  const isDesc = currentSort.direction === 'desc';

  return (
    <th
      className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors select-none group"
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-2">
        <span>{label}</span>
        <div className="flex flex-col">
          <ChevronDown
            className={`w-3 h-3 -mb-1 transition-colors ${
              isActive && !isDesc ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-500'
            }`}
            style={{ transform: 'rotate(180deg)' }}
          />
          <ChevronDown
            className={`w-3 h-3 transition-colors ${
              isActive && isDesc ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-500'
            }`}
          />
        </div>
      </div>
    </th>
  );
};

// Multi-User Subscription Modal Component
const MultiUserSubscriptionModal = ({ onClose, onSuccess, reports }) => {
  const { success: showSuccess, error: showError } = useToast();
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredClients, setFilteredClients] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  const [formData, setFormData] = useState({
    report: '',
    plan: 'MONTHLY',
    status: 'ACTIVE',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    notes: ''
  });

  useEffect(() => {
    fetchClients();
  }, []);

  // Auto-calculate end date based on start date and plan
  useEffect(() => {
    if (formData.start_date && formData.plan) {
      const startDate = new Date(formData.start_date);
      const endDate = new Date(startDate);

      if (formData.plan === 'MONTHLY') {
        endDate.setMonth(endDate.getMonth() + 1);
      } else if (formData.plan === 'ANNUAL') {
        endDate.setFullYear(endDate.getFullYear() + 1);
      }

      setFormData(prev => ({
        ...prev,
        end_date: endDate.toISOString().split('T')[0]
      }));
    }
  }, [formData.start_date, formData.plan]);

  // Filter clients based on search term
  useEffect(() => {
    if (!searchTerm) {
      setFilteredClients([]);
      return;
    }

    const searchLower = searchTerm.toLowerCase();
    const filtered = clients.filter(client => {
      const alreadySelected = selectedUsers.some(user => user.id === client.id);
      if (alreadySelected) return false;

      const fullName = client.full_name || '';
      const username = client.username || '';
      const email = client.email || '';
      const company = client.company_name || '';

      return (
        fullName.toLowerCase().includes(searchLower) ||
        username.toLowerCase().includes(searchLower) ||
        email.toLowerCase().includes(searchLower) ||
        company.toLowerCase().includes(searchLower)
      );
    });

    setFilteredClients(filtered);
    setShowDropdown(filtered.length > 0);
  }, [searchTerm, clients, selectedUsers]);

  // Handle clicks outside dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchClients = async () => {
    try {
      const response = await api.get('/api/users/?role=CLIENT');
      setClients(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching clients:', error);
      showError('Failed to load clients');
    }
  };

  const handleAddUser = (client) => {
    setSelectedUsers(prev => [...prev, client]);
    setSearchTerm('');
    setShowDropdown(false);
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  const handleRemoveUser = (clientId) => {
    setSelectedUsers(prev => prev.filter(user => user.id !== clientId));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (selectedUsers.length === 0) {
      showError('Please select at least one user');
      return;
    }

    if (!formData.report) {
      showError('Please select a report');
      return;
    }

    setLoading(true);
    try {
      const subscriptions = selectedUsers.map(user => ({
        client: user.id,
        report: formData.report,
        plan: formData.plan,
        status: formData.status,
        start_date: formData.start_date,
        end_date: formData.end_date,
        notes: formData.notes
      }));

      // Create subscriptions in batch
      const promises = subscriptions.map(sub =>
        api.post('/api/subscriptions/', sub)
      );

      await Promise.all(promises);
      showSuccess(`Successfully created ${subscriptions.length} subscription(s)!`);
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating subscriptions:', error);
      showError(error.response?.data?.error || 'Failed to create subscriptions');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-4 rounded-t-xl z-10">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold">Create Subscriptions</h2>
              <p className="text-sm text-indigo-100 mt-1">Assign a report to multiple users</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Multi-User Selection with Tags */}
          <div ref={dropdownRef}>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Select Users <span className="text-red-500">*</span>
            </label>

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => searchTerm && setShowDropdown(filteredClients.length > 0)}
                placeholder="Search by name, email, or company..."
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setShowDropdown(false);
                  }}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Dropdown */}
            {showDropdown && (
              <div className="absolute z-50 w-full mt-2 bg-white border-2 border-gray-200 rounded-lg shadow-xl max-h-64 overflow-y-auto">
                {filteredClients.map(client => (
                  <button
                    key={client.id}
                    type="button"
                    onClick={() => handleAddUser(client)}
                    className="w-full px-4 py-3 text-left hover:bg-indigo-50 transition-colors border-b border-gray-100 last:border-b-0"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-indigo-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate">
                          {client.full_name || client.username}
                        </div>
                        <div className="text-sm text-gray-500 truncate">{client.email}</div>
                        {client.company_name && (
                          <div className="text-xs text-gray-400 truncate">{client.company_name}</div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Selected Users Tags */}
            {selectedUsers.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedUsers.map(user => (
                  <div
                    key={user.id}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-100 text-indigo-800 rounded-lg border border-indigo-200"
                  >
                    <User className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      {user.full_name || user.username}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveUser(user.id)}
                      className="ml-1 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-200 rounded-full p-0.5 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {selectedUsers.length > 0 && (
              <p className="mt-2 text-sm text-gray-600">
                {selectedUsers.length} user(s) selected
              </p>
            )}
          </div>

          {/* Report Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Report <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.report}
              onChange={(e) => setFormData(prev => ({ ...prev, report: e.target.value }))}
              required
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
            >
              <option value="">Select a report</option>
              {reports.map(report => (
                <option key={report.report_id} value={report.report_id}>
                  {report.title} ({report.record_count} records)
                </option>
              ))}
            </select>
          </div>

          {/* Subscription Plan */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Subscription Plan <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, plan: 'MONTHLY' }))}
                className={`p-4 rounded-lg border-2 transition-all ${
                  formData.plan === 'MONTHLY'
                    ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-center">
                  <div className={`text-lg font-bold ${
                    formData.plan === 'MONTHLY' ? 'text-indigo-700' : 'text-gray-900'
                  }`}>
                    Monthly
                  </div>
                  <div className="text-xs text-gray-500 mt-1">1 month access</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, plan: 'ANNUAL' }))}
                className={`p-4 rounded-lg border-2 transition-all ${
                  formData.plan === 'ANNUAL'
                    ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-center">
                  <div className={`text-lg font-bold ${
                    formData.plan === 'ANNUAL' ? 'text-indigo-700' : 'text-gray-900'
                  }`}>
                    Annual
                  </div>
                  <div className="text-xs text-gray-500 mt-1">1 year access</div>
                </div>
              </button>
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Status <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
              required
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
            >
              <option value="ACTIVE">Active</option>
              <option value="PENDING">Pending</option>
            </select>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Start Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                required
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                End Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                required
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
              placeholder="Add any additional notes about these subscriptions..."
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all font-medium disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Create Subscriptions
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};



const CustomReportsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toasts, success, error: showError, removeToast } = useToast();

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('list');
  const [sortField, setSortField] = useState('created_at');
  const [sortDirection, setSortDirection] = useState('desc');

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [reportToDelete, setReportToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  const isStaff = user?.role === 'SUPERADMIN' || user?.role === 'STAFF_ADMIN';

  useEffect(() => {
    fetchReports();
  }, [searchTerm, sortField, sortDirection, page, pageSize]);

    // Check for toast message from navigation
    useEffect(() => {
      if (location.state?.toastMessage) {
        const { toastMessage, toastType } = location.state;

        // Show toast with 7 second duration
        if (toastType === 'success') {
          success(toastMessage, 7000);
        } else if (toastType === 'error') {
          showError(toastMessage, 7000);
        }

        // Clear state so toast doesn't show again on refresh
        window.history.replaceState({}, document.title);
      }
    }, [location, success, showError]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const params = {
        page,
        page_size: pageSize
      };

      if (searchTerm) params.search = searchTerm;
      if (sortField) {
        params.ordering = sortDirection === 'desc' ? `-${sortField}` : sortField;
      }

      const response = await api.get('/api/custom-reports/', { params });

      // Handle both paginated and non-paginated responses
      if (response.data.results) {
        setReports(response.data.results);
        setTotalCount(response.data.count || 0);
        setTotalPages(Math.ceil((response.data.count || 0) / pageSize));
      } else {
        setReports(response.data);
        setTotalCount(response.data.length);
        setTotalPages(1);
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
      showError('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setPage(1); // Reset to first page when sorting
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
  };

  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize);
    setPage(1); // Reset to first page when changing page size
  };

  const handleCreateReport = () => {
    navigate('/custom-reports/create');
  };

  const handleViewReport = (reportId) => {
    navigate(`/custom-reports/${reportId}`);
  };

  const handleEditReport = (reportId) => {
    navigate(`/custom-reports/${reportId}/edit`);
  };

  const handleOpenDeleteModal = (report) => {
    setReportToDelete(report);
    setShowDeleteModal(true);
  };

  const handleDeleteReport = async () => {
    if (!reportToDelete) return;

    setIsDeleting(true);
    try {
      await api.delete(`/api/custom-reports/${reportToDelete.report_id}/`);
      setShowDeleteModal(false);
      setReportToDelete(null);
      fetchReports();
      success('Report deleted successfully!');
    } catch (error) {
      console.error('Error deleting report:', error);
      showError(error.response?.data?.error || 'Failed to delete report');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubscriptionSuccess = () => {
    setShowSubscriptionModal(false);
    // Optionally refresh reports to update subscription counts
    fetchReports();
  };

    // Calculate stats from reports data
    const stats = React.useMemo(() => {
      if (viewMode === 'list') {
        return {
          totalReports: totalCount,
          activeReports: reports.filter(r => r.is_active).length,
          totalRecords: reports.reduce((sum, r) => sum + (r.record_count || 0), 0),
          totalSubscribers: reports.reduce((sum, r) => sum + (r.subscription_count || 0), 0),
          showWarning: true
        };
      } else {
        return {
          totalReports: reports.length,
          activeReports: reports.filter(r => r.is_active).length,
          totalRecords: reports.reduce((sum, r) => sum + (r.record_count || 0), 0),
          totalSubscribers: reports.reduce((sum, r) => sum + (r.subscription_count || 0), 0),
          showWarning: false
        };
      }
    }, [reports, totalCount, viewMode]);

  if (loading && reports.length === 0) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <LoadingSpinner />
        </div>
      </DashboardLayout>
    );
  }

  const pageSubtitle = (
    <p className="text-sm text-white-500">
      {isStaff
        ? 'Create and manage custom database reports'
        : 'Browse available custom reports'}
    </p>
  );

  return (
    <DashboardLayout
      pageTitle="Custom Reports"
      pageSubtitleBottom={pageSubtitle}
    >
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      <div className="flex-1 overflow-auto bg-white">
        {/* Stats Cards Section */}
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatsCard
              icon={FileText}
              label="Total Reports"
              value={stats.totalReports.toLocaleString()}
              subtext={viewMode === 'list' && totalCount !== reports.length ? 'All reports' : null}
              gradient="from-blue-50 to-indigo-50"
              iconColor="bg-gradient-to-br from-blue-500 to-indigo-600"
            />
            <StatsCard
              icon={CheckCircle2}
              label="Active Reports"
              value={stats.activeReports.toLocaleString()}
              subtext={stats.showWarning ? 'Current page' : 'Published and available'}
              gradient="from-green-50 to-emerald-50"
              iconColor="bg-gradient-to-br from-green-500 to-emerald-600"
            />
            <StatsCard
              icon={Database}
              label="Total Records"
              value={stats.totalRecords.toLocaleString()}
              subtext={stats.showWarning ? 'Current page' : 'Across all reports'}
              gradient="from-purple-50 to-pink-50"
              iconColor="bg-gradient-to-br from-purple-500 to-pink-600"
            />
            <StatsCard
              icon={Users}
              label="Subscribers"
              value={stats.totalSubscribers.toLocaleString()}
              subtext={stats.showWarning ? 'Current page' : 'Total subscriptions'}
              gradient="from-orange-50 to-amber-50"
              iconColor="bg-gradient-to-br from-orange-500 to-amber-600"
            />
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-8 py-6">
          {/* Action Bar */}
          <div className="flex items-center justify-between mb-6 gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search reports..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(1); // Reset to first page when searching
                  }}
                  className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                {searchTerm && (
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setPage(1);
                    }}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5 text-red-400" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* View Toggle Buttons */}
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-2 rounded-md transition-all flex items-center gap-2 ${
                    viewMode === 'list'
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  title="List View"
                >
                  <List className="w-4 h-4" />
                  <span className="text-sm font-medium">List</span>
                </button>
                <button
                  onClick={() => setViewMode('card')}
                  className={`px-3 py-2 rounded-md transition-all flex items-center gap-2 ${
                    viewMode === 'card'
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  title="Card View"
                >
                  <Grid className="w-4 h-4" />
                  <span className="text-sm font-medium">Card</span>
                </button>
              </div>

              {/* Action Buttons */}
              {isStaff && (
                <>
                  <button
                    onClick={() => setShowSubscriptionModal(true)}
                    className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center gap-2 shadow-md text-sm"
                  >
                    <Users className="w-5 h-5" />
                    Create Subscription
                  </button>
                  <button
                    onClick={handleCreateReport}
                    className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center gap-2 shadow-md text-sm"
                  >
                    <Plus className="w-5 h-5" />
                    Create New Report
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Empty State */}
          {reports.length === 0 && !loading ? (
            <div className="text-center py-16 bg-gray-50 rounded-lg">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No reports found</h3>
              <p className="text-gray-600 mb-6">
                {isStaff ? 'Get started by creating a new report.' : 'Check back later for available reports.'}
              </p>
              {isStaff && (
                <button
                  onClick={handleCreateReport}
                  className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition inline-flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Create First Report
                </button>
              )}
            </div>
          ) : (
            <>
              {/* List View - Table */}
              {viewMode === 'list' && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <SortableHeader
                            label="Report Title"
                            field="title"
                            currentSort={{ field: sortField, direction: sortDirection }}
                            onSort={handleSort}
                          />
                          <SortableHeader
                            label="Status"
                            field="is_active"
                            currentSort={{ field: sortField, direction: sortDirection }}
                            onSort={handleSort}
                          />
                          <SortableHeader
                            label="Records"
                            field="record_count"
                            currentSort={{ field: sortField, direction: sortDirection }}
                            onSort={handleSort}
                          />
                          <SortableHeader
                            label="Subscribers"
                            field="subscription_count"
                            currentSort={{ field: sortField, direction: sortDirection }}
                            onSort={handleSort}
                          />
                          <SortableHeader
                            label="Created"
                            field="created_at"
                            currentSort={{ field: sortField, direction: sortDirection }}
                            onSort={handleSort}
                          />
                          <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {loading ? (
                          <tr>
                            <td colSpan={6} className="px-6 py-12">
                              <LoadingSpinner />
                            </td>
                          </tr>
                        ) : (
                          reports.map((report, index) => (
                            <tr
                              key={report.report_id}
                              className={`hover:bg-indigo-50 transition-colors cursor-pointer ${
                                index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                              }`}
                              onClick={() => handleViewReport(report.report_id)}
                            >
                              {/* Title Column */}
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-lg flex items-center justify-center">
                                    <FileText className="w-5 h-5 text-indigo-600" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-sm font-semibold text-gray-900 truncate">
                                      {report.title}
                                    </p>
                                    <p className="text-xs text-gray-500 truncate max-w-xs">
                                      {report.description}
                                    </p>
                                  </div>
                                </div>
                              </td>

                              {/* Status Column */}
                              <td className="px-6 py-4 whitespace-nowrap">
                                <StatusBadge isActive={report.is_active} />
                              </td>

                              {/* Records Column */}
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <FileText className="w-4 h-4 text-blue-500" />
                                  <span className="text-sm font-semibold text-gray-900">
                                    {report.record_count.toLocaleString()}
                                  </span>
                                </div>
                              </td>

                              {/* Subscribers Column */}
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <Users className="w-4 h-4 text-purple-500" />
                                  <span className="text-sm font-semibold text-gray-900">
                                    {report.subscription_count.toLocaleString()}
                                  </span>
                                </div>
                              </td>

                              {/* Created Date Column */}
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4 text-gray-400" />
                                  <span className="text-sm text-gray-700">
                                    {new Date(report.created_at).toLocaleDateString()}
                                  </span>
                                </div>
                              </td>

                              {/* Actions Column */}
                              <td className="px-6 py-4 whitespace-nowrap text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleViewReport(report.report_id);
                                    }}
                                    className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                    title="View"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                  {isStaff && (
                                    <>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleEditReport(report.report_id);
                                        }}
                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                        title="Edit"
                                      >
                                        <Edit className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleOpenDeleteModal(report);
                                        }}
                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                        title="Delete"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {!loading && totalCount > 0 && (
                    <Pagination
                      currentPage={page}
                      totalPages={totalPages}
                      totalCount={totalCount}
                      pageSize={pageSize}
                      onPageChange={handlePageChange}
                      onPageSizeChange={handlePageSizeChange}
                      showFirstLast={true}
                    />
                  )}
                </div>
              )}

              {/* Card View - Grid */}
              {viewMode === 'card' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {reports.map((report) => (
                    <div
                      key={report.report_id}
                      className="bg-white rounded-xl border border-gray-200 hover:shadow-lg transition-all overflow-hidden group"
                    >
                      {/* Card Header */}
                      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 px-5 py-4 border-b border-gray-200">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900 mb-1 line-clamp-1">
                              {report.title}
                            </h3>
                            <div className="flex items-center gap-2">
                              <StatusBadge isActive={report.is_active} />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Card Body */}
                      <div className="p-5">
                        <p className="text-sm text-gray-600 mb-4 line-clamp-2 min-h-[40px]">
                          {report.description}
                        </p>

                        {/* Stats */}
                        <div className="grid grid-cols-2 gap-3 mb-4">
                          <div className="bg-blue-50 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <FileText className="w-4 h-4 text-blue-600" />
                              <span className="text-xs text-gray-600">Records</span>
                            </div>
                            <p className="text-lg font-bold text-blue-900">
                              {report.record_count.toLocaleString()}
                            </p>
                          </div>

                          <div className="bg-purple-50 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <Users className="w-4 h-4 text-purple-600" />
                              <span className="text-xs text-gray-600">Subscribers</span>
                            </div>
                            <p className="text-lg font-bold text-purple-900">
                              {report.subscription_count.toLocaleString()}
                            </p>
                          </div>
                        </div>

                        {/* Metadata */}
                        <div className="flex items-center gap-2 text-xs text-gray-500 mb-4 pb-4 border-b">
                          <Calendar className="w-3 h-3" />
                          <span>Created {new Date(report.created_at).toLocaleDateString()}</span>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleViewReport(report.report_id)}
                            className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition text-sm font-medium flex items-center justify-center gap-2"
                          >
                            <Eye className="w-4 h-4" />
                            View
                          </button>
                          {isStaff && (
                            <>
                              <button
                                onClick={() => handleEditReport(report.report_id)}
                                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm font-medium text-gray-700"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleOpenDeleteModal(report)}
                                className="px-4 py-2 border border-red-300 rounded-lg hover:bg-red-50 transition text-sm font-medium text-red-600"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setReportToDelete(null);
        }}
        onConfirm={handleDeleteReport}
        title="Delete Report"
        message="Are you sure you want to delete this report? All associated subscriptions will also be affected."
        itemName={reportToDelete?.title}
        isDeleting={isDeleting}
      />

      {/* Multi-User Subscription Modal */}
      {showSubscriptionModal && (
        <MultiUserSubscriptionModal
          onClose={() => setShowSubscriptionModal(false)}
          onSuccess={handleSubscriptionSuccess}
          reports={reports}
        />
      )}
    </DashboardLayout>
  );
};

export default CustomReportsPage;