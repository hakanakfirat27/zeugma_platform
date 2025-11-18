// frontend/src/components/calling/FieldConfirmationList.jsx
// Field Confirmation Component for Calling Workflow

/**
 * FieldConfirmationList Component
 * 
 * Shows checkboxes for each field to confirm:
 * ✅ Confirmed - Field data verified as correct
 * 🆕 New Data - Data collector added new information
 * 📝 Pre-filled - Data was provided by admin
 */

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../utils/api';
import { CheckCircle, PlusCircle, FileText } from 'lucide-react';

// Define which fields to track confirmations for
const CONFIRMABLE_FIELDS = [
  { name: 'company_name', label: 'Company Name', required: true },
  { name: 'phone_number', label: 'Phone Number', required: true },
  { name: 'company_email', label: 'Email', required: false },
  { name: 'website', label: 'Website', required: false },
  { name: 'address_1', label: 'Address Line 1', required: true },
  { name: 'address_2', label: 'Address Line 2', required: false },
  { name: 'country', label: 'Country', required: true },
  { name: 'region', label: 'Region', required: false },
  { name: 'parent_company', label: 'Parent Company', required: false },
];

const FieldConfirmationList = ({ siteId, siteData, readOnly = false }) => {
  const queryClient = useQueryClient();
  const [localConfirmations, setLocalConfirmations] = useState({});

  // Fetch field confirmations
  const { data: confirmations, isLoading } = useQuery({
    queryKey: ['field-confirmations', siteId],
    queryFn: async () => {
      const response = await api.get(`/api/sites/${siteId}/field-confirmations/`);
      return response.data;
    },
    enabled: !!siteId,
  });

  // Initialize local state from fetched confirmations
  useEffect(() => {
    if (confirmations) {
      const confirmMap = {};
      confirmations.forEach((conf) => {
        confirmMap[conf.field_name] = {
          is_confirmed: conf.is_confirmed,
          is_new_data: conf.is_new_data,
          is_pre_filled: conf.is_pre_filled,
        };
      });
      setLocalConfirmations(confirmMap);
    }
  }, [confirmations]);

  // Bulk update mutation
  const updateConfirmationsMutation = useMutation({
    mutationFn: async (confirmationUpdates) => {
      const response = await api.post(
        `/api/sites/${siteId}/field-confirmations/bulk/`,
        { confirmations: confirmationUpdates }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['field-confirmations', siteId]);
      queryClient.invalidateQueries(['project-sites']);
    },
  });

  const handleToggle = (fieldName, type) => {
    if (readOnly) return;

    setLocalConfirmations((prev) => ({
      ...prev,
      [fieldName]: {
        ...prev[fieldName],
        [type]: !(prev[fieldName]?.[type] || false),
      },
    }));
  };

  const handleSaveAll = () => {
    const updates = Object.entries(localConfirmations).map(([fieldName, data]) => ({
      field_name: fieldName,
      ...data,
    }));

    updateConfirmationsMutation.mutate(updates);
  };

  // Check if field has value in siteData
  const hasValue = (fieldName) => {
    return siteData && siteData[fieldName] && siteData[fieldName].toString().trim() !== '';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Field Confirmations
        </h3>
        {!readOnly && (
          <button
            onClick={handleSaveAll}
            disabled={updateConfirmationsMutation.isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {updateConfirmationsMutation.isPending ? 'Saving...' : 'Save Confirmations'}
          </button>
        )}
      </div>

      {/* Legend */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span>Confirmed</span>
          </div>
          <div className="flex items-center gap-2">
            <PlusCircle className="w-4 h-4 text-blue-600" />
            <span>New Data</span>
          </div>
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-purple-600" />
            <span>Pre-filled</span>
          </div>
        </div>
      </div>

      {/* Field List */}
      <div className="space-y-2">
        {CONFIRMABLE_FIELDS.map((field) => {
          const fieldValue = hasValue(field.name);
          const conf = localConfirmations[field.name] || {};
          
          return (
            <div
              key={field.name}
              className={`bg-white border rounded-lg p-3 transition-colors ${
                !fieldValue ? 'opacity-50 bg-gray-50' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium text-gray-900">
                      {field.label}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </span>
                    {!fieldValue && (
                      <span className="text-xs px-2 py-0.5 bg-gray-200 text-gray-600 rounded">
                        No value
                      </span>
                    )}
                  </div>
                  
                  {fieldValue && siteData[field.name] && (
                    <div className="text-sm text-gray-600 mb-2 truncate">
                      {siteData[field.name]}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-3">
                    {/* Confirmed Checkbox */}
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={conf.is_confirmed || false}
                        onChange={() => handleToggle(field.name, 'is_confirmed')}
                        disabled={readOnly || !fieldValue}
                        className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                      />
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-gray-700">Confirmed</span>
                    </label>

                    {/* New Data Checkbox */}
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={conf.is_new_data || false}
                        onChange={() => handleToggle(field.name, 'is_new_data')}
                        disabled={readOnly || !fieldValue}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <PlusCircle className="w-4 h-4 text-blue-600" />
                      <span className="text-sm text-gray-700">New Data</span>
                    </label>

                    {/* Pre-filled Badge (read-only) */}
                    {conf.is_pre_filled && (
                      <div className="flex items-center gap-2 px-2 py-1 bg-purple-50 rounded">
                        <FileText className="w-4 h-4 text-purple-600" />
                        <span className="text-sm text-purple-700">Pre-filled</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="text-sm text-blue-800">
          <strong>Tip:</strong> Mark fields as "Confirmed" after verifying they're correct, 
          and "New Data" for information you've added during your call.
        </div>
      </div>
    </div>
  );
};

export default FieldConfirmationList;