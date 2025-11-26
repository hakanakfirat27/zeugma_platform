// frontend/src/pages/AddSiteToProjectPage.jsx
// Page for adding new sites to a project - UPDATED with Calling Workflow tab

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { getBreadcrumbs } from '../../utils/breadcrumbConfig';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowLeft, Save, X, Building2, Users, Info, MessageSquare, Phone, CheckCircle, PlusCircle, FileText } from 'lucide-react';
import useToast from '../../hooks/useToast';
import { ToastContainer } from '../../components/Toast';
import api from '../../utils/api';
import DataCollectorLayout from '../../components/layout/DataCollectorLayout';
import { CATEGORIES } from '../../constants/categories';
import CountrySelector from '../../components/form/CountrySelector';
import NotesTab from '../../components/calling/NotesTab';
import CancelConfirmationModal from '../../components/modals/CancelConfirmationModal';
import FieldWithConfirmation from '../../components/calling/FieldWithConfirmation';
import { useFieldConfirmations } from '../../hooks/useFieldConfirmations';

const AddSiteToProjectPage = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { success, error: showError } = useToast();
  const [selectedCategory, setSelectedCategory] = useState('');
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('core'); // core, contacts, category, calling, notes
  const [savedSiteId, setSavedSiteId] = useState(null); // Track saved site ID for notes
  const [showCancelModal, setShowCancelModal] = useState(false);

  // ✅ ADD: Field confirmations hook (only active after site is saved)
  const {
    confirmations,
    isLoading: confirmationsLoading,
    handleToggleConfirmation,
    autoMarkFieldsOnLoad,
    isSaving: isSavingConfirmations,
  } = useFieldConfirmations(savedSiteId); // Uses savedSiteId (null until save)
  
  // ✅ ADD: State to show/hide confirmations (only show after save)
  const [showConfirmations, setShowConfirmations] = useState(false);
  
  // ✅ ADD: Track if we've auto-marked fields after save
  const [hasAutoMarkedAfterSave, setHasAutoMarkedAfterSave] = useState(false);

  // Fetch project details
  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const response = await api.get(`/api/projects/${projectId}/`);
      return response.data;
    },
  });

  const location = useLocation();
  const breadcrumbs = getBreadcrumbs(location.pathname, {
    projectName: project?.project_name 
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


  // ✅ ADD: Auto-mark fields after site is saved
  useEffect(() => {
    if (
      savedSiteId && 
      !confirmationsLoading && 
      fieldMetadata && 
      !hasAutoMarkedAfterSave
    ) {
      console.log('🤖 Site saved! Auto-marking all filled fields...');
      
      // Enable confirmation display
      setShowConfirmations(true);
      
      // Collect all fields that have values
      const allFields = [
        ...(fieldMetadata.common_fields || []),
        ...(fieldMetadata.contact_fields || []),
        ...(fieldMetadata.category_fields || []),
      ];

      const fieldsToMark = allFields
        .map(field => field.name)
        .filter(fieldName => {
          const hasValue = formData[fieldName] && 
                          formData[fieldName].toString().trim() !== '';
          return hasValue;
        });

      if (fieldsToMark.length > 0) {
        console.log(`✅ Auto-marking ${fieldsToMark.length} fields with values`);
        autoMarkFieldsOnLoad(fieldsToMark);
      }

      setHasAutoMarkedAfterSave(true);
    }
  }, [
    savedSiteId,
    confirmationsLoading,
    fieldMetadata,
    formData,
    hasAutoMarkedAfterSave,
    autoMarkFieldsOnLoad
  ]);

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


  // ✅ ADD: Client-side validation function
  const validateForm = () => {
    const newErrors = {};
    
    // Check Company Name (always required)
    if (!formData.company_name || !formData.company_name.trim()) {
      newErrors.company_name = 'This field is required';
    }
    
    // Check Country (always required)
    if (!formData.country || !formData.country.trim()) {
      newErrors.country = 'Country is required and cannot be empty. Please select a country.';
    }
    
    // Add other required field validations here if needed
    
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // ✅ ADD: Validate before submitting
    const validationErrors = validateForm();
    
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      showError('Please fill in all required fields');
      // Switch to Core Information tab to show errors
      setActiveTab('core');
      return; // Stop submission
    }
    
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
      success('Site saved successfully! Redirecting to edit page...');
      
      // Switch to notes tab
      setTimeout(() => {
        navigate(`/projects/${projectId}/sites/${data.site_id}/edit`);
      }, 500);
      
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
      breadcrumbs={breadcrumbs}
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
            
            {/* Field Confirmations Info */}
            <div className="flex items-center gap-2">
              {!savedSiteId ? (
                // Show info box BEFORE save
                <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3 mr-2">
                  <div className="flex items-center gap-2 mb-1">
                    <Info className="w-4 h-4 text-yellow-600" />
                    <h3 className="text-xs font-semibold text-yellow-700">
                      Field Confirmations
                    </h3>
                  </div>
                  <p className="text-xs text-yellow-600">
                    Will be auto-marked after saving
                  </p>
                </div>
              ) : (
                // Show legend AFTER save
                <div className="bg-gray-50 border border-gray-300 rounded-lg p-3 mr-2">
                  <h3 className="text-xs font-semibold text-gray-700 mb-2">
                    Field Confirmations
                  </h3>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <div className="flex items-center gap-1 px-2 py-1 bg-green-200 border border-green-300 rounded">
                      <FileText className="w-3 h-3 text-green-600" />
                      <span className="text-gray-700">Pre-filled</span>
                    </div>
                    <div className="flex items-center gap-1 px-2 py-1 bg-green-500 border border-green-300 rounded">
                      <CheckCircle className="w-3 h-3 text-green-600" />
                      <span className="text-gray-700">Confirmed</span>
                    </div>
                    <div className="flex items-center gap-1 px-2 py-1 bg-yellow-200 border border-yellow-300 rounded">
                      <PlusCircle className="w-3 h-3 text-yellow-600" />
                      <span className="text-gray-700">New Data</span>
                    </div>
                  </div>
                </div>
              )}
              
              <button
                onClick={handleCancel}
                className="px-4 py-2 border border-gray-300 rounded-lg text-red-700 hover:bg-gray-50 transition-colors"
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
                Technical Details
                {getTabErrorCount('category') > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold text-white bg-red-500 rounded-full">
                    {getTabErrorCount('category')}
                  </span>
                )}
              </button>

              {/* NEW: Calling Workflow Tab */}
              <button
                type="button"
                onClick={() => setActiveTab('calling')}
                className={`px-6 py-3 font-medium transition-colors flex items-center gap-2 ${
                  activeTab === 'calling'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Phone className="w-4 h-4" />
                Calling Workflow
                {formData.total_calls > 0 && (
                  <span className="ml-1 px-2 py-0.5 text-xs font-semibold bg-blue-600 text-white rounded-full">
                    {formData.total_calls}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('notes')}
                disabled={!savedSiteId}
                className={`
                  px-6 py-3 font-medium transition-colors flex items-center gap-2
                  ${activeTab === 'notes' 
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                  ${!savedSiteId ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                <MessageSquare className="w-4 h-4" />
                Notes
                {!savedSiteId && (
                  <span className="ml-2 text-xs text-gray-400">(Save first)</span>
                )}
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'calling' ? (
              // Calling Workflow Tab - Show informational message
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
                  <Phone className="w-12 h-12 mx-auto mb-3 text-blue-600" />
                  <h3 className="text-lg font-semibold text-blue-900 mb-2">
                    Calling Workflow Not Available Yet
                  </h3>
                  <p className="text-sm text-blue-700 mb-4">
                    The calling workflow features will be available after you create this site.
                    You'll be able to track calls, update status, and confirm field data once the site is saved.
                  </p>
                  <div className="bg-white border border-blue-300 rounded-lg p-4 text-left max-w-md mx-auto">
                    <h4 className="text-sm font-semibold text-blue-900 mb-2">
                      Features Available After Saving:
                    </h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Mark fields as confirmed or new data</li>
                      <li>• Track call history and notes</li>
                      <li>• Update calling status (Yellow, Red, Purple, Blue, Green)</li>
                      <li>• Add detailed call logs with timestamps</li>
                    </ul>
                  </div>
                </div>
              </div>
            ) : activeTab === 'notes' ? (
              savedSiteId ? (
                <NotesTab 
                  siteId={savedSiteId}
                  readOnly={false}
                />
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                  <p className="text-yellow-800">
                    Please save the site first before adding notes.
                  </p>
                </div>
              )
            ) : (
              <TabContent
                activeTab={activeTab}
                fieldMetadata={fieldMetadata}
                formData={formData}
                errors={errors}
                onChange={handleInputChange}
                categoryDisplayName={categoryDisplayName}
                confirmations={confirmations}                    
                handleToggleConfirmation={handleToggleConfirmation} 
                showConfirmations={showConfirmations}          
              />
            )}
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center">
            <button
              onClick={handleCancel}
              className="px-4 py-2 border border-gray-300 rounded-lg text-red-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            
            {savedSiteId ? (
              <button
                onClick={() => navigate(`/projects/${projectId}`)}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Done - Return to Project
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Saving Site...' : 'Save Site'}
              </button>
            )}
          </div>
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
  categoryDisplayName,
  confirmations = {},                           
  handleToggleConfirmation = () => {},          
  showConfirmations = false                     
}) => {
  if (activeTab === 'core') {
    return <CoreInformationTab 
      fieldMetadata={fieldMetadata} 
      formData={formData} 
      errors={errors} 
      onChange={onChange}
      confirmations={confirmations}                 
      handleToggleConfirmation={handleToggleConfirmation}  
      showConfirmations={showConfirmations}            
    />;
  }

  if (activeTab === 'contacts') {
    return <ContactPersonsTab 
      fieldMetadata={fieldMetadata} 
      formData={formData} 
      errors={errors} 
      onChange={onChange}
      confirmations={confirmations}                 
      handleToggleConfirmation={handleToggleConfirmation}  
      showConfirmations={showConfirmations}           
    />;
  }

  if (activeTab === 'category') {
    return <CategoryDetailsTab 
      fieldMetadata={fieldMetadata} 
      formData={formData} 
      errors={errors} 
      onChange={onChange}
      categoryDisplayName={categoryDisplayName}
      confirmations={confirmations}                  
      handleToggleConfirmation={handleToggleConfirmation}  
      showConfirmations={showConfirmations} 
    />;
  }

  return null;
};

// Core Information Tab
const CoreInformationTab = ({ 
  fieldMetadata, 
  formData, 
  errors, 
  onChange,
  confirmations = {},
  handleToggleConfirmation = () => {},
  showConfirmations = false
}) => {

  // Add null check
  if (!fieldMetadata || !fieldMetadata.common_fields) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

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
            // ✅ ADD: Confirmation props
            confirmations={confirmations}
            handleToggleConfirmation={handleToggleConfirmation}
            showConfirmations={showConfirmations}
          />
        ))}
      </div>
    </div>
  );
};

// Contact Persons Tab
const ContactPersonsTab = ({ 
  fieldMetadata, 
  formData, 
  errors, 
  onChange,
  confirmations = {},
  handleToggleConfirmation = () => {},
  showConfirmations = false
}) => {

  // Add null check
  if (!fieldMetadata || !fieldMetadata.contact_fields) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

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
                    // ✅ ADD: Confirmation props
                    confirmations={confirmations}
                    handleToggleConfirmation={handleToggleConfirmation}
                    showConfirmations={showConfirmations}
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
  categoryDisplayName,
  confirmations = {},
  handleToggleConfirmation = () => {},
  showConfirmations = false
}) => {
  
  // Add null check
  if (!fieldMetadata || !fieldMetadata.category_fields) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

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
              // ✅ ADD: Confirmation props
              confirmations={confirmations}
              handleToggleConfirmation={handleToggleConfirmation}
              showConfirmations={showConfirmations}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// Form Field Component
const FormField = ({ 
  fieldMeta, 
  value, 
  error, 
  onChange, 
  fullWidth = false, 
  showDivider = false,
  // ✅ ADD: Confirmation props
  confirmations = {},
  handleToggleConfirmation = () => {},
  showConfirmations = false
}) => {
  const { name, label, type, required } = fieldMeta;

  if (name === 'country' || label.toLowerCase() === 'country') {
    return (
      <FieldWithConfirmation
        fieldName={name}
        fieldValue={value}
        confirmation={confirmations[name] || {}}
        onToggleConfirmation={handleToggleConfirmation}
        readOnly={false}
        showConfirmations={showConfirmations}
      >
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
      </FieldWithConfirmation>
    );
  }

  if (type === 'checkbox') {
    return (
      <FieldWithConfirmation
        fieldName={name}
        fieldValue={value}
        confirmation={confirmations[name] || {}}
        onToggleConfirmation={handleToggleConfirmation}
        readOnly={false}
        showConfirmations={showConfirmations}
      >
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
      </FieldWithConfirmation>
    );
  }

  if (type === 'textarea') {
    return (
      <FieldWithConfirmation
        fieldName={name}
        fieldValue={value}
        confirmation={confirmations[name] || {}}
        onToggleConfirmation={handleToggleConfirmation}
        readOnly={false}
        showConfirmations={showConfirmations}
      >
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
      </FieldWithConfirmation>
    );
  }

  return (
    <FieldWithConfirmation
      fieldName={name}
      fieldValue={value}
      confirmation={confirmations[name] || {}}
      onToggleConfirmation={handleToggleConfirmation}
      readOnly={false}
      showConfirmations={showConfirmations}
    >
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
    </FieldWithConfirmation>
  );
};

export default AddSiteToProjectPage;