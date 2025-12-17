// frontend/src/pages/client/CollectionDetailPage.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Trash2, ExternalLink, Search, X, Loader2, 
  AlertTriangle, Building2, MapPin, FileText, Edit2, Calendar,
  Folder, Star, Bookmark, Heart, Briefcase, Target, Flag, Tag,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight
} from 'lucide-react';
import { createPortal } from 'react-dom';
import ClientDashboardLayout from '../../components/layout/ClientDashboardLayout';
import RecordDetailModal from '../../components/database/RecordDetailModal';
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

// Delete Confirmation Modal
const DeleteConfirmModal = ({ isOpen, onClose, onConfirm, itemName, isDeleting }) => {
  if (!isOpen) return null;

  return createPortal(
    <div onClick={(e) => e.stopPropagation()}>
      <div className="fixed inset-0 bg-black/50 z-[70]" onClick={onClose} />
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
          <div className="bg-red-50 px-6 py-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Remove Company</h3>
                <p className="text-sm text-gray-600">Remove from this collection</p>
              </div>
            </div>
          </div>
          <div className="px-6 py-4">
            <p className="text-gray-700">
              Are you sure you want to remove <span className="font-semibold">"{itemName}"</span> from this collection?
            </p>
          </div>
          <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3">
            <button onClick={onClose} disabled={isDeleting} className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-medium text-sm">
              Cancel
            </button>
            <button onClick={onConfirm} disabled={isDeleting} className="px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium text-sm flex items-center gap-2">
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

const CollectionDetailPage = () => {
  const { collectionId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  
  const [collection, setCollection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  // Delete state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Company detail modal state
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [loadingRecord, setLoadingRecord] = useState(false);

  // Fetch collection details
  const fetchCollection = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/client/collections/${collectionId}/`);
      setCollection(response.data);
    } catch (error) {
      console.error('Error fetching collection:', error);
      toast.error('Failed to load collection');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCollection();
  }, [collectionId]);

  // Fetch company record details
  const handleRowClick = async (item) => {
    try {
      setLoadingRecord(true);
      // Fetch the company record from the report using the correct endpoint
      const response = await api.get('/api/client/report-data/', {
        params: { 
          report_id: item.report_id,
          search: item.company_name,
          page_size: 20
        }
      });
      
      // Find the specific record by ID or company name
      const records = response.data.results || [];
      let record = records.find(r => String(r.id) === String(item.record_id));
      
      if (!record) {
        // Fallback: find by company name
        record = records.find(r => r.company_name === item.company_name);
      }
      
      if (record) {
        // Add report_id to the record for the modal
        setSelectedRecord({ ...record, report_id: item.report_id });
      } else {
        toast.error('Company details not found in report');
      }
    } catch (error) {
      console.error('Error fetching company details:', error);
      toast.error('Failed to load company details');
    } finally {
      setLoadingRecord(false);
    }
  };

  // Remove item from collection
  const handleRemoveItem = async () => {
    if (!itemToDelete) return;
    
    try {
      setIsDeleting(true);
      await api.delete(`/api/client/collections/${collectionId}/items/${itemToDelete.id}/`);
      
      // Update local state
      setCollection(prev => ({
        ...prev,
        items: prev.items.filter(i => i.id !== itemToDelete.id),
        item_count: prev.item_count - 1
      }));
      
      toast.success('Company removed from collection');
      setShowDeleteConfirm(false);
      setItemToDelete(null);
    } catch (error) {
      console.error('Error removing item:', error);
      toast.error('Failed to remove company');
    } finally {
      setIsDeleting(false);
    }
  };

  // Navigate to company in report
  const handleViewInReport = (e, item) => {
    e.stopPropagation();
    navigate(`/client/reports/${item.report_id}`);
  };

  // Filter items by search
  const filteredItems = collection?.items?.filter(item =>
    item.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.country?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // Pagination calculations
  const totalCount = filteredItems.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedItems = filteredItems.slice(startIndex, startIndex + pageSize);

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Reset page when page size changes
  useEffect(() => {
    setCurrentPage(1);
  }, [pageSize]);

  const IconComponent = collection ? (COLLECTION_ICONS[collection.icon] || Folder) : Folder;
  const colors = collection ? (COLLECTION_COLORS[collection.color] || COLLECTION_COLORS.blue) : COLLECTION_COLORS.blue;

  const breadcrumbs = [
    { label: 'Client Dashboard', path: '/client/dashboard' },
    { label: 'Collections', path: '/client/collections' },
    { label: collection?.name || 'Loading...', path: `/client/collections/${collectionId}` },
  ];

  if (loading) {
    return (
      <ClientDashboardLayout pageTitle="Loading..." breadcrumbs={breadcrumbs}>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      </ClientDashboardLayout>
    );
  }

  if (!collection) {
    return (
      <ClientDashboardLayout pageTitle="Collection Not Found" breadcrumbs={breadcrumbs}>
        <div className="text-center py-16">
          <p className="text-gray-500">Collection not found or you don't have access.</p>
          <button
            onClick={() => navigate('/client/collections')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Collections
          </button>
        </div>
      </ClientDashboardLayout>
    );
  }

  return (
    <ClientDashboardLayout
      pageTitle={collection.name}
      pageSubtitle={collection.description || `${collection.item_count} companies`}
      breadcrumbs={breadcrumbs}
    >
      <div className="p-6">
        {/* Loading overlay for record fetch */}
        {loadingRecord && (
          <div className="fixed inset-0 bg-black/30 z-[60] flex items-center justify-center">
            <div className="bg-white rounded-xl p-6 shadow-xl flex items-center gap-3">
              <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
              <span className="text-gray-700 font-medium">Loading company details...</span>
            </div>
          </div>
        )}

        {/* Header Card */}
        <div className={`bg-gradient-to-r ${colors.gradient} rounded-2xl p-6 mb-6 text-white`}>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/client/collections')}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
              <IconComponent className="w-7 h-7" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">{collection.name}</h1>
              {collection.description && (
                <p className="text-white/80 mt-1">{collection.description}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold">{collection.item_count}</p>
              <p className="text-white/80 text-sm">companies</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search companies..."
              className="w-full pl-12 pr-10 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            )}
          </div>
        </div>

        {/* Companies List */}
        {filteredItems.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {searchQuery ? 'No companies found' : 'No companies in this collection'}
            </h3>
            <p className="text-gray-500">
              {searchQuery 
                ? 'Try a different search term' 
                : 'Add companies from your reports to this collection'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                    <th className="text-left px-4 py-3 text-xs font-bold text-gray-600 uppercase tracking-wider">Company</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-gray-600 uppercase tracking-wider">Country</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-gray-600 uppercase tracking-wider">Report</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-gray-600 uppercase tracking-wider">Added</th>
                    <th className="text-right px-4 py-3 text-xs font-bold text-gray-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedItems.map(item => (
                    <tr 
                      key={item.id} 
                      className="hover:bg-blue-50/50 transition-colors cursor-pointer group even:bg-gray-50/50"
                      onClick={() => handleRowClick(item)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 ${colors.bg} rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform`}>
                            <Building2 className={`w-4 h-4 ${colors.text}`} />
                          </div>
                          <p className="font-medium text-gray-900 text-sm">{item.company_name}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-gray-600 text-sm">
                          <MapPin className="w-3.5 h-3.5 text-gray-400" />
                          {item.country || '-'}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-xs">
                          <FileText className="w-3 h-3 text-gray-400" />
                          <span className="truncate max-w-[120px]">{item.report_title}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-gray-500 text-xs">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(item.added_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => handleViewInReport(e, item)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            title="View in report"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setItemToDelete(item);
                              setShowDeleteConfirm(true);
                            }}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            title="Remove from collection"
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
            
            {/* Pagination Footer */}
            <div className="flex items-center justify-between py-4 px-6 border-t border-gray-200 bg-white">
              {/* Left side - showing count and page size */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 text-sm text-gray-600">
                  <span>Showing</span>
                  <span className="font-semibold text-gray-900">{totalCount === 0 ? 0 : startIndex + 1}</span>
                  <span>to</span>
                  <span className="font-semibold text-gray-900">{Math.min(startIndex + pageSize, totalCount)}</span>
                  <span>of</span>
                  <span className="font-semibold text-gray-900">{totalCount}</span>
                  <span>results</span>
                </div>
                
                {/* Page Size Selector */}
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
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
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors"
                  title="First page"
                >
                  <ChevronsLeft className="w-4 h-4 text-gray-500" />
                </button>

                {/* Previous page */}
                <button
                  onClick={() => setCurrentPage(currentPage - 1)}
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
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors"
                  title="Next page"
                >
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                </button>

                {/* Last page */}
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors"
                  title="Last page"
                >
                  <ChevronsRight className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Company Detail Modal */}
      {selectedRecord && (
        <RecordDetailModal
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
          isGuest={false}
          reportId={selectedRecord.report_id}
          toast={toast}
          onNotesChanged={() => {
            // Refresh is handled by the parent page if needed
          }}
        />
      )}

      {/* Delete Confirmation */}
      <DeleteConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setItemToDelete(null);
        }}
        onConfirm={handleRemoveItem}
        itemName={itemToDelete?.company_name}
        isDeleting={isDeleting}
      />
    </ClientDashboardLayout>
  );
};

export default CollectionDetailPage;
