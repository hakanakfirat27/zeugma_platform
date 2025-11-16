// frontend/src/components/NotesTab.jsx
/**
 * Enhanced NotesTab Component
 * Features:
 * - Real-time WebSocket updates
 * - Badge count for parent components
 * - Toast notifications for all actions
 * - DeleteConfirmationModal integration
 * - WhatsApp-style chat layout
 */

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import useToast from '../hooks/useToast';
import { useAuth } from '../contexts/AuthContext';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import { 
  MessageSquare, 
  Send, 
  Edit2, 
  Trash2, 
  Save, 
  X,
  Clock 
} from 'lucide-react';

const NotesTab = ({ siteId, readOnly = false, onNotesCountChange }) => {
  const queryClient = useQueryClient();
  const { success, error: showError, info } = useToast();
  const [newNoteText, setNewNoteText] = useState('');
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editText, setEditText] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState(null);
  
  // Get user from useAuth hook
  const { user: currentUser } = useAuth();

  // ============================================================================
  // WEBSOCKET CONNECTION FOR REAL-TIME UPDATES
  // ============================================================================
  
  useEffect(() => {
    if (!siteId) return;
    
    // Connect to WebSocket for notifications
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/ws/notifications/`;
    
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log('📡 WebSocket connected for notes');
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('📨 Received WebSocket message:', data);
      
      if (String(data.site_id) === String(siteId)) {  
        console.log('✅ MATCH! Processing notification');

        if (data.type === 'note_created') {
          queryClient.invalidateQueries(['site-notes', siteId]);
          info(`New note from ${data.note.created_by_name}`);
        } else if (data.type === 'note_updated') {
          queryClient.invalidateQueries(['site-notes', siteId]);
          info('Note was updated');
        } else if (data.type === 'note_deleted') {
          queryClient.invalidateQueries(['site-notes', siteId]);
          info('Note was deleted');
        }
      } else {
        console.log('❌ NO MATCH:', {
          received: data.site_id,
          expected: siteId
        });
      }
    };
    
    ws.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
    };
    
    ws.onclose = () => {
      console.log('📡 WebSocket disconnected');
    };
    
    // Cleanup on unmount
    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [siteId, queryClient, info]);

  // ============================================================================
  // FETCH NOTES (Sorted by most recent first)
  // ============================================================================
  
  const { data: notes = [], isLoading, error } = useQuery({
    queryKey: ['site-notes', siteId],
    queryFn: async () => {
      const response = await api.get(`/api/sites/${siteId}/notes/`);
      console.log('📝 NotesTab - Fetched notes:', response.data);
      // Sort by created_at descending (most recent first)
      const sortedNotes = (response.data || []).sort((a, b) => {
        return new Date(b.created_at) - new Date(a.created_at);
      });
      return sortedNotes;
    },
    enabled: !!siteId,
  });

  // ============================================================================
  // UPDATE NOTES COUNT WHENEVER NOTES CHANGE
  // ============================================================================
  
  useEffect(() => {
    if (onNotesCountChange && notes) {
      onNotesCountChange(notes.length);
    }
  }, [notes, onNotesCountChange]);

  // ============================================================================
  // ADD NOTE MUTATION
  // ============================================================================
  
  const addNoteMutation = useMutation({
    mutationFn: async (noteData) => {
      const response = await api.post(`/api/sites/${siteId}/notes/`, noteData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['site-notes', siteId]);
      setNewNoteText('');
      success('Note added successfully');
    },
    onError: (error) => {
      showError(error.response?.data?.note_text?.[0] || 'Failed to add note');
    },
  });

  // ============================================================================
  // UPDATE NOTE MUTATION
  // ============================================================================
  
  const updateNoteMutation = useMutation({
    mutationFn: async ({ noteId, noteData }) => {
      const response = await api.patch(`/api/notes/${noteId}/`, noteData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['site-notes', siteId]);
      setEditingNoteId(null);
      setEditText('');
      success('Note updated successfully');
    },
    onError: (error) => {
      showError(error.response?.data?.note_text?.[0] || 'Failed to update note');
    },
  });

  // ============================================================================
  // DELETE NOTE MUTATION
  // ============================================================================
  
  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId) => {
      await api.delete(`/api/notes/${noteId}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['site-notes', siteId]);
      setDeleteModalOpen(false);
      setNoteToDelete(null);
      success('Note deleted successfully');
    },
    onError: (error) => {
      showError(error.response?.data?.detail || 'Failed to delete note');
      setDeleteModalOpen(false);
      setNoteToDelete(null);
    },
  });

  // ============================================================================
  // HANDLERS
  // ============================================================================
  
  const handleAddNote = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (!newNoteText.trim()) {
      showError('Please enter a note');
      return;
    }

    addNoteMutation.mutate({
      note_text: newNoteText.trim(),
      site: siteId,
      is_internal: false,
    });
  };

  const handleStartEdit = (note) => {
    setEditingNoteId(note.note_id);
    setEditText(note.note_text);
  };

  const handleCancelEdit = () => {
    setEditingNoteId(null);
    setEditText('');
  };

  const handleSaveEdit = (noteId) => {
    if (!editText.trim()) {
      showError('Note cannot be empty');
      return;
    }

    updateNoteMutation.mutate({
      noteId,
      noteData: {
        note_text: editText.trim(),
      },
    });
  };

  const handleDeleteClick = (note) => {
    setNoteToDelete(note);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (noteToDelete) {
      deleteNoteMutation.mutate(noteToDelete.note_id);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModalOpen(false);
    setNoteToDelete(null);
  };

  // ============================================================================
  // FORMAT DATE - Full date and time in user's timezone
  // ============================================================================
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    
    // Format: 14.11.2025 - 22:59
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${day}.${month}.${year} - ${hours}:${minutes}`;
  };

  // ============================================================================
  // GET USER INITIALS
  // ============================================================================
  
  const getUserInitials = (createdByInfo) => {
    if (createdByInfo?.initials) {
      return createdByInfo.initials;
    }
    if (createdByInfo?.full_name) {
      return createdByInfo.full_name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    if (createdByInfo?.username) {
      return createdByInfo.username.substring(0, 2).toUpperCase();
    }
    return 'U';
  };

  // ============================================================================
  // CHECK IF USER IS ADMIN
  // ============================================================================
  
  const isAdminUser = (user) => {
    if (!user || !user.role) return false;
    return user.role === 'SUPERADMIN' || user.role === 'STAFF_ADMIN';
  };

  // ============================================================================
  // CHECK IF NOTE IS FROM ADMIN
  // ============================================================================
  
  const isNoteFromAdmin = (note) => {
    if (note.created_by_info && note.created_by_info.role) {
      return note.created_by_info.role === 'SUPERADMIN' || note.created_by_info.role === 'STAFF_ADMIN';
    }
    return false;
  };

  // ============================================================================
  // CHECK IF NOTE IS OWN
  // ============================================================================
  
  const isOwnNote = (note) => {
    if (!currentUser || !note.created_by_info) return false;
    
    const noteCreatorId = note.created_by_info.id || note.created_by_info.user_id;
    const currentUserId = currentUser.id || currentUser.user_id;
    const noteCreatorInfoId = note.created_by_info.id;
    
    const match = noteCreatorId === currentUserId || noteCreatorInfoId === currentUserId;
    
    return match;
  };

  const isCurrentUserAdmin = isAdminUser(currentUser);

  // ============================================================================
  // RENDER
  // ============================================================================

  if (!siteId) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-500">
        <MessageSquare className="w-12 h-12 mb-4 opacity-50" />
        <p>Please save the site first to add notes</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-lg">
        Failed to load notes. Please try again.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ======================================================================
          NOTES COUNT HEADER
      ====================================================================== */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Notes ({notes.length})
        </h3>
      </div>

      {/* ======================================================================
          ADD NEW NOTE FORM
      ====================================================================== */}
      {!readOnly && (
        <div className="space-y-2">
          <textarea
            value={newNoteText}
            onChange={(e) => setNewNoteText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.ctrlKey) {
                handleAddNote(e);
              }
            }}
            placeholder="Add a note about this site... (Ctrl+Enter to save)"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows="3"
          />
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleAddNote}
              disabled={addNoteMutation.isPending || !newNoteText.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4 h-4" />
              {addNoteMutation.isPending ? 'Adding...' : 'Add Note'}
            </button>
          </div>
        </div>
      )}

      {/* ======================================================================
          NOTES LIST - WhatsApp Style (Admin right, Data Collector left)
      ====================================================================== */}
      <div className="space-y-3">
        {notes.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No notes yet</p>
            {!readOnly && <p className="text-sm mt-2">Be the first to add a note!</p>}
          </div>
        ) : (
          notes.map((note) => {
            const isEditing = editingNoteId === note.note_id;
            const noteIsOwn = isOwnNote(note);
            const noteFromAdmin = isNoteFromAdmin(note);
            
            // WhatsApp-style alignment
            const alignmentClass = noteFromAdmin ? 'ml-auto' : 'mr-auto';
            const bgColorClass = noteFromAdmin ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200';
            const maxWidthClass = 'max-w-[80%]';

            return (
              <div 
                key={note.note_id} 
                className={`${alignmentClass} ${maxWidthClass}`}
              >
                <div className={`rounded-lg p-4 border ${bgColorClass} transition-colors relative`}>
                  {/* Note Header */}
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {/* User Avatar */}
                      <div className={`w-8 h-8 rounded-full ${noteFromAdmin ? 'bg-blue-600' : 'bg-green-600'} text-white flex items-center justify-center text-sm font-semibold flex-shrink-0`}>
                        {getUserInitials(note.created_by_info)}
                      </div>
                      
                      {/* User Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 flex items-center gap-2 flex-wrap">
                          <span className="truncate">{note.created_by_name || note.created_by_info?.full_name || 'Unknown User'}</span>
                          {note.is_internal && (
                            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded whitespace-nowrap">
                              Internal
                            </span>
                          )}
                          {noteFromAdmin && (
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded whitespace-nowrap">
                              Admin
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(note.created_at)}
                        </p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    {noteIsOwn && !readOnly && !isEditing && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartEdit(note);
                          }}
                          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-100 rounded-md transition-all"
                          title="Edit note"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(note);
                          }}
                          className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-100 rounded-md transition-all"
                          title="Delete note"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Note Content */}
                  {isEditing ? (
                    <div className="space-y-2 mt-3">
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        rows="3"
                        autoFocus
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          className="flex items-center gap-1 px-3 py-1.5 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-md transition-all"
                        >
                          <X className="w-4 h-4" />
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(note.note_id)}
                          disabled={updateNoteMutation.isPending || !editText.trim()}
                          className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all"
                        >
                          <Save className="w-4 h-4" />
                          {updateNoteMutation.isPending ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-700 whitespace-pre-wrap break-words">{note.note_text}</p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ======================================================================
          DELETE CONFIRMATION MODAL
      ====================================================================== */}
      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Note"
        message="Are you sure you want to delete this note?"
        itemName={noteToDelete?.note_text?.substring(0, 100) + (noteToDelete?.note_text?.length > 100 ? '...' : '')}
        isDeleting={deleteNoteMutation.isPending}
      />
    </div>
  );
};

export default NotesTab;