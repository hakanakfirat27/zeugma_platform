// frontend/src/pages/EditSitePage.jsx

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import DataCollectorLayout from '../components/layout/DataCollectorLayout';
import CountrySelector from '../components/form/CountrySelector';
import NotesTab from '../components/NotesTab';
import CancelConfirmationModal from '../components/CancelConfirmationModal';
import { ToastContainer } from '../components/Toast';
import { useToast } from '../hooks/useToast';

import CallTimeline from '../components/calling/CallTimeline';
import CallingStatusSelector from '../components/calling/CallingStatusSelector';
import FieldWithConfirmation from '../components/calling/FieldWithConfirmation';
import { useFieldConfirmations } from '../hooks/useFieldConfirmations';
import StatusHistoryModal from '../components/calling/StatusHistoryModal';
import { getFieldConfirmationStyle } from '../utils/fieldStyles';
import ThankYouEmailModal from '../components/modals/ThankYouEmailModal';

import {
  ArrowLeft, Save, Building2, Users, Info, MessageSquare, Phone,
  CheckCircle, PlusCircle, FileText, History  
} from 'lucide-react';

const EditSitePage = () => {
  const { projectId, siteId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toasts, removeToast, success, error: showError } = useToast();
  
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('core');
  const [notesCount, setNotesCount] = useState(0);
  const [callsCount, setCallsCount] = useState(0); 
  const [fieldMetadata, setFieldMetadata] = useState(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [originalCompanyName, setOriginalCompanyName] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);

  // Field confirmations hook
  const {
    confirmations,
    isLoading: confirmationsLoading,
    handleToggleConfirmation,
    autoMarkPreFilled,
    autoMarkFieldsOnLoad,  // ← NEW: Function to mark all pre-filled fields on load
    handleSaveAll: saveConfirmations,
    isSaving: isSavingConfirmations,
  } = useFieldConfirmations(siteId);
  
  // State to toggle confirmation display (default: true)
  const [showConfirmations, setShowConfirmations] = useState(false);

  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // ✅ NEW: Track if we've already auto-marked fields on load
  const [hasAutoMarkedOnLoad, setHasAutoMarkedOnLoad] = useState(false);

  const handleEmailSent = (details) => {
    // Refresh call logs to show the new email log entry
    if (typeof refetchCallLogs === 'function') {
      refetchCallLogs();
    }
  };

  const fetchData = async () => {
    try {
      setIsLoadingData(true);
      const siteResponse = await api.get(`/api/projects/sites/${siteId}/`);
      const metadataResponse = await api.get(`/api/fields/metadata/${siteResponse.data.category}/`);
      
      setFormData(siteResponse.data);
      setOriginalCompanyName(siteResponse.data.company_name);
      setCallsCount(siteResponse.data.total_calls || 0);
      setFieldMetadata(metadataResponse.data);
    } catch (error) {
      console.error('Error loading data:', error);
      showError('Failed to load site data. Returning to project details.');
      setTimeout(() => navigate(`/projects/${projectId}`), 2000);
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [siteId, projectId, navigate, showError]);

  // Fetch notes count for badge
  useEffect(() => {
    const fetchNotesCount = async () => {
      if (!siteId) return;
      
      try {
        const response = await api.get(`/api/sites/${siteId}/notes/`);
        setNotesCount(response.data.length);
      } catch (error) {
        console.error('Failed to fetch notes count:', error);
      }
    };

    fetchNotesCount();
  }, [siteId]);

  // ✅ NEW: Function to refetch site data and update counts
  const refetchSiteData = async () => {
    try {
      const response = await api.get(`/api/projects/sites/${siteId}/`);
      setFormData(response.data);
      setCallsCount(response.data.total_calls || 0);
    } catch (error) {
      console.error('Failed to refetch site data:', error);
    }
  };

  // ✅ NEW: Auto-mark pre-filled fields once data and confirmations are loaded
  useEffect(() => {
    if (
      !isLoadingData && 
      !confirmationsLoading && 
      formData && 
      fieldMetadata && 
      !hasAutoMarkedOnLoad
    ) {
      // Auto-mark all fields that have values but no confirmation
      const fieldsToCheck = [
        ...(fieldMetadata.common_fields || []),
        ...(fieldMetadata.contact_fields || []),
        ...(fieldMetadata.category_fields || []),
      ];

      const fieldsToMark = fieldsToCheck
        .map(field => field.name)
        .filter(fieldName => {
          const hasValue = formData[fieldName] && formData[fieldName].toString().trim() !== '';
          const noConfirmation = !confirmations[fieldName] || (
            !confirmations[fieldName].is_confirmed &&
            !confirmations[fieldName].is_new_data &&
            !confirmations[fieldName].is_pre_filled
          );
          return hasValue && noConfirmation;
        });

      if (fieldsToMark.length > 0) {
        console.log('Auto-marking pre-filled fields:', fieldsToMark);
        autoMarkFieldsOnLoad(fieldsToMark);
      }

      setHasAutoMarkedOnLoad(true);
    }
  }, [
    isLoadingData, 
    confirmationsLoading, 
    formData, 
    fieldMetadata, 
    confirmations,
    hasAutoMarkedOnLoad,
    autoMarkFieldsOnLoad
  ]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setIsSubmitting(true);
    setErrors({});

    try {
      await api.put(`/api/projects/sites/${siteId}/update/`, formData);
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries(['project-sites', projectId]);
      queryClient.invalidateQueries(['project', projectId]);
      
      success('Site updated successfully!');
      
      // Navigate back to project details after short delay
      setTimeout(() => {
        navigate(`/projects/${projectId}`);
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

  const handleInputChange = (fieldName, value) => {
    console.log(`\n📝 handleInputChange called: field="${fieldName}", value="${value}"`);
    
    // Update form data immediately
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
  
  // ✅ NEW AUTO-MARK LOGIC: Check if field now has value and needs marking
  const valueIsNotEmpty = value && value.toString().trim() !== '';
  
  if (valueIsNotEmpty) {
    // Small delay to let React state settle, then check and mark if needed
    setTimeout(() => {
      const currentConfirmation = confirmations[fieldName];
      
      // Only auto-mark if field has NO confirmation markers at all
      const hasNoMarkers = !currentConfirmation || (
        !currentConfirmation.is_confirmed &&
        !currentConfirmation.is_new_data &&
        !currentConfirmation.is_pre_filled
      );
      
      if (hasNoMarkers) {
        console.log(`✅ Auto-marking field "${fieldName}" as pre-filled`);
        autoMarkPreFilled(fieldName);
      } else {
        console.log(`⏭️ Field "${fieldName}" already has markers, skipping auto-mark`);
      }
    }, 150);
  }
};

  const handleCancel = () => {
    setShowCancelModal(true);
  };

  const handleConfirmCancel = () => {
    setShowCancelModal(false);
    navigate(`/projects/${projectId}`);
  };

  if (isLoadingData) {
    return (
      <DataCollectorLayout pageTitle="Loading...">
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-center mt-4 text-gray-600">Loading site data...</p>
          </div>
        </div>
      </DataCollectorLayout>
    );
  }

  return (
    <DataCollectorLayout pageTitle={`Edit: ${originalCompanyName}`}>
      <div className="p-6 max-w-7xl mx-auto">

        {/* Header with navigation */}
        <div className="mb-6 flex justify-between items-center">
          <button
            onClick={handleCancel}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <ArrowLeft className="w-5 h-5" />
            Cancel & Go Back
          </button>

          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        {/* Main Content Card */}
        <div className="bg-white rounded-lg shadow-lg">
          {/* Header with Field Confirmations */}
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Edit Site: {originalCompanyName}</h2>
                <p className="text-sm text-gray-600 mt-1">Make changes to the site information below</p>
              </div>
              
              {/* Field Confirmations Section */}
              <div className="ml-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 min-w-[300px]">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-blue-900">
                      Field Confirmations
                    </h3>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showConfirmations}
                        onChange={(e) => setShowConfirmations(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-xs font-medium text-blue-900">
                        Show
                      </span>
                    </label>
                  </div>
                  
                  {showConfirmations && (
                    <div className="space-y-2">
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
                      <p className="text-xs text-gray-600 italic">
                        ✓ Auto-saves on change
                      </p>
                      {isSavingConfirmations && (
                        <p className="text-xs text-blue-600 italic">
                          💾 Saving confirmations...
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <form 
            onSubmit={handleSubmit}
            onKeyDown={(e) => {
              if ((activeTab === 'notes' || activeTab === 'calling') && e.key === 'Enter' && !e.ctrlKey) {
                e.preventDefault();
              }
            }}
          >
            {/* Tabs */}
            <div className="border-b border-gray-200">
              <nav className="flex -mb-px px-6">
                {/* Core Information Tab */}
                <button
                  type="button"
                  onClick={() => setActiveTab('core')}
                  className={`px-6 py-3 font-medium transition-colors flex items-center gap-2 ${
                    activeTab === 'core'
                      ? 'border-b-2 border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  Core Information
                {getTabErrorCount('core') > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold text-white bg-red-500 rounded-full">
                    {getTabErrorCount('core')}
                  </span>
                )}                  
                </button>

                {/* Contact Persons Tab */}
                <button
                  type="button"
                  onClick={() => setActiveTab('contacts')}
                  className={`px-6 py-3 font-medium transition-colors flex items-center gap-2 ${
                    activeTab === 'contacts'
                      ? 'border-b-2 border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  Contact Persons
                </button>

                {/* Technical Details Tab */}
                <button
                  type="button"
                  onClick={() => setActiveTab('category')}
                  className={`px-6 py-3 font-medium transition-colors flex items-center gap-2 ${
                    activeTab === 'category'
                      ? 'border-b-2 border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Info className="w-4 h-4" />
                  Technical Details
                </button>

                {/* Calling Workflow Tab */}
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
                  {callsCount > 0 && (
                    <span className="ml-1 px-2 py-0.5 text-xs font-semibold bg-blue-600 text-white rounded-full">
                      {callsCount}
                    </span>
                  )}
                </button>

                {/* Notes Tab */}
                <button
                  type="button"
                  onClick={() => setActiveTab('notes')}
                  className={`px-6 py-3 font-medium transition-colors flex items-center gap-2 ${
                    activeTab === 'notes'
                      ? 'border-b-2 border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                  Notes
                  {notesCount > 0 && (
                    <span className="ml-1 px-2 py-0.5 text-xs font-semibold bg-blue-600 text-white rounded-full">
                      {notesCount}
                    </span>
                  )}
                </button>
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {activeTab === 'calling' ? (
                <div className="space-y-6">
                  <CallingStatusSelector 
                    siteId={siteId}
                    currentStatus={formData.calling_status}
                    onStatusChange={fetchData}
                  />
                  {/* View History Button */}
                  {formData.calling_status !== 'NOT_STARTED' && (
                    <div className="border-t border-gray-200 pt-6">
                      <button
                        type="button"
                        onClick={() => setShowHistoryModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 border border-blue-300 rounded-lg hover:bg-blue-200 transition-colors"
                      >
                        <History className="w-4 h-4" />
                        Status Change History
                      </button>
                    </div>
                  )}  

                  {/* Thank You Email Button */}
                  <div className="mb-6">
                    <button
                      type="button"
                      onClick={() => setIsEmailModalOpen(true)}
                      className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 shadow-md hover:shadow-lg"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <span>Send Thank You Email</span>
                    </button>
                  </div>

                  {/* Call Timeline */}
                  <div className="border-t border-gray-200 pt-6">            
                    <CallTimeline 
                      siteId={siteId}
                      onCallsChange={refetchSiteData}  
                      toastSuccess={success}
                      toastError={showError}                      
                    />
                  </div>
                </div>  
              ) : activeTab === 'notes' ? (
                <NotesTab 
                  siteId={siteId}
                  readOnly={false}
                  onNotesCountChange={setNotesCount}
                  toastSuccess={success}
                  toastError={showError}
               
                />
              ) : (
                <EditTabContent
                  activeTab={activeTab}
                  fieldMetadata={fieldMetadata}
                  formData={formData}
                  errors={errors}
                  onChange={handleInputChange}
                  confirmations={confirmations}
                  handleToggleConfirmation={handleToggleConfirmation}
                  showConfirmations={showConfirmations}
                />
              )}
            </div>

            {/* Footer Actions */}
            <div className="bg-gray-50 px-4 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>

        {/* Status History Modal */}
        <StatusHistoryModal
          isOpen={showHistoryModal}
          onClose={() => setShowHistoryModal(false)}
          siteId={siteId}
        />

        {/* Toast Container */}
        <ToastContainer toasts={toasts} removeToast={removeToast} />

        {/* Cancel Confirmation Modal */}
        <CancelConfirmationModal
          isOpen={showCancelModal}
          onClose={() => setShowCancelModal(false)}
          onConfirm={handleConfirmCancel}
          title="Confirm Cancellation"
          message="Are you sure you want to cancel? Any unsaved changes will be lost."
        />

        {/* Thank You Email Modal */}
        <ThankYouEmailModal
          isOpen={isEmailModalOpen}
          onClose={() => setIsEmailModalOpen(false)}
          siteId={siteId}
          companyName={formData?.company_name || ''}
          onEmailSent={handleEmailSent}
        />

      </div>
    </DataCollectorLayout>
  );
};

// Edit Tab Content Component
const EditTabContent = ({ 
  activeTab, 
  fieldMetadata, 
  formData, 
  errors, 
  onChange,
  confirmations,
  handleToggleConfirmation,
  showConfirmations
}) => {
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
            confirmations={confirmations}
            handleToggleConfirmation={handleToggleConfirmation}
            showConfirmations={showConfirmations}
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
            confirmations={confirmations}
            handleToggleConfirmation={handleToggleConfirmation}
            showConfirmations={showConfirmations}
          />
        ))}
      </div>
    );
  }

  return null;
};

// Form Field Component
const FormField = ({ 
  fieldMeta, 
  value, 
  error, 
  onChange, 
  fullWidth = false, 
  showDivider = false,
  confirmations = {},
  handleToggleConfirmation = () => {},
  showConfirmations = false
}) => {
  const { name, label, type, required } = fieldMeta;

  // ✅ Calculate styles directly from confirmation data
  const hasValue = value && value.toString().trim() !== '';
  const confirmation = confirmations[name] || {};
  const fieldStyle = getFieldConfirmationStyle(confirmation, hasValue);

  const renderField = () => {
    if (name === 'country' || label.toLowerCase() === 'country') {
      return (
        <>
          <div className={fullWidth ? "md:col-span-2 py-3" : ""}>
            {/* ✅ ADD THIS WRAPPER */}
            <div 
              className="p-3 rounded-lg"
              style={fieldStyle}
            >
              <CountrySelector
                value={value || ''}
                onChange={(countryName) => onChange(name, countryName)}
                error={error}
                required={required}
                label={label}
              />
            </div>
            {/* ✅ END WRAPPER */}
          </div>
          {showDivider && <hr className="my-0 h-px border-t-0 bg-gray-200" />}
        </>
      );
    }

    if (type === 'checkbox') {
      return (
        <>
          <div 
            className="flex items-center py-4 px-3 rounded-lg"
            style={fieldStyle}  
          >  
            <input
              type="checkbox"
              id={name}
              checked={value || false}
              onChange={(e) => onChange(name, e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            {/* ✅ Label NOT colored */}
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
            {/* ✅ Label NOT colored */}
            <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
              {label}
              {required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {/* ✅ Apply inline styles directly */}
            <textarea
              id={name}
              value={value || ''}
              onChange={(e) => onChange(name, e.target.value)}
              rows={3}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                error ? 'border-red-500' : 'border-gray-300'
              }`}
              style={fieldStyle}
            />
            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
          </div>
        </>
      );
    }

    // Regular input fields
    return (
      <>
        <div className={fullWidth ? "md:col-span-2 py-3" : ""}>
          {/* ✅ Label NOT colored */}
          <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
          {/* ✅ Apply inline styles directly */}
          <input
            type={type}
            id={name}
            value={value || ''}
            onChange={(e) => onChange(name, e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              error ? 'border-red-500' : 'border-gray-300'
            }`}
            style={fieldStyle}
          />
          {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
        </div>
      </>
    );
  };

  return (
    <FieldWithConfirmation
      fieldName={name}
      fieldValue={value}
      confirmation={confirmation}
      onToggleConfirmation={handleToggleConfirmation}
      readOnly={false}
      showConfirmations={showConfirmations}
    >
      {renderField()}
    </FieldWithConfirmation>
  );
};

export default EditSitePage;