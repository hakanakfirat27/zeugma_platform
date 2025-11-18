// frontend/src/components/calling/FieldWithConfirmation.jsx
// Wrapper component that adds confirmation checkboxes to any field
// ✅ FIXED: No longer clones React elements - prevents cursor jumping!

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
  
  // Determine field background color based on last selected confirmation
  const getFieldColor = () => {
    if (!hasValue || !showConfirmations) return '';
    
    const lastSelected = confirmation.last_selected;
    
    if (lastSelected === 'is_confirmed') {
      return 'bg-green-800 border-green-300'; // Olive green for confirmed
    } else if (lastSelected === 'is_new_data') {
      return 'bg-yellow-400 border-yellow-300'; // Yellow for new data
    } else if (lastSelected === 'is_pre_filled') {
      return 'bg-green-200 border-green-300'; // Olive green for pre-filled
    }
    
    return '';
  };
  
  if (!showConfirmations) {
    return children;
  }

  const colorClasses = getFieldColor();

  return (
    <div className="relative">
      {/* ✅ Use a border/shadow overlay instead of background color */}
      <div className="relative">
        {children}
        {colorClasses && (
          <div 
            className={`absolute inset-0 pointer-events-none rounded-lg ${colorClasses} opacity-20`}
            aria-hidden="true"
          />
        )}
      </div>
      
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
      
      {/* No value indicator when confirmations are shown */}
      {!hasValue && showConfirmations && (
        <div className="mt-1 text-xs text-gray-400">
          No value to confirm
        </div>
      )}
    </div>
  );
};

export default FieldWithConfirmation;