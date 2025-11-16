// frontend/src/components/projects/CreateProjectModal.jsx

import React, { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import api from '../../utils/api';
import { CATEGORIES } from '../../constants/categories';

const CreateProjectModal = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    project_name: '',
    description: '',
    category: '',
    target_region: '',
    target_count: 0,
    deadline: '',
    status: 'ACTIVE'
  });
  const [errors, setErrors] = useState({});

  // Create project mutation
  const createProjectMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/api/projects/', data);
      return response.data;
    },
    onSuccess: () => {
      onSuccess();
    },
    onError: (error) => {
      console.error('Error creating project:', error);
      if (error.response?.data) {
        setErrors(error.response.data);
      } else {
        setErrors({ general: 'Failed to create project. Please try again.' });
      }
    }
  });

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.project_name.trim()) {
      newErrors.project_name = 'Project name is required';
    }

    if (!formData.category) {
      newErrors.category = 'Category is required';
    }

    if (formData.target_count < 0) {
      newErrors.target_count = 'Target count must be positive';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await createProjectMutation.mutateAsync(formData);
    } catch (error) {
      console.error('Submit error:', error);
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Create New Project
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* General Error Message */}
          {errors.general && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
              <AlertCircle className="w-5 h-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{errors.general}</p>
            </div>
          )}

          <div className="space-y-4">
            {/* Project Name */}
            <div>
              <label htmlFor="project_name" className="block text-sm font-medium text-gray-700 mb-1">
                Project Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="project_name"
                value={formData.project_name}
                onChange={(e) => handleInputChange('project_name', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.project_name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="E.g., Injection Moulders PVC - North Africa Q4 2024"
              />
              {errors.project_name && (
                <p className="text-red-500 text-xs mt-1">{errors.project_name}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={3}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.description ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Brief description of the project scope and goals..."
              />
              {errors.description && (
                <p className="text-red-500 text-xs mt-1">{errors.description}</p>
              )}
            </div>

            {/* Category */}
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                id="category"
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.category ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Select a category</option>
                {CATEGORIES.filter(cat => cat.value !== 'ALL').map(category => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
              {errors.category && (
                <p className="text-red-500 text-xs mt-1">{errors.category}</p>
              )}
            </div>

            {/* Target Region */}
            <div>
              <label htmlFor="target_region" className="block text-sm font-medium text-gray-700 mb-1">
                Target Region
              </label>
              <input
                type="text"
                id="target_region"
                value={formData.target_region}
                onChange={(e) => handleInputChange('target_region', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.target_region ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="E.g., North Africa, Europe, Asia"
              />
              {errors.target_region && (
                <p className="text-red-500 text-xs mt-1">{errors.target_region}</p>
              )}
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Target Count */}
              <div>
                <label htmlFor="target_count" className="block text-sm font-medium text-gray-700 mb-1">
                  Target Count
                </label>
                <input
                  type="number"
                  id="target_count"
                  value={formData.target_count}
                  onChange={(e) => handleInputChange('target_count', parseInt(e.target.value) || 0)}
                  min="0"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.target_count ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="100"
                />
                {errors.target_count && (
                  <p className="text-red-500 text-xs mt-1">{errors.target_count}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Number of companies to collect
                </p>
              </div>

              {/* Deadline */}
              <div>
                <label htmlFor="deadline" className="block text-sm font-medium text-gray-700 mb-1">
                  Deadline
                </label>
                <input
                  type="date"
                  id="deadline"
                  value={formData.deadline}
                  onChange={(e) => handleInputChange('deadline', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.deadline ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.deadline && (
                  <p className="text-red-500 text-xs mt-1">{errors.deadline}</p>
                )}
              </div>
            </div>

            {/* Status */}
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.status ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="ACTIVE">Active</option>
                <option value="PLANNING">Planning</option>
                <option value="ON_HOLD">On Hold</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
              {errors.status && (
                <p className="text-red-500 text-xs mt-1">{errors.status}</p>
              )}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createProjectMutation.isPending}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createProjectMutation.isPending ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateProjectModal;