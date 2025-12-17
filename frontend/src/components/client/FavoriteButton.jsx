// frontend/src/components/client/FavoriteButton.jsx
import { useState } from 'react';
import { Star, Loader2 } from 'lucide-react';
import { createPortal } from 'react-dom';

const FavoriteButton = ({ 
  isFavorited = false,
  onToggle,
  size = 'sm', // 'sm', 'md', 'lg'
  showTooltip = true,
  className = ''
}) => {
  const [loading, setLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const buttonSizeClasses = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-2.5',
  };

  const handleClick = async (e) => {
    e.stopPropagation();
    
    if (loading) return;
    
    try {
      setLoading(true);
      const newStatus = await onToggle();
      
      // Show toast
      setToastMessage(newStatus ? 'Added to favorites' : 'Removed from favorites');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    } catch (error) {
      console.error('Error toggling favorite:', error);
      setToastMessage('Failed to update favorite');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={handleClick}
        disabled={loading}
        className={`relative rounded-lg transition-all ${buttonSizeClasses[size]} ${
          isFavorited
            ? 'text-yellow-500 bg-yellow-50 hover:bg-yellow-100'
            : 'text-gray-400 hover:text-yellow-500 hover:bg-yellow-50'
        } ${className}`}
        title={showTooltip ? (isFavorited ? 'Remove from favorites' : 'Add to favorites') : undefined}
      >
        {loading ? (
          <Loader2 className={`${sizeClasses[size]} animate-spin`} />
        ) : (
          <Star 
            className={sizeClasses[size]} 
            fill={isFavorited ? 'currentColor' : 'none'}
          />
        )}
      </button>

      {/* Toast notification */}
      {showToast && createPortal(
        <div className="fixed top-4 right-4 z-[100] animate-in slide-in-from-top-2 duration-300">
          <div className={`px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 ${
            toastMessage.includes('Failed') ? 'bg-red-500' : 'bg-green-500'
          } text-white`}>
            <Star className="w-4 h-4" fill={!toastMessage.includes('Removed') ? 'currentColor' : 'none'} />
            <span className="text-sm font-medium">{toastMessage}</span>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default FavoriteButton;
