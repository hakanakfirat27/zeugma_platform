// frontend/src/components/modals/BulkActionModal.jsx

/**
 * Comprehensive Bulk Action Modal
 * Allows admins to perform various verification actions on multiple sites
 * Actions: Under Review, Needs Revision, Approve, Reject, Transfer to Company Database
 */

import React, { useState } from 'react';
import { 
  X, 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  XCircle, 
  Database,
  Send 
} from 'lucide-react';

const BulkActionModal = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  selectedCount,
  isSubmitting = false,
  selectedSites = [],  // Array of selected site objects with verification_status
}) => {
  const [selectedAction, setSelectedAction] = useState('');
  const [note, setNote] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  // Calculate how many sites are already transferred or approved
  const transferredCount = selectedSites.filter(site => site.verification_status === 'TRANSFERRED').length;
  const approvedCount = selectedSites.filter(site => site.verification_status === 'APPROVED').length;
  const eligibleForTransfer = approvedCount; // Only approved sites can be transferred
  const allAlreadyTransferred = transferredCount === selectedSites.length && selectedSites.length > 0;

  if (!isOpen) return null;

  // Available actions for bulk operations
  const actions = [
    {
      value: 'under_review',
      label: 'Mark as Under Review',
      description: 'Move sites to under review status',
      icon: Clock,
      color: 'blue',
      requiresNote: false
    },
    {
      value: 'needs_revision',
      label: 'Send for Revision',
      description: 'Request revisions from data collector',
      icon: AlertCircle,
      color: 'orange',
      requiresNote: true
    },
    {
      value: 'approve',
      label: 'Approve Sites',
      description: 'Approve all selected sites',
      icon: CheckCircle,
      color: 'green',
      requiresNote: false
    },
    {
      value: 'reject',
      label: 'Reject Sites',
      description: 'Reject all selected sites',
      icon: XCircle,
      color: 'red',
      requiresNote: true
    },
    {
      value: 'transfer',
      label: 'Transfer to Company Database',
      description: 'Transfer approved sites to company database',
      icon: Database,
      color: 'purple',
      requiresNote: false,
      warning: eligibleForTransfer > 0 
        ? `${eligibleForTransfer} approved site(s) will be transferred. ${transferredCount > 0 ? `${transferredCount} already transferred (will be skipped).` : ''}`
        : allAlreadyTransferred 
          ? 'All selected sites are already transferred.'
          : 'No approved sites selected. Only approved sites can be transferred.',
      disabled: eligibleForTransfer === 0  // Disable if no eligible sites
    }
  ];

  const selectedActionConfig = actions.find(a => a.value === selectedAction);

  const handleSubmit = () => {
    // Validate note if required
    if (selectedActionConfig?.requiresNote && !note.trim()) {
      alert('Please add a note for this action');
      return;
    }

    // Show confirmation for destructive actions
    if (['reject', 'transfer'].includes(selectedAction) && !showConfirm) {
      setShowConfirm(true);
      return;
    }

    onSubmit({ action: selectedAction, note: note.trim() });
    handleClose();
  };

  const handleClose = () => {
    setSelectedAction('');
    setNote('');
    setShowConfirm(false);
    onClose();
  };

  const getActionColor = (color) => {
    const colors = {
      blue: {
        bg: 'bg-blue-50 hover:bg-blue-100 border-blue-200',
        text: 'text-blue-700',
        border: 'border-blue-300',
        button: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
      },
      orange: {
        bg: 'bg-orange-50 hover:bg-orange-100 border-orange-200',
        text: 'text-orange-700',
        border: 'border-orange-300',
        button: 'bg-orange-600 hover:bg-orange-700 focus:ring-orange-500'
      },
      green: {
        bg: 'bg-green-50 hover:bg-green-100 border-green-200',
        text: 'text-green-700',
        border: 'border-green-300',
        button: 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
      },
      red: {
        bg: 'bg-red-50 hover:bg-red-100 border-red-200',
        text: 'text-red-700',
        border: 'border-red-300',
        button: 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
      },
      purple: {
        bg: 'bg-purple-50 hover:bg-purple-100 border-purple-200',
        text: 'text-purple-700',
        border: 'border-purple-300',
        button: 'bg-purple-600 hover:bg-purple-700 focus:ring-purple-500'
      }
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Bulk Actions</h2>
            <p className="text-sm text-gray-600 mt-1">
              {selectedCount} {selectedCount === 1 ? 'site' : 'sites'} selected
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {!showConfirm ? (
            <>
              {/* Action Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Select Action
                </label>
                <div className="space-y-2">
                  {actions.map((action) => {
                    const Icon = action.icon;
                    const colors = getActionColor(action.color);
                    const isSelected = selectedAction === action.value;
                    const isDisabled = action.disabled === true;

                    return (
                      <button
                        key={action.value}
                        onClick={() => !isDisabled && setSelectedAction(action.value)}
                        disabled={isDisabled}
                        className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                          isDisabled
                            ? 'border-gray-200 bg-gray-100 cursor-not-allowed opacity-60'
                            : isSelected
                            ? `${colors.bg} ${colors.border}`
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`mt-0.5 ${isDisabled ? 'text-gray-400' : isSelected ? colors.text : 'text-gray-400'}`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="flex-1">
                            <div className={`font-medium ${isDisabled ? 'text-gray-500' : isSelected ? colors.text : 'text-gray-900'}`}>
                              {action.label}
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                              {action.description}
                            </div>
                            {action.requiresNote && (
                              <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                Note required
                              </div>
                            )}
                            {action.warning && (
                              <div className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                {action.warning}
                              </div>
                            )}
                          </div>
                          {isSelected && (
                            <div className={`mt-1 ${colors.text}`}>
                              <CheckCircle className="w-5 h-5" />
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Note Input */}
              {selectedAction && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {selectedActionConfig?.requiresNote ? 'Note (Required)' : 'Note (Optional)'}
                  </label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder={
                      selectedAction === 'needs_revision'
                        ? 'Explain what needs to be revised...'
                        : selectedAction === 'reject'
                        ? 'Explain why these sites are being rejected...'
                        : 'Add any additional notes...'
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    rows="4"
                  />
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 justify-end">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!selectedAction || isSubmitting}
                  className={`px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    selectedActionConfig
                      ? getActionColor(selectedActionConfig.color).button
                      : 'bg-gray-400'
                  }`}
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Processing...
                    </span>
                  ) : (
                    selectedActionConfig?.label || 'Select an action'
                  )}
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Confirmation Screen */}
              <div className="text-center py-6">
                <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8 text-yellow-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  Confirm Action
                </h3>
                <p className="text-gray-600 mb-6">
                  Are you sure you want to <strong>{selectedActionConfig?.label.toLowerCase()}</strong>?
                  <br />
                  This will affect <strong>{selectedCount}</strong> {selectedCount === 1 ? 'site' : 'sites'}.
                </p>

                {note && (
                  <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
                    <div className="text-sm font-medium text-gray-700 mb-1">Note:</div>
                    <div className="text-sm text-gray-600">{note}</div>
                  </div>
                )}

                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => setShowConfirm(false)}
                    className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    disabled={isSubmitting}
                  >
                    Go Back
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className={`px-6 py-2 text-white rounded-lg transition-colors disabled:opacity-50 ${
                      getActionColor(selectedActionConfig?.color).button
                    }`}
                  >
                    {isSubmitting ? 'Processing...' : 'Confirm'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default BulkActionModal;