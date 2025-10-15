// frontend/src/pages/SubscriptionManagementPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import DashboardLayout from '../components/layout/DashboardLayout';
import LoadingSpinner from '../components/LoadingSpinner';
import api from '../utils/api';
import { ArrowLeft, X, Plus, Calendar, FileText, User, Clock, CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';

const SubscriptionManagementPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [renewingSubscription, setRenewingSubscription] = useState(null);

  const isStaff = user?.role === 'SUPERADMIN' || user?.role === 'STAFF_ADMIN';

  useEffect(() => {
    fetchSubscriptions();
    if (isStaff) {
      fetchStats();
    }
  }, [filterStatus]);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filterStatus) params.status = filterStatus;

      const endpoint = isStaff ? '/api/subscriptions/' : '/api/my-subscriptions/';
      const response = await api.get(endpoint, { params });
      setSubscriptions(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
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

  const handleOpenRenewModal = (subscription) => {
    setRenewingSubscription(subscription);
    setShowRenewModal(true);
  };

  const handleRenewSuccess = () => {
    setShowRenewModal(false);
    setRenewingSubscription(null);
    fetchSubscriptions();
    if (isStaff) fetchStats();
  };

  const handleCancel = async (subscriptionId) => {
    if (!window.confirm('Are you sure you want to cancel this subscription?')) {
      return;
    }

    try {
      await api.post(`/api/subscriptions/${subscriptionId}/cancel/`);
      fetchSubscriptions();
      if (isStaff) fetchStats();
      alert('Subscription cancelled successfully!');
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      alert('Failed to cancel subscription');
    }
  };

  const getStatusBadge = (status, isActive, daysRemaining) => {
    if (status === 'CANCELLED') {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <XCircle className="w-3 h-3 mr-1" />
          Cancelled
        </span>
      );
    }

    if (status === 'EXPIRED' || !isActive) {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          <AlertCircle className="w-3 h-3 mr-1" />
          Expired
        </span>
      );
    }

    if (daysRemaining <= 7) {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          <Clock className="w-3 h-3 mr-1" />
          Expiring Soon
        </span>
      );
    }

    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
        <CheckCircle className="w-3 h-3 mr-1" />
        Active
      </span>
    );
  };

  if (loading && subscriptions.length === 0) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <LoadingSpinner />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white px-8 py-8 shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <button
            onClick={() => navigate('/staff-dashboard')}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold">
            {isStaff ? 'Subscription Management' : 'My Subscriptions'}
          </h1>
        </div>
        <p className="text-indigo-100 text-sm ml-12">
          {isStaff
            ? 'Manage all client subscriptions'
            : 'View and manage your active subscriptions'}
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto bg-white">
        <div className="max-w-7xl mx-auto px-8 py-6">
          {/* Stats for Staff */}
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

          {/* Action Bar */}
          <div className="flex items-center justify-between mb-6">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="EXPIRED">Expired</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="PENDING">Pending</option>
            </select>

            {isStaff && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center gap-2 shadow-md"
              >
                <Plus className="w-5 h-5" />
                Create Subscription
              </button>
            )}
          </div>

          {/* Subscriptions List */}
          {subscriptions.length === 0 ? (
            <div className="text-center py-16 bg-gray-50 rounded-lg">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No subscriptions found</h3>
              <p className="text-gray-600">
                {isStaff ? 'Create a new subscription to get started.' : "You don't have any subscriptions yet."}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {isStaff && (
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Client
                        </th>
                      )}
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Report
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Period
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Days Left
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {subscriptions.map((subscription) => (
                      <tr key={subscription.subscription_id} className="hover:bg-gray-50 transition-colors">
                        {isStaff && (
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                                <User className="w-5 h-5 text-indigo-600" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {subscription.client_name}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {subscription.client_email}
                                </p>
                              </div>
                            </div>
                          </td>
                        )}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-gray-400" />
                            <span className="text-sm font-medium text-gray-900">
                              {subscription.report_title}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(subscription.status, subscription.is_active, subscription.days_remaining)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <div>
                              <p>{new Date(subscription.start_date).toLocaleDateString()}</p>
                              <p className="text-xs text-gray-400">
                                to {new Date(subscription.end_date).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {subscription.is_active ? (
                            <span className={`text-sm font-medium ${subscription.days_remaining <= 7 ? 'text-yellow-600' : 'text-gray-600'}`}>
                              {subscription.days_remaining} days
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex justify-end gap-2">
                            {!isStaff && subscription.is_active && (
                              <button
                                onClick={() => navigate(`/custom-reports/${subscription.report}`)}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm font-medium"
                              >
                                View Report
                              </button>
                            )}
                            {isStaff && (
                              <>
                                {subscription.status === 'ACTIVE' && (
                                  <>
                                    <button
                                      onClick={() => handleOpenRenewModal(subscription)}
                                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium flex items-center gap-2"
                                      title="Renew"
                                    >
                                      <RefreshCw className="w-4 h-4" />
                                      Renew
                                    </button>
                                    <button
                                      onClick={() => handleCancel(subscription.subscription_id)}
                                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-medium"
                                      title="Cancel"
                                    >
                                      Cancel
                                    </button>
                                  </>
                                )}
                                {subscription.status === 'EXPIRED' && (
                                  <button
                                    onClick={() => handleOpenRenewModal(subscription)}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium flex items-center gap-2"
                                  >
                                    <RefreshCw className="w-4 h-4" />
                                    Reactivate
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Subscription Modal */}
      {showCreateModal && (
        <CreateSubscriptionModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchSubscriptions();
            if (isStaff) fetchStats();
          }}
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
          onSuccess={handleRenewSuccess}
        />
      )}
    </DashboardLayout>
  );
};

// Renew Subscription Modal Component
const RenewSubscriptionModal = ({ subscription, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(subscription.plan);

  // Calculate new dates
  const calculateNewDates = (plan) => {
    const currentEndDate = new Date(subscription.end_date);
    const newStartDate = new Date(currentEndDate);
    newStartDate.setDate(newStartDate.getDate() + 1);

    const newEndDate = new Date(newStartDate);
    if (plan === 'MONTHLY') {
      newEndDate.setMonth(newEndDate.getMonth() + 1);
    } else {
      newEndDate.setFullYear(newEndDate.getFullYear() + 1);
    }

    return { newStartDate, newEndDate };
  };

  const { newStartDate, newEndDate } = calculateNewDates(selectedPlan);

  const handleRenew = async () => {
    try {
      setLoading(true);
      await api.post(`/api/subscriptions/${subscription.subscription_id}/renew/`, {
        plan: selectedPlan
      });
      alert('Subscription renewed successfully!');
      onSuccess();
    } catch (error) {
      console.error('Error renewing subscription:', error);
      alert(error.response?.data?.error || 'Failed to renew subscription');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-5 rounded-t-xl">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <RefreshCw className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Renew Subscription</h2>
                <p className="text-green-100 text-sm">Extend subscription period</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Current Subscription Info */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Current Subscription</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Client:</span>
                <span className="font-medium text-gray-900">{subscription.client_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Report:</span>
                <span className="font-medium text-gray-900">{subscription.report_title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Current Plan:</span>
                <span className="font-medium text-gray-900 capitalize">{subscription.plan.toLowerCase()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Expires:</span>
                <span className="font-medium text-gray-900">
                  {new Date(subscription.end_date).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {/* Plan Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Select Renewal Plan
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSelectedPlan('MONTHLY')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  selectedPlan === 'MONTHLY'
                    ? 'border-green-500 bg-green-50 ring-2 ring-green-200'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-center">
                  <div className={`text-lg font-bold ${
                    selectedPlan === 'MONTHLY' ? 'text-green-700' : 'text-gray-900'
                  }`}>
                    Monthly
                  </div>
                  <div className="text-xs text-gray-500 mt-1">1 month extension</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedPlan('ANNUAL')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  selectedPlan === 'ANNUAL'
                    ? 'border-green-500 bg-green-50 ring-2 ring-green-200'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-center">
                  <div className={`text-lg font-bold ${
                    selectedPlan === 'ANNUAL' ? 'text-green-700' : 'text-gray-900'
                  }`}>
                    Annual
                  </div>
                  <div className="text-xs text-gray-500 mt-1">1 year extension</div>
                </div>
              </button>
            </div>
          </div>

          {/* New Period */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
            <h3 className="text-sm font-semibold text-green-900 mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              New Subscription Period
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-green-700">Start Date:</span>
                <span className="font-bold text-green-900">
                  {newStartDate.toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-700">End Date:</span>
                <span className="font-bold text-green-900">
                  {newEndDate.toLocaleDateString()}
                </span>
              </div>
              <div className="pt-2 border-t border-green-200">
                <div className="flex justify-between items-center">
                  <span className="text-green-700">Total Duration:</span>
                  <span className="font-bold text-green-900">
                    {selectedPlan === 'MONTHLY' ? '1 Month' : '1 Year'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-xl flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-5 py-3 bg-white text-gray-700 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleRenew}
            disabled={loading}
            className="flex-1 px-5 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all font-medium shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Renewing...
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                Confirm Renewal
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// Create Subscription Modal - Same as before
const CreateSubscriptionModal = ({ onClose, onSuccess }) => {
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
    notes: ''
  });

  useEffect(() => {
    fetchClients();
    fetchReports();
  }, []);

  useEffect(() => {
    if (formData.start_date) {
      const startDate = new Date(formData.start_date);
      const endDate = new Date(startDate);
      endDate.setFullYear(endDate.getFullYear() + 1);

      setFormData(prev => ({
        ...prev,
        end_date: endDate.toISOString().split('T')[0]
      }));
    }
  }, [formData.start_date]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      const submitData = {
        ...formData,
        amount_paid: 0.00
      };

      await api.post('/api/subscriptions/', submitData);
      alert('Subscription created successfully!');
      onSuccess();
    } catch (error) {
      console.error('Error creating subscription:', error);
      alert(error.response?.data?.error || 'Failed to create subscription');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-4 rounded-t-xl">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Create New Subscription</h2>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Client *
            </label>
            <select
              value={formData.client}
              onChange={(e) => setFormData(prev => ({ ...prev, client: e.target.value }))}
              required
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
            >
              <option value="">Select a client</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.full_name} ({client.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Report *
            </label>
            <select
              value={formData.report}
              onChange={(e) => setFormData(prev => ({ ...prev, report: e.target.value }))}
              required
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
            >
              <option value="">Select a report</option>
              {reports.map((report) => (
                <option key={report.report_id} value={report.report_id}>
                  {report.title} ({report.record_count} records)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Status *
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Start Date *
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
                End Date *
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

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              placeholder="Add any additional notes..."
            />
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Subscription'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-white text-gray-700 px-6 py-3 rounded-lg border-2 border-gray-300 hover:bg-gray-50 transition-all font-semibold"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SubscriptionManagementPage;