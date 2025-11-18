// frontend/src/components/calling/FieldWithConfirmation.jsx
// ✅ SIMPLE VERSION - No cloneElement, just render children and checkboxes

import React from 'react';
import { CheckCircle, PlusCircle, FileText } from 'lucide-react';

const FieldWithConfirmation = ({ 
  children, 
  fieldName, 
  fieldValue,
  confirmation = {},
  onToggleConfirmation,
  readOnly = false,
  showConfirmations = false
}) => {
  
  const hasValue = fieldValue && fieldValue.toString().trim() !== '';
  
  if (!showConfirmations) {
    return children;
  }

  return (
    <div className="relative">
      {/* Just render children as-is - no cloneElement */}
      {children}
      
      {/* Confirmation Checkboxes - shown below the field */}
      {hasValue && (
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
      
      {/* No value indicator when confirmations are shown 
      {!hasValue && showConfirmations && (
        <div className="mt-1 text-xs text-gray-400">
          No value to confirm
        </div>
      )}*/}
    </div>
  );
};

export default FieldWithConfirmation;