// frontend/src/pages/UnverifiedSiteDetailPage.jsx
// Standalone page for viewing unverified site details (ADMIN SIDE)
// Uses DashboardLayout for admin interface

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import NotesTab from '../../components/calling/NotesTab';
import {
  ArrowLeft, Edit2, Building2, Users, Info, MessageSquare,
  CheckCircle, XCircle, AlertCircle, Clock, Calendar, User
} from 'lucide-react';

const UnverifiedSiteDetailPage = () => {
  const { siteId } = useParams();
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
        
        // Fetch the unverified site data
        const siteResponse = await api.get(`/api/unverified-sites/${siteId}/`);
        
        // Fetch field metadata using the category from site data
        const metadataResponse = await api.get(`/api/fields/metadata/${siteResponse.data.category}/`);
        
        setSiteData(siteResponse.data);
        setFieldMetadata(metadataResponse.data);
      } catch (error) {
        console.error('Error fetching unverified site details:', error);
        alert('Failed to load site data. Returning to unverified sites list.');
        navigate('/unverified-sites');
      } finally {
        setLoading(false);
      }
    };

    fetchSiteDetails();
  }, [siteId, navigate]);

  // Get status badge styling
  const getStatusBadge = (status) => {
    const statusStyles = {
      'PENDING': 'bg-yellow-100 text-yellow-800',
      'UNDER_REVIEW': 'bg-blue-100 text-blue-800',
      'APPROVED': 'bg-green-100 text-green-800',
      'REJECTED': 'bg-red-100 text-red-800',
      'NEEDS_REVISION': 'bg-orange-100 text-orange-800',
      'TRANSFERRED': 'bg-purple-100 text-purple-800'
    };
    
    return statusStyles[status] || 'bg-gray-100 text-gray-800';
  };

  // Get priority badge styling
  const getPriorityBadge = (priority) => {
    const priorityStyles = {
      'URGENT': 'bg-red-100 text-red-800',
      'HIGH': 'bg-orange-100 text-orange-800',
      'MEDIUM': 'bg-yellow-100 text-yellow-800',
      'LOW': 'bg-green-100 text-green-800'
    };
    
    return priorityStyles[priority] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-center mt-4 text-gray-600">Loading site details...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!siteData || !fieldMetadata) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <p className="text-red-600">Failed to load site data</p>
            <button
              onClick={() => navigate('/unverified-sites')}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Back to Unverified Sites
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header with navigation buttons */}
        <div className="mb-6 flex justify-between items-center">
          <button
            onClick={() => navigate('/unverified-sites')}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Unverified Sites
          </button>

          <button
            onClick={() => navigate(`/unverified-sites/${siteId}/edit`)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Edit2 className="w-4 h-4" />
            Edit Site
          </button>
        </div>

        {/* Main Content Card */}
        <div className="bg-white rounded-lg shadow-lg">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold text-indigo-900">{siteData.company_name}</h2>
                <p className="text-sm text-gray-600 mt-1">{siteData.website || 'No website'}</p>
              </div>
              
              {/* Status and Priority Badges */}
              <div className="flex flex-col gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(siteData.verification_status)}`}>
                  {siteData.verification_status_display}
                </span>
                {siteData.priority && (
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getPriorityBadge(siteData.priority)}`}>
                    Priority: {siteData.priority_display}
                  </span>
                )}
              </div>
            </div>

            {/* Additional Info Bar */}
            <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-600">
              {siteData.collected_by_info && (
                <div className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  <span>Collected by: {siteData.collected_by_info.full_name}</span>
                </div>
              )}
              {siteData.collected_date && (
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>Collected: {new Date(siteData.collected_date).toLocaleDateString()}</span>
                </div>
              )}
              {siteData.data_quality_score !== null && (
                <div className="flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" />
                  <span>Quality Score: {siteData.data_quality_score}%</span>
                </div>
              )}
              {siteData.is_duplicate && (
                <div className="flex items-center gap-1 text-red-600">
                  <AlertCircle className="w-4 h-4" />
                  <span>Possible Duplicate</span>
                </div>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px px-6">
              <button
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
                onClick={() => setActiveTab('technical')}
                className={`px-6 py-3 font-medium transition-colors flex items-center gap-2 ${
                  activeTab === 'technical'
                    ? 'border-b-2 border-indigo-600 text-indigo-600'
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

          {/* Content */}
          <div className="p-6 min-h-[400px]">
            {activeTab === 'core' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {fieldMetadata.common_fields.map(field => (
                  <DisplayField 
                    key={field.name}
                    label={field.label} 
                    value={siteData[field.name]} 
                    fieldType={field.type}
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
                    <div key={num} className="border-l-4 border-indigo-500 pl-6">
                      <h4 className="text-md font-semibold text-gray-800 mb-4">Contact {num}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {contactFields.map(field => (
                          <DisplayField 
                            key={field.name}
                            label={field.label} 
                            value={siteData[field.name]} 
                            fieldType={field.type}
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
                readOnly={false}  
                onNotesCountChange={setNotesCount} 
              />
            )}
          </div>
        </div>

        {/* Verification History Section */}
        {siteData.verified_date && (
          <div className="mt-6 bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Verification Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {siteData.verified_by_info && (
                <div>
                  <span className="font-medium text-gray-700">Verified By:</span>
                  <span className="ml-2 text-gray-600">{siteData.verified_by_info.full_name}</span>
                </div>
              )}
              {siteData.verified_date && (
                <div>
                  <span className="font-medium text-gray-700">Verified Date:</span>
                  <span className="ml-2 text-gray-600">
                    {new Date(siteData.verified_date).toLocaleDateString()}
                  </span>
                </div>
              )}
              {siteData.assigned_to_info && (
                <div>
                  <span className="font-medium text-gray-700">Assigned To:</span>
                  <span className="ml-2 text-gray-600">{siteData.assigned_to_info.full_name}</span>
                </div>
              )}
              {siteData.source_display && (
                <div>
                  <span className="font-medium text-gray-700">Source:</span>
                  <span className="ml-2 text-gray-600">{siteData.source_display}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

// Display Field Component (read-only)
const DisplayField = ({ label, value, fullWidth = false, fieldType = 'text' }) => {
  const renderValue = () => {
    // Handle null or undefined values
    if (value === null || value === undefined || value === '') {
      return <span className="text-gray-400">-</span>;
    }

    // Handle boolean/checkbox fields
    if (fieldType === 'checkbox') {
      return value === true ? (
        <span className="text-green-600 flex items-center gap-2">
          <CheckCircle className="w-4 h-4" /> Yes
        </span>
      ) : value === false ? (
        <span className="text-red-600 flex items-center gap-2">
          <XCircle className="w-4 h-4" /> No
        </span>
      ) : (
        <span className="text-gray-400">-</span>
      );
    }

    // Handle URL fields - make them clickable
    if (fieldType === 'url' && value) {
      return (
        <a 
          href={value.startsWith('http') ? value : `https://${value}`}
          target="_blank" 
          rel="noopener noreferrer"
          className="text-indigo-600 hover:underline"
        >
          {value}
        </a>
      );
    }

    // Handle email fields - make them clickable
    if (fieldType === 'email' && value) {
      return (
        <a 
          href={`mailto:${value}`}
          className="text-indigo-600 hover:underline"
        >
          {value}
        </a>
      );
    }

    // Handle textarea fields - preserve line breaks
    if (fieldType === 'textarea' && value) {
      return <span className="whitespace-pre-wrap">{value}</span>;
    }

    // Default: return as text
    return value;
  };

  return (
    <div className={fullWidth ? "md:col-span-2" : ""}>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded border border-gray-200 min-h-[38px] flex items-center">
        {renderValue()}
      </div>
    </div>
  );
};

export default UnverifiedSiteDetailPage;