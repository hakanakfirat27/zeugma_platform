// frontend/src/utils/fieldStyles.js
// Helper function to get inline styles based on confirmation data

export const getFieldConfirmationStyle = (confirmation, hasValue) => {
  // Only apply styles if field has a value
  if (!hasValue || !confirmation) {
    return {};
  }
  
  const lastSelected = confirmation.last_selected;
  
  if (lastSelected === 'is_confirmed') {
    // Olive green for confirmed
    return {
      backgroundColor: '#dcfce7',
      borderColor: '#86efac'
    };
  } else if (lastSelected === 'is_new_data') {
    // Yellow for new data
    return {
      backgroundColor: '#fef9c3',
      borderColor: '#fde047'
    };
  } else if (lastSelected === 'is_pre_filled') {
    // Light green for pre-filled
    return {
      backgroundColor: '#f0fdf4',
      borderColor: '#bbf7d0'
    };
  }
  
  return {};
};