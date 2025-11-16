import * as XLSX from 'xlsx';

/**
 * Export records to Excel with proper formatting and optional watermark
 * @param {Array} records - Array of record objects to export
 * @param {Object} options - Export options
 * @param {string} options.filename - Name of the exported file
 * @param {boolean} options.isGuest - Whether the user is a guest (adds watermark)
 * @param {string} options.category - Category being exported
 * @param {Object} options.filters - Applied filters (for metadata)
 * @param {string} options.userEmail - User's email for watermark
 */
export const exportToExcel = (records, options = {}) => {
  const {
    filename = 'zeugma_export',
    isGuest = false,
    category = 'ALL',
    filters = {},
    userEmail = 'guest@zeugmaresearch.com'
  } = options;

  // Create a new workbook
  const workbook = XLSX.utils.book_new();

  // Add metadata to workbook properties
  workbook.Props = {
    Title: 'Zeugma Research Database Export',
    Subject: `${category} Manufacturers`,
    Author: 'Zeugma Research',
    Company: 'Zeugma Research',
    CreatedDate: new Date()
  };

  // Prepare main data sheet
  const mainSheetData = prepareMainSheet(records, isGuest);
  const mainWorksheet = XLSX.utils.json_to_sheet(mainSheetData);

  // Apply column widths for better readability
  mainWorksheet['!cols'] = [
    { wch: 30 }, // Company Name
    { wch: 20 }, // Category
    { wch: 15 }, // Country
    { wch: 15 }, // Region
    { wch: 20 }, // Phone
    { wch: 30 }, // Email
    { wch: 40 }, // Website
    { wch: 25 }, // Contact Person
    { wch: 20 }, // Position
    { wch: 12 }, // Last Updated
  ];

  // Add the main sheet
  XLSX.utils.book_append_sheet(workbook, mainWorksheet, 'Companies');

  // Add materials summary sheet
  if (!isGuest && records.length > 0) {
    const materialsSheet = prepareMaterialsSheet(records);
    XLSX.utils.book_append_sheet(workbook, materialsSheet, 'Materials Summary');
  }

  // Add metadata/info sheet
  const infoSheet = prepareInfoSheet(records, category, filters, userEmail, isGuest);
  XLSX.utils.book_append_sheet(workbook, infoSheet, 'Export Info');

  // Add watermark sheet for guest users
  if (isGuest) {
    const watermarkSheet = prepareWatermarkSheet(userEmail);
    XLSX.utils.book_append_sheet(workbook, watermarkSheet, 'READ ME - TRIAL VERSION');
  }

  // Generate filename with timestamp
  const timestamp = new Date().toISOString().split('T')[0];
  const finalFilename = `${filename}_${category}_${timestamp}.xlsx`;

  // Write and download the file
  XLSX.writeFile(workbook, finalFilename);

  return {
    success: true,
    filename: finalFilename,
    recordCount: records.length
  };
};

/**
 * Prepare main data sheet with company information
 */
const prepareMainSheet = (records, isGuest) => {
    try {
      return records.map(record => {
        const data = {
          'Company Name': isGuest ? 'HIDDEN - UPGRADE REQUIRED' : record.company_name,
          'Category': record.get_category_display || record.category,
          'Country': record.country || '',
          'Region': record.region || '',
          'Address 1': isGuest ? 'HIDDEN' : record.address_1 || '',
          'Address 2': isGuest ? 'HIDDEN' : record.address_2 || '',
          'Phone': isGuest ? 'HIDDEN' : record.phone_number || '',
          'Email': isGuest ? 'HIDDEN' : record.company_email || '',
          'Website': isGuest ? 'HIDDEN' : record.website || '',
          'Last Updated': record.last_updated ? new Date(record.last_updated).toLocaleDateString() : ''
        };

        // Add contact persons if not guest
        if (!isGuest) {
          if (record.surname_1) {
            data['Contact 1'] = `${record.title_1 || ''} ${record.initials_1 || ''} ${record.surname_1}`.trim();
            data['Position 1'] = record.position_1 || '';
          }
          if (record.surname_2) {
            data['Contact 2'] = `${record.title_2 || ''} ${record.initials_2 || ''} ${record.surname_2}`.trim();
            data['Position 2'] = record.position_2 || '';
          }
        }

        // Add materials (show as Yes/No)
        if (!isGuest) {
          data['PVC'] = record.pvc ? 'Yes' : 'No';
          data['HDPE'] = record.hdpe ? 'Yes' : 'No';
          data['LDPE'] = record.ldpe ? 'Yes' : 'No';
          data['PP'] = record.pp ? 'Yes' : 'No';
          data['ABS'] = record.abs ? 'Yes' : 'No';
          data['PA'] = record.pa ? 'Yes' : 'No';
          data['PET'] = record.pet ? 'Yes' : 'No';
          data['Main Materials'] = record.main_materials || '';
        }

        // Add applications
        if (!isGuest) {
          data['Automotive'] = record.automotive ? 'Yes' : 'No';
          data['Medical'] = record.medical ? 'Yes' : 'No';
          data['Packaging'] = record.packaging ? 'Yes' : 'No';
          data['Building'] = record.building ? 'Yes' : 'No';
          data['Main Applications'] = record.main_applications || '';
        }

        return data;
      });
    } catch (error) {
    console.error('Error preparing sheet:', error);
    throw new Error('Failed to prepare export data');
    }
};

/**
 * Prepare materials summary sheet
 */
const prepareMaterialsSheet = (records) => {
  const materials = [
    'pvc', 'hdpe', 'ldpe', 'lldpe', 'pp', 'abs', 'pa', 'pet', 'pc',
    'pmma', 'ps', 'san', 'pom', 'pbt'
  ];

  const summary = materials.map(material => {
    const count = records.filter(r => r[material] === true).length;
    const percentage = ((count / records.length) * 100).toFixed(1);

    return {
      'Material': material.toUpperCase(),
      'Companies Using': count,
      'Percentage': `${percentage}%`
    };
  }).filter(item => item['Companies Using'] > 0)
    .sort((a, b) => b['Companies Using'] - a['Companies Using']);

  return XLSX.utils.json_to_sheet(summary);
};

/**
 * Prepare info/metadata sheet
 */
const prepareInfoSheet = (records, category, filters, userEmail, isGuest) => {
  const activeFilters = Object.entries(filters)
    .filter(([_, value]) => value !== undefined)
    .map(([key, value]) => `${key}: ${value === true ? 'Include' : 'Exclude'}`)
    .join(', ') || 'None';

  const countries = [...new Set(records.map(r => r.country))].filter(Boolean);

  const info = [
    { 'Field': 'Export Date', 'Value': new Date().toLocaleString() },
    { 'Field': 'Exported By', 'Value': userEmail },
    { 'Field': 'Category', 'Value': category },
    { 'Field': 'Total Records', 'Value': records.length },
    { 'Field': 'Countries', 'Value': countries.length },
    { 'Field': 'Active Filters', 'Value': activeFilters },
    { 'Field': '', 'Value': '' },
    { 'Field': 'Company', 'Value': 'Zeugma Research' },
    { 'Field': 'Website', 'Value': 'www.zeugmaresearch.com' },
    { 'Field': 'Contact', 'Value': 'info@zeugmaresearch.com' },
    { 'Field': '', 'Value': '' },
    { 'Field': 'Countries Included', 'Value': countries.slice(0, 10).join(', ') + (countries.length > 10 ? '...' : '') },
  ];

  if (isGuest) {
    info.push({ 'Field': '', 'Value': '' });
    info.push({ 'Field': '⚠️ TRIAL VERSION', 'Value': 'This is a limited preview export' });
    info.push({ 'Field': 'Upgrade', 'Value': 'Contact sales@zeugmaresearch.com for full access' });
  }

  return XLSX.utils.json_to_sheet(info);
};

/**
 * Prepare watermark sheet for guest users
 */
const prepareWatermarkSheet = (userEmail) => {
  const watermark = [
    { '': '' },
    { '': '🔒 ZEUGMA RESEARCH - TRIAL VERSION' },
    { '': '' },
    { '': 'This is a LIMITED PREVIEW export with restricted data.' },
    { '': '' },
    { '': '❌ Company names are hidden' },
    { '': '❌ Contact information is hidden' },
    { '': '❌ Detailed specifications are hidden' },
    { '': '❌ Only basic information is included' },
    { '': '' },
    { '': '✅ UPGRADE TO FULL ACCESS:' },
    { '': '' },
    { '': '• View complete company details' },
    { '': '• Access all contact information' },
    { '': '• Export unlimited records' },
    { '': '• Regular database updates' },
    { '': '• Priority support' },
    { '': '' },
    { '': 'Contact: sales@zeugmaresearch.com' },
    { '': 'Website: www.zeugmaresearch.com' },
    { '': '' },
    { '': `Trial export generated for: ${userEmail}` },
    { '': `Date: ${new Date().toLocaleString()}` },
    { '': '' },
    { '': '© 2025 Zeugma Research. All rights reserved.' },
  ];

  const worksheet = XLSX.utils.json_to_sheet(watermark);

  // Make the watermark sheet more prominent
  worksheet['!cols'] = [{ wch: 60 }];

  return worksheet;
};

/**
 * Export selected records only
 */
export const exportSelectedRecords = async (selectedIds, allRecords, options = {}) => {
  const selectedRecords = allRecords.filter(record =>
    selectedIds.has(record.factory_id)
  );

  return exportToExcel(selectedRecords, {
    ...options,
    filename: options.filename || 'zeugma_selected_export'
  });
};

/**
 * Export with advanced options and custom fields
 */
export const exportWithCustomFields = (records, fields, options = {}) => {
  const customData = records.map(record => {
    const row = {};
    fields.forEach(field => {
      if (typeof field === 'string') {
        row[field] = record[field];
      } else if (field.key && field.label) {
        row[field.label] = record[field.key];
      }
    });
    return row;
  });

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(customData);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Custom Export');

  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `${options.filename || 'custom_export'}_${timestamp}.xlsx`;

  XLSX.writeFile(workbook, filename);

  return { success: true, filename, recordCount: records.length };
};

/**
 * Quick export for staff - full data, no restrictions
 */
export const quickStaffExport = (records, category) => {
  return exportToExcel(records, {
    filename: `zeugma_staff_export_${category.toLowerCase()}`,
    isGuest: false,
    category,
    filters: {},
    userEmail: 'staff@zeugmaresearch.com'
  });
};

export default {
  exportToExcel,
  exportSelectedRecords,
  exportWithCustomFields,
  quickStaffExport
};