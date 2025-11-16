// frontend/src/pages/announcements/AnnouncementForm.jsx
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Save, X, Calendar, Users, Bell, AlertCircle, Info, Link as LinkIcon
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../utils/api';
import { useToast } from '../../hooks/useToast';
import { ToastContainer } from '../../components/Toast';

const AnnouncementForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { toasts, removeToast, success, error: showError } = useToast();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    summary: '',
    announcement_type: 'general',
    priority: 'medium',
    status: 'draft',
    target_audience: 'all',
    specific_user_ids: [],
    start_date: new Date().toISOString().slice(0, 16),
    end_date: '',
    is_pinned: false,
    show_popup: false,
    require_acknowledgment: false,
    icon: '',
    color_scheme: 'blue',
    action_button_text: '',
    action_button_url: '',
  });

  useEffect(() => {
    if (isEdit) {
      fetchAnnouncement();
    }
  }, [id]);

  const fetchAnnouncement = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/announcements/${id}/`);
      const data = response.data;

      setFormData({
        ...data,
        start_date: new Date(data.start_date).toISOString().slice(0, 16),
        end_date: data.end_date ? new Date(data.end_date).toISOString().slice(0, 16) : '',
        specific_user_ids: data.specific_users?.map(u => u.id) || [],
      });
    } catch (error) {
      console.error('Error fetching announcement:', error);
      showError('Failed to load announcement');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);

      const payload = {
        ...formData,
        end_date: formData.end_date || null,
      };

      if (isEdit) {
        await api.put(`/api/announcements/${id}/`, payload);
        success('Announcement updated successfully!');
      } else {
        await api.post('/api/announcements/', payload);
        success('Announcement created successfully!');
      }

      // Wait a moment for the toast to show before navigating
      setTimeout(() => {
        navigate('/announcements-management');
      }, 500);
    } catch (error) {
      console.error('Error saving announcement:', error);
      showError('Error saving announcement. Please check all fields and try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const colorOptions = [
    { value: 'blue', label: 'Blue', class: 'bg-blue-500' },
    { value: 'green', label: 'Green', class: 'bg-green-500' },
    { value: 'yellow', label: 'Yellow', class: 'bg-yellow-500' },
    { value: 'red', label: 'Red', class: 'bg-red-500' },
    { value: 'purple', label: 'Purple', class: 'bg-purple-500' },
    { value: 'pink', label: 'Pink', class: 'bg-pink-500' },
    { value: 'indigo', label: 'Indigo', class: 'bg-indigo-500' },
    { value: 'gray', label: 'Gray', class: 'bg-gray-500' },
  ];

  return (
    <DashboardLayout
      pageTitle={isEdit ? 'Edit Announcement' : 'Create Announcement'}
      pageSubtitleBottom="Create engaging announcements for your users"
    >
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      <div className="max-w-4xl mx-auto p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Info className="w-5 h-5 text-blue-600" />
              Basic Information
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter announcement title"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Summary
                </label>
                <input
                  type="text"
                  value={formData.summary}
                  onChange={(e) => handleChange('summary', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Short summary (shown in previews)"
                  maxLength={300}
                />
                <p className="text-xs text-gray-500 mt-1">{formData.summary.length}/300 characters</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Content <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  value={formData.content}
                  onChange={(e) => handleChange('content', e.target.value)}
                  rows={8}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter the full announcement content..."
                />
              </div>
            </div>
          </div>

          {/* Classification */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Bell className="w-5 h-5 text-purple-600" />
              Classification
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.announcement_type}
                  onChange={(e) => handleChange('announcement_type', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="general">General</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="feature">New Feature</option>
                  <option value="update">Update</option>
                  <option value="event">Event</option>
                  <option value="alert">Alert</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Priority <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => handleChange('priority', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Status <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>
          </div>

          {/* Targeting */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-green-600" />
              Target Audience
            </h3>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Who should see this? <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.target_audience}
                onChange={(e) => handleChange('target_audience', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Users</option>
                <option value="clients">Clients Only</option>
                <option value="staff">Staff Only</option>
                <option value="superadmin">Superadmin Only</option>
                <option value="superadmin">Data Collectors Only</option>
                <option value="custom">Custom Selection</option>
              </select>
            </div>
          </div>

          {/* Scheduling */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-orange-600" />
              Scheduling
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  required
                  value={formData.start_date}
                  onChange={(e) => handleChange('start_date', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  End Date (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={formData.end_date}
                  onChange={(e) => handleChange('end_date', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">Leave blank for no expiration</p>
              </div>
            </div>
          </div>

          {/* Display Options */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-blue-600" />
              Display Options
            </h3>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_pinned"
                  checked={formData.is_pinned}
                  onChange={(e) => handleChange('is_pinned', e.target.checked)}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
                <label htmlFor="is_pinned" className="text-sm font-medium text-gray-700">
                  Pin to top of announcements
                </label>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="show_popup"
                  checked={formData.show_popup}
                  onChange={(e) => handleChange('show_popup', e.target.checked)}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
                <label htmlFor="show_popup" className="text-sm font-medium text-gray-700">
                  Show as popup on user login
                </label>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="require_acknowledgment"
                  checked={formData.require_acknowledgment}
                  onChange={(e) => handleChange('require_acknowledgment', e.target.checked)}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
                <label htmlFor="require_acknowledgment" className="text-sm font-medium text-gray-700">
                  Require user acknowledgment
                </label>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Color Scheme
                </label>
                <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
                  {colorOptions.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => handleChange('color_scheme', color.value)}
                      className={`relative w-full aspect-square rounded-lg ${color.class} transition-all ${
                        formData.color_scheme === color.value
                          ? 'ring-4 ring-offset-2 ring-blue-500 scale-110'
                          : 'hover:scale-105'
                      }`}
                      title={color.label}
                    >
                      {formData.color_scheme === color.value && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
                            <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                          </div>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <LinkIcon className="w-5 h-5 text-indigo-600" />
              Call to Action (Optional)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Button Text
                </label>
                <input
                  type="text"
                  value={formData.action_button_text}
                  onChange={(e) => handleChange('action_button_text', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Learn More"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Button URL
                </label>
                <input
                  type="url"
                  value={formData.action_button_url}
                  onChange={(e) => handleChange('action_button_url', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://example.com"
                />
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => navigate('/announcements-management')}
              className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold transition-colors flex items-center gap-2"
            >
              <X className="w-5 h-5" />
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Saving...' : (isEdit ? 'Update Announcement' : 'Create Announcement')}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
};

export default AnnouncementForm;