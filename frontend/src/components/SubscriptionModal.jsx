import React, { useState, useEffect, useRef } from 'react';
import { X, Search, User, FileText, Calendar, DollarSign } from 'lucide-react';
import api from '../utils/api';

// Custom Searchable Select Component
const SearchableSelect = ({
  options,
  value,
  onChange,
  placeholder,
  label,
  required,
  renderOption,
  searchKeys = ['label'],
  emptyMessage = 'No results found'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredOptions, setFilteredOptions] = useState(options);
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // Filter options based on search term
  useEffect(() => {
    if (!searchTerm) {
      setFilteredOptions(options);
      return;
    }

    const searchLower = searchTerm.toLowerCase();
    const filtered = options.filter(option => {
      return searchKeys.some(key => {
        const value = option[key];
        return value && value.toString().toLowerCase().includes(searchLower);
      });
    });
    setFilteredOptions(filtered);
  }, [searchTerm, options, searchKeys]);

  // Handle clicks outside dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
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

  const selectedOption = options.find(opt => opt.value === value);

  const handleSelect = (option) => {
    onChange(option.value);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = (e) => {
    e.stopPropagation(); // Prevent dropdown from opening
    onChange('');
    setSearchTerm('');
  };

  return (
    <div ref={dropdownRef} className="relative">
      <label className="block text-sm font-semibold text-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      {/* Selected Value Display */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-left flex items-center justify-between bg-white hover:border-gray-300"
      >
        <span className={selectedOption ? 'text-gray-900' : 'text-gray-500'}>
          {selectedOption ? renderOption(selectedOption) : placeholder}
        </span>
        <div className="flex items-center gap-2">
          {/* Clear button - only show when value is selected */}
          {selectedOption && (
            <button
              type="button"
              onClick={handleClear}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded"
              aria-label="Clear selection"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          {/* Dropdown arrow */}
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'transform rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white border-2 border-gray-200 rounded-lg shadow-xl max-h-80 overflow-hidden">
          {/* Search Input */}
          <div className="sticky top-0 p-3 bg-gray-50 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Type to search..."
                className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
              />
              {/* Clear Button */}
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Options List */}
          <div className="overflow-y-auto max-h-64">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option)}
                  className={`w-full px-4 py-3 text-left hover:bg-indigo-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                    option.value === value ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-900'
                  }`}
                >
                  {renderOption(option)}
                </button>
              ))
            ) : (
              <div className="px-4 py-8 text-center text-gray-500">
                <Search className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-sm">{emptyMessage}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Main Modal Component
const SubscriptionModal = ({ onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState([]);
  const [reports, setReports] = useState([]);
  const [formData, setFormData] = useState({
    client: '',
    report: '',
    plan: '', // No default value - user must select
    status: 'ACTIVE',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    notes: ''
  });

  useEffect(() => {
    fetchClients();
    fetchReports();
  }, []);

  // Auto-calculate end date based on start date AND plan
  useEffect(() => {
    if (formData.start_date && formData.plan) {
      const startDate = new Date(formData.start_date);
      const endDate = new Date(startDate);

      if (formData.plan === 'MONTHLY') {
        endDate.setMonth(endDate.getMonth() + 1);
      } else if (formData.plan === 'ANNUAL') {
        endDate.setFullYear(endDate.getFullYear() + 1);
      }

      setFormData(prev => ({
        ...prev,
        end_date: endDate.toISOString().split('T')[0]
      }));
    }
  }, [formData.start_date, formData.plan]);

  const fetchClients = async () => {
    try {
      const response = await api.get('/api/clients/');
      const clientData = response.data.results || response.data;
      setClients(clientData);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const fetchReports = async () => {
    try {
      const response = await api.get('/api/custom-reports/');
      const reportData = response.data.results || response.data;
      setReports(reportData);
    } catch (error) {
      console.error('Error fetching reports:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.client) {
      alert('Please select a client');
      return;
    }

    if (!formData.report) {
      alert('Please select a report');
      return;
    }

    if (!formData.plan) {
      alert('Please select a subscription plan');
      return;
    }

    try {
      setLoading(true);

      const submitData = {
        ...formData,
        amount_paid: 0.00
      };

      console.log('Submitting subscription data:', submitData);

      await api.post('/api/subscriptions/', submitData);
      alert('Subscription created successfully!');
      onSuccess();
    } catch (error) {
      console.error('Error creating subscription:', error);
      console.error('Error response:', error.response?.data);
      alert(error.response?.data?.error || error.response?.data?.report?.[0] || 'Failed to create subscription');
    } finally {
      setLoading(false);
    }
  };

  // Transform data for searchable select
  const clientOptions = clients.map(client => ({
    value: client.id,
    label: client.full_name || client.username,
    email: client.email,
    company: client.company_name,
    searchText: `${client.full_name} ${client.username} ${client.email} ${client.company_name || ''}`.toLowerCase()
  }));

  // FIXED: Use report.id (integer primary key) instead of report.report_id (UUID)
  const reportOptions = reports.map(report => ({
    value: report.id,  // ✅ Changed from report.report_id to report.id
    label: report.title,
    recordCount: report.record_count,
    description: report.description,
    searchText: `${report.title} ${report.description || ''}`.toLowerCase()
  }));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-4 rounded-t-xl z-10">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold">Create New Subscription</h2>
              <p className="text-sm text-indigo-100 mt-1">Add a new subscription for a client</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Client Selection with Search */}
          <SearchableSelect
            options={clientOptions}
            value={formData.client}
            onChange={(value) => setFormData(prev => ({ ...prev, client: value }))}
            placeholder="Select a client"
            label="Client"
            required
            searchKeys={['label', 'email', 'company', 'searchText']}
            renderOption={(option) => (
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  <User className="w-5 h-5 text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">{option.label}</div>
                  <div className="text-sm text-gray-500 truncate">{option.email}</div>
                  {option.company && (
                    <div className="text-xs text-gray-400 truncate">{option.company}</div>
                  )}
                </div>
              </div>
            )}
            emptyMessage="No clients found. Try a different search term."
          />

          {/* Report Selection with Search */}
          <SearchableSelect
            options={reportOptions}
            value={formData.report}
            onChange={(value) => setFormData(prev => ({ ...prev, report: value }))}
            placeholder="Select a report"
            label="Report"
            required
            searchKeys={['label', 'description', 'searchText']}
            renderOption={(option) => (
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  <FileText className="w-5 h-5 text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">{option.label}</div>
                  <div className="text-sm text-gray-500">
                    {option.recordCount} records
                  </div>
                  {option.description && (
                    <div className="text-xs text-gray-400 mt-1 line-clamp-2">{option.description}</div>
                  )}
                </div>
              </div>
            )}
            emptyMessage="No reports found. Try a different search term."
          />

          {/* Subscription Plan */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Subscription Plan <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, plan: 'MONTHLY' }))}
                className={`p-4 border-2 rounded-xl transition-all ${
                  formData.plan === 'MONTHLY'
                    ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-center">
                  <p className="text-lg font-bold text-gray-900">Monthly</p>
                  <p className="text-sm text-gray-600 mt-1">1 month duration</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, plan: 'ANNUAL' }))}
                className={`p-4 border-2 rounded-xl transition-all ${
                  formData.plan === 'ANNUAL'
                    ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-center">
                  <p className="text-lg font-bold text-gray-900">Annual</p>
                  <p className="text-sm text-gray-600 mt-1">1 year duration</p>
                </div>
              </button>
            </div>
            {formData.plan && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <p className="text-sm text-blue-800">
                    <span className="font-semibold">Subscription Duration:</span>{' '}
                    {formData.plan === 'MONTHLY' ? '1 month' : '1 year'} from start date
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Status <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
              required
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
            >
              <option value="ACTIVE">Active</option>
              <option value="PENDING">Pending</option>
            </select>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Start Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                required
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                End Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                required
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
              placeholder="Add any additional notes about this subscription..."
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {loading ? 'Creating...' : '📋 Create Subscription'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SubscriptionModal;