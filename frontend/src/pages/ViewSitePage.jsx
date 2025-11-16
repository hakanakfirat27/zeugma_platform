// frontend/src/pages/ViewSitePage.jsx
// Standalone page for viewing site details (converted from ViewSiteModal)

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import DataCollectorLayout from '../components/layout/DataCollectorLayout';
import NotesTab from '../components/NotesTab';
import {
  ArrowLeft, Edit2, Building2, Users, Info, MessageSquare,
  CheckCircle, XCircle
} from 'lucide-react';

const ViewSitePage = () => {
  const { projectId, siteId } = useParams();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('core');
  const [notesCount, setNotesCount] = useState(0);
  const [siteData, setSiteData] = useState(null);
  const [fieldMetadata, setFieldMetadata] = useState(null);
  const [loading, setLoading] = useState(true);

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
          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <h2 className="text-2xl font-bold text-indigo-900">{siteData.company_name}</h2>
            <p className="text-sm text-gray-600 mt-1">{siteData.website || 'No website'}</p>
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
                    label={field.label} 
                    value={siteData[field.name]} 
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
                            label={field.label} 
                            value={siteData[field.name]} 
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
                    label={field.label} 
                    value={siteData[field.name]} 
                    fullWidth 
                    fieldType={field.type}
                  />
                ))}
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
    </DataCollectorLayout>
  );
};

// Display Field Component (read-only)
const DisplayField = ({ label, value, fullWidth = false, fieldType = 'text' }) => {
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
    <div className={fullWidth ? "md:col-span-2" : ""}>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded border border-gray-200 min-h-[38px]">
        {renderValue()}
      </div>
    </div>
  );
};

export default ViewSitePage;