// frontend/src/pages/ViewSitePage.jsx
// ✅ FIXED VERSION - With ToastContainer

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import DataCollectorLayout from '../components/layout/DataCollectorLayout';
import NotesTab from '../components/NotesTab';
import CallingStatusSelector from '../components/calling/CallingStatusSelector';
import CallTimeline from '../components/calling/CallTimeline';
import FieldWithConfirmation from '../components/calling/FieldWithConfirmation';
import { useFieldConfirmations } from '../hooks/useFieldConfirmations';
import { ToastContainer } from '../components/Toast';  
import { useToast } from '../hooks/useToast'; 
import StatusHistory from '../components/calling/StatusHistory';
import StatusHistoryModal from '../components/calling/StatusHistoryModal';
import {
  ArrowLeft, Edit2, Building2, Users, Info, MessageSquare, Phone,
  CheckCircle, XCircle, CheckCircle as CheckIcon, PlusCircle, FileText, History
} from 'lucide-react';

const ViewSitePage = () => {
  const { projectId, siteId } = useParams();
  const navigate = useNavigate();
  const { toasts, removeToast } = useToast();  // ← INITIALIZE TOAST HOOK
  
  const [activeTab, setActiveTab] = useState('core');
  const [notesCount, setNotesCount] = useState(0);
  const [siteData, setSiteData] = useState(null);
  const [fieldMetadata, setFieldMetadata] = useState(null);
  const [loading, setLoading] = useState(true);

  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Add confirmations hook
  const {
    confirmations,
    isLoading: confirmationsLoading,
  } = useFieldConfirmations(siteId);

  useEffect(() => {
    const fetchSiteDetails = async () => {
      try {
        setLoading(true);
        // FIXED: First, fetch the site data to get the category
        const siteResponse = await api.get(`/api/projects/sites/${siteId}/`);
        
        // Then, fetch field metadata using the category from site data
        const metadataResponse = await api.get(`/api/fields/metadata/${siteResponse.data.category}/`);
        
        setSiteData(siteResponse.data);
        setFieldMetadata(metadataResponse.data);
      } catch (error) {
        console.error('Error fetching site details:', error);
        alert('Failed to load site data. Returning to project details.');
        navigate(`/projects/${projectId}`);
      } finally {
        setLoading(false);
      }
    };

    fetchSiteDetails();
  }, [siteId, projectId, navigate]);

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

  if (loading) {
    return (
      <DataCollectorLayout pageTitle="Loading...">
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-center mt-4 text-gray-600">Loading site details...</p>
          </div>
        </div>
      </DataCollectorLayout>
    );
  }

  if (!siteData || !fieldMetadata) {
    return (
      <DataCollectorLayout pageTitle="Error">
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <p className="text-red-600">Failed to load site data</p>
            <button
              onClick={() => navigate(`/projects/${projectId}`)}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Back to Project
            </button>
          </div>
        </div>
      </DataCollectorLayout>
    );
  }

  return (
    <DataCollectorLayout pageTitle={siteData.company_name || 'Site Details'}>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header with navigation buttons */}
        <div className="mb-6 flex justify-between items-center">
          <button
            onClick={() => navigate(`/projects/${projectId}`)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Site
          </button>

          <button
            onClick={() => navigate(`/projects/${projectId}/sites/${siteId}/edit`)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Edit2 className="w-4 h-4" />
            Edit Site
          </button>
        </div>

        {/* Main Content Card */}
        <div className="bg-white rounded-lg shadow-lg">
          {/* Header with Field Confirmations Info */}
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-indigo-900">{siteData.company_name}</h2>
                <p className="text-sm text-gray-600 mt-1">{siteData.website || 'No website'}</p>
              </div>
              
              {/* Field Confirmations Legend (Read-only) */}
              <div className="ml-6">
                <div className="bg-gray-50 border border-gray-300 rounded-lg p-3">
                  <h3 className="text-xs font-semibold text-gray-700 mb-2">
                    Field Confirmations
                  </h3>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <div className="flex items-center gap-1 px-2 py-1 bg-green-200 border border-green-300 rounded">
                      <FileText className="w-3 h-3 text-green-600" />
                      <span className="text-gray-700">Pre-filled</span>
                    </div>
                    <div className="flex items-center gap-1 px-2 py-1 bg-green-500 border border-green-300 rounded">
                      <CheckIcon className="w-3 h-3 text-green-600" />
                      <span className="text-gray-700">Confirmed</span>
                    </div>
                    <div className="flex items-center gap-1 px-2 py-1 bg-yellow-200 border border-yellow-300 rounded">
                      <PlusCircle className="w-3 h-3 text-yellow-600" />
                      <span className="text-gray-700">New Data</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px px-6">
              <button
                onClick={() => setActiveTab('core')}
                className={`px-6 py-3 font-medium transition-colors flex items-center gap-2 ${
                  activeTab === 'core'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Building2 className="w-4 h-4" />
                Core Information
              </button>
              <button
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
              <button
                onClick={() => setActiveTab('technical')}
                className={`px-6 py-3 font-medium transition-colors flex items-center gap-2 ${
                  activeTab === 'technical'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Info className="w-4 h-4" />
                Technical Details
              </button>
              <button
                onClick={() => setActiveTab('calling')}
                className={`px-6 py-3 font-medium transition-colors flex items-center gap-2 ${
                  activeTab === 'calling'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Phone className="w-4 h-4" />
                Calling Workflow
                {siteData.total_calls > 0 && (
                  <span className="ml-1 px-2 py-0.5 text-xs font-semibold bg-blue-600 text-white rounded-full">
                    {siteData.total_calls}
                  </span>
                )}
              </button>
              <button
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

          {/* Content */}
          <div className="p-6 min-h-[400px]">
            {activeTab === 'core' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {fieldMetadata.common_fields.map(field => (
                  <DisplayField 
                    key={field.name}
                    fieldName={field.name}
                    label={field.label} 
                    value={siteData[field.name]}
                    fieldType={field.type}
                    confirmations={confirmations}
                  />
                ))}
              </div>
            )}

            {activeTab === 'contacts' && (
              <div className="space-y-6">
                {[1, 2, 3, 4].map(num => {
                  const contactFields = fieldMetadata.contact_fields.filter(f => 
                    f.name.includes(`_${num}`)
                  );
                  // Only show contact section if it has data
                  const hasData = contactFields.some(field => siteData[field.name]);
                  
                  if (!hasData) return null;
                  
                  return (
                    <div key={num} className="border-l-4 border-blue-500 pl-6">
                      <h4 className="text-md font-semibold text-gray-800 mb-4">Contact {num}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {contactFields.map(field => (
                          <DisplayField 
                            key={field.name}
                            fieldName={field.name}
                            label={field.label} 
                            value={siteData[field.name]}
                            confirmations={confirmations}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === 'technical' && (
              <div className="space-y-4">
                {fieldMetadata.category_fields.map(field => (
                  <DisplayField 
                    key={field.name}
                    fieldName={field.name}
                    label={field.label} 
                    value={siteData[field.name]} 
                    fullWidth 
                    fieldType={field.type}
                    confirmations={confirmations}
                  />
                ))}
              </div>
            )}

            {activeTab === 'calling' && (
              <div className="space-y-6">
                <CallingStatusSelector 
                  siteId={siteId}
                  currentStatus={siteData.calling_status}
                  readOnly={true}
                />

                {/* View History Button */}
                {siteData.calling_status !== 'NOT_STARTED' && (
                  <div className="border-t border-gray-200 pt-6">
                    <button
                      onClick={() => setShowHistoryModal(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 border border-blue-300 rounded-lg hover:bg-blue-200 transition-colors"
                    >
                      <History className="w-4 h-4" />
                      View Status Change History
                    </button>
                  </div>
                )}

                <div className="border-t border-gray-200 pt-6">
                  <CallTimeline siteId={siteId} readOnly={true} />
                </div>
              </div>
            )}

            {activeTab === 'notes' && (
              <NotesTab 
                siteId={siteId}
                readOnly={true}  
                onNotesCountChange={setNotesCount} 
              />
            )}
          </div>
        </div>
      </div>

      {/* Status History Modal */}
      <StatusHistoryModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        siteId={siteId}
      />
          
      {/* ✅ ADD TOAST CONTAINER HERE */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </DataCollectorLayout>
  );
};

// Display Field Component (read-only with confirmations)
const DisplayField = ({ label, value, fullWidth = false, fieldType = 'text', fieldName = '', confirmations = {} }) => {
  const renderValue = () => {
    if (fieldType === 'checkbox') {
      return value === true ? (
        <span className="text-green-600 flex items-center gap-2">
          <CheckCircle className="w-4 h-4" /> Yes
        </span>
      ) : value === false ? (
        <span className="text-red-600 flex items-center gap-2">
          <XCircle className="w-4 h-4" /> No
        </span>
      ) : '-';
    }
    return value || '-';
  };

  return (
    <FieldWithConfirmation
      fieldName={fieldName}
      fieldValue={value}
      confirmation={confirmations[fieldName] || {}}
      onToggleConfirmation={() => {}} // Read-only, no toggle
      readOnly={true}
      showConfirmations={true}
    >
      <div className={fullWidth ? "md:col-span-2" : ""}>
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <div className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded border border-gray-200 min-h-[38px]">
          {renderValue()}
        </div>
      </div>
    </FieldWithConfirmation>
  );
};

export default ViewSitePage;