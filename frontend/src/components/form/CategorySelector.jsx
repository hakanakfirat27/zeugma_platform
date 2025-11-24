// frontend/src/components/form/CategorySelector.jsx
// Component for selecting a category from the predefined list
// FIXED: Now properly handles CATEGORIES as an array of objects

import React from 'react';
import { CATEGORIES } from '../../constants/categories';

const CategorySelector = ({ value, onChange, error, required = false, label = "Category" }) => {
  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
          error ? 'border-red-500' : 'border-gray-300'
        }`}
        required={required}
      >
        <option value="">-- Select a Category --</option>
        {CATEGORIES.filter(cat => cat.value !== 'ALL').map((category) => (
          <option key={category.value} value={category.value}>
            {category.label}
          </option>
        ))}
      </select>
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
};

export default CategorySelector;