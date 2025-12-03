// frontend/src/components/database/ImportCompaniesModal.jsx
/**
 * Import Companies Modal
 * 
 * Multi-step modal for importing companies from Excel:
 * 1. File Upload
 * 2. Import execution with progress
 * 3. Results summary
 */

import React, { useState, useCallback } from 'react';
import { 
  X, Upload, FileSpreadsheet, CheckCircle, AlertCircle, 
  Loader2, Download, AlertTriangle, ChevronRight, 
  FileText, Building2, FolderOpen, Info
} from 'lucide-react';
import companyService from '../../services/companyService';

const CATEGORY_DISPLAY = {
  INJECTION: 'Injection Moulders',
  BLOW: 'Blow Moulders',
  ROTO: 'Roto Moulders',
  PE_FILM: 'PE Film Extruders',
  SHEET: 'Sheet Extruders',
  PIPE: 'Pipe Extruders',
  TUBE_HOSE: 'Tube & Hose Extruders',
  PROFILE: 'Profile Extruders',
  CABLE: 'Cable Extruders',
  COMPOUNDER: 'Compounders',
};

const CATEGORY_COLORS = {
  INJECTION: 'bg-blue-100 text-blue-800 border-blue-300',
  BLOW: 'bg-green-100 text-green-800 border-green-300',
  ROTO: 'bg-orange-100 text-orange-800 border-orange-300',
  PE_FILM: 'bg-purple-100 text-purple-800 border-purple-300',
  SHEET: 'bg-cyan-100 text-cyan-800 border-cyan-300',
  PIPE: 'bg-red-100 text-red-800 border-red-300',
  TUBE_HOSE: 'bg-amber-100 text-amber-800 border-amber-300',
  PROFILE: 'bg-gray-100 text-gray-800 border-gray-300',
  CABLE: 'bg-pink-100 text-pink-800 border-pink-300',
  COMPOUNDER: 'bg-indigo-100 text-indigo-800 border-indigo-300',
};

const ImportCompaniesModal = ({ isOpen, onClose, onImportComplete }) => {
  // State
  const [step, setStep] = useState(1); // 1: Upload, 2: Importing, 3: Results
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [importStage, setImportStage] = useState('uploading'); // 'uploading', 'processing'
  const [importResult, setImportResult] = useState(null);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  // Reset state when modal closes
  const handleClose = () => {
    setStep(1);
    setFile(null);
    setImporting(false);
    setUploadProgress(0);
    setImportStage('uploading');
    setImportResult(null);
    setError(null);
    onClose();
  };

  // Handle file selection
  const handleFileSelect = (selectedFile) => {
    if (!selectedFile) return;
    
    // Validate file type
    const fileName = selectedFile.name.toLowerCase();
    if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
      setError('Please select an Excel file (.xlsx or .xls)');
      return;
    }
    
    setFile(selectedFile);
    setError(null);
  };

  // Handle drag and drop
  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }, []);

  // Handle import execution
  const handleImport = async () => {
    if (!file) return;
    
    setStep(2);
    setImporting(true);
    setError(null);
    setUploadProgress(0);
    setImportStage('uploading');
    
    try {
      const result = await companyService.importFromExcel(file, (progress) => {
        setUploadProgress(progress);
        // When upload is complete, switch to processing stage
        if (progress >= 100) {
          setImportStage('processing');
        }
      });
      
      console.log('Import result:', result);
      setImportResult(result);
      setStep(3);
      
      // Notify parent of successful import
      if (onImportComplete) {
        onImportComplete(result);
      }
    } catch (err) {
      console.error('Import error:', err);
      
      // Handle different error types
      let errorMessage = 'Import failed';
      let isTimeout = false;
      
      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        isTimeout = true;
        errorMessage = 'Request timed out. The import may still be processing on the server. Please check the Company Database to see if companies were imported.';
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      
      // For timeout errors, show a special state that allows checking the database
      if (isTimeout) {
        // Notify parent to refresh data in case import completed
        if (onImportComplete) {
          onImportComplete({ success: true, timeout: true });
        }
      }
      
      setStep(1); // Go back to upload
    } finally {
      setImporting(false);
    }
  };

  // Download duplicates report
  const handleDownloadReport = () => {
    if (importResult?.duplicates_report?.download_url) {
      // Use the full URL with API base
      const baseUrl = window.location.origin;
      window.open(`${baseUrl}${importResult.duplicates_report.download_url}`, '_blank');
    }
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-indigo-600 to-purple-600">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
              <Upload className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Import Companies</h2>
              <p className="text-sm text-indigo-100">
                {step === 1 && 'Upload Excel file'}
                {step === 2 && 'Importing...'}
                {step === 3 && 'Import complete'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={importing}
            className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-3 bg-gray-50 border-b">
          <div className="flex items-center justify-center gap-4">
            {[
              { num: 1, label: 'Upload File' },
              { num: 2, label: 'Import' },
              { num: 3, label: 'Results' },
            ].map((s, idx) => (
              <React.Fragment key={s.num}>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      step >= s.num
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {step > s.num ? <CheckCircle className="w-5 h-5" /> : s.num}
                  </div>
                  <span className={`text-sm ${step >= s.num ? 'text-indigo-600 font-medium' : 'text-gray-500'}`}>
                    {s.label}
                  </span>
                </div>
                {idx < 2 && (
                  <ChevronRight className={`w-5 h-5 ${step > s.num ? 'text-indigo-600' : 'text-gray-300'}`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {/* Step 1: File Upload */}
          {step === 1 && (
            <div className="space-y-6">
              {/* Drop Zone */}
              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                  dragActive
                    ? 'border-indigo-500 bg-indigo-50'
                    : file
                    ? 'border-green-400 bg-green-50'
                    : 'border-gray-300 hover:border-indigo-400'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                {file ? (
                  <div className="flex flex-col items-center gap-3">
                    <FileSpreadsheet className="w-16 h-16 text-green-600" />
                    <div>
                      <p className="text-lg font-medium text-gray-900">{file.name}</p>
                      <p className="text-sm text-gray-500">{formatFileSize(file.size)}</p>
                    </div>
                    <button
                      onClick={() => setFile(null)}
                      className="text-sm text-indigo-600 hover:text-indigo-700"
                    >
                      Choose different file
                    </button>
                  </div>
                ) : (
                  <>
                    <FileSpreadsheet className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-lg font-medium text-gray-700 mb-2">
                      Drag and drop your Excel file here
                    </p>
                    <p className="text-sm text-gray-500 mb-4">or</p>
                    <label className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 cursor-pointer transition-colors">
                      <Upload className="w-4 h-4" />
                      Browse Files
                      <input
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={(e) => handleFileSelect(e.target.files[0])}
                        className="hidden"
                      />
                    </label>
                    <p className="text-xs text-gray-400 mt-4">
                      Supported formats: .xlsx, .xls
                    </p>
                  </>
                )}
              </div>

              {/* Error Display */}
              {error && (
                <div className={`border rounded-lg p-4 flex items-start gap-3 ${
                  error.includes('timed out') 
                    ? 'bg-amber-50 border-amber-200' 
                    : 'bg-red-50 border-red-200'
                }`}>
                  <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                    error.includes('timed out') ? 'text-amber-500' : 'text-red-500'
                  }`} />
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${
                      error.includes('timed out') ? 'text-amber-800' : 'text-red-800'
                    }`}>
                      {error.includes('timed out') ? 'Import Still Running' : 'Error'}
                    </p>
                    <p className={`text-sm ${
                      error.includes('timed out') ? 'text-amber-600' : 'text-red-600'
                    }`}>{error}</p>
                    {error.includes('timed out') && (
                      <button
                        onClick={() => {
                          handleClose();
                          window.location.reload();
                        }}
                        className="mt-2 px-3 py-1.5 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700 transition-colors"
                      >
                        Refresh Page to Check Results
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* File Format Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Expected File Format
                </h4>
                <div className="text-sm text-blue-700 space-y-2">
                  <p>Each sheet should correspond to a category:</p>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {Object.entries(CATEGORY_DISPLAY).map(([code, name]) => (
                      <div key={code} className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${CATEGORY_COLORS[code]?.split(' ')[0] || 'bg-gray-400'}`}></span>
                        <span className="text-xs">{name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Import Rules Info */}
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                <h4 className="font-medium text-indigo-800 mb-2 flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  Import Rules
                </h4>
                <ul className="text-sm text-indigo-700 space-y-1">
                  <li>• Companies are matched by all 29 common/contact fields</li>
                  <li>• If exact match found: adds new category only (no duplicate)</li>
                  <li>• If company already has the category: skips entirely</li>
                  <li>• If no match found: creates new company</li>
                  <li>• Same name but different fields: marked as potential duplicate</li>
                </ul>
              </div>
            </div>
          )}

          {/* Step 2: Importing */}
          {step === 2 && (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="w-16 h-16 text-indigo-600 animate-spin mb-6" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {importStage === 'uploading' ? 'Uploading File' : 'Processing Companies'}
              </h3>
              <p className="text-gray-500 mb-6">
                {importStage === 'uploading' 
                  ? 'Uploading your Excel file to the server...' 
                  : 'Importing companies and checking for duplicates...'}
              </p>
              
              {/* Progress Section */}
              <div className="w-full max-w-md space-y-4">
                {/* Upload Progress */}
                <div>
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span className="flex items-center gap-2">
                      {uploadProgress >= 100 ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      )}
                      Upload
                    </span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        uploadProgress >= 100 ? 'bg-green-500' : 'bg-indigo-600'
                      }`}
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>

                {/* Processing Progress (indeterminate when processing) */}
                <div>
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span className="flex items-center gap-2">
                      {importStage === 'processing' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                      )}
                      Processing
                    </span>
                    <span>{importStage === 'processing' ? 'In progress...' : 'Waiting'}</span>
                  </div>
                  <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                    {importStage === 'processing' ? (
                      <div className="h-full bg-indigo-600 rounded-full animate-pulse" style={{ width: '100%' }} />
                    ) : (
                      <div className="h-full bg-gray-300 rounded-full" style={{ width: '0%' }} />
                    )}
                  </div>
                </div>
              </div>
              
              {/* Time estimate based on file size */}
              {file && (
                <div className="mt-6 text-center">
                  <p className="text-sm text-gray-500">
                    {file.size > 10 * 1024 * 1024 
                      ? 'Large file detected. This may take 10-20 minutes.'
                      : file.size > 5 * 1024 * 1024
                      ? 'This may take 5-10 minutes.'
                      : 'This may take a few minutes.'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    You can close this modal - import continues in background.
                    Check the Company Database to see progress.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Results */}
          {step === 3 && importResult && (
            <div className="space-y-6">
              {/* Success Banner */}
              <div className={`rounded-lg p-6 text-center ${
                importResult.success 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-red-50 border border-red-200'
              }`}>
                {importResult.success ? (
                  <>
                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-green-800 mb-2">Import Successful!</h3>
                    <p className="text-green-600">{importResult.message}</p>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-red-800 mb-2">Import Failed</h3>
                    <p className="text-red-600">{importResult.error}</p>
                  </>
                )}
              </div>

              {/* Summary Stats */}
              {importResult.statistics && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-blue-600">
                      {importResult.statistics.total_rows_processed?.toLocaleString() || 0}
                    </p>
                    <p className="text-sm text-blue-700">Rows Processed</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-green-600">
                      {importResult.statistics.companies_created?.toLocaleString() || 0}
                    </p>
                    <p className="text-sm text-green-700">Companies Created</p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-purple-600">
                      {importResult.statistics.production_sites_created?.toLocaleString() || 0}
                    </p>
                    <p className="text-sm text-purple-700">Sites Created</p>
                  </div>
                  <div className="bg-indigo-50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-indigo-600">
                      {importResult.statistics.exact_matches_merged?.toLocaleString() || 0}
                    </p>
                    <p className="text-sm text-indigo-700">Exact Matches</p>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-amber-600">
                      {importResult.potential_duplicates_count || 0}
                    </p>
                    <p className="text-sm text-amber-700">Potential Duplicates</p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold text-red-600">
                      {importResult.errors_count || 0}
                    </p>
                    <p className="text-sm text-red-700">Errors</p>
                  </div>
                </div>
              )}

              {/* Sheets Processed */}
              {importResult.sheets_processed?.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                    <FolderOpen className="w-4 h-4" />
                    Sheets Processed
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {importResult.sheets_processed.map((sheet, idx) => (
                      <span
                        key={idx}
                        className={`px-3 py-1 text-sm rounded-full border ${
                          CATEGORY_COLORS[sheet.category] || 'bg-gray-100 text-gray-700 border-gray-300'
                        }`}
                      >
                        {sheet.name} → {CATEGORY_DISPLAY[sheet.category] || sheet.category}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Potential Duplicates Warning */}
              {importResult.potential_duplicates_count > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-yellow-800">
                          {importResult.potential_duplicates_count} Potential Duplicates Found
                        </p>
                        <p className="text-sm text-yellow-600 mb-2">
                          Companies with same name/address but different field values. 
                          Download the report to review and merge manually.
                        </p>
                        
                        {/* Sample duplicates */}
                        {importResult.potential_duplicates_sample?.length > 0 && (
                          <div className="mt-3 space-y-2">
                            <p className="text-xs font-medium text-yellow-700">Sample duplicates:</p>
                            {importResult.potential_duplicates_sample.slice(0, 3).map((dup, idx) => (
                              <div key={idx} className="text-xs bg-yellow-100 rounded p-2">
                                <p className="font-medium">{dup.new_company} ({dup.new_category})</p>
                                <p className="text-yellow-700">
                                  vs. {dup.existing_key} ({dup.existing_categories?.join(', ')})
                                </p>
                                <p className="text-yellow-600">
                                  Different: {dup.different_fields?.slice(0, 3).join(', ')}
                                  {dup.different_fields?.length > 3 && ` +${dup.different_fields.length - 3} more`}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    {importResult.duplicates_report && (
                      <button
                        onClick={handleDownloadReport}
                        className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm"
                      >
                        <Download className="w-4 h-4" />
                        Download Report
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Errors */}
              {importResult.errors?.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-medium text-red-800 mb-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {importResult.errors_count} Error(s)
                  </h4>
                  <div className="max-h-40 overflow-auto">
                    <ul className="text-sm text-red-600 space-y-1">
                      {importResult.errors.slice(0, 20).map((err, idx) => (
                        <li key={idx}>
                          • [{err.sheet || 'Unknown'}] {err.row ? `Row ${err.row}: ` : ''}{err.error}
                        </li>
                      ))}
                      {importResult.errors.length > 20 && (
                        <li className="text-red-700 font-medium">
                          ... and {importResult.errors.length - 20} more errors
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
          <div>
            {step === 1 && file && (
              <p className="text-sm text-gray-500">
                Ready to import: {file.name}
              </p>
            )}
            {step === 2 && (
              <p className="text-sm text-gray-500">
                {importStage === 'uploading' ? 'Uploading file...' : 'Processing import...'}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {step === 1 && (
              <>
                <button
                  onClick={handleClose}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  disabled={!file}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Upload className="w-4 h-4" />
                  Start Import
                </button>
              </>
            )}
            
            {step === 3 && (
              <button
                onClick={handleClose}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Done
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportCompaniesModal;
