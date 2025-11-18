// frontend/src/hooks/useFieldConfirmations.js
// Custom hook to manage field confirmations with auto-save and auto-mark pre-filled
// ✅ DEBUGGING VERSION with comprehensive logging

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';

export const useFieldConfirmations = (siteId) => {
  const queryClient = useQueryClient();
  const [localConfirmations, setLocalConfirmations] = useState({});
  
  // Track if we're currently saving to prevent overwriting during save
  const isSavingRef = useRef(false);
  const pendingChangesRef = useRef({});
  const saveTimeoutRef = useRef(null);

  // Fetch field confirmations
  const { data: confirmations, isLoading } = useQuery({
    queryKey: ['field-confirmations', siteId],
    queryFn: async () => {
      const response = await api.get(`/api/sites/${siteId}/field-confirmations/`);
      console.log('📥 Fetched confirmations from server:', response.data);
      return response.data;
    },
    enabled: !!siteId,
  });

  // Initialize local state from fetched confirmations
  // But DON'T overwrite if we're currently saving
  useEffect(() => {
    if (confirmations && !isSavingRef.current) {
      console.log('🔄 Initializing local state, isSaving:', isSavingRef.current);
      const confirmMap = {};
      confirmations.forEach((conf) => {
        confirmMap[conf.field_name] = {
          is_confirmed: conf.is_confirmed,
          is_new_data: conf.is_new_data,
          is_pre_filled: conf.is_pre_filled,
          last_selected: conf.last_selected || null,
        };
      });
      console.log('📦 Local confirmations initialized:', confirmMap);
      setLocalConfirmations(confirmMap);
    } else if (confirmations && isSavingRef.current) {
      console.log('⏸️ Skipping state update - currently saving');
    }
  }, [confirmations]);

  // Auto-save mutation (debounced)
  const updateConfirmationsMutation = useMutation({
    mutationFn: async (confirmationUpdates) => {
      console.log('💾 Saving to backend:', confirmationUpdates);
      isSavingRef.current = true; // Mark as saving
      const response = await api.post(
        `/api/sites/${siteId}/field-confirmations/bulk/`,
        { confirmations: confirmationUpdates }
      );
      console.log('✅ Backend response:', response.data);
      return response.data;
    },
    onSuccess: (data) => {
      console.log('\n' + '='.repeat(80));
      console.log('🎉 FULL BACKEND RESPONSE:');
      console.log('  updated_count:', data.updated_count);
      console.log('  confirmations count:', data.confirmations?.length);
      console.log('\n📥 RECEIVED DATA (what frontend sent):');
      console.log(data.received_data);
      console.log('\n💾 DEBUG INFO (what\'s in database):');
      console.log(data.debug_info);
      console.log('='.repeat(80) + '\n');
      
      console.log('🎉 Save successful, updating local state');
      // ✅ Update local state with the server response
      if (data.confirmations) {
        const confirmMap = {};
        data.confirmations.forEach((conf) => {
          confirmMap[conf.field_name] = {
            is_confirmed: conf.is_confirmed,
            is_new_data: conf.is_new_data,
            is_pre_filled: conf.is_pre_filled,
            last_selected: conf.last_selected || null,
          };
        });
        
        console.log('📝 Merging server response into local state:', confirmMap);
        
        // ✅ FIXED: Immediately update local state with server response
        setLocalConfirmations(prev => {
          const merged = { ...prev };
          Object.keys(confirmMap).forEach(key => {
            merged[key] = confirmMap[key];
          });
          console.log('✨ New merged state:', merged);
          return merged;
        });
      }
      
      // Invalidate queries but allow time for state to settle
      setTimeout(() => {
        console.log('🔄 Marking save as complete and invalidating queries');
        isSavingRef.current = false; // Mark as done saving
        
        // ✅ CRITICAL FIX: Only invalidate if no pending changes
        if (Object.keys(pendingChangesRef.current).length === 0) {
          console.log('✅ No pending changes, safe to invalidate');
          queryClient.invalidateQueries(['field-confirmations', siteId]);
          queryClient.invalidateQueries(['project-sites']);
        } else {
          console.log('⏸️ Pending changes detected, skipping invalidation');
        }
      }, 100);
    },
    onError: (error) => {
      console.error('❌ Error saving confirmations:', error);
      console.error('Error details:', error.response?.data);
      isSavingRef.current = false; // Reset on error
    },
  });

  // Auto-save function with debounce
  const autoSave = useCallback((updatedConfirmations) => {
    console.log('⏱️ Auto-save triggered, adding to pending changes:', Object.keys(updatedConfirmations));
    
    // Accumulate changes in the ref
    pendingChangesRef.current = {
      ...pendingChangesRef.current,
      ...updatedConfirmations
    };
    
    // Clear any existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Set new timeout to batch saves
    saveTimeoutRef.current = setTimeout(() => {
      const toSave = { ...pendingChangesRef.current };
      const fieldCount = Object.keys(toSave).length;
      
      console.log(`💾 Executing batched save for ${fieldCount} fields:`, Object.keys(toSave));
      
      // Clear pending changes
      pendingChangesRef.current = {};
      
      // Convert to array format for API
      const updates = Object.entries(toSave).map(([fieldName, data]) => ({
        field_name: fieldName,
        ...data,
      }));

      updateConfirmationsMutation.mutate(updates);
    }, 500); // Wait 500ms for more changes
  }, [updateConfirmationsMutation]);

  // ✅ Toggle confirmation (for manual checkbox clicks)
  const handleToggleConfirmation = useCallback((fieldName, type) => {
    console.log(`\n🖱️ CLICKED: field="${fieldName}", type="${type}"`);
    
    setLocalConfirmations((prev) => {
      const currentField = prev[fieldName] || {};
      const isCurrentlyChecked = currentField[type] || false;
      
      console.log('📊 Current field state:', currentField);
      console.log('🔍 Is currently checked?', isCurrentlyChecked);
      
      let updated;
      
      if (isCurrentlyChecked) {
        // ============================================================
        // UNCHECKING: User is unchecking a checkbox
        // ============================================================
        console.log('⬜ UNCHECKING checkbox');
        
        if (type === 'is_pre_filled') {
          // ⚠️ Pre-filled cannot be unchecked once set
          console.log('🔒 Pre-filled cannot be unchecked - BLOCKED');
          return prev; // Do nothing, keep pre-filled checked
        }
        
        // Uncheck the clicked checkbox
        updated = {
          ...prev,
          [fieldName]: {
            ...currentField,
            [type]: false,
          },
        };
        
        console.log('📝 Unchecked, updating last_selected...');
        
        // Update last_selected to whichever checkbox is still checked
        if (updated[fieldName].is_confirmed) {
          updated[fieldName].last_selected = 'is_confirmed';
          console.log('✅ last_selected = is_confirmed');
        } else if (updated[fieldName].is_new_data) {
          updated[fieldName].last_selected = 'is_new_data';
          console.log('✅ last_selected = is_new_data');
        } else if (updated[fieldName].is_pre_filled) {
          updated[fieldName].last_selected = 'is_pre_filled';
          console.log('✅ last_selected = is_pre_filled');
        } else {
          updated[fieldName].last_selected = null;
          console.log('✅ last_selected = null');
        }
        
      } else {
        // ============================================================
        // CHECKING: User is checking a checkbox
        // ============================================================
        console.log('☑️ CHECKING checkbox');
        
        if (type === 'is_confirmed' || type === 'is_new_data') {
          console.log('📋 Processing confirmed/new_data (mutual exclusivity)');
          // Mutual exclusivity: confirmed and new_data cannot both be true
          updated = {
            ...prev,
            [fieldName]: {
              ...currentField,
              is_confirmed: type === 'is_confirmed',
              is_new_data: type === 'is_new_data',
              // Keep is_pre_filled as-is (never uncheck it)
              is_pre_filled: currentField.is_pre_filled || false,
              last_selected: type,
            },
          };
          
          console.log('✅ New field state:', updated[fieldName]);
          
        } else if (type === 'is_pre_filled') {
          console.log('📄 Checking pre-filled');
          // Checking pre-filled
          updated = {
            ...prev,
            [fieldName]: {
              ...currentField,
              is_pre_filled: true,
              last_selected: type,
            },
          };
        }
      }
      
      console.log('🎯 Final updated state for field:', updated[fieldName]);
      console.log('⏱️ Scheduling auto-save in 300ms...');
      
      // Auto-save after state update
      autoSave(updated);
      
      return updated;
    });
  }, [autoSave]);

// Auto-mark field as pre-filled when it gets its first value (single field)
const autoMarkPreFilled = useCallback((fieldName) => {
console.log(`🤖 Auto-marking field as pre-filled: ${fieldName}`);

setLocalConfirmations((prev) => {
const currentField = prev[fieldName] || {};

// Only auto-mark if not already marked with anything
if (!currentField.is_pre_filled && !currentField.is_confirmed && !currentField.is_new_data) {
console.log('✅ Field has no marks, auto-marking as pre-filled');
const updated = {
        ...prev,
        [fieldName]: {
        is_confirmed: false,
        is_new_data: false,
        is_pre_filled: true,
        last_selected: 'is_pre_filled',
        },
};

autoSave(updated);

return updated;
} else {
console.log('⏭️ Field already marked, skipping auto-mark');
}

return prev;
});
}, [autoSave]);

  // ✅ Bulk auto-mark multiple fields on page load
  const autoMarkFieldsOnLoad = useCallback((fieldNames) => {
    if (!fieldNames || fieldNames.length === 0) return;
    
    console.log(`🤖 Bulk auto-marking ${fieldNames.length} fields on load`);

    setLocalConfirmations((prev) => {
      const updated = { ...prev };
      let hasChanges = false;

      fieldNames.forEach(fieldName => {
        const currentField = prev[fieldName] || {};
        
        // Only auto-mark if not already marked with anything
        if (!currentField.is_pre_filled && !currentField.is_confirmed && !currentField.is_new_data) {
          updated[fieldName] = {
            is_confirmed: false,
            is_new_data: false,
            is_pre_filled: true,
            last_selected: 'is_pre_filled',
          };
          hasChanges = true;
        }
      });

      if (hasChanges) {
        console.log(`✅ Marked ${Object.keys(updated).length} fields, scheduling save`);
        autoSave(updated);
      } else {
        console.log('⏭️ No fields needed marking');
      }

      return hasChanges ? updated : prev;
    });
  }, [autoSave]);

  // Manual save function
  const handleSaveAll = useCallback(() => {
    console.log('💾 Manual save triggered');
    const updates = Object.entries(localConfirmations).map(([fieldName, data]) => ({
      field_name: fieldName,
      ...data,
    }));

    updateConfirmationsMutation.mutate(updates);
  }, [localConfirmations, updateConfirmationsMutation]);

  return {
    confirmations: localConfirmations,
    isLoading,
    handleToggleConfirmation,
    autoMarkPreFilled,
    autoMarkFieldsOnLoad,
    handleSaveAll,
    isSaving: updateConfirmationsMutation.isPending,
  };
};