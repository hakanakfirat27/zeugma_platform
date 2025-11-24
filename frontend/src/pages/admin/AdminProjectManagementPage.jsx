// frontend/src/pages/admin/AdminProjectManagementPage.jsx
// Admin page to view and manage ALL projects (from all data collectors)

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useToast } from '../../contexts/ToastContext';
import { ToastContainer } from '../../components/Toast';
import CreateProjectModal from '../../components/projects/CreateProjectModal';
import EditProjectModal from '../../components/projects/EditProjectModal';
import DeleteConfirmationModal from '../../components/modals/DeleteConfirmationModal';
import ProjectCardView from '../../components/projects/ProjectCardView';
import ProjectListView from '../../components/projects/ProjectListView';
import {
  Plus, Search, Filter, Grid, List, ArrowUpDown, Download, RefreshCw,
  FolderKanban, Users, Clock
} from 'lucide-react';
import { CATEGORIES } from '../../constants/categories';

const AdminProjectManagementPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toasts, removeToast, success, error: showError } = useToast();

  // State
  const [viewMode, setViewMode] = useState('list'); // 'card' or 'list'
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [sortField, setSortField] = useState('created_at');
  const [sortDirection, setSortDirection] = useState('desc');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);

  // Fetch all projects (admin can see ALL projects)
  const { data: projectsData, isLoading, refetch } = useQuery({
    queryKey: ['admin-projects', statusFilter, categoryFilter, sortField, sortDirection],
    queryFn: async () => {
      const params = new URLSearchParams({
        show_all: 'true', // Admin sees all projects
        ordering: sortDirection === 'desc' ? `-${sortField}` : sortField
      });

      if (statusFilter && statusFilter !== 'ALL') {
        params.append('status', statusFilter);
      }
      if (categoryFilter && categoryFilter !== 'ALL') {
        params.append('category', categoryFilter);
      }

      const response = await api.get(`/api/projects/?${params.toString()}`);
      return response.data;
    },
  });

  // Fetch project stats
  const { data: stats } = useQuery({
    queryKey: ['admin-project-stats'],
    queryFn: async () => {
      const response = await api.get('/api/projects/stats/overview/');
      return response.data;
    },
  });

  // Delete project mutation
  const deleteProjectMutation = useMutation({
    mutationFn: async (projectId) => {
      await api.delete(`/api/projects/${projectId}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-projects']);
      queryClient.invalidateQueries(['admin-project-stats']);
      success('Project deleted successfully!');
      setShowDeleteModal(false);
      setSelectedProject(null);
    },
    onError: (error) => {
      showError(`Failed to delete project: ${error.response?.data?.detail || error.message}`);
    },
  });

  // Filter and search projects
  const filteredProjects = React.useMemo(() => {
    if (!projectsData?.results) return [];

    let filtered = projectsData.results;

    // Search
    if (searchQuery) {
      filtered = filtered.filter(project =>
        project.project_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.target_region?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  }, [projectsData?.results, searchQuery]);

  // Handlers
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleViewProject = (projectId) => {
    navigate(`/admin/projects/${projectId}`);
  };

  const handleEditProject = (projectId) => {
    const project = filteredProjects.find(p => p.project_id === projectId);
    setSelectedProject(project);
    setShowEditModal(true);
  };

  const handleDeleteProject = (project) => {
    setSelectedProject(project);
    setShowDeleteModal(true);
  };

  const handleAddSite = (projectId) => {
    navigate(`/admin/projects/${projectId}/add-site`);
  };

  const getSortIcon = (field) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
    }
    return sortDirection === 'asc' ?
      <ArrowUpDown className="w-4 h-4 text-blue-600 rotate-180" /> :
      <ArrowUpDown className="w-4 h-4 text-blue-600" />;
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading projects...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
    pageTitle="All Projects"
    pageSubtitleBottom="Manage all data collection projects across the platform" 
    >
      <div className="p-6 max-w-7xl mx-auto">
        <ToastContainer toasts={toasts} removeToast={removeToast} />

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div></div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <Plus className="w-5 h-5" />
              Create Project
            </button>
          </div>

          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Projects</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.total_projects}</p>
                  </div>
                  <FolderKanban className="w-8 h-8 text-indigo-600" />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Active Projects</p>
                    <p className="text-2xl font-bold text-green-600">{stats.active_projects}</p>
                  </div>
                  <Clock className="w-8 h-8 text-green-600" />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Sites</p>
                    <p className="text-2xl font-bold text-blue-600">{stats.total_sites_in_projects}</p>
                  </div>
                  <Users className="w-8 h-8 text-blue-600" />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Pending Review</p>
                    <p className="text-2xl font-bold text-yellow-600">{stats.pending_review_sites}</p>
                  </div>
                  <Clock className="w-8 h-8 text-yellow-600" />
                </div>
              </div>
            </div>
          )}

          {/* Filters and Controls */}
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search projects..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div className="w-full md:w-48">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="ACTIVE">Active</option>
                  <option value="PLANNING">Planning</option>
                  <option value="ON_HOLD">On Hold</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              {/* Category Filter */}
              <div className="w-full md:w-48">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>

              {/* View Toggle */}
              <div className="flex items-center gap-2 border border-gray-300 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('card')}
                  className={`p-2 rounded ${viewMode === 'card' ? 'bg-indigo-100 text-indigo-600' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  <Grid className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded ${viewMode === 'list' ? 'bg-indigo-100 text-indigo-600' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  <List className="w-5 h-5" />
                </button>
              </div>

              {/* Refresh */}
              <button
                onClick={() => refetch()}
                className="p-2 border border-gray-300 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-colors"
                title="Refresh"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Projects Display */}
        {filteredProjects.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center border border-gray-200">
            <FolderKanban className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No projects found</h3>
            <p className="text-gray-600 mb-4">
              {searchQuery ? 'Try adjusting your search filters' : 'Get started by creating your first project'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Create Project
              </button>
            )}
          </div>
        ) : viewMode === 'card' ? (
          <ProjectCardView
            projects={filteredProjects}
            onViewProject={handleViewProject}
            onEditProject={handleEditProject}
            onDeleteProject={handleDeleteProject}
            onAddSite={handleAddSite}
          />
        ) : (
          <ProjectListView
            projects={filteredProjects}
            onViewProject={handleViewProject}
            onEditProject={handleEditProject}
            onDeleteProject={handleDeleteProject}
            onAddSite={handleAddSite}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
            getSortIcon={getSortIcon}
          />
        )}

        {/* Modals */}
        {showCreateModal && (
          <CreateProjectModal
            onClose={() => setShowCreateModal(false)}
            onSuccess={() => {
              setShowCreateModal(false);
              refetch();
              queryClient.invalidateQueries(['admin-project-stats']);
              success('Project created successfully!');
            }}
          />
        )}

        {showEditModal && selectedProject && (
          <EditProjectModal
            project={selectedProject}
            onClose={() => {
              setShowEditModal(false);
              setSelectedProject(null);
            }}
            onSuccess={() => {
              setShowEditModal(false);
              setSelectedProject(null);
              refetch();
            }}
          />
        )}

        {showDeleteModal && selectedProject && (
          <DeleteConfirmationModal
            isOpen={showDeleteModal}
            onClose={() => {
              setShowDeleteModal(false);
              setSelectedProject(null);
            }}
            onConfirm={() => deleteProjectMutation.mutate(selectedProject.project_id)}
            title="Delete Project"
            message="Are you sure you want to delete this project? All sites within this project will also be deleted."
            itemName={selectedProject.project_name}
            isDeleting={deleteProjectMutation.isPending}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminProjectManagementPage;