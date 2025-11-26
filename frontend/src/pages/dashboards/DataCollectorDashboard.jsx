// frontend/src/pages/dashboards/DataCollectorDashboard.jsx

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import { getBreadcrumbs } from '../../utils/breadcrumbConfig';
import { useAuth } from '../../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import {
  FolderOpen, Plus, AlertCircle, CheckCircle, Clock, TrendingUp,
  Calendar, BarChart3, Target, RefreshCw
} from 'lucide-react';
import DataCollectorLayout from '../../components/layout/DataCollectorLayout';
import LoadingSpinner from '../../components/LoadingSpinner';
import api from '../../utils/api';

const DataCollectorDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const breadcrumbs = getBreadcrumbs(location.pathname);  
  const { user } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch project statistics
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['project-stats'],
    queryFn: async () => {
      const response = await api.get('/api/projects/stats/overview/');
      return response.data;
    }
  });

  // Fetch user's projects
  const { data: projectsData, isLoading: projectsLoading, refetch: refetchProjects } = useQuery({
    queryKey: ['my-projects'],
    queryFn: async () => {
      const response = await api.get('/api/projects/');
      return response.data;
    }
  });

  // Fetch user's tasks
  const { data: tasksData, refetch: refetchTasks } = useQuery({
    queryKey: ['my-tasks'],
    queryFn: async () => {
      const response = await api.get('/api/my-tasks/');
      return response.data;
    }
  });

  const getDisplayName = () => {
    if (user?.first_name && user?.last_name) {
      return `${user.first_name} ${user.last_name}`;
    } else if (user?.first_name) {
      return user.first_name;
    } else if (user?.username) {
      return user.username;
    }
    return 'Collector';
  };

  // Refresh all data
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Refresh all queries simultaneously
      await Promise.all([
        refetchStats(),
        refetchProjects(),
        refetchTasks()
      ]);
    } catch (error) {
      console.error('Error refreshing dashboard:', error);
    } finally {
      // Keep spinning for at least 500ms for visual feedback
      setTimeout(() => {
        setIsRefreshing(false);
      }, 500);
    }
  };

  if (statsLoading || projectsLoading) {
    return (
      <DataCollectorLayout pageTitle="Loading...">
        <div className="flex items-center justify-center h-screen">
          <LoadingSpinner />
        </div>
      </DataCollectorLayout>
    );
  }

  const dashboardSubtitleBottom = (
    <p className="text-sm">
      Welcome back, <span className="font-semibold">{getDisplayName()}</span>! Track your data collection progress
    </p>
  );

  return (
    <DataCollectorLayout
      pageTitle="Data Collection Dashboard"
      pageSubtitleBottom={dashboardSubtitleBottom}
      breadcrumbs={breadcrumbs}
    >
      <div className="flex-1 overflow-auto bg-gray-50">
        <div className="max-w-7xl mx-auto p-8">
          <div className="flex items-center justify-end gap-3 mb-6">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg transition-all flex items-center gap-2 font-medium text-gray-700 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>
            <button
              onClick={() => navigate('/projects')}
              className="px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg transition-all flex items-center gap-2 font-medium text-gray-700 shadow-sm"
            >
              <FolderOpen className="w-4 h-4" />
              <span>All Projects</span>
            </button>
            <button
              onClick={() => navigate('/projects')}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all flex items-center gap-2 font-semibold shadow-lg"
            >
              <Plus className="w-4 h-4" />
              <span>New Project</span>
            </button>
          </div>          
          
          
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="My Projects"
              value={stats?.total_projects || 0}
              icon={<FolderOpen className="w-6 h-6" />}
              color="blue"
              trend="+2 this month"
            />
            <StatCard
              title="Active Projects"
              value={stats?.active_projects || 0}
              icon={<TrendingUp className="w-6 h-6" />}
              color="green"
              trend="In progress"
            />
            <StatCard
              title="Needs Revision"
              value={tasksData?.count || 0}
              icon={<AlertCircle className="w-6 h-6" />}
              color="orange"
              trend="Requires action"
            />
            <StatCard
              title="Sites Collected"
              value={stats?.total_sites_in_projects || 0}
              icon={<Target className="w-6 h-6" />}
              color="purple"
              trend="All time"
            />
          </div>

          {/* Quick Actions */}
          <div className="grid lg:grid-cols-2 gap-6 mb-8">
            {/* Tasks Requiring Action */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Tasks Requiring Action</h3>
                  <p className="text-sm text-gray-500 mt-1">Sites that need your revision</p>
                </div>
                <button
                  onClick={() => navigate('/my-tasks')}
                  className="px-4 py-2 bg-orange-600 text-white rounded-xl text-sm font-medium hover:bg-orange-700 transition-colors"
                >
                  View All
                </button>
              </div>

              <div className="space-y-3">
                {tasksData?.needs_revision?.slice(0, 3).map((site) => (
                  <div
                    key={site.site_id}
                    className="flex items-center justify-between p-4 bg-orange-50 rounded-xl hover:bg-orange-100 transition-colors cursor-pointer"
                    onClick={() => navigate(`/projects/${site.project_info?.project_id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
                        <AlertCircle className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{site.company_name}</p>
                        <p className="text-xs text-gray-500">{site.project_info?.project_name}</p>
                      </div>
                    </div>
                    <Clock className="w-5 h-5 text-orange-600" />
                  </div>
                ))}

                {(!tasksData?.needs_revision || tasksData.needs_revision.length === 0) && (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>All caught up! No sites need revision.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Projects */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Recent Projects</h3>
                  <p className="text-sm text-gray-500 mt-1">Your latest data collection projects</p>
                </div>
                <button
                  onClick={() => navigate('/projects')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  View All
                </button>
              </div>

              <div className="space-y-3">
                {projectsData?.results?.slice(0, 3).map((project) => (
                  <div
                    key={project.project_id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
                    onClick={() => navigate(`/projects/${project.project_id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                        <FolderOpen className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900 text-sm">{project.project_name}</p>
                        <p className="text-xs text-gray-500">
                          {project.total_sites} / {project.target_count} sites
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-blue-600">
                        {project.completion_percentage}%
                      </p>
                      <p className="text-xs text-gray-500">{project.status_display}</p>
                    </div>
                  </div>
                ))}

                {(!projectsData?.results || projectsData.results.length === 0) && (
                  <div className="text-center py-8 text-gray-500">
                    <FolderOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="mb-3">No projects yet</p>
                    <button
                      onClick={() => navigate('/projects')}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                    >
                      Create Your First Project
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Progress Overview */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="mb-6">
              <h3 className="text-lg font-bold text-gray-900">Progress Overview</h3>
              <p className="text-sm text-gray-500 mt-1">Track your collection and approval rates</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Pending Review</span>
                  <span className="text-sm font-semibold text-yellow-600">
                    {stats?.pending_review_sites || 0}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-yellow-500 h-2 rounded-full"
                    style={{
                      width: `${stats?.total_sites_in_projects ? (stats.pending_review_sites / stats.total_sites_in_projects) * 100 : 0}%`
                    }}
                  ></div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Approved</span>
                  <span className="text-sm font-semibold text-green-600">
                    {stats?.approved_sites || 0}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full"
                    style={{
                      width: `${stats?.total_sites_in_projects ? (stats.approved_sites / stats.total_sites_in_projects) * 100 : 0}%`
                    }}
                  ></div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Needs Revision</span>
                  <span className="text-sm font-semibold text-orange-600">
                    {stats?.needs_revision_sites || 0}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-orange-500 h-2 rounded-full"
                    style={{
                      width: `${stats?.total_sites_in_projects ? (stats.needs_revision_sites / stats.total_sites_in_projects) * 100 : 0}%`
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DataCollectorLayout>
  );
};

// Stat Card Component
const StatCard = ({ title, value, icon, color, trend }) => {
  const colors = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100' },
    green: { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-100' },
    orange: { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-100' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-100' },
  };

  const colorScheme = colors[color];

  return (
    <div className={`bg-white rounded-2xl shadow-lg p-6 border ${colorScheme.border}`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-xl ${colorScheme.bg}`}>
          <div className={colorScheme.text}>{icon}</div>
        </div>
      </div>
      <h3 className="text-sm font-medium text-gray-600 mb-1">{title}</h3>
      <p className="text-3xl font-bold text-gray-900 mb-2">{value}</p>
      <p className="text-xs text-gray-500">{trend}</p>
    </div>
  );
};

export default DataCollectorDashboard;