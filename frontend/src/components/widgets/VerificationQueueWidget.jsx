// frontend/src/components/widgets/VerificationQueueWidget.jsx
import { useState, useEffect } from 'react';
import { ListChecks, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import api from '../../utils/api';

const VerificationQueueWidget = ({ stats }) => {
  const queue = stats?.verification_queue || [];

  const getUrgencyStyles = (urgency) => {
    switch (urgency) {
      case 'critical':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'warning':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  if (queue.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-full">
        <div className="flex items-center gap-3 mb-4">
          <ListChecks className="w-5 h-5 text-green-600" />
          <h3 className="font-semibold text-gray-900">Verification Queue</h3>
        </div>
        <div className="flex flex-col items-center justify-center py-8">
          <CheckCircle className="w-12 h-12 text-green-500 mb-3" />
          <p className="text-gray-500 text-sm">All sites verified!</p>
          <p className="text-gray-400 text-xs">No pending verifications</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <ListChecks className="w-5 h-5 text-violet-600" />
          <h3 className="font-semibold text-gray-900">Verification Queue</h3>
        </div>
        <span className="text-xs bg-violet-100 text-violet-700 px-2 py-1 rounded-full">
          {queue.length} pending
        </span>
      </div>

      <div className="space-y-3 max-h-64 overflow-y-auto">
        {queue.slice(0, 5).map((site, index) => (
          <div
            key={site.site_id || index}
            className={`p-3 rounded-lg border ${getUrgencyStyles(site.urgency)}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{site.company_name}</p>
                <p className="text-xs opacity-75 mt-0.5">{site.category_display}</p>
              </div>
              <div className="flex items-center gap-1 text-xs">
                <Clock className="w-3 h-3" />
                <span>{site.days_pending}d</span>
              </div>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs opacity-75">{site.project_name}</span>
              <span className="text-xs opacity-75">{site.country}</span>
            </div>
          </div>
        ))}
      </div>

      {queue.length > 5 && (
        <div className="mt-3 text-center">
          <span className="text-xs text-gray-500">
            +{queue.length - 5} more sites pending
          </span>
        </div>
      )}
    </div>
  );
};

export default VerificationQueueWidget;
