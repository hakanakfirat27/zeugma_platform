// frontend/src/pages/client/CollectionsPage.jsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  FolderPlus, Search, Edit2, Trash2, MoreVertical,
  Folder, Star, Bookmark, Heart, Briefcase, Target, Flag, Tag,
  Plus, X, Loader2, AlertTriangle, ChevronRight, Building2,
  ChevronLeft, MapPin, Calendar, Eye, ArrowUpDown, ArrowUp, ArrowDown,
  ChevronsLeft, ChevronsRight, Sparkles, Zap
} from 'lucide-react';
import { createPortal } from 'react-dom';
import ClientDashboardLayout from '../../components/layout/ClientDashboardLayout';
import RecordDetailModal from '../../components/database/RecordDetailModal';
import useClientFavorites from '../../hooks/useClientFavorites';
import { useToast } from '../../contexts/ToastContext';
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
  blue: { bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-200', gradient: 'from-blue-500 to-blue-600' },
  purple: { bg: 'bg-purple-100', text: 'text-purple-600', border: 'border-purple-200', gradient: 'from-purple-500 to-purple-600' },
  green: { bg: 'bg-green-100', text: 'text-green-600', border: 'border-green-200', gradient: 'from-green-500 to-green-600' },
  red: { bg: 'bg-red-100', text: 'text-red-600', border: 'border-red-200', gradient: 'from-red-500 to-red-600' },
  orange: { bg: 'bg-orange-100', text: 'text-orange-600', border: 'border-orange-200', gradient: 'from-orange-500 to-orange-600' },
  pink: { bg: 'bg-pink-100', text: 'text-pink-600', border: 'border-pink-200', gradient: 'from-pink-500 to-pink-600' },
  teal: { bg: 'bg-teal-100', text: 'text-teal-600', border: 'border-teal-200', gradient: 'from-teal-500 to-teal-600' },
  indigo: { bg: 'bg-indigo-100', text: 'text-indigo-600', border: 'border-indigo-200', gradient: 'from-indigo-500 to-indigo-600' },
};

// Animated Tab Component - Card-based design matching Feedback page
const AnimatedTabs = ({ activeTab, setActiveTab, favoritesCount, collectionsCount }) => {
  const [hoveredTab, setHoveredTab] = useState(null);
  
  const tabs = [
    { 
      id: 'collections', 
      label: 'Collections', 
      description: 'Organize companies into custom lists',
      icon: Folder,
      count: collectionsCount,
      accentColor: '#8b5cf6',
      gradientFrom: '#8b5cf6',
      gradientTo: '#6366f1',
    },
    { 
      id: 'favorites', 
      label: 'Favorites', 
      description: 'Quick access to starred companies',
      icon: Star,
      count: favoritesCount,
      accentColor: '#f59e0b',
      gradientFrom: '#f59e0b',
      gradientTo: '#ef4444',
    },
  ];

  return (
    <div className="mb-8">
      <div className="grid grid-cols-2 gap-4">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const isHovered = hoveredTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              onMouseEnter={() => setHoveredTab(tab.id)}
              onMouseLeave={() => setHoveredTab(null)}
              className="relative group text-left focus:outline-none"
              style={{ perspective: '1000px' }}
            >
              {/* Main Card */}
              <div 
                className={`relative overflow-hidden rounded-2xl transition-all duration-500 ease-out ${
                  isActive 
                    ? 'shadow-2xl scale-[1.02]' 
                    : 'shadow-lg hover:shadow-xl hover:scale-[1.01]'
                }`}
                style={{
                  background: isActive 
                    ? `linear-gradient(135deg, ${tab.gradientFrom}, ${tab.gradientTo})`
                    : 'white',
                  transform: isHovered && !isActive ? 'translateY(-2px)' : 'translateY(0)',
                }}
              >
                {/* Animated Background Pattern for Active */}
                {isActive && (
                  <div className="absolute inset-0 opacity-30">
                    <div className="absolute inset-0" style={{
                      backgroundImage: `radial-gradient(circle at 20% 50%, rgba(255,255,255,0.3) 0%, transparent 50%),
                                       radial-gradient(circle at 80% 80%, rgba(255,255,255,0.2) 0%, transparent 40%)`,
                    }} />
                    {/* Floating particles effect */}
                    <div className="absolute top-4 right-8 w-20 h-20 bg-white/20 rounded-full blur-2xl animate-pulse" />
                    <div className="absolute bottom-4 left-12 w-16 h-16 bg-white/15 rounded-full blur-xl animate-pulse" style={{ animationDelay: '1s' }} />
                  </div>
                )}

                {/* Subtle Border Gradient for Inactive */}
                {!isActive && (
                  <div 
                    className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{
                      background: `linear-gradient(135deg, ${tab.gradientFrom}20, ${tab.gradientTo}20)`,
                    }}
                  />
                )}

                {/* Card Content */}
                <div className="relative p-6">
                  {/* Top Row: Icon + Count Badge */}
                  <div className="flex items-start justify-between mb-4">
                    {/* Icon Container */}
                    <div 
                      className={`relative w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-300 ${
                        isActive 
                          ? 'bg-white/25 backdrop-blur-sm' 
                          : 'bg-gradient-to-br'
                      }`}
                      style={!isActive ? {
                        background: `linear-gradient(135deg, ${tab.gradientFrom}15, ${tab.gradientTo}15)`,
                      } : {}}
                    >
                      <Icon 
                        className={`w-7 h-7 transition-all duration-300 ${
                          isActive ? 'text-white' : ''
                        }`}
                        style={!isActive ? { color: tab.accentColor } : {}}
                      />
                      
                      {/* Ripple Effect on Active Icon */}
                      {isActive && (
                        <div className="absolute inset-0 rounded-xl bg-white/20 animate-ping" style={{ animationDuration: '2s' }} />
                      )}
                    </div>

                    {/* Count Badge */}
                    {tab.count > 0 && (
                      <div 
                        className={`px-3 py-1.5 rounded-full text-sm font-bold transition-all duration-300 ${
                          isActive 
                            ? 'bg-white/25 backdrop-blur-sm text-white' 
                            : 'text-white'
                        }`}
                        style={!isActive ? {
                          background: `linear-gradient(135deg, ${tab.gradientFrom}, ${tab.gradientTo})`,
                        } : {}}
                      >
                        {tab.count > 999 ? '999+' : tab.count}
                      </div>
                    )}
                  </div>

                  {/* Title & Description */}
                  <div className="space-y-1">
                    <h3 className={`text-xl font-bold transition-colors duration-300 ${
                      isActive ? 'text-white' : 'text-gray-900'
                    }`}>
                      {tab.label}
                    </h3>
                    <p className={`text-sm transition-colors duration-300 ${
                      isActive ? 'text-white/80' : 'text-gray-500'
                    }`}>
                      {tab.description}
                    </p>
                  </div>

                  {/* Bottom Indicator Bar */}
                  <div className="mt-5 h-1.5 rounded-full overflow-hidden bg-gray-100" style={isActive ? { background: 'rgba(255,255,255,0.2)' } : {}}>
                    <div 
                      className="h-full rounded-full transition-all duration-500 ease-out"
                      style={{
                        width: isActive ? '100%' : isHovered ? '60%' : '30%',
                        background: isActive 
                          ? 'rgba(255,255,255,0.8)'
                          : `linear-gradient(90deg, ${tab.gradientFrom}, ${tab.gradientTo})`,
                      }}
                    />
                  </div>

                  {/* Active Check Mark */}
                  {isActive && (
                    <div className="absolute top-1 right-1 w-6 h-6 bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Bottom Gradient Line for Active */}
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/40">
                    <div 
                      className="h-full bg-white/60"
                      style={{
                        animation: 'slideRight 2s ease-in-out infinite',
                        width: '40%',
                      }}
                    />
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Keyframe animations */}
      <style>{`
        @keyframes slideRight {
          0%, 100% { transform: translateX(-100%); opacity: 0; }
          50% { transform: translateX(150%); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

// Delete Confirmation Modal
const DeleteConfirmModal = ({ isOpen, onClose, onConfirm, title, message, itemName, isDeleting }) => {
  if (!isOpen) return null;

  return createPortal(
    <div onClick={(e) => e.stopPropagation()}>
      <div className="fixed inset-0 bg-black/50 z-[70]" onClick={onClose} />
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
          <div className="bg-gradient-to-r from-red-500 to-rose-500 px-6 py-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">{title || 'Delete'}</h3>
                <p className="text-sm text-white/80">This action cannot be undone</p>
              </div>
            </div>
          </div>
          <div className="px-6 py-4">
            <p className="text-gray-700">
              {message || (
                <>
                  Are you sure you want to delete <span className="font-semibold">"{itemName}"</span>?
                </>
              )}
            </p>
          </div>
          <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3">
            <button
              onClick={onClose}
              disabled={isDeleting}
              className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 font-medium text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isDeleting}
              className="px-4 py-2.5 bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-xl hover:from-red-600 hover:to-rose-600 font-medium text-sm flex items-center gap-2 transition-all"
            >
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Remove
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

// Collection Card Component
const CollectionCard = ({ collection, onEdit, onDelete, onView }) => {
  const [showMenu, setShowMenu] = useState(false);
  const IconComponent = COLLECTION_ICONS[collection.icon] || Folder;
  const colors = COLLECTION_COLORS[collection.color] || COLLECTION_COLORS.blue;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300 group hover:-translate-y-1">
      <div className={`bg-gradient-to-r ${colors.gradient} p-4`}>
        <div className="flex items-center justify-between">
          <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
            <IconComponent className="w-6 h-6 text-white" />
          </div>
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <MoreVertical className="w-5 h-5 text-white" />
            </button>
            
            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-10 z-20 bg-white rounded-xl shadow-xl border py-1 w-36 animate-scale-in">
                  <button
                    onClick={() => {
                      onEdit(collection);
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      onDelete(collection);
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="p-4">
        <h3 className="font-bold text-gray-900 text-lg mb-1">{collection.name}</h3>
        <p className="text-gray-500 text-sm mb-3 line-clamp-2 min-h-[40px]">
          {collection.description || <span className="text-gray-300 italic">No description</span>}
        </p>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">
            <Building2 className="w-4 h-4 inline mr-1" />
            {collection.item_count} {collection.item_count === 1 ? 'company' : 'companies'}
          </span>
          <button
            onClick={() => onView(collection)}
            className={`text-sm font-medium ${colors.text} hover:underline flex items-center gap-1 group-hover:gap-2 transition-all`}
          >
            View <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

// Create/Edit Collection Modal
const CollectionModal = ({ isOpen, onClose, onSave, collection = null, isSaving }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('blue');
  const [icon, setIcon] = useState('folder');

  useEffect(() => {
    if (collection) {
      setName(collection.name);
      setDescription(collection.description || '');
      setColor(collection.color);
      setIcon(collection.icon);
    } else {
      setName('');
      setDescription('');
      setColor('blue');
      setIcon('folder');
    }
  }, [collection, isOpen]);

  const handleSubmit = () => {
    if (!name.trim()) return;
    onSave({
      id: collection?.id,
      name: name.trim(),
      description: description.trim(),
      color,
      icon,
    });
  };

  if (!isOpen) return null;

  return createPortal(
    <div onClick={(e) => e.stopPropagation()}>
      <div className="fixed inset-0 bg-black/50 z-[70]" onClick={onClose} />
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
          <div className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-lg flex items-center justify-center">
                  <FolderPlus className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-bold text-white text-lg">
                  {collection ? 'Edit Collection' : 'New Collection'}
                </h3>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Collection name..."
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description..."
                rows={2}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
              <div className="flex gap-2">
                {Object.keys(COLLECTION_COLORS).map(c => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={`w-8 h-8 rounded-full ${COLLECTION_COLORS[c].bg} transition-transform hover:scale-110 ${
                      color === c ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''
                    }`}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Icon</label>
              <div className="flex gap-2 flex-wrap">
                {Object.entries(COLLECTION_ICONS).map(([iconName, IconComp]) => (
                  <button
                    key={iconName}
                    onClick={() => setIcon(iconName)}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:scale-110 ${
                      icon === iconName
                        ? `${COLLECTION_COLORS[color].bg} ${COLLECTION_COLORS[color].text} scale-110`
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    <IconComp className="w-5 h-5" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 font-medium text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!name.trim() || isSaving}
              className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl hover:from-blue-600 hover:to-indigo-600 font-medium text-sm disabled:opacity-50 flex items-center gap-2 transition-all"
            >
              {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
              {collection ? 'Save Changes' : 'Create Collection'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

// Favorites Data Table Component
const FavoritesDataTable = ({ 
  favorites, 
  loading, 
  onView, 
  onRemove, 
  sortField, 
  sortDirection, 
  onSort,
  searchQuery,
  setSearchQuery,
  // Pagination props
  currentPage,
  totalPages,
  totalCount,
  pageSize,
  onPageChange,
  onPageSizeChange
}) => {
  const handleSort = (field) => {
    if (sortField === field) {
      onSort(field, sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      onSort(field, 'asc');
    }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="w-4 h-4 text-yellow-600" />
      : <ArrowDown className="w-4 h-4 text-yellow-600" />;
  };

  // Pagination footer component (inside table)
  const TablePagination = () => {
    const startItem = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const endItem = Math.min(currentPage * pageSize, totalCount);

    return (
      <div className="flex items-center justify-between py-4 px-6 border-t border-gray-200 bg-white">
        {/* Left side - showing count and page size */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-sm text-gray-600">
            <span>Showing</span>
            <span className="font-semibold text-gray-900">{startItem}</span>
            <span>to</span>
            <span className="font-semibold text-gray-900">{endItem}</span>
            <span>of</span>
            <span className="font-semibold text-gray-900">{totalCount}</span>
            <span>results</span>
          </div>
          
          {/* Page Size Selector */}
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
          >
            <option value={5}>5 per page</option>
            <option value={10}>10 per page</option>
            <option value={25}>25 per page</option>
            <option value={50}>50 per page</option>
          </select>
        </div>

        {/* Right side - Navigation buttons */}
        <div className="flex items-center gap-1">
          {/* First page */}
          <button
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors"
            title="First page"
          >
            <ChevronsLeft className="w-4 h-4 text-gray-500" />
          </button>

          {/* Previous page */}
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors"
            title="Previous page"
          >
            <ChevronLeft className="w-4 h-4 text-gray-500" />
          </button>

          {/* Current page indicator */}
          <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-blue-600 text-white text-sm font-medium">
            {currentPage}
          </div>

          {/* Next page */}
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages || totalPages === 0}
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors"
            title="Next page"
          >
            <ChevronRight className="w-4 h-4 text-gray-500" />
          </button>

          {/* Last page */}
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages || totalPages === 0}
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors"
            title="Last page"
          >
            <ChevronsRight className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-yellow-200 border-t-yellow-500 rounded-full animate-spin" />
            <Star className="w-6 h-6 text-yellow-500 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="mt-4 text-gray-500 font-medium">Loading favorites...</p>
        </div>
      </div>
    );
  }

  if (favorites.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="relative inline-block">
          <div className="w-24 h-24 bg-gradient-to-br from-yellow-100 to-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Star className="w-12 h-12 text-yellow-400" />
          </div>
          <Sparkles className="w-6 h-6 text-yellow-500 absolute -top-1 -right-1 animate-pulse" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          {searchQuery ? 'No favorites found' : 'No favorites yet'}
        </h3>
        <p className="text-gray-500 mb-4 max-w-md mx-auto">
          {searchQuery 
            ? 'Try a different search term' 
            : 'Star companies from your reports to save them here for quick access'}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gradient-to-r from-yellow-50 to-amber-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 text-xs font-bold text-gray-600 uppercase tracking-wider">
                <button 
                  onClick={() => handleSort('company_name')}
                  className="flex items-center gap-1.5 hover:text-yellow-700 transition-colors"
                >
                  Company
                  <SortIcon field="company_name" />
                </button>
              </th>
              <th className="text-left px-4 py-3 text-xs font-bold text-gray-600 uppercase tracking-wider">
                <button 
                  onClick={() => handleSort('country')}
                  className="flex items-center gap-1.5 hover:text-yellow-700 transition-colors"
                >
                  Country
                  <SortIcon field="country" />
                </button>
              </th>
              <th className="text-left px-4 py-3 text-xs font-bold text-gray-600 uppercase tracking-wider">
                Report
              </th>
              <th className="text-left px-4 py-3 text-xs font-bold text-gray-600 uppercase tracking-wider">
                <button 
                  onClick={() => handleSort('created_at')}
                  className="flex items-center gap-1.5 hover:text-yellow-700 transition-colors"
                >
                  Added
                  <SortIcon field="created_at" />
                </button>
              </th>
              <th className="text-right px-4 py-3 text-xs font-bold text-gray-600 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {favorites.map((favorite, index) => (
              <tr 
                key={favorite.id} 
                onClick={() => onView(favorite)}
                className="hover:bg-yellow-50/50 transition-colors group cursor-pointer even:bg-gray-50/50"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 bg-gradient-to-br from-yellow-100 to-amber-100 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    </div>
                    <p className="font-medium text-gray-900 text-sm">{favorite.company_name}</p>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5 text-gray-600 text-sm">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    {favorite.country || '-'}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-xs">
                    {favorite.report_title}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5 text-gray-500 text-xs">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(favorite.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onView(favorite)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      title="View details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onRemove(favorite)}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      title="Remove from favorites"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Pagination Footer - inside table container */}
      <TablePagination />
    </div>
  );
};

// Pagination Component
const Pagination = ({ currentPage, totalPages, totalCount, pageSize, onPageChange, onPageSizeChange }) => {
  const startItem = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalCount);

  return (
    <div className="flex items-center justify-between py-4 px-6 border-t border-gray-200">
      {/* Left side - showing count and page size */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 text-sm text-gray-600">
          <span>Showing</span>
          <span className="font-semibold text-gray-900">{startItem}</span>
          <span>to</span>
          <span className="font-semibold text-gray-900">{endItem}</span>
          <span>of</span>
          <span className="font-semibold text-gray-900">{totalCount}</span>
          <span>results</span>
        </div>
        
        {/* Page Size Selector */}
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
        >
          <option value={5}>5 per page</option>
          <option value={10}>10 per page</option>
          <option value={25}>25 per page</option>
          <option value={50}>50 per page</option>
        </select>
      </div>

      {/* Right side - Navigation buttons */}
      <div className="flex items-center gap-1">
        {/* First page */}
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors"
          title="First page"
        >
          <ChevronsLeft className="w-4 h-4 text-gray-500" />
        </button>

        {/* Previous page */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors"
          title="Previous page"
        >
          <ChevronLeft className="w-4 h-4 text-gray-500" />
        </button>

        {/* Current page indicator */}
        <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-blue-600 text-white text-sm font-medium">
          {currentPage}
        </div>

        {/* Next page */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages || totalPages === 0}
          className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors"
          title="Next page"
        >
          <ChevronRight className="w-4 h-4 text-gray-500" />
        </button>

        {/* Last page */}
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages || totalPages === 0}
          className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors"
          title="Last page"
        >
          <ChevronsRight className="w-4 h-4 text-gray-500" />
        </button>
      </div>
    </div>
  );
};

const CollectionsPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const toast = useToast();
  const { 
    collections, 
    loading: collectionsLoading, 
    fetchCollections,
    createCollection, 
    updateCollection, 
    deleteCollection 
  } = useClientFavorites(null, toast);

  // Tab state - check URL param first
  const initialTab = searchParams.get('tab') === 'favorites' ? 'favorites' : 'collections';
  const [activeTab, setActiveTab] = useState(initialTab);

  // Collections state
  const [collectionSearchQuery, setCollectionSearchQuery] = useState('');
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [editingCollection, setEditingCollection] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [collectionToDelete, setCollectionToDelete] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Favorites state
  const [favorites, setFavorites] = useState([]);
  const [favoritesLoading, setFavoritesLoading] = useState(false);
  const [favoriteSearchQuery, setFavoriteSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [favoriteToRemove, setFavoriteToRemove] = useState(null);
  const [showRemoveFavoriteConfirm, setShowRemoveFavoriteConfirm] = useState(false);
  const [sortField, setSortField] = useState('created_at');
  const [sortDirection, setSortDirection] = useState('desc');

  // Tab count state (for displaying counts in tabs regardless of which tab is active)
  const [favoritesTabCount, setFavoritesTabCount] = useState(0);

  // Company detail modal
  const [selectedCompany, setSelectedCompany] = useState(null);

  // Fetch favorites count on mount (for tab display)
  useEffect(() => {
    const fetchFavoritesCount = async () => {
      try {
        const response = await api.get('/api/client/favorites/?page_size=1');
        setFavoritesTabCount(response.data.count || 0);
      } catch (error) {
        console.error('Error fetching favorites count:', error);
      }
    };
    fetchFavoritesCount();
  }, []);

  // Fetch favorites with pagination and search
  const fetchFavorites = useCallback(async () => {
    try {
      setFavoritesLoading(true);
      const params = new URLSearchParams();
      params.append('page', currentPage);
      params.append('page_size', pageSize);
      if (favoriteSearchQuery) {
        params.append('search', favoriteSearchQuery);
      }
      
      const response = await api.get(`/api/client/favorites/?${params.toString()}`);
      let results = response.data.results || [];
      
      // Client-side sorting (backend could be enhanced to support sorting)
      results = [...results].sort((a, b) => {
        let aVal = a[sortField];
        let bVal = b[sortField];
        
        if (sortField === 'created_at') {
          aVal = new Date(aVal);
          bVal = new Date(bVal);
        } else {
          aVal = (aVal || '').toLowerCase();
          bVal = (bVal || '').toLowerCase();
        }
        
        if (sortDirection === 'asc') {
          return aVal > bVal ? 1 : -1;
        }
        return aVal < bVal ? 1 : -1;
      });
      
      setFavorites(results);
      const count = response.data.count || 0;
      setTotalCount(count);
      setFavoritesTabCount(count); // Update tab count too
    } catch (error) {
      console.error('Error fetching favorites:', error);
      toast.error('Failed to load favorites');
    } finally {
      setFavoritesLoading(false);
    }
  }, [currentPage, pageSize, favoriteSearchQuery, sortField, sortDirection, toast]);

  // Fetch favorites when tab is active
  useEffect(() => {
    if (activeTab === 'favorites') {
      fetchFavorites();
    }
  }, [activeTab, fetchFavorites]);

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [favoriteSearchQuery]);

  // Reset page when page size changes
  useEffect(() => {
    setCurrentPage(1);
  }, [pageSize]);

  // Filter collections by search
  const filteredCollections = collections.filter(c =>
    c.name.toLowerCase().includes(collectionSearchQuery.toLowerCase()) ||
    c.description?.toLowerCase().includes(collectionSearchQuery.toLowerCase())
  );

  const handleCreateOrUpdate = async (data) => {
    try {
      setIsSaving(true);
      if (data.id) {
        await updateCollection(data.id, data);
      } else {
        await createCollection(data);
      }
      setShowCollectionModal(false);
      setEditingCollection(null);
    } catch (error) {
      console.error('Error saving collection:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCollection = async () => {
    if (!collectionToDelete) return;
    try {
      setIsDeleting(true);
      await deleteCollection(collectionToDelete.id);
      setShowDeleteConfirm(false);
      setCollectionToDelete(null);
    } catch (error) {
      console.error('Error deleting collection:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleViewCollection = (collection) => {
    navigate(`/client/collections/${collection.id}`);
  };

  // Remove favorite
  const handleRemoveFavorite = async () => {
    if (!favoriteToRemove) return;
    try {
      setIsDeleting(true);
      await api.delete(`/api/client/favorites/${favoriteToRemove.id}/`);
      toast.success(`${favoriteToRemove.company_name} removed from favorites`);
      setShowRemoveFavoriteConfirm(false);
      setFavoriteToRemove(null);
      fetchFavorites();
    } catch (error) {
      console.error('Error removing favorite:', error);
      toast.error('Failed to remove from favorites');
    } finally {
      setIsDeleting(false);
    }
  };

  // View favorite company details
  const handleViewFavorite = async (favorite) => {
    try {
      const response = await api.get(`/api/client/reports/${favorite.report_id}/records/${favorite.record_id}/`);
      setSelectedCompany({
        ...response.data,
        report_id: favorite.report_id
      });
    } catch (error) {
      console.error('Error fetching company details:', error);
      toast.error('Failed to load company details');
    }
  };

  const handleSort = (field, direction) => {
    setSortField(field);
    setSortDirection(direction);
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  const breadcrumbs = [
    { label: 'Client Dashboard', path: '/client/dashboard' },
    { label: 'Collections', path: '/client/collections' },
  ];

  return (
    <ClientDashboardLayout
      pageTitle="My Collections"
      pageSubtitle="Organize and manage your saved companies"
      breadcrumbs={breadcrumbs}
    >
      <style>{`
        @keyframes scale-in {
          0% { opacity: 0; transform: scale(0.95); }
          100% { opacity: 1; transform: scale(1); }
        }
        .animate-scale-in {
          animation: scale-in 0.2s ease-out;
        }
      `}</style>

      <div className="p-6">
        {/* Animated Tabs */}
        <AnimatedTabs 
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          favoritesCount={favoritesTabCount}
          collectionsCount={collections.length}
        />

        {/* FAVORITES TAB */}
        {activeTab === 'favorites' && (
          <div className="animate-fade-in">
            {/* Search Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={favoriteSearchQuery}
                  onChange={(e) => setFavoriteSearchQuery(e.target.value)}
                  placeholder="Search favorites by company or country..."
                  className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all"
                />
                {favoriteSearchQuery && (
                  <button
                    onClick={() => setFavoriteSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                )}
              </div>
            </div>

            {/* Favorites Data Table */}
            <FavoritesDataTable
              favorites={favorites}
              loading={favoritesLoading}
              onView={handleViewFavorite}
              onRemove={(f) => {
                setFavoriteToRemove(f);
                setShowRemoveFavoriteConfirm(true);
              }}
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={handleSort}
              searchQuery={favoriteSearchQuery}
              setSearchQuery={setFavoriteSearchQuery}
              currentPage={currentPage}
              totalPages={totalPages}
              totalCount={totalCount}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        )}

        {/* COLLECTIONS TAB */}
        {activeTab === 'collections' && (
          <div className="animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={collectionSearchQuery}
                  onChange={(e) => setCollectionSearchQuery(e.target.value)}
                  placeholder="Search collections..."
                  className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                {collectionSearchQuery && (
                  <button
                    onClick={() => setCollectionSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                )}
              </div>

              <button
                onClick={() => {
                  setEditingCollection(null);
                  setShowCollectionModal(true);
                }}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 text-white rounded-xl hover:from-blue-600 hover:via-indigo-600 hover:to-purple-600 flex items-center gap-2 shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5"
              >
                <Plus className="w-5 h-5" />
                New Collection
              </button>
            </div>

            {/* Collections Grid */}
            {collectionsLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
                    <Folder className="w-6 h-6 text-blue-500 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                  </div>
                  <p className="mt-4 text-gray-500 font-medium">Loading collections...</p>
                </div>
              </div>
            ) : filteredCollections.length === 0 ? (
              <div className="text-center py-20">
                <div className="relative inline-block">
                  <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Folder className="w-12 h-12 text-blue-400" />
                  </div>
                  <Zap className="w-6 h-6 text-blue-500 absolute -top-1 -right-1 animate-pulse" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {collectionSearchQuery ? 'No collections found' : 'No collections yet'}
                </h3>
                <p className="text-gray-500 mb-6 max-w-md mx-auto">
                  {collectionSearchQuery 
                    ? 'Try a different search term' 
                    : 'Create your first collection to organize companies into custom lists'}
                </p>
                {!collectionSearchQuery && (
                  <button
                    onClick={() => setShowCollectionModal(true)}
                    className="px-6 py-3 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 text-white rounded-xl hover:from-blue-600 hover:via-indigo-600 hover:to-purple-600 inline-flex items-center gap-2 shadow-lg hover:shadow-xl transition-all"
                  >
                    <Plus className="w-5 h-5" />
                    Create Collection
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredCollections.map((collection, index) => (
                  <div key={collection.id} style={{ animationDelay: `${index * 100}ms` }} className="animate-fade-in-up">
                    <CollectionCard
                      collection={collection}
                      onEdit={(c) => {
                        setEditingCollection(c);
                        setShowCollectionModal(true);
                      }}
                      onDelete={(c) => {
                        setCollectionToDelete(c);
                        setShowDeleteConfirm(true);
                      }}
                      onView={handleViewCollection}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Collection Modal */}
      <CollectionModal
        isOpen={showCollectionModal}
        onClose={() => {
          setShowCollectionModal(false);
          setEditingCollection(null);
        }}
        onSave={handleCreateOrUpdate}
        collection={editingCollection}
        isSaving={isSaving}
      />

      {/* Delete Collection Confirmation */}
      <DeleteConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setCollectionToDelete(null);
        }}
        onConfirm={handleDeleteCollection}
        title="Delete Collection"
        itemName={collectionToDelete?.name}
        message={
          <>
            Are you sure you want to delete <span className="font-semibold">"{collectionToDelete?.name}"</span>?
            All companies in this collection will be removed.
          </>
        }
        isDeleting={isDeleting}
      />

      {/* Remove Favorite Confirmation */}
      <DeleteConfirmModal
        isOpen={showRemoveFavoriteConfirm}
        onClose={() => {
          setShowRemoveFavoriteConfirm(false);
          setFavoriteToRemove(null);
        }}
        onConfirm={handleRemoveFavorite}
        title="Remove from Favorites"
        itemName={favoriteToRemove?.company_name}
        message={
          <>
            Are you sure you want to remove <span className="font-semibold">"{favoriteToRemove?.company_name}"</span> from your favorites?
          </>
        }
        isDeleting={isDeleting}
      />

      {/* Company Detail Modal */}
      {selectedCompany && (
        <RecordDetailModal
          record={selectedCompany}
          onClose={() => setSelectedCompany(null)}
          isGuest={false}
          reportId={selectedCompany.report_id}
          toast={toast}
        />
      )}
    </ClientDashboardLayout>
  );
};

export default CollectionsPage;
