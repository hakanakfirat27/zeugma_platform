// frontend/src/pages/CustomReportsPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import DashboardLayout from '../components/layout/DashboardLayout';
import LoadingSpinner from '../components/LoadingSpinner';
import api from '../utils/api';
import { ArrowLeft, Search, X, FileText, Users, Calendar, Plus, Edit, Trash2, Eye } from 'lucide-react';

const CustomReportsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const isStaff = user?.role === 'SUPERADMIN' || user?.role === 'STAFF_ADMIN';

  useEffect(() => {
    fetchReports();
  }, [searchTerm]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const params = {};
      if (searchTerm) params.search = searchTerm;

      const response = await api.get('/api/custom-reports/', { params });
      setReports(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReport = () => {
    navigate('/custom-reports/create');
  };

  const handleViewReport = (reportId) => {
    navigate(`/custom-reports/${reportId}`);
  };

  const handleEditReport = (reportId) => {
    navigate(`/custom-reports/${reportId}/edit`);
  };

  const handleDeleteReport = async (reportId) => {
    if (!window.confirm('Are you sure you want to delete this report?')) {
      return;
    }

    try {
      await api.delete(`/api/custom-reports/${reportId}/`);
      fetchReports();
      alert('Report deleted successfully');
    } catch (error) {
      console.error('Error deleting report:', error);
      alert('Failed to delete report');
    }
  };

  if (loading && reports.length === 0) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <LoadingSpinner />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Header - Same style as Superdatabase */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white px-8 py-8 shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <button
            onClick={() => navigate('/staff-dashboard')}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold">Custom Reports</h1>
        </div>
        <p className="text-indigo-100 text-sm ml-12">
          {isStaff
            ? 'Create and manage custom database reports'
            : 'Browse available custom reports'}
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto bg-white">
        <div className="max-w-7xl mx-auto px-8 py-6">
          {/* Action Bar */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search reports..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {isStaff && (
              <button
                onClick={handleCreateReport}
                className="ml-4 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center gap-2 shadow-md"
              >
                <Plus className="w-5 h-5" />
                Create New Report
              </button>
            )}
          </div>

          {/* Reports Grid */}
          {reports.length === 0 ? (
            <div className="text-center py-16 bg-gray-50 rounded-lg">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No reports found</h3>
              <p className="text-gray-600 mb-6">
                {isStaff ? 'Get started by creating a new report.' : 'Check back later for available reports.'}
              </p>
              {isStaff && (
                <button
                  onClick={handleCreateReport}
                  className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition inline-flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Create First Report
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {reports.map((report) => (
                <div
                  key={report.report_id}
                  className="bg-white rounded-xl border border-gray-200 hover:shadow-lg transition-all overflow-hidden group"
                >
                  {/* Card Header */}
                  <div className="bg-gradient-to-r from-indigo-50 to-purple-50 px-5 py-4 border-b border-gray-200">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1 line-clamp-1">
                          {report.title}
                        </h3>
                        <div className="flex items-center gap-2">
                          {report.is_active ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              Inactive
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-5">
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2 min-h-[40px]">
                      {report.description}
                    </p>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-blue-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <FileText className="w-4 h-4 text-blue-600" />
                          <span className="text-xs text-gray-600">Records</span>
                        </div>
                        <p className="text-lg font-bold text-blue-900">{report.record_count}</p>
                      </div>

                      <div className="bg-purple-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Users className="w-4 h-4 text-purple-600" />
                          <span className="text-xs text-gray-600">Subscribers</span>
                        </div>
                        <p className="text-lg font-bold text-purple-900">{report.subscription_count}</p>
                      </div>
                    </div>

                    {/* Metadata */}
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-4 pb-4 border-b">
                      <Calendar className="w-3 h-3" />
                      <span>Created {new Date(report.created_at).toLocaleDateString()}</span>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleViewReport(report.report_id)}
                        className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition text-sm font-medium flex items-center justify-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </button>
                      {isStaff && (
                        <>
                          <button
                            onClick={() => handleEditReport(report.report_id)}
                            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm font-medium text-gray-700"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteReport(report.report_id)}
                            className="px-4 py-2 border border-red-300 rounded-lg hover:bg-red-50 transition text-sm font-medium text-red-600"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CustomReportsPage;