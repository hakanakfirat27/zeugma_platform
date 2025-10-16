import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, Calendar, CheckCircle, AlertCircle, ArrowRight,
  BarChart3, TrendingUp, Eye, Search, Filter
} from 'lucide-react';
import ClientDashboardLayout from '../../components/layout/ClientDashboardLayout';
import LoadingSpinner from '../../components/LoadingSpinner';
import api from '../../utils/api';

const ClientReportsPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all, active, expiring

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/client/subscriptions/');
      setReports(response.data);
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredReports = reports.filter(report => {
    // Search filter
    const matchesSearch = report.report_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         report.report_description.toLowerCase().includes(searchQuery.toLowerCase());

    // Status filter
    let matchesStatus = true;
    if (filterStatus === 'active') {
      matchesStatus = report.is_active && report.days_remaining > 30;
    } else if (filterStatus === 'expiring') {
      matchesStatus = report.is_active && report.days_remaining <= 30;
    }

    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <ClientDashboardLayout>
        <div className="flex items-center justify-center h-full">
          <LoadingSpinner />
        </div>
      </ClientDashboardLayout>
    );
  }

  return (
    <ClientDashboardLayout>
      <div className="p-6">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">My Reports</h2>
          <p className="text-gray-600">Access and manage your subscribed reports</p>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-2xl shadow-sm p-5 mb-6 border border-gray-100">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            {/* Search */}
            <div className="relative flex-1 min-w-[300px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search reports..."
                className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent font-medium"
              >
                <option value="all">All Reports</option>
                <option value="active">Active</option>
                <option value="expiring">Expiring Soon</option>
              </select>
            </div>
          </div>
        </div>

        {/* Reports Grid */}
        {filteredReports.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-16 text-center">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Reports Found</h3>
            <p className="text-gray-600">
              {searchQuery ? 'Try adjusting your search terms' : 'You don\'t have any reports yet'}
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredReports.map((report) => {
              const isExpiringSoon = report.days_remaining <= 30;

              return (
                <div
                  key={report.id}
                  className="group bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border-2 border-transparent hover:border-purple-200"
                >
                  {/* Card Header */}
                  <div className="bg-gradient-to-br from-purple-500 to-blue-600 p-6 text-white">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-14 h-14 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center">
                        <BarChart3 className="w-7 h-7" />
                      </div>
                      {report.is_active ? (
                        <div className="bg-green-500 text-white px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Active
                        </div>
                      ) : (
                        <div className="bg-red-500 text-white px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Expired
                        </div>
                      )}
                    </div>
                    <h3 className="text-xl font-bold mb-2 line-clamp-2">{report.report_title}</h3>
                    <p className="text-sm text-purple-100 line-clamp-2">{report.report_description}</p>
                  </div>

                  {/* Card Body */}
                  <div className="p-6">
                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4 mb-5">
                      <div className="text-center p-3 bg-gray-50rounded-xl">
                        <Calendar className="w-5 h-5 text-gray-400 mx-auto mb-1" />
                        <p className="text-xs text-gray-500">Expires</p>
                        <p className="text-sm font-bold text-gray-900">
                          {new Date(report.end_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-xl">
                        <TrendingUp className="w-5 h-5 text-gray-400 mx-auto mb-1" />
                        <p className="text-xs text-gray-500">Days Left</p>
                        <p className={`text-sm font-bold ${
                          isExpiringSoon ? 'text-orange-600' : 'text-green-600'
                        }`}>
                          {report.days_remaining}
                        </p>
                      </div>
                    </div>

                    {/* Warning for Expiring */}
                    {isExpiringSoon && report.is_active && (
                      <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-xl">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-orange-600" />
                          <p className="text-xs font-medium text-orange-800">
                            Expires in {report.days_remaining} days - Renew soon!
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Action Button */}
                    <button
                      onClick={() => navigate(`/client/reports/${report.report_id}`)}
                      disabled={!report.is_active}
                      className={`w-full py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                        report.is_active
                          ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 shadow-md hover:shadow-lg'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      <Eye className="w-5 h-5" />
                      {report.is_active ? 'View Report' : 'Expired'}
                      {report.is_active && <ArrowRight className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </ClientDashboardLayout>
  );
};

export default ClientReportsPage;