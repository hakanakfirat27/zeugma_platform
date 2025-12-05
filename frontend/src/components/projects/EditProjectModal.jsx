// frontend/src/components/projects/EditProjectModal.jsx
// FIXED: Added assignment field for admins to assign projects to data collectors

import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import api from '../../utils/api';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';

const EditProjectModal = ({ project, onClose, onSuccess }) => {
  const queryClient = useQueryClient();
  const { success, error: showError } = useToast();
  const { user } = useAuth();
  
  const [formData, setFormData] = useState({
    project_name: '',
    description: '',
    category: '',
    target_region: '',
    status: '',
    target_count: 0,
    deadline: '',
    assigned_to: '', // ✅ NEW: Assignment field
  });

  const isAdmin = user?.role === 'SUPERADMIN' || user?.role === 'STAFF_ADMIN';

  // ✅ NEW: Fetch data collectors for assignment dropdown
  const { data: dataCollectors } = useQuery({
    queryKey: ['data-collectors'],
    queryFn: async () => {
      const response = await api.get('/accounts/users/?role=DATA_COLLECTOR');
      return response.data.results || response.data;
    },
    enabled: isAdmin
  });

  useEffect(() => {
    if (project) {
      setFormData({
        project_name: project.project_name || '',
        description: project.description || '',
        category: project.category || '',
        target_region: project.target_region || '',
        status: project.status || 'ACTIVE',
        target_count: project.target_count || 0,
        deadline: project.deadline ? project.deadline.split('T')[0] : '',
        // FIX: Convert assigned_to to string for proper select value matching
        assigned_to: project.assigned_to ? String(project.assigned_to) : '',
      });
    }
  }, [project]);

  const updateProjectMutation = useMutation({
    mutationFn: async (data) => {
      // Convert assigned_to: empty string to null, otherwise to integer
      const payload = {
        ...data,
        assigned_to: data.assigned_to ? parseInt(data.assigned_to, 10) : null,
      };
      const response = await api.patch(`/api/projects/${project.project_id}/`, payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['projects']);
      queryClient.invalidateQueries(['admin-projects']);  // Also invalidate admin queries
      queryClient.invalidateQueries(['project', project.project_id]);
      queryClient.invalidateQueries(['admin-project', project.project_id]);  // Also invalidate admin detail
      queryClient.invalidateQueries(['project-stats']);
      success('Project updated successfully!');
      onSuccess();
    },
    onError: (error) => {
      showError(`Failed to update project: ${error.response?.data?.detail || error.message}`);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    updateProjectMutation.mutate(formData);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">Edit Project</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            {/* Project Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project Name *
              </label>
              <input
                type="text"
                name="project_name"
                value={formData.project_name}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category *
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select Category</option>
                <option value="INJECTION">Injection Moulders</option>
                <option value="BLOW">Blow Moulders</option>
                <option value="ROTO">Roto Moulders</option>
                <option value="PE_FILM">PE Film Extruders</option>
                <option value="SHEET">Sheet Extruders</option>
                <option value="PIPE">Pipe Extruders</option>
                <option value="TUBE_HOSE">Tube & Hose Extruders</option>
                <option value="PROFILE">Profile Extruders</option>
                <option value="CABLE">Cable Extruders</option>
                <option value="COMPOUNDER">Compounders</option>
              </select>
            </div>

            {/* ✅ NEW: Assign To (Only visible for Admins) */}
            {isAdmin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assign To (Optional)
                </label>
                <select
                  name="assigned_to"
                  value={formData.assigned_to}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Unassigned</option>
                  {dataCollectors && dataCollectors.map(dc => (
                    <option key={dc.id} value={String(dc.id)}>
                      {dc.first_name} {dc.last_name} ({dc.username})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Assign this project to a specific data collector
                </p>
              </div>
            )}

            {/* Target Region */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Target Region
              </label>
              <input
                type="text"
                name="target_region"
                value={formData.target_region}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status *
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="ACTIVE">Active</option>
                <option value="COMPLETED">Completed</option>
                <option value="ON_HOLD">On Hold</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            {/* Target Count */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Target Count
              </label>
              <input
                type="number"
                name="target_count"
                value={formData.target_count}
                onChange={handleChange}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Deadline */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Deadline
              </label>
              <input
                type="date"
                name="deadline"
                value={formData.deadline}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateProjectMutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {updateProjectMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProjectModal;