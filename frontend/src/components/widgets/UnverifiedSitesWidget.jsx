// frontend/src/components/widgets/UnverifiedSitesWidget.jsx
/**
 * Dashboard Widget for Unverified Sites Statistics
 * Shows pending sites, quality scores, and quick actions
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  AlertTriangle, CheckCircle, XCircle, TrendingUp, 
  Clock, ArrowRight, RefreshCw 
} from 'lucide-react';
import api from '../../utils/api';

const UnverifiedSitesWidget = ({ onRefresh }) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recentSites, setRecentSites] = useState([]);
  
  useEffect(() => {
    fetchData();
  }, []);
  
  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch stats
      const statsResponse = await api.get('/api/unverified-sites/stats/');
      setStats(statsResponse.data);
      
      // Fetch recent pending sites
      const sitesResponse = await api.get('/api/unverified-sites/?status=PENDING&page_size=5');
      setRecentSites(sitesResponse.data.results || sitesResponse.data);
    } catch (error) {
      console.error('Error fetching unverified sites data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleRefresh = () => {
    fetchData();
    if (onRefresh) onRefresh();
  };
  
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    );
  }
  
  const pendingCount = stats?.by_status?.PENDING || 0;
  const underReviewCount = stats?.by_status?.UNDER_REVIEW || 0;
  const approvedCount = stats?.by_status?.APPROVED || 0;
  const rejectedCount = stats?.by_status?.REJECTED || 0;
  const avgQuality = stats?.avg_quality_score || 0;
  
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-orange-50 to-red-50 border-b border-orange-100">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-orange-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Unverified Sites</h3>
          </div>
          <button
            onClick={handleRefresh}
            className="p-1 hover:bg-white/50 rounded transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4 text-gray-600" />
          </button>
        </div>
        <p className="text-sm text-gray-600">Sites awaiting verification</p>
      </div>
      
      {/* Stats Grid */}
      <div className="p-4 grid grid-cols-2 gap-3">
        {/* Pending */}
        <div className="p-3 bg-orange-50 rounded-lg">
          <div className="flex items-center justify-between mb-1">
            <Clock className="w-4 h-4 text-orange-600" />
            <span className="text-2xl font-bold text-orange-600">{pendingCount}</span>
          </div>
          <p className="text-xs text-orange-700 font-medium">Pending Review</p>
        </div>
        
        {/* Under Review */}
        <div className="p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center justify-between mb-1">
            <Clock className="w-4 h-4 text-blue-600" />
            <span className="text-2xl font-bold text-blue-600">{underReviewCount}</span>
          </div>
          <p className="text-xs text-blue-700 font-medium">Under Review</p>
        </div>
        
        {/* Approved */}
        <div className="p-3 bg-green-50 rounded-lg">
          <div className="flex items-center justify-between mb-1">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-2xl font-bold text-green-600">{approvedCount}</span>
          </div>
          <p className="text-xs text-green-700 font-medium">Approved</p>
        </div>
        
        {/* Quality Score */}
        <div className="p-3 bg-indigo-50 rounded-lg">
          <div className="flex items-center justify-between mb-1">
            <TrendingUp className="w-4 h-4 text-indigo-600" />
            <span className="text-2xl font-bold text-indigo-600">{avgQuality}%</span>
          </div>
          <p className="text-xs text-indigo-700 font-medium">Avg Quality</p>
        </div>
      </div>
      
      {/* Recent Sites */}
      {recentSites.length > 0 && (
        <div className="border-t border-gray-100">
          <div className="p-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Recent Pending</h4>
            <div className="space-y-2">
              {recentSites.map((site) => (
                <div
                  key={site.site_id}
                  className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                  onClick={() => navigate('/unverified-sites')}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {site.company_name}
                    </p>
                    <p className="text-xs text-gray-500">{site.country}</p>
                  </div>
                  <div className="ml-2 flex items-center gap-2">
                    <span className={`text-xs font-medium ${
                      site.data_quality_score >= 70 ? 'text-green-600' :
                      site.data_quality_score >= 40 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {site.data_quality_score}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* Footer Action */}
      <div className="border-t border-gray-100">
        <button
          onClick={() => navigate('/unverified-sites')}
          className="w-full p-3 flex items-center justify-center gap-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 transition-colors"
        >
          View All Sites
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default UnverifiedSitesWidget;