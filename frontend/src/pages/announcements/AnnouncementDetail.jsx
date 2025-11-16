// frontend/src/pages/announcements/AnnouncementDetail.jsx
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Edit, Trash2, Archive, Send, Eye, Users, Calendar,
  Clock, AlertCircle, CheckCircle, Bell, Pin, ExternalLink, TrendingUp
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../utils/api';
import { useToast } from '../../hooks/useToast';
import { ToastContainer } from '../../components/Toast';

const AnnouncementDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toasts, removeToast, success, error: showError, warning } = useToast();
  const [announcement, setAnnouncement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    fetchAnnouncement();
  }, [id]);

  const fetchAnnouncement = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/announcements/${id}/`);
      setAnnouncement(response.data);
    } catch (error) {
      console.error('Error fetching announcement:', error);
      showError('Failed to load announcement');
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    try {
      await api.post(`/api/announcements/${id}/publish/`);
      await fetchAnnouncement();
      success('Announcement published successfully!');
    } catch (error) {
      console.error('Error publishing announcement:', error);
      showError('Failed to publish announcement');
    }
  };

  const handleArchive = async () => {
    try {
      await api.post(`/api/announcements/${id}/archive/`);
      await fetchAnnouncement();
      warning('Announcement archived');
    } catch (error) {
      console.error('Error archiving announcement:', error);
      showError('Failed to archive announcement');
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/api/announcements/${id}/`);
      success('Announcement deleted successfully!');
      setTimeout(() => navigate('/announcements-management'), 500);
    } catch (error) {
      console.error('Error deleting announcement:', error);
      showError('Failed to delete announcement');
    }
  };

  const getTypeColor = (type) => {
    const colors = {
      general: 'from-blue-500 to-blue-600',
      maintenance: 'from-orange-500 to-orange-600',
      feature: 'from-green-500 to-green-600',
      update: 'from-purple-500 to-purple-600',
      event: 'from-pink-500 to-pink-600',
      alert: 'from-red-500 to-red-600',
    };
    return colors[type] || colors.general;
  };

  const getTypeIcon = (type) => {
    const icons = {
      general: <Bell className="w-6 h-6" />,
      maintenance: <AlertCircle className="w-6 h-6" />,
      feature: <TrendingUp className="w-6 h-6" />,
      update: <CheckCircle className="w-6 h-6" />,
      event: <Calendar className="w-6 h-6" />,
      alert: <AlertCircle className="w-6 h-6" />,
    };
    return icons[type] || icons.general;
  };

  const getStatusBadge = (status) => {
    const badges = {
      draft: { color: 'bg-gray-100 text-gray-800 border-gray-300', icon: <Edit className="w-4 h-4" /> },
      scheduled: { color: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: <Clock className="w-4 h-4" /> },
      active: { color: 'bg-green-100 text-green-800 border-green-300', icon: <CheckCircle className="w-4 h-4" /> },
      expired: { color: 'bg-red-100 text-red-800 border-red-300', icon: <AlertCircle className="w-4 h-4" /> },
      archived: { color: 'bg-slate-100 text-slate-800 border-slate-300', icon: <Archive className="w-4 h-4" /> },
    };
    return badges[status] || badges.draft;
  };

  const getPriorityBadge = (priority) => {
    const badges = {
      low: { color: 'bg-green-100 text-green-800 border-green-300', text: 'Low Priority' },
      medium: { color: 'bg-blue-100 text-blue-800 border-blue-300', text: 'Medium Priority' },
      high: { color: 'bg-orange-100 text-orange-800 border-orange-300', text: 'High Priority' },
      critical: { color: 'bg-red-100 text-red-800 border-red-300', text: 'Critical' },
    };
    return badges[priority] || badges.medium;
  };

  if (loading) {
    return (
      <DashboardLayout pageTitle="Loading...">
        <div className="flex justify-center items-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!announcement) {
    return (
      <DashboardLayout pageTitle="Not Found">
        <div className="text-center py-12">
          <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Announcement Not Found</h2>
          <p className="text-gray-600 mb-6">The announcement you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate('/announcements-management')}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
          >
            Back to Announcements
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const statusBadge = getStatusBadge(announcement.status);
  const priorityBadge = getPriorityBadge(announcement.priority);

  return (
    <DashboardLayout
      pageTitle="Announcement Details"
      pageSubtitleBottom="View and manage announcement details"
    >
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      <div className="max-w-5xl mx-auto p-8">
        {/* Back Button */}
        <button
          onClick={() => navigate('/announcements-management')}
          className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Announcements
        </button>

        {/* Header Card */}
        <div className={`bg-gradient-to-r ${getTypeColor(announcement.announcement_type)} text-white rounded-xl p-8 mb-6 shadow-lg`}>
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-start gap-4 flex-1">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center flex-shrink-0">
                {getTypeIcon(announcement.announcement_type)}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <h1 className="text-3xl font-bold">{announcement.title}</h1>
                  {announcement.is_pinned && (
                    <Pin className="w-6 h-6 text-yellow-300" />
                  )}
                </div>
                {announcement.summary && (
                  <p className="text-white/90 text-lg">{announcement.summary}</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className={`px-4 py-2 rounded-lg border-2 font-semibold flex items-center gap-2 ${statusBadge.color}`}>
              {statusBadge.icon}
              {announcement.status.toUpperCase()}
            </span>
            <span className={`px-4 py-2 rounded-lg border-2 font-semibold ${priorityBadge.color}`}>
              {priorityBadge.text}
            </span>
            <span className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-lg font-semibold">
              {announcement.announcement_type}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-gray-100">
          <div className="flex flex-wrap items-center gap-3">
            {announcement.status === 'draft' && (
              <button
                onClick={handlePublish}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
              >
                <Send className="w-5 h-5" />
                Publish Announcement
              </button>
            )}
            <button
              onClick={() => navigate(`/announcements/edit/${announcement.id}`)}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
            >
              <Edit className="w-5 h-5" />
              Edit
            </button>
            {announcement.status !== 'archived' && (
              <button
                onClick={handleArchive}
                className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
              >
                <Archive className="w-5 h-5" />
                Archive
              </button>
            )}
            <button
              onClick={() => setShowDeleteModal(true)}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-2 ml-auto"
            >
              <Trash2 className="w-5 h-5" />
              Delete
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Content */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Content</h2>
              <div className="prose max-w-none">
                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {announcement.content}
                </p>
              </div>
            </div>

            {/* Action Button */}
            {announcement.action_button_text && announcement.action_button_url && (
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Call to Action</h2>
                <a
                  href={announcement.action_button_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
                >
                  {announcement.action_button_text}
                  <ExternalLink className="w-5 h-5" />
                </a>
              </div>
            )}

            {/* Statistics */}
            {announcement.view_stats && (
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Statistics</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="text-3xl font-bold text-blue-600 mb-1">
                      {announcement.view_stats.total_views}
                    </div>
                    <div className="text-sm text-gray-600">Total Views</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="text-3xl font-bold text-green-600 mb-1">
                      {announcement.view_stats.total_acknowledged}
                    </div>
                    <div className="text-sm text-gray-600">Acknowledged</div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4">
                    <div className="text-3xl font-bold text-purple-600 mb-1">
                      {announcement.view_stats.view_rate}%
                    </div>
                    <div className="text-sm text-gray-600">View Rate</div>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-4">
                    <div className="text-3xl font-bold text-orange-600 mb-1">
                      {announcement.view_stats.acknowledgment_rate}%
                    </div>
                    <div className="text-sm text-gray-600">Acknowledgment Rate</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Metadata */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Details</h2>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                    <Users className="w-4 h-4" />
                    Target Audience
                  </div>
                  <div className="font-semibold text-gray-900 capitalize">
                    {announcement.target_audience.replace('_', ' ')}
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                    <Calendar className="w-4 h-4" />
                    Start Date
                  </div>
                  <div className="font-semibold text-gray-900">
                    {new Date(announcement.start_date).toLocaleString()}
                  </div>
                </div>

                {announcement.end_date && (
                  <div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                      <Calendar className="w-4 h-4" />
                      End Date
                    </div>
                    <div className="font-semibold text-gray-900">
                      {new Date(announcement.end_date).toLocaleString()}
                    </div>
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                    <Eye className="w-4 h-4" />
                    Total Views
                  </div>
                  <div className="font-semibold text-gray-900">
                    {announcement.views_count}
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                    <Users className="w-4 h-4" />
                    Created By
                  </div>
                  <div className="font-semibold text-gray-900">
                    {announcement.created_by?.username || 'Unknown'}
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                    <Clock className="w-4 h-4" />
                    Created At
                  </div>
                  <div className="font-semibold text-gray-900">
                    {new Date(announcement.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            {/* Display Options */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Display Options</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Pinned</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${announcement.is_pinned ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                    {announcement.is_pinned ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Show Popup</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${announcement.show_popup ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                    {announcement.show_popup ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Requires Acknowledgment</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${announcement.require_acknowledgment ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                    {announcement.require_acknowledgment ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 text-center mb-2">Delete Announcement</h3>
            <p className="text-gray-600 text-center mb-6">
              Are you sure you want to delete "{announcement.title}"? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default AnnouncementDetail;