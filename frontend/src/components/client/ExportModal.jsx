import React, { useState, useEffect } from 'react';
import {
  Download,
  Save,
  Star,
  X,
  Check,
  Trash2,
  AlertCircle,
  FileSpreadsheet,
  Settings,
  Loader
} from 'lucide-react';
import {
  getExportTemplates,
  createExportTemplate,
  updateExportTemplate,
  deleteExportTemplate,
  exportToExcel,
  getReportColumns
} from '../../services/exportTemplateService';

const ExportModal = ({ isOpen, onClose, reportId, currentFilters }) => {
  const [activeTab, setActiveTab] = useState('quick');
  const [templates, setTemplates] = useState([]);
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [availableColumns, setAvailableColumns] = useState([]);
  const [defaultColumns, setDefaultColumns] = useState([]);
  const [reportCategories, setReportCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [columnsLoading, setColumnsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [templateForm, setTemplateForm] = useState({
    name: '',
    description: '',
    is_default: false
  });

  const [categoryFilter, setCategoryFilter] = useState('all');

  // IMPORTANT: Reload columns when currentFilters change
  useEffect(() => {
    if (isOpen && reportId) {
      loadReportColumns();
      loadTemplates();
      loadDefaultTemplate();
    }
  }, [isOpen, reportId, currentFilters.categories]); // Added currentFilters.categories as dependency

  /**
   * Load available columns from backend based on current filters
   */
  const loadReportColumns = async () => {
    try {
      setColumnsLoading(true);

      // Pass current filters to get columns for filtered categories only
      const data = await getReportColumns(reportId, currentFilters);

      setAvailableColumns(data.available_columns || []);
      setDefaultColumns(data.default_columns || []);
      setReportCategories(data.report_categories || []);

      // Set initial selection to default columns
      if (selectedColumns.length === 0) {
        setSelectedColumns(data.default_columns || []);
      }

      console.log(`Loaded ${data.total_fields} columns for categories:`, data.report_categories);
    } catch (err) {
      console.error('Error loading columns:', err);
      setError('Failed to load available columns');
    } finally {
      setColumnsLoading(false);
    }
  };

  // ... rest of the component remains the same ...

  /**
   * Load all templates
   */
  const loadTemplates = async () => {
    try {
      const data = await getExportTemplates(reportId);
      setTemplates(data.results || []);
    } catch (err) {
      console.error('Error loading templates:', err);
    }
  };

  /**
   * Load default template columns if exists
   */
  const loadDefaultTemplate = async () => {
    try {
      const data = await getExportTemplates(reportId);
      const defaultTemplate = (data.results || []).find(t => t.is_default);
      if (defaultTemplate) {
        setSelectedColumns(defaultTemplate.selected_columns);
      }
    } catch (err) {
      console.error('Error loading default template:', err);
    }
  };

  /**
   * Handle column selection toggle
   */
  const handleColumnToggle = (columnKey) => {
    setSelectedColumns(prev => {
      if (prev.includes(columnKey)) {
        if (prev.length === 1) {
          setError('Please select at least one column');
          setTimeout(() => setError(''), 3000);
          return prev;
        }
        return prev.filter(key => key !== columnKey);
      } else {
        return [...prev, columnKey];
      }
    });
  };

  /**
   * Select all columns in a category
   */
  const handleSelectCategory = (category) => {
    const categoryColumns = availableColumns
      .filter(col => col.category === category)
      .map(col => col.key);

    setSelectedColumns(prev => {
      const newColumns = new Set([...prev, ...categoryColumns]);
      return Array.from(newColumns);
    });
  };

  /**
   * Deselect all columns in a category
   */
  const handleDeselectCategory = (category) => {
    const categoryColumns = availableColumns
      .filter(col => col.category === category)
      .map(col => col.key);

    setSelectedColumns(prev =>
      prev.filter(key => !categoryColumns.includes(key))
    );
  };

  /**
   * Handle quick export
   */
  const handleQuickExport = async () => {
    if (selectedColumns.length === 0) {
      setError('Please select at least one column');
      return;
    }

    try {
      setLoading(true);
      setError('');

      await exportToExcel(reportId, null, {
        ...currentFilters,
        columns: selectedColumns.join(',')
      });

      setSuccess('Export successful!');
      setTimeout(() => {
        setSuccess('');
        onClose();
      }, 2000);
    } catch (err) {
      console.error('Export error:', err);
      setError(err.response?.data?.error || 'Export failed');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle export with template
   */
  const handleExportWithTemplate = async (templateId) => {
    try {
      setLoading(true);
      setError('');

      await exportToExcel(reportId, templateId, currentFilters);

      setSuccess('Export successful!');
      setTimeout(() => {
        setSuccess('');
        onClose();
      }, 2000);
    } catch (err) {
      console.error('Export error:', err);
      setError(err.response?.data?.error || 'Export failed');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle save template
   */
  const handleSaveTemplate = async (e) => {
    e.preventDefault();

    if (!templateForm.name.trim()) {
      setError('Please enter a template name');
      return;
    }

    if (selectedColumns.length === 0) {
      setError('Please select at least one column');
      return;
    }

    try {
      setLoading(true);
      setError('');

      await createExportTemplate({
        name: templateForm.name.trim(),
        description: templateForm.description.trim(),
        report_id: reportId,
        selected_columns: selectedColumns,
        is_default: templateForm.is_default
      });

      setSuccess('Template saved successfully!');
      setTemplateForm({ name: '', description: '', is_default: false });
      setShowSaveTemplate(false);
      await loadTemplates();

      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Save template error:', err);
      setError(err.response?.data?.error || 'Failed to save template');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle load template
   */
  const handleLoadTemplate = (template) => {
    setSelectedColumns(template.selected_columns);
    setSuccess(`Loaded template: ${template.name}`);
    setTimeout(() => setSuccess(''), 3000);
  };

  /**
   * Handle delete template
   */
  const handleDeleteTemplate = async (templateId, templateName) => {
    if (!window.confirm(`Delete template "${templateName}"?`)) {
      return;
    }

    try {
      setLoading(true);
      await deleteExportTemplate(templateId);
      setSuccess('Template deleted');
      await loadTemplates();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Delete error:', err);
      setError('Failed to delete template');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle toggle default
   */
  const handleToggleDefault = async (templateId, currentDefault, templateName) => {
    try {
      setLoading(true);
      await updateExportTemplate(templateId, {
        is_default: !currentDefault
      });

      const message = !currentDefault
        ? `"${templateName}" set as default`
        : `"${templateName}" removed as default`;

      setSuccess(message);
      await loadTemplates();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Update error:', err);
      setError('Failed to update template');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get filtered columns
   */
  const getFilteredColumns = () => {
    if (categoryFilter === 'all') {
      return availableColumns;
    }
    return availableColumns.filter(col => col.category === categoryFilter);
  };

  /**
   * Get unique categories from available columns
   */
  const categories = ['all', ...new Set(availableColumns.map(col => col.category))];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-blue-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="w-8 h-8" />
              <div>
                <h2 className="text-2xl font-bold">Export to Excel</h2>
                <p className="text-green-100 text-sm">
                  {reportCategories.length > 0 ? (
                    <>
                      Showing columns for: <span className="font-semibold">{reportCategories.join(', ')}</span>
                      <span className="ml-2 opacity-75">({availableColumns.length} columns available)</span>
                    </>
                  ) : (
                    'Choose columns and export your data'
                  )}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Messages */}
        {success && (
          <div className="mx-6 mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
            <Check className="w-5 h-5 text-green-600" />
            <span className="text-green-800 text-sm">{success}</span>
          </div>
        )}

        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="text-red-800 text-sm">{error}</span>
            <button onClick={() => setError('')} className="ml-auto text-red-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200 px-6">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('quick')}
              className={`px-4 py-3 font-medium border-b-2 transition-colors ${
                activeTab === 'quick'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Quick Export
            </button>
            <button
              onClick={() => setActiveTab('templates')}
              className={`px-4 py-3 font-medium border-b-2 transition-colors ${
                activeTab === 'templates'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              My Templates ({templates.length})
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {columnsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="w-8 h-8 animate-spin text-blue-600" />
              <span className="ml-3 text-gray-600">Loading columns...</span>
            </div>
          ) : activeTab === 'quick' ? (
            <>
              {/* Column Selection */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Select Columns ({selectedColumns.length} selected)
                  </h3>

                  <button
                    onClick={() => setShowSaveTemplate(!showSaveTemplate)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Save as Template
                  </button>
                </div>

                {/* Save Template Form */}
                {showSaveTemplate && (
                  <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <form onSubmit={handleSaveTemplate} className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Template Name *
                        </label>
                        <input
                          type="text"
                          value={templateForm.name}
                          onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="e.g., Full Contact Export"
                          required
                          autoFocus
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Description (Optional)
                        </label>
                        <input
                          type="text"
                          value={templateForm.description}
                          onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Brief description"
                        />
                      </div>

                      <div>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={templateForm.is_default}
                            onChange={(e) => setTemplateForm({ ...templateForm, is_default: e.target.checked })}
                            className="w-4 h-4 text-blue-600 rounded"
                          />
                          <span className="text-sm text-gray-700">Set as default template</span>
                        </label>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="submit"
                          disabled={loading}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                          Save Template
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowSaveTemplate(false)}
                          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Category Filter */}
                <div className="mb-4 flex gap-2 flex-wrap">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setCategoryFilter(cat)}
                      className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                        categoryFilter === cat
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {cat === 'all' ? 'All Columns' : cat}
                    </button>
                  ))}
                </div>

                {/* Columns Grid */}
                {availableColumns.length === 0 ? (
                  <div className="text-center py-8">
                    <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-600 font-medium">No columns available</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Try selecting different category filters
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {getFilteredColumns().map(column => (
                      <label
                        key={column.key}
                        className={`flex items-center gap-2 p-3 border-2 rounded-lg cursor-pointer transition-all ${
                          selectedColumns.includes(column.key)
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedColumns.includes(column.key)}
                          onChange={() => handleColumnToggle(column.key)}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <span className="text-sm font-medium text-gray-900">
                          {column.label}
                        </span>
                      </label>
                    ))}
                  </div>
                )}

                {/* Quick Actions */}
                {categoryFilter !== 'all' && availableColumns.length > 0 && (
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => handleSelectCategory(categoryFilter)}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Select All {categoryFilter}
                    </button>
                    <span className="text-gray-400">|</span>
                    <button
                      onClick={() => handleDeselectCategory(categoryFilter)}
                      className="text-sm text-gray-600 hover:text-gray-700 font-medium"
                    >
                      Deselect All {categoryFilter}
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Templates List - Same as before */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Saved Export Templates
                </h3>

                {templates.length === 0 ? (
                  <div className="text-center py-12">
                    <Settings className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600 mb-2">No export templates yet</p>
                    <p className="text-sm text-gray-500">
                      Switch to Quick Export tab to create your first template
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {templates.map(template => (
                      <div
                        key={template.id}
                        className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold text-gray-900">
                                {template.name}
                              </h4>
                              {template.is_default && (
                                <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded-full flex items-center gap-1">
                                  <Star className="w-3 h-3 fill-current" />
                                  Default
                                </span>
                              )}
                            </div>

                            {template.description && (
                              <p className="text-sm text-gray-600 mb-2">
                                {template.description}
                              </p>
                            )}

                            <p className="text-xs text-gray-500">
                              {template.selected_columns.length} columns selected
                            </p>
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2 ml-4">
                            <button
                              onClick={() => handleExportWithTemplate(template.id)}
                              disabled={loading}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Export with this template"
                            >
                              <Download className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handleLoadTemplate(template)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Load this template"
                            >
                              <Check className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handleToggleDefault(template.id, template.is_default, template.name)}
                              disabled={loading}
                              className={`p-2 rounded-lg transition-colors ${
                                template.is_default
                                  ? 'text-yellow-600 hover:bg-yellow-50'
                                  : 'text-gray-400 hover:bg-gray-50'
                              }`}
                              title={template.is_default ? 'Remove as default' : 'Set as default'}
                            >
                              <Star className={`w-4 h-4 ${template.is_default ? 'fill-current' : ''}`} />
                            </button>

                            <button
                              onClick={() => handleDeleteTemplate(template.id, template.name)}
                              disabled={loading}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete template"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {activeTab === 'quick' && !columnsLoading && (
          <div className="border-t border-gray-200 p-6 bg-gray-50">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                {selectedColumns.length} column{selectedColumns.length !== 1 ? 's' : ''} selected
              </p>

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>

                <button
                  onClick={handleQuickExport}
                  disabled={loading || selectedColumns.length === 0}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                >
                  <Download className="w-5 h-5" />
                  {loading ? 'Exporting...' : 'Export to Excel'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExportModal;