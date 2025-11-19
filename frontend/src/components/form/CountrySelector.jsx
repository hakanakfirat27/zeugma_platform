// frontend/src/components/form/CountrySelector.jsx

import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';
import { COUNTRIES, searchCountries } from '../../constants/countries';

const CountrySelector = ({ 
  value, 
  onChange, 
  error, 
  required = false,
  label = "Country",
  placeholder = "Search countries...",
  disabled = false 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredCountries, setFilteredCountries] = useState(COUNTRIES);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // Find and set selected country when value changes
  useEffect(() => {
    if (value) {
      const country = COUNTRIES.find(c => c.name === value);
      setSelectedCountry(country || null);
    } else {
      setSelectedCountry(null);
    }
  }, [value]);

  // Handle search input change
  useEffect(() => {
    const results = searchCountries(searchQuery);
    setFilteredCountries(results);
  }, [searchQuery]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelectCountry = (country) => {
    setSelectedCountry(country);
    onChange(country.name);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    setSelectedCountry(null);
    onChange('');
    setSearchQuery('');
  };

  const handleToggleDropdown = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      if (!isOpen) {
        setSearchQuery('');
      }
    }
  };

  return (
    <div ref={dropdownRef} className="relative">
      {/* Label */}
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* Selected Value / Trigger Button */}
      <button
        type="button"
        onClick={handleToggleDropdown}
        disabled={disabled}
        className={`
          w-full flex items-center justify-between px-3 py-2 border rounded-lg
          transition-all duration-200
          ${error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'}
          ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white hover:border-gray-400'}
          ${isOpen ? 'ring-2 ring-blue-500 border-blue-500' : ''}
        `}
      >
        <div className="flex items-center gap-2 flex-1 text-left">
          {selectedCountry ? (
            <>
              <span className="text-sm">{selectedCountry.flag}</span>
              <span className="text-sm text-gray-900">{selectedCountry.name}</span>
            </>
          ) : (
            <span className="text-sm text-gray-400">Select a country...</span>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          {selectedCountry && !disabled && (
            <div
              onClick={handleClear}
              className="p-1 hover:bg-gray-100 rounded transition-colors cursor-pointer"
              title="Clear selection"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleClear(e);
                }
              }}
            >
              <X className="w-4 h-4 text-gray-400" />
            </div>
          )}
          <ChevronDown 
            className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'transform rotate-180' : ''}`} 
          />
        </div>
      </button>

      {/* Error Message */}
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
          {/* Search Input */}
          <div className="p-3 border-b border-gray-200 bg-gray-50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={placeholder}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Countries List */}
          <div className="max-h-64 overflow-y-auto">
            {filteredCountries.length > 0 ? (
              <ul className="py-1">
                {filteredCountries.map((country) => (
                  <li key={country.code}>
                    <button
                      type="button"
                      onClick={() => handleSelectCountry(country)}
                      className={`
                        w-full flex items-center justify-between px-3 py-2 text-left
                        transition-colors
                        ${selectedCountry?.code === country.code 
                          ? 'bg-blue-50 text-blue-700' 
                          : 'hover:bg-gray-50 text-gray-900'
                        }
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{country.flag}</span>
                        <span className="text-sm font-medium">{country.name}</span>
                      </div>
                      {selectedCountry?.code === country.code && (
                        <Check className="w-4 h-4 text-blue-600" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-3 py-8 text-center text-gray-500">
                <Search className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No countries found</p>
                <p className="text-xs mt-1">Try a different search term</p>
              </div>
            )}
          </div>

          {/* Footer Info */}
          <div className="px-3 py-2 border-t border-gray-200 bg-gray-50">
            <p className="text-xs text-gray-500">
              {filteredCountries.length} {filteredCountries.length === 1 ? 'country' : 'countries'} available
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CountrySelector;