// frontend/src/pages/reports/ReportCompanyViewPage.jsx
/**
 * Client-facing Company View Page (Read-Only)
 * 
 * Features:
 * - Read-only view of company data
 * - Only shows production sites/categories included in the report
 * - Similar layout to CompanyDetailPage but without edit functionality
 * - Accessible from Custom Reports
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Building2, MapPin, Phone, FileText, MessageSquare,
  ChevronRight, ArrowLeft, Home, Check, AlertCircle, Clock
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import LoadingSpinner from '../../components/LoadingSpinner';
import api from '../../utils/api';

// =============================================================================
// CONSTANTS
// =============================================================================
const CATEGORY_DISPLAY = {
  INJECTION: 'Injection Moulders', BLOW: 'Blow Moulders', ROTO: 'Roto Moulders',
  PE_FILM: 'PE Film Extruders', SHEET: 'Sheet Extruders', PIPE: 'Pipe Extruders',
  TUBE_HOSE: 'Tube & Hose Extruders', PROFILE: 'Profile Extruders',
  CABLE: 'Cable Extruders', COMPOUNDER: 'Compounders',
};

const CATEGORY_COLORS = {
  INJECTION: { bg: 'bg-blue-500', text: 'text-blue-600', light: 'bg-blue-50', border: 'border-blue-200' },
  BLOW: { bg: 'bg-green-500', text: 'text-green-600', light: 'bg-green-50', border: 'border-green-200' },
  ROTO: { bg: 'bg-orange-500', text: 'text-orange-600', light: 'bg-orange-50', border: 'border-orange-200' },
  PE_FILM: { bg: 'bg-purple-500', text: 'text-purple-600', light: 'bg-purple-50', border: 'border-purple-200' },
  SHEET: { bg: 'bg-cyan-500', text: 'text-cyan-600', light: 'bg-cyan-50', border: 'border-cyan-200' },
  PIPE: { bg: 'bg-red-500', text: 'text-red-600', light: 'bg-red-50', border: 'border-red-200' },
  TUBE_HOSE: { bg: 'bg-amber-600', text: 'text-amber-600', light: 'bg-amber-50', border: 'border-amber-200' },
  PROFILE: { bg: 'bg-slate-500', text: 'text-slate-600', light: 'bg-slate-50', border: 'border-slate-200' },
  CABLE: { bg: 'bg-pink-500', text: 'text-pink-600', light: 'bg-pink-50', border: 'border-pink-200' },
  COMPOUNDER: { bg: 'bg-indigo-500', text: 'text-indigo-600', light: 'bg-indigo-50', border: 'border-indigo-200' },
};

const STATUS_OPTIONS = [
  { value: 'COMPLETE', label: 'Complete', color: 'bg-green-100 text-green-800 border-green-300' },
  { value: 'INCOMPLETE', label: 'Incomplete', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  { value: 'DELETED', label: 'Deleted', color: 'bg-red-100 text-red-800 border-red-300' },
];

// Company Information fields
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

// Info tabs
const INFO_TABS = [
  { id: 'company', label: 'Company Information', shortLabel: 'Company', icon: Building2 },
  { id: 'contact', label: 'Contact Information', shortLabel: 'Contact', icon: Phone },
];

// Cache for field metadata per category
const fieldMetadataCache = {};

// =============================================================================
// READ-ONLY FIELD COMPONENT
// =============================================================================
const ReadOnlyField = ({ label, value, isLarge = false }) => (
  <div className="flex flex-col sm:flex-row sm:items-start">
    <label className="text-sm font-medium mb-1 sm:mb-0 sm:w-40 md:w-44 sm:flex-shrink-0 sm:pt-1.5 text-gray-600">
      {label}:
    </label>
    <div className={`flex-1 ${isLarge ? 'min-h-[80px]' : ''}`}>
      <div className={`w-full px-3 py-1.5 border border-gray-200 rounded text-sm bg-gray-50 ${isLarge ? 'min-h-[80px]' : 'min-h-[32px]'} text-gray-900`}>
        {value || <span className="text-gray-400">-</span>}
      </div>
    </div>
  </div>
);

// =============================================================================
// TWO FIELDS ROW - Read Only
// =============================================================================
const TwoFieldsRow = ({ field1, field2, data }) => (
  <div className="flex flex-col md:flex-row md:gap-8 py-2 border-b border-gray-100">
    <div className="flex-1 mb-3 md:mb-0">
      <ReadOnlyField label={field1.label} value={data?.[field1.key]} isLarge={field1.isLarge} />
    </div>
    {field2 && (
      <div className="flex-1">
        <ReadOnlyField label={field2.label} value={data?.[field2.key]} isLarge={field2.isLarge} />
      </div>
    )}
  </div>
);

// =============================================================================
// SINGLE FIELD ROW - Read Only
// =============================================================================
const SingleFieldRow = ({ field, data }) => (
  <div className="py-2 border-b border-gray-100">
    <ReadOnlyField label={field.label} value={data?.[field.key]} isLarge={field.isLarge} />
  </div>
);

// =============================================================================
// CHECKBOX ROW - Read Only
// =============================================================================
const CheckboxRow = ({ label, checked }) => (
  <div className="flex items-center py-2 border-b border-gray-100">
    <input 
      type="checkbox" 
      checked={checked || false} 
      readOnly
      className="w-4 h-4 rounded cursor-default border-gray-300 text-teal-600"
    />
    <span className="ml-3 text-sm text-gray-700">{label}</span>
  </div>
);

// =============================================================================
// TECH FIELD ROW - Read Only
// =============================================================================
const TechFieldRow = ({ label, value, isTextarea = false }) => {
  const displayValue = value !== null && value !== undefined ? String(value) : '';
  
  return (
    <div className="flex flex-col sm:flex-row sm:items-start py-3 border-b border-gray-100">
      <label className="text-sm font-medium mb-1 sm:mb-0 sm:w-40 md:w-48 sm:flex-shrink-0 sm:pt-1 text-gray-600">
        {label}:
      </label>
      <div className={`flex-1 ${isTextarea ? 'min-h-[80px]' : ''}`}>
        <div className={`w-full sm:max-w-md px-3 py-1.5 border border-gray-200 rounded text-sm bg-gray-50 ${isTextarea ? 'min-h-[80px]' : 'min-h-[32px]'} text-gray-900`}>
          {displayValue || <span className="text-gray-400">-</span>}
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================
const ReportCompanyViewPage = () => {
  const { reportId, companyId } = useParams();
  const navigate = useNavigate();
  
  // Data state
  const [company, setCompany] = useState(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSite, setSelectedSite] = useState(null);
  const [categoryFields, setCategoryFields] = useState([]);
  const [activeInfoTab, setActiveInfoTab] = useState('company');
  
  // Ref for technical details scroll container
  const techDetailsRef = useRef(null);

  // Get status display
  const statusOption = STATUS_OPTIONS.find(s => s.value === company?.status) || STATUS_OPTIONS[1];

  // Fetch report and company data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch report details first to get filter criteria
        const reportResponse = await api.get(`/api/custom-reports/${reportId}/`);
        setReport(reportResponse.data);
        
        // Fetch company details
        const companyResponse = await api.get(`/api/companies/${companyId}/`);
        const companyData = companyResponse.data;
        
        // Filter production sites based on report categories
        const reportCategories = reportResponse.data.filter_criteria?.categories || [];
        
        if (reportCategories.length > 0 && companyData.production_sites) {
          companyData.production_sites = companyData.production_sites.filter(
            site => reportCategories.includes(site.category)
          );
        }
        
        setCompany(companyData);
        
        // Select first available production site
        if (companyData.production_sites?.length > 0) {
          setSelectedSite(companyData.production_sites[0]);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err.response?.data?.detail || err.message || 'Failed to load company details');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [reportId, companyId]);

  // Fetch category-specific field metadata when site changes
  useEffect(() => {
    const fetchCategoryMetadata = async () => {
      if (!selectedSite?.category) {
        setCategoryFields([]);
        return;
      }
      
      const category = selectedSite.category;
      
      if (fieldMetadataCache[category]) {
        setCategoryFields(fieldMetadataCache[category]);
        return;
      }

      try {
        const response = await api.get(`/api/fields/metadata/${category}/`);
        const fields = response.data.category_fields || [];
        fieldMetadataCache[category] = fields;
        setCategoryFields(fields);
      } catch (err) {
        console.error('Failed to fetch field metadata:', err);
        setCategoryFields([]);
      }
    };
    fetchCategoryMetadata();
  }, [selectedSite?.category]);

  // Reset scroll position when switching process tabs
  useEffect(() => {
    if (techDetailsRef.current) {
      techDetailsRef.current.scrollTop = 0;
    }
  }, [selectedSite]);

  // Build ordered fields list from category metadata
  const orderedFields = useMemo(() => {
    if (!selectedSite?.current_version || categoryFields.length === 0) {
      return [];
    }

    const versionData = selectedSite.current_version;
    
    return categoryFields.map(fieldMeta => {
      const fieldName = fieldMeta.name;
      const value = versionData[fieldName];
      const isBoolean = fieldMeta.type === 'checkbox';

      return {
        key: fieldName,
        label: fieldMeta.label,
        value: isBoolean ? value === true : (value ?? ''),
        isBoolean,
        fieldType: fieldMeta.type
      };
    });
  }, [selectedSite, categoryFields]);

  // Loading state
  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <LoadingSpinner />
        </div>
      </DashboardLayout>
    );
  }

  // Error state
  if (error) {
    return (
      <DashboardLayout>
        <div className="p-4 sm:p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            <p className="font-semibold">Error</p>
            <p>{error}</p>
            <button 
              onClick={() => navigate(`/custom-reports/${reportId}`)}
              className="mt-4 px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
            >
              Back to Report
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Company Info fields: First is company_name (alone), rest in pairs
  const companyNameField = COMPANY_INFO_FIELDS[0];
  const remainingCompanyFields = COMPANY_INFO_FIELDS.slice(1);
  const companyFieldPairs = [];
  for (let i = 0; i < remainingCompanyFields.length; i += 2) {
    companyFieldPairs.push({
      field1: remainingCompanyFields[i],
      field2: remainingCompanyFields[i + 1] || null
    });
  }

  // Build subtitle with category badges and country
  const pageSubtitleContent = (
    <div className="flex flex-wrap items-center gap-2 mt-1">
      {company?.unique_key && (
        <span className="bg-white/30 px-2 py-0.5 rounded text-xs font-mono font-semibold">
          {company.unique_key}
        </span>
      )}
      {company?.production_sites?.map(site => (
        <span 
          key={site.site_id}
          className="bg-white/20 px-2 py-0.5 rounded-full text-xs font-medium"
        >
          {CATEGORY_DISPLAY[site.category] || site.category}
        </span>
      ))}
      {company?.country && (
        <span className="flex items-center gap-1 text-white/80 text-xs">
          <MapPin className="w-3.5 h-3.5" />
          {company.country}
        </span>
      )}
    </div>
  );

  return (
    <DashboardLayout
      pageTitle={company?.company_name || 'Company Details'}
      pageSubtitleBottom={pageSubtitleContent}
    >
      <div className="flex-1 overflow-auto bg-gray-50">
        {/* ==================== BREADCRUMBS ==================== */}
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3">
          <nav className="flex items-center gap-2 text-sm">
            <button 
              onClick={() => navigate('/dashboard')}
              className="text-indigo-500 hover:text-indigo-600 transition-colors"
            >
              <Home className="w-4 h-4" />
            </button>
            <ChevronRight className="w-4 h-4 text-indigo-400" />
            <button 
              onClick={() => navigate('/custom-reports')}
              className="text-indigo-500 hover:text-indigo-600 transition-colors"
            >
              Custom Reports
            </button>
            <ChevronRight className="w-4 h-4 text-gray-400" />
            <button 
              onClick={() => navigate(`/custom-reports/${reportId}`)}
              className="text-indigo-500 hover:text-indigo-600 transition-colors truncate max-w-[150px]"
            >
              {report?.title || 'Report'}
            </button>
            <ChevronRight className="w-4 h-4 text-gray-400" />
            <span className="text-indigo-900 font-medium truncate">
              {company?.company_name || 'Company Details'}
            </span>
          </nav>
        </div>

        {/* ==================== ACTION BAR ==================== */}
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-2.5">
          <div className="flex items-center justify-between">
            {/* Left: Back button + Status */}
            <div className="flex items-center gap-4">
              <button 
                onClick={() => navigate(`/custom-reports/${reportId}`)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="text-sm font-medium hidden sm:inline">Back to Report</span>
              </button>
              
              {/* Read-only Status Badge */}
              <span className={`px-3 py-1.5 rounded-lg border text-sm font-medium ${statusOption.color}`}>
                {statusOption.label}
              </span>
            </div>

            {/* Right: Read-only indicator */}
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">View Only</span>
            </div>
          </div>
        </div>

        {/* ==================== MAIN CONTENT ==================== */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          
          {/* ==================== INFO SECTION ==================== */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {/* Info Tabs Header */}
            <div className="flex border-b border-gray-200 overflow-x-auto">
              {INFO_TABS.map(tab => {
                const isActive = activeInfoTab === tab.id;
                const Icon = tab.icon;
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveInfoTab(tab.id)}
                    className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-3 text-xs sm:text-sm font-medium transition-all border-b-2 whitespace-nowrap ${
                      isActive 
                        ? 'text-indigo-600 border-indigo-600 bg-indigo-50/50'
                        : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                    <span className="sm:hidden">{tab.shortLabel}</span>
                  </button>
                );
              })}
            </div>

            {/* Info Tab Content */}
            <div className="p-4 sm:p-6">
              {/* Company Information Tab */}
              {activeInfoTab === 'company' && (
                <div>
                  <SingleFieldRow field={companyNameField} data={company} />
                  
                  {companyFieldPairs.map((pair, idx) => (
                    <TwoFieldsRow 
                      key={idx}
                      field1={pair.field1}
                      field2={pair.field2}
                      data={company}
                    />
                  ))}
                </div>
              )}

              {/* Contact Information Tab */}
              {activeInfoTab === 'contact' && (
                <div>
                  {[1, 2, 3, 4].map(n => (
                    <div key={n} className="mb-6 last:mb-0">
                      <div className="flex flex-col md:flex-row md:gap-8 py-2 border-b border-gray-100">
                        <div className="flex-1 mb-3 md:mb-0">
                          <ReadOnlyField label={`Title ${n}`} value={company?.[`title_${n}`]} />
                        </div>
                        <div className="flex-1">
                          <ReadOnlyField label={`Initials ${n}`} value={company?.[`initials_${n}`]} />
                        </div>
                      </div>
                      <div className="flex flex-col md:flex-row md:gap-8 py-2 border-b border-gray-100">
                        <div className="flex-1 mb-3 md:mb-0">
                          <ReadOnlyField label={`Surname ${n}`} value={company?.[`surname_${n}`]} />
                        </div>
                        <div className="flex-1">
                          <ReadOnlyField label={`Position ${n}`} value={company?.[`position_${n}`]} />
                        </div>
                      </div>
                      {n < 4 && <div className="border-b-2 border-gray-300 my-4"></div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ==================== PROCESS & CATEGORY FIELDS SECTION ==================== */}
          {company?.production_sites?.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
              
              {/* Process Sidebar */}
              <div className="lg:col-span-3 bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3">
                  Processes Included
                </h3>
                <div className="flex lg:flex-col gap-2 lg:gap-2 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0">
                  {company.production_sites.map(site => {
                    const colors = CATEGORY_COLORS[site.category] || CATEGORY_COLORS.INJECTION;
                    const isSelected = selectedSite?.site_id === site.site_id;
                    
                    return (
                      <button
                        key={site.site_id}
                        onClick={() => setSelectedSite(site)}
                        className={`flex-shrink-0 lg:w-full text-left px-3 py-2 rounded transition-all flex items-center gap-2 text-sm ${
                          isSelected 
                            ? `${colors.light} ${colors.border} border-l-4 ${colors.text} font-semibold`
                            : 'border-l-4 border-transparent bg-gray-50 lg:bg-transparent hover:bg-gray-50 text-gray-700'
                        }`}
                      >
                        <span className="whitespace-nowrap lg:whitespace-normal">
                          {CATEGORY_DISPLAY[site.category] || site.category}
                        </span>
                        {isSelected && <ChevronRight className="w-4 h-4 hidden lg:block" />}
                      </button>
                    );
                  })}
                </div>
                
                {/* Report Info */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-500">
                    Showing {company.production_sites.length} process{company.production_sites.length !== 1 ? 'es' : ''} from this report
                  </p>
                </div>
              </div>

              {/* Category Fields */}
              <div className="lg:col-span-9 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                {/* Category Header */}
                {selectedSite && (
                  <div className={`px-4 sm:px-5 py-3 ${CATEGORY_COLORS[selectedSite.category]?.light || 'bg-gray-50'} border-b flex items-center justify-between`}>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${CATEGORY_COLORS[selectedSite.category]?.bg || 'bg-gray-500'}`}></div>
                      <h3 className={`text-sm sm:text-base font-bold ${CATEGORY_COLORS[selectedSite.category]?.text || 'text-gray-700'}`}>
                        <span className="hidden sm:inline">{CATEGORY_DISPLAY[selectedSite.category] || selectedSite.category} - </span>
                        Technical Details
                      </h3>
                    </div>
                  </div>
                )}

                {/* Fields Content */}
                <div 
                  ref={techDetailsRef}
                  className="p-4 sm:p-5 max-h-[500px] sm:max-h-[600px] overflow-y-auto"
                >
                  {orderedFields.length > 0 ? (
                    <div>
                      {orderedFields.map(field => (
                        field.isBoolean ? (
                          <CheckboxRow 
                            key={field.key} 
                            label={field.label} 
                            checked={field.value}
                          />
                        ) : (
                          <TechFieldRow 
                            key={field.key} 
                            label={field.label} 
                            value={field.value}
                            isTextarea={field.fieldType === 'textarea'}
                          />
                        )
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 sm:py-12 text-gray-400">
                      <FileText className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 opacity-50" />
                      <p>Select a process to view technical details</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* No production sites message */}
          {(!company?.production_sites || company.production_sites.length === 0) && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No matching processes</p>
              <p className="text-sm mt-1">This company doesn't have any processes that match the report criteria.</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ReportCompanyViewPage;
