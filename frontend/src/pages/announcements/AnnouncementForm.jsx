// frontend/src/pages/announcements/AnnouncementForm.jsx
import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { getBreadcrumbs } from '../../utils/breadcrumbConfig';
import {
  Save, X, Calendar, Users, Bell, AlertCircle, Info, Link as LinkIcon,
  Megaphone, Eye, Pin, MousePointer, CheckCircle, Clock, Send,
  Sparkles, Palette, FileText, Target, ChevronDown, ChevronUp,
  Zap, AlertTriangle, ArrowRight, Globe, UserCheck, Shield, Database
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../utils/api';
import { useToast } from '../../contexts/ToastContext';

const AnnouncementForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const breadcrumbs = getBreadcrumbs(location.pathname);
  const { id } = useParams();
  const isEdit = Boolean(id);
  const toast = useToast();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    classification: true,
    targeting: true,
    scheduling: true,
    display: true,
    action: false
  });

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
      toast.error('Failed to load announcement');
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
        toast.success('Announcement updated successfully!');
      } else {
        await api.post('/api/announcements/', payload);
        toast.success('Announcement created successfully!');
      }

      setTimeout(() => {
        navigate('/announcements-management');
      }, 500);
    } catch (error) {
      console.error('Error saving announcement:', error);
      toast.error('Error saving announcement. Please check all fields and try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Color options with full Tailwind classes (not dynamic)
  const colorOptions = [
    { value: 'blue', label: 'Ocean Blue', gradient: 'from-blue-500 to-blue-600', bg: 'bg-blue-500', border: 'border-l-blue-500' },
    { value: 'green', label: 'Emerald', gradient: 'from-emerald-500 to-emerald-600', bg: 'bg-emerald-500', border: 'border-l-emerald-500' },
    { value: 'yellow', label: 'Amber', gradient: 'from-amber-500 to-amber-600', bg: 'bg-amber-500', border: 'border-l-amber-500' },
    { value: 'red', label: 'Ruby', gradient: 'from-red-500 to-red-600', bg: 'bg-red-500', border: 'border-l-red-500' },
    { value: 'purple', label: 'Violet', gradient: 'from-purple-500 to-purple-600', bg: 'bg-purple-500', border: 'border-l-purple-500' },
    { value: 'pink', label: 'Rose', gradient: 'from-pink-500 to-pink-600', bg: 'bg-pink-500', border: 'border-l-pink-500' },
    { value: 'indigo', label: 'Indigo', gradient: 'from-indigo-500 to-indigo-600', bg: 'bg-indigo-500', border: 'border-l-indigo-500' },
    { value: 'teal', label: 'Teal', gradient: 'from-teal-500 to-teal-600', bg: 'bg-teal-500', border: 'border-l-teal-500' },
  ];

  const typeOptions = [
    { value: 'general', label: 'General', icon: Megaphone },
    { value: 'maintenance', label: 'Maintenance', icon: AlertTriangle },
    { value: 'feature', label: 'New Feature', icon: Sparkles },
    { value: 'update', label: 'Update', icon: Zap },
    { value: 'event', label: 'Event', icon: Calendar },
    { value: 'alert', label: 'Alert', icon: AlertCircle },
  ];

  const priorityOptions = [
    { value: 'low', label: 'Low', description: 'Non-urgent information' },
    { value: 'medium', label: 'Medium', description: 'Standard priority' },
    { value: 'high', label: 'High', description: 'Important notice' },
    { value: 'critical', label: 'Critical', description: 'Requires immediate attention' },
  ];

  const statusOptions = [
    { value: 'draft', label: 'Draft', icon: FileText, description: 'Not visible to users' },
    { value: 'active', label: 'Active', icon: CheckCircle, description: 'Live and visible' },
    { value: 'scheduled', label: 'Scheduled', icon: Clock, description: 'Will go live at start date' },
    { value: 'archived', label: 'Archived', icon: Database, description: 'No longer visible' },
  ];

  const audienceOptions = [
    { value: 'all', label: 'All Users', icon: Globe, description: 'Everyone on the platform' },
    { value: 'clients', label: 'Clients Only', icon: Users, description: 'Client accounts only' },
    { value: 'staff', label: 'Staff Only', icon: Shield, description: 'Staff and admins' },
    { value: 'data_collectors', label: 'Data Collectors', icon: Database, description: 'Data collector accounts' },
    { value: 'custom', label: 'Custom Selection', icon: UserCheck, description: 'Specific users' },
  ];

  const selectedColor = colorOptions.find(c => c.value === formData.color_scheme) || colorOptions[0];

  // Section Header Component
  const SectionHeader = ({ icon: Icon, title, section, colorClass = 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' }) => (
    <button
      type="button"
      onClick={() => toggleSection(section)}
      className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorClass.split(' ').slice(0, 2).join(' ')}`}>
          <Icon className={`w-5 h-5 ${colorClass.split(' ').slice(2).join(' ')}`} />
        </div>
        <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
      </div>
      {expandedSections[section] ? (
        <ChevronUp className="w-5 h-5 text-gray-400" />
      ) : (
        <ChevronDown className="w-5 h-5 text-gray-400" />
      )}
    </button>
  );

  if (loading) {
    return (
      <DashboardLayout pageTitle="Loading..." breadcrumbs={breadcrumbs}>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      pageTitle={isEdit ? 'Edit Announcement' : 'Create Announcement'}
      pageSubtitleBottom="Craft engaging announcements for your users"
      breadcrumbs={breadcrumbs}
    >
      <div className="max-w-7xl mx-auto p-6">
        {/* Hero Header */}
        <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-r ${selectedColor.gradient} p-8 mb-8 shadow-xl`}>
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
          
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <Megaphone className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">
                  {isEdit ? 'Edit Announcement' : 'Create New Announcement'}
                </h1>
                <p className="text-white/80 mt-1">
                  {formData.title || 'Start typing to see your announcement come to life'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Basic Information */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <SectionHeader 
                  icon={FileText} 
                  title="Basic Information" 
                  section="basic" 
                  colorClass="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" 
                />
                
                {expandedSections.basic && (
                  <div className="p-6 pt-2 space-y-5 border-t border-gray-100 dark:border-gray-700">
                    {/* Title */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Title <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.title}
                        onChange={(e) => handleChange('title', e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                        placeholder="Enter a compelling title..."
                      />
                    </div>

                    {/* Summary */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Summary
                        <span className="ml-2 text-xs font-normal text-gray-500">(shown in previews)</span>
                      </label>
                      <input
                        type="text"
                        value={formData.summary}
                        onChange={(e) => handleChange('summary', e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                        placeholder="Brief summary of the announcement..."
                        maxLength={300}
                      />
                      <div className="flex justify-end mt-1">
                        <span className={`text-xs ${formData.summary.length > 250 ? 'text-orange-500' : 'text-gray-400'}`}>
                          {formData.summary.length}/300
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Content <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        required
                        value={formData.content}
                        onChange={(e) => handleChange('content', e.target.value)}
                        rows={8}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
                        placeholder="Write your full announcement content here..."
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Classification */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <SectionHeader 
                  icon={Target} 
                  title="Classification" 
                  section="classification" 
                  colorClass="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400" 
                />
                
                {expandedSections.classification && (
                  <div className="p-6 pt-2 space-y-6 border-t border-gray-100 dark:border-gray-700">
                    {/* Type */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                        Announcement Type
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {typeOptions.map((type) => {
                          const Icon = type.icon;
                          const isSelected = formData.announcement_type === type.value;
                          return (
                            <button
                              key={type.value}
                              type="button"
                              onClick={() => handleChange('announcement_type', type.value)}
                              className={`relative p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                                isSelected
                                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                                  : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                              }`}
                            >
                              <Icon className={`w-6 h-6 ${isSelected ? 'text-purple-600 dark:text-purple-400' : 'text-gray-400'}`} />
                              <span className={`text-sm font-medium ${isSelected ? 'text-purple-700 dark:text-purple-300' : 'text-gray-600 dark:text-gray-400'}`}>
                                {type.label}
                              </span>
                              {isSelected && (
                                <div className="absolute top-2 right-2 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                                  <CheckCircle className="w-3 h-3 text-white" />
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Priority */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                        Priority Level
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {priorityOptions.map((priority) => {
                          const isSelected = formData.priority === priority.value;
                          return (
                            <button
                              key={priority.value}
                              type="button"
                              onClick={() => handleChange('priority', priority.value)}
                              className={`p-3 rounded-xl border-2 transition-all text-center ${
                                isSelected
                                  ? priority.value === 'critical' ? 'border-red-500 bg-red-50 dark:bg-red-900/20' :
                                    priority.value === 'high' ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20' :
                                    priority.value === 'medium' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' :
                                    'border-gray-400 bg-gray-50 dark:bg-gray-700'
                                  : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                              }`}
                            >
                              <span className={`text-sm font-semibold ${
                                isSelected 
                                  ? priority.value === 'critical' ? 'text-red-600' :
                                    priority.value === 'high' ? 'text-orange-600' :
                                    priority.value === 'medium' ? 'text-blue-600' :
                                    'text-gray-600'
                                  : 'text-gray-600 dark:text-gray-400'
                              }`}>
                                {priority.label}
                              </span>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {priority.description}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Status */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                        Status
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {statusOptions.map((status) => {
                          const Icon = status.icon;
                          const isSelected = formData.status === status.value;
                          return (
                            <button
                              key={status.value}
                              type="button"
                              onClick={() => handleChange('status', status.value)}
                              className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                                isSelected
                                  ? status.value === 'active' ? 'border-green-500 bg-green-50 dark:bg-green-900/20' :
                                    status.value === 'scheduled' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' :
                                    'border-gray-400 bg-gray-100 dark:bg-gray-700'
                                  : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                              }`}
                            >
                              <Icon className={`w-5 h-5 ${
                                isSelected
                                  ? status.value === 'active' ? 'text-green-600' :
                                    status.value === 'scheduled' ? 'text-blue-600' :
                                    'text-gray-600'
                                  : 'text-gray-400'
                              }`} />
                              <span className={`text-sm font-medium ${
                                isSelected
                                  ? status.value === 'active' ? 'text-green-700 dark:text-green-300' :
                                    status.value === 'scheduled' ? 'text-blue-700 dark:text-blue-300' :
                                    'text-gray-700 dark:text-gray-300'
                                  : 'text-gray-600 dark:text-gray-400'
                              }`}>
                                {status.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Target Audience */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <SectionHeader 
                  icon={Users} 
                  title="Target Audience" 
                  section="targeting" 
                  colorClass="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400" 
                />
                
                {expandedSections.targeting && (
                  <div className="p-6 pt-2 border-t border-gray-100 dark:border-gray-700">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {audienceOptions.map((audience) => {
                        const Icon = audience.icon;
                        const isSelected = formData.target_audience === audience.value;
                        return (
                          <button
                            key={audience.value}
                            type="button"
                            onClick={() => handleChange('target_audience', audience.value)}
                            className={`p-4 rounded-xl border-2 transition-all text-left ${
                              isSelected
                                ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                                : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                isSelected ? 'bg-green-100 dark:bg-green-800/50' : 'bg-gray-100 dark:bg-gray-700'
                              }`}>
                                <Icon className={`w-5 h-5 ${isSelected ? 'text-green-600' : 'text-gray-500'}`} />
                              </div>
                              <div>
                                <p className={`font-medium ${isSelected ? 'text-green-700 dark:text-green-300' : 'text-gray-700 dark:text-gray-300'}`}>
                                  {audience.label}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{audience.description}</p>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Scheduling */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <SectionHeader 
                  icon={Calendar} 
                  title="Scheduling" 
                  section="scheduling" 
                  colorClass="bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400" 
                />
                
                {expandedSections.scheduling && (
                  <div className="p-6 pt-2 border-t border-gray-100 dark:border-gray-700">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          Start Date <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="datetime-local"
                          required
                          value={formData.start_date}
                          onChange={(e) => handleChange('start_date', e.target.value)}
                          className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          End Date
                          <span className="ml-2 text-xs font-normal text-gray-500">(optional)</span>
                        </label>
                        <input
                          type="datetime-local"
                          value={formData.end_date}
                          onChange={(e) => handleChange('end_date', e.target.value)}
                          className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Leave blank for no expiration</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Display Options */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <SectionHeader 
                  icon={Palette} 
                  title="Display Options" 
                  section="display" 
                  colorClass="bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400" 
                />
                
                {expandedSections.display && (
                  <div className="p-6 pt-2 space-y-6 border-t border-gray-100 dark:border-gray-700">
                    {/* Toggle Options */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* Pin Toggle */}
                      <div 
                        onClick={() => handleChange('is_pinned', !formData.is_pinned)}
                        className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          formData.is_pinned 
                            ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' 
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          formData.is_pinned ? 'bg-purple-100 dark:bg-purple-800/50' : 'bg-gray-100 dark:bg-gray-700'
                        }`}>
                          <Pin className={`w-5 h-5 ${formData.is_pinned ? 'text-purple-600' : 'text-gray-400'}`} />
                        </div>
                        <div>
                          <p className="font-medium text-gray-700 dark:text-gray-300">Pin to Top</p>
                          <p className="text-xs text-gray-500">Always show first</p>
                        </div>
                        <div className={`ml-auto w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          formData.is_pinned ? 'border-purple-500 bg-purple-500' : 'border-gray-300'
                        }`}>
                          {formData.is_pinned && <CheckCircle className="w-3 h-3 text-white" />}
                        </div>
                      </div>

                      {/* Popup Toggle */}
                      <div 
                        onClick={() => handleChange('show_popup', !formData.show_popup)}
                        className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          formData.show_popup 
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          formData.show_popup ? 'bg-blue-100 dark:bg-blue-800/50' : 'bg-gray-100 dark:bg-gray-700'
                        }`}>
                          <MousePointer className={`w-5 h-5 ${formData.show_popup ? 'text-blue-600' : 'text-gray-400'}`} />
                        </div>
                        <div>
                          <p className="font-medium text-gray-700 dark:text-gray-300">Show Popup</p>
                          <p className="text-xs text-gray-500">On user login</p>
                        </div>
                        <div className={`ml-auto w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          formData.show_popup ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                        }`}>
                          {formData.show_popup && <CheckCircle className="w-3 h-3 text-white" />}
                        </div>
                      </div>

                      {/* Acknowledgment Toggle */}
                      <div 
                        onClick={() => handleChange('require_acknowledgment', !formData.require_acknowledgment)}
                        className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          formData.require_acknowledgment 
                            ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          formData.require_acknowledgment ? 'bg-green-100 dark:bg-green-800/50' : 'bg-gray-100 dark:bg-gray-700'
                        }`}>
                          <CheckCircle className={`w-5 h-5 ${formData.require_acknowledgment ? 'text-green-600' : 'text-gray-400'}`} />
                        </div>
                        <div>
                          <p className="font-medium text-gray-700 dark:text-gray-300">Require ACK</p>
                          <p className="text-xs text-gray-500">Users must confirm</p>
                        </div>
                        <div className={`ml-auto w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          formData.require_acknowledgment ? 'border-green-500 bg-green-500' : 'border-gray-300'
                        }`}>
                          {formData.require_acknowledgment && <CheckCircle className="w-3 h-3 text-white" />}
                        </div>
                      </div>
                    </div>

                    {/* Color Scheme */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                        Color Scheme
                      </label>
                      <div className="flex flex-wrap gap-3">
                        {colorOptions.map((color) => (
                          <button
                            key={color.value}
                            type="button"
                            onClick={() => handleChange('color_scheme', color.value)}
                            className={`group relative w-14 h-14 rounded-xl bg-gradient-to-br ${color.gradient} transition-all transform hover:scale-105 ${
                              formData.color_scheme === color.value
                                ? 'ring-4 ring-offset-2 ring-purple-500 scale-110'
                                : 'hover:ring-2 hover:ring-offset-2 hover:ring-gray-300'
                            }`}
                            title={color.label}
                          >
                            {formData.color_scheme === color.value && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow-lg">
                                  <CheckCircle className="w-5 h-5 text-gray-800" />
                                </div>
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Call to Action */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <SectionHeader 
                  icon={LinkIcon} 
                  title="Call to Action" 
                  section="action" 
                  colorClass="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400" 
                />
                
                {expandedSections.action && (
                  <div className="p-6 pt-2 border-t border-gray-100 dark:border-gray-700">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          Button Text
                        </label>
                        <input
                          type="text"
                          value={formData.action_button_text}
                          onChange={(e) => handleChange('action_button_text', e.target.value)}
                          className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          placeholder="e.g., Learn More"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                          Button URL
                        </label>
                        <input
                          type="url"
                          value={formData.action_button_url}
                          onChange={(e) => handleChange('action_button_url', e.target.value)}
                          className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          placeholder="https://example.com"
                        />
                      </div>
                    </div>
                    
                    {formData.action_button_text && formData.action_button_url && (
                      <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Preview:</p>
                        <button type="button" className={`px-4 py-2 bg-gradient-to-r ${selectedColor.gradient} text-white rounded-lg font-medium text-sm inline-flex items-center gap-2`}>
                          {formData.action_button_text}
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-between pt-4">
                <button
                  type="button"
                  onClick={() => navigate('/announcements-management')}
                  className="px-6 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-semibold transition-colors flex items-center gap-2"
                >
                  <X className="w-5 h-5" />
                  Cancel
                </button>
                
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      handleChange('status', 'draft');
                      // Trigger form submit after setting status
                      setTimeout(() => {
                        document.querySelector('form').requestSubmit();
                      }, 100);
                    }}
                    className="px-6 py-3 border-2 border-gray-200 dark:border-gray-600 hover:border-gray-300 text-gray-700 dark:text-gray-300 rounded-xl font-semibold transition-colors flex items-center gap-2"
                  >
                    <FileText className="w-5 h-5" />
                    Save as Draft
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className={`px-6 py-3 bg-gradient-to-r ${selectedColor.gradient} hover:shadow-lg text-white rounded-xl font-semibold transition-all flex items-center gap-2 disabled:opacity-50`}
                  >
                    {saving ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        {isEdit ? 'Update' : 'Create'} Announcement
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Live Preview Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 space-y-6">
              {/* Preview Card */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Live Preview</span>
                  </div>
                </div>
                
                <div className="p-4">
                  {/* Preview Announcement Card */}
                  <div className={`rounded-xl overflow-hidden border-l-4 ${selectedColor.border} bg-gray-50 dark:bg-gray-700/50`}>
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          {formData.is_pinned && (
                            <Pin className="w-3 h-3 text-purple-500" />
                          )}
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                            formData.priority === 'critical' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                            formData.priority === 'high' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                            formData.priority === 'medium' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                            'bg-gray-100 text-gray-600 dark:bg-gray-600 dark:text-gray-300'
                          }`}>
                            {formData.priority}
                          </span>
                          <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-full">
                            {formData.announcement_type}
                          </span>
                        </div>
                      </div>
                      
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                        {formData.title || 'Announcement Title'}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
                        {formData.summary || formData.content || 'Your announcement content will appear here...'}
                      </p>
                      
                      {formData.action_button_text && (
                        <div className="mt-3">
                          <span className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white rounded-lg bg-gradient-to-r ${selectedColor.gradient}`}>
                            {formData.action_button_text}
                            <ArrowRight className="w-3 h-3" />
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Configuration Summary</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Status</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      formData.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                      formData.status === 'scheduled' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                      'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                    }`}>
                      {formData.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Audience</span>
                    <span className="font-medium text-gray-700 dark:text-gray-300">{formData.target_audience}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Pinned</span>
                    <span className={formData.is_pinned ? 'text-purple-600 font-medium' : 'text-gray-400'}>
                      {formData.is_pinned ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Popup</span>
                    <span className={formData.show_popup ? 'text-blue-600 font-medium' : 'text-gray-400'}>
                      {formData.show_popup ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Require ACK</span>
                    <span className={formData.require_acknowledgment ? 'text-green-600 font-medium' : 'text-gray-400'}>
                      {formData.require_acknowledgment ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tips */}
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-2xl p-4 border border-purple-100 dark:border-purple-800/50">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">Pro Tip</span>
                </div>
                <p className="text-xs text-purple-600 dark:text-purple-400">
                  Use the "Critical" priority sparingly for truly urgent matters. Overuse can lead to alert fatigue.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AnnouncementForm;
