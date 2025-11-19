import React, { useState } from 'react';
import { AlertTriangle, Building2, Phone, Mail, Globe, Award, Users, MapPin, ExternalLink, Shield, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';

const CompanyDetailsModal = ({ isOpen, onClose, company }) => {
  const { success } = useToast();
  const [copiedField, setCopiedField] = useState(null);

  if (!isOpen || !company) return null;

  const copyToClipboard = (text, fieldName) => {
    if (!text || text === 'Not found') {
      return;
    }
    
    navigator.clipboard.writeText(text).then(() => {
      success(`${fieldName} copied to clipboard`);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    }).catch(err => {
      console.error('Failed to copy:', err);
    });
  };

  const CopyButton = ({ text, fieldName }) => {
    if (!text || text === 'Not found') return null;
    
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          copyToClipboard(text, fieldName);
        }}
        className="ml-2 p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
        title={`Copy ${fieldName}`}
      >
        {copiedField === fieldName ? (
          <CheckCircle className="w-4 h-4 text-green-600" />
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        )}
      </button>
    );
  };

  // Get confidence level color and text
  const getConfidenceIndicator = (score) => {
    if (!score && score !== 0) return null;
    
    const percentage = Math.round(score * 100);
    let color, bgColor, label;
    
    if (score >= 0.8) {
      color = 'text-green-700';
      bgColor = 'bg-green-100';
      label = 'High Confidence';
    } else if (score >= 0.6) {
      color = 'text-yellow-700';
      bgColor = 'bg-yellow-100';
      label = 'Medium Confidence';
    } else {
      color = 'text-red-700';
      bgColor = 'bg-red-100';
      label = 'Low Confidence';
    }
    
    return { percentage, color, bgColor, label };
  };

  const confidenceInfo = getConfidenceIndicator(company.confidence_score);

  const InfoField = ({ label, value, fieldName, icon: Icon }) => (
    <div className="py-2.5 border-b border-gray-100 last:border-b-0">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center space-x-1.5">
            {Icon && <Icon className="w-3.5 h-3.5" />}
            <span>{label}</span>
          </label>
          <div className="text-sm text-gray-900">
            {value && value !== 'Not found' ? value : (
              <span className="text-gray-400 italic text-xs">Not available</span>
            )}
          </div>
        </div>
        <CopyButton text={value} fieldName={label} />
      </div>
    </div>
  );

  const copyAllFields = () => {
    let allInfo = `
Company Information
==================

Official Name: ${company.official_name || 'N/A'}
Address: ${company.address || 'N/A'}
City: ${company.city || 'N/A'}
Postal Code: ${company.postal_code || 'N/A'}
Country: ${company.search_query?.country || company.country || 'N/A'}
Parent Company: ${company.parent_company || 'N/A'}

Contact Information
==================
Phone: ${company.phone || 'N/A'}
Alternative Phones: ${company.alternative_phones?.join(', ') || 'N/A'}
Email: ${company.email || 'N/A'}
Website: ${company.website || 'N/A'}
LinkedIn: ${company.linkedin || 'N/A'}

Contact Persons
==================
${company.contact_persons?.map((person, idx) => `
${idx + 1}. ${person.name || 'N/A'}
   Role: ${person.role || 'N/A'}
   Email: ${person.email || 'N/A'}
   LinkedIn: ${person.linkedin || 'N/A'}
`).join('') || 'No contact persons listed'}

Business Details
==================
Industry: ${company.industry || 'N/A'}
Products/Services: ${company.products_services || 'N/A'}
Year Founded: ${company.year_founded || 'N/A'}
Employee Count: ${company.employee_count || 'N/A'}
Accreditation: ${company.accreditation?.join(', ') || 'N/A'}

Description
==================
${company.description || 'N/A'}

Branches
==================
${company.branches?.map((branch, idx) => `
${idx + 1}. ${branch.location_type || 'Branch'}
   Address: ${branch.address || 'N/A'}
   City: ${branch.city || 'N/A'}
   Country: ${branch.country || 'N/A'}
   Phone: ${branch.phone || 'N/A'}
   Manager: ${branch.manager || 'N/A'}
`).join('') || 'No branches listed'}

Additional Information
==================
${company.additional_info || 'N/A'}

Research Information
==================
Searched by: ${company.searched_by}
Searched at: ${new Date(company.searched_at).toLocaleString()}
Confidence Score: ${company.confidence_score ? (company.confidence_score * 100).toFixed(0) + '%' : 'N/A'}
Model Used: ${company.model_used || 'N/A'}

Sources
==================
${company.sources?.map((source, idx) => `
${idx + 1}. ${source.title || 'Source'}
   URL: ${source.url || 'N/A'}
   Reliability: ${source.reliability || 'N/A'}
`).join('') || 'No sources listed'}
    `.trim();

    navigator.clipboard.writeText(allInfo).then(() => {
      success('All company information copied to clipboard');
    }).catch(err => {
      console.error('Failed to copy:', err);
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
            <div className="flex items-center space-x-3">
              <div className="bg-white bg-opacity-20 p-2 rounded-lg">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">
                  Company Details
                </h3>
                <p className="text-purple-100 text-xs mt-0.5">
                  {company.search_query?.company_name} • {company.search_query?.country || company.country}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-160px)]">
            
            {/* AI Verification Warning */}
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-r-lg">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-5 w-5 text-yellow-400" />
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium text-yellow-800">
                    AI-Generated Information
                  </p>
                  <p className="text-xs text-yellow-700 mt-1">
                    This information is automatically gathered and may contain errors. 
                    <strong> Please verify details</strong> on the company's official website, 
                    business registry, or through direct contact before making business decisions.
                  </p>
                </div>
              </div>
            </div>

            {/* Confidence & Copy Actions Bar */}
            <div className="bg-gray-50 px-4 py-3 rounded-lg border border-gray-200 flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                {/* Confidence Indicator */}
                {confidenceInfo && (
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-600 font-medium">Confidence:</span>
                    <div className={`flex items-center space-x-2 px-2.5 py-1 rounded-full ${confidenceInfo.bgColor}`}>
                      <div className="flex items-center space-x-1">
                        {confidenceInfo.percentage >= 80 ? (
                          <CheckCircle className={`w-3.5 h-3.5 ${confidenceInfo.color}`} />
                        ) : confidenceInfo.percentage >= 60 ? (
                          <AlertCircle className={`w-3.5 h-3.5 ${confidenceInfo.color}`} />
                        ) : (
                          <AlertTriangle className={`w-3.5 h-3.5 ${confidenceInfo.color}`} />
                        )}
                        <span className={`text-xs font-semibold ${confidenceInfo.color}`}>
                          {confidenceInfo.percentage}%
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                <div className="text-xs text-gray-500">
                  Click any field to copy
                </div>
              </div>
              <button
                onClick={copyAllFields}
                className="px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-1.5 text-xs font-medium"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span>Copy All</span>
              </button>
            </div>

            {/* Confidence Notes */}
            {company.confidence_notes && company.confidence_notes !== 'Not found' && (
              <div className="bg-blue-50 border-l-4 border-blue-400 p-3 mb-6 rounded-r-lg">
                <p className="text-xs text-blue-800">
                  <strong>Confidence Note:</strong> {company.confidence_notes}
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* LEFT COLUMN */}
              <div className="space-y-6">
                {/* Company Information Section */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center space-x-2">
                    <Building2 className="w-4 h-4 text-purple-600" />
                    <span>Company Information</span>
                  </h4>
                  <div className="bg-white border border-gray-200 rounded-lg p-3">
                    <InfoField label="Official Name" value={company.official_name} fieldName="Official Name" />
                    <InfoField label="Parent Company" value={company.parent_company} fieldName="Parent Company" icon={Building2} />
                    <InfoField label="Address" value={company.address} fieldName="Address" icon={MapPin} />
                    <InfoField label="City" value={company.city} fieldName="City" />
                    <InfoField label="Postal Code" value={company.postal_code} fieldName="Postal Code" />
                    <InfoField label="Country" value={company.search_query?.country || company.country} fieldName="Country" />
                  </div>
                </div>

                {/* Contact Information Section */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center space-x-2">
                    <Phone className="w-4 h-4 text-purple-600" />
                    <span>Contact Information</span>
                  </h4>
                  <div className="bg-white border border-gray-200 rounded-lg p-3">
                    <InfoField label="Phone" value={company.phone} fieldName="Phone" icon={Phone} />
                    {company.alternative_phones && Array.isArray(company.alternative_phones) && company.alternative_phones.length > 0 && (
                      <div className="py-2.5 border-b border-gray-100">
                        <label className="block text-xs font-medium text-gray-500 mb-1.5">Alternative Phones</label>
                        <div className="space-y-1">
                          {company.alternative_phones.map((phone, idx) => (
                            <div key={idx} className="flex items-center justify-between text-sm">
                              <span className="text-gray-900">{phone}</span>
                              <CopyButton text={phone} fieldName={`Alt Phone ${idx + 1}`} />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <InfoField label="Email" value={company.email} fieldName="Email" icon={Mail} />
                    <InfoField label="Website" value={company.website} fieldName="Website" icon={Globe} />
                    <InfoField label="LinkedIn" value={company.linkedin} fieldName="LinkedIn" />
                  </div>
                </div>

                {/* Contact Persons Section */}
                {company.contact_persons && Array.isArray(company.contact_persons) && company.contact_persons.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center space-x-2">
                      <Users className="w-4 h-4 text-purple-600" />
                      <span>Contact Persons</span>
                    </h4>
                    <div className="bg-white border border-gray-200 rounded-lg p-3 space-y-3">
                      {company.contact_persons.map((person, idx) => (
                        <div key={idx} className="pb-3 border-b border-gray-100 last:border-b-0 last:pb-0">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="text-sm font-semibold text-gray-900">{person.name || 'N/A'}</p>
                              <p className="text-xs text-gray-600">{person.role || 'N/A'}</p>
                            </div>
                          </div>
                          {person.email && person.email !== 'Not found' && (
                            <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                              <div className="flex items-center space-x-1">
                                <Mail className="w-3 h-3" />
                                <span>{person.email}</span>
                              </div>
                              <CopyButton text={person.email} fieldName={`${person.name} Email`} />
                            </div>
                          )}
                          {person.linkedin && person.linkedin !== 'Not found' && (
                            <a 
                              href={person.linkedin} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-800"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>LinkedIn Profile</span>
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* RIGHT COLUMN */}
              <div className="space-y-6">
                {/* Business Details Section */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center space-x-2">
                    <Award className="w-4 h-4 text-purple-600" />
                    <span>Business Details</span>
                  </h4>
                  <div className="bg-white border border-gray-200 rounded-lg p-3">
                    <InfoField label="Industry" value={company.industry} fieldName="Industry" />
                    <InfoField label="Products/Services" value={company.products_services} fieldName="Products/Services" />
                    <InfoField label="Year Founded" value={company.year_founded} fieldName="Year Founded" />
                    <InfoField label="Employee Count" value={company.employee_count} fieldName="Employee Count" />
                  </div>
                </div>

                {/* Accreditation Section */}
                {company.accreditation && Array.isArray(company.accreditation) && company.accreditation.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center space-x-2">
                      <Shield className="w-4 h-4 text-purple-600" />
                      <span>Accreditation & Certificates</span>
                    </h4>
                    <div className="bg-white border border-gray-200 rounded-lg p-3">
                      <div className="flex flex-wrap gap-2">
                        {company.accreditation.map((cert, idx) => (
                          <span 
                            key={idx}
                            className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
                          >
                            <Shield className="w-3 h-3 mr-1" />
                            {cert}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Description Section */}
                {company.description && company.description !== 'Not found' && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center space-x-2">
                      <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span>Description</span>
                    </h4>
                    <div className="bg-white border border-gray-200 rounded-lg p-3">
                      <div className="flex items-start justify-between">
                        <p className="text-xs text-gray-900 leading-relaxed">
                          {company.description}
                        </p>
                        <CopyButton text={company.description} fieldName="Description" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Additional Information Section */}
                {company.additional_info && company.additional_info !== 'Not found' && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center space-x-2">
                      <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Additional Information</span>
                    </h4>
                    <div className="bg-white border border-gray-200 rounded-lg p-3">
                      <div className="flex items-start justify-between">
                        <p className="text-xs text-gray-900 leading-relaxed">
                          {company.additional_info}
                        </p>
                        <CopyButton text={company.additional_info} fieldName="Additional Info" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Branches Section (Full Width) */}
            {company.branches && Array.isArray(company.branches) && company.branches.length > 0 && (
              <div className="mt-6">
                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-purple-600" />
                  <span>Branches & Locations ({company.branches.length})</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {company.branches.map((branch, idx) => (
                    <div key={idx} className="bg-white border border-gray-200 rounded-lg p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <MapPin className="w-4 h-4 text-purple-600" />
                          <span className="text-sm font-semibold text-gray-900">
                            {branch.location_type || 'Branch'} #{idx + 1}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-gray-600 font-medium">Address:</p>
                            <p className="text-gray-900">{branch.address || 'N/A'}</p>
                          </div>
                          <CopyButton text={branch.address} fieldName={`Branch ${idx + 1} Address`} />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-gray-600">City:</span> <span className="text-gray-900 font-medium">{branch.city || 'N/A'}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-gray-600">Country:</span> <span className="text-gray-900 font-medium">{branch.country || 'N/A'}</span>
                          </div>
                        </div>
                        {branch.phone && branch.phone !== 'Not found' && (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-1">
                              <Phone className="w-3 h-3 text-gray-500" />
                              <span className="text-gray-900">{branch.phone}</span>
                            </div>
                            <CopyButton text={branch.phone} fieldName={`Branch ${idx + 1} Phone`} />
                          </div>
                        )}
                        {branch.manager && branch.manager !== 'Not found' && (
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-gray-600">Manager:</span> <span className="text-gray-900 font-medium">{branch.manager}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sources Section (Full Width) */}
            {company.sources && Array.isArray(company.sources) && company.sources.length > 0 && (
              <div className="mt-6">
                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center space-x-2">
                  <ExternalLink className="w-4 h-4 text-purple-600" />
                  <span>Information Sources</span>
                </h4>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <div className="space-y-2">
                    {company.sources.map((source, idx) => (
                      <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-200 last:border-b-0">
                        <div className="flex-1">
                          <a 
                            href={source.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center space-x-1"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>{source.title || `Source ${idx + 1}`}</span>
                          </a>
                          <p className="text-xs text-gray-500 mt-0.5">{source.url}</p>
                        </div>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          source.reliability === 'high' 
                            ? 'bg-green-100 text-green-800' 
                            : source.reliability === 'medium'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {source.reliability || 'unknown'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Research Metadata */}
            <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="text-xs text-gray-500 space-y-1">
                <div className="flex items-center justify-between">
                  <span><span className="font-medium">Researched by:</span> {company.searched_by}</span>
                  <span><span className="font-medium">Model:</span> {company.model_used || 'N/A'}</span>
                </div>
                <p>
                  <span className="font-medium">Researched at:</span> {new Date(company.searched_at).toLocaleString()}
                </p>
                <p className="text-yellow-600 font-medium mt-2 flex items-center space-x-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>This information is not saved to the database. Copy the fields you need before closing.</span>
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 flex justify-end">
            <button
              onClick={onClose}
              className="px-5 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyDetailsModal;