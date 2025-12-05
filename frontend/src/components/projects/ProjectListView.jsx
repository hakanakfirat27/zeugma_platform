// frontend/src/components/projects/ProjectListView.jsx

import React from 'react';
import { Eye, Edit2, Trash2, Plus, Calendar, Hash } from 'lucide-react';
import { CATEGORY_COLORS } from '../../constants/categories';

const ProjectListView = ({ 
  projects, 
  onViewProject, 
  onEditProject, 
  onDeleteProject,
  onAddSite,
  sortField,
  sortDirection,
  onSort,
  getSortIcon,
  currentUserId,  // NEW: Current user's ID
  isAdmin = false  // NEW: Whether current user is admin
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

  // Check if current user can edit/delete project
  // Admins can edit/delete any project, data collectors can only edit/delete their own
  const canEditDelete = (project) => {
    if (isAdmin) return true;
    // For data collectors, check if they created the project
    return project.created_by === currentUserId;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {/* NEW: Project Code Column */}
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => onSort('project_code')}
              >
                <div className="flex items-center gap-2">
                  Code
                  {getSortIcon('project_code')}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => onSort('project_name')}
              >
                <div className="flex items-center gap-2">
                  Project Name
                  {getSortIcon('project_name')}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => onSort('category')}
              >
                <div className="flex items-center gap-2">
                  Category
                  {getSortIcon('category')}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => onSort('status')}
              >
                <div className="flex items-center gap-2">
                  Status
                  {getSortIcon('status')}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => onSort('completion_percentage')}
              >
                <div className="flex items-center gap-2">
                  Progress
                  {getSortIcon('completion_percentage')}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => onSort('deadline')}
              >
                <div className="flex items-center gap-2">
                  Deadline
                  {getSortIcon('deadline')}
                </div>
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {projects.map((project) => (
              <tr key={project.project_id} className="border-b hover:bg-blue-50 cursor-pointer transition-all duration-200 hover:shadow-sm"
                onClick={() => onViewProject(project.project_id)}>
                
                {/* NEW: Project Code Cell */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-slate-100 text-slate-700 border border-slate-200">
                    <Hash className="w-3 h-3" />
                    {project.project_code || '-'}
                  </span>
                </td>

                {/* Project Name */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {project.project_name}
                    </div>
                    {project.target_region && (
                      <div className="text-sm text-gray-500">
                        {project.target_region}
                      </div>
                    )}
                  </div>
                </td>

                {/* Category */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    CATEGORY_COLORS[project.category] || 'bg-gray-100 text-gray-800'
                  }`}>
                    {project.category_display}
                  </span>
                </td>

                {/* Status */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    getStatusColor(project.status)
                  }`}>
                    {project.status_display}
                  </span>
                </td>

                {/* Progress */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-1">
                      <div className="text-sm text-gray-900">
                        {project.total_sites || 0} / {project.target_count || 0} sites
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ 
                            width: `${Math.min(project.completion_percentage || 0, 100)}%` 
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </td>

                {/* Deadline */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center text-sm text-gray-500">
                    <Calendar className="w-4 h-4 mr-1" />
                    {formatDate(project.deadline)}
                  </div>
                </td>

                {/* Actions */}
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end gap-2">          
                    {/* View Button */}
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

                    {/* Edit Button - Only show if user can edit */}
                    {canEditDelete(project) && (
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
                    )}

                    {/* Delete Button - Only show if user can delete */}
                    {canEditDelete(project) && (
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
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProjectListView;
