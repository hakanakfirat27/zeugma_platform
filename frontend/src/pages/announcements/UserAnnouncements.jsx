// frontend/src/pages/announcements/UserAnnouncements.jsx
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, Calendar, CheckCircle, AlertCircle, Info, Megaphone,
  Pin, ExternalLink, Eye, Filter, Search, RefreshCw, Trash2, X
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import ClientDashboardLayout from '../../components/layout/ClientDashboardLayout';
import api from '../../utils/api';
import { useToast } from '../../hooks/useToast';
import { ToastContainer } from '../../components/Toast';

const UserAnnouncements = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toasts, removeToast, success, error: showError } = useToast();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [announcementToDelete, setAnnouncementToDelete] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [loadingModalContent, setLoadingModalContent] = useState(false);

  // Popup notification states
  const [showPopupNotification, setShowPopupNotification] = useState(false);
  const [popupAnnouncements, setPopupAnnouncements] = useState([]);
  const [currentPopupIndex, setCurrentPopupIndex] = useState(0);
  const [popupCheckInterval, setPopupCheckInterval] = useState(null);

  // Fetch announcements - wrapped in useCallback to prevent infinite loops
  const fetchAnnouncements = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get('/api/announcements/my_announcements/');
      setAnnouncements(response.data);
    } catch (error) {
      console.error('Error fetching announcements:', error);
      setError(error.response?.data?.detail || 'Failed to load announcements');
      showError('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  // Fetch popup announcements specifically
  const fetchPopupAnnouncements = useCallback(async () => {
    try {
      const response = await api.get('/api/announcements/popup/');
      console.log('Popup API response:', response.data); // Debug log

      if (response.data && response.data.length > 0) {
        setPopupAnnouncements(response.data);
        setCurrentPopupIndex(0);
        setShowPopupNotification(true);
      }
    } catch (error) {
      console.error('Error fetching popup announcements:', error);
    }
  }, []);

  // Initial fetch on mount
  useEffect(() => {
    fetchPopupAnnouncements();
    fetchAnnouncements();
  }, [fetchPopupAnnouncements, fetchAnnouncements]);

  // Set up polling for new announcements every 30 seconds
  useEffect(() => {
    // Check for new popups every 30 seconds
    const interval = setInterval(() => {
      fetchPopupAnnouncements();
    }, 30000); // 30 seconds

    setPopupCheckInterval(interval);

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [fetchPopupAnnouncements]);

  const handleViewAnnouncement = async (announcement) => {
    try {
      // Show modal immediately with basic data
      setSelectedAnnouncement(announcement);
      setShowModal(true);
      setLoadingModalContent(true);

      // Fetch the full announcement details - this also marks it as viewed
      const response = await api.get(`/api/announcements/${announcement.id}/`);
      const fullAnnouncement = response.data;

      console.log('Full announcement data:', fullAnnouncement); // Debug log

      // Update with the full announcement data including content
      setSelectedAnnouncement(fullAnnouncement);

      // Update local state to mark as viewed
      setAnnouncements(prev =>
        prev.map(a => a.id === announcement.id ? { ...a, has_viewed: true } : a)
      );

      // Refresh announcements list after a short delay to update counts
      setTimeout(() => {
        fetchAnnouncements();
      }, 500);
    } catch (error) {
      console.error('Error viewing announcement:', error);
      showError('Failed to view announcement');
      // Close modal on error
      setShowModal(false);
      setSelectedAnnouncement(null);
    } finally {
      setLoadingModalContent(false);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    // Don't clear selectedAnnouncement immediately to prevent flash
    setTimeout(() => {
      setSelectedAnnouncement(null);
      setLoadingModalContent(false);
    }, 300);
  };

  // Handle closing popup and moving to next
  const handleClosePopup = async () => {
    const currentAnnouncement = popupAnnouncements[currentPopupIndex];

    // Mark current announcement as viewed by fetching it
    if (currentAnnouncement) {
      try {
        await api.get(`/api/announcements/${currentAnnouncement.id}/`);
        // Update local announcements state
        setAnnouncements(prev =>
          prev.map(a => a.id === currentAnnouncement.id ? { ...a, has_viewed: true } : a)
        );
      } catch (error) {
        console.error('Error marking as viewed:', error);
      }
    }

    // Move to next announcement or close popup
    if (currentPopupIndex < popupAnnouncements.length - 1) {
      setCurrentPopupIndex(prev => prev + 1);
    } else {
      setShowPopupNotification(false);
      setCurrentPopupIndex(0);
      setPopupAnnouncements([]);
      // Refresh announcements to get updated counts
      fetchAnnouncements();
    }
  };

  // Handle "Got it" button
  const handleGotIt = () => {
    handleClosePopup();
  };

  // Handle "View Full" from popup
  const handleViewFullFromPopup = async () => {
    const currentAnnouncement = popupAnnouncements[currentPopupIndex];
    setShowPopupNotification(false);
    await handleViewAnnouncement(currentAnnouncement);
  };

  const handleAcknowledge = async () => {
    if (!selectedAnnouncement) return;

    try {
      await api.post(`/api/announcements/${selectedAnnouncement.id}/acknowledge/`);

      // Update local state
      setAnnouncements(prev =>
        prev.map(a =>
          a.id === selectedAnnouncement.id ? { ...a, has_acknowledged: true } : a
        )
      );

      // Update selected announcement
      setSelectedAnnouncement(prev => ({
        ...prev,
        has_acknowledged: true
      }));

      success('Announcement acknowledged successfully!');
    } catch (error) {
      console.error('Error acknowledging announcement:', error);
      showError('Failed to acknowledge announcement');
    }
  };

  const handleDeleteClick = (announcement, e) => {
    e.stopPropagation();
    setAnnouncementToDelete(announcement);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!announcementToDelete) return;

    try {
      // Delete for user - this marks it as hidden
      await api.delete(`/api/announcements/${announcementToDelete.id}/delete_for_user/`);

      // Remove from local state immediately for better UX
      setAnnouncements(prev => prev.filter(a => a.id !== announcementToDelete.id));

      setShowDeleteModal(false);
      setAnnouncementToDelete(null);
      success('Announcement deleted successfully!');

      // Refresh to update counts
      setTimeout(() => {
        fetchAnnouncements();
      }, 500);
    } catch (error) {
      console.error('Error deleting announcement:', error);
      showError('Failed to delete announcement');
    }
  };

  // Utility functions
  const getTypeIcon = (type) => {
    const icons = {
      general: <Info className="w-6 h-6" />,
      maintenance: <AlertCircle className="w-6 h-6" />,
      feature: <Megaphone className="w-6 h-6" />,
      update: <Bell className="w-6 h-6" />,
      event: <Calendar className="w-6 h-6" />,
      alert: <AlertCircle className="w-6 h-6" />,
    };
    return icons[type] || <Bell className="w-6 h-6" />;
  };

  const getTypeColor = (type) => {
    const colors = {
      general: 'from-gray-500 to-gray-600',
      maintenance: 'from-yellow-500 to-orange-600',
      feature: 'from-green-500 to-emerald-600',
      update: 'from-blue-500 to-indigo-600',
      event: 'from-purple-500 to-violet-600',
      alert: 'from-red-500 to-rose-600',
    };
    return colors[type] || 'from-gray-500 to-gray-600';
  };

  const getPriorityBadge = (priority) => {
    const badges = {
      low: { text: 'Low Priority', color: 'border-green-300 text-green-700' },
      medium: { text: 'Medium Priority', color: 'border-blue-300 text-blue-700' },
      high: { text: 'High Priority', color: 'border-orange-300 text-orange-700' },
      critical: { text: 'Critical', color: 'border-red-300 text-red-700' },
    };
    return badges[priority] || badges.medium;
  };

  // Filter announcements
  const filteredAnnouncements = announcements.filter(announcement => {
    const matchesSearch = announcement.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (announcement.summary && announcement.summary.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesFilter = filterType === 'all' || announcement.announcement_type === filterType;
    return matchesSearch && matchesFilter;
  });

  // Layout based on role
  const Layout = user?.role === 'CLIENT' ? ClientDashboardLayout : DashboardLayout;

  // Get current popup announcement
  const currentPopupAnnouncement = popupAnnouncements[currentPopupIndex];

  return (
    <Layout
      pageTitle="Announcements"
      pageSubtitleBottom="Stay updated with the latest news and updates"
    >
      <div className="p-6">
        <ToastContainer toasts={toasts} removeToast={removeToast} />

        {/* Header */}
        <div className="flex items-center justify-between py-4">
          <div>

          </div>
          <button
            onClick={fetchAnnouncements}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 p-6"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 py-4 ">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search announcements..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Clear search"
                >
                  <X className="w-5 h-5 text-red-400" />
                </button>
              )}              
            </div>

            {/* Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white cursor-pointer min-w-[180px]"
              >
                <option value="all">All Types</option>
                <option value="general">General</option>
                <option value="maintenance">Maintenance</option>
                <option value="feature">New Feature</option>
                <option value="update">Update</option>
                <option value="event">Event</option>
                <option value="alert">Alert</option>
              </select>
            </div>
          </div>
        </div>

        {/* Announcements List */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-red-900 mb-2">Error Loading Announcements</h3>
            <p className="text-red-700">{error}</p>
            <button
              onClick={fetchAnnouncements}
              className="mt-4 px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : filteredAnnouncements.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-12 text-center">
            <Bell className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Announcements Found</h3>
            <p className="text-gray-600">
              {searchTerm || filterType !== 'all'
                ? 'Try adjusting your search or filter criteria'
                : 'There are no announcements at this time'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAnnouncements.map(announcement => (
              <AnnouncementCard
                key={announcement.id}
                announcement={announcement}
                onView={handleViewAnnouncement}
                onDelete={handleDeleteClick}
                getTypeIcon={getTypeIcon}
                getTypeColor={getTypeColor}
                getPriorityBadge={getPriorityBadge}
              />
            ))}
          </div>
        )}
      </div>

      {/* Popup Notification Modal */}
      {showPopupNotification && currentPopupAnnouncement && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden animate-scale-in">
            {/* Popup Header */}
            <div className={`bg-gradient-to-r ${getTypeColor(currentPopupAnnouncement.announcement_type)} text-white p-6`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                    {getTypeIcon(currentPopupAnnouncement.announcement_type)}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">{currentPopupAnnouncement.title}</h2>
                    <p className="text-white/90 text-sm mt-1">New Announcement</p>
                  </div>
                </div>
                <button
                  onClick={handleClosePopup}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/20 backdrop-blur-sm">
                  {currentPopupAnnouncement.announcement_type}
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold border bg-white/20 backdrop-blur-sm`}>
                  {getPriorityBadge(currentPopupAnnouncement.priority).text}
                </span>
              </div>
            </div>

            {/* Popup Body */}
            <div className="p-6 max-h-[400px] overflow-y-auto">
              <div className="prose max-w-none">
                {currentPopupAnnouncement.summary ? (
                  <p className="text-gray-700 text-lg leading-relaxed mb-4">
                    {currentPopupAnnouncement.summary}
                  </p>
                ) : null}

                {currentPopupAnnouncement.content ? (
                  <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {currentPopupAnnouncement.content}
                  </div>
                ) : (
                  !currentPopupAnnouncement.summary && (
                    <p className="text-gray-500 italic">No content available</p>
                  )
                )}
              </div>

              {/* Popup indicator if multiple */}
              {popupAnnouncements.length > 1 && (
                <div className="mt-6 flex items-center justify-center gap-2">
                  {popupAnnouncements.map((_, index) => (
                    <div
                      key={index}
                      className={`h-2 rounded-full transition-all ${
                        index === currentPopupIndex
                          ? 'w-8 bg-blue-600'
                          : 'w-2 bg-gray-300'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Popup Footer */}
            <div className="border-t border-gray-200 p-6 bg-gray-50 flex items-center justify-between gap-4">
              <button
                onClick={handleGotIt}
                className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-semibold transition-colors"
              >
                Got it
              </button>
              <button
                onClick={handleViewFullFromPopup}
                className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
              >
                View Full Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Announcement Modal */}
      {showModal && selectedAnnouncement && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className={`bg-gradient-to-r ${getTypeColor(selectedAnnouncement.announcement_type)} text-white p-6`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                    {getTypeIcon(selectedAnnouncement.announcement_type)}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">{selectedAnnouncement.title}</h2>
                    <p className="text-white/90 text-sm mt-1">
                      {new Date(selectedAnnouncement.start_date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold bg-white/20 backdrop-blur-sm`}>
                  {selectedAnnouncement.announcement_type}
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getPriorityBadge(selectedAnnouncement.priority).color}`}>
                  {getPriorityBadge(selectedAnnouncement.priority).text}
                </span>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {loadingModalContent ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <>
                  <div className="prose max-w-none">
                    {selectedAnnouncement.content ? (
                      <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                        {selectedAnnouncement.content}
                      </p>
                    ) : (
                      <p className="text-gray-500 italic">No content available</p>
                    )}
                  </div>

                  {/* Action Button */}
                  {selectedAnnouncement.action_button_text && selectedAnnouncement.action_button_url && (
                    <div className="mt-6">
                      <a
                        href={selectedAnnouncement.action_button_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
                      >
                        {selectedAnnouncement.action_button_text}
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-gray-200 p-6 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    <span>{selectedAnnouncement.views_count} views</span>
                  </div>
                  {selectedAnnouncement.has_acknowledged && (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="w-4 h-4" />
                      <span>Acknowledged</span>
                    </div>
                  )}
                </div>

                {selectedAnnouncement.require_acknowledgment && !selectedAnnouncement.has_acknowledged && (
                  <button
                    onClick={handleAcknowledge}
                    disabled={loadingModalContent}
                    className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <CheckCircle className="w-5 h-5" />
                    Acknowledge
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && announcementToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 text-center mb-2">Delete Announcement</h3>
            <p className="text-gray-600 text-center mb-6">
              Are you sure you want to remove "{announcementToDelete.title}" from your view? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setAnnouncementToDelete(null);
                }}
                className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

// Announcement Card Component
const AnnouncementCard = ({ announcement, onView, onDelete, getTypeIcon, getTypeColor, getPriorityBadge }) => {
  return (
    <div
      className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-100 overflow-hidden group"
    >
      <div className="flex">
        {/* Left Color Bar */}
        <div className={`w-2 bg-gradient-to-b ${getTypeColor(announcement.announcement_type)}`}></div>

        {/* Content */}
        <div className="flex-1 p-6">
          <div className="flex items-start justify-between mb-3">
            <div
              className="flex items-start gap-4 flex-1 cursor-pointer"
              onClick={() => onView(announcement)}
            >
              <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${getTypeColor(announcement.announcement_type)} flex items-center justify-center text-white flex-shrink-0`}>
                {getTypeIcon(announcement.announcement_type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                    {announcement.title}
                  </h3>
                  {announcement.is_pinned && (
                    <Pin className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                  )}
                  {!announcement.has_viewed && (
                    <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></span>
                  )}
                </div>

                {announcement.summary && (
                  <p className="text-gray-600 text-sm line-clamp-2 mb-3">
                    {announcement.summary}
                  </p>
                )}

                <div className="flex items-center gap-3 flex-wrap">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getPriorityBadge(announcement.priority).color}`}>
                    {getPriorityBadge(announcement.priority).text}
                  </span>

                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>
                      {new Date(announcement.start_date).toLocaleDateString()}
                    </span>
                  </div>

                  {announcement.has_acknowledged && (
                    <div className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Acknowledged</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Delete Button */}
            <button
              onClick={(e) => onDelete(announcement, e)}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
              title="Delete announcement"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserAnnouncements;