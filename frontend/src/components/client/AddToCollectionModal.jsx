// frontend/src/components/client/AddToCollectionModal.jsx
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, FolderPlus, Check, Plus, Loader2, 
  Folder, Star, Bookmark, Heart, Briefcase, Target, Flag, Tag,
  CheckCircle2
} from 'lucide-react';
import api from '../../utils/api';

const COLLECTION_ICONS = {
  folder: Folder,
  star: Star,
  bookmark: Bookmark,
  heart: Heart,
  briefcase: Briefcase,
  target: Target,
  flag: Flag,
  tag: Tag,
};

const COLLECTION_COLORS = {
  blue: { bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-200' },
  purple: { bg: 'bg-purple-100', text: 'text-purple-600', border: 'border-purple-200' },
  green: { bg: 'bg-green-100', text: 'text-green-600', border: 'border-green-200' },
  red: { bg: 'bg-red-100', text: 'text-red-600', border: 'border-red-200' },
  orange: { bg: 'bg-orange-100', text: 'text-orange-600', border: 'border-orange-200' },
  pink: { bg: 'bg-pink-100', text: 'text-pink-600', border: 'border-pink-200' },
  teal: { bg: 'bg-teal-100', text: 'text-teal-600', border: 'border-teal-200' },
  indigo: { bg: 'bg-indigo-100', text: 'text-indigo-600', border: 'border-indigo-200' },
};

const AddToCollectionModal = ({
  isOpen,
  onClose,
  companyData, // { reportId, recordId, companyName, country }
  collections = [],
  onAddToCollections,
  onCreateCollection,
  isLoading = false,
  toast = null // Toast context for notifications
}) => {
  const [selectedCollections, setSelectedCollections] = useState(new Set());
  const [existingCollectionIds, setExistingCollectionIds] = useState(new Set());
  const [loadingMembership, setLoadingMembership] = useState(false);
  const [showCreateNew, setShowCreateNew] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [newCollectionColor, setNewCollectionColor] = useState('blue');
  const [newCollectionIcon, setNewCollectionIcon] = useState('folder');
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  // Fetch which collections already contain this company
  useEffect(() => {
    if (isOpen && companyData?.reportId && companyData?.recordId) {
      const fetchMembership = async () => {
        try {
          setLoadingMembership(true);
          const response = await api.get('/api/client/collections/membership/', {
            params: {
              report_id: companyData.reportId,
              record_id: companyData.recordId
            }
          });
          setExistingCollectionIds(new Set(response.data.collection_ids || []));
        } catch (error) {
          console.error('Error fetching collection membership:', error);
          setExistingCollectionIds(new Set());
        } finally {
          setLoadingMembership(false);
        }
      };
      fetchMembership();
    }
  }, [isOpen, companyData?.reportId, companyData?.recordId]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedCollections(new Set());
      setShowCreateNew(false);
      setNewCollectionName('');
      setNewCollectionColor('blue');
      setNewCollectionIcon('folder');
    }
  }, [isOpen]);

  const handleToggleCollection = (collectionId) => {
    // Don't allow toggling collections that already contain the company
    if (existingCollectionIds.has(collectionId)) return;
    
    setSelectedCollections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(collectionId)) {
        newSet.delete(collectionId);
      } else {
        newSet.add(collectionId);
      }
      return newSet;
    });
  };

  const handleCreateCollection = async () => {
    if (!newCollectionName.trim()) return;
    
    try {
      setCreating(true);
      const newCollection = await onCreateCollection({
        name: newCollectionName.trim(),
        color: newCollectionColor,
        icon: newCollectionIcon,
      });
      
      // Auto-select the new collection
      setSelectedCollections(prev => new Set([...prev, newCollection.id]));
      
      // Reset form
      setShowCreateNew(false);
      setNewCollectionName('');
    } catch (error) {
      console.error('Error creating collection:', error);
    } finally {
      setCreating(false);
    }
  };

  const handleSave = async () => {
    if (selectedCollections.size === 0) return;
    
    try {
      setSaving(true);
      const result = await onAddToCollections(Array.from(selectedCollections), companyData);
      
      // Show appropriate toast based on result
      if (result && toast) {
        const { added_count, skipped_count, skipped } = result;
        
        if (added_count > 0 && skipped_count === 0) {
          // All added successfully
          toast.success(
            `${companyData.companyName} added to ${added_count} collection${added_count > 1 ? 's' : ''}`
          );
        } else if (added_count > 0 && skipped_count > 0) {
          // Some added, some skipped
          toast.warning(
            `Added to ${added_count} collection${added_count > 1 ? 's' : ''}. Already exists in ${skipped_count} collection${skipped_count > 1 ? 's' : ''}.`
          );
        } else if (added_count === 0 && skipped_count > 0) {
          // All skipped (already exists)
          toast.warning(
            `${companyData.companyName} is already in the selected collection${skipped_count > 1 ? 's' : ''}`
          );
        }
      }
      
      onClose();
    } catch (error) {
      console.error('Error adding to collections:', error);
      if (toast) {
        toast.error('Failed to add to collections');
      }
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  // Count how many collections the company is already in
  const existingCount = existingCollectionIds.size;

  return createPortal(
    <div onClick={(e) => e.stopPropagation()}>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-[80]"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500 to-indigo-500 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-lg flex items-center justify-center">
                  <FolderPlus className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg">Add to Collection</h3>
                  <p className="text-blue-100 text-sm truncate max-w-[250px]">
                    {companyData?.companyName}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 max-h-[400px] overflow-y-auto">
            {/* Existing membership notice */}
            {existingCount > 0 && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl">
                <p className="text-sm text-green-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Already in {existingCount} collection{existingCount > 1 ? 's' : ''}
                </p>
              </div>
            )}

            {/* Collections List */}
            {loadingMembership ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
              </div>
            ) : collections.length > 0 ? (
              <div className="space-y-2 mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Select collections:</p>
                {collections.map(collection => {
                  const IconComponent = COLLECTION_ICONS[collection.icon] || Folder;
                  const colors = COLLECTION_COLORS[collection.color] || COLLECTION_COLORS.blue;
                  const isSelected = selectedCollections.has(collection.id);
                  const isAlreadyIn = existingCollectionIds.has(collection.id);
                  
                  return (
                    <button
                      key={collection.id}
                      onClick={() => handleToggleCollection(collection.id)}
                      disabled={isAlreadyIn}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                        isAlreadyIn
                          ? 'border-green-300 bg-green-50 cursor-default'
                          : isSelected 
                            ? `${colors.border} ${colors.bg}` 
                            : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        isAlreadyIn ? 'bg-green-100' : colors.bg
                      }`}>
                        <IconComponent className={`w-5 h-5 ${
                          isAlreadyIn ? 'text-green-600' : colors.text
                        }`} />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="flex items-center gap-2">
                          <p className={`font-medium ${isAlreadyIn ? 'text-green-800' : 'text-gray-900'}`}>
                            {collection.name}
                          </p>
                          {isAlreadyIn && (
                            <span className="text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded-full font-medium">
                              Added
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">{collection.item_count} companies</p>
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                        isAlreadyIn
                          ? 'bg-green-500 border-green-500'
                          : isSelected 
                            ? 'bg-blue-600 border-blue-600' 
                            : 'border-gray-300'
                      }`}>
                        {(isSelected || isAlreadyIn) && <Check className="w-4 h-4 text-white" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 mb-4">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Folder className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-gray-500 text-sm">No collections yet</p>
                <p className="text-gray-400 text-xs">Create your first collection below</p>
              </div>
            )}

            {/* Create New Collection */}
            {showCreateNew ? (
              <div className="border-2 border-dashed border-blue-300 rounded-xl p-4 bg-blue-50">
                <p className="text-sm font-medium text-gray-700 mb-3">New Collection</p>
                
                <input
                  type="text"
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  placeholder="Collection name..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  autoFocus
                />

                {/* Color Picker */}
                <div className="mb-3">
                  <p className="text-xs text-gray-600 mb-1">Color</p>
                  <div className="flex gap-1.5">
                    {Object.keys(COLLECTION_COLORS).map(color => (
                      <button
                        key={color}
                        onClick={() => setNewCollectionColor(color)}
                        className={`w-6 h-6 rounded-full ${COLLECTION_COLORS[color].bg} ${
                          newCollectionColor === color ? 'ring-2 ring-offset-1 ring-gray-400' : ''
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Icon Picker */}
                <div className="mb-3">
                  <p className="text-xs text-gray-600 mb-1">Icon</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {Object.entries(COLLECTION_ICONS).map(([iconName, IconComp]) => (
                      <button
                        key={iconName}
                        onClick={() => setNewCollectionIcon(iconName)}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                          newCollectionIcon === iconName 
                            ? `${COLLECTION_COLORS[newCollectionColor].bg} ${COLLECTION_COLORS[newCollectionColor].text}` 
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        <IconComp className="w-4 h-4" />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setShowCreateNew(false)}
                    className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateCollection}
                    disabled={!newCollectionName.trim() || creating}
                    className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50 flex items-center justify-center gap-1"
                  >
                    {creating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        Create
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowCreateNew(true)}
                className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-blue-400 hover:text-blue-600 transition-colors"
              >
                <Plus className="w-5 h-5" />
                <span className="font-medium">Create New Collection</span>
              </button>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-medium text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={selectedCollections.size === 0 || saving}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Add to {selectedCollections.size} Collection{selectedCollections.size !== 1 ? 's' : ''}
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

export default AddToCollectionModal;
