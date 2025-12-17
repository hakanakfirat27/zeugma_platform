// frontend/src/components/client/ClientNotesPanel.jsx
import { useState, useEffect, useMemo } from 'react';
import { 
  X, Plus, Search, StickyNote, FileText, Building2, 
  Edit2, Trash2, Pin, PinOff, MoreVertical, Loader2,
  Clock, AlertTriangle, ChevronRight
} from 'lucide-react';
import { createPortal } from 'react-dom';
import api from '../../utils/api';
import { useToast } from '../../contexts/ToastContext';

// Delete Confirmation Modal
const DeleteConfirmModal = ({ isOpen, onClose, onConfirm, isDeleting }) => {
  if (!isOpen) return null;

  return createPortal(
    <div onClick={(e) => e.stopPropagation()}>
      <div className="fixed inset-0 bg-black/50 z-[100]" onClick={onClose} />
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
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
      <div className="bg-white rounded-xl p-3 border-2 border-purple-300 shadow-sm">
        <textarea
          value={editContent}
          onChange={(e) => onEditChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-purple-500"
          rows={3}
          autoFocus
        />
        <div className="flex justify-end gap-2 mt-2">
          <button onClick={onCancelEdit} className="px-3 py-1.5 text-gray-600 text-sm font-medium">
            Cancel
          </button>
          <button 
            onClick={onSaveEdit} 
            disabled={isSaving}
            className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm font-medium flex items-center gap-1"
          >
            {isSaving && <Loader2 className="w-3 h-3 animate-spin" />}
            Save
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`group bg-white rounded-xl p-3 border shadow-sm hover:shadow-md transition-all ${
      note.is_pinned ? 'border-purple-300 ring-2 ring-purple-200' : 'border-gray-200'
    }`}>
      {/* Pinned indicator */}
      {note.is_pinned && (
        <div className="flex items-center gap-1 mb-1.5">
          <Pin className="w-3 h-3 text-purple-500 fill-purple-500" />
          <span className="text-xs text-purple-600 font-medium">Pinned</span>
        </div>
      )}
      
      {/* Title if exists */}
      {note.title && (
        <h4 className="font-semibold text-gray-900 text-sm mb-1">{note.title}</h4>
      )}
      
      {/* Content */}
      <p className="text-gray-700 text-sm whitespace-pre-wrap">{note.content}</p>
      
      {/* Footer */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
        <span className="text-xs text-gray-500 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {formatTime(note.updated_at || note.created_at)}
        </span>
        
        {/* Actions */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 text-gray-400 hover:text-gray-600 rounded opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 bottom-6 z-20 bg-white rounded-lg shadow-lg border py-1 w-32">
                <button
                  onClick={() => { onEdit(); setShowMenu(false); }}
                  className="w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <Edit2 className="w-3.5 h-3.5" /> Edit
                </button>
                <button
                  onClick={() => { onTogglePin(); setShowMenu(false); }}
                  className="w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  {note.is_pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                  {note.is_pinned ? 'Unpin' : 'Pin'}
                </button>
                <button
                  onClick={() => { onDelete(); setShowMenu(false); }}
                  className="w-full px-3 py-1.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const ClientNotesPanel = ({ 
  reportId, 
  isOpen, 
  onClose, 
  onNoteCountChange,
  onNotesChanged 
}) => {
  const toast = useToast();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selected source state
  const [selectedSource, setSelectedSource] = useState('report'); // 'report' or company_name
  
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

  // Fetch notes
  const fetchNotes = async () => {
    if (!reportId) return;
    
    try {
      setLoading(true);
      const response = await api.get(`/api/client/notes/?report_id=${reportId}`);
      setNotes(response.data.results || []);
      
      // Update parent count
      if (onNoteCountChange) {
        onNoteCountChange(response.data.results?.length || 0);
      }
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

  // Group notes by source
  const { sources, selectedNotes, stats } = useMemo(() => {
    // Report notes
    const reportNotes = notes.filter(n => n.is_report_note);
    
    // Company notes grouped by company
    const companyGroups = {};
    notes.filter(n => !n.is_report_note).forEach(note => {
      const key = note.company_name || 'Unknown';
      if (!companyGroups[key]) {
        companyGroups[key] = {
          name: key,
          country: note.country || '',
          notes: [],
          recordId: note.record_id
        };
      }
      companyGroups[key].notes.push(note);
    });
    
    // Build sources list
    const sourcesList = [
      { type: 'report', name: 'Report Notes', count: reportNotes.length, icon: 'report' }
    ];
    
    // Add companies sorted by note count
    Object.values(companyGroups)
      .sort((a, b) => b.notes.length - a.notes.length)
      .forEach(company => {
        sourcesList.push({
          type: 'company',
          name: company.name,
          country: company.country,
          count: company.notes.length,
          icon: 'company',
          recordId: company.recordId
        });
      });
    
    // Get notes for selected source
    let filteredNotes = [];
    if (selectedSource === 'report') {
      filteredNotes = reportNotes;
    } else {
      filteredNotes = companyGroups[selectedSource]?.notes || [];
    }
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filteredNotes = filteredNotes.filter(n => 
        n.content?.toLowerCase().includes(query) ||
        n.title?.toLowerCase().includes(query)
      );
    }
    
    // Sort: pinned first, then by date
    filteredNotes.sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      return new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at);
    });
    
    return {
      sources: sourcesList,
      selectedNotes: filteredNotes,
      stats: {
        total: notes.length,
        report: reportNotes.length,
        companies: Object.keys(companyGroups).length
      }
    };
  }, [notes, selectedSource, searchQuery]);

  // Get current source info
  const currentSource = sources.find(s => 
    s.type === 'report' ? selectedSource === 'report' : s.name === selectedSource
  );

  // Add note
  const handleAddNote = async () => {
    if (!newNoteContent.trim()) return;
    
    try {
      setSaving(true);
      
      const noteData = {
        report_id: reportId,
        content: newNoteContent.trim(),
        title: newNoteTitle.trim() || null,
        is_report_note: selectedSource === 'report',
      };
      
      // If company note, include company info
      if (selectedSource !== 'report') {
        const companySource = sources.find(s => s.name === selectedSource);
        if (companySource) {
          noteData.company_name = companySource.name;
          noteData.record_id = companySource.recordId;
        }
      }
      
      await api.post('/api/client/notes/', noteData);
      
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

  return (
    <div className="h-full bg-white flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
              <StickyNote className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-lg">My Notes</h2>
              <p className="text-amber-100 text-sm">{stats.total} notes</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Two Column Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column: Source List */}
        <div className="w-2/5 border-r border-gray-200 flex flex-col bg-gray-50">
          {/* Search */}
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 text-purple-600 animate-spin" />
              </div>
            ) : (
              <>
                {/* Report Notes Item */}
                <button
                  onClick={() => setSelectedSource('report')}
                  className={`w-full px-3 py-2.5 flex items-center gap-2 border-l-4 transition-all ${
                    selectedSource === 'report'
                      ? 'bg-purple-100 border-purple-500'
                      : 'border-transparent hover:bg-purple-50 hover:border-purple-300'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    selectedSource === 'report' ? 'bg-purple-200' : 'bg-purple-100'
                  }`}>
                    <FileText className="w-4 h-4 text-purple-600" />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className={`text-sm font-semibold truncate ${
                      selectedSource === 'report' ? 'text-purple-900' : 'text-gray-800'
                    }`}>Report Notes</p>
                    <p className="text-xs text-gray-500">General notes</p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    selectedSource === 'report' 
                      ? 'bg-purple-500 text-white' 
                      : 'bg-purple-200 text-purple-700'
                  }`}>
                    {stats.report}
                  </span>
                </button>

                {/* Divider */}
                {sources.length > 1 && (
                  <div className="px-3 py-2 bg-gray-100 border-y">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Companies ({stats.companies})
                    </p>
                  </div>
                )}

                {/* Company Items */}
                {sources.filter(s => s.type === 'company').map(source => (
                  <button
                    key={source.name}
                    onClick={() => setSelectedSource(source.name)}
                    className={`w-full px-3 py-2.5 flex items-center gap-2 border-l-4 transition-all ${
                      selectedSource === source.name
                        ? 'bg-amber-100 border-amber-500'
                        : 'border-transparent hover:bg-amber-50 hover:border-amber-300'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      selectedSource === source.name ? 'bg-amber-200' : 'bg-amber-100'
                    }`}>
                      <Building2 className="w-4 h-4 text-amber-600" />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className={`text-sm font-medium truncate ${
                        selectedSource === source.name ? 'text-amber-900' : 'text-gray-800'
                      }`}>{source.name}</p>
                      {source.country && (
                        <p className="text-xs text-gray-500">{source.country}</p>
                      )}
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      selectedSource === source.name 
                        ? 'bg-amber-500 text-white' 
                        : 'bg-amber-200 text-amber-700'
                    }`}>
                      {source.count}
                    </span>
                  </button>
                ))}

                {/* Empty state for companies */}
                {sources.filter(s => s.type === 'company').length === 0 && (
                  <div className="px-3 py-6 text-center">
                    <Building2 className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-xs text-gray-500">No company notes yet</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right Column: Notes Detail */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Selected Item Header */}
          <div className={`px-4 py-3 border-b flex items-center justify-between flex-shrink-0 ${
            selectedSource === 'report' ? 'bg-purple-50' : 'bg-amber-50'
          }`}>
            <div className="flex items-center gap-2 min-w-0">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                selectedSource === 'report' ? 'bg-purple-200' : 'bg-amber-200'
              }`}>
                {selectedSource === 'report' ? (
                  <FileText className="w-4 h-4 text-purple-600" />
                ) : (
                  <Building2 className="w-4 h-4 text-amber-600" />
                )}
              </div>
              <div className="min-w-0">
                <p className={`font-semibold text-sm truncate ${
                  selectedSource === 'report' ? 'text-purple-900' : 'text-amber-900'
                }`}>
                  {selectedSource === 'report' ? 'Report Notes' : selectedSource}
                </p>
                <p className={`text-xs ${
                  selectedSource === 'report' ? 'text-purple-600' : 'text-amber-600'
                }`}>
                  {selectedNotes.length} {selectedNotes.length === 1 ? 'note' : 'notes'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowAddForm(true)}
              className={`p-2 text-white rounded-lg flex items-center gap-1 text-sm font-medium ${
                selectedSource === 'report' 
                  ? 'bg-purple-600 hover:bg-purple-700' 
                  : 'bg-amber-600 hover:bg-amber-700'
              }`}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Notes List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {/* Add Note Form */}
            {showAddForm && (
              <div className={`rounded-xl p-3 border-2 ${
                selectedSource === 'report' 
                  ? 'bg-purple-50 border-purple-200' 
                  : 'bg-amber-50 border-amber-200'
              }`}>
                <input
                  type="text"
                  value={newNoteTitle}
                  onChange={(e) => setNewNoteTitle(e.target.value)}
                  placeholder="Title (optional)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-2 focus:ring-2 focus:ring-purple-500"
                />
                <textarea
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                  placeholder="Write your note..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-purple-500"
                  rows={3}
                  autoFocus
                />
                <div className="flex justify-end gap-2 mt-2">
                  <button 
                    onClick={() => { setShowAddForm(false); setNewNoteContent(''); setNewNoteTitle(''); }}
                    className="px-3 py-1.5 text-gray-600 text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddNote}
                    disabled={!newNoteContent.trim() || saving}
                    className={`px-4 py-1.5 text-white rounded-lg text-sm font-medium flex items-center gap-1 disabled:opacity-50 ${
                      selectedSource === 'report' 
                        ? 'bg-purple-600 hover:bg-purple-700' 
                        : 'bg-amber-600 hover:bg-amber-700'
                    }`}
                  >
                    {saving && <Loader2 className="w-3 h-3 animate-spin" />}
                    Add Note
                  </button>
                </div>
              </div>
            )}

            {/* Notes */}
            {!loading && selectedNotes.length === 0 && !showAddForm ? (
              <div className="text-center py-8">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${
                  selectedSource === 'report' ? 'bg-purple-100' : 'bg-amber-100'
                }`}>
                  <StickyNote className={`w-6 h-6 ${
                    selectedSource === 'report' ? 'text-purple-400' : 'text-amber-400'
                  }`} />
                </div>
                <p className="text-gray-500 text-sm mb-2">No notes yet</p>
                <button
                  onClick={() => setShowAddForm(true)}
                  className={`text-sm font-medium hover:underline ${
                    selectedSource === 'report' ? 'text-purple-600' : 'text-amber-600'
                  }`}
                >
                  Add your first note
                </button>
              </div>
            ) : (
              selectedNotes.map(note => (
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
              ))
            )}
          </div>
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
    </div>
  );
};

export default ClientNotesPanel;
