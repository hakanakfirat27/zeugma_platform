// frontend/src/pages/UnverifiedSiteEditPage.jsx
// Standalone page for editing unverified site details (ADMIN SIDE)
// Uses DashboardLayout for admin interface

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import CountrySelector from '../../components/form/CountrySelector';
import NotesTab from '../../components/calling/NotesTab';
import CancelConfirmationModal from '../../components/modals/CancelConfirmationModal';
import { ToastContainer } from '../../components/Toast';
import { useToast } from '../../hooks/useToast';
import {
  ArrowLeft, Save, Building2, Users, Info, MessageSquare
} from 'lucide-react';

const UnverifiedSiteEditPage = () => {
  const { siteId } = useParams();
  const navigate = useNavigate();
  const { toasts, removeToast, success, error: showError } = useToast();
  
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('core');
  const [notesCount, setNotesCount] = useState(0);
  const [fieldMetadata, setFieldMetadata] = useState(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [originalCompanyName, setOriginalCompanyName] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoadingData(true);
        
        // Fetch the unverified site data
        const siteResponse = await api.get(`/api/unverified-sites/${siteId}/`);
        
        // Fetch field metadata using the category from site data
        const metadataResponse = await api.get(`/api/fields/metadata/${siteResponse.data.category}/`);

        setFormData(siteResponse.data);
        setOriginalCompanyName(siteResponse.data.company_name);
        setFieldMetadata(metadataResponse.data);
      } catch (error) {
        console.error('Error loading data:', error);
        showError('Failed to load site data. Returning to unverified sites list.');
        setTimeout(() => navigate('/unverified-sites'), 2000);
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchData();
  }, [siteId, navigate, showError]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    try {
      await api.put(`/api/unverified-sites/${siteId}/update/`, formData);
      
      success('Site updated successfully!');
      
      // Navigate back to detail page after short delay
      setTimeout(() => {
        navigate(`/unverified-sites/${siteId}`);
      }, 1500);
    } catch (error) {
      if (error.response?.data) {
        setErrors(error.response.data);
      }
      showError(`Error updating site: ${error.response?.data?.detail || error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (fieldName, value) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
    // Clear error for this field when user starts typing
    if (errors[fieldName]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  const handleCancel = () => {
    setShowCancelModal(true);
  };

  const handleConfirmCancel = () => {
    setShowCancelModal(false);
    navigate(`/unverified-sites/${siteId}`);
  };

  if (isLoadingData) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="text-center mt-4 text-gray-600">Loading site data...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Toast Container */}
        <ToastContainer toasts={toasts} removeToast={removeToast} />

        {/* Header with navigation */}
        <div className="mb-6 flex justify-between items-center">
          <button
            onClick={handleCancel}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Cancel & Go Back
          </button>

          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save className="w-4 h-4" />
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        {/* Main Content Card */}
        <div className="bg-white rounded-lg shadow-lg">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <h2 className="text-2xl font-bold text-indigo-900">Edit Site: {originalCompanyName}</h2>
            <p className="text-sm text-gray-600 mt-1">Make changes to the site information below</p>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Tabs */}
            <div className="border-b border-gray-200">
              <nav className="flex -mb-px px-6">
                <button
                  type="button"
                  onClick={() => setActiveTab('core')}
                  className={`px-6 py-3 font-medium transition-colors flex items-center gap-2 ${
                    activeTab === 'core'
                      ? 'border-b-2 border-indigo-600 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  Core Information
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('contacts')}
                  className={`px-6 py-3 font-medium transition-colors flex items-center gap-2 ${
                    activeTab === 'contacts'
                      ? 'border-b-2 border-indigo-600 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  Contact Persons
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('category')}
                  className={`px-6 py-3 font-medium transition-colors flex items-center gap-2 ${
                    activeTab === 'category'
                      ? 'border-b-2 border-indigo-600 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Info className="w-4 h-4" />
                  Technical Details
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('notes')}
                  className={`px-6 py-3 font-medium transition-colors flex items-center gap-2 ${
                    activeTab === 'notes'
                      ? 'border-b-2 border-indigo-600 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                  Notes
                  {notesCount > 0 && (
                    <span className="ml-1 px-2 py-0.5 text-xs font-semibold bg-indigo-600 text-white rounded-full">
                      {notesCount}
                    </span>
                  )}
                </button>
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-6 min-h-[400px]">
              {activeTab === 'notes' ? (
                <NotesTab 
                  siteId={siteId}
                  readOnly={false}
                  onNotesCountChange={setNotesCount}
                />
              ) : (
                <EditTabContent
                  activeTab={activeTab}
                  fieldMetadata={fieldMetadata}
                  formData={formData}
                  errors={errors}
                  onChange={handleInputChange}
                />
              )}
            </div>

            {/* Footer Actions */}
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>

        {/* Cancel Confirmation Modal */}
        <CancelConfirmationModal
          isOpen={showCancelModal}
          onClose={() => setShowCancelModal(false)}
          onConfirm={handleConfirmCancel}
          title="Confirm Cancellation"
          message="Are you sure you want to cancel? Any unsaved changes will be lost."
        />
      </div>
    </DashboardLayout>
  );
};

// Edit Tab Content Component
const EditTabContent = ({ activeTab, fieldMetadata, formData, errors, onChange }) => {
  if (!fieldMetadata) return null;

  if (activeTab === 'core') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {fieldMetadata.common_fields?.map(fieldMeta => (
          <FormField
            key={fieldMeta.name}
            fieldMeta={fieldMeta}
            value={formData[fieldMeta.name] || ''}
            error={errors[fieldMeta.name]}
            onChange={onChange}
          />
        ))}
      </div>
    );
  }

  if (activeTab === 'contacts') {
    const contactFields = fieldMetadata.contact_fields || [];
    const groupedContacts = [1, 2, 3, 4].map(contactNum => {
      return contactFields.filter(field => field.name.includes(`_${contactNum}`));
    });

    return (
      <div className="space-y-8">
        {groupedContacts.map((group, index) =>
          group.length > 0 && (
            <div key={index} className="border-l-4 border-indigo-500 pl-6">
              <h4 className="text-md font-semibold text-gray-800 mb-4">
                Contact {index + 1}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {group.map(fieldMeta => (
                  <FormField
                    key={fieldMeta.name}
                    fieldMeta={fieldMeta}
                    value={formData[fieldMeta.name] || ''}
                    error={errors[fieldMeta.name]}
                    onChange={onChange}
                  />
                ))}
              </div>
            </div>
          )
        )}
      </div>
    );
  }

  if (activeTab === 'category') {
    return (
      <div className="space-y-0">
        {fieldMetadata.category_fields?.map((fieldMeta, index) => (
          <FormField
            key={fieldMeta.name}
            fieldMeta={fieldMeta}
            value={formData[fieldMeta.name] || ''}
            error={errors[fieldMeta.name]}
            onChange={onChange}
            fullWidth
            showDivider={index < fieldMetadata.category_fields.length - 1}
          />
        ))}
      </div>
    );
  }

  return null;
};

// Form Field Component
const FormField = ({ fieldMeta, value, error, onChange, fullWidth = false, showDivider = false }) => {
  const { name, label, type, required } = fieldMeta;

  if (name === 'country' || label.toLowerCase() === 'country') {
    return (
      <>
        <div className={fullWidth ? "md:col-span-2 py-3" : ""}>
          <CountrySelector
            value={value || ''}
            onChange={(countryName) => onChange(name, countryName)}
            error={error}
            required={required}
            label={label}
          />
        </div>
        {showDivider && <hr className="my-0 h-px border-t-0 bg-gray-200" />}
      </>
    );
  }

  if (type === 'checkbox') {
    return (
      <>
        <div className="flex items-center py-4">
          <input
            type="checkbox"
            id={name}
            checked={value || false}
            onChange={(e) => onChange(name, e.target.checked)}
            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
          />
          <label htmlFor={name} className="ml-2 block text-sm text-gray-900">
            {label}
          </label>
        </div>
        {showDivider && <hr className="my-0 h-px border-t-0 bg-gray-200" />}
      </>
    );
  }

  if (type === 'textarea') {
    return (
      <>
        <div className={fullWidth ? "md:col-span-2 py-2" : ""}>
          <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <textarea
            id={name}
            value={value || ''}
            onChange={(e) => onChange(name, e.target.value)}
            rows={3}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
              error ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
        </div>
      </>
    );
  }

  return (
    <>
      <div className={fullWidth ? "md:col-span-2 py-3" : ""}>
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <input
          type={type}
          id={name}
          value={value || ''}
          onChange={(e) => onChange(name, e.target.value)}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
            error ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
      </div>
    </>
  );
};

export default UnverifiedSiteEditPage;