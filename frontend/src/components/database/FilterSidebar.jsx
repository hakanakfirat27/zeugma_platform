import { X, RotateCcw } from 'lucide-react';
import { useState } from 'react';

const FilterSidebar = ({ isOpen, onClose, filters, onFilterChange, filterOptions, onApply, onReset }) => {
  const [localFilters, setLocalFilters] = useState(filters);

  const handleFilterChange = (field, value) => {
    setLocalFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleApply = () => {
    onApply(localFilters);
  };

  const handleReset = () => {
    setLocalFilters({});
    onReset();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />

      {/* Sidebar */}
      <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-xl z-50 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b bg-indigo-600 text-white">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Refine your search results</h3>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {filterOptions.map(option => (
            <div key={option.field} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-900">{option.label}</h4>
                <span className="text-sm text-gray-500">{option.count}</span>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name={option.field}
                    checked={localFilters[option.field] === undefined}
                    onChange={() => handleFilterChange(option.field, undefined)}
                    className="w-4 h-4 text-gray-400"
                  />
                  <span className="text-sm text-gray-600">Ignore</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name={option.field}
                    checked={localFilters[option.field] === true}
                    onChange={() => handleFilterChange(option.field, true)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm text-gray-900">Include</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name={option.field}
                    checked={localFilters[option.field] === false}
                    onChange={() => handleFilterChange(option.field, false)}
                    className="w-4 h-4 text-red-600"
                  />
                  <span className="text-sm text-gray-900">Exclude</span>
                </label>
              </div>
            </div>
          ))}
        </div>

        {/* Footer Actions */}
        <div className="border-t p-4 bg-gray-50 flex items-center gap-3">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
          <button
            onClick={onClose}
            className="flex-1 btn-secondary"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="flex-1 btn-primary"
          >
            Apply Filters
          </button>
        </div>
      </div>
    </>
  );
};

export default FilterSidebar;