// frontend/src/pages/database/CompanyDetailPage.jsx
/**
 * Company Detail Page with Full Functionality
 * 
 * Features:
 * - Status management (Complete/Incomplete/Deleted)
 * - Edit mode with Save (updates without creating version)
 * - Create Version (explicit snapshot)
 * - Navigate to Versions page
 * - Add Process modal (in view mode)
 * - Process Active/Inactive toggle
 * - Delete Process with confirmation modal
 * - Delete Company (soft delete - sets status to DELETED)
 * - Red styling when status is DELETED or process is Inactive
 * - Toast notifications in top right corner
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Building2, MapPin, Phone, FileText, MessageSquare,
  ChevronRight, Edit, Plus, Trash2, ArrowLeft, Save, Layers,
  MoreVertical, X, Home, Check, AlertCircle, Clock, ChevronDown, AlertTriangle, Hash
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import LoadingSpinner from '../../components/LoadingSpinner';
import DeleteConfirmationModal from '../../components/modals/DeleteConfirmationModal';
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

const CATEGORY_OPTIONS = [
  { value: 'INJECTION', label: 'Injection Moulders' },
  { value: 'BLOW', label: 'Blow Moulders' },
  { value: 'ROTO', label: 'Roto Moulders' },
  { value: 'PE_FILM', label: 'PE Film Extruders' },
  { value: 'SHEET', label: 'Sheet Extruders' },
  { value: 'PIPE', label: 'Pipe Extruders' },
  { value: 'TUBE_HOSE', label: 'Tube & Hose Extruders' },
  { value: 'PROFILE', label: 'Profile Extruders' },
  { value: 'CABLE', label: 'Cable Extruders' },
  { value: 'COMPOUNDER', label: 'Compounders' },
];

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

// Fields allowed for company update (must match backend CompanyUpdateSerializer)
const ALLOWED_COMPANY_FIELDS = [
  'company_name', 'status',
  'address_1', 'address_2', 'address_3', 'address_4',
  'region', 'country', 'geographical_coverage',
  'phone_number', 'company_email', 'website',
  'accreditation', 'parent_company',
  'title_1', 'initials_1', 'surname_1', 'position_1',
  'title_2', 'initials_2', 'surname_2', 'position_2',
  'title_3', 'initials_3', 'surname_3', 'position_3',
  'title_4', 'initials_4', 'surname_4', 'position_4',
  'project_code'
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
  { id: 'notes', label: 'Comments / Notes', shortLabel: 'Notes', icon: MessageSquare },
];

// Cache for field metadata per category
const fieldMetadataCache = {};

// Toast duration in milliseconds
const TOAST_DURATION = 10000;

// =============================================================================
// HELPER: Filter object to only allowed keys with non-null values
// =============================================================================
const filterAllowedFields = (data, allowedFields) => {
  const filtered = {};
  allowedFields.forEach(key => {
    if (data.hasOwnProperty(key) && data[key] !== undefined) {
      filtered[key] = data[key] === null ? '' : data[key];
    }
  });
  return filtered;
};

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
// EDITABLE FIELD COMPONENT
// =============================================================================
const EditableField = ({ label, value, fieldKey, isEditing, onChange, isLarge = false, isInactive = false }) => (
  <div className="flex flex-col sm:flex-row sm:items-start">
    <label className={`text-sm font-medium mb-1 sm:mb-0 sm:w-40 md:w-44 sm:flex-shrink-0 sm:pt-1.5 ${isInactive ? 'text-red-600' : 'text-gray-600'}`}>
      {label}:
    </label>
    <div className={`flex-1 ${isLarge ? 'min-h-[80px]' : ''}`}>
      {isEditing ? (
        isLarge ? (
          <textarea
            value={value || ''}
            onChange={(e) => onChange(fieldKey, e.target.value)}
            className={`w-full px-3 py-1.5 bg-white border rounded text-sm min-h-[80px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isInactive ? 'border-red-300 text-red-900' : 'border-blue-300 text-gray-900'}`}
          />
        ) : (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(fieldKey, e.target.value)}
            className={`w-full px-3 py-1.5 bg-white border rounded text-sm min-h-[32px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isInactive ? 'border-red-300 text-red-900' : 'border-blue-300 text-gray-900'}`}
          />
        )
      ) : (
        <div className={`w-full px-3 py-1.5 border rounded text-sm ${isLarge ? 'min-h-[80px]' : 'min-h-[32px]'} ${isInactive ? 'border-red-300 text-red-900 bg-red-50' : 'border-gray-300 text-gray-900 bg-white'}`}>
          {value || <span className="text-gray-400"></span>}
        </div>
      )}
    </div>
  </div>
);

// =============================================================================
// TWO FIELDS ROW - Editable
// =============================================================================
const TwoFieldsRowEditable = ({ field1, field2, data, isEditing, onChange, isInactive }) => (
  <div className="flex flex-col md:flex-row md:gap-8 py-2 border-b border-gray-100">
    <div className="flex-1 mb-3 md:mb-0">
      <EditableField 
        label={field1.label} 
        value={data?.[field1.key]} 
        fieldKey={field1.key}
        isEditing={isEditing}
        onChange={onChange}
        isLarge={field1.isLarge}
        isInactive={isInactive}
      />
    </div>
    {field2 && (
      <div className="flex-1">
        <EditableField 
          label={field2.label} 
          value={data?.[field2.key]}
          fieldKey={field2.key}
          isEditing={isEditing}
          onChange={onChange}
          isLarge={field2.isLarge}
          isInactive={isInactive}
        />
      </div>
    )}
  </div>
);

// =============================================================================
// SINGLE FIELD ROW - Editable
// =============================================================================
const SingleFieldRowEditable = ({ field, data, isEditing, onChange, isInactive }) => (
  <div className="py-2 border-b border-gray-100">
    <EditableField 
      label={field.label} 
      value={data?.[field.key]}
      fieldKey={field.key}
      isEditing={isEditing}
      onChange={onChange}
      isLarge={field.isLarge}
      isInactive={isInactive}
    />
  </div>
);

// =============================================================================
// READ-ONLY TWO FIELDS ROW - For Company Key and Project Code (Field box format)
// =============================================================================
const ReadOnlyTwoFieldsRow = ({ label1, value1, label2, value2, isInactive }) => (
  <div className="flex flex-col md:flex-row md:gap-8 py-2 border-b border-gray-100">
    <div className="flex-1 mb-3 md:mb-0">
      <div className="flex flex-col sm:flex-row sm:items-start">
        <label className={`text-sm font-medium mb-1 sm:mb-0 sm:w-40 md:w-44 sm:flex-shrink-0 sm:pt-1.5 ${isInactive ? 'text-red-600' : 'text-gray-600'}`}>
          {label1}:
        </label>
        <div className="flex-1">
          <div className={`w-full px-3 py-1.5 border rounded text-sm min-h-[32px] font-mono ${isInactive ? 'border-red-300 text-red-900 bg-red-50' : 'border-gray-300 text-gray-900 bg-white'}`}>
            {value1 || '-'}
          </div>
        </div>
      </div>
    </div>
    <div className="flex-1">
      <div className="flex flex-col sm:flex-row sm:items-start">
        <label className={`text-sm font-medium mb-1 sm:mb-0 sm:w-40 md:w-44 sm:flex-shrink-0 sm:pt-1.5 ${isInactive ? 'text-red-600' : 'text-gray-600'}`}>
          {label2}:
        </label>
        <div className="flex-1">
          <div className={`w-full px-3 py-1.5 border rounded text-sm min-h-[32px] font-mono ${isInactive ? 'border-red-300 text-red-900 bg-red-50' : 'border-gray-300 text-gray-900 bg-white'}`}>
            {value2 || '-'}
          </div>
        </div>
      </div>
    </div>
  </div>
);

// =============================================================================
// EDITABLE CHECKBOX ROW
// =============================================================================
const EditableCheckboxRow = ({ label, checked, fieldKey, isEditing, onChange, isInactive }) => (
  <div className={`flex items-center py-2 border-b ${isInactive ? 'border-red-100 bg-red-50' : 'border-gray-100'}`}>
    <input 
      type="checkbox" 
      checked={checked || false} 
      onChange={isEditing ? (e) => onChange(fieldKey, e.target.checked) : undefined}
      readOnly={!isEditing}
      className={`w-4 h-4 rounded focus:ring-teal-500 ${isEditing ? 'cursor-pointer' : 'cursor-default'} ${isInactive ? 'border-red-300 text-red-600' : 'border-gray-300 text-teal-600'}`}
    />
    <span className={`ml-3 text-sm ${isInactive ? 'text-red-700' : 'text-gray-700'}`}>{label}</span>
  </div>
);

// =============================================================================
// EDITABLE TECH FIELD ROW - Supports different field types
// fieldType: 'text' | 'number' | 'email' | 'url' | 'textarea'
// =============================================================================
const EditableTechFieldRow = ({ label, value, fieldKey, fieldType = 'text', isEditing, onChange, isInactive }) => {
  const isTextarea = fieldType === 'textarea';
  
  // Determine HTML input type
  const getInputType = () => {
    switch (fieldType) {
      case 'number': return 'number';
      case 'email': return 'email';
      case 'url': return 'url';
      default: return 'text';
    }
  };

  // Handle value change with type conversion
  const handleChange = (e) => {
    let newValue = e.target.value;
    // For number fields, convert to number or null if empty
    if (fieldType === 'number') {
      newValue = newValue === '' ? null : Number(newValue);
    }
    onChange(fieldKey, newValue);
  };

  // Format display value
  const displayValue = value !== null && value !== undefined ? String(value) : '';

  return (
    <div className={`flex flex-col sm:flex-row sm:items-start py-3 border-b ${isInactive ? 'border-red-100 bg-red-50' : 'border-gray-100'}`}>
      <label className={`text-sm font-medium mb-1 sm:mb-0 sm:w-40 md:w-48 sm:flex-shrink-0 sm:pt-1 ${isInactive ? 'text-red-600' : 'text-gray-600'}`}>
        {label}:
      </label>
      <div className={`flex-1 ${isTextarea ? 'min-h-[80px]' : ''}`}>
        {isEditing ? (
          isTextarea ? (
            <textarea
              value={displayValue}
              onChange={handleChange}
              className={`w-full sm:max-w-md px-3 py-1.5 bg-white border rounded text-sm min-h-[80px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isInactive ? 'border-red-300 text-red-900' : 'border-blue-300 text-gray-900'}`}
            />
          ) : (
            <input
              type={getInputType()}
              value={displayValue}
              onChange={handleChange}
              step={fieldType === 'number' ? 'any' : undefined}
              className={`w-full sm:max-w-md px-3 py-1.5 bg-white border rounded text-sm min-h-[32px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isInactive ? 'border-red-300 text-red-900' : 'border-blue-300 text-gray-900'}`}
            />
          )
        ) : (
          <div className={`w-full sm:max-w-md px-3 py-1.5 border rounded text-sm ${isTextarea ? 'min-h-[80px]' : 'min-h-[32px]'} ${isInactive ? 'border-red-300 text-red-900 bg-red-50' : 'border-gray-300 text-gray-900 bg-white'}`}>
            {displayValue || <span className="text-gray-400"></span>}
          </div>
        )}
      </div>
    </div>
  );
};

// =============================================================================
// CREATE VERSION MODAL
// =============================================================================
const CreateVersionModal = ({ isOpen, onClose, onConfirm, loading }) => {
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isOpen) setNotes('');
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={onClose} />
        
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-auto z-10 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Create Version Snapshot</h3>
          <p className="text-sm text-gray-600 mb-4">
            This will create a snapshot of the <strong>current state</strong> of all data:
          </p>
          <ul className="text-sm text-gray-600 mb-4 list-disc list-inside space-y-1">
            <li>All company information</li>
            <li>All contact information</li>
            <li>All notes/comments</li>
            <li>All technical fields</li>
          </ul>
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Tip:</strong> Save your changes first, then create a version to capture the current state for historical comparison.
            </p>
          </div>
          
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Version notes - describe what changed (optional)..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-4"
            rows={3}
          />
          
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium"
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirm(notes)}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Version'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// ADD PROCESS MODAL
// =============================================================================
const AddProcessModal = ({ isOpen, onClose, onConfirm, existingCategories, loading }) => {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categoryFields, setCategoryFields] = useState([]);
  const [fieldValues, setFieldValues] = useState({});
  const [loadingFields, setLoadingFields] = useState(false);
  const [warning, setWarning] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSelectedCategory('');
      setCategoryFields([]);
      setFieldValues({});
      setWarning('');
    }
  }, [isOpen]);

  // Fetch category fields when category is selected
  useEffect(() => {
    const fetchFields = async () => {
      if (!selectedCategory) {
        setCategoryFields([]);
        return;
      }

      // Check if category already exists
      if (existingCategories.includes(selectedCategory)) {
        setWarning(`This company already has a ${CATEGORY_DISPLAY[selectedCategory]} process linked.`);
        setCategoryFields([]);
        return;
      }
      
      setWarning('');
      setLoadingFields(true);
      try {
        const response = await api.get(`/api/fields/metadata/${selectedCategory}/`);
        const fields = response.data.category_fields || [];
        setCategoryFields(fields);
        // Initialize field values
        const initialValues = {};
        fields.forEach(f => {
          initialValues[f.name] = f.type === 'checkbox' ? false : '';
        });
        setFieldValues(initialValues);
      } catch (err) {
        console.error('Failed to fetch fields:', err);
        setCategoryFields([]);
      } finally {
        setLoadingFields(false);
      }
    };
    fetchFields();
  }, [selectedCategory, existingCategories]);

  const handleFieldChange = (field, value) => {
    setFieldValues(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (!selectedCategory || existingCategories.includes(selectedCategory)) return;
    onConfirm(selectedCategory, fieldValues);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 py-8">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={onClose} />
        
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-auto z-10 max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 bg-blue-500">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Add New Process</h3>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {/* Category Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">-- Select a category --</option>
                {CATEGORY_OPTIONS.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Warning */}
            {warning && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-yellow-800">{warning}</p>
              </div>
            )}

            {/* Category Fields */}
            {loadingFields ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : categoryFields.length > 0 && !warning ? (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  {CATEGORY_DISPLAY[selectedCategory]} Fields
                </h4>
                <div className="space-y-1 max-h-80 overflow-y-auto border border-gray-200 rounded-lg p-3">
                  {categoryFields.map(field => {
                    // Determine input type
                    const getInputType = () => {
                      switch (field.type) {
                        case 'number': return 'number';
                        case 'email': return 'email';
                        case 'url': return 'url';
                        default: return 'text';
                      }
                    };

                    // Handle value change with type conversion
                    const handleInputChange = (e) => {
                      let value = e.target.value;
                      if (field.type === 'number') {
                        value = value === '' ? null : Number(value);
                      }
                      handleFieldChange(field.name, value);
                    };

                    if (field.type === 'checkbox') {
                      return (
                        <div key={field.name} className="flex items-center py-1.5 border-b border-gray-100 last:border-0">
                          <input
                            type="checkbox"
                            checked={fieldValues[field.name] || false}
                            onChange={(e) => handleFieldChange(field.name, e.target.checked)}
                            className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                          />
                          <span className="ml-3 text-sm text-gray-700">{field.label}</span>
                        </div>
                      );
                    } else if (field.type === 'textarea') {
                      return (
                        <div key={field.name} className="flex flex-col sm:flex-row sm:items-start py-2 border-b border-gray-100 last:border-0">
                          <label className="text-sm font-medium text-gray-600 mb-1 sm:mb-0 sm:w-40 sm:flex-shrink-0 sm:pt-1">
                            {field.label}:
                          </label>
                          <textarea
                            value={fieldValues[field.name] || ''}
                            onChange={(e) => handleFieldChange(field.name, e.target.value)}
                            rows={3}
                            className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      );
                    } else {
                      return (
                        <div key={field.name} className="flex flex-col sm:flex-row sm:items-center py-2 border-b border-gray-100 last:border-0">
                          <label className="text-sm font-medium text-gray-600 mb-1 sm:mb-0 sm:w-40 sm:flex-shrink-0">
                            {field.label}:
                          </label>
                          <input
                            type={getInputType()}
                            value={fieldValues[field.name] !== null && fieldValues[field.name] !== undefined ? fieldValues[field.name] : ''}
                            onChange={handleInputChange}
                            step={field.type === 'number' ? 'any' : undefined}
                            className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      );
                    }
                  })}
                </div>
              </div>
            ) : selectedCategory && !warning ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No fields available for this category</p>
              </div>
            ) : null}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading || !selectedCategory || !!warning}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Adding...' : 'Add Process'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// STATUS CHANGE CONFIRMATION MODAL
// =============================================================================
const StatusChangeModal = ({ isOpen, onClose, onConfirm, currentStatus, newStatus, isUpdating }) => {
  if (!isOpen) return null;

  const getStatusInfo = (status) => {
    switch (status) {
      case 'COMPLETE':
        return { label: 'Complete', color: 'text-green-600', bg: 'bg-green-100', icon: Check };
      case 'INCOMPLETE':
        return { label: 'Incomplete', color: 'text-yellow-600', bg: 'bg-yellow-100', icon: AlertCircle };
      case 'DELETED':
        return { label: 'Deleted', color: 'text-red-600', bg: 'bg-red-100', icon: Trash2 };
      default:
        return { label: status, color: 'text-gray-600', bg: 'bg-gray-100', icon: FileText };
    }
  };

  const currentInfo = getStatusInfo(currentStatus);
  const newInfo = getStatusInfo(newStatus);
  const CurrentIcon = currentInfo.icon;
  const NewIcon = newInfo.icon;

  const isDeleting = newStatus === 'DELETED';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={onClose} />
        
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-auto z-10 overflow-hidden">
          {/* Header */}
          <div className={`px-6 py-4 ${isDeleting ? 'bg-red-50' : 'bg-blue-50'}`}>
            <div className="flex items-center gap-3">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${isDeleting ? 'bg-red-100' : 'bg-blue-100'}`}>
                <AlertTriangle className={`w-5 h-5 ${isDeleting ? 'text-red-600' : 'text-blue-600'}`} />
              </div>
              <h3 className={`text-lg font-semibold ${isDeleting ? 'text-red-900' : 'text-gray-900'}`}>
                {isDeleting ? 'Mark as Deleted?' : 'Change Status?'}
              </h3>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-4">
            <p className="text-sm text-gray-600 mb-4">
              {isDeleting 
                ? 'Are you sure you want to mark this company as deleted? The data will be preserved but the company will be flagged as deleted.'
                : 'Are you sure you want to change the status of this company?'
              }
            </p>

            {/* Status Change Visualization */}
            <div className="flex items-center justify-center gap-3 py-4 bg-gray-50 rounded-lg">
              <div className="flex flex-col items-center gap-1">
                <div className={`flex items-center justify-center w-12 h-12 rounded-full ${currentInfo.bg}`}>
                  <CurrentIcon className={`w-6 h-6 ${currentInfo.color}`} />
                </div>
                <span className={`text-sm font-medium ${currentInfo.color}`}>{currentInfo.label}</span>
              </div>
              
              <ChevronRight className="w-6 h-6 text-gray-400" />
              
              <div className="flex flex-col items-center gap-1">
                <div className={`flex items-center justify-center w-12 h-12 rounded-full ${newInfo.bg}`}>
                  <NewIcon className={`w-6 h-6 ${newInfo.color}`} />
                </div>
                <span className={`text-sm font-medium ${newInfo.color}`}>{newInfo.label}</span>
              </div>
            </div>

            {isDeleting && (
              <p className="text-xs text-red-600 mt-3 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                This action can be reversed by changing the status back.
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 flex gap-3">
            <button
              onClick={onClose}
              disabled={isUpdating}
              className="flex-1 px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg font-medium disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isUpdating}
              className={`flex-1 px-4 py-2 rounded-lg font-medium disabled:opacity-50 ${
                isDeleting 
                  ? 'bg-red-600 hover:bg-red-700 text-white' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {isUpdating ? 'Updating...' : (isDeleting ? 'Yes, Mark as Deleted' : 'Yes, Change Status')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// STATUS DROPDOWN
// =============================================================================
const StatusDropdown = ({ currentStatus, onChange, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const currentOption = STATUS_OPTIONS.find(s => s.value === currentStatus) || STATUS_OPTIONS[1];

  return (
    <div className="relative">
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium ${currentOption.color} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:opacity-80'}`}
      >
        {currentOption.label}
        <ChevronDown className="w-4 h-4" />
      </button>
      
      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-[140px]">
            {STATUS_OPTIONS.map(option => (
              <button
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg ${
                  option.value === currentStatus ? 'bg-gray-100 font-medium' : ''
                }`}
              >
                <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                  option.value === 'COMPLETE' ? 'bg-green-500' :
                  option.value === 'INCOMPLETE' ? 'bg-yellow-500' : 'bg-red-500'
                }`} />
                {option.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================
const CompanyDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // Data state
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSite, setSelectedSite] = useState(null);
  const [categoryFields, setCategoryFields] = useState([]);
  const [activeInfoTab, setActiveInfoTab] = useState('company');
  const [showMobileActions, setShowMobileActions] = useState(false);
  
  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editedCompanyData, setEditedCompanyData] = useState({});
  const [editedVersionData, setEditedVersionData] = useState({});
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  
  // Modal state
  const [showCreateVersionModal, setShowCreateVersionModal] = useState(false);
  const [showAddProcessModal, setShowAddProcessModal] = useState(false);
  const [showDeleteProcessModal, setShowDeleteProcessModal] = useState(false);
  const [showDeleteCompanyModal, setShowDeleteCompanyModal] = useState(false);
  const [showStatusChangeModal, setShowStatusChangeModal] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState(null);
  const [processToDelete, setProcessToDelete] = useState(null);
  const [creatingVersion, setCreatingVersion] = useState(false);
  const [addingProcess, setAddingProcess] = useState(false);
  const [deletingProcess, setDeletingProcess] = useState(false);
  const [deletingCompany, setDeletingCompany] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  
  // Ref for technical details scroll container
  const techDetailsRef = useRef(null);
  const toastTimeoutRef = useRef(null);

  // Status checks
  const isDeleted = company?.status === 'DELETED';
  const isIncomplete = company?.status === 'INCOMPLETE';
  const isComplete = company?.status === 'COMPLETE';
  
  // Check if selected process is inactive
  const isProcessInactive = selectedSite?.current_version?.is_active === false;

  // Get status-based styling
  const getStatusStyles = () => {
    if (isDeleted) {
      return {
        pageBg: 'bg-red-50',
        bannerBg: 'bg-red-600',
        bannerText: 'text-white',
        bannerIcon: Trash2,
        bannerMessage: 'This company has been marked as deleted',
        borderColor: 'border-red-200',
        headerBg: 'bg-red-50',
      };
    }
    if (isIncomplete) {
      return {
        pageBg: 'bg-amber-50/50',
        bannerBg: 'bg-amber-500',
        bannerText: 'text-white',
        bannerIcon: AlertCircle,
        bannerMessage: 'This company record is incomplete - some information may be missing',
        borderColor: 'border-amber-200',
        headerBg: 'bg-amber-50',
      };
    }
    if (isComplete) {
      return {
        pageBg: 'bg-emerald-50/30',
        bannerBg: 'bg-emerald-600',
        bannerText: 'text-white',
        bannerIcon: Check,
        bannerMessage: 'This company record is complete and verified',
        borderColor: 'border-emerald-200',
        headerBg: 'bg-emerald-50',
      };
    }
    return {
      pageBg: 'bg-gray-50',
      bannerBg: '',
      bannerText: '',
      bannerIcon: null,
      bannerMessage: '',
      borderColor: 'border-gray-200',
      headerBg: 'bg-gray-50',
    };
  };

  const statusStyles = getStatusStyles();

  // Show toast message helper
  const showToast = (type, text) => {
    // Clear any existing timeout
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    
    setToastMessage({ type, text });
    
    // Auto-dismiss after TOAST_DURATION
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, TOAST_DURATION);
  };

  // Clear toast on unmount
  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  // Fetch company data
  const fetchCompany = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await companyService.getCompany(id);
      setCompany(data);
      setEditedCompanyData(filterAllowedFields(data, ALLOWED_COMPANY_FIELDS));
      if (data.production_sites?.length > 0) {
        // Keep selected site if it still exists, otherwise select first
        const currentSiteId = selectedSite?.site_id;
        const existingSite = data.production_sites.find(s => s.site_id === currentSiteId);
        const siteToSelect = existingSite || data.production_sites[0];
        setSelectedSite(siteToSelect);
        setEditedVersionData(siteToSelect.current_version || {});
      } else {
        setSelectedSite(null);
        setEditedVersionData({});
      }
    } catch (err) {
      setError(err.message || 'Failed to load company details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompany();
  }, [id]);

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
    if (selectedSite?.current_version) {
      setEditedVersionData(selectedSite.current_version);
    }
  }, [selectedSite]);

  // Build ordered fields list from category metadata
  const orderedFields = useMemo(() => {
    if (!selectedSite?.current_version || categoryFields.length === 0) {
      return [];
    }

    const versionData = isEditing ? editedVersionData : selectedSite.current_version;
    
    return categoryFields.map(fieldMeta => {
      const fieldName = fieldMeta.name;
      const value = versionData[fieldName];
      const isBoolean = fieldMeta.type === 'checkbox';

      return {
        key: fieldName,
        label: fieldMeta.label,
        value: isBoolean ? value === true : (value ?? ''),
        isBoolean,
        fieldType: fieldMeta.type // 'checkbox', 'text', 'number', 'email', 'url', 'textarea'
      };
    });
  }, [selectedSite, categoryFields, isEditing, editedVersionData]);

  // Get existing categories
  const existingCategories = useMemo(() => {
    return company?.production_sites?.map(site => site.category) || [];
  }, [company]);

  // Handle company field change
  const handleCompanyFieldChange = (field, value) => {
    setEditedCompanyData(prev => ({ ...prev, [field]: value }));
  };

  // Handle version field change
  const handleVersionFieldChange = (field, value) => {
    setEditedVersionData(prev => ({ ...prev, [field]: value }));
  };

  // Handle status change - opens confirmation modal
  const handleStatusChangeRequest = (newStatus) => {
    if (newStatus === company?.status) return; // No change
    setPendingStatusChange(newStatus);
    setShowStatusChangeModal(true);
  };

  // Confirm status change
  const handleStatusChangeConfirm = async () => {
    if (!pendingStatusChange) return;
    
    setUpdatingStatus(true);
    try {
      await companyService.updateCompany(id, { status: pendingStatusChange });
      setCompany(prev => ({ ...prev, status: pendingStatusChange }));
      setEditedCompanyData(prev => ({ ...prev, status: pendingStatusChange }));
      showToast('success', `Status changed to ${pendingStatusChange.toLowerCase()}`);
      setShowStatusChangeModal(false);
      setPendingStatusChange(null);
    } catch (err) {
      console.error('Status update error:', err.response?.data);
      showToast('error', 'Failed to update status: ' + (err.response?.data?.detail || err.message));
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Handle Save (updates ALL data to database)
  // Saves Company info, Contact info AND Technical fields to current version
  const handleSave = async () => {
    setSaving(true);
    
    try {
      // Build company-level payload
      const payload = {};
      ALLOWED_COMPANY_FIELDS.forEach(key => {
        if (editedCompanyData.hasOwnProperty(key)) {
          const value = editedCompanyData[key];
          if (value !== undefined) {
            payload[key] = value === null ? '' : value;
          }
        }
      });
      
      // Save company-level data (name, address, contacts, etc.)
      await companyService.updateCompany(id, payload);
      
      // Save technical fields to current version
      if (selectedSite) {
        await companyService.updateCurrentVersion(id, selectedSite.site_id, editedVersionData);
      }
      
      await fetchCompany();
      setIsEditing(false);
      showToast('success', 'All changes saved successfully');
    } catch (err) {
      console.error('Save error:', err);
      let errorDetail = err.message;
      if (err.response?.data) {
        const data = err.response.data;
        if (typeof data === 'object') {
          const errors = Object.entries(data).map(([field, msgs]) => {
            const msgStr = Array.isArray(msgs) ? msgs.join(', ') : msgs;
            return `${field}: ${msgStr}`;
          }).join('; ');
          errorDetail = errors || JSON.stringify(data);
        } else {
          errorDetail = data;
        }
      }
      showToast('error', 'Failed to save: ' + errorDetail);
    } finally {
      setSaving(false);
    }
  };

  // Handle Create Version - creates a snapshot of CURRENT database state
  const handleCreateVersion = async (notes) => {
    if (!selectedSite) return;
    
    setCreatingVersion(true);
    try {
      // Only pass version_notes - the backend will snapshot the current state
      await companyService.createVersion(id, selectedSite.site_id, {
        version_notes: notes
      });
      await fetchCompany();
      setShowCreateVersionModal(false);
      showToast('success', 'Version snapshot created successfully');
    } catch (err) {
      showToast('error', 'Failed to create version: ' + err.message);
    } finally {
      setCreatingVersion(false);
    }
  };

  // Handle Add Process
  const handleAddProcess = async (category, fieldValues) => {
    setAddingProcess(true);
    try {
      await companyService.addProductionSite(id, {
        category,
        ...fieldValues
      });
      await fetchCompany();
      setShowAddProcessModal(false);
      showToast('success', 'Process added successfully');
    } catch (err) {
      console.error('Add process error:', err);
      showToast('error', 'Failed to add process: ' + (err.response?.data?.error || err.message));
    } finally {
      setAddingProcess(false);
    }
  };

  // Handle Toggle Process Active/Inactive
  const handleToggleProcessActive = async (site) => {
    if (!site.current_version) return;
    
    const newActiveStatus = !site.current_version.is_active;
    
    try {
      // Use the dedicated toggle endpoint instead of updateCurrentVersion
      await companyService.toggleProductionSiteActive(id, site.site_id, newActiveStatus);
      await fetchCompany();
      showToast('success', `Process marked as ${newActiveStatus ? 'Active' : 'Inactive'}`);
    } catch (err) {
      showToast('error', 'Failed to update process status: ' + err.message);
    }
  };

  // Open Delete Process Modal
  const openDeleteProcessModal = (site) => {
    setProcessToDelete(site);
    setShowDeleteProcessModal(true);
  };

  // Handle Delete Process (hard delete) - called from modal
  const handleDeleteProcess = async () => {
    if (!processToDelete) return;
    
    setDeletingProcess(true);
    try {
      await api.delete(`/api/companies/${id}/sites/${processToDelete.site_id}/`);
      await fetchCompany();
      setShowDeleteProcessModal(false);
      setProcessToDelete(null);
      showToast('success', `${CATEGORY_DISPLAY[processToDelete.category]} process deleted successfully`);
    } catch (err) {
      showToast('error', 'Failed to delete process: ' + err.message);
    } finally {
      setDeletingProcess(false);
    }
  };

  // Handle Delete Company (hard delete)
  const handleDeleteCompany = async () => {
    setDeletingCompany(true);
    try {
      await api.delete(`/api/companies/${id}/`);
      setShowDeleteCompanyModal(false);
      showToast('success', 'Company deleted successfully');
      navigate('/company-database');
    } catch (err) {
      console.error('Delete company error:', err);
      showToast('error', 'Failed to delete company: ' + (err.response?.data?.detail || err.message));
    } finally {
      setDeletingCompany(false);
    }
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditedCompanyData(filterAllowedFields(company, ALLOWED_COMPANY_FIELDS));
    if (selectedSite?.current_version) {
      setEditedVersionData(selectedSite.current_version);
    }
    setIsEditing(false);
  };

  // Navigate to versions page
  const handleNavigateToVersions = () => {
    if (selectedSite) {
      navigate(`/companies/${id}/sites/${selectedSite.site_id}/versions`);
    }
  };

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
              onClick={() => navigate('/company-database')}
              className="mt-4 px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
            >
              Back to Companies
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Get display data (edited or original)
  const displayCompanyData = isEditing ? editedCompanyData : company;
  
  // Determine if we should show red styling (deleted company OR inactive process)
  const showRedStyling = isDeleted || isProcessInactive;

  // Build subtitle with unique key, category badges and country
  const pageSubtitleContent = (
    <div className="flex flex-wrap items-center gap-2 mt-1">
      {/* Unique Key Badge */}
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

  return (
    <DashboardLayout
      pageTitle={company?.company_name || 'Company Details'}
      pageSubtitleBottom={pageSubtitleContent}
    >
      {/* Toast Notification - Top Right Corner */}
      <ToastNotification 
        message={toastMessage} 
        onClose={() => setToastMessage(null)} 
      />

      <div className={`flex-1 overflow-auto ${isEditing ? 'bg-blue-50/50' : statusStyles.pageBg}`}>
        {/* Status Banner */}
        {statusStyles.bannerBg && !isEditing && (
          <div className={`${statusStyles.bannerBg} ${statusStyles.bannerText} px-4 sm:px-6 py-2.5 flex items-center gap-2`}>
            {statusStyles.bannerIcon && (() => {
              const IconComponent = statusStyles.bannerIcon;
              return <IconComponent className="w-4 h-4" />;
            })()}
            <span className="text-sm font-medium">{statusStyles.bannerMessage}</span>
          </div>
        )}

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
                onClick={() => navigate('/company-database')}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="text-sm font-medium hidden sm:inline">Back</span>
              </button>
              
              <StatusDropdown 
                currentStatus={company?.status}
                onChange={handleStatusChangeRequest}
                disabled={isEditing}
              />
            </div>

            {/* Desktop: Action Buttons */}
            <div className="hidden lg:flex items-center gap-2">
              {!isEditing && (
                <>
                  <button 
                    onClick={() => setShowAddProcessModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 rounded text-sm font-medium text-white transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Process
                  </button>
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 rounded text-sm font-medium text-white transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </button>
                  <button 
                    onClick={() => setShowCreateVersionModal(true)}
                    disabled={!selectedSite}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded text-sm font-medium text-gray-700 transition-colors disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                    Create Version
                  </button>
                  <button 
                    onClick={handleNavigateToVersions}
                    disabled={!selectedSite}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded text-sm font-medium text-gray-700 transition-colors disabled:opacity-50"
                  >
                    <Layers className="w-4 h-4" />
                    Versions
                  </button>
                  <button 
                    onClick={() => setShowDeleteCompanyModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-500 rounded text-sm font-medium text-white transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </>
              )}
            </div>

            {/* Mobile: Menu button */}
            <button 
              onClick={() => setShowMobileActions(!showMobileActions)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
            >
              {showMobileActions ? <X className="w-5 h-5" /> : <MoreVertical className="w-5 h-5" />}
            </button>
          </div>

          {/* Mobile Actions Dropdown */}
          {showMobileActions && !isEditing && (
            <div className="lg:hidden mt-3 pt-3 border-t border-gray-200 grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button 
                onClick={() => setShowAddProcessModal(true)}
                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded text-sm font-medium text-white"
              >
                <Plus className="w-4 h-4" />
                Add Process
              </button>
              <button 
                onClick={() => setIsEditing(true)}
                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-500 hover:bg-blue-600 rounded text-sm font-medium text-white"
              >
                <Edit className="w-4 h-4" />
                Edit
              </button>
              <button 
                onClick={() => setShowCreateVersionModal(true)}
                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm font-medium text-gray-700"
              >
                <Plus className="w-4 h-4" />
                Version
              </button>
              <button 
                onClick={handleNavigateToVersions}
                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm font-medium text-gray-700"
              >
                <Layers className="w-4 h-4" />
                Versions
              </button>
              <button 
                onClick={() => setShowDeleteCompanyModal(true)}
                className="flex items-center justify-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-500 rounded text-sm font-medium text-white"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          )}
        </div>

        {/* Edit Mode Banner - More Prominent */}
        {isEditing && (
          <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 text-white px-4 sm:px-6 py-3 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 bg-white/20 rounded-full animate-pulse">
                  <Edit className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-base">EDIT MODE ACTIVE</span>
                  <p className="text-blue-100 text-xs mt-0.5">Make your changes and click Save to update all data.</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleCancelEdit}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded text-sm font-medium transition-colors"
                >
                  <X className="w-4 h-4" />
                  <span className="hidden sm:inline">Cancel</span>
                </button>
                <button 
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-white text-blue-600 hover:bg-blue-50 rounded text-sm font-bold transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : <span className="hidden sm:inline">Save Changes</span>}
                  {!saving && <span className="sm:hidden">Save</span>}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==================== MAIN CONTENT ==================== */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          
          {/* ==================== INFO SECTION ==================== */}
          <div className={`bg-white rounded-lg shadow-sm border overflow-hidden ${isEditing ? 'border-blue-300 ring-2 ring-blue-200' : statusStyles.borderColor}`}>
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
                  <SingleFieldRowEditable 
                    field={companyNameField} 
                    data={displayCompanyData}
                    isEditing={isEditing}
                    onChange={handleCompanyFieldChange}
                    isInactive={isDeleted}
                  />
                  
                  {/* Company Key and Project Code - Read Only */}
                  <ReadOnlyTwoFieldsRow
                    label1="Company Key"
                    value1={company?.unique_key}
                    label2="Project Code"
                    value2={company?.project_code}
                    isInactive={isDeleted}
                  />
                  
                  {companyFieldPairs.map((pair, idx) => (
                    <TwoFieldsRowEditable 
                      key={idx}
                      field1={pair.field1}
                      field2={pair.field2}
                      data={displayCompanyData}
                      isEditing={isEditing}
                      onChange={handleCompanyFieldChange}
                      isInactive={isDeleted}
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
                          <EditableField 
                            label={`Title ${n}`} 
                            value={displayCompanyData?.[`title_${n}`]}
                            fieldKey={`title_${n}`}
                            isEditing={isEditing}
                            onChange={handleCompanyFieldChange}
                            isInactive={isDeleted}
                          />
                        </div>
                        <div className="flex-1">
                          <EditableField 
                            label={`Initials ${n}`} 
                            value={displayCompanyData?.[`initials_${n}`]}
                            fieldKey={`initials_${n}`}
                            isEditing={isEditing}
                            onChange={handleCompanyFieldChange}
                            isInactive={isDeleted}
                          />
                        </div>
                      </div>
                      <div className="flex flex-col md:flex-row md:gap-8 py-2 border-b border-gray-100">
                        <div className="flex-1 mb-3 md:mb-0">
                          <EditableField 
                            label={`Surname ${n}`} 
                            value={displayCompanyData?.[`surname_${n}`]}
                            fieldKey={`surname_${n}`}
                            isEditing={isEditing}
                            onChange={handleCompanyFieldChange}
                            isInactive={isDeleted}
                          />
                        </div>
                        <div className="flex-1">
                          <EditableField 
                            label={`Position ${n}`} 
                            value={displayCompanyData?.[`position_${n}`]}
                            fieldKey={`position_${n}`}
                            isEditing={isEditing}
                            onChange={handleCompanyFieldChange}
                            isInactive={isDeleted}
                          />
                        </div>
                      </div>
                      {n < 4 && <div className="border-b-2 border-gray-300 my-4"></div>}
                    </div>
                  ))}
                </div>
              )}

              {/* Comments/Notes Tab */}
              {activeInfoTab === 'notes' && (
                <div>
                  {company?.notes?.length > 0 ? (
                    <div className="space-y-4">
                      {company.notes.map((note, idx) => (
                        <div key={idx} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                          <p className="text-sm text-gray-900">{note.content}</p>
                          <p className="text-xs text-gray-500 mt-2">
                            {note.note_type} | {new Date(note.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 sm:py-12 text-gray-400">
                      <MessageSquare className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 opacity-50" />
                      <p>No comments or notes yet</p>
                      <button className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium">
                        Add Note
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ==================== PROCESS & CATEGORY FIELDS SECTION ==================== */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
            
            {/* Process Sidebar */}
            <div className={`lg:col-span-3 bg-white rounded-lg p-4 shadow-sm border ${isEditing ? 'border-blue-300 ring-2 ring-blue-200' : statusStyles.borderColor}`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                  Processes Linked
                </h3>
                <button
                  onClick={() => setShowAddProcessModal(true)}
                  className="p-1 text-purple-600 hover:bg-purple-50 rounded"
                  title="Add Process"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="flex lg:flex-col gap-2 lg:gap-2 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0">
                {company?.production_sites?.map(site => {
                  const colors = CATEGORY_COLORS[site.category] || CATEGORY_COLORS.INJECTION;
                  const isSelected = selectedSite?.site_id === site.site_id;
                  const siteIsInactive = site.current_version?.is_active === false;
                  
                  return (
                    <div 
                      key={site.site_id}
                      className={`flex-shrink-0 lg:w-full rounded transition-all ${
                        isSelected 
                          ? `${siteIsInactive ? 'bg-red-50 border-red-200' : colors.light + ' ' + colors.border} border-l-4`
                          : 'border-l-4 border-transparent bg-gray-50 lg:bg-transparent hover:bg-gray-50'
                      }`}
                    >
                      {/* Process Name Button */}
                      <button
                        onClick={() => {
                          setSelectedSite(site);
                          setEditedVersionData(site.current_version || {});
                        }}
                        className={`w-full text-left px-3 py-2 flex items-center gap-2 text-sm ${
                          isSelected 
                            ? `${siteIsInactive ? 'text-red-700' : colors.text} font-semibold`
                            : 'text-gray-700'
                        }`}
                      >
                      <div className="flex flex-col">
                        <span className="whitespace-nowrap lg:whitespace-normal">
                          {CATEGORY_DISPLAY[site.category] || site.category}
                        </span>
                        {site.source_project_code && (
                          <span className="text-xs font-mono text-gray-400 mt-0.5">
                            {site.source_project_code}
                          </span>
                        )}
                      </div>
                        {isSelected && <ChevronRight className="w-4 h-4 hidden lg:block" />}
                      </button>
                      
                      {/* Process Controls - Active checkbox & Delete */}
                      <div className="px-3 pb-2 flex items-center gap-3 text-xs">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input 
                            type="checkbox"
                            checked={site.current_version?.is_active !== false}
                            onChange={() => handleToggleProcessActive(site)}
                            className="w-3.5 h-3.5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                          />
                          <span className={siteIsInactive ? 'text-red-600' : 'text-gray-600'}>
                            {siteIsInactive ? 'Inactive' : 'Active'}
                          </span>
                        </label>
                        <button
                          onClick={() => openDeleteProcessModal(site)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded"
                          title="Delete Process"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
                
                {(!company?.production_sites || company.production_sites.length === 0) && (
                  <p className="text-sm text-gray-400 text-center py-4">No processes linked</p>
                )}
              </div>
            </div>

            {/* Category Fields */}
            <div className={`lg:col-span-9 bg-white rounded-lg shadow-sm border overflow-hidden ${isEditing ? 'border-blue-300 ring-2 ring-blue-200' : (showRedStyling ? 'border-red-200' : statusStyles.borderColor)}`}>
              {/* Category Header */}
              {selectedSite && (
                <div className={`px-4 sm:px-5 py-3 ${showRedStyling ? 'bg-red-50' : CATEGORY_COLORS[selectedSite.category]?.light || 'bg-gray-50'} border-b flex items-center justify-between`}>
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${showRedStyling ? 'bg-red-500' : CATEGORY_COLORS[selectedSite.category]?.bg || 'bg-gray-500'}`}></div>
                    <h3 className={`text-sm sm:text-base font-bold ${showRedStyling ? 'text-red-700' : CATEGORY_COLORS[selectedSite.category]?.text || 'text-gray-700'}`}>
                      <span className="hidden sm:inline">{CATEGORY_DISPLAY[selectedSite.category] || selectedSite.category} - </span>
                      Technical Details
                    </h3>
                    {isProcessInactive && (
                      <span className="px-2 py-0.5 bg-red-200 text-red-800 text-xs rounded-full font-medium">
                        Inactive
                      </span>
                    )}
                  </div>
                  {selectedSite.current_version && (
                    <span className={`text-xs ${showRedStyling ? 'text-red-500' : 'text-gray-500'}`}>
                      Version {selectedSite.current_version.version_number}
                    </span>
                  )}
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
                        <EditableCheckboxRow 
                          key={field.key} 
                          label={field.label} 
                          checked={isEditing ? editedVersionData[field.key] : field.value}
                          fieldKey={field.key}
                          isEditing={isEditing}
                          onChange={handleVersionFieldChange}
                          isInactive={showRedStyling}
                        />
                      ) : (
                        <EditableTechFieldRow 
                          key={field.key} 
                          label={field.label} 
                          value={isEditing ? editedVersionData[field.key] : field.value}
                          fieldKey={field.key}
                          fieldType={field.fieldType}
                          isEditing={isEditing}
                          onChange={handleVersionFieldChange}
                          isInactive={showRedStyling}
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

      {/* ==================== MODALS ==================== */}
      <CreateVersionModal
        isOpen={showCreateVersionModal}
        onClose={() => setShowCreateVersionModal(false)}
        onConfirm={handleCreateVersion}
        loading={creatingVersion}
      />

      <AddProcessModal
        isOpen={showAddProcessModal}
        onClose={() => setShowAddProcessModal(false)}
        onConfirm={handleAddProcess}
        existingCategories={existingCategories}
        loading={addingProcess}
      />

      {/* Status Change Confirmation Modal */}
      <StatusChangeModal
        isOpen={showStatusChangeModal}
        onClose={() => {
          setShowStatusChangeModal(false);
          setPendingStatusChange(null);
        }}
        onConfirm={handleStatusChangeConfirm}
        currentStatus={company?.status}
        newStatus={pendingStatusChange}
        isUpdating={updatingStatus}
      />

      {/* Delete Process Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteProcessModal}
        onClose={() => {
          setShowDeleteProcessModal(false);
          setProcessToDelete(null);
        }}
        onConfirm={handleDeleteProcess}
        title="Delete Process"
        message="Are you sure you want to permanently delete this process? This will remove all version history for this process."
        itemName={processToDelete ? CATEGORY_DISPLAY[processToDelete.category] || processToDelete.category : ''}
        isDeleting={deletingProcess}
      />

      {/* Delete Company Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteCompanyModal}
        onClose={() => setShowDeleteCompanyModal(false)}
        onConfirm={handleDeleteCompany}
        title="Delete Company"
        message="Are you sure you want to permanently delete this company? This action cannot be undone and will remove all production sites, versions, and associated data."
        itemName={company?.company_name || ''}
        isDeleting={deletingCompany}
      />
    </DashboardLayout>
  );
};

export default CompanyDetailPage;
