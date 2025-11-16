// frontend/src/pages/announcements/AnnouncementsManagement.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, Plus, Search, Filter, Edit, Trash2, Eye, Calendar,
  Users, AlertCircle, CheckCircle, Clock, Archive, Send,
  TrendingUp, BarChart3, RefreshCw, Download, X
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../utils/api';
import { useToast } from '../../hooks/useToast';
import { ToastContainer } from '../../components/Toast';

const AnnouncementsManagement = () => {
  const navigate = useNavigate();
  const { toasts, removeToast, success, error: showError, info, warning } = useToast();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [stats, setStats] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);

  useEffect(() => {
    fetchAnnouncements();
    fetchStatistics();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/announcements/');
      setAnnouncements(response.data);
    } catch (error) {
      console.error('Error fetching announcements:', error);
      showError('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await api.get('/api/announcements/statistics/');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/api/announcements/${id}/`);
      await fetchAnnouncements();
      await fetchStatistics();
      setShowDeleteModal(false);
      setSelectedAnnouncement(null);
      success('Announcement deleted successfully!');
    } catch (error) {
      console.error('Error deleting announcement:', error);
      showError('Failed to delete announcement');
    }
  };

  const handlePublish = async (id) => {
    try {
      await api.post(`/api/announcements/${id}/publish/`);
      await fetchAnnouncements();
      await fetchStatistics();
      success('Announcement published successfully!');
    } catch (error) {
      console.error('Error publishing announcement:', error);
      showError('Failed to publish announcement');
    }
  };

  const handleArchive = async (id) => {
    try {
      await api.post(`/api/announcements/${id}/archive/`);
      await fetchAnnouncements();
      await fetchStatistics();
      warning('Announcement archived');
    } catch (error) {
      console.error('Error archiving announcement:', error);
      showError('Failed to archive announcement');
    }
  };

  const getTypeColor = (type) => {
    const colors = {
      general: 'bg-gray-100 text-gray-800',
      maintenance: 'bg-orange-100 text-orange-800',
      feature: 'bg-green-100 text-green-800',
      update: 'bg-blue-100 text-blue-800',
      event: 'bg-purple-100 text-purple-800',
      alert: 'bg-red-100 text-red-800',
    };
    return colors[type] || colors.general;
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-blue-100 text-blue-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800',
    };
    return colors[priority] || colors.medium;
  };

  const getStatusColor = (status) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      scheduled: 'bg-yellow-100 text-yellow-800',
      active: 'bg-green-100 text-green-800',
      expired: 'bg-red-100 text-red-800',
      archived: 'bg-slate-100 text-slate-800',
    };
    return colors[status] || colors.draft;
  };

  const getStatusIcon = (status) => {
    const icons = {
      draft: <Edit className="w-4 h-4" />,
      scheduled: <Clock className="w-4 h-4" />,
      active: <CheckCircle className="w-4 h-4" />,
      expired: <AlertCircle className="w-4 h-4" />,
      archived: <Archive className="w-4 h-4" />,
    };
    return icons[status] || icons.draft;
  };

  const filteredAnnouncements = announcements.filter(announcement => {
    const matchesSearch = announcement.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         announcement.summary?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || announcement.status === filterStatus;
    const matchesType = filterType === 'all' || announcement.announcement_type === filterType;
    const matchesPriority = filterPriority === 'all' || announcement.priority === filterPriority;

    return matchesSearch && matchesStatus && matchesType && matchesPriority;
  });

  return (
    <DashboardLayout
      pageTitle="Announcements Management"
      pageSubtitleBottom="Create and manage system announcements"
    >
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      <div className="max-w-7xl mx-auto p-8">
        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Bell className="w-6 h-6 text-blue-600" />
                </div>
                <span className="text-3xl font-bold text-gray-900">{stats.total_announcements}</span>
              </div>
              <h3 className="text-sm font-semibold text-gray-600">Total Announcements</h3>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <span className="text-3xl font-bold text-gray-900">{stats.active_announcements}</span>
              </div>
              <h3 className="text-sm font-semibold text-gray-600">Active Announcements</h3>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
                <span className="text-3xl font-bold text-gray-900">{stats.total_views}</span>
              </div>
              <h3 className="text-sm font-semibold text-gray-600">Total Views</h3>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-orange-600" />
                </div>
                <span className="text-3xl font-bold text-gray-900">
                  {stats.engagement_rate ? `${stats.engagement_rate}%` : '0%'}
                </span>
              </div>
              <h3 className="text-sm font-semibold text-gray-600">Engagement Rate</h3>
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border border-gray-100">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
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
            </div>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="archived">Archived</option>
            </select>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="general">General</option>
              <option value="maintenance">Maintenance</option>
              <option value="feature">New Feature</option>
              <option value="update">Update</option>
              <option value="event">Event</option>
              <option value="alert">Alert</option>
            </select>

            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
        </div>

        {/* Announcements Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Table Header with Action Buttons */}
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">All Announcements</h2>
            <div className="flex gap-2">
              <button
                onClick={fetchAnnouncements}
                className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-all flex items-center gap-2 font-medium"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="hidden sm:inline">Refresh</span>
              </button>
              <button
                onClick={() => navigate('/announcements/new')}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all flex items-center gap-2 font-semibold shadow-lg"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Create Announcement</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Target
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Views
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center">
                      <div className="flex justify-center">
                        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
                      </div>
                    </td>
                  </tr>
                ) : filteredAnnouncements.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center">
                      <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500 font-medium">No announcements found</p>
                      <p className="text-sm text-gray-400 mt-1">Create your first announcement to get started</p>
                    </td>
                  </tr>
                ) : (
                  filteredAnnouncements.map((announcement) => (
                    <tr key={announcement.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-start gap-3">
                          {announcement.is_pinned && (
                            <div className="mt-1">
                              <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-gray-900">{announcement.title}</p>
                            {announcement.summary && (
                              <p className="text-sm text-gray-500 mt-1 line-clamp-1">{announcement.summary}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${getTypeColor(announcement.announcement_type)}`}>
                          {announcement.announcement_type}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${getPriorityColor(announcement.priority)}`}>
                          {announcement.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(announcement.status)}`}>
                          {getStatusIcon(announcement.status)}
                          {announcement.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-600">{announcement.target_audience}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Eye className="w-4 h-4 text-gray-400" />
                          <span className="text-sm font-medium text-gray-900">{announcement.views_count}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            {new Date(announcement.start_date).toLocaleDateString()}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {announcement.status === 'draft' && (
                            <button
                              onClick={() => handlePublish(announcement.id)}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Publish"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => navigate(`/announcements-management/${announcement.id}`)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => navigate(`/announcements/edit/${announcement.id}`)}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          {announcement.status !== 'archived' && (
                            <button
                              onClick={() => handleArchive(announcement.id)}
                              className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                              title="Archive"
                            >
                              <Archive className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setSelectedAnnouncement(announcement);
                              setShowDeleteModal(true);
                            }}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedAnnouncement && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 text-center mb-2">Delete Announcement</h3>
            <p className="text-gray-600 text-center mb-6">
              Are you sure you want to delete "{selectedAnnouncement.title}"? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedAnnouncement(null);
                }}
                className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(selectedAnnouncement.id)}
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

export default AnnouncementsManagement;