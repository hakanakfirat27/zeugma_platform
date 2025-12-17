import { useState, useEffect } from 'react';
import { useNavigate, useLocation  } from 'react-router-dom';
import { getBreadcrumbs } from '../../utils/breadcrumbConfig';
import { useAuth } from '../../contexts/AuthContext';
import {
  FileText, CreditCard, TrendingUp, Calendar, AlertCircle, CheckCircle,
  BarChart3, PieChart as PieIcon, Activity, Clock
} from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import ClientDashboardLayout from '../../components/layout/ClientDashboardLayout';
import LoadingSpinner from '../../components/LoadingSpinner';
import api from '../../utils/api';


const COLORS = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899'];

const ClientDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();  
  const breadcrumbs = getBreadcrumbs(location.pathname); 
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalReports: 0,
    activeSubscriptions: 0,
    expiringSubscriptions: 0,
    totalCompanies: 0,
    reports: [],
    subscriptions: []
  });

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      setLoading(true);

      // Load subscriptions
      const subsResponse = await api.get('/api/client/subscriptions/');
      const subscriptions = subsResponse.data;

      // Calculate stats
      const today = new Date();
      const thirtyDaysFromNow = new Date(today);
      thirtyDaysFromNow.setDate(today.getDate() + 30);

      const activeSubscriptions = subscriptions.filter(sub => sub.is_active).length;
      const expiringSubscriptions = subscriptions.filter(sub => {
        const endDate = new Date(sub.end_date);
        return sub.is_active && endDate <= thirtyDaysFromNow && endDate > today;
      }).length;

      // Calculate total companies from all reports
      const totalCompanies = subscriptions.reduce((sum, sub) => {
        // You might need to fetch this from report stats
        return sum;
      }, 0);

      setStats({
        totalReports: subscriptions.length,
        activeSubscriptions,
        expiringSubscriptions,
        totalCompanies,
        reports: subscriptions,
        subscriptions: subscriptions
      });
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDisplayName = () => {
    if (user?.first_name && user?.last_name) {
      return `${user.first_name} ${user.last_name}`;
    } else if (user?.first_name) {
      return user.first_name;
    } else if (user?.username) {
      return user.username;
    }
    return 'User';
  };

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
      pageTitle="Dashboard Overview"
      breadcrumbs={breadcrumbs}
      pageSubtitleBottom={
        <p className="text-gray-600">
          Welcome back, <span className="font-semibold text-purple-950">{getDisplayName()}</span>! Here's your subscription summary
        </p>
      }
    >
      <div className="p-6">
        {/* Stats Cards */}
        <div data-tour="dashboard-stats" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Reports */}
          <div className="relative overflow-hidden bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-lg p-6 text-white">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-xl rounded-xl flex items-center justify-center">
                  <FileText className="w-6 h-6" />
                </div>
                <Activity className="w-8 h-8 text-white/30" />
              </div>
              <p className="text-sm text-purple-100 mb-1 font-medium">Total Reports</p>
              <p className="text-4xl font-bold">{stats.totalReports}</p>
            </div>
          </div>

          {/* Active Subscriptions */}
          <div className="relative overflow-hidden bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-lg p-6 text-white">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-xl rounded-xl flex items-center justify-center">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <TrendingUp className="w-8 h-8 text-white/30" />
              </div>
              <p className="text-sm text-green-100 mb-1 font-medium">Active Subscriptions</p>
              <p className="text-4xl font-bold">{stats.activeSubscriptions}</p>
            </div>
          </div>

          {/* Expiring Soon */}
          <div className="relative overflow-hidden bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl shadow-lg p-6 text-white">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-xl rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6" />
                </div>
                <AlertCircle className="w-8 h-8 text-white/30" />
              </div>
              <p className="text-sm text-orange-100 mb-1 font-medium">Expiring Soon</p>
              <p className="text-4xl font-bold">{stats.expiringSubscriptions}</p>
              <p className="text-xs text-orange-100 mt-1">Within 30 days</p>
            </div>
          </div>
        </div>

        {/* Recent Reports & Subscriptions */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Recent Reports */}
          <div data-tour="my-reports" className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Recent Reports</h3>
                <p className="text-sm text-gray-500 mt-1">Your latest subscribed reports</p>
              </div>
              <button
                onClick={() => navigate('/client/reports')}
                className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 transition-colors"
              >
                View All
              </button>
            </div>

            <div className="space-y-3">
              {stats.reports.slice(0, 5).map((report) => (
                <div
                  key={report.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
                  onClick={() => navigate(`/client/reports/${report.report_id}`)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{report.report_title}</p>
                      <p className="text-xs text-gray-500">Expires: {new Date(report.end_date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  {report.is_active ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  )}
                </div>
              ))}

              {stats.reports.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No reports available</p>
                </div>
              )}
            </div>
          </div>

          {/* Subscription Status */}
          <div data-tour="subscriptions" className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Subscription Status</h3>
                <p className="text-sm text-gray-500 mt-1">Monitor your active subscriptions</p>
              </div>
              <button
                onClick={() => navigate('/client/subscriptions')}
                className="px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition-colors"
              >
                Manage
              </button>
            </div>

            <div className="space-y-3">
              {stats.subscriptions.slice(0, 5).map((sub) => {
                const daysRemaining = sub.days_remaining;
                const isExpiringSoon = daysRemaining <= 30;

                return (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
                  >
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 text-sm mb-1">{sub.report_title}</p>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-xs text-gray-600">
                          {new Date(sub.end_date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                      isExpiringSoon
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {daysRemaining}d left
                    </div>
                  </div>
                );
              })}

              {stats.subscriptions.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <CreditCard className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No active subscriptions</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ClientDashboardLayout>
  );
};

export default ClientDashboard;