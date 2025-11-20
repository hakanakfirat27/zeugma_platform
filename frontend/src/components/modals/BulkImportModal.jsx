// frontend/src/components/modals/BulkImportModal.jsx

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../utils/api';
import { useToast } from '../../hooks/useToast';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, XCircle, Download } from 'lucide-react';
import { CATEGORIES } from '../../constants/categories';

const BulkImportModal = ({ isOpen, onClose, projectId, projectName }) => {
  const queryClient = useQueryClient();
  const { success, error: showError, info } = useToast();
  
  const [step, setStep] = useState(1); // 1: Select Category, 2: Upload, 3: Preview, 4: Complete
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  // Preview mutation
  const previewMutation = useMutation({
    mutationFn: async (file) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('project_id', projectId);
      formData.append('category', selectedCategory);
      
      const response = await api.post('/api/import-export/preview/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    },
    onSuccess: (data) => {
      setPreviewData(data);
      setStep(3);
    },
    onError: (err) => {
      console.error('Preview error:', err);
      showError(err.response?.data?.error || 'Failed to preview file. Please check the format and try again.');
    },
  });

  // Confirm mutation
  const confirmMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/api/import-export/confirm/', {
        project_id: projectId,
      });
      return response.data;
    },
    onSuccess: (data) => {
      setStep(4);
      success(`Successfully imported ${data.imported_count} sites!`);
      // Refresh project sites
      queryClient.invalidateQueries(['project-sites', projectId]);
      queryClient.invalidateQueries(['project-detail', projectId]);
    },
    onError: (err) => {
      console.error('Import error:', err);
      showError(err.response?.data?.error || 'Failed to import sites. Please try again.');
    },
  });

  // Download template
  const handleDownloadTemplate = async () => {
    if (!selectedCategory) {
      showError('Please select a category first');
      return;
    }
    
    try {
      const response = await api.get(`/api/import-export/template/?category=${selectedCategory}`, {
        responseType: 'blob',
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      const categoryLabel = CATEGORIES.find(c => c.value === selectedCategory)?.label || selectedCategory;
      link.setAttribute('download', `${categoryLabel}_import_template_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      info('Template downloaded successfully');
    } catch (error) {
      console.error('Error downloading template:', error);
      showError('Failed to download template');
    }
  };

  // Handle file selection
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      validateAndSetFile(file);
    }
  };

  // Handle drag and drop
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      validateAndSetFile(file);
    }
  };

  const validateAndSetFile = (file) => {
    const validTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
    ];
    
    if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
      showError('Please upload an Excel (.xlsx, .xls) or CSV (.csv) file');
      return;
    }
    
    setSelectedFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
    setStep(2);
  };

  const handlePreview = () => {
    if (selectedFile) {
      previewMutation.mutate(selectedFile);
    }
  };

  const handleConfirmImport = () => {
    confirmMutation.mutate();
  };

  const handleClose = () => {
    setStep(1);
    setSelectedCategory('');
    setSelectedFile(null);
    setPreviewData(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={handleClose} />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Upload className="w-6 h-6 text-white" />
                <div>
                  <h3 className="text-xl font-semibold text-white">Bulk Import Sites</h3>
                  <p className="text-sm text-blue-100">
                    Project: {projectName}
                    {selectedCategory && ` • ${CATEGORIES.find(c => c.value === selectedCategory)?.label}`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="border-b border-gray-200 bg-gray-50 px-6 py-3">
            <div className="flex items-center justify-between">
              <div className={`flex items-center gap-2 ${step >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'}`}>
                  1
                </div>
                <span className="font-medium">Select Category</span>
              </div>
              <div className="flex-1 h-0.5 bg-gray-300 mx-2"></div>
              <div className={`flex items-center gap-2 ${step >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'}`}>
                  2
                </div>
                <span className="font-medium">Upload File</span>
              </div>
              <div className="flex-1 h-0.5 bg-gray-300 mx-2"></div>
              <div className={`flex items-center gap-2 ${step >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'}`}>
                  3
                </div>
                <span className="font-medium">Preview</span>
              </div>
              <div className="flex-1 h-0.5 bg-gray-300 mx-2"></div>
              <div className={`flex items-center gap-2 ${step >= 4 ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 4 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'}`}>
                  4
                </div>
                <span className="font-medium">Complete</span>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-6 overflow-y-auto max-h-[60vh]">
            {/* STEP 1: Select Category */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="text-center mb-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">Select Category for Import</h4>
                  <p className="text-sm text-gray-600">
                    Choose the category of sites you want to import. Each category has specific fields.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {CATEGORIES.filter(cat => cat.value !== 'ALL').map(category => (
                    <button
                      key={category.value}
                      type="button"
                      onClick={() => handleCategorySelect(category.value)}
                      className="p-4 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
                    >
                      <div className="font-semibold text-gray-900">{category.label}</div>
                      <div className="text-xs text-gray-500 mt-1">Import {category.label.toLowerCase()}</div>
                    </button>
                  ))}
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-700">
                      <p className="font-medium mb-1">Important:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Each category has different required and optional fields</li>
                        <li>Download the template after selecting a category</li>
                        <li>Fill in the template with your data</li>
                        <li>Upload the completed template</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: Upload File */}
            {step === 2 && (
              <div className="space-y-6">
                {/* Download Template Button */}
                <div className="bg-gradient-to-r from-green-50 to-teal-50 border border-green-200 rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">Download Import Template</h4>
                      <p className="text-sm text-gray-600">
                        Get the template with all required fields for {CATEGORIES.find(c => c.value === selectedCategory)?.label}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleDownloadTemplate}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <Download className="w-5 h-5" />
                      <span>Download Template</span>
                    </button>
                  </div>
                </div>

                {/* Upload Area */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Upload Completed Template
                  </label>
                  
                  <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                      isDragging
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <FileSpreadsheet className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    
                    {selectedFile ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-center gap-2 text-green-600">
                          <CheckCircle className="w-5 h-5" />
                          <span className="font-medium">{selectedFile.name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedFile(null)}
                          className="text-sm text-gray-600 hover:text-gray-800 underline"
                        >
                          Choose different file
                        </button>
                      </div>
                    ) : (
                      <>
                        <p className="text-gray-600 mb-2">
                          Drag and drop your file here, or
                        </p>
                        <label className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                          <span className="text-sm font-medium text-gray-700">Browse files</span>
                          <input
                            type="file"
                            className="hidden"
                            accept=".xlsx,.xls,.csv"
                            onChange={handleFileSelect}
                          />
                        </label>
                        <p className="text-xs text-gray-500 mt-2">
                          Supported formats: .xlsx, .xls, .csv
                        </p>
                      </>
                    )}
                  </div>
                </div>

                {/* Instructions */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Import Instructions</h4>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                    <li>Download the template file above</li>
                    <li>Fill in your data (do not modify headers)</li>
                    <li>Save the file</li>
                    <li>Upload the completed file</li>
                    <li>Preview and validate your data</li>
                    <li>Confirm to import</li>
                  </ol>
                </div>
              </div>
            )}

            {/* STEP 3: Preview & Validate */}
            {step === 3 && previewData && (
              <div className="space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="text-2xl font-bold text-gray-900">{previewData.total_rows}</div>
                    <div className="text-sm text-gray-600">Total Rows</div>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="text-2xl font-bold text-green-900">{previewData.valid_rows}</div>
                    <div className="text-sm text-green-700">Valid Rows</div>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="text-2xl font-bold text-red-900">{previewData.invalid_rows}</div>
                    <div className="text-sm text-red-700">Invalid Rows</div>
                  </div>
                </div>

                {/* Errors */}
                {previewData.errors && previewData.errors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertCircle className="w-5 h-5 text-red-600" />
                      <h4 className="font-semibold text-red-900">
                        Validation Errors ({previewData.errors.length})
                      </h4>
                    </div>
                    <div className="max-h-60 overflow-y-auto space-y-2">
                      {previewData.errors.map((error, idx) => (
                        <div key={idx} className="bg-white border border-red-200 rounded p-3 text-sm">
                          <div className="flex items-start gap-2">
                            <span className="font-semibold text-red-700">Row {error.row}:</span>
                            <div className="flex-1">
                              <span className="text-red-900">{error.field}</span>
                              <span className="text-gray-600"> - {error.error}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {previewData.has_more_errors && (
                      <p className="text-sm text-red-700 mt-2">+ More errors not shown...</p>
                    )}
                  </div>
                )}

                {/* Warnings */}
                {previewData.warnings && previewData.warnings.length > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertCircle className="w-5 h-5 text-yellow-600" />
                      <h4 className="font-semibold text-yellow-900">
                        Warnings ({previewData.warnings.length})
                      </h4>
                    </div>
                    <div className="max-h-40 overflow-y-auto space-y-2">
                      {previewData.warnings.map((warning, idx) => (
                        <div key={idx} className="bg-white border border-yellow-200 rounded p-3 text-sm">
                          <div className="flex items-start gap-2">
                            <span className="font-semibold text-yellow-700">Row {warning.row}:</span>
                            <span className="text-yellow-900">{warning.message}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Preview Data */}
                {previewData.preview_data && previewData.preview_data.length > 0 && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-3">
                      Data Preview (First 10 Rows)
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium text-gray-700">Company Name</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-700">Country</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-700">Address</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {previewData.preview_data.map((row, idx) => (
                            <tr key={idx}>
                              <td className="px-3 py-2 text-gray-900">{row.company_name}</td>
                              <td className="px-3 py-2 text-gray-600">{row.country}</td>
                              <td className="px-3 py-2 text-gray-600">{row.address_1 || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* STEP 4: Complete */}
            {step === 4 && (
              <div className="text-center py-8">
                <div className="mb-4">
                  <CheckCircle className="w-16 h-16 text-green-600 mx-auto" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Import Complete!</h3>
                <p className="text-gray-600 mb-6">
                  Successfully imported {previewData?.valid_rows || 0} sites to your project.
                </p>
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Close
                </button>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          {step !== 4 && (
            <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
              <div className="flex justify-between items-center">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                
                <div className="flex gap-3">
                  {step === 2 && (
                    <>
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        Back
                      </button>
                      <button
                        type="button"
                        onClick={handlePreview}
                        disabled={!selectedFile || previewMutation.isPending}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {previewMutation.isPending ? 'Validating...' : 'Next: Preview'}
                      </button>
                    </>
                  )}
                  
                  {step === 3 && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setStep(2);
                          setPreviewData(null);
                        }}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        Back
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmImport}
                        disabled={previewData.invalid_rows > 0 || confirmMutation.isPending}
                        className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {confirmMutation.isPending ? 'Importing...' : `Import ${previewData.valid_rows} Sites`}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BulkImportModal;