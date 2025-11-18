// frontend/src/components/calling/CallTimeline.jsx
// ✅ FIXED VERSION - Removed project-sites query invalidation

import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../utils/api';
import { useToast } from '../../hooks/useToast';
import DeleteConfirmationModal from '../DeleteConfirmationModal';
import { Phone, Plus, Trash2, Clock, User } from 'lucide-react';

const CallTimeline = ({ siteId, readOnly = false }) => {
  const queryClient = useQueryClient();
  const { success, error: showError } = useToast();
  
  const [isAdding, setIsAdding] = useState(false);
  const [newCallNotes, setNewCallNotes] = useState('');
  
  // Delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [callToDelete, setCallToDelete] = useState(null);

  // Fetch call logs
  const { data: callLogs, isLoading } = useQuery({
    queryKey: ['call-logs', siteId],
    queryFn: async () => {
      const response = await api.get(`/api/sites/${siteId}/call-logs/`);
      return response.data;
    },
    enabled: !!siteId,
  });

  // Add call mutation with toast notification
  const addCallMutation = useMutation({
    mutationFn: async (notes) => {
      const response = await api.post(`/api/sites/${siteId}/call-logs/`, {
        call_notes: notes,
      });
      return response.data;
    },
    onSuccess: () => {
      // ✅ FIXED: Removed ['project-sites'] invalidation
      queryClient.invalidateQueries(['call-logs', siteId]);
      queryClient.invalidateQueries(['site-detail', siteId]);
      
      // Reset form state
      setNewCallNotes('');
      setIsAdding(false);
      
      // ✅ Show success toast
      success('Call added successfully!');
    },
    onError: (error) => {
      console.error('Failed to add call:', error);
      showError('Failed to add call. Please try again.');
    }
  });

  // Delete call mutation with toast notification
  const deleteCallMutation = useMutation({
    mutationFn: async (callId) => {
      await api.delete(`/api/call-logs/${callId}/`);
      return callId;
    },
    onSuccess: () => {
      // ✅ FIXED: Removed ['project-sites'] invalidation  
      queryClient.invalidateQueries(['call-logs', siteId]);
      queryClient.invalidateQueries(['site-detail', siteId]);
      
      // Close modal and reset state
      setDeleteModalOpen(false);
      setCallToDelete(null);
      
      // ✅ Show success toast
      success('Call deleted successfully!');
    },
    onError: (error) => {
      console.error('Failed to delete call:', error);
      showError('Failed to delete call. Please try again.');
      
      // Reset modal state even on error
      setDeleteModalOpen(false);
      setCallToDelete(null);
    }
  });

  const handleAddCall = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (!newCallNotes.trim()) {
      showError('Please enter call notes');
      return;
    }
    addCallMutation.mutate(newCallNotes);
  };

  // Delete handlers for modal
  const handleDeleteClick = (e, call) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setCallToDelete(call);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (callToDelete) {
      deleteCallMutation.mutate(callToDelete.call_id);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModalOpen(false);
    setCallToDelete(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Phone className="w-5 h-5" />
          Call History
        </h3>
        <div className="text-sm text-gray-600">
          Total Calls: <span className="font-semibold">{callLogs?.length || 0}</span>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical Line */}
        {callLogs && callLogs.length > 0 && (
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>
        )}

        {/* Call Entries */}
        <div className="space-y-4">
          {callLogs && callLogs.length > 0 ? (
            callLogs.map((call, index) => (
              <div key={call.call_id} className="relative pl-10">
                {/* Timeline Dot */}
                <div className="absolute left-0 top-1 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg">
                  {call.call_number}
                </div>

                {/* Call Card */}
                <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Timestamp */}
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                        <Clock className="w-4 h-4" />
                        <span className="font-medium">{call.formatted_timestamp}</span>
                        <span className="text-gray-400">|</span>
                        <span>Call #{call.call_number}</span>
                      </div>

                      {/* Notes */}
                      <p className="text-gray-900 whitespace-pre-wrap">
                        {call.call_notes}
                      </p>

                      {/* Created By */}
                      {call.created_by_info && (
                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                          <User className="w-3 h-3" />
                          <span>{call.created_by_info.full_name}</span>
                        </div>
                      )}
                    </div>

                    {/* Delete Button */}
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={(e) => handleDeleteClick(e, call)}
                        className="ml-4 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete call"
                        disabled={deleteCallMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Phone className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>No calls made yet</p>
              <p className="text-sm">Add your first call to start tracking</p>
            </div>
          )}
        </div>
      </div>

      {/* Add New Call Section */}
      {!readOnly && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          {!isAdding ? (
            <button
              type="button"
              onClick={() => setIsAdding(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add New Call
            </button>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Call Notes *
              </label>
              <textarea
                value={newCallNotes}
                onChange={(e) => setNewCallNotes(e.target.value)}
                placeholder="e.g., No answer, Spoke with receptionist, Need to call back at 2 PM..."
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.ctrlKey) {
                    handleAddCall(e);
                  }
                }}
              />
              <p className="text-xs text-gray-500 mt-1">Press Ctrl+Enter to add quickly</p>

              <div className="flex gap-2 mt-3">
                <button
                  type="button"
                  onClick={handleAddCall}
                  disabled={addCallMutation.isPending || !newCallNotes.trim()}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {addCallMutation.isPending ? 'Adding...' : 'Add Call'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAdding(false);
                    setNewCallNotes('');
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Call Log"
        message="Are you sure you want to delete this call log entry?"
        itemName={callToDelete ? `Call #${callToDelete.call_number}: ${callToDelete.call_notes?.substring(0, 50)}${callToDelete.call_notes?.length > 50 ? '...' : ''}` : ''}
        isDeleting={deleteCallMutation.isPending}
      />
    </div>
  );
};

export default CallTimeline;