// RecordDetailModal.jsx - Based on CompanyDetailPage structure
// File: frontend/src/components/database/RecordDetailModal.jsx

import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, ExternalLink, Phone, MapPin, Building2, User, Factory, Award, Wrench, CheckCircle, MinusCircle, StickyNote, Plus, Trash2, Loader2, Edit2, AlertTriangle } from 'lucide-react';
import LoadingSpinner from '../LoadingSpinner';
import api from '../../utils/api';

// Category display names
const CATEGORY_NAMES = {
  INJECTION: 'Injection Moulders',
  BLOW: 'Blow Moulders',
  ROTO: 'Rotational Moulders',
  PE_FILM: 'PE Film Producers',
  SHEET: 'Sheet Producers',
  PIPE: 'Pipe Producers',
  TUBE_HOSE: 'Tube & Hose Producers',
  PROFILE: 'Profile Producers',
  CABLE: 'Cable Producers',
  COMPOUNDER: 'Compounders',
};

// Company Information fields (matches CompanyDetailPage COMPANY_INFO_FIELDS)
const COMPANY_INFO_FIELDS = [
  { key: 'company_name', label: 'Company Name' },
  { key: 'address_1', label: 'Address 1' },
  { key: 'address_2', label: 'Address 2' },
  { key: 'address_3', label: 'Address 3' },
  { key: 'address_4', label: 'Address 4' },
  { key: 'region', label: 'Region' },
  { key: 'country', label: 'Country' },
  { key: 'geographical_coverage', label: 'Geographical Coverage' },
  { key: 'phone_number', label: 'Phone Number' },
  { key: 'company_email', label: 'Company Email' },
  { key: 'website', label: 'Website' },
  { key: 'accreditation', label: 'Accreditation' },
  { key: 'parent_company', label: 'Parent Company' },
];

const RecordDetailModal = ({ record, onClose, isGuest = false, reportId = null, toast = null, onNotesChanged = null }) => {
  const [activeTab, setActiveTab] = useState('company');
  const [categoryFields, setCategoryFields] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Notes state
  const [notes, setNotes] = useState([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [showAddNote, setShowAddNote] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editContent, setEditContent] = useState('');
  
  // Delete confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState(null);
  const [deletingNote, setDeletingNote] = useState(false);

  // Helper function to show toast
  const showToast = (type, message) => {
    if (toast && typeof toast[type] === 'function') {
      toast[type](message);
    }
  };

  // Get primary category for technical details tab
  const primaryCategory = useMemo(() => {
    if (!record?.categories || record.categories.length === 0) return null;
    return record.categories[0];
  }, [record]);

  // Determine the report ID to use
  const effectiveReportId = useMemo(() => {
    return reportId || record?.report_id || null;
  }, [reportId, record]);

  console.log('📊 Modal opened with record:', record);
  console.log('📦 Primary category:', primaryCategory);
  
  // Log all field names in the record
  console.log('🔑 Record keys:', Object.keys(record || {}));
  
  // Check for specific technical fields
  const technicalFieldSamples = ['custom', 'ps', 'pp', 'hdpe', 'ldpe', 'proprietary_products'];
  console.log('🔍 Sample technical fields in record:');
  technicalFieldSamples.forEach(field => {
    console.log(`  ${field}:`, record?.[field], typeof record?.[field]);
  });

  // Fetch field metadata for the primary category
  useEffect(() => {
    const fetchMetadata = async () => {
      if (!primaryCategory) {
        console.log('⚠️ No primary category found');
        setIsLoading(false);
        return;
      }

      console.log('🔍 Fetching metadata for category:', primaryCategory);
      
      try {
        const response = await api.get(`/api/fields/metadata/${primaryCategory}/`);
        console.log('✅ Metadata loaded:', response.data);
        // category_fields contains the technical fields for this category
        setCategoryFields(response.data.category_fields || []);
      } catch (error) {
        console.error('❌ Error fetching metadata:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMetadata();
  }, [primaryCategory]);

  // Fetch notes for this record
  useEffect(() => {
    const fetchNotes = async () => {
      if (!effectiveReportId || !record?.id || isGuest) {
        return;
      }

      try {
        setNotesLoading(true);
        const response = await api.get('/api/client/notes/', {
          params: {
            report_id: effectiveReportId,
            record_id: record.id
          }
        });
        setNotes(response.data.results || []);
      } catch (error) {
        console.error('Error fetching notes:', error);
        setNotes([]);
      } finally {
        setNotesLoading(false);
      }
    };

    fetchNotes();
  }, [effectiveReportId, record?.id, isGuest]);

  // Add a new note
  const handleAddNote = async () => {
    if (!newNoteContent.trim() || !effectiveReportId || !record?.id) return;

    try {
      setSavingNote(true);
      const response = await api.post('/api/client/notes/', {
        report_id: effectiveReportId,
        record_id: record.id,
        company_name: record.company_name,
        content: newNoteContent.trim()
      });
      
      setNotes(prev => [response.data, ...prev]);
      setNewNoteContent('');
      setShowAddNote(false);
      showToast('success', 'Note added successfully');
      
      // Notify parent that notes changed
      if (onNotesChanged) onNotesChanged();
    } catch (error) {
      console.error('Error adding note:', error);
      showToast('error', 'Failed to add note');
    } finally {
      setSavingNote(false);
    }
  };

  // Update a note
  const handleUpdateNote = async (noteId) => {
    if (!editContent.trim()) return;

    try {
      setSavingNote(true);
      const response = await api.patch(`/api/client/notes/${noteId}/`, {
        content: editContent.trim()
      });
      
      setNotes(prev => prev.map(n => n.id === noteId ? response.data : n));
      setEditingNoteId(null);
      setEditContent('');
      showToast('success', 'Note updated successfully');
      
      // Notify parent that notes changed
      if (onNotesChanged) onNotesChanged();
    } catch (error) {
      console.error('Error updating note:', error);
      showToast('error', 'Failed to update note');
    } finally {
      setSavingNote(false);
    }
  };

  // Delete a note
  const handleDeleteNote = async () => {
    if (!noteToDelete) return;

    try {
      setDeletingNote(true);
      await api.delete(`/api/client/notes/${noteToDelete.id}/`);
      setNotes(prev => prev.filter(n => n.id !== noteToDelete.id));
      showToast('success', 'Note deleted successfully');
      setShowDeleteConfirm(false);
      setNoteToDelete(null);
      
      // Notify parent that notes changed
      if (onNotesChanged) onNotesChanged();
    } catch (error) {
      console.error('Error deleting note:', error);
      showToast('error', 'Failed to delete note');
    } finally {
      setDeletingNote(false);
    }
  };

  // Prepare technical fields (matches CompanyDetailPage orderedFields logic)
  const technicalFields = useMemo(() => {
    if (!record || categoryFields.length === 0) {
      console.log('⚠️ No technical fields available');
      console.log('  - record exists?', !!record);
      console.log('  - categoryFields.length:', categoryFields.length);
      return [];
    }

    console.log('🔧 Preparing technical fields from category metadata');
    console.log('📋 Category fields from metadata:', categoryFields.length, 'fields');
    console.log('🗃️ First 5 metadata fields:', categoryFields.slice(0, 5).map(f => f.name));
    
    const fields = categoryFields.map(fieldMeta => {
      const fieldName = fieldMeta.name;
      const value = record[fieldName];
      const isBoolean = fieldMeta.type === 'checkbox';

      return {
        key: fieldName,
        label: fieldMeta.label,
        value: isBoolean ? value === true : (value ?? ''),
        isBoolean,
        fieldType: fieldMeta.type,
        rawValue: value, // Keep raw value for debugging
      };
    }).filter(field => {
      // Only show fields that have values (including false for booleans)
      if (field.isBoolean) {
        const hasValue = field.rawValue === true || field.rawValue === false;
        if (!hasValue) {
          console.log(`  ⊘ Skipping ${field.key}: rawValue is`, field.rawValue, typeof field.rawValue);
        }
        return hasValue;
      }
      return field.value !== '' && field.value !== null && field.value !== undefined;
    });

    console.log(`📋 Total technical fields with values: ${fields.length}`);
    console.log('📊 Sample field values:');
    fields.slice(0, 10).forEach(f => {
      console.log(`  ${f.key}: ${f.rawValue} (type: ${typeof f.rawValue})`);
    });
    
    return fields;
  }, [record, categoryFields]);

  if (!record) return null;

  const renderCompanyField = (field) => {
    const value = record[field.key];
    
    if (!value || value === '') return null;

    if (field.key === 'website') {
      return (
        <div key={field.key} className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 w-48 flex-shrink-0">
            {field.label}:
          </label>
          <div className="flex-1 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-2.5">
            <a
              href={String(value).startsWith('http') ? value : `https://${value}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium flex items-center gap-1"
            >
              {value}
              <ExternalLink className="w-4 h-4 flex-shrink-0" />
            </a>
          </div>
        </div>
      );
    }

    return (
      <div key={field.key} className="flex items-center gap-4">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 w-48 flex-shrink-0">
          {field.label}:
        </label>
        <div className="flex-1 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-2.5">
          <span className="text-sm text-gray-900 dark:text-gray-100">{value}</span>
        </div>
      </div>
    );
  };

  const renderTechnicalField = (field) => {
    if (field.isBoolean) {
      return (
        <div key={field.key} className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 w-48 flex-shrink-0">
            {field.label}:
          </label>
          <div className="flex-1 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-2.5 flex items-center">
            {field.value === true ? (
              <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <MinusCircle className="w-5 h-5 text-red-500 dark:text-red-400" />
            )}
          </div>
        </div>
      );
    }

    return (
      <div key={field.key} className="flex items-center gap-4">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 w-48 flex-shrink-0">
          {field.label}:
        </label>
        <div className="flex-1 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-2.5">
          <span className="text-sm text-gray-900 dark:text-gray-100">{field.value}</span>
        </div>
      </div>
    );
  };

  const TabButton = ({ id, label, icon: Icon, count }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-2 px-6 py-3 font-semibold text-sm transition-all border-b-2 ${
        activeTab === id
          ? 'text-purple-600 dark:text-purple-400 border-purple-600 dark:border-purple-400 bg-purple-50 dark:bg-purple-900/20'
          : 'text-gray-600 dark:text-gray-400 border-transparent hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
      }`}
    >
      <Icon className="w-5 h-5" />
      {label}
      {count !== undefined && count > 0 && (
        <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-bold ${
          activeTab === id ? 'bg-purple-600 text-white' : 'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200'
        }`}>
          {count}
        </span>
      )}
    </button>
  );

  // Count filled company info fields
  const filledCompanyFields = COMPANY_INFO_FIELDS.filter(
    field => record[field.key] && record[field.key] !== ''
  ).length;

  // Check if any contact person has data
  const hasContactPersons = [1, 2, 3, 4].some(n => 
    record[`surname_${n}`] || record[`initials_${n}`] || record[`title_${n}`] || record[`position_${n}`]
  );

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-6xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white px-8 py-6 flex-shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-14 h-14 bg-white/20 backdrop-blur-xl rounded-xl flex items-center justify-center">
                  <Factory className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">
                    {isGuest ? 'Company Details (Limited Access)' : record?.company_name || 'Company Details'}
                  </h2>
                  {primaryCategory && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="bg-white/20 backdrop-blur-xl px-3 py-1 rounded-lg text-sm font-semibold">
                        {CATEGORY_NAMES[primaryCategory] || primaryCategory}
                      </span>
                      {record?.country && (
                        <span className="text-white/90 text-sm flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {record.country}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 w-10 h-10 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-all"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-8 flex-shrink-0 overflow-x-auto">
          <TabButton 
            id="company" 
            label="Company Information" 
            icon={Building2} 
            count={filledCompanyFields} 
          />
          <TabButton 
            id="contact" 
            label="Contact Information" 
            icon={Phone}
          />
          <TabButton 
            id="technical" 
            label={primaryCategory ? `${CATEGORY_NAMES[primaryCategory]} Details` : 'Technical Details'}
            icon={Wrench} 
            count={technicalFields.length} 
          />
          {/* Notes Tab - Only show for non-guest users with a valid report */}
          {!isGuest && effectiveReportId && (
            <TabButton 
              id="notes" 
              label="Notes" 
              icon={StickyNote}
              count={notes.length} 
            />
          )}
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 min-h-[500px] max-h-[600px] bg-white dark:bg-gray-800">
          {isLoading && activeTab === 'technical' ? (
            <div className="flex items-center justify-center py-16">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="p-8">
              {isGuest && (
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-2 border-amber-300 dark:border-amber-700 rounded-xl p-5 mb-6">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 bg-amber-100 dark:bg-amber-900/40 rounded-lg flex items-center justify-center">
                      <Award className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-amber-900 dark:text-amber-200 mb-1">Limited Preview Access</h4>
                      <p className="text-sm text-amber-800 dark:text-amber-300">
                        Contact information is hidden. Upgrade to view full details.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Company Information Tab */}
              {activeTab === 'company' && (
                <div className="space-y-3">
                  {COMPANY_INFO_FIELDS.map(field => renderCompanyField(field))}
                  {filledCompanyFields === 0 && (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-8">No company information available</p>
                  )}
                </div>
              )}

              {/* Contact Information Tab - Matches CompanyDetailPage structure */}
              {activeTab === 'contact' && (
                <div>
                  {isGuest ? (
                    <div className="text-center py-12 bg-amber-50 dark:bg-amber-900/20 rounded-lg border-2 border-dashed border-amber-300 dark:border-amber-700">
                      <div className="text-5xl mb-4">🔒</div>
                      <h4 className="text-lg font-semibold text-amber-800 dark:text-amber-300 mb-2">Contact Information Hidden</h4>
                      <p className="text-sm text-amber-700 dark:text-amber-400 max-w-md mx-auto">
                        Contact person details are not displayed for guest users.
                      </p>
                    </div>
                  ) : hasContactPersons ? (
                    /* Show all 4 contact persons */
                    <div className="space-y-6">
                      {[1, 2, 3, 4].map(n => {
                        const hasData = record[`surname_${n}`] || record[`initials_${n}`] || 
                                       record[`title_${n}`] || record[`position_${n}`];
                        
                        if (!hasData) return null;

                        return (
                          <div key={n} className="space-y-3">
                            <h4 className="text-base font-bold text-purple-700 dark:text-purple-400 flex items-center gap-2">
                              <User className="w-5 h-5" />
                              Contact Person {n}
                            </h4>
                            
                            {record[`title_${n}`] && (
                              <div className="flex items-center gap-4">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 w-48 flex-shrink-0">
                                  Title:
                                </label>
                                <div className="flex-1 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-2.5">
                                  <span className="text-sm text-gray-900 dark:text-gray-100">{record[`title_${n}`]}</span>
                                </div>
                              </div>
                            )}
                            
                            {record[`initials_${n}`] && (
                              <div className="flex items-center gap-4">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 w-48 flex-shrink-0">
                                  Initials:
                                </label>
                                <div className="flex-1 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-2.5">
                                  <span className="text-sm text-gray-900 dark:text-gray-100">{record[`initials_${n}`]}</span>
                                </div>
                              </div>
                            )}
                            
                            {record[`surname_${n}`] && (
                              <div className="flex items-center gap-4">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 w-48 flex-shrink-0">
                                  Surname:
                                </label>
                                <div className="flex-1 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-2.5">
                                  <span className="text-sm text-gray-900 dark:text-gray-100">{record[`surname_${n}`]}</span>
                                </div>
                              </div>
                            )}
                            
                            {record[`position_${n}`] && (
                              <div className="flex items-center gap-4">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 w-48 flex-shrink-0">
                                  Position:
                                </label>
                                <div className="flex-1 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-2.5">
                                  <span className="text-sm text-gray-900 dark:text-gray-100">{record[`position_${n}`]}</span>
                                </div>
                              </div>
                            )}
                            
                            {n < 4 && hasData && (
                              <div className="border-b-2 border-gray-200 dark:border-gray-600 mt-4"></div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-gray-50 dark:bg-gray-700 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                      <User className="w-12 h-12 mx-auto mb-3 text-gray-400 dark:text-gray-500" />
                      <p className="text-gray-500 dark:text-gray-400">No contact persons available</p>
                    </div>
                  )}
                </div>
              )}

              {/* Technical Details Tab */}
              {activeTab === 'technical' && (
                <div className="space-y-3">
                  {technicalFields.length > 0 ? (
                    <>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 pb-3 border-b-2 border-blue-300 dark:border-blue-600 flex items-center gap-2">
                        <Wrench className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        Technical Details
                      </h3>
                      {technicalFields.map(field => renderTechnicalField(field))}
                    </>
                  ) : (
                    <div className="text-center py-12 bg-gray-50 dark:bg-gray-700 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                      <Wrench className="w-12 h-12 mx-auto mb-3 text-gray-400 dark:text-gray-500" />
                      <p className="text-gray-500 dark:text-gray-400">No technical details available</p>
                      {!primaryCategory && (
                        <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">No category detected for this company</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Notes Tab */}
              {activeTab === 'notes' && !isGuest && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <StickyNote className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                      Company Notes
                    </h3>
                    {!showAddNote && (
                      <button
                        onClick={() => setShowAddNote(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors text-sm font-medium"
                      >
                        <Plus className="w-4 h-4" />
                        Add Note
                      </button>
                    )}
                  </div>

                  {/* Add Note Form */}
                  {showAddNote && (
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4 mb-4">
                      <textarea
                        value={newNoteContent}
                        onChange={(e) => setNewNoteContent(e.target.value)}
                        placeholder="Write your note here..."
                        className="w-full px-4 py-3 border border-amber-300 dark:border-amber-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                        rows={3}
                        autoFocus
                      />
                      <div className="flex justify-end gap-2 mt-3">
                        <button
                          onClick={() => {
                            setShowAddNote(false);
                            setNewNoteContent('');
                          }}
                          className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 text-sm font-medium"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleAddNote}
                          disabled={!newNoteContent.trim() || savingNote}
                          className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 text-sm font-medium"
                        >
                          {savingNote ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Plus className="w-4 h-4" />
                          )}
                          Save Note
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Notes List */}
                  {notesLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
                    </div>
                  ) : notes.length > 0 ? (
                    <div className="space-y-3">
                      {notes.map(note => (
                        <div key={note.id} className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                          {editingNoteId === note.id ? (
                            /* Edit Mode */
                            <div>
                              <textarea
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                                rows={3}
                                autoFocus
                              />
                              <div className="flex justify-end gap-2 mt-3">
                                <button
                                  onClick={() => {
                                    setEditingNoteId(null);
                                    setEditContent('');
                                  }}
                                  className="px-3 py-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 text-sm"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => handleUpdateNote(note.id)}
                                  disabled={!editContent.trim() || savingNote}
                                  className="px-3 py-1.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 text-sm"
                                >
                                  {savingNote ? 'Saving...' : 'Save'}
                                </button>
                              </div>
                            </div>
                          ) : (
                            /* View Mode */
                            <>
                              <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{note.content}</p>
                              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-600">
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {new Date(note.created_at).toLocaleString()}
                                  {note.updated_at !== note.created_at && (
                                    <span className="ml-2 text-gray-400 dark:text-gray-500">(edited)</span>
                                  )}
                                </span>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => {
                                      setEditingNoteId(note.id);
                                      setEditContent(note.content);
                                    }}
                                    className="p-1.5 text-gray-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
                                    title="Edit note"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setNoteToDelete(note);
                                      setShowDeleteConfirm(true);
                                    }}
                                    className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                    title="Delete note"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-gray-50 dark:bg-gray-700 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                      <StickyNote className="w-12 h-12 mx-auto mb-3 text-gray-400 dark:text-gray-500" />
                      <p className="text-gray-500 dark:text-gray-400 mb-2">No notes for this company</p>
                      <p className="text-sm text-gray-400 dark:text-gray-500">Click "Add Note" to create your first note</p>
                    </div>
                  )}
                </div>
              )}

              {record?.last_updated && (
                <div className="text-center pt-6 mt-6 border-t-2 border-gray-300 dark:border-gray-600">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Last updated: <span className="font-semibold text-gray-700 dark:text-gray-300">
                      {new Date(record.last_updated).toLocaleString()}
                    </span>
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-100 dark:bg-gray-900 px-8 py-5 border-t-2 border-gray-300 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
          <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
            <Factory className="w-4 h-4" />
            {isGuest ? 'Limited preview - upgrade for full access' : 'Complete company details'}
          </div>
          <div className="flex gap-3">
            {isGuest && (
              <button className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md">
                Upgrade Account
              </button>
            )}
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-white dark:bg-gray-700 border-2 border-gray-400 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-600 hover:border-gray-500 dark:hover:border-gray-500 transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Delete Note Confirmation Modal */}
      {showDeleteConfirm && createPortal(
        <div onClick={(e) => e.stopPropagation()}>
          <div className="fixed inset-0 bg-black/50 z-[100]" onClick={() => {
            setShowDeleteConfirm(false);
            setNoteToDelete(null);
          }} />
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="bg-red-50 dark:bg-red-900/20 px-6 py-5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Delete Note</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">This action cannot be undone</p>
                  </div>
                </div>
              </div>
              <div className="px-6 py-4">
                <p className="text-gray-700 dark:text-gray-300">
                  Are you sure you want to delete this note?
                </p>
                {noteToDelete && (
                  <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{noteToDelete.content}</p>
                  </div>
                )}
              </div>
              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setNoteToDelete(null);
                  }}
                  disabled={deletingNote}
                  className="px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 font-medium text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteNote}
                  disabled={deletingNote}
                  className="px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium text-sm flex items-center gap-2"
                >
                  {deletingNote ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default RecordDetailModal;
