// frontend/src/components/calling/FieldWithConfirmation.jsx
// ✅ UPDATED - Always show confirmations for checkbox fields

import React from 'react';
import { CheckCircle, PlusCircle, FileText } from 'lucide-react';

const FieldWithConfirmation = ({ 
  children, 
  fieldName, 
  fieldValue,
  fieldType,  // ← NEW: Need to know if it's a checkbox
  confirmation = {},
  onToggleConfirmation,
  readOnly = false,
  showConfirmations = false
}) => {
  
  const hasValue = fieldValue && fieldValue.toString().trim() !== '';
  
  // ✅ NEW: For checkboxes, always show confirmations (even when unchecked)
  // For other fields, only show when there's a value
  const shouldShowConfirmations = fieldType === 'checkbox' ? true : hasValue;
  
  if (!showConfirmations) {
    return children;
  }

  return (
    <div className="relative">
      {/* Just render children as-is - no cloneElement */}
      {children}
      
      {/* Confirmation Checkboxes - shown below the field */}
      {shouldShowConfirmations && (
        <div className="mt-1 flex flex-wrap gap-3 text-xs">
          {/* Pre-filled Checkbox */}
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmation.is_pre_filled || false}
              onChange={() => onToggleConfirmation(fieldName, 'is_pre_filled')}
              disabled={readOnly}
              className="w-3 h-3 text-green-600 rounded focus:ring-green-500"
            />
            <FileText className="w-3 h-3 text-green-600" />
            <span className="text-gray-700">Pre-filled</span>
          </label>

          {/* Confirmed Checkbox */}
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmation.is_confirmed || false}
              onChange={() => onToggleConfirmation(fieldName, 'is_confirmed')}
              disabled={readOnly}
              className="w-3 h-3 text-green-600 rounded focus:ring-green-500"
            />
            <CheckCircle className="w-3 h-3 text-green-600" />
            <span className="text-gray-700">Confirmed</span>
          </label>

          {/* New Data Checkbox */}
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmation.is_new_data || false}
              onChange={() => onToggleConfirmation(fieldName, 'is_new_data')}
              disabled={readOnly}
              className="w-3 h-3 text-yellow-600 rounded focus:ring-yellow-500"
            />
            <PlusCircle className="w-3 h-3 text-yellow-600" />
            <span className="text-gray-700">New Data</span>
          </label>
        </div>
      )}
    </div>
  );
};

export default FieldWithConfirmation;