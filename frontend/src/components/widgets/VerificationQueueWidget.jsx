// frontend/src/components/widgets/VerificationQueueWidget.jsx
/**
 * Compact widget showing verification queue status
 * Displays action-required items prominently
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import api from '../../utils/api';

const VerificationQueueWidget = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchStats();
    // Refresh every 5 minutes
    const interval = setInterval(fetchStats, 300000);
    return () => clearInterval(interval);
  }, []);
  
  const fetchStats = async () => {
    try {
      const response = await api.get('/api/unverified-sites/stats/');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }
  
  const pendingCount = stats?.pending_review || 0;
  const needsAttention = pendingCount > 10;
  
  return (
    <div
      onClick={() => navigate('/unverified-sites')}
      className={`bg-white rounded-xl shadow-sm border-2 ${
        needsAttention ? 'border-orange-200' : 'border-gray-200'
      } p-6 cursor-pointer hover:shadow-md transition-all group`}
    >
      {/* Icon and Status */}
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-lg ${
          needsAttention ? 'bg-orange-100' : 'bg-gray-100'
        }`}>
          {needsAttention ? (
            <AlertCircle className="w-6 h-6 text-orange-600" />
          ) : (
            <CheckCircle className="w-6 h-6 text-green-600" />
          )}
        </div>
        
        {needsAttention && (
          <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-semibold rounded-full animate-pulse">
            Action Required
          </span>
        )}
      </div>
      
      {/* Main Stat */}
      <div className="mb-2">
        <p className="text-sm font-medium text-gray-600 mb-1">Verification Queue</p>
        <div className="flex items-baseline gap-2">
          <span className={`text-4xl font-bold ${
            needsAttention ? 'text-orange-600' : 'text-gray-900'
          }`}>
            {pendingCount}
          </span>
          <span className="text-sm text-gray-500">pending</span>
        </div>
      </div>
      
      {/* Sub Stats */}
      <div className="flex items-center gap-4 pt-4 border-t border-gray-100">
        <div className="flex items-center gap-1 text-sm">
          <Clock className="w-4 h-4 text-blue-500" />
          <span className="font-medium text-gray-700">
            {stats?.by_status?.UNDER_REVIEW || 0}
          </span>
          <span className="text-gray-500 text-xs">in review</span>
        </div>
        
        <div className="flex items-center gap-1 text-sm">
          <TrendingUp className="w-4 h-4 text-green-500" />
          <span className="font-medium text-gray-700">
            {stats?.avg_quality_score || 0}%
          </span>
          <span className="text-gray-500 text-xs">quality</span>
        </div>
      </div>
      
      {/* Hover Action */}
      <div className="mt-4 pt-4 border-t border-gray-100 opacity-0 group-hover:opacity-100 transition-opacity">
        <p className="text-sm font-medium text-indigo-600">
          View verification queue →
        </p>
      </div>
    </div>
  );
};

export default VerificationQueueWidget;