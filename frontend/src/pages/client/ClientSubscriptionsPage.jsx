import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CreditCard, Calendar, CheckCircle, X, AlertCircle, Clock, DollarSign,
  TrendingUp, FileText, Search, Filter as FilterIcon
} from 'lucide-react';
import ClientDashboardLayout from '../../components/layout/ClientDashboardLayout';
import LoadingSpinner from '../../components/LoadingSpinner';
import api from '../../utils/api';

const ClientSubscriptionsPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [subscriptions, setSubscriptions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all, active, expiring, expired

  // Helper function to get actual plan based on duration
  const getActualPlan = (subscription) => {
    const startDate = new Date(subscription.start_date);
    const endDate = new Date(subscription.end_date);
    const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

    // If the period is more than 60 days, it's annual
    return daysDiff > 60 ? 'ANNUAL' : 'MONTHLY';
  };

  // Helper function to format plan display
  const formatPlan = (subscription) => {
    const actualPlan = getActualPlan(subscription);
    return actualPlan === 'ANNUAL' ? 'Annual' : 'Monthly';
  };

  useEffect(() => {
    loadSubscriptions();
  }, []);

  const loadSubscriptions = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/client/subscriptions/');
      // Get all subscriptions (both active and inactive)
      const allSubs = response.data;
      setSubscriptions(allSubs);
    } catch (error) {
      console.error('Error loading subscriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSubscriptions = subscriptions.filter(sub => {
    // Search filter
    const matchesSearch = sub.report_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         sub.report_description.toLowerCase().includes(searchQuery.toLowerCase());

    // Status filter
    let matchesStatus = true;
    if (filterStatus === 'active') {
      matchesStatus = sub.is_active && sub.days_remaining > 30;
    } else if (filterStatus === 'expiring') {
      matchesStatus = sub.is_active && sub.days_remaining <= 30;
    } else if (filterStatus === 'expired') {
      matchesStatus = !sub.is_active;
    }

    return matchesSearch && matchesStatus;
  });

  // Calculate stats
  const activeCount = subscriptions.filter(s => s.is_active).length;
  const expiringCount = subscriptions.filter(s => s.is_active && s.days_remaining <= 30).length;
  const expiredCount = subscriptions.filter(s => !s.is_active).length;
  const totalValue = subscriptions.reduce((sum, s) => sum + (s.amount_paid || 0), 0);

  if (loading) {
    return (
      <ClientDashboardLayout>
        <div className="flex items-center justify-center h-full">
          <LoadingSpinner />
        </div>
      </ClientDashboardLayout>
    );
  }

  return (
    <ClientDashboardLayout
      pageTitle="My Subscriptions"
      pageSubtitleBottom="Manage and track all your report subscriptions"
    >
      <div className="p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-xl rounded-xl flex items-center justify-center">
                <CheckCircle className="w-6 h-6" />
              </div>
            </div>
            <p className="text-sm text-green-100 mb-1 font-medium">Active Subscriptions</p>
            <p className="text-4xl font-bold">{activeCount}</p>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-xl rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6" />
              </div>
            </div>
            <p className="text-sm text-orange-100 mb-1 font-medium">Expiring Soon</p>
            <p className="text-4xl font-bold">{expiringCount}</p>
          </div>

          <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-xl rounded-xl flex items-center justify-center">
                <AlertCircle className="w-6 h-6" />
              </div>
            </div>
            <p className="text-sm text-red-100 mb-1 font-medium">Expired</p>
            <p className="text-4xl font-bold">{expiredCount}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm p-5 mb-6 border border-gray-100">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[300px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search subscriptions..."
                className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
                {searchQuery && (
                  <button
                  type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="w-5 h-5 text-red-400" />
                  </button>
                )}                 
            </div>

            <div className="flex items-center gap-2">
              <FilterIcon className="w-5 h-5 text-gray-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent font-medium"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="expiring">Expiring Soon</option>
                <option value="expired">Expired</option>
              </select>
            </div>
          </div>
        </div>

        {/* Subscriptions List */}
        {filteredSubscriptions.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-16 text-center">
            <CreditCard className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Subscriptions Found</h3>
            <p className="text-gray-600">
              {searchQuery ? 'Try adjusting your search terms' : 'You don\'t have any subscriptions yet'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
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
                      Plan
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredSubscriptions.map((sub) => {
                    const isExpiringSoon = sub.is_active && sub.days_remaining <= 30;
                    const actualPlan = getActualPlan(sub);

                    return (
                      <tr key={sub.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
                              <FileText className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-900">{sub.report_title}</p>
                              <p className="text-xs text-gray-500 line-clamp-1">{sub.report_description}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {sub.is_active ? (
                            isExpiringSoon ? (
                              <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-semibold bg-orange-100 text-orange-700">
                                <Clock className="w-3 h-3 mr-1" />
                                Expiring Soon
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-semibold bg-green-100 text-green-700">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Active
                              </span>
                            )
                          ) : (
                            <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-semibold bg-red-100 text-red-700">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              Expired
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <div>
                              <p className="font-medium">{new Date(sub.start_date).toLocaleDateString()}</p>
                              <p className="text-xs text-gray-400">to {new Date(sub.end_date).toLocaleDateString()}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold ${
                            actualPlan === 'ANNUAL'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {formatPlan(sub)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          {sub.is_active ? (
                            <button
                              onClick={() => navigate(`/client/reports/${sub.report_id}`)}
                              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl text-sm font-medium hover:from-purple-700 hover:to-blue-700 transition-all shadow-md"
                            >
                              View Report
                            </button>
                          ) : (
                            <button
                              disabled
                              className="px-4 py-2 bg-gray-100 text-gray-400 rounded-xl text-sm font-medium cursor-not-allowed"
                            >
                              Expired
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </ClientDashboardLayout>
  );
};

export default ClientSubscriptionsPage;