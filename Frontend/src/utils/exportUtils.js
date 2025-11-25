import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';

/**
 * Export data to CSV format
 * @param {Array} data - Array of objects to export
 * @param {string} filename - Name of the file (without extension)
 * @param {Array} columns - Array of column definitions with header and accessor
 */
export const exportToCSV = (data, filename = 'export', columns = []) => {
  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }

  // If columns are provided, use them to format the data
  let csvData = data;
  if (columns.length > 0) {
    csvData = data.map(row => {
      const formattedRow = {};
      columns.forEach(col => {
        if (col.accessor) {
          formattedRow[col.header] = row[col.accessor] || '';
        } else if (col.render) {
          // For complex render functions, we'll extract the text content
          formattedRow[col.header] = extractTextFromRender(col.render(row), row);
        }
      });
      return formattedRow;
    });
  }

  // Convert to CSV
  const csvContent = convertToCSV(csvData);
  
  // Create and download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  saveAs(blob, `${filename}.csv`);
};

/**
 * Export data to Excel format with styled headers
 * @param {Array} data - Array of objects to export
 * @param {string} filename - Name of the file (without extension)
 * @param {Array} columns - Array of column definitions with header and accessor
 */
export const exportToExcel = (data, filename = 'export', columns = []) => {
  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }

  // If columns are provided, use them to format the data
  let excelData = data;
  if (columns.length > 0) {
    excelData = data.map(row => {
      const formattedRow = {};
      columns.forEach(col => {
        if (col.accessor) {
          formattedRow[col.header] = row[col.accessor] || '';
        } else if (col.render) {
          // For complex render functions, we'll extract the text content
          formattedRow[col.header] = extractTextFromRender(col.render(row), row);
        }
      });
      return formattedRow;
    });
  }

  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(excelData);
  
  // Define header styles
  const headerStyle = {
    font: {
      bold: true,
      color: { rgb: "FFFFFF" },
      size: 12
    },
    fill: {
      fgColor: { rgb: "2E86AB" } // Professional blue color
    },
    alignment: {
      horizontal: "center",
      vertical: "center"
    },
    border: {
      top: { style: "thin", color: { rgb: "1E5F8C" } },
      bottom: { style: "thin", color: { rgb: "1E5F8C" } },
      left: { style: "thin", color: { rgb: "1E5F8C" } },
      right: { style: "thin", color: { rgb: "1E5F8C" } }
    }
  };

  // Define data cell styles
  const dataStyle = {
    font: {
      size: 11
    },
    alignment: {
      vertical: "center"
    },
    border: {
      top: { style: "thin", color: { rgb: "E0E0E0" } },
      bottom: { style: "thin", color: { rgb: "E0E0E0" } },
      left: { style: "thin", color: { rgb: "E0E0E0" } },
      right: { style: "thin", color: { rgb: "E0E0E0" } }
    }
  };

  // Apply styles to headers (first row)
  const range = XLSX.utils.decode_range(ws['!ref']);
  
  // Ensure all header cells exist and are styled
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
    
    // Create cell if it doesn't exist
    if (!ws[cellAddress]) {
      ws[cellAddress] = { v: '', t: 's' };
    }
    
    // Apply header styling
    ws[cellAddress].s = headerStyle;
  }

  // Apply styles to data rows
  for (let row = range.s.r + 1; row <= range.e.r; row++) {
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      if (!ws[cellAddress]) continue;
      
      ws[cellAddress].s = dataStyle;
    }
  }

  // Set column widths for better readability
  const colWidths = [];
  for (let col = range.s.c; col <= range.e.c; col++) {
    const header = excelData[0] ? Object.keys(excelData[0])[col] : '';
    // Set width based on header length and content
    let width = Math.max(header.length * 1.2, 12);
    if (header.includes('Address') || header.includes('Description')) {
      width = Math.max(width, 25);
    } else if (header.includes('Date') || header.includes('Time')) {
      width = Math.max(width, 18);
    } else if (header.includes('Income') || header.includes('Amount')) {
      width = Math.max(width, 15);
    }
    colWidths.push({ wch: Math.min(width, 50) }); // Cap at 50 characters
  }
  ws['!cols'] = colWidths;

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Patients');
  
  // Generate and download file
  XLSX.writeFile(wb, `${filename}.xlsx`);
};

/**
 * Convert array of objects to CSV string
 * @param {Array} data - Array of objects
 * @returns {string} CSV string
 */
const convertToCSV = (data) => {
  if (!data || data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const csvRows = [];
  
  // Add headers
  csvRows.push(headers.join(','));
  
  // Add data rows
  data.forEach(row => {
    const values = headers.map(header => {
      const value = row[header];
      // Escape commas and quotes in CSV
      if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value || '';
    });
    csvRows.push(values.join(','));
  });
  
  return csvRows.join('\n');
};

/**
 * Extract text content from React render functions for export
 * @param {*} renderResult - Result from render function
 * @param {Object} row - Original row data
 * @returns {string} Extracted text
 */
const extractTextFromRender = (renderResult, row) => {
  if (typeof renderResult === 'string') {
    return renderResult;
  }
  
  if (typeof renderResult === 'number') {
    return renderResult.toString();
  }
  
  // For complex objects, try to extract meaningful text
  if (renderResult && typeof renderResult === 'object') {
    // If it has a textContent property
    if (renderResult.textContent) {
      return renderResult.textContent;
    }
    
    // If it's an array, join the text content
    if (Array.isArray(renderResult)) {
      return renderResult.map(item => 
        typeof item === 'string' ? item : 
        (item?.props?.children || '').toString()
      ).join(' ');
    }
    
    // If it has props.children, extract text
    if (renderResult.props && renderResult.props.children) {
      return extractTextFromChildren(renderResult.props.children);
    }
  }
  
  return '';
};

/**
 * Extract text from React children
 * @param {*} children - React children
 * @returns {string} Extracted text
 */
const extractTextFromChildren = (children) => {
  if (typeof children === 'string') {
    return children;
  }
  
  if (typeof children === 'number') {
    return children.toString();
  }
  
  if (Array.isArray(children)) {
    return children.map(child => extractTextFromChildren(child)).join(' ');
  }
  
  if (children && typeof children === 'object' && children.props) {
    return extractTextFromChildren(children.props.children);
  }
  
  return '';
};

/**
 * Format patient data for export with proper column headers
 * @param {Array} patients - Array of patient objects
 * @returns {Array} Formatted data for export
 */
export const formatPatientsForExport = (patients) => {
  return patients.map(patient => ({
    // === IDENTIFICATION ===
    'Patient ID': patient.id || 'N/A',
    'CR No': patient.cr_no || 'N/A',
    'PSY No': patient.psy_no || 'N/A',
    'ADL No': patient.adl_no || 'N/A',
    'Special Clinic No': patient.special_clinic_no || 'N/A',
    
    // === BASIC INFORMATION ===
    'Patient Name': patient.name || 'N/A',
    'Sex': patient.sex || 'N/A',
    'Actual Age': (patient.age !== null && patient.age !== undefined) ? `${patient.age} years` : 'N/A',
    'Age Group': patient.age_group || 'N/A',
    'Marital Status': patient.marital_status || 'N/A',
    'Year of Marriage': patient.year_of_marriage || 'N/A',
    'No of Children': patient.no_of_children || 'N/A',
    'No of Male Children': patient.no_of_children_male || 'N/A',
    'No of Female Children': patient.no_of_children_female || 'N/A',
    
    // === CONTACT & FAMILY ===
    'Contact Number': patient.contact_number || 'N/A',
    'Head of Family Name': patient.head_name || 'N/A',
    'Head of Family Age': patient.head_age || 'N/A',
    'Head Relationship': patient.head_relationship || 'N/A',
    'Head Education': patient.head_education || 'N/A',
    'Head Occupation': patient.head_occupation || 'N/A',
    'Head Income': (patient.head_income !== null && patient.head_income !== undefined) ? `₹${patient.head_income}` : 'N/A',
    
    // === OCCUPATION & EDUCATION ===
    'Occupation': patient.occupation || 'N/A',
    'Actual Occupation': patient.actual_occupation || 'N/A',
    'Education Level': patient.education_level || 'N/A',
    'Years of Education': patient.completed_years_of_education || 'N/A',
    'Patient Income': (patient.patient_income !== null && patient.patient_income !== undefined) ? `₹${patient.patient_income}` : 'N/A',
    'Family Income': (patient.family_income !== null && patient.family_income !== undefined) ? `₹${patient.family_income}` : 'N/A',
    
    // === FAMILY & SOCIAL ===
    'Religion': patient.religion || 'N/A',
    'Family Type': patient.family_type || 'N/A',
    'Locality': patient.locality || 'N/A',
    'School/College/Office': patient.school_college_office || 'N/A',
    
    // === REFERRAL & MOBILITY ===
    'Distance from Hospital': patient.distance_from_hospital || 'N/A',
    'Mobility': patient.mobility || 'N/A',
    'Referred By': patient.referred_by || 'N/A',
    'Exact Source': patient.exact_source || 'N/A',
    'Seen in Walk-in On': patient.seen_in_walk_in_on || 'N/A',
    'Worked Up On': patient.worked_up_on || 'N/A',
    
    // === ADDRESS INFORMATION ===
    // Quick Entry Address
    'Address Line 1': patient.address_line || 'N/A',
    'Address Line 2': patient.address_line_2 || 'N/A',
    'City/Town/Village': patient.city || 'N/A',
    'District': patient.district || 'N/A',
    'State': patient.state || 'N/A',
    'Pin Code': patient.pin_code || 'N/A',
    'Country': patient.country || 'N/A',
    
    // Present Address
    'Present Address Line 1': patient.present_address_line_1 || 'N/A',
    'Present Address Line 2': patient.present_address_line_2 || 'N/A',
    'Present City/Town/Village': patient.present_city_town_village || 'N/A',
    'Present District': patient.present_district || 'N/A',
    'Present State': patient.present_state || 'N/A',
    'Present Pin Code': patient.present_pin_code || 'N/A',
    'Present Country': patient.present_country || 'N/A',
    
    // Permanent Address
    'Permanent Address Line 1': patient.permanent_address_line_1 || 'N/A',
    'Permanent Address Line 2': patient.permanent_address_line_2 || 'N/A',
    'Permanent City/Town/Village': patient.permanent_city_town_village || 'N/A',
    'Permanent District': patient.permanent_district || 'N/A',
    'Permanent State': patient.permanent_state || 'N/A',
    'Permanent Pin Code': patient.permanent_pin_code || 'N/A',
    'Permanent Country': patient.permanent_country || 'N/A',
    
    // Legacy Address Fields
    'Present Address (Legacy)': patient.present_address || 'N/A',
    'Permanent Address (Legacy)': patient.permanent_address || 'N/A',
    'Local Address': patient.local_address || 'N/A',
    
    // === REGISTRATION DETAILS ===
    'Department': patient.department || 'N/A',
    'Unit Constituency': patient.unit_consit || 'N/A',
    'Room No': patient.room_no || 'N/A',
    'Serial No': patient.serial_no || 'N/A',
    'File No': patient.file_no || 'N/A',
    'Unit Days': patient.unit_days || 'N/A',
    'Category': patient.category || 'N/A',
    
    // === ASSIGNMENT & STATUS ===
    'Assigned Room': patient.assigned_room || 'N/A',
    'Assigned Doctor ID': patient.assigned_doctor_id || 'N/A',
    'Assigned Doctor Name': patient.assigned_doctor_name || 'Unassigned',
    'Assigned Doctor Role': patient.assigned_doctor_role || 'N/A',
    'Last Assigned Date': patient.last_assigned_date ? new Date(patient.last_assigned_date).toLocaleDateString() : 'N/A',
    
    // === FILE STATUS ===
    'Has ADL File': patient.has_adl_file ? 'Yes' : 'No',
    'File Status': patient.file_status || 'N/A',
    'Case Complexity': patient.case_complexity || 'simple',
    
    // === RECORD KEEPING ===
    'Filled By': patient.filled_by || 'N/A',
    'Filled By Name': patient.filled_by_name || 'N/A',
    'Created At': patient.created_at ? new Date(patient.created_at).toLocaleString() : 'N/A',
    'Updated At': patient.updated_at ? new Date(patient.updated_at).toLocaleString() : 'N/A'
  }));
};

/**
 * Show export options modal or dropdown
 * @param {Array} data - Data to export
 * @param {string} baseFilename - Base filename for export
 * @param {Array} columns - Column definitions
 */
export const showExportOptions = (data, baseFilename = 'patients', columns = []) => {
  // Create a simple modal or use browser confirm for now
  const format = window.confirm('Choose export format:\nOK = Excel (.xlsx)\nCancel = CSV (.csv)');
  
  if (format) {
    exportToExcel(data, baseFilename, columns);
  } else {
    exportToCSV(data, baseFilename, columns);
  }
};

/**
 * Export data based on format
 * @param {Array} data - Data to export
 * @param {string} filename - Filename for export
 * @param {string} format - Export format ('excel' or 'csv')
 * @param {string} colorTheme - Color theme for Excel headers ('blue', 'green', 'purple', 'orange', 'red')
 */
export const exportData = (data, filename, format = 'excel', colorTheme = 'blue') => {
  if (format === 'excel') {
    exportToExcelWithTheme(data, filename, colorTheme);
  } else {
    exportToCSV(data, filename);
  }
};

/**
 * Export data to Excel format with customizable color themes
 * @param {Array} data - Array of objects to export
 * @param {string} filename - Name of the file (without extension)
 * @param {string} colorTheme - Color theme for headers
 */
export const exportToExcelWithTheme = (data, filename = 'export', colorTheme = 'blue') => {
  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }

  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);
  
  // Define color themes
  const themes = {
    blue: {
      headerBg: "2E86AB",
      headerBorder: "1E5F8C",
      headerText: "FFFFFF"
    },
    green: {
      headerBg: "28A745",
      headerBorder: "1E7E34",
      headerText: "FFFFFF"
    },
    purple: {
      headerBg: "6F42C1",
      headerBorder: "5A32A3",
      headerText: "FFFFFF"
    },
    orange: {
      headerBg: "FD7E14",
      headerBorder: "E55A00",
      headerText: "FFFFFF"
    },
    red: {
      headerBg: "DC3545",
      headerBorder: "C82333",
      headerText: "FFFFFF"
    },
    teal: {
      headerBg: "20C997",
      headerBorder: "1A9F7A",
      headerText: "FFFFFF"
    },
    indigo: {
      headerBg: "6610F2",
      headerBorder: "520DC2",
      headerText: "FFFFFF"
    }
  };

  const theme = themes[colorTheme] || themes.blue;

  // Define header styles
  const headerStyle = {
    font: {
      bold: true,
      color: { rgb: theme.headerText },
      size: 12
    },
    fill: {
      fgColor: { rgb: theme.headerBg }
    },
    alignment: {
      horizontal: "center",
      vertical: "center"
    },
    border: {
      top: { style: "thin", color: { rgb: theme.headerBorder } },
      bottom: { style: "thin", color: { rgb: theme.headerBorder } },
      left: { style: "thin", color: { rgb: theme.headerBorder } },
      right: { style: "thin", color: { rgb: theme.headerBorder } }
    }
  };

  // Define data cell styles with alternating row colors
  const dataStyle = {
    font: {
      size: 11
    },
    alignment: {
      vertical: "center"
    },
    border: {
      top: { style: "thin", color: { rgb: "E0E0E0" } },
      bottom: { style: "thin", color: { rgb: "E0E0E0" } },
      left: { style: "thin", color: { rgb: "E0E0E0" } },
      right: { style: "thin", color: { rgb: "E0E0E0" } }
    }
  };

  const alternateRowStyle = {
    ...dataStyle,
    fill: {
      fgColor: { rgb: "F8F9FA" }
    }
  };

  // Apply styles to headers (first row)
  const range = XLSX.utils.decode_range(ws['!ref']);
  
  // Ensure all header cells exist and are styled
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
    
    // Create cell if it doesn't exist
    if (!ws[cellAddress]) {
      ws[cellAddress] = { v: '', t: 's' };
    }
    
    // Apply header styling
    ws[cellAddress].s = headerStyle;
  }

  // Apply styles to data rows with alternating colors
  for (let row = range.s.r + 1; row <= range.e.r; row++) {
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      if (!ws[cellAddress]) continue;
      
      // Alternate row colors for better readability
      const isEvenRow = (row - 1) % 2 === 0;
      ws[cellAddress].s = isEvenRow ? dataStyle : alternateRowStyle;
    }
  }

  // Set column widths for better readability
  const colWidths = [];
  for (let col = range.s.c; col <= range.e.c; col++) {
    const header = data[0] ? Object.keys(data[0])[col] : '';
    // Set width based on header length and content
    let width = Math.max(header.length * 1.2, 12);
    if (header.includes('Address') || header.includes('Description')) {
      width = Math.max(width, 25);
    } else if (header.includes('Date') || header.includes('Time')) {
      width = Math.max(width, 18);
    } else if (header.includes('Income') || header.includes('Amount')) {
      width = Math.max(width, 15);
    } else if (header.includes('ID') || header.includes('No')) {
      width = Math.max(width, 12);
    }
    colWidths.push({ wch: Math.min(width, 50) }); // Cap at 50 characters
  }
  ws['!cols'] = colWidths;

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Patients');
  
  // Generate and download file
  XLSX.writeFile(wb, `${filename}.xlsx`);
};

/**
 * Format patient data for export with selected fields only
 * @param {Array} patients - Array of patient objects
 * @param {Array} selectedFields - Array of field keys to include
 * @returns {Array} Formatted data for export
 */
export const formatPatientsForExportSelective = (patients, selectedFields = []) => {
  // If no fields selected, export all
  if (selectedFields.length === 0) {
    return formatPatientsForExport(patients);
  }

  // Field mapping for selective export
  const fieldMapping = {
    // Identification
    'id': 'Patient ID',
    'cr_no': 'CR No',
    'psy_no': 'PSY No',
    'adl_no': 'ADL No',
    'special_clinic_no': 'Special Clinic No',
    
    // Basic Information
    'name': 'Patient Name',
    'sex': 'Sex',
    'age': 'Actual Age',
    'age_group': 'Age Group',
    'marital_status': 'Marital Status',
    'year_of_marriage': 'Year of Marriage',
    'no_of_children': 'No of Children',
    'no_of_children_male': 'No of Male Children',
    'no_of_children_female': 'No of Female Children',
    
    // Contact & Family
    'contact_number': 'Contact Number',
    'head_name': 'Head of Family Name',
    'head_age': 'Head of Family Age',
    'head_relationship': 'Head Relationship',
    'head_education': 'Head Education',
    'head_occupation': 'Head Occupation',
    'head_income': 'Head Income',
    
    // Occupation & Education
    'occupation': 'Occupation',
    'actual_occupation': 'Actual Occupation',
    'education_level': 'Education Level',
    'completed_years_of_education': 'Years of Education',
    'patient_income': 'Patient Income',
    'family_income': 'Family Income',
    
    // Family & Social
    'religion': 'Religion',
    'family_type': 'Family Type',
    'locality': 'Locality',
    'school_college_office': 'School/College/Office',
    
    // Referral & Mobility
    'distance_from_hospital': 'Distance from Hospital',
    'mobility': 'Mobility',
    'referred_by': 'Referred By',
    'exact_source': 'Exact Source',
    'seen_in_walk_in_on': 'Seen in Walk-in On',
    'worked_up_on': 'Worked Up On',
    
    // Address Information
    'address_line': 'Address Line 1',
    'address_line_2': 'Address Line 2',
    'city': 'City/Town/Village',
    'district': 'District',
    'state': 'State',
    'pin_code': 'Pin Code',
    'country': 'Country',
    
    // Present Address
    'present_address_line_1': 'Present Address Line 1',
    'present_address_line_2': 'Present Address Line 2',
    'present_city_town_village': 'Present City/Town/Village',
    'present_district': 'Present District',
    'present_state': 'Present State',
    'present_pin_code': 'Present Pin Code',
    'present_country': 'Present Country',
    
    // Permanent Address
    'permanent_address_line_1': 'Permanent Address Line 1',
    'permanent_address_line_2': 'Permanent Address Line 2',
    'permanent_city_town_village': 'Permanent City/Town/Village',
    'permanent_district': 'Permanent District',
    'permanent_state': 'Permanent State',
    'permanent_pin_code': 'Permanent Pin Code',
    'permanent_country': 'Permanent Country',
    
    // Legacy Address Fields
    'present_address': 'Present Address (Legacy)',
    'permanent_address': 'Permanent Address (Legacy)',
    'local_address': 'Local Address',
    
    // Registration Details
    'department': 'Department',
    'unit_consit': 'Unit Constituency',
    'room_no': 'Room No',
    'serial_no': 'Serial No',
    'file_no': 'File No',
    'unit_days': 'Unit Days',
    'category': 'Category',
    
    // Assignment & Status
    'assigned_room': 'Assigned Room',
    'assigned_doctor_id': 'Assigned Doctor ID',
    'assigned_doctor_name': 'Assigned Doctor Name',
    'assigned_doctor_role': 'Assigned Doctor Role',
    'last_assigned_date': 'Last Assigned Date',
    
    // File Status
    'has_adl_file': 'Has ADL File',
    'file_status': 'File Status',
    'case_complexity': 'Case Complexity',
    
    // Record Keeping
    'filled_by': 'Filled By',
    'filled_by_name': 'Filled By Name',
    'created_at': 'Created At',
    'updated_at': 'Updated At'
  };

  return patients.map(patient => {
    const exportData = {};
    
    selectedFields.forEach(field => {
      if (fieldMapping[field]) {
        const value = patient[field];
        
        // Format specific fields
        if (field === 'age' && value !== null && value !== undefined) {
          exportData[fieldMapping[field]] = `${value} years`;
        } else if ((field === 'patient_income' || field === 'family_income' || field === 'head_income') && value !== null && value !== undefined) {
          exportData[fieldMapping[field]] = `₹${value}`;
        } else if (field === 'has_adl_file') {
          exportData[fieldMapping[field]] = value ? 'Yes' : 'No';
        } else if ((field === 'created_at' || field === 'updated_at') && value) {
          exportData[fieldMapping[field]] = new Date(value).toLocaleString();
        } else if (field === 'last_assigned_date' && value) {
          exportData[fieldMapping[field]] = new Date(value).toLocaleDateString();
        } else {
          exportData[fieldMapping[field]] = (value !== null && value !== undefined) ? value : 'N/A';
        }
      }
    });
    
    return exportData;
  });
};

/**
 * Get available export field options
 * @returns {Array} Array of field options with categories
 */
export const getExportFieldOptions = () => {
  return [
    {
      category: 'Identification',
      fields: [
        { key: 'id', label: 'Patient ID' },
        { key: 'cr_no', label: 'CR No' },
        { key: 'psy_no', label: 'PSY No' },
        { key: 'adl_no', label: 'ADL No' },
        { key: 'special_clinic_no', label: 'Special Clinic No' }
      ]
    },
    {
      category: 'Basic Information',
      fields: [
        { key: 'name', label: 'Patient Name' },
        { key: 'sex', label: 'Sex' },
        { key: 'age', label: 'Actual Age' },
        { key: 'age_group', label: 'Age Group' },
        { key: 'marital_status', label: 'Marital Status' },
        { key: 'year_of_marriage', label: 'Year of Marriage' },
        { key: 'no_of_children', label: 'No of Children' },
        { key: 'no_of_children_male', label: 'No of Male Children' },
        { key: 'no_of_children_female', label: 'No of Female Children' }
      ]
    },
    {
      category: 'Contact & Family',
      fields: [
        { key: 'contact_number', label: 'Contact Number' },
        { key: 'head_name', label: 'Head of Family Name' },
        { key: 'head_age', label: 'Head of Family Age' },
        { key: 'head_relationship', label: 'Head Relationship' },
        { key: 'head_education', label: 'Head Education' },
        { key: 'head_occupation', label: 'Head Occupation' },
        { key: 'head_income', label: 'Head Income' }
      ]
    },
    {
      category: 'Occupation & Education',
      fields: [
        { key: 'occupation', label: 'Occupation' },
        { key: 'actual_occupation', label: 'Actual Occupation' },
        { key: 'education_level', label: 'Education Level' },
        { key: 'completed_years_of_education', label: 'Years of Education' },
        { key: 'patient_income', label: 'Patient Income' },
        { key: 'family_income', label: 'Family Income' }
      ]
    },
    {
      category: 'Assignment & Status',
      fields: [
        { key: 'assigned_room', label: 'Assigned Room' },
        { key: 'assigned_doctor_id', label: 'Assigned Doctor ID' },
        { key: 'assigned_doctor_name', label: 'Assigned Doctor Name' },
        { key: 'assigned_doctor_role', label: 'Assigned Doctor Role' },
        { key: 'last_assigned_date', label: 'Last Assigned Date' },
        { key: 'has_adl_file', label: 'Has ADL File' },
        { key: 'file_status', label: 'File Status' },
        { key: 'case_complexity', label: 'Case Complexity' }
      ]
    },
    {
      category: 'Address Information',
      fields: [
        { key: 'address_line', label: 'Address Line 1' },
        { key: 'city', label: 'City/Town/Village' },
        { key: 'district', label: 'District' },
        { key: 'state', label: 'State' },
        { key: 'pin_code', label: 'Pin Code' },
        { key: 'country', label: 'Country' },
        { key: 'present_address_line_1', label: 'Present Address Line 1' },
        { key: 'present_city_town_village', label: 'Present City/Town/Village' },
        { key: 'present_district', label: 'Present District' },
        { key: 'present_state', label: 'Present State' },
        { key: 'present_pin_code', label: 'Present Pin Code' },
        { key: 'present_country', label: 'Present Country' }
      ]
    },
    {
      category: 'Record Keeping',
      fields: [
        { key: 'filled_by', label: 'Filled By' },
        { key: 'filled_by_name', label: 'Filled By Name' },
        { key: 'created_at', label: 'Created At' },
        { key: 'updated_at', label: 'Updated At' }
      ]
    }
  ];
};
