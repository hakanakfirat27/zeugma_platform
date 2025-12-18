import { useState, useEffect } from 'react';
import { useNavigate, useLocation  } from 'react-router-dom';
import { getBreadcrumbs } from '../../utils/breadcrumbConfig';
import { useAuth } from '../../contexts/AuthContext';
import {
  FileText, CreditCard, Calendar, AlertCircle, CheckCircle,
  PieChart as PieIcon, Activity, Clock, Pin, Star, FolderHeart,
  ChevronRight, Loader2, Eye, Building2, Globe, Folder, StickyNote,
  ArrowRight
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import ClientDashboardLayout from '../../components/layout/ClientDashboardLayout';
import LoadingSpinner from '../../components/LoadingSpinner';
import usePinnedReports from '../../hooks/usePinnedReports';
import api from '../../utils/api';


const COLORS = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1', '#14B8A6'];

// Country name to ISO 2-letter code mapping for flag images
const COUNTRY_CODES = {
  // Western Europe
  'Germany': 'DE', 'France': 'FR', 'Italy': 'IT', 'Spain': 'ES', 'Portugal': 'PT',
  'United Kingdom': 'GB', 'UK': 'GB', 'Great Britain': 'GB', 'England': 'GB',
  'Ireland': 'IE', 'Netherlands': 'NL', 'Holland': 'NL', 'Belgium': 'BE',
  'Luxembourg': 'LU', 'Austria': 'AT', 'Switzerland': 'CH',
  // Northern Europe
  'Sweden': 'SE', 'Denmark': 'DK', 'Finland': 'FI', 'Norway': 'NO', 'Iceland': 'IS',
  // Central/Eastern Europe
  'Poland': 'PL', 'Czech Republic': 'CZ', 'Czechia': 'CZ', 'Slovakia': 'SK',
  'Hungary': 'HU', 'Romania': 'RO', 'Bulgaria': 'BG', 'Slovenia': 'SI',
  'Croatia': 'HR', 'Serbia': 'RS', 'Bosnia and Herzegovina': 'BA',
  'North Macedonia': 'MK', 'Macedonia': 'MK', 'Albania': 'AL', 'Kosovo': 'XK',
  'Montenegro': 'ME', 'Estonia': 'EE', 'Latvia': 'LV', 'Lithuania': 'LT',
  // Southern Europe
  'Greece': 'GR', 'Cyprus': 'CY', 'Malta': 'MT',
  // Eastern Europe / CIS
  'Russia': 'RU', 'Russian Federation': 'RU', 'Ukraine': 'UA', 'Belarus': 'BY',
  'Moldova': 'MD', 'Kazakhstan': 'KZ', 'Azerbaijan': 'AZ', 'Georgia': 'GE',
  'Armenia': 'AM', 'Uzbekistan': 'UZ',
  // Middle East
  'Turkey': 'TR', 'Türkiye': 'TR', 'Israel': 'IL', 'United Arab Emirates': 'AE',
  'UAE': 'AE', 'Saudi Arabia': 'SA', 'Qatar': 'QA', 'Kuwait': 'KW',
  'Bahrain': 'BH', 'Oman': 'OM', 'Jordan': 'JO', 'Lebanon': 'LB',
  'Iran': 'IR', 'Iraq': 'IQ',
  // North America
  'USA': 'US', 'United States': 'US', 'United States of America': 'US',
  'Canada': 'CA', 'Mexico': 'MX',
  // South America
  'Brazil': 'BR', 'Argentina': 'AR', 'Chile': 'CL', 'Colombia': 'CO',
  'Peru': 'PE', 'Venezuela': 'VE', 'Ecuador': 'EC', 'Uruguay': 'UY',
  'Paraguay': 'PY', 'Bolivia': 'BO',
  // Asia
  'China': 'CN', 'Japan': 'JP', 'South Korea': 'KR', 'Korea': 'KR',
  'North Korea': 'KP', 'India': 'IN', 'Pakistan': 'PK', 'Bangladesh': 'BD',
  'Indonesia': 'ID', 'Malaysia': 'MY', 'Singapore': 'SG', 'Thailand': 'TH',
  'Vietnam': 'VN', 'Philippines': 'PH', 'Taiwan': 'TW', 'Hong Kong': 'HK',
  'Sri Lanka': 'LK', 'Myanmar': 'MM', 'Cambodia': 'KH',
  // Africa
  'South Africa': 'ZA', 'Egypt': 'EG', 'Morocco': 'MA', 'Tunisia': 'TN',
  'Algeria': 'DZ', 'Nigeria': 'NG', 'Kenya': 'KE', 'Ethiopia': 'ET', 'Ghana': 'GH',
  // Oceania
  'Australia': 'AU', 'New Zealand': 'NZ',
};

// Helper function to get country code
const getCountryCode = (countryName) => {
  if (!countryName) return null;
  // Try direct lookup
  if (COUNTRY_CODES[countryName]) return COUNTRY_CODES[countryName];
  // Try with title case
  const titleCase = countryName.charAt(0).toUpperCase() + countryName.slice(1).toLowerCase();
  if (COUNTRY_CODES[titleCase]) return COUNTRY_CODES[titleCase];
  // If the country name is already a 2-letter code, use it directly
  if (countryName.length === 2 && countryName === countryName.toUpperCase()) {
    return countryName;
  }
  return null;
};

// Activity type icons and colors
const ACTIVITY_CONFIG = {
  FAVORITE_ADDED: { icon: Star, color: 'bg-yellow-100 text-yellow-600', label: 'Added to favorites' },
  FAVORITE_REMOVED: { icon: Star, color: 'bg-gray-100 text-gray-500', label: 'Removed from favorites' },
  COLLECTION_CREATED: { icon: Folder, color: 'bg-blue-100 text-blue-600', label: 'Created collection' },
  COLLECTION_DELETED: { icon: Folder, color: 'bg-gray-100 text-gray-500', label: 'Deleted collection' },
  COLLECTION_ITEM_ADDED: { icon: FolderHeart, color: 'bg-purple-100 text-purple-600', label: 'Added to collection' },
  COLLECTION_ITEM_REMOVED: { icon: FolderHeart, color: 'bg-gray-100 text-gray-500', label: 'Removed from collection' },
  COMPANY_VIEWED: { icon: Eye, color: 'bg-indigo-100 text-indigo-600', label: 'Viewed company' },
  REPORT_VIEWED: { icon: FileText, color: 'bg-green-100 text-green-600', label: 'Viewed report' },
  NOTE_ADDED: { icon: StickyNote, color: 'bg-pink-100 text-pink-600', label: 'Added note' },
  EXPORT_CREATED: { icon: FileText, color: 'bg-teal-100 text-teal-600', label: 'Exported data' },
};

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
    totalFavorites: 0,
    totalCollections: 0,
    reports: [],
    subscriptions: []
  });

  // New dashboard features state
  const [recentActivities, setRecentActivities] = useState([]);
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const [categoryStats, setCategoryStats] = useState([]);
  const [countryStats, setCountryStats] = useState([]);
  const [subscriptionTimeline, setSubscriptionTimeline] = useState([]);
  const [widgetsLoading, setWidgetsLoading] = useState(true);

  // Pinned reports hook
  const { 
    pinnedReports, 
    loading: pinnedLoading, 
    pinReport, 
    unpinReport,
    isPinned,
    getPinId
  } = usePinnedReports();

  const [pinningId, setPinningId] = useState(null);

  useEffect(() => {
    loadDashboardStats();
    loadDashboardWidgets();
  }, []);

  const loadDashboardStats = async () => {
    try {
      setLoading(true);

      // Load subscriptions
      const subsResponse = await api.get('/api/client/subscriptions/');
      const subscriptions = subsResponse.data;

      // Load favorites count
      let totalFavorites = 0;
      try {
        const favResponse = await api.get('/api/client/favorites/?page_size=1');
        totalFavorites = favResponse.data.count || 0;
      } catch (error) {
        console.error('Error loading favorites count:', error);
      }

      // Load collections count
      let totalCollections = 0;
      try {
        const collectionsResponse = await api.get('/api/client/collections/?page_size=1');
        totalCollections = collectionsResponse.data.count || 0;
      } catch (error) {
        console.error('Error loading collections count:', error);
      }

      // Calculate stats
      const today = new Date();
      const thirtyDaysFromNow = new Date(today);
      thirtyDaysFromNow.setDate(today.getDate() + 30);

      const activeSubscriptions = subscriptions.filter(sub => sub.is_active).length;
      const expiringSubscriptions = subscriptions.filter(sub => {
        const endDate = new Date(sub.end_date);
        return sub.is_active && endDate <= thirtyDaysFromNow && endDate > today;
      }).length;

      setStats({
        totalReports: subscriptions.length,
        activeSubscriptions,
        expiringSubscriptions,
        totalCompanies: 0,
        totalFavorites,
        totalCollections,
        reports: subscriptions,
        subscriptions: subscriptions
      });
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDashboardWidgets = async () => {
    try {
      setWidgetsLoading(true);

      // Load all widget data in parallel
      const [activitiesRes, viewedRes, categoryRes, countryRes, timelineRes] = await Promise.allSettled([
        api.get('/dashboard/api/recent-activities/?limit=5'),
        api.get('/dashboard/api/recently-viewed/?limit=4'),
        api.get('/dashboard/api/reports-by-category/'),
        api.get('/dashboard/api/companies-by-country/?limit=5'),
        api.get('/dashboard/api/subscription-timeline/'),
      ]);

      if (activitiesRes.status === 'fulfilled') {
        setRecentActivities(activitiesRes.value.data);
      }
      if (viewedRes.status === 'fulfilled') {
        setRecentlyViewed(viewedRes.value.data);
      }
      if (categoryRes.status === 'fulfilled') {
        setCategoryStats(categoryRes.value.data);
      }
      if (countryRes.status === 'fulfilled') {
        setCountryStats(countryRes.value.data);
      }
      if (timelineRes.status === 'fulfilled') {
        setSubscriptionTimeline(timelineRes.value.data);
      }
    } catch (error) {
      console.error('Error loading dashboard widgets:', error);
    } finally {
      setWidgetsLoading(false);
    }
  };

  const handleTogglePin = async (subscriptionId) => {
    try {
      setPinningId(subscriptionId);
      if (isPinned(subscriptionId)) {
        const pinId = getPinId(subscriptionId);
        if (pinId) {
          await unpinReport(pinId);
        }
      } else {
        await pinReport(subscriptionId);
      }
    } catch (error) {
      console.error('Error toggling pin:', error);
    } finally {
      setPinningId(null);
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

  // Get color for company card based on index
  const getCompanyCardGradient = (index) => {
    const gradients = [
      'from-purple-500 to-blue-500',
      'from-green-500 to-teal-500',
      'from-orange-500 to-red-500',
      'from-pink-500 to-purple-500',
      'from-blue-500 to-indigo-500',
      'from-teal-500 to-cyan-500',
    ];
    return gradients[index % gradients.length];
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
        <p className="text-gray-600 dark:text-gray-400">
          Welcome back, <span className="font-semibold text-purple-950 dark:text-purple-300">{getDisplayName()}</span>! Here's your subscription summary
        </p>
      }
    >
      <div className="p-6">
        {/* Pinned Reports Section */}
        {pinnedReports.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Pin className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Pinned Reports</h2>
              <span className="text-sm text-gray-500 dark:text-gray-400">Quick access to your favorite reports</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {pinnedReports.map((pin) => {
                const daysRemaining = pin.end_date 
                  ? Math.ceil((new Date(pin.end_date) - new Date()) / (1000 * 60 * 60 * 24))
                  : 0;
                const isExpiringSoon = daysRemaining <= 30 && daysRemaining > 0;
                
                return (
                  <div
                    key={pin.id}
                    className="relative bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl p-4 text-white shadow-lg hover:shadow-xl transition-all cursor-pointer group"
                    onClick={() => navigate(`/client/reports/${pin.report_id}`)}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTogglePin(pin.subscription_id);
                      }}
                      className="absolute top-2 right-2 p-1.5 bg-white/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/30"
                      title="Unpin"
                    >
                      {pinningId === pin.subscription_id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Pin className="w-4 h-4" />
                      )}
                    </button>
                    
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{pin.report_title}</h3>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-white/80 text-xs">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{daysRemaining > 0 ? `${daysRemaining}d left` : 'Expired'}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-white/60" />
                    </div>
                    
                    {isExpiringSoon && (
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-orange-400 rounded-b-xl" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Stats Cards - 5 cards in a row */}
        <div data-tour="dashboard-stats" className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          {/* Total Reports */}
          <div 
            className="relative overflow-hidden bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-lg p-5 text-white cursor-pointer hover:shadow-xl transition-shadow"
            onClick={() => navigate('/client/reports')}
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-xl rounded-xl flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
              </div>
              <p className="text-xs text-purple-100 mb-1 font-medium">Total Reports</p>
              <p className="text-3xl font-bold">{stats.totalReports}</p>
            </div>
          </div>

          {/* Active Subscriptions */}
          <div 
            className="relative overflow-hidden bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-lg p-5 text-white cursor-pointer hover:shadow-xl transition-shadow"
            onClick={() => navigate('/client/subscriptions')}
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-xl rounded-xl flex items-center justify-center">
                  <CheckCircle className="w-5 h-5" />
                </div>
              </div>
              <p className="text-xs text-green-100 mb-1 font-medium">Active Subscriptions</p>
              <p className="text-3xl font-bold">{stats.activeSubscriptions}</p>
            </div>
          </div>

          {/* Collections */}
          <div 
            className="relative overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg p-5 text-white cursor-pointer hover:shadow-xl transition-shadow"
            onClick={() => navigate('/client/collections')}
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-xl rounded-xl flex items-center justify-center">
                  <FolderHeart className="w-5 h-5" />
                </div>
              </div>
              <p className="text-xs text-blue-100 mb-1 font-medium">Collections</p>
              <p className="text-3xl font-bold">{stats.totalCollections}</p>
            </div>
          </div>

          {/* Favorites */}
          <div 
            className="relative overflow-hidden bg-gradient-to-br from-yellow-500 to-amber-500 rounded-2xl shadow-lg p-5 text-white cursor-pointer hover:shadow-xl transition-shadow"
            onClick={() => navigate('/client/collections?tab=favorites')}
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-xl rounded-xl flex items-center justify-center">
                  <Star className="w-5 h-5" />
                </div>
              </div>
              <p className="text-xs text-yellow-100 mb-1 font-medium">Favorites</p>
              <p className="text-3xl font-bold">{stats.totalFavorites}</p>
            </div>
          </div>

          {/* Expiring Soon */}
          <div className="relative overflow-hidden bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl shadow-lg p-5 text-white">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-xl rounded-xl flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
              <p className="text-xs text-orange-100 mb-1 font-medium">Expiring Soon</p>
              <p className="text-3xl font-bold">{stats.expiringSubscriptions}</p>
              <p className="text-xs text-orange-100 mt-0.5">Within 30 days</p>
            </div>
          </div>
        </div>

        {/* Recent Reports & Subscription Status */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <div data-tour="my-reports" className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-100 dark:border-gray-700 transition-colors duration-300">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Recent Reports</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Your latest subscribed reports</p>
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
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer group"
                  onClick={() => navigate(`/client/reports/${report.report_id}`)}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{report.report_title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Expires: {new Date(report.end_date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTogglePin(report.id);
                      }}
                      className={`p-2 rounded-lg transition-all ${
                        isPinned(report.id)
                          ? 'text-purple-600 bg-purple-100'
                          : 'text-gray-400 hover:text-purple-600 hover:bg-purple-50'
                      }`}
                      title={isPinned(report.id) ? 'Unpin from dashboard' : 'Pin to dashboard'}
                    >
                      {pinningId === report.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Pin className="w-4 h-4" fill={isPinned(report.id) ? 'currentColor' : 'none'} />
                      )}
                    </button>
                    {report.is_active ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                </div>
              ))}

              {stats.reports.length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                  <p>No reports available</p>
                </div>
              )}
            </div>
          </div>

          <div data-tour="subscriptions" className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-100 dark:border-gray-700 transition-colors duration-300">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Subscription Status</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Monitor your active subscriptions</p>
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
                  <div key={sub.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 dark:text-white text-sm mb-1">{sub.report_title}</p>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          {new Date(sub.end_date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                      isExpiringSoon ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    }`}>
                      {daysRemaining}d left
                    </div>
                  </div>
                );
              })}

              {stats.subscriptions.length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <CreditCard className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                  <p>No active subscriptions</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recently Viewed Companies */}
        {recentlyViewed.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Recently Viewed</h2>
                <span className="text-sm text-gray-500 dark:text-gray-400">Companies you've recently opened</span>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {recentlyViewed.map((company, index) => (
                <div
                  key={company.id}
                  className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 hover:shadow-lg hover:border-indigo-200 dark:hover:border-indigo-700 transition-all cursor-pointer group"
                  onClick={() => navigate(`/client/reports/${company.report_id}`)}
                >
                  <div className={`w-10 h-10 bg-gradient-to-br ${getCompanyCardGradient(index)} rounded-lg flex items-center justify-center mb-3 group-hover:scale-105 transition-transform`}>
                    <Building2 className="w-5 h-5 text-white" />
                  </div>
                  <p className="font-medium text-sm text-gray-900 dark:text-white truncate mb-1">{company.company_name}</p>
                  <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                    <Globe className="w-3 h-3" />
                    <span>{company.country || 'Unknown'}</span>
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 truncate">{company.report_title}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Activity Feed & Charts Row */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {/* Recent Activity Feed */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-100 dark:border-gray-700 transition-colors duration-300">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Recent Activity</h3>
            </div>
            
            {recentActivities.length > 0 ? (
              <div className="space-y-3">
                {recentActivities.map((activity) => {
                  const config = ACTIVITY_CONFIG[activity.activity_type] || {
                    icon: Activity,
                    color: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
                    label: 'Activity'
                  };
                  const IconComponent = config.icon;
                  
                  return (
                    <div key={activity.id} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                      <div className={`w-8 h-8 ${config.color} rounded-full flex items-center justify-center flex-shrink-0`}>
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 dark:text-white">
                          {config.label}{' '}
                          {activity.company_name && (
                            <span className="font-medium">{activity.company_name}</span>
                          )}
                          {activity.collection_name && !activity.company_name && (
                            <span className="font-medium">{activity.collection_name}</span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{activity.time_ago}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Activity className="w-10 h-10 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                <p className="text-sm">No recent activity</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Your actions will appear here</p>
              </div>
            )}
          </div>

          {/* Reports by Category - Donut charts for each report */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-100 dark:border-gray-700 transition-colors duration-300">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Categories by Report</h3>
            
            {categoryStats.length > 0 ? (
              <div className="space-y-6 max-h-96 overflow-y-auto pr-1">
                {categoryStats.map((report) => {
                  const totalCount = report.categories.reduce((sum, cat) => sum + cat.count, 0);
                  
                  return (
                    <div key={report.report_id} className="border-b border-gray-100 dark:border-gray-700 pb-4 last:border-0 last:pb-0">
                      {/* Report Title */}
                      <div className="flex items-center gap-2 mb-3">
                        <FileText className="w-4 h-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                        <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">{report.report_title}</span>
                      </div>
                      
                      {/* Donut Chart + Legend */}
                      <div className="flex items-center gap-4">
                        {/* Donut Chart */}
                        <div className="relative w-20 h-20 flex-shrink-0">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={report.categories}
                                cx="50%"
                                cy="50%"
                                innerRadius={20}
                                outerRadius={38}
                                dataKey="count"
                                stroke="none"
                              >
                                {report.categories.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip 
                                formatter={(value, name, props) => [value, props.payload.category_display]}
                                contentStyle={{ fontSize: '12px', padding: '4px 8px' }}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center">
                              <p className="text-sm font-bold text-gray-900 dark:text-white">{totalCount}</p>
                            </div>
                          </div>
                        </div>
                        
                        {/* Legend */}
                        <div className="flex-1 space-y-1 min-w-0">
                          {report.categories.slice(0, 4).map((cat, catIndex) => (
                            <div key={cat.category} className="flex items-center gap-1.5">
                              <div 
                                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                style={{ backgroundColor: cat.color || COLORS[catIndex % COLORS.length] }}
                              />
                              <span className="text-xs text-gray-600 dark:text-gray-400 truncate flex-1">{cat.category_display}</span>
                              <span className="text-xs font-semibold text-gray-900 dark:text-white">{cat.count}</span>
                            </div>
                          ))}
                          {report.categories.length > 4 && (
                            <p className="text-xs text-gray-400 dark:text-gray-500 pl-4">+{report.categories.length - 4} more</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <PieIcon className="w-10 h-10 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                <p className="text-sm">No category data</p>
              </div>
            )}
          </div>

          {/* Companies by Country - With Flag Images + Fixed Width */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-100 dark:border-gray-700 transition-colors duration-300">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Top Countries</h3>
            
            {countryStats.length > 0 ? (
              <div className="space-y-3">
                {countryStats.map((country, index) => {
                  // Get country code for flag image
                  const countryCode = getCountryCode(country.country);
                  
                  return (
                    <div key={country.country} className="flex items-center gap-3">
                      {/* Flag Image */}
                      {countryCode ? (
                        <img 
                          src={`https://flagcdn.com/24x18/${countryCode.toLowerCase()}.png`}
                          srcSet={`https://flagcdn.com/48x36/${countryCode.toLowerCase()}.png 2x`}
                          alt={country.country}
                          className="w-6 h-4 object-cover rounded-sm flex-shrink-0"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      {/* Fallback flag emoji (hidden by default if image loads) */}
                      <span 
                        className={`text-lg flex-shrink-0 ${countryCode ? 'hidden' : 'flex'} items-center justify-center w-6`}
                        style={{ display: countryCode ? 'none' : 'flex' }}
                      >
                        {country.flag || '🏳️'}
                      </span>
                      
                      {/* Country Name - Fixed Width */}
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-28 truncate flex-shrink-0">
                        {country.country}
                      </span>
                      
                      {/* Progress Bar - Takes remaining space */}
                      <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className="h-2 rounded-full transition-all"
                          style={{ 
                            width: `${country.percentage || 0}%`,
                            backgroundColor: COLORS[index % COLORS.length]
                          }}
                        />
                      </div>
                      
                      {/* Count */}
                      <span className="text-sm font-semibold text-gray-900 dark:text-white w-10 text-right flex-shrink-0">
                        {country.count}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Globe className="w-10 h-10 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                <p className="text-sm">No country data</p>
              </div>
            )}
          </div>
        </div>

        {/* Subscription Timeline */}
        {subscriptionTimeline.length > 0 && (
          <div className="mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-100 dark:border-gray-700 transition-colors duration-300">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Subscription Timeline</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Track your subscription periods</p>
                </div>
                <button
                  onClick={() => navigate('/client/subscriptions')}
                  className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium flex items-center gap-1"
                >
                  Manage <ArrowRight className="w-4 h-4" />
                </button>
              </div>
              
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />
                
                <div className="space-y-4">
                  {subscriptionTimeline.map((sub) => (
                    <div key={sub.id} className="relative ml-10">
                      <div className={`absolute -left-8 w-4 h-4 rounded-full border-2 border-white dark:border-gray-800 ${
                        sub.is_expiring_soon ? 'bg-orange-500' : 'bg-green-500'
                      }`} />
                      
                      <div 
                        className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border border-gray-200 dark:border-gray-600 hover:border-purple-200 dark:hover:border-purple-700 hover:shadow-md transition-all cursor-pointer"
                        onClick={() => navigate(`/client/reports/${sub.report_id}`)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-semibold text-gray-900 dark:text-white">{sub.report_title}</p>
                          <div className={`px-2 py-1 rounded-lg text-xs font-medium ${
                            sub.is_expiring_soon ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          }`}>
                            {sub.days_remaining}d remaining
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-3">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>
                            {new Date(sub.start_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} 
                            {' → '}
                            {new Date(sub.end_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                        
                        <div className="bg-gray-200 dark:bg-gray-600 rounded-full h-1.5">
                          <div 
                            className={`h-1.5 rounded-full transition-all ${
                              sub.is_expiring_soon ? 'bg-orange-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(sub.progress_percentage, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ClientDashboardLayout>
  );
};

export default ClientDashboard;
