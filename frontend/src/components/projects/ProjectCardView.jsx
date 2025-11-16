// frontend/src/components/projects/ProjectCardView.jsx

import React from 'react';
import { Eye, Edit2, Trash2, Plus, Calendar, TrendingUp } from 'lucide-react';
import { CATEGORY_COLORS } from '../../constants/categories';

const ProjectCardView = ({ 
  projects, 
  onViewProject, 
  onEditProject, 
  onDeleteProject,
  onAddSite 
}) => {
  const getStatusColor = (status) => {
    const colors = {
      'ACTIVE': 'bg-green-100 text-green-800',
      'COMPLETED': 'bg-blue-100 text-blue-800',
      'ON_HOLD': 'bg-yellow-100 text-yellow-800',
      'CANCELLED': 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {projects.map((project) => (
        <div
          key={project.project_id}
          className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 border border-gray-200 overflow-hidden cursor-pointer"
          onClick={() => onViewProject(project.project_id)}
        >
          {/* Card Header */}
          <div className="p-6 pb-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-gray-900 truncate mb-1">
                  {project.project_name}
                </h3>
                {project.target_region && (
                  <p className="text-sm text-gray-500">{project.target_region}</p>
                )}
              </div>
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ml-2 ${
                getStatusColor(project.status)
              }`}>
                {project.status_display}
              </span>
            </div>

            {/* Category Badge */}
            <div className="mb-4">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                CATEGORY_COLORS[project.category] || 'bg-gray-100 text-gray-800'
              }`}>
                {project.category_display}
              </span>
            </div>

            {/* Progress Section */}
            <div className="mb-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-gray-600">Progress</span>
                <span className="font-medium text-gray-900">
                  {project.total_sites || 0} / {project.target_count || 0} sites
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ 
                    width: `${Math.min(project.completion_percentage || 0, 100)}%` 
                  }}
                />
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-4 py-3 border-t border-gray-100">
              <div className="text-center">
                <div className="text-xs text-gray-500 mb-1">Pending</div>
                <div className="text-sm font-semibold text-yellow-600">
                  {project.pending_sites || 0}
                </div>
              </div>
              <div className="text-center border-l border-r border-gray-100">
                <div className="text-xs text-gray-500 mb-1">Approved</div>
                <div className="text-sm font-semibold text-green-600">
                  {project.approved_sites || 0}
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-500 mb-1">Rejected</div>
                <div className="text-sm font-semibold text-red-600">
                  {project.rejected_sites || 0}
                </div>
              </div>
            </div>

            {/* Deadline */}
            <div className="flex items-center text-sm text-gray-500 mt-3 pt-3 border-t border-gray-100">
              <Calendar className="w-4 h-4 mr-2" />
              <span>Deadline: {formatDate(project.deadline)}</span>
            </div>

            {/* Approval Rate */}
            <div className="flex items-center text-sm text-gray-500 mt-2">
              <TrendingUp className="w-4 h-4 mr-2" />
              <span>{project.approval_rate || 0}% approval rate</span>
            </div>
          </div>

          {/* Card Footer - Actions */}
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
            <div className="flex items-center justify-between gap-2">
              {/* Add Site Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAddSite(project.project_id);
                }}
                className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-blue-300 rounded-lg text-sm font-medium text-blue-700 bg-white hover:bg-blue-50 transition-colors"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Site
              </button>

              {/* Action Buttons */}
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewProject(project.project_id);
                  }}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="View Project"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditProject(project.project_id);
                  }}
                  className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                  title="Edit Project"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteProject(project);
                  }}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete Project"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProjectCardView;