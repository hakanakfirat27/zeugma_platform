// frontend/src/hooks/useClientFavorites.js
import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

/**
 * Custom hook for managing client favorites and collections
 * @param {string} reportId - The report UUID (optional, for report-specific operations)
 * @param {object} toast - Toast context for notifications (optional)
 */
const useClientFavorites = (reportId = null, toast = null) => {
  const [favorites, setFavorites] = useState([]);
  const [favoritedRecordIds, setFavoritedRecordIds] = useState(new Set());
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Helper to show toast
  const showToast = (type, message) => {
    if (toast && toast[type]) {
      toast[type](message);
    }
  };

  // =============================================================================
  // FAVORITES
  // =============================================================================

  // Fetch favorites stats for a report (which records are favorited)
  const fetchFavoriteStats = useCallback(async () => {
    if (!reportId) return;
    
    try {
      const response = await api.get(`/api/client/favorites/stats/?report_id=${reportId}`);
      setFavoritedRecordIds(new Set(response.data.favorited_record_ids || []));
    } catch (err) {
      console.error('Error fetching favorite stats:', err);
    }
  }, [reportId]);

  // Fetch all favorites (optionally filtered by report)
  const fetchFavorites = useCallback(async () => {
    try {
      setLoading(true);
      const params = reportId ? `?report_id=${reportId}` : '';
      const response = await api.get(`/api/client/favorites/${params}`);
      setFavorites(response.data.results || []);
    } catch (err) {
      console.error('Error fetching favorites:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [reportId]);

  // Add to favorites
  const addToFavorites = useCallback(async (companyData) => {
    try {
      const response = await api.post('/api/client/favorites/', {
        report_id: companyData.reportId || reportId,
        record_id: companyData.recordId,
        company_name: companyData.companyName,
        country: companyData.country || '',
      });
      
      // Update local state
      setFavoritedRecordIds(prev => new Set([...prev, String(companyData.recordId)]));
      
      showToast('success', `${companyData.companyName} added to favorites`);
      
      return response.data;
    } catch (err) {
      console.error('Error adding to favorites:', err);
      const errorMsg = err.response?.data?.error || 'Failed to add to favorites';
      showToast('error', errorMsg);
      throw err;
    }
  }, [reportId, toast]);

  // Remove from favorites
  const removeFromFavorites = useCallback(async (recordId, companyName = null, favoriteId = null) => {
    try {
      if (favoriteId) {
        await api.delete(`/api/client/favorites/${favoriteId}/`);
      } else {
        await api.delete('/api/client/favorites/', {
          data: { report_id: reportId, record_id: recordId }
        });
      }
      
      // Update local state
      setFavoritedRecordIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(String(recordId));
        return newSet;
      });
      
      showToast('info', companyName ? `${companyName} removed from favorites` : 'Removed from favorites');
    } catch (err) {
      console.error('Error removing from favorites:', err);
      showToast('error', 'Failed to remove from favorites');
      throw err;
    }
  }, [reportId, toast]);

  // Toggle favorite status
  const toggleFavorite = useCallback(async (companyData) => {
    const recordIdStr = String(companyData.recordId);
    const isFavorited = favoritedRecordIds.has(recordIdStr);
    
    if (isFavorited) {
      await removeFromFavorites(companyData.recordId, companyData.companyName);
      return false;
    } else {
      await addToFavorites(companyData);
      return true;
    }
  }, [favoritedRecordIds, addToFavorites, removeFromFavorites]);

  // Check if a record is favorited
  const isFavorited = useCallback((recordId) => {
    return favoritedRecordIds.has(String(recordId));
  }, [favoritedRecordIds]);

  // =============================================================================
  // COLLECTIONS
  // =============================================================================

  // Fetch all collections
  const fetchCollections = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/client/collections/');
      setCollections(response.data.results || []);
    } catch (err) {
      console.error('Error fetching collections:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Create a new collection
  const createCollection = useCallback(async (collectionData) => {
    try {
      const response = await api.post('/api/client/collections/', collectionData);
      setCollections(prev => [...prev, response.data]);
      showToast('success', `Collection "${collectionData.name}" created`);
      return response.data;
    } catch (err) {
      console.error('Error creating collection:', err);
      showToast('error', 'Failed to create collection');
      throw err;
    }
  }, [toast]);

  // Update a collection
  const updateCollection = useCallback(async (collectionId, collectionData) => {
    try {
      const response = await api.patch(`/api/client/collections/${collectionId}/`, collectionData);
      setCollections(prev => prev.map(c => c.id === collectionId ? response.data : c));
      showToast('success', 'Collection updated');
      return response.data;
    } catch (err) {
      console.error('Error updating collection:', err);
      showToast('error', 'Failed to update collection');
      throw err;
    }
  }, [toast]);

  // Delete a collection
  const deleteCollection = useCallback(async (collectionId, collectionName = null) => {
    try {
      await api.delete(`/api/client/collections/${collectionId}/`);
      setCollections(prev => prev.filter(c => c.id !== collectionId));
      showToast('success', collectionName ? `Collection "${collectionName}" deleted` : 'Collection deleted');
    } catch (err) {
      console.error('Error deleting collection:', err);
      showToast('error', 'Failed to delete collection');
      throw err;
    }
  }, [toast]);

  // Get collection details with items
  const getCollectionDetails = useCallback(async (collectionId) => {
    try {
      const response = await api.get(`/api/client/collections/${collectionId}/`);
      return response.data;
    } catch (err) {
      console.error('Error fetching collection details:', err);
      throw err;
    }
  }, []);

  // Add item to collection
  const addToCollection = useCallback(async (collectionId, companyData) => {
    try {
      const response = await api.post(`/api/client/collections/${collectionId}/items/`, {
        report_id: companyData.reportId || reportId,
        record_id: companyData.recordId,
        company_name: companyData.companyName,
        country: companyData.country || '',
        note: companyData.note || '',
      });
      
      // Update collection item count
      setCollections(prev => prev.map(c => 
        c.id === collectionId ? { ...c, item_count: c.item_count + 1 } : c
      ));
      
      return response.data;
    } catch (err) {
      console.error('Error adding to collection:', err);
      throw err;
    }
  }, [reportId]);

  // Remove item from collection
  const removeFromCollection = useCallback(async (collectionId, itemId, companyName = null) => {
    try {
      await api.delete(`/api/client/collections/${collectionId}/items/${itemId}/`);
      
      // Update collection item count
      setCollections(prev => prev.map(c => 
        c.id === collectionId ? { ...c, item_count: Math.max(0, c.item_count - 1) } : c
      ));
      
      showToast('info', companyName ? `${companyName} removed from collection` : 'Removed from collection');
    } catch (err) {
      console.error('Error removing from collection:', err);
      showToast('error', 'Failed to remove from collection');
      throw err;
    }
  }, [toast]);

  // Add to multiple collections at once
  const addToMultipleCollections = useCallback(async (collectionIds, companyData) => {
    try {
      const response = await api.post('/api/client/collections/add-to-multiple/', {
        collection_ids: collectionIds,
        report_id: companyData.reportId || reportId,
        record_id: companyData.recordId,
        company_name: companyData.companyName,
        country: companyData.country || '',
      });
      
      const { added, skipped, added_count, skipped_count } = response.data;
      
      // Refresh collections to update counts
      await fetchCollections();
      
      // Return result info for the caller to handle
      return { added, skipped, added_count, skipped_count };
    } catch (err) {
      console.error('Error adding to multiple collections:', err);
      showToast('error', 'Failed to add to collections');
      throw err;
    }
  }, [reportId, fetchCollections, toast]);

  // Get which collections a company belongs to
  const getCompanyCollectionMembership = useCallback(async (companyReportId, recordId) => {
    try {
      const response = await api.get('/api/client/collections/membership/', {
        params: {
          report_id: companyReportId || reportId,
          record_id: recordId
        }
      });
      return response.data;
    } catch (err) {
      console.error('Error fetching collection membership:', err);
      return { collection_ids: [], collections: [], count: 0 };
    }
  }, [reportId]);

  // Fetch collection stats for a report (which records are in collections)
  const [recordCollectionCounts, setRecordCollectionCounts] = useState({});
  
  const fetchCollectionStats = useCallback(async () => {
    if (!reportId) return;
    
    try {
      const response = await api.get('/api/client/collections/stats/', {
        params: { report_id: reportId }
      });
      setRecordCollectionCounts(response.data.record_collection_counts || {});
    } catch (err) {
      console.error('Error fetching collection stats:', err);
    }
  }, [reportId]);

  // Check if a record is in any collection
  const isInCollection = useCallback((recordId) => {
    return (recordCollectionCounts[String(recordId)] || 0) > 0;
  }, [recordCollectionCounts]);

  // Get collection count for a record
  const getCollectionCount = useCallback((recordId) => {
    return recordCollectionCounts[String(recordId)] || 0;
  }, [recordCollectionCounts]);

  // Initial fetch
  useEffect(() => {
    if (reportId) {
      fetchFavoriteStats();
      fetchCollectionStats();
    }
    fetchCollections();
  }, [reportId, fetchFavoriteStats, fetchCollections, fetchCollectionStats]);

  return {
    // Favorites
    favorites,
    favoritedRecordIds,
    fetchFavorites,
    fetchFavoriteStats,
    addToFavorites,
    removeFromFavorites,
    toggleFavorite,
    isFavorited,
    
    // Collections
    collections,
    fetchCollections,
    createCollection,
    updateCollection,
    deleteCollection,
    getCollectionDetails,
    addToCollection,
    removeFromCollection,
    addToMultipleCollections,
    getCompanyCollectionMembership,
    
    // Collection stats for records
    recordCollectionCounts,
    fetchCollectionStats,
    isInCollection,
    getCollectionCount,
    
    // State
    loading,
    error,
  };
};

export default useClientFavorites;
