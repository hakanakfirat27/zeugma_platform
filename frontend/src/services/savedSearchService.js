/**
 * Service for managing saved searches
 * This file contains all API calls related to saved searches
 */

import api from '../utils/api'; // Note: Based on your structure, api.js is in utils folder

/**
 * Get all saved searches for a specific report
 * @param {string} reportId - UUID of the report
 * @returns {Promise} - Promise with saved searches data
 */
export const getSavedSearches = async (reportId) => {
  try {
    const response = await api.get('/api/client/saved-searches/', {
      params: { report_id: reportId }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching saved searches:', error);
    throw error;
  }
};

/**
 * Create a new saved search
 * @param {Object} data - Saved search data
 * @returns {Promise} - Promise with created saved search
 */
export const createSavedSearch = async (data) => {
  try {
    const response = await api.post('/api/client/saved-searches/', data);
    return response.data;
  } catch (error) {
    console.error('Error creating saved search:', error);
    throw error;
  }
};

/**
 * Get details of a specific saved search
 * @param {string} searchId - UUID of the saved search
 * @returns {Promise} - Promise with saved search data
 */
export const getSavedSearch = async (searchId) => {
  try {
    const response = await api.get(`/api/client/saved-searches/${searchId}/`);
    return response.data;
  } catch (error) {
    console.error('Error fetching saved search:', error);
    throw error;
  }
};

/**
 * Update a saved search
 * @param {string} searchId - UUID of the saved search
 * @param {Object} data - Fields to update
 * @returns {Promise} - Promise with updated saved search
 */
export const updateSavedSearch = async (searchId, data) => {
  try {
    const response = await api.patch(`/api/client/saved-searches/${searchId}/`, data);
    return response.data;
  } catch (error) {
    console.error('Error updating saved search:', error);
    throw error;
  }
};

/**
 * Delete a saved search
 * @param {string} searchId - UUID of the saved search
 * @returns {Promise} - Promise with deletion result
 */
export const deleteSavedSearch = async (searchId) => {
  try {
    const response = await api.delete(`/api/client/saved-searches/${searchId}/`);
    return response.data;
  } catch (error) {
    console.error('Error deleting saved search:', error);
    throw error;
  }
};