// frontend/src/pages/SubscriptionManagementPage.jsx
// REDESIGNED: Table-based view matching UserManagementPage design with enhanced modals

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import DashboardLayout from '../components/layout/DashboardLayout';
import LoadingSpinner from '../components/LoadingSpinner';
import Pagination from '../components/database/Pagination';
import { ToastContainer } from '../components/Toast';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import { useToast } from '../hooks/useToast';
import api from '../utils/api';
import * as XLSX from 'xlsx';
import {
  Plus, Calendar, FileText, User, CheckCircle, XCircle,
  RefreshCw, Trash2, Search, Download, ChevronDown, Edit, X, Save,
  Clock, Users, Eye, DollarSign, Mail, Building
} from 'lucide-react';

// --- Badge Components ---
const StatusBadge = ({ status }) => {
  const statusStyles = {
    ACTIVE: 'bg-green-100 text-green-800 border-green-200',
    PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    EXPIRED: 'bg-gray-100 text-gray-800 border-gray-200',
    CANCELLED: 'bg-red-100 text-red-800 border-red-200',
  };

  const statusIcons = {
    ACTIVE: <CheckCircle className="w-3 h-3" />,
    PENDING: <Calendar className="w-3 h-3" />,
    EXPIRED: <XCircle className="w-3 h-3" />,
    CANCELLED: <XCircle className="w-3 h-3" />,
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${statusStyles[status] || statusStyles['PENDING']}`}>
      {statusIcons[status]}
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
};

const PlanBadge = ({ plan }) => {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
      plan === 'ANNUAL'
        ? 'bg-purple-100 text-purple-800 border-purple-200'
        : 'bg-blue-100 text-blue-800 border-blue-200'
    }`}>
      <Calendar className="w-3 h-3" />
      {plan === 'ANNUAL' ? 'Annual' : 'Monthly'}
    </span>
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

// --- Searchable Select Component ---
const SearchableSelect = ({
  options,
  value,
  onChange,
  placeholder,
  label,
  required,
  renderOption,
  searchKeys = ['label'],
  emptyMessage = 'No results found',
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredOptions, setFilteredOptions] = useState(options);
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // Filter options based on search term
  useEffect(() => {
    if (!searchTerm) {
      setFilteredOptions(options);
      return;
    }

    const searchLower = searchTerm.toLowerCase();
    const filtered = options.filter(option => {
      return searchKeys.some(key => {
        const val = option[key];
        return val && val.toString().toLowerCase().includes(searchLower);
      });
    });
    setFilteredOptions(filtered);
  }, [searchTerm, options, searchKeys]);

  // Handle clicks outside dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const selectedOption = options.find(opt => opt.value === value);

  const handleSelect = (option) => {
    onChange(option.value);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('');
    setSearchTerm('');
  };

  return (
    <div ref={dropdownRef} className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-left flex items-center justify-between bg-white ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-gray-400'
        }`}
      >
        <span className={selectedOption ? 'text-gray-900' : 'text-gray-500'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <div className="flex items-center gap-2">
            {selectedOption && !disabled && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  handleClear(e);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded cursor-pointer"
                role="button"
                aria-label="Clear selection"
              >
                <X className="w-4 h-4" />
              </span>
            )}
          <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-300 rounded-lg shadow-xl max-h-80 overflow-hidden">
          <div className="sticky top-0 p-3 bg-gray-50 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Type to search..."
                className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="overflow-y-auto max-h-64">
            {filteredOptions.length > 0 ? (
                filteredOptions.map((option, index) => (
                  <button
                    key={`${option.value}-${index}`}
                    type="button"
                    onClick={() => handleSelect(option)}
                    className="w-full text-left px-4 py-3 hover:bg-indigo-50 transition-colors border-b border-gray-100 last:border-b-0"
                  >
                    {renderOption(option)}
                  </button>
                ))
            ) : (
              <div className="px-4 py-8 text-center text-gray-500">
                <Search className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-sm">{emptyMessage}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// --- SUBSCRIPTION DETAIL MODAL COMPONENT ---
const SubscriptionDetailModal = ({ subscription, onClose, onEdit, onRenew, onCancel, onDelete, isStaff }) => {
  if (!subscription) return null;

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Determine display status
  let displayStatus = subscription.status;
  if (subscription.status === 'CANCELLED') {
    displayStatus = 'CANCELLED';
  } else if (subscription.is_active) {
    displayStatus = 'ACTIVE';
  } else {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = new Date(subscription.start_date);
    const endDate = new Date(subscription.end_date);

    if (startDate > today) {
      displayStatus = 'PENDING';
    } else if (endDate < today) {
      displayStatus = 'EXPIRED';
    } else {
      displayStatus = subscription.status;
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-indigo-600 to-purple-600">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                  <Eye className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Subscription Details</h2>
                  <p className="text-indigo-100 text-sm">Complete subscription information</p>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-white hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Status and Plan Section */}
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg p-6 border border-indigo-200">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                    Status
                  </label>
                  <StatusBadge status={displayStatus} />
                  {subscription.days_remaining !== null && subscription.days_remaining !== undefined && displayStatus === 'ACTIVE' && (
                    <p className="text-xs text-gray-600 mt-2">
                      <Clock className="w-3 h-3 inline mr-1" />
                      {subscription.days_remaining} days remaining
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                    Plan
                  </label>
                  <PlanBadge plan={subscription.plan} />
                </div>
              </div>
            </div>

            {/* Client Information */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-indigo-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Client Information</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
                    Name
                  </label>
                  <p className="text-sm text-gray-900 font-medium">{subscription.client_name || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
                    <Mail className="w-3 h-3 inline mr-1" />
                    Email
                  </label>
                  <p className="text-sm text-gray-900">{subscription.client_email || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Report Information */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <FileText className="w-5 h-5 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Report Information</h3>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
                  Report Title
                </label>
                <p className="text-sm text-gray-900 font-medium">{subscription.report_title || 'N/A'}</p>
              </div>
            </div>

            {/* Dates and Pricing */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Dates */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Period</h3>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
                      Start Date
                    </label>
                    <p className="text-sm text-gray-900">{formatDate(subscription.start_date)}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">
                      End Date
                    </label>
                    <p className="text-sm text-gray-900">{formatDate(subscription.end_date)}</p>
                  </div>
                </div>
              </div>

            </div>

            {/* Additional Information */}
            {subscription.notes && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Notes</h3>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{subscription.notes}</p>
              </div>
            )}

            {/* Metadata */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block text-gray-600 font-medium mb-1">Subscription ID</label>
                  <p className="text-gray-900 font-mono text-[10px] break-all">
                    {subscription.subscription_id}
                  </p>
                </div>
                <div>
                  <label className="block text-gray-600 font-medium mb-1">Created At</label>
                  <p className="text-gray-900">
                    {subscription.created_at ? formatDate(subscription.created_at) : 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="block text-gray-600 font-medium mb-1">Last Updated</label>
                  <p className="text-gray-900">
                    {subscription.updated_at ? formatDate(subscription.updated_at) : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        {isStaff && (
          <div className="p-6 border-t border-gray-200 bg-gray-50">
            <div className="flex flex-wrap gap-3 justify-end">
              <button
                onClick={onClose}
                className="px-5 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-100 font-medium text-sm transition-colors"
              >
                Close
              </button>
              {displayStatus !== 'CANCELLED' && (
                <button
                  onClick={() => {
                    onClose();
                    onRenew(subscription);
                  }}
                  className="px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm transition-colors flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Renew
                </button>
              )}
              <button
                onClick={() => {
                  onClose();
                  onEdit(subscription);
                }}
                className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-sm transition-colors flex items-center gap-2"
              >
                <Edit className="w-4 h-4" />
                Edit
              </button>
              {displayStatus === 'ACTIVE' && (
                <button
                  onClick={() => {
                    onClose();
                    onCancel(subscription);
                  }}
                  className="px-5 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium text-sm transition-colors flex items-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  Cancel
                </button>
              )}
              <button
                onClick={() => {
                  onClose();
                  onDelete(subscription);
                }}
                className="px-5 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium text-sm transition-colors flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// --- MAIN COMPONENT ---
const SubscriptionManagementPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toasts, removeToast, success, error: showError } = useToast();
  const isStaff = ['SUPERADMIN', 'STAFF_ADMIN'].includes(user?.role);

  // State
  const [loading, setLoading] = useState(true);
  const [subscriptions, setSubscriptions] = useState([]);
  const [stats, setStats] = useState({
    total_subscriptions: 0,
    active_subscriptions: 0,
    pending_subscriptions: 0,
    expired_subscriptions: 0,
  });

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Sorting
  const [sortField, setSortField] = useState('created_at');
  const [sortDirection, setSortDirection] = useState('desc');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState(null);
  const [renewingSubscription, setRenewingSubscription] = useState(null);
  const [selectedSubscription, setSelectedSubscription] = useState(null);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  useEffect(() => {
    if (!isStaff) {
      navigate('/client/subscriptions');
      return;
    }
    fetchSubscriptions();
    fetchStats();
  }, [page, pageSize, searchTerm, statusFilter, sortField, sortDirection]);

  const fetchSubscriptions = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        page_size: pageSize,
        search: searchTerm,
        status: statusFilter,
        ordering: sortDirection === 'desc' ? `-${sortField}` : sortField,
      };

      const response = await api.get('/api/subscriptions/', { params });
      setSubscriptions(response.data.results || []);
      setTotalCount(response.data.count || 0);
      setTotalPages(Math.ceil((response.data.count || 0) / pageSize));
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      showError('Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/api/subscription-stats/');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
  };

  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize);
    setPage(1);
  };

  const handleRowClick = (subscription, e) => {
    // Don't open modal if clicking on action buttons
    if (e.target.closest('button')) {
      return;
    }
    setSelectedSubscription(subscription);
    setShowDetailModal(true);
  };

  const handleOpenEditModal = (sub) => {
    setEditingSubscription(sub);
    setShowEditModal(true);
  };

  const handleOpenRenewModal = (sub) => {
    setRenewingSubscription(sub);
    setShowRenewModal(true);
  };

  const handleOpenCancelModal = (sub) => {
    setSelectedSubscription(sub);
    setIsCancelModalOpen(true);
  };

  const handleOpenDeleteModal = (sub) => {
    setSelectedSubscription(sub);
    setIsDeleteModalOpen(true);
  };

  const handleCancel = async () => {
    if (!selectedSubscription) return;

    try {
      await api.post(`/api/subscriptions/${selectedSubscription.subscription_id}/cancel/`);
      setIsCancelModalOpen(false);
      setSelectedSubscription(null);
      fetchSubscriptions();
      fetchStats();
      success('Subscription cancelled successfully!');
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      showError(error.response?.data?.error || 'Failed to cancel subscription');
    }
  };

  const handleDelete = async () => {
    if (!selectedSubscription) return;

    try {
      await api.delete(`/api/subscriptions/${selectedSubscription.subscription_id}/`);
      setIsDeleteModalOpen(false);
      setSelectedSubscription(null);
      fetchSubscriptions();
      fetchStats();
      success('Subscription deleted successfully!');
    } catch (error) {
      console.error('Error deleting subscription:', error);
      showError('Failed to delete subscription');
    }
  };

  const handleExport = () => {
    const exportData = subscriptions.map(sub => ({
      'Client Name': sub.client_name,
      'Client Email': sub.client_email,
      'Report Title': sub.report_title,
      'Plan': sub.plan,
      'Status': sub.status,
      'Start Date': sub.start_date,
      'End Date': sub.end_date,
      'Amount Paid': sub.amount_paid,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Subscriptions');
    XLSX.writeFile(workbook, 'subscriptions.xlsx');
    success('Subscriptions exported successfully!');
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).replace(/\//g, '.');
  };

  const pageSubtitle = (
    <p className="text-sm text-white-500">Manage all client subscriptions and renewals.</p>
  );

  return (
    <DashboardLayout
      pageTitle="Subscription Management"
      pageSubtitleBottom={pageSubtitle}
    >
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      <div className="p-8">
        {/* Stats Cards */}
        {isStaff && stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-5 border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-blue-600">Total Subscriptions</h3>
              <FileText className="w-8 h-8 text-blue-600 opacity-75" />
            </div>
            <p className="text-3xl font-bold text-blue-900">{stats.total_subscriptions}</p>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-5 border border-green-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-green-600">Active</h3>
              <CheckCircle className="w-8 h-8 text-green-600 opacity-75" />
            </div>
            <p className="text-3xl font-bold text-green-900">{stats.active_subscriptions}</p>
          </div>

          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-5 border border-yellow-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-yellow-600">Expiring Soon</h3>
              <Clock className="w-8 h-8 text-yellow-600 opacity-75" />
            </div>
            <p className="text-3xl font-bold text-yellow-900">{stats.expiring_soon}</p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-5 border border-purple-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-purple-600">Clients</h3>
              <User className="w-8 h-8 text-purple-600 opacity-75" />
            </div>
            <p className="text-3xl font-bold text-purple-900">{stats.total_clients || 0}</p>
          </div>
        </div>
        )}

        {/* Table Container */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          {/* Toolbar */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
              {/* Search and Filter */}
              <div className="w-full lg:w-auto flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search by client, report, or plan..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setPage(1);
                    }}
                    className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => {
                        setSearchTerm('');
                        setPage(1);
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      title="Clear search"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition bg-white cursor-pointer appearance-none"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                    backgroundPosition: 'right 0.5rem center',
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: '1.5em 1.5em',
                    paddingRight: '2.5rem'
                  }}
                >
                  <option value="">All Status</option>
                  <option value="ACTIVE">Active</option>
                  <option value="PENDING">Pending</option>
                  <option value="EXPIRED">Expired</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              {/* Action Buttons */}
              {isStaff && (
                <div className="flex gap-3 w-full lg:w-auto">
                  <button
                    onClick={handleExport}
                    className="flex-1 lg:flex-none px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2 shadow-md text-sm"
                  >
                    <Download className="w-5 h-5" />
                    Export to Excel
                  </button>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex-1 lg:flex-none px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center justify-center gap-2 shadow-md text-sm"
                  >
                    <Plus className="w-5 h-5" />
                    Add Subscription
                  </button>
                </div>
              )}
            </div>
          </div>
          {/* Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <SortableHeader
                    label="Client Name"
                    field="client_name"
                    currentSort={{ field: sortField, direction: sortDirection }}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Report Title"
                    field="report_title"
                    currentSort={{ field: sortField, direction: sortDirection }}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Plan"
                    field="plan"
                    currentSort={{ field: sortField, direction: sortDirection }}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Status"
                    field="status"
                    currentSort={{ field: sortField, direction: sortDirection }}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    label="Period"
                    field="start_date"
                    currentSort={{ field: sortField, direction: sortDirection }}
                    onSort={handleSort}
                  />
                  {isStaff && (
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={isStaff ? 6 : 5} className="px-6 py-12">
                      <LoadingSpinner />
                    </td>
                  </tr>
                ) : subscriptions.length === 0 ? (
                  <tr>
                    <td colSpan={isStaff ? 6 : 5} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center text-gray-500">
                        <FileText className="w-12 h-12 text-gray-300 mb-3" />
                        <p className="text-lg font-medium">No subscriptions found</p>
                        <p className="text-sm mt-1">Try adjusting your filters or create a new subscription</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  subscriptions.map((sub, index) => {
                    // Determine correct display status
                    let displayStatus = sub.status;

                    if (sub.status === 'CANCELLED') {
                      displayStatus = 'CANCELLED';
                    } else if (sub.is_active) {
                      displayStatus = 'ACTIVE';
                    } else {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const startDate = new Date(sub.start_date);
                      const endDate = new Date(sub.end_date);

                      if (startDate > today) {
                        displayStatus = 'PENDING';
                      } else if (endDate < today) {
                        displayStatus = 'EXPIRED';
                      } else {
                        displayStatus = sub.status;
                      }
                    }

                    return (
                      <tr
                        key={sub.subscription_id}
                        onClick={(e) => handleRowClick(sub, e)}
                        className={`hover:bg-indigo-50 transition-colors cursor-pointer ${
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                        }`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center font-bold text-indigo-600">
                              {sub.client_name ? sub.client_name.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-900">{sub.client_name}</p>
                              <p className="text-xs text-gray-500">{sub.client_email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 font-medium max-w-xs truncate" title={sub.report_title}>
                            {sub.report_title}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <PlanBadge plan={sub.plan} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <StatusBadge status={displayStatus} />
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className='flex items-center gap-2'>
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <div>
                              <p className="text-sm text-gray-800 font-medium">{formatDate(sub.start_date)}</p>
                              <p className="text-xs text-gray-500">to {formatDate(sub.end_date)}</p>
                            </div>
                          </div>
                        </td>

                        {isStaff && (
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end gap-1">
                              {displayStatus !== 'CANCELLED' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenRenewModal(sub);
                                  }}
                                  className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-all"
                                  title="Renew subscription"
                                >
                                  <RefreshCw className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenEditModal(sub);
                                }}
                                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              {displayStatus === 'ACTIVE' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenCancelModal(sub);
                                  }}
                                  className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-all"
                                  title="Cancel"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenDeleteModal(sub);
                                }}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
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
      </div>

      {/* Subscription Detail Modal */}
      {showDetailModal && selectedSubscription && (
        <SubscriptionDetailModal
          subscription={selectedSubscription}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedSubscription(null);
          }}
          onEdit={handleOpenEditModal}
          onRenew={handleOpenRenewModal}
          onCancel={handleOpenCancelModal}
          onDelete={handleOpenDeleteModal}
          isStaff={isStaff}
        />
      )}

      {/* Create Subscription Modal */}
      {showCreateModal && (
        <SubscriptionFormModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchSubscriptions();
            fetchStats();
            success('Subscription created successfully!');
          }}
          onError={(msg) => showError(msg || 'Failed to create subscription')}
        />
      )}

      {/* Edit Subscription Modal */}
      {showEditModal && editingSubscription && (
        <SubscriptionFormModal
          subscription={editingSubscription}
          onClose={() => {
            setShowEditModal(false);
            setEditingSubscription(null);
          }}
          onSuccess={() => {
            setShowEditModal(false);
            setEditingSubscription(null);
            fetchSubscriptions();
            fetchStats();
            success('Subscription updated successfully!');
          }}
          onError={(msg) => showError(msg || 'Failed to update subscription')}
        />
      )}

      {/* Renew Subscription Modal */}
      {showRenewModal && renewingSubscription && (
        <RenewSubscriptionModal
          subscription={renewingSubscription}
          onClose={() => {
            setShowRenewModal(false);
            setRenewingSubscription(null);
          }}
          onSuccess={() => {
            setShowRenewModal(false);
            setRenewingSubscription(null);
            fetchSubscriptions();
            fetchStats();
            success('Subscription renewed successfully!');
          }}
          onError={(msg) => showError(msg || 'Failed to renew subscription')}
        />
      )}

      {/* Cancel Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isCancelModalOpen}
        onClose={() => {
          setIsCancelModalOpen(false);
          setSelectedSubscription(null);
        }}
        onConfirm={handleCancel}
        title="Cancel Subscription"
        message="Are you sure you want to cancel this subscription?"
        itemName={selectedSubscription ? `${selectedSubscription.client_name} - ${selectedSubscription.report_title}` : ''}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedSubscription(null);
        }}
        onConfirm={handleDelete}
        title="Delete Subscription"
        message="Are you sure you want to delete this subscription?"
        itemName={selectedSubscription ? `${selectedSubscription.client_name} - ${selectedSubscription.report_title}` : ''}
      />
    </DashboardLayout>
  );
};

// --- SUBSCRIPTION FORM MODAL COMPONENT ---
const SubscriptionFormModal = ({ subscription, onClose, onSuccess, onError }) => {
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState([]);
  const [reports, setReports] = useState([]);
  const [formData, setFormData] = useState({
    client: '',
    report: '',
    plan: 'MONTHLY',
    status: 'ACTIVE',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
  });

  // When 'subscription' (for editing) is passed in, update the form
  useEffect(() => {
    if (subscription) {
      setFormData({
        client: subscription.client,
        report: subscription.report,
        plan: subscription.plan,
        status: subscription.status,
        start_date: subscription.start_date,
        end_date: subscription.end_date,
      });
    } else {
      const startDate = new Date().toISOString().split('T')[0];
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1);
      setFormData({
        client: '',
        report: '',
        plan: 'MONTHLY',
        status: 'ACTIVE',
        start_date: startDate,
        end_date: endDate.toISOString().split('T')[0],
      });
    }

    fetchClients();
    fetchReports();
  }, [subscription]);

  const fetchClients = async () => {
    try {
      const response = await api.get('/api/clients/');
      setClients(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const fetchReports = async () => {
    try {
      const response = await api.get('/api/custom-reports/');
      setReports(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching reports:', error);
    }
  };

  const handlePlanChange = (newPlan) => {
    setFormData(prev => {
      const newFormData = { ...prev, plan: newPlan };

      if (newFormData.start_date) {
        const startDate = new Date(newFormData.start_date);
        if (!isNaN(startDate)) {
          const endDate = new Date(startDate);
          if (newPlan === 'MONTHLY') {
            endDate.setMonth(endDate.getMonth() + 1);
          } else {
            endDate.setFullYear(endDate.getFullYear() + 1);
          }
          newFormData.end_date = endDate.toISOString().split('T')[0];
        }
      }
      return newFormData;
    });
  };

  const handleStartDateChange = (newStartDate) => {
    setFormData(prev => {
      const newFormData = { ...prev, start_date: newStartDate };

      if (newStartDate) {
        const startDate = new Date(newStartDate);
        if (!isNaN(startDate)) {
          const endDate = new Date(startDate);
          if (newFormData.plan === 'MONTHLY') {
            endDate.setMonth(endDate.getMonth() + 1);
          } else {
            endDate.setFullYear(endDate.getFullYear() + 1);
          }
          newFormData.end_date = endDate.toISOString().split('T')[0];
        }
      }
      return newFormData;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

  if (!formData.client) {
    onError('Please select a client');
    return;
  }

  if (!formData.report) {
    onError('Please select a report');
    return;
  }

    setLoading(true);

    try {
      const payload = {
        client: formData.client,
        report: formData.report,
        plan: formData.plan,
        status: formData.status,
        start_date: formData.start_date,
        end_date: formData.end_date,
        amount_paid: 0.00,
        notes: '',
      };

      if (subscription) {
        await api.patch(`/api/subscriptions/${subscription.subscription_id}/`, payload);
      } else {
        await api.post('/api/subscriptions/', payload);
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving subscription:', error);
      let errorMessage = 'An unknown error occurred.';
      if (error.response?.data) {
        const data = error.response.data;
        if (data.detail) {
          errorMessage = data.detail;
        } else if (data.error) {
          errorMessage = data.error;
        } else if (Array.isArray(data.non_field_errors)) {
          errorMessage = data.non_field_errors.join(' ');
        } else if (typeof data === 'string') {
          errorMessage = data;
        } else if (typeof data === 'object') {
          if (data.report && Array.isArray(data.report)) {
            errorMessage = data.report.join(' ');
          } else {
            errorMessage = Object.values(data).flat().join(' ');
          }
        }
      }
      onError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

    const clientOptions = clients
      .filter(client => client.id != null && client.id !== undefined)
      .map((client, index) => ({
        value: client.id,
        label: client.full_name || client.username || 'Unknown',
        email: client.email || '',
        company: client.company_name || '',
        searchText: `${client.full_name || ''} ${client.username || ''} ${client.email || ''} ${client.company_name || ''}`.toLowerCase()
      }));

    const reportOptions = reports
      .filter(report => report.id != null && report.id !== undefined)
      .map((report, index) => ({
        value: report.id,
        label: report.title || 'Untitled Report',
        recordCount: report.record_count || 0,
        description: report.description || '',
        searchText: `${report.title || ''} ${report.description || ''}`.toLowerCase()
      }));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {subscription ? 'Edit Subscription' : 'Create New Subscription'}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {subscription ? 'Update subscription details' : 'Add a new subscription for a client'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Client Selection */}
          <SearchableSelect
            options={clientOptions}
            value={formData.client}
            onChange={(value) => setFormData(prev => ({ ...prev, client: value }))}
            placeholder="Select a client"
            label="Client"
            required
            disabled={!!subscription}
            searchKeys={['label', 'email', 'company', 'searchText']}
            renderOption={(option) => (
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  <User className="w-5 h-5 text-red-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 text-sm truncate">{option.label}</div>
                  <div className="text-sm text-gray-500 truncate">{option.email}</div>
                  {option.company && (
                    <div className="text-xs text-gray-400 truncate">{option.company}</div>
                  )}
                </div>
              </div>
            )}
            emptyMessage="No clients found. Try a different search term."
          />

          {/* Report Selection */}
          <SearchableSelect
            options={reportOptions}
            value={formData.report}
            onChange={(value) => setFormData(prev => ({ ...prev, report: value }))}
            placeholder="Select a report"
            label="Report"
            required
            disabled={!!subscription}
            searchKeys={['label', 'description', 'searchText']}
            renderOption={(option) => (
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  <FileText className="w-5 h-5 text-purple-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 text-sm truncate">{option.label}</div>
                  <div className="text-sm text-gray-500">
                    {option.recordCount} records
                  </div>
                  {option.description && (
                    <div className="text-xs text-gray-400 mt-1 line-clamp-2">{option.description}</div>
                  )}
                </div>
              </div>
            )}
            emptyMessage="No reports found. Try a different search term."
          />

          {/* Plan Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subscription Plan <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handlePlanChange('MONTHLY')}
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
                  <div className="text-xs text-gray-500 mt-1">1 month duration</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handlePlanChange('ANNUAL')}
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
                  <div className="text-xs text-gray-500 mt-1">1 year duration</div>
                </div>
              </button>
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
              required
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="ACTIVE">Active</option>
              <option value="PENDING">Pending</option>
            </select>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.start_date}
                onChange={(e) => handleStartDateChange(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.end_date}
                onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Info Box */}
          <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
            <div className="flex gap-3">
              <Calendar className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-indigo-900">Subscription Duration</p>
                <p className="text-sm text-indigo-700 mt-1">
                  {formData.plan === 'MONTHLY' ? 'Monthly subscription' : 'Annual subscription'}
                </p>
              </div>
            </div>
          </div>
        </form>

        <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-5 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-100 font-medium text-sm transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-sm disabled:opacity-50 flex items-center gap-2 transition-colors"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {subscription ? 'Update Subscription' : 'Create Subscription'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// --- RENEW SUBSCRIPTION MODAL COMPONENT ---
const RenewSubscriptionModal = ({ subscription, onClose, onSuccess, onError }) => {
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState(subscription.plan);

  const handleRenew = async () => {
    setLoading(true);
    try {
      const payload = plan !== subscription.plan ? { plan } : {};
      await api.post(`/api/subscriptions/${subscription.subscription_id}/renew/`, payload);
      onSuccess();
    } catch (error) {
      console.error('Error renewing subscription:', error);
      onError(error.response?.data?.error || 'Failed to renew subscription');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Renew Subscription</h2>
              <p className="text-sm text-gray-600 mt-1">Extend the subscription period</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Client:</span>
              <span className="text-sm text-gray-900">{subscription.client_name}</span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Report:</span>
              <span className="text-sm text-gray-900">{subscription.report_title}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Current End Date:</span>
              <span className="text-sm text-gray-900">
                {new Date(subscription.end_date).toLocaleDateString()}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Renewal Plan
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPlan('MONTHLY')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  plan === 'MONTHLY'
                    ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-center">
                  <div className={`text-lg font-bold ${
                    plan === 'MONTHLY' ? 'text-indigo-700' : 'text-gray-900'
                  }`}>
                    Monthly
                  </div>
                  <div className="text-xs text-gray-500 mt-1">+1 month</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPlan('ANNUAL')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  plan === 'ANNUAL'
                    ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-center">
                  <div className={`text-lg font-bold ${
                    plan === 'ANNUAL' ? 'text-indigo-700' : 'text-gray-900'
                  }`}>
                    Annual
                  </div>
                  <div className="text-xs text-gray-500 mt-1">+1 year</div>
                </div>
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-5 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-100 font-medium text-sm transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleRenew}
            disabled={loading}
            className="px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm disabled:opacity-50 flex items-center gap-2 transition-colors"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Renewing...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Renew Subscription
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionManagementPage;