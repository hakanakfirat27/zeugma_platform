// frontend/src/components/client/ReportNotesModal.jsx
import { useState, useEffect, useMemo } from 'react';
import { 
  X, Plus, Search, StickyNote, FileText,
  Edit2, Trash2, Pin, PinOff, MoreVertical, Loader2,
  Clock, AlertTriangle
} from 'lucide-react';
import { createPortal } from 'react-dom';
import api from '../../utils/api';
import { useToast } from '../../contexts/ToastContext';

// Delete Confirmation Modal
const DeleteConfirmModal = ({ isOpen, onClose, onConfirm, isDeleting }) => {
  if (!isOpen) return null;

  return createPortal(
    <div onClick={(e) => e.stopPropagation()}>
      <div className="fixed inset-0 bg-black/50 z-[110]" onClick={onClose} />
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
          <div className="bg-red-50 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Delete Note</h3>
                <p className="text-sm text-gray-600">This cannot be undone</p>
              </div>
            </div>
          </div>
          <div className="px-5 py-4">
            <p className="text-gray-700 text-sm">Are you sure you want to delete this note?</p>
          </div>
          <div className="px-5 py-3 bg-gray-50 flex justify-end gap-2">
            <button onClick={onClose} disabled={isDeleting} className="px-3 py-2 text-gray-600 hover:text-gray-800 text-sm font-medium">
              Cancel
            </button>
            <button onClick={onConfirm} disabled={isDeleting} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium flex items-center gap-2">
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

// Note Card Component
const NoteCard = ({ note, onEdit, onDelete, onTogglePin, isEditing, editContent, onEditChange, onSaveEdit, onCancelEdit, isSaving }) => {
  const [showMenu, setShowMenu] = useState(false);
  
  // Format relative time
  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
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

  if (isEditing) {
    return (
      <div className="bg-purple-50 rounded-xl p-4 border-2 border-purple-300">
        <textarea
          value={editContent}
          onChange={(e) => onEditChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          rows={4}
          autoFocus
        />
        <div className="flex justify-end gap-2 mt-3">
          <button onClick={onCancelEdit} className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm font-medium">
            Cancel
          </button>
          <button 
            onClick={onSaveEdit} 
            disabled={isSaving}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-purple-700 disabled:opacity-50"
          >
            {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
            Save Changes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`group bg-white rounded-xl p-4 border-2 transition-all hover:shadow-md ${
      note.is_pinned ? 'border-purple-300 bg-purple-50/50' : 'border-gray-200'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          {note.is_pinned && (
            <div className="flex items-center gap-1 mb-1">
              <Pin className="w-3.5 h-3.5 text-purple-500 fill-purple-500" />
              <span className="text-xs text-purple-600 font-semibold">Pinned</span>
            </div>
          )}
          {note.title && (
            <h4 className="font-semibold text-gray-900">{note.title}</h4>
          )}
        </div>
        
        {/* Menu */}
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-8 z-20 bg-white rounded-xl shadow-lg border py-1 w-36">
                <button
                  onClick={() => { onEdit(); setShowMenu(false); }}
                  className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <Edit2 className="w-4 h-4" /> Edit
                </button>
                <button
                  onClick={() => { onTogglePin(); setShowMenu(false); }}
                  className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  {note.is_pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                  {note.is_pinned ? 'Unpin' : 'Pin'}
                </button>
                <button
                  onClick={() => { onDelete(); setShowMenu(false); }}
                  className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <p className="text-gray-700 whitespace-pre-wrap">{note.content}</p>
      
      {/* Footer */}
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
        <Clock className="w-3.5 h-3.5 text-gray-400" />
        <span className="text-xs text-gray-500">
          {formatTime(note.updated_at || note.created_at)}
          {note.updated_at !== note.created_at && ' (edited)'}
        </span>
      </div>
    </div>
  );
};

const ReportNotesModal = ({ 
  reportId,
  reportTitle,
  isOpen, 
  onClose, 
  onNotesChanged 
}) => {
  const toast = useToast();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Add note form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [saving, setSaving] = useState(false);
  
  // Edit state
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editContent, setEditContent] = useState('');
  
  // Delete state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch report notes only
  const fetchNotes = async () => {
    if (!reportId) return;
    
    try {
      setLoading(true);
      const response = await api.get(`/api/client/notes/?report_id=${reportId}&type=report`);
      setNotes(response.data.results || []);
    } catch (error) {
      console.error('Error fetching notes:', error);
      toast.error('Failed to load notes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && reportId) {
      fetchNotes();
    }
  }, [isOpen, reportId]);

  // Filter and sort notes
  const filteredNotes = useMemo(() => {
    let result = [...notes];
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(n => 
        n.content?.toLowerCase().includes(query) ||
        n.title?.toLowerCase().includes(query)
      );
    }
    
    // Sort: pinned first, then by date
    result.sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      return new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at);
    });
    
    return result;
  }, [notes, searchQuery]);

  // Add note
  const handleAddNote = async () => {
    if (!newNoteContent.trim()) return;
    
    try {
      setSaving(true);
      await api.post('/api/client/notes/', {
        report_id: reportId,
        content: newNoteContent.trim(),
        title: newNoteTitle.trim() || null,
        is_report_note: true,
      });
      
      setNewNoteContent('');
      setNewNoteTitle('');
      setShowAddForm(false);
      await fetchNotes();
      if (onNotesChanged) onNotesChanged();
      toast.success('Note added');
    } catch (error) {
      console.error('Error adding note:', error);
      toast.error('Failed to add note');
    } finally {
      setSaving(false);
    }
  };

  // Edit note
  const handleSaveEdit = async () => {
    if (!editContent.trim() || !editingNoteId) return;
    
    try {
      setSaving(true);
      await api.patch(`/api/client/notes/${editingNoteId}/`, {
        content: editContent.trim(),
      });
      
      setEditingNoteId(null);
      setEditContent('');
      await fetchNotes();
      if (onNotesChanged) onNotesChanged();
      toast.success('Note updated');
    } catch (error) {
      console.error('Error updating note:', error);
      toast.error('Failed to update note');
    } finally {
      setSaving(false);
    }
  };

  // Toggle pin
  const handleTogglePin = async (note) => {
    try {
      await api.patch(`/api/client/notes/${note.id}/`, {
        is_pinned: !note.is_pinned,
      });
      await fetchNotes();
      toast.success(note.is_pinned ? 'Note unpinned' : 'Note pinned');
    } catch (error) {
      console.error('Error toggling pin:', error);
      toast.error('Failed to update note');
    }
  };

  // Delete note
  const handleDeleteNote = async () => {
    if (!noteToDelete) return;
    
    try {
      setDeleting(true);
      await api.delete(`/api/client/notes/${noteToDelete.id}/`);
      setShowDeleteConfirm(false);
      setNoteToDelete(null);
      await fetchNotes();
      if (onNotesChanged) onNotesChanged();
      toast.success('Note deleted');
    } catch (error) {
      console.error('Error deleting note:', error);
      toast.error('Failed to delete note');
    } finally {
      setDeleting(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-bold text-xl">Report Notes</h2>
                <p className="text-purple-200 text-sm">{reportTitle || 'Notes for this report'}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex-shrink-0 px-6 py-4 border-b bg-gray-50 flex items-center gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notes..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          
          {/* Add Button */}
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2.5 bg-purple-600 text-white rounded-xl font-medium flex items-center gap-2 hover:bg-purple-700 transition-colors shadow-md"
          >
            <Plus className="w-5 h-5" />
            Add Note
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Add Note Form */}
          {showAddForm && (
            <div className="bg-purple-50 rounded-xl p-4 border-2 border-purple-200 mb-4">
              <input
                type="text"
                value={newNoteTitle}
                onChange={(e) => setNewNoteTitle(e.target.value)}
                placeholder="Title (optional)"
                className="w-full px-4 py-2.5 border border-purple-200 rounded-lg text-sm mb-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <textarea
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                placeholder="Write your note about this report..."
                className="w-full px-4 py-3 border border-purple-200 rounded-lg text-sm resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                rows={4}
                autoFocus
              />
              <div className="flex justify-end gap-3 mt-3">
                <button 
                  onClick={() => { setShowAddForm(false); setNewNoteContent(''); setNewNoteTitle(''); }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddNote}
                  disabled={!newNoteContent.trim() || saving}
                  className="px-5 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-purple-700 disabled:opacity-50"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Note
                </button>
              </div>
            </div>
          )}

          {/* Loading */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
            </div>
          ) : filteredNotes.length === 0 ? (
            /* Empty State */
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <StickyNote className="w-8 h-8 text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {searchQuery ? 'No notes found' : 'No report notes yet'}
              </h3>
              <p className="text-gray-500 mb-4">
                {searchQuery 
                  ? 'Try a different search term' 
                  : 'Add notes to capture insights about this report'}
              </p>
              {!searchQuery && !showAddForm && (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="px-5 py-2.5 bg-purple-600 text-white rounded-xl font-medium inline-flex items-center gap-2 hover:bg-purple-700"
                >
                  <Plus className="w-5 h-5" />
                  Add Your First Note
                </button>
              )}
            </div>
          ) : (
            /* Notes List */
            <div className="space-y-3">
              {filteredNotes.map(note => (
                <NoteCard
                  key={note.id}
                  note={note}
                  isEditing={editingNoteId === note.id}
                  editContent={editContent}
                  onEditChange={setEditContent}
                  onEdit={() => {
                    setEditingNoteId(note.id);
                    setEditContent(note.content);
                  }}
                  onSaveEdit={handleSaveEdit}
                  onCancelEdit={() => {
                    setEditingNoteId(null);
                    setEditContent('');
                  }}
                  onDelete={() => {
                    setNoteToDelete(note);
                    setShowDeleteConfirm(true);
                  }}
                  onTogglePin={() => handleTogglePin(note)}
                  isSaving={saving}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-6 py-4 border-t bg-gray-50 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {notes.length} {notes.length === 1 ? 'note' : 'notes'} total
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* Delete Confirmation */}
      <DeleteConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setNoteToDelete(null);
        }}
        onConfirm={handleDeleteNote}
        isDeleting={deleting}
      />
    </div>,
    document.body
  );
};

export default ReportNotesModal;
