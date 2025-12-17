// frontend/src/components/client/CompanyActionsCell.jsx
/**
 * Combined actions cell for company rows in the data table.
 * Includes: Favorite, Add to Collection, Notes
 */
import { useState } from 'react';
import { Star, FolderPlus, StickyNote, Loader2 } from 'lucide-react';
import { createPortal } from 'react-dom';
import AddToCollectionModal from './AddToCollectionModal';

const CompanyActionsCell = ({
  reportId,
  recordId,
  companyName,
  country,
  // Favorites
  isFavorited = false,
  onToggleFavorite,
  // Collections
  collections = [],
  onAddToCollections,
  onCreateCollection,
  // Notes
  noteCount = 0,
  onOpenNotes,
}) => {
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');

  const showToastNotification = (message, type = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2500);
  };

  const handleFavoriteClick = async (e) => {
    e.stopPropagation();
    if (favoriteLoading || !onToggleFavorite) return;
    
    try {
      setFavoriteLoading(true);
      const newStatus = await onToggleFavorite({
        reportId,
        recordId,
        companyName,
        country,
      });
      showToastNotification(
        newStatus ? 'Added to favorites' : 'Removed from favorites',
        'success'
      );
    } catch (error) {
      console.error('Error toggling favorite:', error);
      showToastNotification('Failed to update favorite', 'error');
    } finally {
      setFavoriteLoading(false);
    }
  };

  const handleCollectionClick = (e) => {
    e.stopPropagation();
    setShowCollectionModal(true);
  };

  const handleNotesClick = (e) => {
    e.stopPropagation();
    if (onOpenNotes) {
      onOpenNotes();
    }
  };

  const handleAddToCollections = async (collectionIds, companyData) => {
    try {
      const result = await onAddToCollections(collectionIds, companyData);
      showToastNotification(
        `Added to ${result.added_count} collection${result.added_count !== 1 ? 's' : ''}`,
        'success'
      );
      setShowCollectionModal(false);
    } catch (error) {
      console.error('Error adding to collections:', error);
      showToastNotification('Failed to add to collections', 'error');
    }
  };

  return (
    <>
      <div className="flex items-center gap-1">
        {/* Favorite Button */}
        {onToggleFavorite && (
          <button
            onClick={handleFavoriteClick}
            disabled={favoriteLoading}
            className={`relative p-1.5 rounded-lg transition-all ${
              isFavorited
                ? 'text-yellow-500 bg-yellow-50 hover:bg-yellow-100'
                : 'text-gray-400 hover:text-yellow-500 hover:bg-yellow-50'
            }`}
            title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
          >
            {favoriteLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Star 
                className="w-4 h-4" 
                fill={isFavorited ? 'currentColor' : 'none'}
              />
            )}
          </button>
        )}

        {/* Add to Collection Button */}
        {onAddToCollections && (
          <button
            onClick={handleCollectionClick}
            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
            title="Add to collection"
          >
            <FolderPlus className="w-4 h-4" />
          </button>
        )}

        {/* Notes Button */}
        {onOpenNotes && (
          <button
            onClick={handleNotesClick}
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
        )}
      </div>

      {/* Toast notification */}
      {showToast && createPortal(
        <div className="fixed top-4 right-4 z-[100] animate-in slide-in-from-top-2 duration-300">
          <div className={`px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 ${
            toastType === 'error' ? 'bg-red-500' : 'bg-green-500'
          } text-white`}>
            <span className="text-sm font-medium">{toastMessage}</span>
          </div>
        </div>,
        document.body
      )}

      {/* Add to Collection Modal */}
      <AddToCollectionModal
        isOpen={showCollectionModal}
        onClose={() => setShowCollectionModal(false)}
        companyData={{
          reportId,
          recordId,
          companyName,
          country,
        }}
        collections={collections}
        onAddToCollections={handleAddToCollections}
        onCreateCollection={onCreateCollection}
      />
    </>
  );
};

export default CompanyActionsCell;
