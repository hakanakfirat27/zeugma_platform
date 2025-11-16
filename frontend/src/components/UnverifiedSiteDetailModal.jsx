// frontend/src/components/UnverifiedSiteDetailModal.jsx

import { useState, useEffect } from 'react';
import { 
  X, CheckCircle, XCircle, User, Calendar, AlertTriangle, 
  Save, Edit, Building2, Users, Info, Clock, MessageSquare 
} from 'lucide-react';
import api from '../utils/api';
import LoadingSpinner from './LoadingSpinner';
import NotesTab from './NotesTab';
import { CATEGORY_COLORS } from '../constants/categories';
import { useToast } from '../hooks/useToast';  
import { ToastContainer } from './Toast';     

const UnverifiedSiteDetailModal = ({ open, onClose, site, onUpdate }) => {
  const [siteData, setSiteData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('core');
  const [history, setHistory] = useState([]);
  const [comments, setComments] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [editedData, setEditedData] = useState({});
  
  const { toasts, removeToast, success, error: showError } = useToast();
  useEffect(() => {
    if (open && site) {
      fetchSiteDetails();
      fetchHistory();
    }
  }, [open, site]);
  
  const fetchSiteDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/unverified-sites/${site.site_id}/`);
      setSiteData(response.data);
      setEditedData(response.data);
    } catch (error) {
      console.error('Error fetching site details:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchHistory = async () => {
    try {
      const response = await api.get(`/api/unverified-sites/${site.site_id}/history/`);
      setHistory(response.data);
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };
  
  const handleSaveEdit = async () => {
    try {
      setSaving(true);
      await api.put(`/api/unverified-sites/${site.site_id}/update/`, editedData);
      setSiteData(editedData);
      setEditMode(false);
      success('Changes saved successfully');
    } catch (error) {
      console.error('Error saving changes:', error);
      showErrorsuccess('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };
  
  const handleApprove = async () => {
    if (!confirm('Approve this site and transfer to Superdatabase?')) return;
    
    try {
      setSaving(true);
      await api.post(`/api/unverified-sites/${site.site_id}/approve/`, {
        comments,
        transfer_immediately: true,
      });
      success('Site approved and transferred successfully!');
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error approving site:', error);
      showError('Failed to approve site');
    } finally {
      setSaving(false);
    }
  };
  
  const handleReject = async () => {
    const reason = comments || prompt('Please provide a rejection reason:');
    if (!reason) return;
    
    try {
      setSaving(true);
      await api.post(`/api/unverified-sites/${site.site_id}/reject/`, {
        rejection_reason: reason,
      });
      success('Site rejected');
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error rejecting site:', error);
      showError('Failed to reject site');
    } finally {
      setSaving(false);
    }
  };
  
  // Helper to render checkmark or X
  const renderBoolean = (value) => {
    if (value === null || value === undefined) return null;
    return value ? (
      <CheckCircle className="w-5 h-5 text-green-500" />
    ) : (
      <XCircle className="w-5 h-5 text-gray-300" />
    );
  };
  
  // Get category display name for tab
  const getCategoryTabName = () => {
    if (!siteData) return 'Category Details';
    const categoryMap = {
      'INJECTION': 'Injection Moulder Details',
      'BLOW': 'Blow Moulder Details',
      'ROTO': 'Roto Moulder Details',
      'PE_FILM': 'PE Film Extruder Details',
      'SHEET': 'Sheet Extruder Details',
      'PIPE': 'Pipe Extruder Details',
      'TUBE_HOSE': 'Tube & Hose Details',
      'PROFILE': 'Profile Extruder Details',
      'CABLE': 'Cable Extruder Details',
      'COMPOUNDER': 'Compounder Details',
    };
    return categoryMap[siteData.category] || 'Category Details';
  };
  
  if (!open) return null;
  
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        />
        
        {/* Modal panel */}
        <div className="inline-block w-full max-w-7xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-2xl rounded-2xl">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <LoadingSpinner />
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="bg-gradient-to-r from-teal-600 to-cyan-600 px-6 py-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-2xl font-bold text-white">
                        {siteData?.company_name}
                      </h3>
                      <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${
                        CATEGORY_COLORS[siteData?.category] || 'bg-gray-100 text-gray-800'
                      }`}>
                        {siteData?.category_display}
                      </span>
                      {editMode && (
                        <span className="inline-flex px-3 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                          Edit Mode
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-white/90">
                      <span>{siteData?.country}</span>
                      <span>•</span>
                      <span>Quality: {siteData?.data_quality_score}%</span>
                      <span>•</span>
                      <span>{siteData?.verification_status_display}</span>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="text-white/80 hover:text-white transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>
              
              {/* Tab Navigation */}
              <div className="border-b border-gray-200 bg-gray-50">
                <div className="flex px-6">
                  <button
                    onClick={() => setActiveTab('core')}
                    className={`px-6 py-3 font-medium transition-colors flex items-center gap-2 ${
                      activeTab === 'core'
                        ? 'border-b-2 border-teal-600 text-teal-600'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Building2 className="w-4 h-4" />
                    Core Information
                  </button>
                  <button
                    onClick={() => setActiveTab('contacts')}
                    className={`px-6 py-3 font-medium transition-colors flex items-center gap-2 ${
                      activeTab === 'contacts'
                        ? 'border-b-2 border-teal-600 text-teal-600'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    Contact Persons
                  </button>
                  <button
                    onClick={() => setActiveTab('category')}
                    className={`px-6 py-3 font-medium transition-colors flex items-center gap-2 ${
                      activeTab === 'category'
                        ? 'border-b-2 border-teal-600 text-teal-600'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Info className="w-4 h-4" />
                    {getCategoryTabName()}
                  </button>
                  <button
                    onClick={() => setActiveTab('history')}
                    className={`px-6 py-3 font-medium transition-colors flex items-center gap-2 ${
                      activeTab === 'history'
                        ? 'border-b-2 border-teal-600 text-teal-600'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Clock className="w-4 h-4" />
                    History
                  </button>
                  <button
                    onClick={() => setActiveTab('notes')}
                    className={`px-6 py-3 font-medium transition-colors flex items-center gap-2 ${
                      activeTab === 'notes'
                        ? 'border-b-2 border-teal-600 text-teal-600'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <MessageSquare className="w-4 h-4" />
                    Notes
                  </button>
                </div>
              </div>
              
              {/* Content */}
              <div className="flex h-[600px]">
                {/* Left: Tab Content */}
                <div className="flex-1 overflow-y-auto p-6">
                  
                  {/* CORE INFORMATION TAB */}
                  {activeTab === 'core' && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-semibold text-gray-900">Company Details</h4>
                        {!editMode && (
                          <button
                            onClick={() => setEditMode(true)}
                            className="px-3 py-1 text-sm bg-teal-50 text-teal-600 rounded-lg hover:bg-teal-100 transition-colors flex items-center gap-2"
                          >
                            <Edit className="w-4 h-4" />
                            Edit
                          </button>
                        )}
                      </div>
                      
                      {/* Category */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-700">Category</label>
                          <p className="text-gray-900 mt-1">{siteData?.category_display}</p>
                          <p className="text-xs text-gray-500 mt-1">The main category of this company.</p>
                        </div>
                      </div>
                      
                      {/* Company Name */}
                      <div>
                        <label className="text-sm font-medium text-gray-700">Company Name</label>
                        <p className="text-gray-900 mt-1">{siteData?.company_name}</p>
                      </div>
                      
                      {/* Addresses */}
                      <div className="space-y-3">
                        <div>
                          <label className="text-sm font-medium text-gray-700">Address 1</label>
                          <p className="text-gray-900 mt-1">{siteData?.address_1 || '-'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">Address 2</label>
                          <p className="text-gray-900 mt-1">{siteData?.address_2 || '-'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">Address 3</label>
                          <p className="text-gray-900 mt-1">{siteData?.address_3 || '-'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">Address 4</label>
                          <p className="text-gray-900 mt-1">{siteData?.address_4 || '-'}</p>
                        </div>
                      </div>
                      
                      {/* Region & Country */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-700">Region</label>
                          <p className="text-gray-900 mt-1">{siteData?.region || '-'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">Country</label>
                          <p className="text-gray-900 mt-1">{siteData?.country || '-'}</p>
                        </div>
                      </div>
                      
                      {/* Geographical Coverage */}
                      <div>
                        <label className="text-sm font-medium text-gray-700">Geographical Coverage</label>
                        <p className="text-gray-900 mt-1">{siteData?.geographical_coverage || '-'}</p>
                      </div>
                      
                      {/* Contact Info */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-700">Phone Number</label>
                          <p className="text-gray-900 mt-1">{siteData?.phone_number || '-'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">Company Email</label>
                          <p className="text-gray-900 mt-1">{siteData?.company_email || '-'}</p>
                        </div>
                      </div>
                      
                      {/* Website & Accreditation */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-700">Website</label>
                          <p className="text-gray-900 mt-1">
                            {siteData?.website ? (
                              <a 
                                href={siteData.website} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-teal-600 hover:underline"
                              >
                                {siteData.website}
                              </a>
                            ) : '-'}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">Parent Company</label>
                          <p className="text-gray-900 mt-1">{siteData?.parent_company || '-'}</p>
                        </div>
                      </div>
                      
                      {/* Accreditation */}
                      <div>
                        <label className="text-sm font-medium text-gray-700">Accreditation</label>
                        <p className="text-gray-900 mt-1 whitespace-pre-wrap">{siteData?.accreditation || '-'}</p>
                      </div>
                    </div>
                  )}
                  
                  {/* CONTACT PERSONS TAB */}
                  {activeTab === 'contacts' && (
                    <div className="space-y-6">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">Contact Persons</h4>
                      
                      {/* Contact 1 */}
                      <div className="p-4 bg-teal-50 rounded-lg border border-teal-100">
                        <h5 className="font-semibold text-teal-900 mb-3">Contact Person 1</h5>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium text-gray-700">Title 1</label>
                            <p className="text-gray-900 mt-1">{siteData?.title_1 || '-'}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-700">Initials 1</label>
                            <p className="text-gray-900 mt-1">{siteData?.initials_1 || '-'}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-700">Surname 1</label>
                            <p className="text-gray-900 mt-1">{siteData?.surname_1 || '-'}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-700">Position 1</label>
                            <p className="text-gray-900 mt-1">{siteData?.position_1 || '-'}</p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Contact 2 */}
                      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <h5 className="font-semibold text-gray-900 mb-3">Contact Person 2</h5>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium text-gray-700">Title 2</label>
                            <p className="text-gray-900 mt-1">{siteData?.title_2 || '-'}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-700">Initials 2</label>
                            <p className="text-gray-900 mt-1">{siteData?.initials_2 || '-'}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-700">Surname 2</label>
                            <p className="text-gray-900 mt-1">{siteData?.surname_2 || '-'}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-700">Position 2</label>
                            <p className="text-gray-900 mt-1">{siteData?.position_2 || '-'}</p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Contact 3 */}
                      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <h5 className="font-semibold text-gray-900 mb-3">Contact Person 3</h5>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium text-gray-700">Title 3</label>
                            <p className="text-gray-900 mt-1">{siteData?.title_3 || '-'}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-700">Initials 3</label>
                            <p className="text-gray-900 mt-1">{siteData?.initials_3 || '-'}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-700">Surname 3</label>
                            <p className="text-gray-900 mt-1">{siteData?.surname_3 || '-'}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-700">Position 3</label>
                            <p className="text-gray-900 mt-1">{siteData?.position_3 || '-'}</p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Contact 4 */}
                      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <h5 className="font-semibold text-gray-900 mb-3">Contact Person 4</h5>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium text-gray-700">Title 4</label>
                            <p className="text-gray-900 mt-1">{siteData?.title_4 || '-'}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-700">Initials 4</label>
                            <p className="text-gray-900 mt-1">{siteData?.initials_4 || '-'}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-700">Surname 4</label>
                            <p className="text-gray-900 mt-1">{siteData?.surname_4 || '-'}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-700">Position 4</label>
                            <p className="text-gray-900 mt-1">{siteData?.position_4 || '-'}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* CATEGORY DETAILS TAB (Injection Moulder shown as example) */}
                  {activeTab === 'category' && siteData?.category === 'INJECTION' && (
                    <div className="space-y-6">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">
                        {getCategoryTabName()}
                      </h4>
                      
                      {/* Process Types */}
                      <div className="p-4 bg-teal-50 rounded-lg">
                        <h5 className="font-semibold text-gray-900 mb-3">Process Types</h5>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="flex items-center gap-2">
                            {renderBoolean(siteData?.custom)}
                            <span className="text-sm">Custom</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {renderBoolean(siteData?.proprietary_products)}
                            <span className="text-sm">Proprietary Products</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {renderBoolean(siteData?.in_house)}
                            <span className="text-sm">In House</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {renderBoolean(siteData?.two_shot)}
                            <span className="text-sm">Two Shot</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {renderBoolean(siteData?.gas_assist)}
                            <span className="text-sm">Gas Assist</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {renderBoolean(siteData?.insert)}
                            <span className="text-sm">Insert</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {renderBoolean(siteData?.over_moulding)}
                            <span className="text-sm">Over Moulding</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {renderBoolean(siteData?.in_mould_labeling)}
                            <span className="text-sm">In Mould Labeling</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {renderBoolean(siteData?.structural_foam)}
                            <span className="text-sm">Structural Foam</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Materials */}
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <h5 className="font-semibold text-gray-900 mb-3">Materials</h5>
                        <div className="grid grid-cols-4 gap-3">
                          <div className="flex items-center gap-2">
                            {renderBoolean(siteData?.ps)}
                            <span className="text-sm">PS</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {renderBoolean(siteData?.san)}
                            <span className="text-sm">SAN</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {renderBoolean(siteData?.abs)}
                            <span className="text-sm">ABS</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {renderBoolean(siteData?.ldpe)}
                            <span className="text-sm">LDPE</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {renderBoolean(siteData?.lldpe)}
                            <span className="text-sm">LLDPE</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {renderBoolean(siteData?.hdpe)}
                            <span className="text-sm">HDPE</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {renderBoolean(siteData?.pp)}
                            <span className="text-sm">PP</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {renderBoolean(siteData?.pom)}
                            <span className="text-sm">POM</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {renderBoolean(siteData?.pa)}
                            <span className="text-sm">PA (Nylon)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {renderBoolean(siteData?.pa12)}
                            <span className="text-sm">PA12</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {renderBoolean(siteData?.pa11)}
                            <span className="text-sm">PA11</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {renderBoolean(siteData?.pa66)}
                            <span className="text-sm">PA66</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {renderBoolean(siteData?.pa6)}
                            <span className="text-sm">PA6</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {renderBoolean(siteData?.pmma)}
                            <span className="text-sm">PMMA</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {renderBoolean(siteData?.pc)}
                            <span className="text-sm">PC</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {renderBoolean(siteData?.ppo)}
                            <span className="text-sm">PPO</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {renderBoolean(siteData?.peek)}
                            <span className="text-sm">PEEK</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {renderBoolean(siteData?.pvc)}
                            <span className="text-sm">PVC</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {renderBoolean(siteData?.pet)}
                            <span className="text-sm">PET</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {renderBoolean(siteData?.petg)}
                            <span className="text-sm">PETG</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {renderBoolean(siteData?.tpe)}
                            <span className="text-sm">TPE</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {renderBoolean(siteData?.tpu)}
                            <span className="text-sm">TPU</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* NOTES TAB */}
                  {activeTab === 'notes' && (
                    <NotesTab 
                      siteId={site.site_id}
                      readOnly={false}  // Admins can add notes
                    />
                  )}
                  
                  {/* HISTORY TAB */}
                  {activeTab === 'history' && (
                    <div className="space-y-3">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">Verification History</h4>
                      {history.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">No history yet</p>
                      ) : (
                        history.map((entry) => (
                          <div key={entry.history_id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="flex items-start justify-between mb-2">
                              <span className="font-medium text-gray-900">{entry.action_display}</span>
                              <span className="text-sm text-gray-500">
                                {new Date(entry.timestamp).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600">
                              By: {entry.performed_by_info?.full_name || 'System'}
                            </p>
                            {entry.notes && (
                              <p className="text-sm text-gray-700 mt-2 p-2 bg-white rounded border border-gray-200">
                                {entry.notes}
                              </p>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                  
                  {/* Edit Mode Save Button */}
                  {editMode && activeTab !== 'history' && activeTab !== 'notes' && (
                    <div className="flex gap-2 mt-6 pt-4 border-t">
                      <button
                        onClick={handleSaveEdit}
                        disabled={saving}
                        className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors flex items-center gap-2"
                      >
                        <Save className="w-4 h-4" />
                        Save Changes
                      </button>
                      <button
                        onClick={() => {
                          setEditMode(false);
                          setEditedData(siteData);
                        }}
                        className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
                
                {/* Right: Verification Panel */}
                <div className="w-80 bg-gray-50 p-6 space-y-6 border-l border-gray-200">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Verification</h4>
                    
                    {/* Status */}
                    <div className="mb-4">
                      <label className="text-sm font-medium text-gray-700 block mb-1">
                        Status
                      </label>
                      <div className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                        siteData?.verification_status === 'PENDING' ? 'bg-gray-100 text-gray-800' :
                        siteData?.verification_status === 'UNDER_REVIEW' ? 'bg-blue-100 text-blue-800' :
                        siteData?.verification_status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {siteData?.verification_status_display}
                      </div>
                    </div>
                    
                    {/* Priority */}
                    <div className="mb-4">
                      <label className="text-sm font-medium text-gray-700 block mb-1">
                        Priority
                      </label>
                      <div className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                        siteData?.priority === 'LOW' ? 'bg-gray-100 text-gray-800' :
                        siteData?.priority === 'MEDIUM' ? 'bg-blue-100 text-blue-800' :
                        siteData?.priority === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {siteData?.priority_display}
                      </div>
                    </div>
                    
                    {/* Data Quality */}
                    <div className="mb-4">
                      <label className="text-sm font-medium text-gray-700 block mb-1">
                        Data Quality
                      </label>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              siteData?.data_quality_score >= 70 ? 'bg-green-500' :
                              siteData?.data_quality_score >= 40 ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${siteData?.data_quality_score}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-900">
                          {siteData?.data_quality_score}%
                        </span>
                      </div>
                    </div>
                    
                    {/* Source */}
                    <div className="mb-4">
                      <label className="text-sm font-medium text-gray-700 block mb-1">
                        Source
                      </label>
                      <p className="text-sm text-gray-900">{siteData?.source_display}</p>
                    </div>
                    
                    {/* Collected By */}
                    <div className="mb-4">
                      <label className="text-sm font-medium text-gray-700 block mb-1 flex items-center gap-1">
                        <User className="w-4 h-4" />
                        Collected By
                      </label>
                      <p className="text-sm text-gray-900">
                        {siteData?.collected_by_name || 'Unknown'}
                      </p>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(siteData?.collected_date).toLocaleDateString()}
                      </p>
                    </div>
                    
                    {/* Duplicate Warning */}
                    {siteData?.is_duplicate && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-yellow-900">
                              Potential Duplicate
                            </p>
                            <p className="text-xs text-yellow-700 mt-1">
                              This company may already exist in the database
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Comments */}
                    <div className="mb-4">
                      <label className="text-sm font-medium text-gray-700 block mb-1">
                        Comments / Notes
                      </label>
                      <textarea
                        value={comments}
                        onChange={(e) => setComments(e.target.value)}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none text-sm"
                        placeholder="Add verification notes..."
                      />
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="space-y-2">
                    <button
                      onClick={handleApprove}
                      disabled={saving || siteData?.verification_status === 'APPROVED'}
                      className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-5 h-5" />
                      Approve & Transfer
                    </button>
                    <button
                      onClick={handleReject}
                      disabled={saving || siteData?.verification_status === 'REJECTED'}
                      className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                    >
                      <XCircle className="w-5 h-5" />
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
};

export default UnverifiedSiteDetailModal;