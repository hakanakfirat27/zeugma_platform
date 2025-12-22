// frontend/src/pages/announcements/UserAnnouncements.jsx
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getBreadcrumbs } from '../../utils/breadcrumbConfig';
import {
  Bell, Calendar, CheckCircle, AlertCircle, Info, Megaphone,
  Pin, ExternalLink, Eye, Filter, Search, RefreshCw, Trash2, X,
  Clock, Sparkles, Zap, AlertTriangle
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import ClientDashboardLayout from '../../components/layout/ClientDashboardLayout';
import api from '../../utils/api';
import { useToast } from '../../hooks/useToast';
import { ToastContainer } from '../../components/Toast';

const UserAnnouncements = () => {
  const navigate = useNavigate();
  const location = useLocation();  
  const breadcrumbs = getBreadcrumbs(location.pathname);    
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

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const handleViewAnnouncement = async (announcement) => {
    try {
      setSelectedAnnouncement(announcement);
      setShowModal(true);
      setLoadingModalContent(true);

      const response = await api.get(`/api/announcements/${announcement.id}/`);
      setSelectedAnnouncement(response.data);

      setAnnouncements(prev =>
        prev.map(a => a.id === announcement.id ? { ...a, has_viewed: true } : a)
      );

      setTimeout(() => fetchAnnouncements(), 500);
    } catch (error) {
      console.error('Error viewing announcement:', error);
      showError('Failed to view announcement');
      setShowModal(false);
      setSelectedAnnouncement(null);
    } finally {
      setLoadingModalContent(false);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setTimeout(() => {
      setSelectedAnnouncement(null);
      setLoadingModalContent(false);
    }, 300);
  };

  const handleAcknowledge = async () => {
    if (!selectedAnnouncement) return;

    try {
      await api.post(`/api/announcements/${selectedAnnouncement.id}/acknowledge/`);
      setAnnouncements(prev =>
        prev.map(a => a.id === selectedAnnouncement.id ? { ...a, has_acknowledged: true } : a)
      );
      setSelectedAnnouncement(prev => ({ ...prev, has_acknowledged: true }));
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
      await api.delete(`/api/announcements/${announcementToDelete.id}/delete_for_user/`);
      setAnnouncements(prev => prev.filter(a => a.id !== announcementToDelete.id));
      setShowDeleteModal(false);
      setAnnouncementToDelete(null);
      success('Announcement removed successfully!');
      setTimeout(() => fetchAnnouncements(), 500);
    } catch (error) {
      console.error('Error deleting announcement:', error);
      showError('Failed to delete announcement');
    }
  };

  const getTypeIcon = (type) => {
    const icons = {
      general: <Info className="w-4 h-4" />,
      maintenance: <AlertTriangle className="w-4 h-4" />,
      feature: <Sparkles className="w-4 h-4" />,
      update: <Zap className="w-4 h-4" />,
      event: <Calendar className="w-4 h-4" />,
      alert: <AlertCircle className="w-4 h-4" />,
    };
    return icons[type] || <Bell className="w-4 h-4" />;
  };

  const getTypeColor = (type) => {
    const colors = {
      general: { gradient: 'from-slate-500 to-slate-600', bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-400' },
      maintenance: { gradient: 'from-amber-500 to-orange-500', bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400' },
      feature: { gradient: 'from-emerald-500 to-green-500', bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-400' },
      update: { gradient: 'from-blue-500 to-indigo-500', bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400' },
      event: { gradient: 'from-purple-500 to-violet-500', bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400' },
      alert: { gradient: 'from-red-500 to-rose-500', bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-600 dark:text-red-400' },
    };
    return colors[type] || colors.general;
  };

  const getPriorityConfig = (priority) => {
    const configs = {
      low: { label: 'Low', color: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400' },
      medium: { label: 'Medium', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
      high: { label: 'High', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
      critical: { label: 'Critical', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
    };
    return configs[priority] || configs.medium;
  };

  const filteredAnnouncements = announcements.filter(announcement => {
    const matchesSearch = announcement.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (announcement.summary && announcement.summary.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesFilter = filterType === 'all' || announcement.announcement_type === filterType;
    return matchesSearch && matchesFilter;
  });

  const unreadCount = announcements.filter(a => !a.has_viewed).length;
  const Layout = user?.role === 'CLIENT' ? ClientDashboardLayout : DashboardLayout;

  return (
    <Layout
      pageTitle="Announcements"
      pageSubtitleBottom="Stay updated with the latest news and updates"
      breadcrumbs={breadcrumbs}
    >
      <div className="p-6 max-w-7xl mx-auto">
        <ToastContainer toasts={toasts} removeToast={removeToast} />

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Total</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{announcements.length}</p>
              </div>
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <Megaphone className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Unread</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{unreadCount}</p>
              </div>
              <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
                <Bell className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Read</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{announcements.length - unreadCount}</p>
              </div>
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search announcements..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 min-w-[140px]"
            >
              <option value="all">All Types</option>
              <option value="general">General</option>
              <option value="maintenance">Maintenance</option>
              <option value="feature">Feature</option>
              <option value="update">Update</option>
              <option value="event">Event</option>
              <option value="alert">Alert</option>
            </select>

            <button
              onClick={fetchAnnouncements}
              disabled={loading}
              className="group flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-all disabled:opacity-50 hover:shadow-lg hover:shadow-blue-500/25"
            >
              <RefreshCw className={`w-4 h-4 transition-transform duration-500 ${loading ? 'animate-spin' : 'group-hover:rotate-180'}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* Announcements List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-6 text-center">
            <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-2" />
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            <button onClick={fetchAnnouncements} className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg">
              Try Again
            </button>
          </div>
        ) : filteredAnnouncements.length === 0 ? (
          <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-10 text-center">
            <Bell className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {searchTerm || filterType !== 'all' ? 'No announcements match your criteria' : 'No announcements yet'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAnnouncements.map(announcement => (
              <div
                key={announcement.id}
                onClick={() => handleViewAnnouncement(announcement)}
                className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden cursor-pointer hover:shadow-md transition-all group ${
                  !announcement.has_viewed ? 'ring-2 ring-blue-500/20' : ''
                }`}
              >
                <div className="flex items-stretch">
                  {/* Left accent bar */}
                  <div className={`w-1 bg-gradient-to-b ${getTypeColor(announcement.announcement_type).gradient}`}></div>
                  
                  <div className="flex-1 p-4">
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className={`w-9 h-9 rounded-lg ${getTypeColor(announcement.announcement_type).bg} flex items-center justify-center flex-shrink-0`}>
                        <span className={getTypeColor(announcement.announcement_type).text}>
                          {getTypeIcon(announcement.announcement_type)}
                        </span>
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                            {announcement.title}
                          </h3>
                          {announcement.is_pinned && <Pin className="w-3 h-3 text-amber-500 flex-shrink-0" />}
                          {!announcement.has_viewed && <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></span>}
                        </div>
                        
                        {announcement.summary && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 mb-2">
                            {announcement.summary}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${getPriorityConfig(announcement.priority).color}`}>
                            {getPriorityConfig(announcement.priority).label}
                          </span>
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(announcement.start_date).toLocaleDateString()}
                          </span>
                          {announcement.has_acknowledged && (
                            <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              Acknowledged
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Delete button */}
                      <button
                        onClick={(e) => handleDeleteClick(announcement, e)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal - Gradient Wave Style */}
      {showModal && selectedAnnouncement && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden">
            {/* Gradient Wave Header */}
            <div className={`relative h-32 bg-gradient-to-r ${getTypeColor(selectedAnnouncement.announcement_type).gradient}`}>
              <svg className="absolute bottom-0 w-full" viewBox="0 0 1440 120" fill="none" preserveAspectRatio="none">
                <path d="M0 120L60 105C120 90 240 60 360 45C480 30 600 30 720 37.5C840 45 960 60 1080 67.5C1200 75 1320 75 1380 75L1440 75V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" className="fill-white dark:fill-gray-800"/>
              </svg>
              
              <button 
                onClick={handleCloseModal} 
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-white" />
              </button>

              <div className="absolute -bottom-5 left-5 w-12 h-12 bg-white dark:bg-gray-800 rounded-xl shadow-lg flex items-center justify-center">
                <div className={`w-9 h-9 bg-gradient-to-br ${getTypeColor(selectedAnnouncement.announcement_type).gradient} rounded-lg flex items-center justify-center text-white`}>
                  {getTypeIcon(selectedAnnouncement.announcement_type)}
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-5 pt-8">
              <div className="flex items-center gap-2 mb-2">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${getPriorityConfig(selectedAnnouncement.priority).color}`}>
                  {getPriorityConfig(selectedAnnouncement.priority).label}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(selectedAnnouncement.start_date).toLocaleDateString('en-US', { 
                    year: 'numeric', month: 'short', day: 'numeric' 
                  })}
                </span>
              </div>
              
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                {selectedAnnouncement.title}
              </h2>
              
              {loadingModalContent ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-wrap">
                    {selectedAnnouncement.content || selectedAnnouncement.summary || 'No content available'}
                  </p>
                </div>
              )}
              
              {selectedAnnouncement.action_button_text && selectedAnnouncement.action_button_url && (
                <a
                  href={selectedAnnouncement.action_button_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-2 mt-4 px-4 py-2 bg-gradient-to-r ${getTypeColor(selectedAnnouncement.announcement_type).gradient} text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity`}
                >
                  {selectedAnnouncement.action_button_text}
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 pb-5 flex items-center justify-between border-t border-gray-100 dark:border-gray-700 pt-4">
              <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  {selectedAnnouncement.views_count} views
                </span>
                {selectedAnnouncement.has_acknowledged && (
                  <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                    <CheckCircle className="w-3 h-3" />
                    Acknowledged
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                {selectedAnnouncement.require_acknowledgment && !selectedAnnouncement.has_acknowledged && (
                  <button
                    onClick={handleAcknowledge}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-1"
                  >
                    <CheckCircle className="w-3 h-3" />
                    Acknowledge
                  </button>
                )}
                <button
                  onClick={handleCloseModal}
                  className={`px-4 py-2 bg-gradient-to-r ${getTypeColor(selectedAnnouncement.announcement_type).gradient} text-white text-sm font-medium rounded-lg transition-opacity hover:opacity-90`}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && announcementToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-sm w-full p-5">
            <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white text-center mb-1">Remove Announcement</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-4">
              Remove "{announcementToDelete.title}" from your list?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => { setShowDeleteModal(false); setAnnouncementToDelete(null); }}
                className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom scrollbar styles */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }
      `}</style>
    </Layout>
  );
};

export default UserAnnouncements;
