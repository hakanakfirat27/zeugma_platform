/**
 * Service for managing export templates
 */

import api from '../utils/api';

/**
 * Get available columns for a report based on current filters
 * @param {string} reportId - UUID of the report
 * @param {object} currentFilters - Current filter state
 * @returns {Promise} - Promise with column data
 */

export const getExportTemplates = async (reportId) => {
  try {
    const response = await api.get('/api/client/export-templates/', {
      params: { report_id: reportId }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching export templates:', error);
    throw error;
  }
};

/**
 * Create new export template
 */
export const createExportTemplate = async (data) => {
  try {
    const response = await api.post('/api/client/export-templates/', data);
    return response.data;
  } catch (error) {
    console.error('Error creating export template:', error);
    throw error;
  }
};

/**
 * Update export template
 */
export const updateExportTemplate = async (templateId, data) => {
  try {
    const response = await api.patch(`/api/client/export-templates/${templateId}/`, data);
    return response.data;
  } catch (error) {
    console.error('Error updating export template:', error);
    throw error;
  }
};

/**
 * Delete export template
 */
export const deleteExportTemplate = async (templateId) => {
  try {
    const response = await api.delete(`/api/client/export-templates/${templateId}/`);
    return response.data;
  } catch (error) {
    console.error('Error deleting export template:', error);
    throw error;
  }
};

/**
 * Export to Excel with template
 */
export const exportToExcel = async (reportId, templateId = null, filters = {}) => {
  try {
    const params = {
      report_id: reportId,
      ...filters
    };

    if (templateId) {
      params.template_id = templateId;
    }

    const response = await api.get('/api/client/export-excel/', {
      params,
      responseType: 'blob'
    });

    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;

    // Get filename from Content-Disposition header
    const contentDisposition = response.headers['content-disposition'];
    let filename = 'export.xlsx';
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
      if (filenameMatch) {
        filename = filenameMatch[1];
      }
    }

    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);

    return { success: true, filename };
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    throw error;
  }
};

/**
 * Get available columns for a report
 */
export const getReportColumns = async (reportId, currentFilters = {}) => {
  try {
    const params = { report_id: reportId };

    // Add category filters if present
    if (currentFilters.categories && currentFilters.categories.length > 0) {
      params.categories = currentFilters.categories.join(',');
    }

    const response = await api.get('/api/client/report-columns/', {
      params
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching report columns:', error);
    throw error;
  }
};