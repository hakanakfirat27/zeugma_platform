// frontend/src/components/modals/BulkExportModal.jsx

import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import api from '../../utils/api';
import { useToast } from '../../hooks/useToast';
import { Download, FileSpreadsheet, XCircle, CheckCircle } from 'lucide-react';
import { CATEGORIES } from '../../constants/categories';

const BulkExportModal = ({ isOpen, onClose, projectId, projectName }) => {
  const { success, error: showError } = useToast();
  const [exportFormat, setExportFormat] = useState('xlsx');
  const [filters, setFilters] = useState({
    verification_status: [],
    category: '',
  });

  const exportMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/api/import-export/export/', {
        project_id: projectId,
        verification_status: filters.verification_status.length > 0 ? filters.verification_status : undefined,
        category: filters.category || undefined,
        format: exportFormat,
      }, {
        responseType: 'blob',
      });
      return response;
    },
    onSuccess: (response) => {
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      const extension = exportFormat === 'csv' ? 'csv' : 'xlsx';
      link.setAttribute('download', `${projectName}.${extension}`);
      
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      success('Export completed successfully!');
      onClose();
    },
    onError: (err) => {
      console.error('Export error:', err);
      showError('Failed to export. Please try again.');
    },
  });

  const handleExport = () => {
    exportMutation.mutate();
  };

  const handleStatusToggle = (status) => {
    setFilters(prev => ({
      ...prev,
      verification_status: prev.verification_status.includes(status)
        ? prev.verification_status.filter(s => s !== status)
        : [...prev.verification_status, status]
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose} />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-600 to-teal-600 px-6 py-4 rounded-t-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Download className="w-6 h-6 text-white" />
                <div>
                  <h3 className="text-xl font-semibold text-white">Export Sites</h3>
                  <p className="text-sm text-green-100">Project: {projectName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-6 space-y-6">
            {/* Export Format */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Export Format
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setExportFormat('xlsx')}
                  className={`flex items-center justify-center gap-3 p-4 border-2 rounded-lg transition-all ${
                    exportFormat === 'xlsx'
                      ? 'border-green-600 bg-green-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <FileSpreadsheet className={`w-6 h-6 ${exportFormat === 'xlsx' ? 'text-green-600' : 'text-gray-400'}`} />
                  <div className="text-left">
                    <div className={`font-semibold ${exportFormat === 'xlsx' ? 'text-green-900' : 'text-gray-700'}`}>
                      Excel (.xlsx)
                    </div>
                    <div className="text-xs text-gray-500">Recommended</div>
                  </div>
                  {exportFormat === 'xlsx' && (
                    <CheckCircle className="w-5 h-5 text-green-600 ml-auto" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setExportFormat('csv')}
                  className={`flex items-center justify-center gap-3 p-4 border-2 rounded-lg transition-all ${
                    exportFormat === 'csv'
                      ? 'border-green-600 bg-green-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <FileSpreadsheet className={`w-6 h-6 ${exportFormat === 'csv' ? 'text-green-600' : 'text-gray-400'}`} />
                  <div className="text-left">
                    <div className={`font-semibold ${exportFormat === 'csv' ? 'text-green-900' : 'text-gray-700'}`}>
                      CSV (.csv)
                    </div>
                    <div className="text-xs text-gray-500">Plain text</div>
                  </div>
                  {exportFormat === 'csv' && (
                    <CheckCircle className="w-5 h-5 text-green-600 ml-auto" />
                  )}
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900">Export Filters (Optional)</h4>
              
              {/* Verification Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Verification Status
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: 'PENDING', label: 'Pending', color: 'yellow' },
                    { value: 'UNDER_REVIEW', label: 'Under Review', color: 'blue' },
                    { value: 'NEEDS_REVISION', label: 'Needs Revision', color: 'orange' },
                    { value: 'APPROVED', label: 'Approved', color: 'green' },
                    { value: 'REJECTED', label: 'Rejected', color: 'red' },
                  ].map(status => (
                    <button
                      key={status.value}
                      type="button"
                      onClick={() => handleStatusToggle(status.value)}
                      className={`px-3 py-1.5 rounded-lg border-2 text-sm font-medium transition-all ${
                        filters.verification_status.includes(status.value)
                          ? `border-${status.color}-600 bg-${status.color}-50 text-${status.color}-900`
                          : 'border-gray-300 text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      {status.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty to export all statuses
                </p>
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category (Optional)
                </label>
                <select
                  value={filters.category}
                  onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="">All Categories</option>
                  {CATEGORIES.filter(cat => cat.value !== 'ALL').map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Export will create separate sheets for each category
                </p>
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <FileSpreadsheet className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-700">
                  <p className="font-medium mb-1">Export Format:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Each category in separate sheet</li>
                    <li>Sheet name = Category (e.g., "Injection Moulders")</li>
                    <li>File name = Project name (e.g., "{projectName}.xlsx")</li>
                    <li>Columns: Common Fields + Contact Fields + Category Fields</li>
                    <li>Headers use Django model verbose names</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 rounded-b-lg">
            <div className="flex justify-between items-center">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                disabled={exportMutation.isPending}
              >
                Cancel
              </button>
              
              <button
                type="button"
                onClick={handleExport}
                disabled={exportMutation.isPending}
                className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {exportMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    <span>Exporting...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    <span>Export Sites</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkExportModal;