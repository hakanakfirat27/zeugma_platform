// frontend/src/components/client/NoteModal.jsx
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, StickyNote, Save, Loader2, Pin, PinOff } from 'lucide-react';

const NOTE_COLORS = [
  { id: 'yellow', bg: 'bg-yellow-100', border: 'border-yellow-300', text: 'text-yellow-800', ring: 'ring-yellow-400' },
  { id: 'blue', bg: 'bg-blue-100', border: 'border-blue-300', text: 'text-blue-800', ring: 'ring-blue-400' },
  { id: 'green', bg: 'bg-green-100', border: 'border-green-300', text: 'text-green-800', ring: 'ring-green-400' },
  { id: 'pink', bg: 'bg-pink-100', border: 'border-pink-300', text: 'text-pink-800', ring: 'ring-pink-400' },
  { id: 'purple', bg: 'bg-purple-100', border: 'border-purple-300', text: 'text-purple-800', ring: 'ring-purple-400' },
  { id: 'orange', bg: 'bg-orange-100', border: 'border-orange-300', text: 'text-orange-800', ring: 'ring-orange-400' },
];

const NoteModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  note = null,  // null for new note, object for editing
  companyName = null,  // null for report note, string for company note
  recordId = null,
  isLoading = false
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [color, setColor] = useState('yellow');
  const [isPinned, setIsPinned] = useState(false);

  // Populate form when editing
  useEffect(() => {
    if (note) {
      setTitle(note.title || '');
      setContent(note.content || '');
      setColor(note.color || 'yellow');
      setIsPinned(note.is_pinned || false);
    } else {
      setTitle('');
      setContent('');
      setColor('yellow');
      setIsPinned(false);
    }
  }, [note, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!content.trim()) {
      return;
    }

    onSave({
      id: note?.id,
      title: title.trim(),
      content: content.trim(),
      color,
      is_pinned: isPinned,
      record_id: recordId,
      company_name: companyName,
    });
  };

  const selectedColor = NOTE_COLORS.find(c => c.id === color) || NOTE_COLORS[0];

  if (!isOpen) return null;

  return createPortal(
    <div onClick={(e) => e.stopPropagation()}>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-[80] transition-opacity"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      />
      
      {/* Modal */}
      <div 
        className="fixed inset-0 z-[80] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex min-h-full items-center justify-center p-4">
          <div 
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg transform transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className={`p-5 rounded-t-2xl ${selectedColor.bg} border-b ${selectedColor.border}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-white/50`}>
                    <StickyNote className={`w-5 h-5 ${selectedColor.text}`} />
                  </div>
                  <div>
                    <h2 className={`text-lg font-bold ${selectedColor.text}`}>
                      {note ? 'Edit Note' : 'Add Note'}
                    </h2>
                    <p className={`text-sm ${selectedColor.text} opacity-80`}>
                      {companyName ? `For: ${companyName}` : 'Report Note'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className={`p-2 rounded-lg hover:bg-white/50 transition-colors`}
                >
                  <X className={`w-5 h-5 ${selectedColor.text}`} />
                </button>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* Color Picker */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Note Color
                </label>
                <div className="flex gap-2">
                  {NOTE_COLORS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setColor(c.id)}
                      className={`w-8 h-8 rounded-full ${c.bg} ${c.border} border-2 transition-all ${
                        color === c.id ? `ring-2 ${c.ring} ring-offset-2` : 'hover:scale-110'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Give your note a title..."
                  maxLength={200}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                />
              </div>

              {/* Content */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Note <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write your note here..."
                  rows={5}
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors resize-none"
                />
                <p className="text-xs text-gray-400 mt-1 text-right">
                  {content.length} characters
                </p>
              </div>

              {/* Pin Toggle */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  {isPinned ? (
                    <Pin className="w-4 h-4 text-purple-600" />
                  ) : (
                    <PinOff className="w-4 h-4 text-gray-400" />
                  )}
                  <span className="text-sm font-medium text-gray-700">Pin this note</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPinned(!isPinned)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    isPinned ? 'bg-purple-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      isPinned ? 'translate-x-5' : ''
                    }`}
                  />
                </button>
              </div>
            </form>

            {/* Footer */}
            <div className="p-5 border-t border-gray-200 bg-gray-50 rounded-b-2xl flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-medium text-sm transition-colors"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isLoading || !content.trim()}
                className="px-5 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {note ? 'Update Note' : 'Save Note'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default NoteModal;
