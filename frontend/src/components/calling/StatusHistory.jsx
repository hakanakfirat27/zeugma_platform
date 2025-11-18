// frontend/src/components/calling/StatusHistory.jsx
// Component to display calling status change history

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../utils/api';
import { Clock, User, ArrowRight } from 'lucide-react';

const STATUS_COLORS = {
  'NOT_STARTED': 'bg-gray-100 text-gray-800 border-gray-300',
  'YELLOW': 'bg-yellow-100 text-yellow-800 border-yellow-300',
  'RED': 'bg-red-100 text-red-800 border-red-300',
  'PURPLE': 'bg-purple-100 text-purple-800 border-purple-300',
  'BLUE': 'bg-blue-100 text-blue-800 border-blue-300',
  'GREEN': 'bg-green-100 text-green-800 border-green-300',
};

const StatusHistory = ({ siteId }) => {
  // Fetch status history
  const { data: history, isLoading } = useQuery({
    queryKey: ['status-history', siteId],
    queryFn: async () => {
      const response = await api.get(`/api/sites/${siteId}/status-history/`);
      return response.data;
    },
    enabled: !!siteId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!history || history.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p className="text-sm">No status changes yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-gray-700 mb-3">Status Change History</h4>
      
      <div className="space-y-3">
        {history.map((change, index) => (
          <div
            key={change.history_id}
            className="bg-gray-50 border border-gray-200 rounded-lg p-4"
          >
            {/* Status Change Arrow */}
            <div className="flex items-center gap-3 mb-3">
              <span className={`px-3 py-1 rounded-md text-xs font-medium border ${STATUS_COLORS[change.old_status] || 'bg-gray-100'}`}>
                {change.old_status_display}
              </span>
              <ArrowRight className="w-4 h-4 text-gray-400" />
              <span className={`px-3 py-1 rounded-md text-xs font-medium border ${STATUS_COLORS[change.new_status] || 'bg-gray-100'}`}>
                {change.new_status_display}
              </span>
            </div>

            {/* Notes */}
            {change.status_notes && (
              <div className="mb-3">
                <p className="text-sm text-gray-700 bg-white rounded border border-gray-200 p-3">
                  {change.status_notes}
                </p>
              </div>
            )}

            {/* Metadata */}
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <User className="w-3 h-3" />
                <span>{change.changed_by_info?.full_name || 'Unknown'}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{change.formatted_timestamp}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StatusHistory;