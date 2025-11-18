// frontend/src/components/calling/StatusHistoryModal.jsx
// Modal to display calling status change history

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../utils/api';
import { Clock, User, ArrowRight, X, History } from 'lucide-react';

const STATUS_COLORS = {
  'NOT_STARTED': 'bg-gray-100 text-gray-800 border-gray-300',
  'YELLOW': 'bg-yellow-100 text-yellow-800 border-yellow-300',
  'RED': 'bg-red-100 text-red-800 border-red-300',
  'PURPLE': 'bg-purple-100 text-purple-800 border-purple-300',
  'BLUE': 'bg-blue-100 text-blue-800 border-blue-300',
  'GREEN': 'bg-green-100 text-green-800 border-green-300',
};

const StatusHistoryModal = ({ isOpen, onClose, siteId }) => {
  // Fetch status history
  const { data: history, isLoading } = useQuery({
    queryKey: ['status-history', siteId],
    queryFn: async () => {
      const response = await api.get(`/api/sites/${siteId}/status-history/`);
      return response.data;
    },
    enabled: !!siteId && isOpen, // Only fetch when modal is open
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3 text-white">
              <History className="w-6 h-6" />
              <h2 className="text-xl font-bold">Status Change History</h2>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-blue-800 rounded-lg p-2 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : !history || history.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <History className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">No status changes yet</p>
                <p className="text-sm mt-1">Status changes will appear here</p>
              </div>
            ) : (
              <div className="space-y-4">
                {history.map((change, index) => (
                  <div
                    key={change.history_id}
                    className="bg-gray-50 border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow"
                  >
                    {/* Status Change Arrow */}
                    <div className="flex items-center gap-3 mb-4">
                      <span className={`px-4 py-2 rounded-lg text-sm font-medium border ${STATUS_COLORS[change.old_status] || 'bg-gray-100'}`}>
                        {change.old_status_display}
                      </span>
                      <ArrowRight className="w-5 h-5 text-gray-400" />
                      <span className={`px-4 py-2 rounded-lg text-sm font-medium border ${STATUS_COLORS[change.new_status] || 'bg-gray-100'}`}>
                        {change.new_status_display}
                      </span>
                      {index === 0 && (
                        <span className="ml-auto px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                          Latest
                        </span>
                      )}
                    </div>

                    {/* Notes */}
                    {change.status_notes && (
                      <div className="mb-4">
                        <p className="text-sm font-medium text-gray-700 mb-2">Notes:</p>
                        <p className="text-sm text-gray-900 bg-white rounded-lg border border-gray-200 p-3">
                          {change.status_notes}
                        </p>
                      </div>
                    )}

                    {/* Metadata */}
                    <div className="flex items-center gap-6 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <span className="font-medium">{change.changed_by_info?.full_name || 'Unknown'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>{change.formatted_timestamp}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatusHistoryModal;