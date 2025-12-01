// frontend/src/pages/database/VersionsPage.jsx
/**
 * Versions Page - Full Company Data Snapshot View
 * 
 * Displays a complete clone of Company Detail Page for each version:
 * - Company Information (from snapshot)
 * - Contact Information (from snapshot)
 * - Comments/Notes (from snapshot)
 * - All Processes with Technical Details
 * 
 * Features:
 * - Version selector at top
 * - Same layout as CompanyDetailPage
 * - Shows data AS IT WAS when the version was created
 * - Highlight differences from previous version
 * - Delete button for non-current versions
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Home, ChevronRight, Clock, 
  FileText, Check, AlertCircle, Layers, Building2, Phone, MessageSquare,
  MapPin, X, Camera
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import LoadingSpinner from '../../components/LoadingSpinner';
import companyService from '../../services/companyService';
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
  { id: 'notes', label: 'Comments / Notes', shortLabel: 'Notes', icon: MessageSquare },
];

// Cache for field metadata
const fieldMetadataCache = {};

// Toast duration
const TOAST_DURATION = 10000;

// =============================================================================
// TOAST NOTIFICATION COMPONENT
// =============================================================================
const ToastNotification = ({ message, onClose }) => {
  if (!message) return null;

  return (
    <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right duration-300">
      <div className={`flex items-start gap-3 px-4 py-3 rounded-lg shadow-lg border max-w-md ${
        message.type === 'success' 
          ? 'bg-green-50 border-green-200 text-green-800' 
          : 'bg-red-50 border-red-200 text-red-800'
      }`}>
        <div className="flex-shrink-0 mt-0.5">
          {message.type === 'success' 
            ? <Check className="w-5 h-5 text-green-500" /> 
            : <AlertCircle className="w-5 h-5 text-red-500" />
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">
            {message.type === 'success' ? 'Success' : 'Error'}
          </p>
          <p className="text-sm mt-0.5 break-words">{message.text}</p>
        </div>
        <button 
          onClick={onClose}
          className="flex-shrink-0 p-1 hover:bg-black/10 rounded transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

// =============================================================================
// READ-ONLY FIELD COMPONENTS (matching CompanyDetailPage design)
// =============================================================================
const ReadOnlyField = ({ label, value, isChanged, changeType }) => {
  const getBorderClass = () => {
    if (!isChanged) return 'border-gray-300';
    switch (changeType) {
      case 'added': return 'border-green-400 bg-green-50';
      case 'removed': return 'border-red-400 bg-red-50';
      case 'modified': return 'border-yellow-400 bg-yellow-50';
      default: return 'border-gray-300';
    }
  };

  const getLabelClass = () => {
    if (!isChanged) return 'text-gray-600';
    switch (changeType) {
      case 'added': return 'text-green-700 font-semibold';
      case 'removed': return 'text-red-700 font-semibold';
      case 'modified': return 'text-yellow-700 font-semibold';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-start">
      <label className={`text-sm font-medium mb-1 sm:mb-0 sm:w-40 md:w-44 sm:flex-shrink-0 sm:pt-1.5 ${getLabelClass()}`}>
        {label}:
        {isChanged && (
          <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${
            changeType === 'added' ? 'bg-green-200 text-green-800' :
            changeType === 'removed' ? 'bg-red-200 text-red-800' :
            'bg-yellow-200 text-yellow-800'
          }`}>
            {changeType === 'added' ? 'NEW' : changeType === 'removed' ? 'REMOVED' : 'CHANGED'}
          </span>
        )}
      </label>
      <div className="flex-1">
        <div className={`w-full px-3 py-1.5 bg-white border rounded text-sm text-gray-900 min-h-[32px] ${getBorderClass()}`}>
          {value || <span className="text-gray-400"></span>}
        </div>
      </div>
    </div>
  );
};

const TwoFieldsRow = ({ field1, field2, data, prevData }) => {
  const getChangeType = (fieldKey) => {
    if (!prevData) return null;
    const currentVal = data?.[fieldKey] || '';
    const prevVal = prevData?.[fieldKey] || '';
    if (currentVal !== prevVal) {
      if (!prevVal && currentVal) return 'added';
      if (prevVal && !currentVal) return 'removed';
      return 'modified';
    }
    return null;
  };

  return (
    <div className="flex flex-col md:flex-row md:gap-8 py-2 border-b border-gray-100">
      <div className="flex-1 mb-3 md:mb-0">
        <ReadOnlyField 
          label={field1.label} 
          value={data?.[field1.key]} 
          isChanged={!!getChangeType(field1.key)}
          changeType={getChangeType(field1.key)}
        />
      </div>
      {field2 && (
        <div className="flex-1">
          <ReadOnlyField 
            label={field2.label} 
            value={data?.[field2.key]} 
            isChanged={!!getChangeType(field2.key)}
            changeType={getChangeType(field2.key)}
          />
        </div>
      )}
    </div>
  );
};

const SingleFieldRow = ({ field, data, prevData }) => {
  const getChangeType = () => {
    if (!prevData) return null;
    const currentVal = data?.[field.key] || '';
    const prevVal = prevData?.[field.key] || '';
    if (currentVal !== prevVal) {
      if (!prevVal && currentVal) return 'added';
      if (prevVal && !currentVal) return 'removed';
      return 'modified';
    }
    return null;
  };

  return (
    <div className="py-2 border-b border-gray-100">
      <ReadOnlyField 
        label={field.label} 
        value={data?.[field.key]} 
        isChanged={!!getChangeType()}
        changeType={getChangeType()}
      />
    </div>
  );
};

// =============================================================================
// VERSION FIELD DISPLAY COMPONENTS (with change highlighting)
// =============================================================================
const VersionCheckboxRow = ({ label, checked, isChanged, changeType }) => {
  const getBgClass = () => {
    if (!isChanged) return 'border-gray-100';
    switch (changeType) {
      case 'added': return 'border-green-200 bg-green-50';
      case 'removed': return 'border-red-200 bg-red-50';
      case 'modified': return 'border-yellow-200 bg-yellow-50';
      default: return 'border-gray-100';
    }
  };

  const getLabelClass = () => {
    if (!isChanged) return 'text-gray-700';
    switch (changeType) {
      case 'added': return 'text-green-700';
      case 'removed': return 'text-red-700';
      case 'modified': return 'text-yellow-700';
      default: return 'text-gray-700';
    }
  };

  return (
    <div className={`flex items-center py-2 border-b ${getBgClass()}`}>
      <input 
        type="checkbox" 
        checked={checked || false} 
        readOnly
        className={`w-4 h-4 rounded cursor-default ${
          isChanged 
            ? changeType === 'added' ? 'border-green-300 text-green-600' :
              changeType === 'removed' ? 'border-red-300 text-red-600' :
              'border-yellow-300 text-yellow-600'
            : 'border-gray-300 text-teal-600'
        }`}
      />
      <span className={`ml-3 text-sm ${getLabelClass()}`}>
        {label}
        {isChanged && (
          <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${
            changeType === 'added' ? 'bg-green-200 text-green-800' :
            changeType === 'removed' ? 'bg-red-200 text-red-800' :
            'bg-yellow-200 text-yellow-800'
          }`}>
            {changeType === 'modified' ? (checked ? 'NOW TRUE' : 'NOW FALSE') : changeType.toUpperCase()}
          </span>
        )}
      </span>
    </div>
  );
};

const VersionFieldRow = ({ label, value, isChanged, changeType }) => {
  const getBgClass = () => {
    if (!isChanged) return 'border-gray-100';
    switch (changeType) {
      case 'added': return 'border-green-200 bg-green-50';
      case 'removed': return 'border-red-200 bg-red-50';
      case 'modified': return 'border-yellow-200 bg-yellow-50';
      default: return 'border-gray-100';
    }
  };

  const getLabelClass = () => {
    if (!isChanged) return 'text-gray-600';
    switch (changeType) {
      case 'added': return 'text-green-700';
      case 'removed': return 'text-red-700';
      case 'modified': return 'text-yellow-700';
      default: return 'text-gray-600';
    }
  };

  const getValueClass = () => {
    if (!isChanged) return 'border-gray-300 text-gray-900 bg-white';
    switch (changeType) {
      case 'added': return 'border-green-300 text-green-900 bg-green-100';
      case 'removed': return 'border-red-300 text-red-900 bg-red-100 line-through';
      case 'modified': return 'border-yellow-300 text-yellow-900 bg-yellow-100';
      default: return 'border-gray-300 text-gray-900 bg-white';
    }
  };

  return (
    <div className={`flex flex-col sm:flex-row sm:items-start py-3 border-b ${getBgClass()}`}>
      <label className={`text-sm font-medium mb-1 sm:mb-0 sm:w-40 md:w-48 sm:flex-shrink-0 sm:pt-1 ${getLabelClass()}`}>
        {label}:
        {isChanged && (
          <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${
            changeType === 'added' ? 'bg-green-200 text-green-800' :
            changeType === 'removed' ? 'bg-red-200 text-red-800' :
            'bg-yellow-200 text-yellow-800'
          }`}>
            {changeType === 'added' ? 'NEW' : changeType === 'removed' ? 'REMOVED' : 'CHANGED'}
          </span>
        )}
      </label>
      <div className="flex-1">
        <div className={`w-full sm:max-w-md px-3 py-1.5 border rounded text-sm min-h-[32px] ${getValueClass()}`}>
          {value !== null && value !== undefined && value !== '' ? String(value) : <span className="text-gray-400"></span>}
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================
const VersionsPage = () => {
  const { id: companyId, siteId } = useParams();
  const navigate = useNavigate();
  
  // Data state
  const [company, setCompany] = useState(null);
  const [allSitesVersions, setAllSitesVersions] = useState({}); // { siteId: [versions] }
  const [selectedSite, setSelectedSite] = useState(null);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [categoryFieldsMap, setCategoryFieldsMap] = useState({}); // { category: [fields] }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // UI state
  const [activeInfoTab, setActiveInfoTab] = useState('company');
  const [toastMessage, setToastMessage] = useState(null);
  
  // Action state (kept for potential future use)
  const [deleting, setDeleting] = useState(false);

  // Refs
  const techDetailsRef = useRef(null);
  const toastTimeoutRef = useRef(null);

  // Show toast helper
  const showToast = (type, text) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToastMessage({ type, text });
    toastTimeoutRef.current = setTimeout(() => setToastMessage(null), TOAST_DURATION);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  // Fetch all data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch company with all production sites
        const companyData = await companyService.getCompany(companyId);
        setCompany(companyData);
        
        if (!companyData.production_sites || companyData.production_sites.length === 0) {
          setError('No production sites found for this company');
          return;
        }

        // Fetch versions for ALL production sites
        const versionsMap = {};
        const fieldsMap = {};
        
        for (const site of companyData.production_sites) {
          try {
            // Fetch versions for this site
            const versionsData = await companyService.getVersions(companyId, site.site_id);
            versionsMap[site.site_id] = versionsData;
            
            // Fetch category metadata if not cached
            if (!fieldMetadataCache[site.category]) {
              const response = await api.get(`/api/fields/metadata/${site.category}/`);
              fieldMetadataCache[site.category] = response.data.category_fields || [];
            }
            fieldsMap[site.category] = fieldMetadataCache[site.category];
          } catch (err) {
            console.error(`Failed to fetch versions for site ${site.site_id}:`, err);
            versionsMap[site.site_id] = [];
          }
        }
        
        setAllSitesVersions(versionsMap);
        setCategoryFieldsMap(fieldsMap);
        
        // Select the site from URL parameter, or first site
        const initialSite = companyData.production_sites.find(s => s.site_id === siteId) 
          || companyData.production_sites[0];
        setSelectedSite(initialSite);
        
        // Select current version for that site
        const siteVersions = versionsMap[initialSite.site_id] || [];
        if (siteVersions.length > 0) {
          setSelectedVersion(siteVersions[0]); // First version is current
        }
      } catch (err) {
        console.error('Failed to fetch data:', err);
        setError(err.message || 'Failed to load version data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [companyId, siteId]);

  // Update selected version when site changes
  useEffect(() => {
    if (selectedSite && allSitesVersions[selectedSite.site_id]) {
      const siteVersions = allSitesVersions[selectedSite.site_id];
      if (siteVersions.length > 0) {
        setSelectedVersion(siteVersions[0]);
      } else {
        setSelectedVersion(null);
      }
    }
    // Reset scroll
    if (techDetailsRef.current) {
      techDetailsRef.current.scrollTop = 0;
    }
  }, [selectedSite, allSitesVersions]);

  // Get versions for selected site
  const currentSiteVersions = useMemo(() => {
    if (!selectedSite) return [];
    return allSitesVersions[selectedSite.site_id] || [];
  }, [selectedSite, allSitesVersions]);

  // Find the latest snapshot (highest version_number that's not Initial)
  const latestSnapshotVersionNumber = useMemo(() => {
    const snapshots = currentSiteVersions.filter(v => !v.is_initial && v.version_number > 0);
    if (snapshots.length === 0) return null;
    return Math.max(...snapshots.map(v => v.version_number));
  }, [currentSiteVersions]);

  // Get previous version for comparison
  const previousVersion = useMemo(() => {
    console.log('=== previousVersion calculation ===');
    console.log('currentSiteVersions:', currentSiteVersions.map(v => ({ id: v.version_id, num: v.version_number, is_initial: v.is_initial })));
    console.log('selectedVersion:', selectedVersion?.version_number);
    
    if (!selectedVersion || currentSiteVersions.length < 2) {
      console.log('Not enough versions or no selected version');
      return null;
    }
    
    const currentIndex = currentSiteVersions.findIndex(v => v.version_id === selectedVersion.version_id);
    console.log('currentIndex:', currentIndex);
    
    if (currentIndex < 0 || currentIndex >= currentSiteVersions.length - 1) {
      console.log('Index out of bounds for finding previous');
      return null;
    }
    
    const prev = currentSiteVersions[currentIndex + 1];
    console.log('previousVersion found:', prev?.version_number);
    return prev;
  }, [selectedVersion, currentSiteVersions]);

  // Get snapshot data - DO NOT fall back to current company data
  // Old versions without snapshots should show empty/unavailable data
  const snapshotCompanyData = useMemo(() => {
    if (selectedVersion?.company_data_snapshot && Object.keys(selectedVersion.company_data_snapshot).length > 0) {
      return selectedVersion.company_data_snapshot;
    }
    // Return null for old versions without snapshots - don't show current data
    return null;
  }, [selectedVersion]);

  const snapshotContactData = useMemo(() => {
    if (selectedVersion?.contact_data_snapshot && Object.keys(selectedVersion.contact_data_snapshot).length > 0) {
      return selectedVersion.contact_data_snapshot;
    }
    // Return null for old versions without snapshots
    return null;
  }, [selectedVersion]);

  const snapshotNotesData = useMemo(() => {
    if (selectedVersion?.notes_snapshot && Array.isArray(selectedVersion.notes_snapshot)) {
      return selectedVersion.notes_snapshot;
    }
    // Return null for old versions without snapshots
    return null;
  }, [selectedVersion]);

  // Previous version snapshot data for comparison
  const prevSnapshotCompanyData = useMemo(() => {
    if (previousVersion?.company_data_snapshot && Object.keys(previousVersion.company_data_snapshot).length > 0) {
      return previousVersion.company_data_snapshot;
    }
    return null;
  }, [previousVersion]);

  const prevSnapshotContactData = useMemo(() => {
    if (previousVersion?.contact_data_snapshot && Object.keys(previousVersion.contact_data_snapshot).length > 0) {
      return previousVersion.contact_data_snapshot;
    }
    return null;
  }, [previousVersion]);

  // Get category fields for selected site
  const categoryFields = useMemo(() => {
    if (!selectedSite) return [];
    return categoryFieldsMap[selectedSite.category] || [];
  }, [selectedSite, categoryFieldsMap]);

  // Get technical data from snapshot if available, otherwise fall back to version fields
  // This ensures we display the frozen snapshot data, not live data
  const getTechnicalData = (version) => {
    if (!version) return null;
    
    // If technical_data_snapshot exists and has data, use it
    if (version.technical_data_snapshot && Object.keys(version.technical_data_snapshot).length > 0) {
      return version.technical_data_snapshot;
    }
    
    // Fall back to version fields directly (for older versions without technical snapshot)
    return version;
  };

  const currentTechnicalData = useMemo(() => getTechnicalData(selectedVersion), [selectedVersion]);
  const prevTechnicalData = useMemo(() => getTechnicalData(previousVersion), [previousVersion]);

  // Calculate field differences for process fields using SNAPSHOT data
  const fieldDifferences = useMemo(() => {
    console.log('=== fieldDifferences calculation ===' );
    console.log('selectedVersion:', selectedVersion?.version_number, selectedVersion?.version_id);
    console.log('previousVersion:', previousVersion?.version_number, previousVersion?.version_id);
    console.log('categoryFields count:', categoryFields.length);
    console.log('Using technical snapshots:', !!selectedVersion?.technical_data_snapshot, !!previousVersion?.technical_data_snapshot);
    
    // Initial Version (baseline) should never show changes
    if (!previousVersion || !selectedVersion || selectedVersion.is_initial || selectedVersion.version_number === 0) {
      console.log('No previousVersion or selectedVersion is Initial - returning empty diffs');
      return {};
    }
    
    const diffs = {};
    categoryFields.forEach(field => {
      const fieldName = field.name;
      // Use snapshot data for comparison
      const currentVal = currentTechnicalData?.[fieldName];
      const prevVal = prevTechnicalData?.[fieldName];
      
      // Normalize values for comparison
      const normalizedCurrent = currentVal === null || currentVal === undefined ? '' : currentVal;
      const normalizedPrev = prevVal === null || prevVal === undefined ? '' : prevVal;
      
      // For booleans, compare as booleans
      const isBoolField = field.type === 'checkbox';
      if (isBoolField) {
        const currentBool = currentVal === true;
        const prevBool = prevVal === true;
        if (currentBool !== prevBool) {
          console.log(`DIFF found (bool): ${fieldName}`, { currentBool, prevBool });
          if (!prevBool && currentBool) {
            diffs[fieldName] = 'added';
          } else if (prevBool && !currentBool) {
            diffs[fieldName] = 'removed';
          }
        }
      } else {
        // For non-booleans, compare as strings
        if (String(normalizedCurrent) !== String(normalizedPrev)) {
          console.log(`DIFF found: ${fieldName}`, { currentVal, prevVal, normalizedCurrent, normalizedPrev });
          if (normalizedPrev === '' && normalizedCurrent !== '') {
            diffs[fieldName] = 'added';
          } else if (normalizedPrev !== '' && normalizedCurrent === '') {
            diffs[fieldName] = 'removed';
          } else {
            diffs[fieldName] = 'modified';
          }
        }
      }
    });
    
    console.log('Final diffs:', diffs);
    return diffs;
  }, [selectedVersion, previousVersion, categoryFields, currentTechnicalData, prevTechnicalData]);

  // Build ordered fields for display using SNAPSHOT data
  const orderedFields = useMemo(() => {
    if (!selectedVersion || categoryFields.length === 0) {
      return [];
    }
    
    return categoryFields.map(fieldMeta => {
      const fieldName = fieldMeta.name;
      // Use snapshot data for display
      const value = currentTechnicalData?.[fieldName];
      const isBoolean = fieldMeta.type === 'checkbox';
      const changeType = fieldDifferences[fieldName] || null;

      return {
        key: fieldName,
        label: fieldMeta.label,
        value: isBoolean ? value === true : (value ?? ''),
        isBoolean,
        isChanged: !!changeType,
        changeType
      };
    });
  }, [selectedVersion, categoryFields, fieldDifferences, currentTechnicalData]);

  const changeCount = Object.keys(fieldDifferences).length;

  // Check if snapshot has data
  const hasSnapshot = selectedVersion?.company_data_snapshot && Object.keys(selectedVersion.company_data_snapshot).length > 0;
  
  // Check if technical snapshot has data
  const hasTechnicalSnapshot = selectedVersion?.technical_data_snapshot && Object.keys(selectedVersion.technical_data_snapshot).length > 0;

  // Delete functionality removed - all versions are permanent

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
              onClick={() => navigate(`/companies/${companyId}`)}
              className="mt-4 px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
            >
              Back to Company
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Build subtitle with category badges
  const pageSubtitleContent = (
    <div className="flex flex-wrap items-center gap-2 mt-1">
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

  // Company Info fields layout
  const companyNameField = COMPANY_INFO_FIELDS[0];
  const remainingCompanyFields = COMPANY_INFO_FIELDS.slice(1);
  const companyFieldPairs = [];
  for (let i = 0; i < remainingCompanyFields.length; i += 2) {
    companyFieldPairs.push({
      field1: remainingCompanyFields[i],
      field2: remainingCompanyFields[i + 1] || null
    });
  }

  return (
    <DashboardLayout
      pageTitle={company?.company_name || 'Company Details'}
      pageSubtitleBottom={pageSubtitleContent}
    >
      {/* Toast Notification */}
      <ToastNotification 
        message={toastMessage} 
        onClose={() => setToastMessage(null)} 
      />

      <div className="flex-1 overflow-auto bg-gray-50">
        {/* ==================== BREADCRUMBS ==================== */}
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3">
          <nav className="flex items-center gap-2 text-sm">
            <button 
              onClick={() => navigate('/staff-dashboard')}
              className="text-indigo-500 hover:text-indigo-600 transition-colors"
            >
              <Home className="w-4 h-4" />
            </button>
            <ChevronRight className="w-4 h-4 text-indigo-400" />
            <button 
              onClick={() => navigate('/company-database')}
              className="text-indigo-500 hover:text-indigo-600 transition-colors"
            >
              Company Database
            </button>
            <ChevronRight className="w-4 h-4 text-gray-400" />
            <button 
              onClick={() => navigate(`/companies/${companyId}`)}
              className="text-indigo-500 hover:text-indigo-600 transition-colors truncate max-w-[150px]"
            >
              {company?.company_name || 'Company'}
            </button>
            <ChevronRight className="w-4 h-4 text-gray-400" />
            <span className="text-indigo-900 font-medium">
              Version History
            </span>
          </nav>
        </div>

        {/* ==================== ACTION BAR ==================== */}
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-2.5">
          <div className="flex items-center justify-between">
            <button 
              onClick={() => navigate(`/companies/${companyId}`)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm font-medium hidden sm:inline">Back</span>
            </button>

            {/* All versions are permanent - no delete button */}
          </div>
        </div>

        {/* ==================== VERSION TABS ==================== */}
        {currentSiteVersions.length > 0 && (
          <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-2">
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <span className="text-sm text-gray-500 font-medium mr-2 flex-shrink-0">Versions:</span>
              {currentSiteVersions
                .slice()
                .sort((a, b) => a.version_number - b.version_number)
                .map(v => {
                  const isSelected = selectedVersion?.version_id === v.version_id;
                  const isInitial = v.is_initial || v.version_number === 0;
                  const displayName = isInitial ? 'Initial' : `Version ${v.version_number}`;
                  // Show "Current" badge on the latest snapshot (highest version_number)
                  const isLatestSnapshot = !isInitial && v.version_number === latestSnapshotVersionNumber;
                  
                  return (
                    <button
                      key={v.version_id}
                      onClick={() => setSelectedVersion(v)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex-shrink-0 ${
                        isSelected
                          ? isInitial 
                            ? 'bg-slate-600 text-white'
                            : 'bg-indigo-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <span>{displayName}</span>
                      {isLatestSnapshot && (
                        <span className="px-1.5 py-0.5 bg-green-500 text-white text-xs rounded-full">
                          Current
                        </span>
                      )}
                      {!v.is_active && (
                        <span className="px-1.5 py-0.5 bg-gray-500 text-white text-xs rounded-full">
                          Inactive
                        </span>
                      )}
                    </button>
                  );
                })}
            </div>
          </div>
        )}

        {/* ==================== VERSION INFO BANNER ==================== */}
        {selectedVersion && (
          <div className={`${selectedVersion.is_initial || selectedVersion.version_number === 0 ? 'bg-slate-50 border-slate-200' : 'bg-indigo-50 border-indigo-200'} border-b px-4 sm:px-6 py-3`}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-2">
                <Camera className={`w-5 h-5 ${selectedVersion.is_initial || selectedVersion.version_number === 0 ? 'text-slate-600' : 'text-indigo-600'}`} />
                <span className={`font-bold ${selectedVersion.is_initial || selectedVersion.version_number === 0 ? 'text-slate-900' : 'text-indigo-900'}`}>
                  {selectedVersion.is_initial || selectedVersion.version_number === 0 
                    ? 'Initial Version' 
                    : `${hasSnapshot ? 'Snapshot' : 'Version'} ${selectedVersion.version_number}`}
                </span>
                {/* Show Current badge on the latest snapshot */}
                {!(selectedVersion.is_initial || selectedVersion.version_number === 0) && selectedVersion.version_number === latestSnapshotVersionNumber && (
                  <span className="px-2 py-0.5 bg-green-600 text-white text-xs rounded-full">
                    Current
                  </span>
                )}
                {!selectedVersion.is_active && (
                  <span className="px-2 py-0.5 bg-gray-500 text-white text-xs rounded-full">
                    Inactive
                  </span>
                )}
                {hasSnapshot && (
                  <span className={`px-2 py-0.5 ${selectedVersion.is_initial || selectedVersion.version_number === 0 ? 'bg-slate-600' : 'bg-indigo-600'} text-white text-xs rounded-full`}>
                    Full Snapshot
                  </span>
                )}
                {(selectedVersion.is_initial || selectedVersion.version_number === 0) && (
                  <span className="px-2 py-0.5 bg-slate-500 text-white text-xs rounded-full">
                    Baseline
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-600">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  Created: {new Date(selectedVersion.created_at).toLocaleString()}
                </span>
                {changeCount > 0 && previousVersion && (
                  <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full">
                    {changeCount} change{changeCount > 1 ? 's' : ''} from {previousVersion.is_initial || previousVersion.version_number === 0 ? 'Initial' : `v${previousVersion.version_number}`}
                  </span>
                )}
              </div>
            </div>
            {selectedVersion.version_notes && (
              <p className={`text-sm ${selectedVersion.is_initial || selectedVersion.version_number === 0 ? 'text-slate-700' : 'text-indigo-700'} mt-2`}>
                <span className="font-medium">Notes:</span> {selectedVersion.version_notes}
              </p>
            )}
            {!hasSnapshot && (
              <p className="text-xs text-amber-600 mt-2 italic">
                ⚠️ This version was created before full snapshots were enabled. Company/Contact/Notes snapshot data is not available.
              </p>
            )}
          </div>
        )}

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
              {/* Company Information Tab - Uses snapshot data */}
              {activeInfoTab === 'company' && (
                <div>
                  {snapshotCompanyData ? (
                    <>
                      <SingleFieldRow 
                        field={companyNameField} 
                        data={snapshotCompanyData} 
                        prevData={prevSnapshotCompanyData}
                      />
                      
                      {companyFieldPairs.map((pair, idx) => (
                        <TwoFieldsRow 
                          key={idx}
                          field1={pair.field1}
                          field2={pair.field2}
                          data={snapshotCompanyData}
                          prevData={prevSnapshotCompanyData}
                        />
                      ))}
                    </>
                  ) : (
                    <div className="text-center py-8 sm:py-12 bg-amber-50 border border-amber-200 rounded-lg">
                      <AlertCircle className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 text-amber-500" />
                      <p className="text-amber-700 font-medium">No Snapshot Data Available</p>
                      <p className="text-amber-600 text-sm mt-1">This version was created before full snapshots were enabled.</p>
                      <p className="text-amber-600 text-sm">Only process technical fields are available for this version.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Contact Information Tab - Uses snapshot data */}
              {activeInfoTab === 'contact' && (
                <div>
                  {snapshotContactData ? (
                    <>
                      {[1, 2, 3, 4].map(n => {
                        const getContactChangeType = (fieldKey) => {
                          if (!prevSnapshotContactData) return null;
                          const currentVal = snapshotContactData?.[fieldKey] || '';
                          const prevVal = prevSnapshotContactData?.[fieldKey] || '';
                          if (currentVal !== prevVal) {
                            if (!prevVal && currentVal) return 'added';
                            if (prevVal && !currentVal) return 'removed';
                            return 'modified';
                          }
                          return null;
                        };

                        return (
                          <div key={n} className="mb-6 last:mb-0">
                            <div className="flex flex-col md:flex-row md:gap-8 py-2 border-b border-gray-100">
                              <div className="flex-1 mb-3 md:mb-0">
                                <ReadOnlyField 
                                  label={`Title ${n}`} 
                                  value={snapshotContactData?.[`title_${n}`]} 
                                  isChanged={!!getContactChangeType(`title_${n}`)}
                                  changeType={getContactChangeType(`title_${n}`)}
                                />
                              </div>
                              <div className="flex-1">
                                <ReadOnlyField 
                                  label={`Initials ${n}`} 
                                  value={snapshotContactData?.[`initials_${n}`]} 
                                  isChanged={!!getContactChangeType(`initials_${n}`)}
                                  changeType={getContactChangeType(`initials_${n}`)}
                                />
                              </div>
                            </div>
                            <div className="flex flex-col md:flex-row md:gap-8 py-2 border-b border-gray-100">
                              <div className="flex-1 mb-3 md:mb-0">
                                <ReadOnlyField 
                                  label={`Surname ${n}`} 
                                  value={snapshotContactData?.[`surname_${n}`]} 
                                  isChanged={!!getContactChangeType(`surname_${n}`)}
                                  changeType={getContactChangeType(`surname_${n}`)}
                                />
                              </div>
                              <div className="flex-1">
                                <ReadOnlyField 
                                  label={`Position ${n}`} 
                                  value={snapshotContactData?.[`position_${n}`]} 
                                  isChanged={!!getContactChangeType(`position_${n}`)}
                                  changeType={getContactChangeType(`position_${n}`)}
                                />
                              </div>
                            </div>
                            {n < 4 && <div className="border-b-2 border-gray-300 my-4"></div>}
                          </div>
                        );
                      })}
                    </>
                  ) : (
                    <div className="text-center py-8 sm:py-12 bg-amber-50 border border-amber-200 rounded-lg">
                      <AlertCircle className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 text-amber-500" />
                      <p className="text-amber-700 font-medium">No Snapshot Data Available</p>
                      <p className="text-amber-600 text-sm mt-1">This version was created before full snapshots were enabled.</p>
                      <p className="text-amber-600 text-sm">Only process technical fields are available for this version.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Comments/Notes Tab - Uses snapshot data */}
              {activeInfoTab === 'notes' && (
                <div>
                  {snapshotNotesData ? (
                    snapshotNotesData.length > 0 ? (
                      <div className="space-y-4">
                        {snapshotNotesData.map((note, idx) => (
                          <div key={note.note_id || idx} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                            <p className="text-sm text-gray-900">{note.content}</p>
                            <p className="text-xs text-gray-500 mt-2">
                              {note.note_type} | {note.created_at ? new Date(note.created_at).toLocaleDateString() : 'Unknown date'}
                              {note.created_by && ` | By ${note.created_by}`}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 sm:py-12 text-gray-400">
                        <MessageSquare className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 opacity-50" />
                        <p>No comments or notes at this version</p>
                      </div>
                    )
                  ) : (
                    <div className="text-center py-8 sm:py-12 bg-amber-50 border border-amber-200 rounded-lg">
                      <AlertCircle className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 text-amber-500" />
                      <p className="text-amber-700 font-medium">No Snapshot Data Available</p>
                      <p className="text-amber-600 text-sm mt-1">This version was created before full snapshots were enabled.</p>
                      <p className="text-amber-600 text-sm">Only process technical fields are available for this version.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ==================== PROCESS & TECHNICAL DETAILS SECTION ==================== */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
            
            {/* Process Sidebar */}
            <div className="lg:col-span-3 bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3">
                Processes Linked
              </h3>
              <div className="flex lg:flex-col gap-2 lg:gap-2 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0">
                {company?.production_sites?.map(site => {
                  const colors = CATEGORY_COLORS[site.category] || CATEGORY_COLORS.INJECTION;
                  const isSelected = selectedSite?.site_id === site.site_id;
                  const siteVersions = allSitesVersions[site.site_id] || [];
                  const versionCount = siteVersions.length;
                  
                  return (
                    <button
                      key={site.site_id}
                      onClick={() => setSelectedSite(site)}
                      className={`flex-shrink-0 lg:w-full text-left px-3 py-2 rounded transition-all ${
                        isSelected 
                          ? `${colors.light} ${colors.border} border-l-4`
                          : 'border-l-4 border-transparent bg-gray-50 lg:bg-transparent hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-sm whitespace-nowrap lg:whitespace-normal ${
                          isSelected ? `${colors.text} font-semibold` : 'text-gray-700'
                        }`}>
                          {CATEGORY_DISPLAY[site.category] || site.category}
                        </span>
                        {isSelected && <ChevronRight className="w-4 h-4 hidden lg:block" />}
                      </div>
                      <span className="text-xs text-gray-500">
                        {versionCount} version{versionCount !== 1 ? 's' : ''}
                      </span>
                    </button>
                  );
                })}
                
                {(!company?.production_sites || company.production_sites.length === 0) && (
                  <p className="text-sm text-gray-400 text-center py-4">No processes linked</p>
                )}
              </div>
            </div>

            {/* Technical Details */}
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
                  {selectedVersion && (
                    <span className="text-xs text-gray-500">
                      {selectedVersion.is_initial || selectedVersion.version_number === 0 
                        ? 'Initial Version' 
                        : `Version ${selectedVersion.version_number}`}
                    </span>
                  )}
                </div>
              )}

              {/* Legend for changes */}
              {previousVersion && changeCount > 0 && (
                <div className="px-4 sm:px-5 py-2 bg-gray-50 border-b border-gray-200">
                  <div className="flex flex-wrap items-center gap-4 text-xs">
                    <span className="font-medium text-gray-600">
                      Changes from {previousVersion.is_initial || previousVersion.version_number === 0 ? 'Initial Version' : `v${previousVersion.version_number}`}:
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded bg-green-200 border border-green-300"></span>
                      Added
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded bg-yellow-200 border border-yellow-300"></span>
                      Modified
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded bg-red-200 border border-red-300"></span>
                      Removed
                    </span>
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
                        <VersionCheckboxRow
                          key={field.key}
                          label={field.label}
                          checked={field.value}
                          isChanged={field.isChanged}
                          changeType={field.changeType}
                        />
                      ) : (
                        <VersionFieldRow
                          key={field.key}
                          label={field.label}
                          value={field.value}
                          isChanged={field.isChanged}
                          changeType={field.changeType}
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
        </div>
      </div>

    </DashboardLayout>
  );
};

export default VersionsPage;
