// frontend/src/components/verification/VerificationStatusTab.jsx

/**
 * Verification Status Tab Component
 * Displays current verification status, notes, and history for a site
 */

import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  RefreshCw,
  Database,
  User,
  Calendar,
  MessageSquare,
  History,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

const VerificationStatusTab = ({ siteId }) => {
  const [loading, setLoading] = useState(true);
  const [currentStatus, setCurrentStatus] = useState(null);
  const [verificationHistory, setVerificationHistory] = useState([]);
  const [reviewNotes, setReviewNotes] = useState([]);
  const [expandedHistory, setExpandedHistory] = useState(new Set());

  useEffect(() => {
    fetchVerificationData();
  }, [siteId]);

  const fetchVerificationData = async () => {
    try {
      setLoading(true);

      // Fetch current site status
      const siteResponse = await api.get(`/api/projects/sites/${siteId}/`);
      setCurrentStatus(siteResponse.data);

      // Fetch verification history if available
      try {
        const historyResponse = await api.get(`/api/unverified-sites/${siteId}/history/`);
        setVerificationHistory(historyResponse.data || []);
      } catch (error) {
        // History endpoint might not exist for all sites
        console.log('No verification history available');
        setVerificationHistory([]);
      }

      // Fetch review notes
      try {
        const notesResponse = await api.get(`/api/sites/${siteId}/notes/`);
        // FILTER FOR VERIFICATION-RELATED NOTES ONLY
        const verificationNotes = notesResponse.data.filter(note => {
          // Include notes with [VERIFICATION] prefix
          const hasVerificationPrefix = note.note_text.startsWith('[VERIFICATION]');
          
          // Include notes marked as verification notes by backend
          const isMarkedAsVerification = note.is_verification_note === true;
          
          // Include notes with verification keywords (fallback)
          const text = note.note_text.toLowerCase();
          const hasVerificationKeywords = 
            text.includes('[verification]') ||
            text.includes('needs revision') ||  // ✅ Removed "please" requirement
            text.includes('sent for revision') ||
            text.includes('marked for revision') ||
            text.includes('requires revision') ||
            text.includes('revision needed') ||
            text.includes('please revise') ||
            text.includes('verification:') ||
            text.includes('rejected because') ||
            text.includes('approved with') ||
            text.includes('under review');
          
          return hasVerificationPrefix || isMarkedAsVerification || hasVerificationKeywords;
        });
        
        // Strip [VERIFICATION] prefix from display text
        const cleanedNotes = verificationNotes.map(note => ({
          ...note,
          note_text: note.note_text.replace(/^\[VERIFICATION\]\s*/i, '')
        }));
        
        setReviewNotes(cleanedNotes || []);
      } catch (error) {
        console.log('No review notes available');
        setReviewNotes([]);
      }

    } catch (error) {
      console.error('Error fetching verification data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status) => {
    const configs = {
      PENDING: {
        bg: 'bg-yellow-50',
        border: 'border-yellow-200',
        text: 'text-yellow-800',
        badgeBg: 'bg-yellow-100',
        badgeText: 'text-yellow-800',
        icon: <Clock className="w-5 h-5" />,
        label: 'Pending Review',
        description: 'This site is awaiting admin review'
      },
      UNDER_REVIEW: {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        text: 'text-blue-800',
        badgeBg: 'bg-blue-100',
        badgeText: 'text-blue-800',
        icon: <RefreshCw className="w-5 h-5" />,
        label: 'Under Review',
        description: 'This site is currently being reviewed by admins'
      },
      NEEDS_REVISION: {
        bg: 'bg-orange-50',
        border: 'border-orange-200',
        text: 'text-orange-800',
        badgeBg: 'bg-orange-100',
        badgeText: 'text-orange-800',
        icon: <AlertCircle className="w-5 h-5" />,
        label: 'Needs Revision',
        description: 'This site requires corrections before approval'
      },
      APPROVED: {
        bg: 'bg-green-50',
        border: 'border-green-200',
        text: 'text-green-800',
        badgeBg: 'bg-green-100',
        badgeText: 'text-green-800',
        icon: <CheckCircle className="w-5 h-5" />,
        label: 'Approved',
        description: 'This site has been verified and approved'
      },
      REJECTED: {
        bg: 'bg-red-50',
        border: 'border-red-200',
        text: 'text-red-800',
        badgeBg: 'bg-red-100',
        badgeText: 'text-red-800',
        icon: <XCircle className="w-5 h-5" />,
        label: 'Rejected',
        description: 'This site has been rejected and will not be processed'
      },
      TRANSFERRED: {
        bg: 'bg-purple-50',
        border: 'border-purple-200',
        text: 'text-purple-800',
        badgeBg: 'bg-purple-100',
        badgeText: 'text-purple-800',
        icon: <Database className="w-5 h-5" />,
        label: 'Transferred',
        description: 'This site has been transferred to the main database'
      }
    };

    return configs[status] || configs.PENDING;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const toggleHistoryExpand = (historyId) => {
    setExpandedHistory(prev => {
      const newSet = new Set(prev);
      if (newSet.has(historyId)) {
        newSet.delete(historyId);
      } else {
        newSet.add(historyId);
      }
      return newSet;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading verification status...</p>
        </div>
      </div>
    );
  }

  if (!currentStatus) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">Unable to load verification status</p>
      </div>
    );
  }

  const statusConfig = getStatusConfig(currentStatus.verification_status);

  return (
    <div className="space-y-6">
      {/* Current Status Card */}
      <div className={`border-2 rounded-lg p-6 ${statusConfig.border} ${statusConfig.bg}`}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`${statusConfig.text}`}>
              {statusConfig.icon}
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Current Status</h3>
              <p className="text-sm text-gray-600 mt-1">{statusConfig.description}</p>
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusConfig.badgeBg} ${statusConfig.badgeText}`}>
            {statusConfig.label}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200">
          {/* Verified By */}
          {currentStatus.verified_by_info && (
            <div className="flex items-start gap-2">
              <User className="w-4 h-4 text-gray-400 mt-1" />
              <div>
                <p className="text-xs text-gray-500">Verified By</p>
                <p className="text-sm font-medium text-gray-900">
                  {currentStatus.verified_by_info.first_name} {currentStatus.verified_by_info.last_name}
                </p>
                <p className="text-xs text-gray-500">{currentStatus.verified_by_info.email}</p>
              </div>
            </div>
          )}

          {/* Verified Date */}
          {currentStatus.verified_date && (
            <div className="flex items-start gap-2">
              <Calendar className="w-4 h-4 text-gray-400 mt-1" />
              <div>
                <p className="text-xs text-gray-500">Verified Date</p>
                <p className="text-sm font-medium text-gray-900">
                  {formatDate(currentStatus.verified_date)}
                </p>
              </div>
            </div>
          )}

          {/* Collected By */}
          {currentStatus.collected_by_info && (
            <div className="flex items-start gap-2">
              <User className="w-4 h-4 text-gray-400 mt-1" />
              <div>
                <p className="text-xs text-gray-500">Collected By</p>
                <p className="text-sm font-medium text-gray-900">
                  {currentStatus.collected_by_info.first_name} {currentStatus.collected_by_info.last_name}
                </p>
              </div>
            </div>
          )}

          {/* Collected Date */}
          {currentStatus.collected_date && (
            <div className="flex items-start gap-2">
              <Calendar className="w-4 h-4 text-gray-400 mt-1" />
              <div>
                <p className="text-xs text-gray-500">Collected Date</p>
                <p className="text-sm font-medium text-gray-900">
                  {formatDate(currentStatus.collected_date)}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Rejection Reason */}
        {currentStatus.verification_status === 'REJECTED' && currentStatus.rejection_reason && (
          <div className="mt-4 pt-4 border-t border-red-200">
            <p className="text-xs text-red-600 font-medium mb-2">Rejection Reason</p>
            <p className="text-sm text-gray-700 bg-white rounded p-3 border border-red-200">
              {currentStatus.rejection_reason}
            </p>
          </div>
        )}
      </div>

      {/* Review Notes Section */}
      {reviewNotes.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-bold text-gray-900">Review Notes</h3>
            <span className="ml-auto px-2 py-1 bg-indigo-100 text-indigo-800 text-xs font-medium rounded-full">
              {reviewNotes.length}
            </span>
          </div>

          <div className="space-y-3">
            {reviewNotes.map(note => (
              <div key={note.note_id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-900">
                      {note.created_by_name || 'System'}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {formatDate(note.created_at)}
                  </span>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{note.note_text}</p>
                {!note.is_internal && (
                  <span className="inline-block mt-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                    Visible to Data Collector
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Verification History Section */}
      {verificationHistory.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <History className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-bold text-gray-900">Verification History</h3>
            <span className="ml-auto px-2 py-1 bg-gray-100 text-gray-800 text-xs font-medium rounded-full">
              {verificationHistory.length} {verificationHistory.length === 1 ? 'event' : 'events'}
            </span>
          </div>

          <div className="space-y-2">
            {verificationHistory.map((entry, index) => {
              const isExpanded = expandedHistory.has(entry.history_id);
              const historyStatusConfig = getStatusConfig(entry.new_status || entry.action);
              
              return (
                <div 
                  key={entry.history_id || index} 
                  className="border border-gray-200 rounded-lg overflow-hidden hover:border-gray-300 transition-colors"
                >
                  <button
                    onClick={() => toggleHistoryExpand(entry.history_id)}
                    className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className={`${historyStatusConfig.text}`}>
                        {historyStatusConfig.icon}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">
                            {entry.action_display || historyStatusConfig.label}
                          </span>
                          {entry.performed_by_info && (
                            <span className="text-xs text-gray-500">
                              by {entry.performed_by_info.first_name} {entry.performed_by_info.last_name}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {formatDate(entry.timestamp)}
                        </p>
                      </div>
                    </div>
                    {entry.notes && (
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-gray-400" />
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                    )}
                  </button>

                  {isExpanded && entry.notes && (
                    <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                      <p className="text-xs text-gray-500 font-medium mb-1">Notes:</p>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{entry.notes}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* No History Message */}
      {verificationHistory.length === 0 && reviewNotes.length === 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <History className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">No Verification History</p>
          <p className="text-sm text-gray-500 mt-1">
            No previous verification actions or notes have been recorded for this site
          </p>
        </div>
      )}
    </div>
  );
};

export default VerificationStatusTab;