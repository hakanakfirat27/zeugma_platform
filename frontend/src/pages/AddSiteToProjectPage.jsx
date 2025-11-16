// frontend/src/pages/AddSiteToProjectPage.jsx

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowLeft, Save, X, Building2, Users, Info, MessageSquare } from 'lucide-react';
import useToast from '../hooks/useToast';
import { ToastContainer } from '../components/Toast';
import api from '../utils/api';
import DataCollectorLayout from '../components/layout/DataCollectorLayout';
import { CATEGORIES } from '../constants/categories';
import CountrySelector from '../components/form/CountrySelector';
import NotesTab from '../components/NotesTab';
import CancelConfirmationModal from '../components/CancelConfirmationModal';

const AddSiteToProjectPage = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { success, error: showError } = useToast();
  const [selectedCategory, setSelectedCategory] = useState('');
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('core'); // core, contacts, category, notes
  const [savedSiteId, setSavedSiteId] = useState(null); // Track saved site ID for notes
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Fetch project details
  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const response = await api.get(`/api/projects/${projectId}/`);
      return response.data;
    },
  });

  // Fetch field metadata from backend
  const { data: fieldMetadata, isLoading: metadataLoading } = useQuery({
    queryKey: ['field-metadata', selectedCategory],
    queryFn: async () => {
      if (!selectedCategory) return null;
      const response = await api.get(`/api/fields/metadata/${selectedCategory}/`);
      return response.data;
    },
    enabled: !!selectedCategory,
  });

  // Set category from project when loaded
  useEffect(() => {
    if (project && !selectedCategory) {
      setSelectedCategory(project.category);
    }
  }, [project, selectedCategory]);

  const handleInputChange = (fieldName, value) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value
    }));
    if (errors[fieldName]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await addSiteMutation.mutateAsync({
        ...formData,
        category: selectedCategory
      });
    } catch (error) {
      console.error('Submit error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const addSiteMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post(`/api/projects/${projectId}/sites/add/`, data);
      return response.data;
    },
    onSuccess: (data) => {
      // Save the site ID for notes
      setSavedSiteId(data.site_id);
      
      // Show success message
      success('Site saved successfully! You can now add notes.');
      
      // Switch to notes tab
      setActiveTab('notes');
      
      // Don't navigate away immediately - let user add notes
      // navigate(`/projects/${projectId}`);
    },
    onError: (error) => {
      console.error('Error adding site:', error);
      if (error.response?.data) {
        setErrors(error.response.data);
      }
      showError('Failed to save site. Please check the form.');
    },
  });

  const handleCancel = () => {
    setShowCancelModal(true);
  };

  const handleConfirmCancel = () => {
    setShowCancelModal(false);
    navigate(`/projects/${projectId}`);
  };

  const getCategoryDisplayName = (categoryCode) => {
    const category = CATEGORIES.find(cat => cat.value === categoryCode);
    return category ? category.label : categoryCode;
  };

  // Count fields with errors in each tab
  const getTabErrorCount = (tabName) => {
    if (!fieldMetadata || !errors || Object.keys(errors).length === 0) return 0;
    
    const errorFields = Object.keys(errors);
    
    if (tabName === 'core') {
      const coreFieldNames = fieldMetadata.common_fields?.map(f => f.name) || [];
      return errorFields.filter(field => coreFieldNames.includes(field)).length;
    } else if (tabName === 'contacts') {
      const contactFieldNames = fieldMetadata.contact_fields?.map(f => f.name) || [];
      return errorFields.filter(field => contactFieldNames.includes(field)).length;
    } else if (tabName === 'category') {
      const categoryFieldNames = fieldMetadata.category_fields?.map(f => f.name) || [];
      return errorFields.filter(field => categoryFieldNames.includes(field)).length;
    }
    
    return 0;
  };

  if (projectLoading || metadataLoading) {
    return (
      <DataCollectorLayout pageTitle="Add Site">
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DataCollectorLayout>
    );
  }

  if (!project) {
    return (
      <DataCollectorLayout pageTitle="Add Site">
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="text-red-800 font-semibold">Project Not Found</h3>
            <p className="text-red-600 text-sm mt-1">
              The project you're trying to add a site to could not be found.
            </p>
            <button
              onClick={() => navigate('/projects')}
              className="mt-3 text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              ← Back to Projects
            </button>
          </div>
        </div>
      </DataCollectorLayout>
    );
  }

  const categoryDisplayName = getCategoryDisplayName(selectedCategory);

  return (
    <DataCollectorLayout
      pageTitle="Add Site to Project"
      pageSubtitleBottom={`Adding site to: ${project.project_name}`}
    >
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(`/projects/${projectId}`)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Add New Site
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Project: {project.project_name} ({project.category_display})
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCancel}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <X className="w-4 h-4 inline mr-2" />
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4 inline mr-2" />
                {isSubmitting ? 'Saving...' : 'Save Site'}
              </button>
            </div>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('core')}
                className={`
                     px-6 py-3 font-medium transition-colors flex items-center gap-2
                  ${activeTab === 'core' 
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <Building2 className="w-4 h-4" />
                Core Information
                {getTabErrorCount('core') > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold text-white bg-red-500 rounded-full">
                    {getTabErrorCount('core')}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('contacts')}
                className={`
                  px-6 py-3 font-medium transition-colors flex items-center gap-2
                  ${activeTab === 'contacts' 
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <Users className="w-4 h-4" />
                Contact Persons
                {getTabErrorCount('contacts') > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold text-white bg-red-500 rounded-full">
                    {getTabErrorCount('contacts')}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('category')}
                className={`
                  px-6 py-3 font-medium transition-colors flex items-center gap-2
                  ${activeTab === 'category' 
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <Info className="w-4 h-4" />
                {categoryDisplayName} Details
                {getTabErrorCount('category') > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold text-white bg-red-500 rounded-full">
                    {getTabErrorCount('category')}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('notes')}
                className={`
                  px-6 py-3 font-medium transition-colors flex items-center gap-2
                  ${activeTab === 'notes' 
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <MessageSquare className="w-4 h-4" />
                Notes
                {!savedSiteId && (
                  <span className="ml-2 text-xs text-gray-400">(Save site first)</span>
                )}
              </button>              
            </nav>
          </div>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit}>
          {/* Tab Content */}
          {activeTab === 'notes' ? (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <NotesTab 
                siteId={savedSiteId}
                readOnly={false}
              />
            </div>
          ) : (
            fieldMetadata && (
              <TabContent
                activeTab={activeTab}
                fieldMetadata={fieldMetadata}
                formData={formData}
                errors={errors}
                onChange={handleInputChange}
                categoryDisplayName={categoryDisplayName}
              />
            )
          )}

          {/* Sticky Footer - Hide on notes tab */}
          {activeTab !== 'notes' && (
            <div className="sticky bottom-0 bg-white border-t border-gray-200 shadow-lg rounded-lg p-4 mt-6 z-10">
              <div className="flex items-center justify-between max-w-7xl mx-auto">
                <p className="text-sm text-gray-600">
                  <span className="text-red-500">*</span> Required fields
                </p>
                <div className="flex items-center gap-2">
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
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Saving...' : 'Save Site'}
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Notes Tab Footer */}
          {activeTab === 'notes' && savedSiteId && (
            <div className="sticky bottom-0 bg-white border-t border-gray-200 shadow-lg rounded-lg p-4 mt-6 z-10">
              <div className="flex items-center justify-between max-w-7xl mx-auto">
                <p className="text-sm text-gray-600">
                  Site saved. Notes are optional.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => navigate(`/projects/${projectId}`)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Done - Back to Project
                  </button>
                </div>
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Cancel Confirmation Modal */}
      <CancelConfirmationModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleConfirmCancel}
        title="Confirm Cancellation"
        message="Are you sure you want to cancel? All unsaved changes will be lost."
      />      
      
    </DataCollectorLayout>
  );
};

// Tab Content Component
const TabContent = ({ 
  activeTab, 
  fieldMetadata, 
  formData, 
  errors, 
  onChange, 
  categoryDisplayName
}) => {
  if (activeTab === 'core') {
    return <CoreInformationTab 
      fieldMetadata={fieldMetadata} 
      formData={formData} 
      errors={errors} 
      onChange={onChange} 
    />;
  }

  if (activeTab === 'contacts') {
    return <ContactPersonsTab 
      fieldMetadata={fieldMetadata} 
      formData={formData} 
      errors={errors} 
      onChange={onChange} 
    />;
  }

  if (activeTab === 'category') {
    return <CategoryDetailsTab 
      fieldMetadata={fieldMetadata} 
      formData={formData} 
      errors={errors} 
      onChange={onChange}
      categoryDisplayName={categoryDisplayName}
    />;
  }

  return null;
};

// Core Information Tab
const CoreInformationTab = ({ fieldMetadata, formData, errors, onChange }) => {
  const commonFields = fieldMetadata.common_fields || [];

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {commonFields.map((fieldMeta, index) => (
          <FormField
            key={fieldMeta.name}
            fieldMeta={fieldMeta}
            value={formData[fieldMeta.name] || ''}
            error={errors[fieldMeta.name]}
            onChange={onChange}
            showDivider={index < commonFields.length - 1} 
          />
        ))}
      </div>
    </div>
  );
};

// Contact Persons Tab
const ContactPersonsTab = ({ fieldMetadata, formData, errors, onChange }) => {
  const contactFields = fieldMetadata.contact_fields || [];
  
  // Group contact fields by contact number (1-4)
  const groupedContacts = [1, 2, 3, 4].map(contactNum => {
    return contactFields.filter(field => 
      field.name.includes(`_${contactNum}`)
    );
  });

  const totalFields = contactFields.length;

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      {/* Section Header */}
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-blue-900">
          Contact Persons
          <span className="ml-2 text-sm text-blue-500">({totalFields} fields)</span>
        </h3>
      </div>

      {/* Contact Groups */}
      <div className="p-6 space-y-8">
        {groupedContacts.map((group, index) => 
          group.length > 0 && (
            <div key={index} className="border-l-4 border-blue-500 pl-6">
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
                    compact
                  />
                ))}
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
};

// Category Details Tab - Simple Grid Layout
const CategoryDetailsTab = ({ 
  fieldMetadata, 
  formData, 
  errors, 
  onChange, 
  categoryDisplayName
}) => {
  const categoryFields = fieldMetadata.category_fields || [];

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      {/* Section Header */}
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-blue-900">
          {categoryDisplayName} Details
          <span className="ml-2 text-sm text-blue-500">({categoryFields.length} fields)</span>
        </h3>
      </div>

      {/* All Fields in Simple Grid - Each Row One Field */}
      <div className="p-6">
        <div className="space-y-0">
          {categoryFields.map((fieldMeta, index) => (
            <FormField
              key={fieldMeta.name}
              fieldMeta={fieldMeta}
              value={formData[fieldMeta.name] || ''}
              error={errors[fieldMeta.name]}
              onChange={onChange}
              fullWidth
              showDivider={index < categoryFields.length - 1}
            />
          ))}
        </div>
      </div>
    </div>
  );
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
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor={name} className="ml-2 block text-sm text-gray-900">
            {label}
          </label>
        </div>
        {showDivider && <hr className="my-6 h-px border-t-0 bg-gray-200" />}
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
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
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
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            error ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
      </div>
    </>
  );
};

export default AddSiteToProjectPage;
