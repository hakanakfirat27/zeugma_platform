// frontend/src/services/companyService.js
// API service for Company-centric database operations

import api from '../utils/api';

const BASE_URL = '/api/companies';

export const companyService = {
  // ==================== COMPANY CRUD ====================
  
  /**
   * Get list of companies with filters
   * @param {Object} params - Query parameters
   * @param {string} params.status - Filter by status (COMPLETE, INCOMPLETE, DELETED)
   * @param {string} params.country - Filter by country
   * @param {string} params.category - Filter by category
   * @param {string} params.search - Search term
   * @param {number} params.page - Page number
   * @param {number} params.page_size - Items per page
   */
  async getCompanies(params = {}) {
    const response = await api.get(BASE_URL + '/', { params });
    return response.data;
  },
  
  /**
   * Get single company with full details
   * @param {string|number} companyId - Company ID (integer pk or UUID)
   */
  async getCompany(companyId) {
    const response = await api.get(`${BASE_URL}/${companyId}/`);
    return response.data;
  },
  
  /**
   * Create new company
   * @param {Object} data - Company data
   */
  async createCompany(data) {
    const response = await api.post(BASE_URL + '/', data);
    return response.data;
  },
  
  /**
   * Update company
   * @param {string|number} companyId - Company ID
   * @param {Object} data - Updated data
   */
  async updateCompany(companyId, data) {
    // Use PATCH for partial updates to avoid validation errors
    const response = await api.patch(`${BASE_URL}/${companyId}/`, data);
    return response.data;
  },
  
  /**
   * Delete company (soft delete)
   * @param {string|number} companyId - Company ID
   */
  async deleteCompany(companyId) {
    const response = await api.delete(`${BASE_URL}/${companyId}/`);
    return response.data;
  },
  
  // ==================== PRODUCTION SITES ====================
  
  /**
   * Get production sites for a company
   * @param {string|number} companyId - Company ID
   */
  async getProductionSites(companyId) {
    const response = await api.get(`${BASE_URL}/${companyId}/sites/`);
    return response.data;
  },
  
  /**
   * Add production site to company
   * @param {string|number} companyId - Company ID
   * @param {Object} data - Production site data (category, version_data)
   */
  async addProductionSite(companyId, data) {
    // Note: endpoint is /sites/add/ not /sites/
    const response = await api.post(`${BASE_URL}/${companyId}/sites/add/`, data);
    return response.data;
  },
  
  /**
   * Get production site details
   * @param {string|number} companyId - Company ID
   * @param {string|number} siteId - Site ID
   */
  async getProductionSite(companyId, siteId) {
    const response = await api.get(`${BASE_URL}/${companyId}/sites/${siteId}/`);
    return response.data;
  },
  
  /**
   * Deactivate production site
   * @param {string|number} companyId - Company ID
   * @param {string|number} siteId - Site ID
   */
  async deactivateProductionSite(companyId, siteId) {
    const response = await api.delete(`${BASE_URL}/${companyId}/sites/${siteId}/`);
    return response.data;
  },
  
  // ==================== VERSIONS ====================
  
  /**
   * Get all versions for a production site
   * @param {string|number} companyId - Company ID
   * @param {string|number} siteId - Site ID
   */
  async getVersions(companyId, siteId) {
    const response = await api.get(`${BASE_URL}/${companyId}/sites/${siteId}/versions/`);
    return response.data;
  },
  
  /**
   * Create new version (snapshot current state)
   * @param {string|number} companyId - Company ID
   * @param {string|number} siteId - Site ID
   * @param {Object} data - Version data with notes
   */
  async createVersion(companyId, siteId, data) {
    // Note: endpoint is /versions/create/ not /versions/
    const response = await api.post(`${BASE_URL}/${companyId}/sites/${siteId}/versions/create/`, data);
    return response.data;
  },
  
  /**
   * Get specific version
   * @param {string|number} companyId - Company ID
   * @param {string|number} siteId - Site ID
   * @param {string|number} versionId - Version ID
   */
  async getVersion(companyId, siteId, versionId) {
    const response = await api.get(`${BASE_URL}/${companyId}/sites/${siteId}/versions/${versionId}/`);
    return response.data;
  },
  
  /**
   * Update current version (without creating new version)
   * @param {string|number} companyId - Company ID
   * @param {string|number} siteId - Site ID
   * @param {Object} data - Updated fields
   */
  async updateCurrentVersion(companyId, siteId, data) {
    const response = await api.put(`${BASE_URL}/${companyId}/sites/${siteId}/current/`, data);
    return response.data;
  },
  
  /**
   * Restore old version (creates new version based on old)
   * @param {string|number} companyId - Company ID
   * @param {string|number} siteId - Site ID
   * @param {string|number} versionId - Version to restore
   */
  async restoreVersion(companyId, siteId, versionId) {
    const response = await api.post(`${BASE_URL}/${companyId}/sites/${siteId}/restore/${versionId}/`);
    return response.data;
  },

  /**
   * Delete a version (cannot delete current version)
   * @param {string|number} companyId - Company ID
   * @param {string|number} siteId - Site ID
   * @param {string|number} versionId - Version to delete
   */
  async deleteVersion(companyId, siteId, versionId) {
    const response = await api.delete(`${BASE_URL}/${companyId}/sites/${siteId}/versions/${versionId}/`);
    return response.data;
  },
  
  // ==================== NOTES ====================
  
  /**
   * Get notes for a company
   * @param {string|number} companyId - Company ID
   */
  async getNotes(companyId) {
    const response = await api.get(`${BASE_URL}/${companyId}/notes/`);
    return response.data;
  },
  
  /**
   * Add note to company
   * @param {string|number} companyId - Company ID
   * @param {Object} data - Note data (content, note_type, production_site)
   */
  async addNote(companyId, data) {
    const response = await api.post(`${BASE_URL}/${companyId}/notes/`, data);
    return response.data;
  },
  
  /**
   * Update note
   * @param {string|number} companyId - Company ID
   * @param {string|number} noteId - Note ID
   * @param {Object} data - Updated note data
   */
  async updateNote(companyId, noteId, data) {
    const response = await api.put(`${BASE_URL}/${companyId}/notes/${noteId}/`, data);
    return response.data;
  },
  
  /**
   * Delete note
   * @param {string|number} companyId - Company ID
   * @param {string|number} noteId - Note ID
   */
  async deleteNote(companyId, noteId) {
    const response = await api.delete(`${BASE_URL}/${companyId}/notes/${noteId}/`);
    return response.data;
  },
  
  // ==================== HISTORY & UTILITIES ====================
  
  /**
   * Get company history
   * @param {string|number} companyId - Company ID
   */
  async getHistory(companyId) {
    const response = await api.get(`${BASE_URL}/${companyId}/history/`);
    return response.data;
  },
  
  /**
   * Check for duplicate companies
   * @param {Object} data - { company_name, country }
   */
  async checkDuplicate(data) {
    const response = await api.post(`${BASE_URL}/check-duplicate/`, data);
    return response.data;
  },
  
  /**
   * Bulk update company statuses
   * @param {Object} data - { company_ids: [], status: 'COMPLETE' }
   */
  async bulkStatusUpdate(data) {
    const response = await api.post(`${BASE_URL}/bulk-status/`, data);
    return response.data;
  },
  
  /**
   * Get statistics (supports filtering)
   * @param {Object} params - Filter parameters (same as getCompanies)
   * @param {string} params.status - Filter by status
   * @param {string} params.country - Filter by country
   * @param {string} params.category - Filter by category
   * @param {string} params.search - Search term
   * @param {string} params.filter_groups - JSON string of filter groups
   */
  async getStats(params = {}) {
    const response = await api.get(`${BASE_URL}/stats/`, { params });
    return response.data;
  },
  
  // ==================== IMPORT ====================
  
  /**
   * Import companies from Excel file
   * @param {File} file - Excel file (with sheets for each category)
   * @param {Function} onProgress - Optional progress callback
   */
  async importFromExcel(file, onProgress = null) {
    const formData = new FormData();
    formData.append('file', file);
    
    const config = {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      // Set a very long timeout for large imports (30 minutes)
      timeout: 1800000,
    };
    
    // Add progress tracking if callback provided
    if (onProgress) {
      config.onUploadProgress = (progressEvent) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percentCompleted);
      };
    }
    
    const response = await api.post(`${BASE_URL}/import/`, formData, config);
    return response.data;
  },
  
  /**
   * Get import template info
   * Returns expected sheet names and column headers for each category
   */
  async getImportTemplate() {
    const response = await api.get(`${BASE_URL}/import/template/`);
    return response.data;
  },
  
  /**
   * Get URL to download import report
   * @param {string} filename - Report filename from import response
   */
  getImportReportUrl(filename) {
    return `${BASE_URL}/import/download-report/${filename}/`;
  },
};

export default companyService;
