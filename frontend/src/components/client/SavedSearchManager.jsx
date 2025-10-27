import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Save,
  Star,
  Edit2,
  Trash2,
  Plus,
  X,
  Check,
  AlertCircle,
  Search as SearchIcon
} from 'lucide-react';
import {
  getSavedSearches,
  createSavedSearch,
  updateSavedSearch,
  deleteSavedSearch
} from '../../services/savedSearchService';

const SavedSearchManager = ({ reportId, currentFilters, onLoadSearch }) => {
  const navigate = useNavigate();

  const [savedSearches, setSavedSearches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [editingSearch, setEditingSearch] = useState(null);

  // Form state for creating/editing
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_default: false
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Load saved searches when component mounts or reportId changes
  useEffect(() => {
    if (reportId) {
      loadSavedSearches();
    }
  }, [reportId]);

  /**
   * Load all saved searches for this report
   */
  const loadSavedSearches = async () => {
    try {
      setLoading(true);
      const data = await getSavedSearches(reportId);
      setSavedSearches(data.results || []);
    } catch (err) {
      console.error('Failed to load saved searches:', err);
      setError('Failed to load saved searches');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle saving current filters as a new saved search
   */
  const handleSaveCurrentSearch = async (e) => {
    e.preventDefault();

    // Validate form
    if (!formData.name.trim()) {
      setError('Please enter a name for this saved search');
      return;
    }

    try {
      setLoading(true);
      setError('');

      console.log('💾 Saving search with filters:', currentFilters);

      // Create the saved search
      await createSavedSearch({
        name: formData.name.trim(),
        description: formData.description.trim(),
        report_id: reportId,
        filter_params: currentFilters,
        is_default: formData.is_default
      });

      setSuccess('Saved search created successfully!');

      // Reload saved searches
      await loadSavedSearches();

      // Reset form and close modal
      setFormData({ name: '', description: '', is_default: false });
      setShowSaveModal(false);

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);

    } catch (err) {
      console.error('Failed to save search:', err);
      const errorMessage = err.response?.data?.error ||
                          err.response?.data?.details?.name?.[0] ||
                          'Failed to save search';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load a saved search and apply its filters
   */
  const handleLoadSearch = (savedSearch) => {
    console.log('📂 Loading saved search:', savedSearch.name);
    console.log('📂 Filter params:', savedSearch.filter_params);

    setShowManageModal(false);

    if (onLoadSearch) {
      onLoadSearch(savedSearch.filter_params);
    }
    setSuccess(`Loaded: ${savedSearch.name}`);
    setTimeout(() => setSuccess(''), 3000);

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /**
   * Delete a saved search
   */
  const handleDeleteSearch = async (searchId) => {
    if (!window.confirm('Are you sure you want to delete this saved search?')) {
      return;
    }

    try {
      setLoading(true);
      await deleteSavedSearch(searchId);
      setSuccess('Saved search deleted');
      await loadSavedSearches();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Failed to delete search:', err);
      setError('Failed to delete saved search');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Toggle default status of a saved search
   */
  const handleToggleDefault = async (searchId, currentDefault, searchName) => {
    try {
      setLoading(true);
      await updateSavedSearch(searchId, {
        is_default: !currentDefault
      });

      // Better success message
      const message = !currentDefault
        ? `"${searchName}" set as default search`
        : `"${searchName}" removed as default`;

      setSuccess(message);
      await loadSavedSearches();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Failed to update default:', err);
      setError('Failed to update default search');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Render the main component
   */
  return (
    <div className="saved-search-manager">
      {/* Success Message */}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
          <Check className="w-5 h-5 text-green-600" />
          <span className="text-green-800 text-sm">{success}</span>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <span className="text-red-800 text-sm">{error}</span>
          <button
            onClick={() => setError('')}
            className="ml-auto text-red-600 hover:text-red-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 mb-4">
        <button
          onClick={() => setShowSaveModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors"
          disabled={loading}
        >
          <Save className="w-4 h-4" />
          Save Current Search
        </button>

        <button
          onClick={() => setShowManageModal(true)}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2 transition-colors"
        >
          <Star className="w-4 h-4" />
          My Saved Searches ({savedSearches.length})
        </button>
      </div>

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">Save Current Search</h3>
              <button
                onClick={() => {
                  setShowSaveModal(false);
                  setFormData({ name: '', description: '', is_default: false });
                  setError('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSaveCurrentSearch}>
              {/* Name Input */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., UK Tech Companies"
                  required
                  autoFocus
                />
              </div>

              {/* Description Input */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Brief description of this search"
                  rows="3"
                />
              </div>

              {/* Default Checkbox */}
              <div className="mb-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_default}
                    onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">
                    Set as default search (loads automatically)
                  </span>
                </label>
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Saving...' : 'Save Search'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowSaveModal(false);
                    setFormData({ name: '', description: '', is_default: false });
                    setError('');
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Saved Searches Modal */}
      {showManageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">My Saved Searches</h3>
              <button
                onClick={() => setShowManageModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {savedSearches.length === 0 ? (
              <div className="text-center py-8">
                <Star className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">No saved searches yet</p>
                <p className="text-sm text-gray-500 mt-2">
                  Apply some filters and click "Save Current Search" to get started
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {savedSearches.map((search) => (
                  <div
                    key={search.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-gray-900">{search.name}</h4>
                          {search.is_default && (
                            <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded-full flex items-center gap-1">
                              <Star className="w-3 h-3 fill-current" />
                              Default
                            </span>
                          )}
                        </div>
                        {search.description && (
                          <p className="text-sm text-gray-600 mb-2">{search.description}</p>
                        )}
                        <p className="text-xs text-gray-500">
                          Created: {new Date(search.created_at).toLocaleDateString()}
                        </p>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => handleLoadSearch(search)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Load this search"
                          disabled={loading}
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleDefault(search.id, search.is_default, search.name)}
                          className={`p-2 rounded-lg transition-colors ${
                            search.is_default
                              ? 'text-yellow-600 hover:bg-yellow-50'
                              : 'text-gray-400 hover:bg-gray-50'
                          }`}
                          title={search.is_default ? 'Remove as default' : 'Set as default'}
                          disabled={loading}
                        >
                          <Star className={`w-4 h-4 ${search.is_default ? 'fill-current' : ''}`} />
                        </button>
                        <button
                          onClick={() => handleDeleteSearch(search.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete this search"
                          disabled={loading}
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
        </div>
      )}
    </div>
  );
};

export default SavedSearchManager;