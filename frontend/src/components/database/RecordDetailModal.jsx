// RecordDetailModal.jsx - Based on CompanyDetailPage structure
// File: frontend/src/components/database/RecordDetailModal.jsx

import { useState, useEffect, useMemo } from 'react';
import { X, ExternalLink, Phone, MapPin, Building2, User, Factory, Award, Wrench, CheckCircle, MinusCircle } from 'lucide-react';
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

const RecordDetailModal = ({ record, onClose, isGuest = false }) => {
  const [activeTab, setActiveTab] = useState('company');
  const [categoryFields, setCategoryFields] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Get primary category for technical details tab
  const primaryCategory = useMemo(() => {
    if (!record?.categories || record.categories.length === 0) return null;
    return record.categories[0];
  }, [record]);

  console.log('📊 Modal opened with record:', record);
  console.log('📦 Primary category:', primaryCategory);
  
  // Log all field names in the record
  console.log('🔑 Record keys:', Object.keys(record));
  
  // Check for specific technical fields
  const technicalFieldSamples = ['custom', 'ps', 'pp', 'hdpe', 'ldpe', 'proprietary_products'];
  console.log('🔍 Sample technical fields in record:');
  technicalFieldSamples.forEach(field => {
    console.log(`  ${field}:`, record[field], typeof record[field]);
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
          <label className="text-sm font-medium text-gray-700 w-48 flex-shrink-0">
            {field.label}:
          </label>
          <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5">
            <a
              href={String(value).startsWith('http') ? value : `https://${value}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
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
        <label className="text-sm font-medium text-gray-700 w-48 flex-shrink-0">
          {field.label}:
        </label>
        <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5">
          <span className="text-sm text-gray-900">{value}</span>
        </div>
      </div>
    );
  };

  const renderTechnicalField = (field) => {
    if (field.isBoolean) {
      return (
        <div key={field.key} className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700 w-48 flex-shrink-0">
            {field.label}:
          </label>
          <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 flex items-center">
            {field.value === true ? (
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            ) : (
              <MinusCircle className="w-5 h-5 text-red-500" />
            )}
          </div>
        </div>
      );
    }

    return (
      <div key={field.key} className="flex items-center gap-4">
        <label className="text-sm font-medium text-gray-700 w-48 flex-shrink-0">
          {field.label}:
        </label>
        <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5">
          <span className="text-sm text-gray-900">{field.value}</span>
        </div>
      </div>
    );
  };

  const TabButton = ({ id, label, icon: Icon, count }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-2 px-6 py-3 font-semibold text-sm transition-all border-b-2 ${
        activeTab === id
          ? 'text-purple-600 border-purple-600 bg-purple-50'
          : 'text-gray-600 border-transparent hover:text-gray-900 hover:border-gray-300'
      }`}
    >
      <Icon className="w-5 h-5" />
      {label}
      {count !== undefined && count > 0 && (
        <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-bold ${
          activeTab === id ? 'bg-purple-600 text-white' : 'bg-gray-300 text-gray-700'
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
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[95vh] overflow-hidden flex flex-col">
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
        <div className="flex border-b border-gray-200 bg-gray-50 px-8 flex-shrink-0">
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
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 min-h-[500px] max-h-[600px]">
          {isLoading && activeTab === 'technical' ? (
            <div className="flex items-center justify-center py-16">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="p-8">
              {isGuest && (
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-xl p-5 mb-6">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                      <Award className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-amber-900 mb-1">Limited Preview Access</h4>
                      <p className="text-sm text-amber-800">
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
                    <p className="text-gray-500 text-center py-8">No company information available</p>
                  )}
                </div>
              )}

              {/* Contact Information Tab - Matches CompanyDetailPage structure */}
              {activeTab === 'contact' && (
                <div>
                  {isGuest ? (
                    <div className="text-center py-12 bg-amber-50 rounded-lg border-2 border-dashed border-amber-300">
                      <div className="text-5xl mb-4">🔒</div>
                      <h4 className="text-lg font-semibold text-amber-800 mb-2">Contact Information Hidden</h4>
                      <p className="text-sm text-amber-700 max-w-md mx-auto">
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
                            <h4 className="text-base font-bold text-purple-700 flex items-center gap-2">
                              <User className="w-5 h-5" />
                              Contact Person {n}
                            </h4>
                            
                            {record[`title_${n}`] && (
                              <div className="flex items-center gap-4">
                                <label className="text-sm font-medium text-gray-700 w-48 flex-shrink-0">
                                  Title:
                                </label>
                                <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5">
                                  <span className="text-sm text-gray-900">{record[`title_${n}`]}</span>
                                </div>
                              </div>
                            )}
                            
                            {record[`initials_${n}`] && (
                              <div className="flex items-center gap-4">
                                <label className="text-sm font-medium text-gray-700 w-48 flex-shrink-0">
                                  Initials:
                                </label>
                                <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5">
                                  <span className="text-sm text-gray-900">{record[`initials_${n}`]}</span>
                                </div>
                              </div>
                            )}
                            
                            {record[`surname_${n}`] && (
                              <div className="flex items-center gap-4">
                                <label className="text-sm font-medium text-gray-700 w-48 flex-shrink-0">
                                  Surname:
                                </label>
                                <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5">
                                  <span className="text-sm text-gray-900">{record[`surname_${n}`]}</span>
                                </div>
                              </div>
                            )}
                            
                            {record[`position_${n}`] && (
                              <div className="flex items-center gap-4">
                                <label className="text-sm font-medium text-gray-700 w-48 flex-shrink-0">
                                  Position:
                                </label>
                                <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5">
                                  <span className="text-sm text-gray-900">{record[`position_${n}`]}</span>
                                </div>
                              </div>
                            )}
                            
                            {n < 4 && hasData && (
                              <div className="border-b-2 border-gray-200 mt-4"></div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                      <User className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                      <p className="text-gray-500">No contact persons available</p>
                    </div>
                  )}
                </div>
              )}

              {/* Technical Details Tab */}
              {activeTab === 'technical' && (
                <div className="space-y-3">
                  {technicalFields.length > 0 ? (
                    <>
                      <h3 className="text-lg font-bold text-gray-900 mb-4 pb-3 border-b-2 border-blue-300 flex items-center gap-2">
                        <Wrench className="w-5 h-5 text-blue-600" />
                        Technical Details
                      </h3>
                      {technicalFields.map(field => renderTechnicalField(field))}
                    </>
                  ) : (
                    <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                      <Wrench className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                      <p className="text-gray-500">No technical details available</p>
                      {!primaryCategory && (
                        <p className="text-sm text-gray-400 mt-2">No category detected for this company</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {record?.last_updated && (
                <div className="text-center pt-6 mt-6 border-t-2 border-gray-300">
                  <p className="text-sm text-gray-500">
                    Last updated: <span className="font-semibold text-gray-700">
                      {new Date(record.last_updated).toLocaleString()}
                    </span>
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-100 px-8 py-5 border-t-2 border-gray-300 flex items-center justify-between flex-shrink-0">
          <div className="text-sm text-gray-600 flex items-center gap-2">
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
              className="px-6 py-2.5 bg-white border-2 border-gray-400 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 hover:border-gray-500 transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecordDetailModal;