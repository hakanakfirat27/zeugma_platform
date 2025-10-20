import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, Calendar, CheckCircle, AlertCircle, ArrowRight,
  BarChart3, TrendingUp, Eye, Search, Filter, LayoutGrid, List
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
  const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'list'

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

            {/* Right Side - Filter & View Toggle */}
            <div className="flex items-center gap-3">
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

              {/* View Toggle Buttons */}
              <div className="flex items-center bg-gray-100 rounded-xl p-1">
                <button
                  onClick={() => setViewMode('cards')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                    viewMode === 'cards'
                      ? 'bg-white text-purple-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                  <span className="text-sm font-medium">Cards</span>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                    viewMode === 'list'
                      ? 'bg-white text-purple-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <List className="w-4 h-4" />
                  <span className="text-sm font-medium">List</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Reports Display */}
        {filteredReports.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-16 text-center">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Reports Found</h3>
            <p className="text-gray-600">
              {searchQuery ? 'Try adjusting your search terms' : 'You don\'t have any reports yet'}
            </p>
          </div>
        ) : viewMode === 'cards' ? (
          /* CARD VIEW */
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
                      <div className="text-center p-3 bg-gray-50 rounded-xl">
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
        ) : (
          /* LIST VIEW */
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Report
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Expires
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Days Left
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredReports.map((report) => {
                    const isExpiringSoon = report.days_remaining <= 30;

                    return (
                      <tr key={report.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
                              <FileText className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-900">{report.report_title}</p>
                              <p className="text-xs text-gray-500 line-clamp-1">{report.report_description}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {report.is_active ? (
                            isExpiringSoon ? (
                              <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-semibold bg-orange-100 text-orange-700">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                Expiring Soon
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-semibold bg-green-100 text-green-700">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Active
                              </span>
                            )
                          ) : (
                            <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-semibold bg-red-100 text-red-700">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              Expired
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            {new Date(report.end_date).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`text-sm font-medium ${
                            isExpiringSoon ? 'text-orange-600' : 'text-green-600'
                          }`}>
                            {report.days_remaining} days
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          {report.is_active ? (
                            <button
                              onClick={() => navigate(`/client/reports/${report.report_id}`)}
                              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl text-sm font-medium hover:from-purple-700 hover:to-blue-700 transition-all shadow-md"
                            >
                              <Eye className="w-4 h-4" />
                              View Report
                            </button>
                          ) : (
                            <button
                              disabled
                              className="px-4 py-2 bg-gray-100 text-gray-400 rounded-xl text-sm font-medium cursor-not-allowed"
                            >
                              Expired
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </ClientDashboardLayout>
  );
};

export default ClientReportsPage;