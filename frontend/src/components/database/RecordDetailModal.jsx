import { X, ExternalLink, Mail, Phone, MapPin, Globe } from 'lucide-react';
import { useRecordDetail } from '../../hooks/useDatabase';
import LoadingSpinner from '../LoadingSpinner';

const RecordDetailModal = ({ factoryId, onClose, isGuest }) => {
  const { data: record, isLoading } = useRecordDetail(factoryId);

  if (!factoryId) return null;

  const renderField = (label, value) => {
    if (!value || (isGuest && (label.includes('Contact') || label.includes('Email') || label.includes('Phone')))) {
      return null;
    }

    return (
      <div className="py-3 border-b">
        <dt className="text-sm font-medium text-gray-500 mb-1">{label}</dt>
        <dd className="text-sm text-gray-900">{isGuest ? '████████' : value}</dd>
      </div>
    );
  };

  const renderBooleanField = (label, value) => {
    if (!value) return null;
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 mr-2 mb-2">
        {label}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 text-white px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">
              {isGuest ? 'Company Details (Limited)' : record?.company_name || 'Company Details'}
            </h2>
            <p className="text-blue-100 text-sm mt-1">
              {record?.get_category_display || record?.category}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 80px)' }}>
          {isLoading ? (
            <div className="p-8">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="p-6 space-y-6">
              {/* Guest Warning */}
              {isGuest && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    <strong>Limited Preview:</strong> Contact information is hidden. Upgrade to view full details.
                  </p>
                </div>
              )}

              {/* Company Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-blue-600" />
                  Company Information
                </h3>
                <dl className="divide-y divide-gray-200">
                  {renderField('Company Name', record?.company_name)}
                  {renderField('Address Line 1', record?.address_1)}
                  {renderField('Address Line 2', record?.address_2)}
                  {renderField('Address Line 3', record?.address_3)}
                  {renderField('Address Line 4', record?.address_4)}
                  {renderField('Region', record?.region)}
                  {renderField('Country', record?.country)}
                  {renderField('Geographical Coverage', record?.geographical_coverage)}
                  {renderField('Parent Company', record?.parent_company)}
                  {renderField('Accreditation', record?.accreditation)}
                </dl>
              </div>

              {/* Contact Information */}
              {!isGuest && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Phone className="w-5 h-5 text-blue-600" />
                    Contact Information
                  </h3>
                  <dl className="divide-y divide-gray-200">
                    {renderField('Phone Number', record?.phone_number)}
                    {renderField('Email', record?.company_email)}

                    {!isGuest && record?.website && (
                      <div className="py-3 border-b">
                        <dt className="text-sm font-medium text-gray-500 mb-1">Website</dt>
                        <dd className="text-sm">

                            href={record.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700 flex items-center gap-1"
                          >
                            {record.website}
                            <ExternalLink className="w-4 h-4" />

                        </dd>
                      </div>
                    )}
                  </dl>
                </div>
              )}

              {/* Contact Persons */}
              {!isGuest && (record?.surname_1 || record?.surname_2 || record?.surname_3 || record?.surname_4) && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Persons</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map(num => {
                      const surname = record?.[`surname_${num}`];
                      if (!surname) return null;
                      return (
                        <div key={num} className="border rounded-lg p-4">
                          <p className="font-medium text-gray-900">
                            {record?.[`title_${num}`]} {record?.[`initials_${num}`]} {surname}
                          </p>
                          <p className="text-sm text-gray-600">{record?.[`position_${num}`]}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Materials */}
              {record && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Materials & Polymers</h3>
                  <div className="flex flex-wrap gap-2">
                    {record.pvc && renderBooleanField('PVC', true)}
                    {record.hdpe && renderBooleanField('HDPE', true)}
                    {record.ldpe && renderBooleanField('LDPE', true)}
                    {record.lldpe && renderBooleanField('LLDPE', true)}
                    {record.pp && renderBooleanField('PP', true)}
                    {record.abs && renderBooleanField('ABS', true)}
                    {record.pa && renderBooleanField('PA', true)}
                    {record.pet && renderBooleanField('PET', true)}
                    {record.pc && renderBooleanField('PC', true)}
                    {record.pmma && renderBooleanField('PMMA', true)}
                    {record.ps && renderBooleanField('PS', true)}
                    {record.san && renderBooleanField('SAN', true)}
                    {record.pom && renderBooleanField('POM', true)}
                    {record.pbt && renderBooleanField('PBT', true)}
                    {record.bioresins && renderBooleanField('Bioresins', true)}
                  </div>
                  {record.main_materials && (
                    <p className="mt-3 text-sm text-gray-600">
                      <strong>Main Materials:</strong> {record.main_materials}
                    </p>
                  )}
                </div>
              )}

              {/* Applications */}
              {record && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Applications & Markets</h3>
                  <div className="flex flex-wrap gap-2">
                    {record.automotive && renderBooleanField('Automotive', true)}
                    {record.medical && renderBooleanField('Medical', true)}
                    {record.packaging && renderBooleanField('Packaging', true)}
                    {record.building && renderBooleanField('Building', true)}
                    {record.electrical && renderBooleanField('Electrical', true)}
                    {record.food_drink && renderBooleanField('Food & Drink', true)}
                    {record.houseware && renderBooleanField('Houseware', true)}
                    {record.toys && renderBooleanField('Toys', true)}
                    {record.sport_leisure && renderBooleanField('Sport & Leisure', true)}
                  </div>
                  {record.main_applications && (
                    <p className="mt-3 text-sm text-gray-600">
                      <strong>Main Applications:</strong> {record.main_applications}
                    </p>
                  )}
                </div>
              )}

              {/* Services */}
              {record && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Services</h3>
                  <div className="flex flex-wrap gap-2">
                    {record.tool_design && renderBooleanField('Tool Design', true)}
                    {record.tool_manufacture && renderBooleanField('Tool Manufacture', true)}
                    {record.printing && renderBooleanField('Printing', true)}
                    {record.welding && renderBooleanField('Welding', true)}
                    {record.assembly && renderBooleanField('Assembly', true)}
                    {record.clean_room && renderBooleanField('Clean Room', true)}
                    {record.just_in_time && renderBooleanField('Just in Time', true)}
                    {record.recycling && renderBooleanField('Recycling', true)}
                  </div>
                </div>
              )}

              {/* Technical Details */}
              {record && (record.number_of_machines || record.machinery_brand) && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Technical Details</h3>
                  <dl className="divide-y divide-gray-200">
                    {renderField('Number of Machines', record.number_of_machines)}
                    {renderField('Machinery Brand', record.machinery_brand)}
                    {renderField('Minimum Lock (tonnes)', record.minimal_lock_tonnes)}
                    {renderField('Maximum Lock (tonnes)', record.maximum_lock_tonnes)}
                    {renderField('Minimum Shot (grammes)', record.minimum_shot_grammes)}
                    {renderField('Maximum Shot (grammes)', record.maximum_shot_grammes)}
                  </dl>
                </div>
              )}

              {/* Last Updated */}
              <div className="text-sm text-gray-500 pt-4 border-t">
                Last updated: {record?.last_updated ? new Date(record.last_updated).toLocaleString() : 'N/A'}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t flex justify-end gap-3">
          {isGuest && (
            <button className="btn-primary">
              Upgrade to View Full Details
            </button>
          )}
          <button onClick={onClose} className="btn-secondary">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default RecordDetailModal;