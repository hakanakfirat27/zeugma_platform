// frontend/src/pages/database/AddCompanyPage.jsx

import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getBreadcrumbs } from '../../utils/breadcrumbConfig';
import {
  ArrowLeft, Building2, MapPin, Phone, Users,
  Save, X, ChevronRight, Home, Plus, Check, AlertCircle
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import CountrySelector from '../../components/form/CountrySelector';
import companyService from '../../services/companyService';

// Category options
const CATEGORIES = [
  { value: 'INJECTION', label: 'Injection Moulders', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  { value: 'BLOW', label: 'Blow Moulders', color: 'bg-green-100 text-green-800 border-green-300' },
  { value: 'ROTO', label: 'Roto Moulders', color: 'bg-orange-100 text-orange-800 border-orange-300' },
  { value: 'PE_FILM', label: 'PE Film Extruders', color: 'bg-purple-100 text-purple-800 border-purple-300' },
  { value: 'SHEET', label: 'Sheet Extruders', color: 'bg-cyan-100 text-cyan-800 border-cyan-300' },
  { value: 'PIPE', label: 'Pipe Extruders', color: 'bg-red-100 text-red-800 border-red-300' },
  { value: 'TUBE_HOSE', label: 'Tube & Hose Extruders', color: 'bg-amber-100 text-amber-800 border-amber-300' },
  { value: 'PROFILE', label: 'Profile Extruders', color: 'bg-gray-100 text-gray-800 border-gray-300' },
  { value: 'CABLE', label: 'Cable Extruders', color: 'bg-pink-100 text-pink-800 border-pink-300' },
  { value: 'COMPOUNDER', label: 'Compounders', color: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
];

const STATUS_OPTIONS = [
  { value: 'INCOMPLETE', label: 'Incomplete', description: 'Unverified, estimated data' },
  { value: 'COMPLETE', label: 'Complete', description: 'Verified by telephone interview' },
];

const AddCompanyPage = () => {
  const navigate = useNavigate();
  const location = useLocation();  
  const breadcrumbs = getBreadcrumbs(location.pathname);  

  // Form state
  const [formData, setFormData] = useState({
    // Company Info
    company_name: '',
    status: 'INCOMPLETE',
    
    // Address
    address_1: '',
    address_2: '',
    address_3: '',
    address_4: '',
    region: '',
    country: '',
    geographical_coverage: '',
    
    // Contact
    phone_number: '',
    company_email: '',
    website: '',
    accreditation: '',
    parent_company: '',
    
    // Contact Persons
    title_1: '', initials_1: '', surname_1: '', position_1: '',
    title_2: '', initials_2: '', surname_2: '', position_2: '',
    title_3: '', initials_3: '', surname_3: '', position_3: '',
    title_4: '', initials_4: '', surname_4: '', position_4: '',
    
    // Project
    project_code: '',
  });
  
  // Selected category for the first production site
  const [selectedCategory, setSelectedCategory] = useState('');
  
  // UI state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [duplicateError, setDuplicateError] = useState(null);
  const [activeTab, setActiveTab] = useState('company'); // company, contact, process

  // Handle input change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear field error when user types
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: null }));
    }
    
    // Clear duplicate errors when name changes
    if (name === 'company_name') {
      setDuplicateWarning(null);
      setDuplicateError(null);
    }
  };

  // Handle country change from CountrySelector
  const handleCountryChange = (countryName) => {
    setFormData(prev => ({ ...prev, country: countryName }));
  };

  // Validate company name
  const validateCompanyName = () => {
    if (!formData.company_name.trim()) {
      setFieldErrors(prev => ({ ...prev, company_name: 'Company name is required' }));
      return false;
    }
    return true;
  };

  // Check for duplicates
  const checkDuplicate = async () => {
    if (!formData.company_name.trim()) return false;
    
    try {
      const result = await companyService.checkDuplicate({
        company_name: formData.company_name,
        country: formData.country
      });
      
      if (result.is_duplicate) {
        setDuplicateError(`A company with this name already exists: ${result.exact_match?.unique_key}`);
        setDuplicateWarning(null);
        return false;
      }
      
      setDuplicateError(null);
      
      if (result.similar_matches?.length > 0) {
        setDuplicateWarning({
          message: 'Similar companies found. Please verify this is not a duplicate.',
          matches: result.similar_matches
        });
      } else {
        setDuplicateWarning(null);
      }
      
      return true;
    } catch (err) {
      console.error('Error checking duplicate:', err);
      return true; // Continue anyway on error
    }
  };

  // Validate current tab before moving to next
  const validateCurrentTab = async () => {
    if (activeTab === 'company') {
      // Validate company name
      if (!formData.company_name.trim()) {
        setFieldErrors(prev => ({ ...prev, company_name: 'Company name is required' }));
        return false;
      }
      
      // Check for duplicate
      const isDuplicateOk = await checkDuplicate();
      if (!isDuplicateOk) {
        return false;
      }
      
      return true;
    }
    
    return true;
  };

  // Handle next button click
  const handleNext = async () => {
    const isValid = await validateCurrentTab();
    if (!isValid) return;
    
    const currentIndex = tabs.findIndex(t => t.id === activeTab);
    if (currentIndex < tabs.length - 1) {
      setActiveTab(tabs[currentIndex + 1].id);
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    
    // Validation
    if (!formData.company_name.trim()) {
      setFieldErrors(prev => ({ ...prev, company_name: 'Company name is required' }));
      setActiveTab('company');
      return;
    }
    
    if (duplicateError) {
      setActiveTab('company');
      return;
    }
    
    if (!selectedCategory) {
      setError('Please select at least one production category');
      return;
    }
    
    setSaving(true);
    
    try {
      // Final duplicate check
      const canProceed = await checkDuplicate();
      if (!canProceed) {
        setSaving(false);
        setActiveTab('company');
        return;
      }
      
      // Create company
      const companyResponse = await companyService.createCompany(formData);
      const companyId = companyResponse.company_id;
      
      // Add production site with selected category
      await companyService.addProductionSite(companyId, {
        category: selectedCategory
      });
      
      // Navigate to the new company's detail page
      navigate(`/companies/${companyId}`, {
        state: { message: 'Company created successfully!' }
      });
      
    } catch (err) {
      console.error('Error creating company:', err);
      setError(err.response?.data?.error || err.response?.data?.company_name?.[0] || err.message || 'Failed to create company');
    } finally {
      setSaving(false);
    }
  };

  // Tab navigation
  const tabs = [
    { id: 'company', label: 'Company Info', icon: Building2 },
    { id: 'contact', label: 'Contact Persons', icon: Users },
    { id: 'process', label: 'Process Category', icon: Plus },
  ];

  // Check if can proceed to next tab
  const canProceedFromCompanyTab = formData.company_name.trim() && !duplicateError;

  return (
    <DashboardLayout
      pageTitle="Add Company"
      pageSubtitleBottom="Create a new company record in the database"
      breadcrumbs={breadcrumbs}
    >
      <div className="flex-1 overflow-auto bg-gray-50">

        {/* Form Content */}
        <div className="max-w-6xl mx-auto px-6 py-6">
          {/* Error Alert */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-red-900">Error</h4>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
              <button onClick={() => setError(null)} className="ml-auto text-red-600 hover:text-red-800">
                <X className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Duplicate Error */}
          {duplicateError && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-red-900">Duplicate Company</h4>
                <p className="text-red-700 text-sm">{duplicateError}</p>
              </div>
              <button onClick={() => setDuplicateError(null)} className="ml-auto text-red-600 hover:text-red-800">
                <X className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Duplicate Warning */}
          {duplicateWarning && (
            <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-amber-900">{duplicateWarning.message}</h4>
                  <div className="mt-2 space-y-1">
                    {duplicateWarning.matches.map((match, idx) => (
                      <div key={idx} className="text-sm text-amber-700">
                        • {match.company_name} ({match.unique_key}) - {match.country}
                      </div>
                    ))}
                  </div>
                </div>
                <button onClick={() => setDuplicateWarning(null)} className="text-amber-600 hover:text-amber-800">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="bg-white rounded-t-xl border border-b-0 border-gray-200">
            <div className="flex">
              {tabs.map((tab, index) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                const isPrevious = tabs.findIndex(t => t.id === activeTab) > index;
                
                // Disable tabs that can't be reached yet
                const isDisabled = tab.id !== 'company' && !canProceedFromCompanyTab && activeTab === 'company';
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      if (!isDisabled) {
                        setActiveTab(tab.id);
                      }
                    }}
                    disabled={isDisabled}
                    className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                      isActive
                        ? 'border-emerald-600 text-emerald-600 bg-emerald-50/50'
                        : isPrevious
                        ? 'border-transparent text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                        : isDisabled
                        ? 'border-transparent text-gray-400 cursor-not-allowed'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="bg-white rounded-b-xl border border-gray-200 p-6">
              
              {/* Company Info Tab */}
              {activeTab === 'company' && (
                <div className="space-y-6">
                  {/* Company Name & Status */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Company Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="company_name"
                        value={formData.company_name}
                        onChange={handleChange}
                        onBlur={() => {
                          validateCompanyName();
                          if (formData.company_name.trim()) {
                            checkDuplicate();
                          }
                        }}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                          fieldErrors.company_name || duplicateError
                            ? 'border-red-500 bg-red-50'
                            : 'border-gray-300'
                        }`}
                        placeholder="Enter company name"
                      />
                      {fieldErrors.company_name && (
                        <p className="mt-1 text-sm text-red-600">{fieldErrors.company_name}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                      <select
                        name="status"
                        value={formData.status}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      >
                        {STATUS_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Address Section */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      Address Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Address 1</label>
                        <input
                          type="text"
                          name="address_1"
                          value={formData.address_1}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Address 2</label>
                        <input
                          type="text"
                          name="address_2"
                          value={formData.address_2}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Address 3</label>
                        <input
                          type="text"
                          name="address_3"
                          value={formData.address_3}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Address 4</label>
                        <input
                          type="text"
                          name="address_4"
                          value={formData.address_4}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
                        <input
                          type="text"
                          name="region"
                          value={formData.region}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <CountrySelector
                          value={formData.country}
                          onChange={handleCountryChange}
                          label="Country"
                          placeholder="Search countries..."
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Geographical Coverage</label>
                        <input
                          type="text"
                          name="geographical_coverage"
                          value={formData.geographical_coverage}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Contact Section */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-400" />
                      Contact Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                        <input
                          type="text"
                          name="phone_number"
                          value={formData.phone_number}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Company Email</label>
                        <input
                          type="email"
                          name="company_email"
                          value={formData.company_email}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                        <input
                          type="url"
                          name="website"
                          value={formData.website}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                          placeholder="https://"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Parent Company</label>
                        <input
                          type="text"
                          name="parent_company"
                          value={formData.parent_company}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Accreditation</label>
                        <textarea
                          name="accreditation"
                          value={formData.accreditation}
                          onChange={handleChange}
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Contact Persons Tab */}
              {activeTab === 'contact' && (
                <div className="space-y-6">
                  {[1, 2, 3, 4].map((num) => (
                    <div key={num} className="border border-gray-200 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">Contact Person {num}</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                          <input
                            type="text"
                            name={`title_${num}`}
                            value={formData[`title_${num}`]}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            placeholder="Mr/Ms/Dr"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Initials</label>
                          <input
                            type="text"
                            name={`initials_${num}`}
                            value={formData[`initials_${num}`]}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Surname</label>
                          <input
                            type="text"
                            name={`surname_${num}`}
                            value={formData[`surname_${num}`]}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                          <input
                            type="text"
                            name={`position_${num}`}
                            value={formData[`position_${num}`]}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Process Category Tab */}
              {activeTab === 'process' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Select Production Category <span className="text-red-500">*</span>
                    </h3>
                    <p className="text-sm text-gray-500 mb-4">
                      Choose the primary production category for this company. You can add more categories later.
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {CATEGORIES.map((cat) => (
                        <button
                          key={cat.value}
                          type="button"
                          onClick={() => setSelectedCategory(cat.value)}
                          className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all text-left ${
                            selectedCategory === cat.value
                              ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200'
                              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            selectedCategory === cat.value ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-400'
                          }`}>
                            {selectedCategory === cat.value ? (
                              <Check className="w-5 h-5" />
                            ) : (
                              <Plus className="w-5 h-5" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{cat.label}</div>
                            <div className={`text-xs px-2 py-0.5 rounded-full inline-block mt-1 ${cat.color}`}>
                              {cat.value.replace('_', ' ')}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="mt-6 flex items-center justify-between">
              <button
                type="button"
                onClick={() => navigate('/company-database')}
                className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium"
              >
                Cancel
              </button>
              
              <div className="flex items-center gap-3">
                {activeTab !== 'company' && (
                  <button
                    type="button"
                    onClick={() => {
                      const currentIndex = tabs.findIndex(t => t.id === activeTab);
                      if (currentIndex > 0) {
                        setActiveTab(tabs[currentIndex - 1].id);
                      }
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
                  >
                    Previous
                  </button>
                )}
                
                {activeTab !== 'process' ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={activeTab === 'company' && !canProceedFromCompanyTab}
                    className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 ${
                      activeTab === 'company' && !canProceedFromCompanyTab
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-emerald-600 text-white hover:bg-emerald-700'
                    }`}
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={saving || !selectedCategory}
                    className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Create Company
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AddCompanyPage;
