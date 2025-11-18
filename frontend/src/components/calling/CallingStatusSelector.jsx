// frontend/src/components/calling/CallingStatusSelector.jsx
// ✅ FINAL VERSION - Better design, toast notifications, perfect UX

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../utils/api';
import { useToast } from '../../hooks/useToast';
import { Phone, AlertCircle, X, Globe, Clock, CheckCircle, ChevronRight } from 'lucide-react';

const STATUS_OPTIONS = [
  {
    value: 'YELLOW',
    label: 'Needs Alternative Numbers',
    description: 'Phone numbers don\'t work - admin will provide alternatives',
    icon: AlertCircle,
    color: 'bg-yellow-50 text-yellow-900 border-yellow-300',
    hoverColor: 'hover:bg-yellow-100',
    requiresNotes: true,
    badge: 'Admin Help',
    badgeColor: 'bg-yellow-600',
  },
  {
    value: 'RED',
    label: 'Not Relevant / Never Picked Up',
    description: 'Company not relevant or calls never answered',
    icon: X,
    color: 'bg-red-50 text-red-900 border-red-300',
    hoverColor: 'hover:bg-red-100',
    badge: 'Skip',
    badgeColor: 'bg-red-600',
  },
  {
    value: 'PURPLE',
    label: 'Language Barrier',
    description: 'Unable to communicate due to language issues',
    icon: Globe,
    color: 'bg-purple-50 text-purple-900 border-purple-300',
    hoverColor: 'hover:bg-purple-100',
    badge: 'Issue',
    badgeColor: 'bg-purple-600',
  },
  {
    value: 'BLUE',
    label: 'Call Back Later',
    description: 'Need to call again at a specific time',
    icon: Clock,
    color: 'bg-blue-50 text-blue-900 border-blue-300',
    hoverColor: 'hover:bg-blue-100',
    badge: 'Pending',
    badgeColor: 'bg-blue-600',
  },
  {
    value: 'GREEN',
    label: 'Complete - Ready for Review',
    description: 'All information collected and verified',
    icon: CheckCircle,
    color: 'bg-green-50 text-green-900 border-green-300',
    hoverColor: 'hover:bg-green-100',
    badge: 'Done',
    badgeColor: 'bg-green-600',
  },
];

const CallingStatusSelector = ({ siteId, currentStatus, readOnly = false, onStatusChange }) => {
  const queryClient = useQueryClient();
  const { success, error: showError, warning } = useToast();
  
  const [isChanging, setIsChanging] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [notes, setNotes] = useState('');

  // Get current status details with better error handling
  const getCurrentStatusDetails = () => {
    if (currentStatus === 'NOT_STARTED') {
      return {
        label: 'Not Started',
        color: 'bg-gray-50 text-gray-900 border-gray-300',
        icon: Phone,
        badge: 'New',
        badgeColor: 'bg-gray-500',
      };
    }
    const statusOption = STATUS_OPTIONS.find(opt => opt.value === currentStatus);
    if (!statusOption) {
      console.warn('Unknown status:', currentStatus);
      return {
        label: currentStatus || 'Unknown',
        color: 'bg-gray-50 text-gray-900 border-gray-300',
        icon: Phone,
        badge: 'Unknown',
        badgeColor: 'bg-gray-500',
      };
    }
    return statusOption;
  };

  const statusDetails = getCurrentStatusDetails();
  const Icon = statusDetails.icon;

  // Update status mutation with toast notification
  const updateStatusMutation = useMutation({
    mutationFn: async ({ status, statusNotes }) => {
      console.log('Sending status update:', { status, statusNotes });
      const response = await api.post(`/api/sites/${siteId}/calling-status/`, {
        calling_status: status,
        notes: statusNotes || '',
      });
      console.log('Status update response:', response.data);
      return response.data;
    },
    onSuccess: (data) => {
      console.log('Status updated successfully:', data);
      
      queryClient.invalidateQueries(['project-sites']);
      queryClient.invalidateQueries(['site-detail', siteId]);
      queryClient.invalidateQueries(['call-logs', siteId]);
      queryClient.invalidateQueries(['status-history', siteId]);
      
      setIsChanging(false);
      setSelectedStatus(null);
      setNotes('');
      
      // ✅ ADD THIS - Refetch parent data
      if (onStatusChange) {
        onStatusChange();
      }
      
      const statusLabel = STATUS_OPTIONS.find(opt => opt.value === data.calling_status)?.label || data.calling_status;
      success(`Status changed to: ${statusLabel}`);
    },
    onError: (error) => {
      console.error('Failed to update calling status:', error);
      console.error('Error response:', error.response?.data);
      showError('Failed to update status. Please try again.');
    }
  });

  // Handle status selection (first step)
  const handleStatusSelect = (status) => {
    const option = STATUS_OPTIONS.find(opt => opt.value === status);
    setSelectedStatus(option);
    
    // If status requires notes, don't submit yet
    if (option.requiresNotes) {
      // Just select it, user needs to add notes
      return;
    }
    
    // For other statuses, notes are optional
    // Show notes section but allow immediate submission
  };

  // Handle final confirmation
  const handleConfirm = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (!selectedStatus) {
      showError('Please select a status');
      return;
    }
    
    // Validate YELLOW status requires notes
    if (selectedStatus.value === 'YELLOW' && !notes.trim()) {
      warning('Please add notes explaining why you need alternative numbers');
      return;
    }
    
    console.log('Changing status to:', selectedStatus.value);
    console.log('Status notes:', notes);
    
    updateStatusMutation.mutate({
      status: selectedStatus.value,
      statusNotes: notes,
    });
  };

  const handleCancel = () => {
    setIsChanging(false);
    setSelectedStatus(null);
    setNotes('');
  };

  if (readOnly) {
    return (
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">
          Calling Status
        </label>
        <div className={`inline-flex items-center gap-3 px-4 py-3 rounded-xl border-2 shadow-sm ${statusDetails.color}`}>
          <Icon className="w-5 h-5" />
          <div>
            <div className="font-semibold">{statusDetails.label}</div>
          </div>
          <span className={`ml-auto px-2.5 py-0.5 text-xs font-bold text-white rounded-full ${statusDetails.badgeColor}`}>
            {statusDetails.badge}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Current Status Display */}
      {!isChanging ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-base">
              Current Calling Status
            </label>
            <button
              type="button"
              onClick={() => setIsChanging(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              Change Status
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 shadow-sm ${statusDetails.color}`}>
            <Icon className="w-5 h-5" />
            <div className="flex-1">
              <div className="font-semibold">{statusDetails.label}</div>
              {statusDetails.description && (
                <div className="text-xs opacity-75 mt-0.5">{statusDetails.description}</div>
              )}
            </div>
            <span className={`px-2.5 py-0.5 text-xs font-bold text-white rounded-full ${statusDetails.badgeColor}`}>
              {statusDetails.badge}
            </span>
          </div>


        </div>
      ) : (
        /* Status Change Interface - NEW DESIGN */
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-gray-200 pb-3">
            <h4 className="text-lg font-semibold text-gray-900">
              Select New Status
            </h4>
            <button
              type="button"
              onClick={handleCancel}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Status Options Grid */}
          <div className="grid grid-cols-1 gap-3">
            {STATUS_OPTIONS.map((option) => {
              const OptionIcon = option.icon;
              const isSelected = selectedStatus?.value === option.value;
              
              return (
                <button
                  type="button"
                  key={option.value}
                  onClick={() => handleStatusSelect(option.value)}
                  disabled={updateStatusMutation.isPending}
                  className={`
                    relative flex items-center gap-4 p-4 rounded-xl border-2 transition-all
                    ${isSelected 
                      ? `${option.color} border-current ring-2 ring-offset-2 ring-${option.badgeColor}` 
                      : `${option.color} ${option.hoverColor} border-current`
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                >
                  <OptionIcon className="w-6 h-6 flex-shrink-0" />
                  <div className="text-left flex-1">
                    <div className="font-semibold text-base flex items-center gap-2">
                      {option.label}
                      {option.requiresNotes && (
                        <span className="text-xs font-normal opacity-75">(requires notes)</span>
                      )}
                    </div>
                    <div className="text-sm opacity-75 mt-0.5">{option.description}</div>
                  </div>
                  <span className={`px-2.5 py-1 text-xs font-bold text-white rounded-full ${option.badgeColor}`}>
                    {option.badge}
                  </span>
                  {isSelected && (
                    <CheckCircle className="absolute -top-2 -right-2 w-6 h-6 text-green-600 bg-white rounded-full" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Notes Section - Shows when status is selected */}
          {selectedStatus && (
            <div className="space-y-3 pt-4 border-t border-gray-200">
              <label className="block text-sm font-medium text-gray-700">
                Notes {selectedStatus.requiresNotes && <span className="text-red-600">*</span>}
                {!selectedStatus.requiresNotes && <span className="text-gray-500 text-xs">(optional)</span>}
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={
                  selectedStatus.value === 'YELLOW'
                    ? 'e.g., Tried +1-555-0100, +1-555-0101, +1-555-0102 - all numbers not working'
                    : 'Add notes about the status change...'
                }
                rows="3"
                className={`
                  w-full px-4 py-3 border-2 rounded-lg transition-colors
                  focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                  ${selectedStatus.requiresNotes && !notes.trim() ? 'border-yellow-300 bg-yellow-50' : 'border-gray-300'}
                `}
              />
              {selectedStatus.requiresNotes && (
                <p className="text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <AlertCircle className="w-4 h-4 inline mr-2" />
                  <strong>Required:</strong> Explain what phone numbers you tried and what happened
                </p>
              )}
            </div>
          )}

          {/* Action Buttons */}
          {selectedStatus && (
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleCancel}
                disabled={updateStatusMutation.isPending}
                className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={updateStatusMutation.isPending || (selectedStatus.requiresNotes && !notes.trim())}
                className={`
                  flex-1 px-4 py-3 rounded-lg transition-colors font-medium text-white shadow-sm
                  ${selectedStatus.badgeColor} 
                  hover:opacity-90
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
              >
                {updateStatusMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block mr-2"></div>
                    Updating...
                  </>
                ) : (
                  `Confirm: ${selectedStatus.label}`
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CallingStatusSelector;