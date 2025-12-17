// frontend/src/components/client/CompanyNoteButton.jsx
import { useState, useEffect, useRef } from 'react';
import { StickyNote, Plus, Edit2, Trash2, Pin, X, AlertTriangle, Loader2, Check } from 'lucide-react';
import { createPortal } from 'react-dom';
import NoteModal from './NoteModal';
import api from '../../utils/api';

const NOTE_COLORS = {
  yellow: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-800', accent: 'bg-yellow-400' },
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', accent: 'bg-blue-400' },
  green: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800', accent: 'bg-green-400' },
  pink: { bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-800', accent: 'bg-pink-400' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-800', accent: 'bg-purple-400' },
  orange: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-800', accent: 'bg-orange-400' },
};

// Toast Component
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const styles = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
  };

  return (
    <div className={`${styles[type]} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-in slide-in-from-top-2 duration-300`}>
      {type === 'success' && <Check className="w-5 h-5" />}
      {type === 'error' && <X className="w-5 h-5" />}
      <span className="text-sm font-medium">{message}</span>
    </div>
  );
};

// Delete Confirmation Modal
const DeleteConfirmModal = ({ isOpen, onClose, onConfirm, noteName, isDeleting }) => {
  if (!isOpen) return null;

  return createPortal(
    <div onClick={(e) => e.stopPropagation()}>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-[70]" onClick={onClose} />
      
      {/* Modal */}
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
          {/* Header */}
          <div className="bg-red-50 px-6 py-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Delete Note</h3>
                <p className="text-sm text-gray-600">This action cannot be undone</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-4">
            <p className="text-gray-700">
              Are you sure you want to delete {noteName ? (
                <span className="font-semibold">"{noteName}"</span>
              ) : (
                'this note'
              )}?
            </p>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3">
            <button
              onClick={onClose}
              disabled={isDeleting}
              className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-medium text-sm transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isDeleting}
              className="px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium text-sm transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Delete Note
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

// Standalone View Modal Component (rendered outside the button)
const CompanyNotesViewModal = ({
  isOpen,
  onClose,
  reportId,
  recordId,
  companyName,
  onNotesChanged
}) => {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [saving, setSaving] = useState(false);
  
  // Delete confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Toast state
  const [toasts, setToasts] = useState([]);
  
  // Track if changes were made
  const hasChangesRef = useRef(false);

  const showToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Fetch notes
  const fetchNotes = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/client/notes/?report_id=${reportId}&record_id=${recordId}`);
      setNotes(response.data.results || []);
    } catch (error) {
      console.error('Error fetching notes:', error);
      showToast('Failed to load notes', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotes();
      hasChangesRef.current = false;
    }
  }, [isOpen, reportId, recordId]);

  // When modal closes, notify parent if changes were made
  const handleClose = () => {
    if (hasChangesRef.current && onNotesChanged) {
      onNotesChanged();
    }
    onClose();
  };

  const handleSave = async (noteData) => {
    try {
      setSaving(true);
      
      if (noteData.id) {
        await api.patch(`/api/client/notes/${noteData.id}/`, {
          title: noteData.title,
          content: noteData.content,
          color: noteData.color,
          is_pinned: noteData.is_pinned,
        });
        showToast('Note updated successfully', 'success');
      } else {
        await api.post('/api/client/notes/', {
          report_id: reportId,
          record_id: recordId,
          company_name: companyName,
          title: noteData.title,
          content: noteData.content,
          color: noteData.color,
          is_pinned: noteData.is_pinned,
        });
        showToast('Note created successfully', 'success');
      }
      
      setShowEditModal(false);
      setEditingNote(null);
      hasChangesRef.current = true;
      
      // Refresh notes list
      fetchNotes();
    } catch (error) {
      console.error('Error saving note:', error);
      showToast('Failed to save note', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (note) => {
    setNoteToDelete(note);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!noteToDelete) return;
    
    try {
      setIsDeleting(true);
      await api.delete(`/api/client/notes/${noteToDelete.id}/`);
      showToast('Note deleted successfully', 'success');
      
      setShowDeleteConfirm(false);
      setNoteToDelete(null);
      hasChangesRef.current = true;
      
      // Refresh notes list
      fetchNotes();
    } catch (error) {
      console.error('Error deleting note:', error);
      showToast('Failed to delete note', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleTogglePin = async (note) => {
    try {
      await api.patch(`/api/client/notes/${note.id}/`, {
        is_pinned: !note.is_pinned,
      });
      showToast(note.is_pinned ? 'Note unpinned' : 'Note pinned', 'success');
      hasChangesRef.current = true;
      fetchNotes();
    } catch (error) {
      console.error('Error toggling pin:', error);
      showToast('Failed to update note', 'error');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (!isOpen) return null;

  return createPortal(
    <div onClick={(e) => e.stopPropagation()}>
      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2">
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>

      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-[60]" 
        onClick={handleClose}
      />
      
      {/* Modal - Centered */}
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div 
          className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-500 to-indigo-500 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-lg flex items-center justify-center">
                  <StickyNote className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg">Company Notes</h3>
                  <p className="text-purple-100 text-sm truncate max-w-[300px]">{companyName}</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>

          {/* Notes list */}
          <div className="max-h-[400px] overflow-y-auto p-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
              </div>
            ) : notes.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <StickyNote className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500">No notes yet</p>
                <p className="text-gray-400 text-sm mt-1">Add your first note below</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notes.map(note => {
                  const colors = NOTE_COLORS[note.color] || NOTE_COLORS.yellow;
                  return (
                    <div 
                      key={note.id}
                      className={`relative rounded-xl border-2 ${colors.border} ${colors.bg} p-4 group transition-shadow hover:shadow-md`}
                    >
                      {/* Color indicator */}
                      <div className={`absolute top-0 left-0 w-1.5 h-full rounded-l-xl ${colors.accent}`} />
                      
                      {/* Pin badge */}
                      {note.is_pinned && (
                        <div className="absolute -top-2 -right-2 bg-purple-600 text-white p-1 rounded-full shadow">
                          <Pin className="w-3 h-3" />
                        </div>
                      )}
                      
                      {/* Content */}
                      <div className="pl-3">
                        {note.title && (
                          <h4 className={`font-semibold text-sm ${colors.text} mb-1`}>{note.title}</h4>
                        )}
                        <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{note.content}</p>
                        
                        {/* Footer */}
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200/50">
                          <span className="text-xs text-gray-400">{formatDate(note.updated_at)}</span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleTogglePin(note)}
                              className={`p-1.5 rounded-lg transition-colors ${
                                note.is_pinned 
                                  ? 'bg-purple-100 text-purple-600' 
                                  : 'hover:bg-gray-100 text-gray-400 hover:text-gray-600'
                              }`}
                              title={note.is_pinned ? 'Unpin' : 'Pin'}
                            >
                              <Pin className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setEditingNote(note);
                                setShowEditModal(true);
                              }}
                              className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(note)}
                              className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Add note button */}
          <div className="p-4 border-t border-gray-100 bg-gray-50">
            <button
              onClick={() => {
                setEditingNote(null);
                setShowEditModal(true);
              }}
              className="w-full px-4 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 font-medium flex items-center justify-center gap-2 transition-colors shadow-lg shadow-purple-200"
            >
              <Plus className="w-5 h-5" />
              Add New Note
            </button>
          </div>
        </div>
      </div>

      {/* Edit/Create Note Modal */}
      <NoteModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingNote(null);
        }}
        onSave={handleSave}
        note={editingNote}
        companyName={companyName}
        recordId={recordId}
        isLoading={saving}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setNoteToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        noteName={noteToDelete?.title}
        isDeleting={isDeleting}
      />
    </div>,
    document.body
  );
};

// Main Button Component
const CompanyNoteButton = ({ 
  reportId, 
  recordId, 
  companyName,
  noteCount = 0,
  onNoteAdded 
}) => {
  const [showViewModal, setShowViewModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Toast state for add modal (when no notes exist)
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const handleButtonClick = (e) => {
    e.stopPropagation();
    
    if (noteCount > 0) {
      setShowViewModal(true);
    } else {
      setShowAddModal(true);
    }
  };

  const handleAddNote = async (noteData) => {
    try {
      setSaving(true);
      await api.post('/api/client/notes/', {
        report_id: reportId,
        record_id: recordId,
        company_name: companyName,
        title: noteData.title,
        content: noteData.content,
        color: noteData.color,
        is_pinned: noteData.is_pinned,
      });
      
      showToast('Note created successfully', 'success');
      setShowAddModal(false);
      
      // Notify parent after a short delay to let toast show
      setTimeout(() => {
        if (onNoteAdded) {
          onNoteAdded();
        }
      }, 500);
    } catch (error) {
      console.error('Error saving note:', error);
      showToast('Failed to save note', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleViewModalClose = () => {
    setShowViewModal(false);
  };

  const handleNotesChanged = () => {
    if (onNoteAdded) {
      onNoteAdded();
    }
  };

  return (
    <>
      {/* Toast Container for Add Modal */}
      {toasts.length > 0 && createPortal(
        <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2">
          {toasts.map(toast => (
            <Toast
              key={toast.id}
              message={toast.message}
              type={toast.type}
              onClose={() => removeToast(toast.id)}
            />
          ))}
        </div>,
        document.body
      )}

      <button
        onClick={handleButtonClick}
        className={`relative p-1.5 rounded-lg transition-all ${
          noteCount > 0
            ? 'text-purple-600 bg-purple-50 hover:bg-purple-100'
            : 'text-gray-400 hover:text-purple-600 hover:bg-purple-50'
        }`}
        title={noteCount > 0 ? `${noteCount} note(s)` : 'Add note'}
      >
        <StickyNote className="w-4 h-4" />
        {noteCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-purple-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {noteCount > 9 ? '9+' : noteCount}
          </span>
        )}
      </button>

      {/* View Notes Modal (has its own state management) */}
      <CompanyNotesViewModal
        isOpen={showViewModal}
        onClose={handleViewModalClose}
        reportId={reportId}
        recordId={recordId}
        companyName={companyName}
        onNotesChanged={handleNotesChanged}
      />

      {/* Add Note Modal (for when no notes exist) */}
      <NoteModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleAddNote}
        companyName={companyName}
        recordId={recordId}
        isLoading={saving}
      />
    </>
  );
};

export default CompanyNoteButton;
