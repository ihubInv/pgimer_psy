import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { 
  FiPlus, FiSearch, FiTrash2, FiEye,  FiEdit, FiUsers, 
   FiDownload,  FiClock, FiPrinter,
  FiHeart, FiFileText, FiShield, FiTrendingUp
} from 'react-icons/fi';
import { useGetAllPatientsQuery, useDeletePatientMutation, useGetPatientByIdQuery } from '../../features/patients/patientsApiSlice';
import { selectCurrentUser, selectCurrentToken } from '../../features/auth/authSlice';
import { formatPatientsForExport, exportData } from '../../utils/exportUtils';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Input from '../../components/Input';
import Table from '../../components/Table';
import Pagination from '../../components/Pagination';
import Badge from '../../components/Badge';
import { isAdmin, isMWO, isJrSr } from '../../utils/constants';

const PatientsPage = () => {
  const user = useSelector(selectCurrentUser);
  const token = useSelector(selectCurrentToken);
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const limit = 10;

  // Reset page to 1 when search changes
  useEffect(() => {
    setPage(1);
  }, [search]);

  const { data, isLoading, isFetching, refetch, error } = useGetAllPatientsQuery({
    page,
    limit,
    search: search.trim() || undefined // Only include search if it has a value
  }, {
    pollingInterval: 30000, // Auto-refresh every 30 seconds
    refetchOnMountOrArgChange: true,
  });
 
  const [deletePatient] = useDeletePatientMutation();
 

  // Handle view patient details
  const handleView = (row) => {
   
    const patientId = row.id
    //  getPatientId(row);
    
    if (!patientId) {
      toast.error('Invalid patient ID. Unable to view patient details.');
      return;
    }

    // Explicitly set edit=false to ensure view mode and clear any persisted edit state
    navigate(`/patients/${patientId}?edit=false`);
  };

  // Handle edit patient
  const handleEdit = (row) => {
    const patientId = row.id
    // getPatientId(row.id);
    
    if (!patientId) {
      toast.error('Invalid patient ID. Unable to edit patient.');
      return;
    }
    
    navigate(`/patients/${patientId}?edit=true`);
  };

  const handleDelete = async (id) => {
    if (!id) {
      toast.error('Invalid patient ID. Cannot delete patient.');
      return;
    }
  
    // No browser confirm — directly attempt delete
    try {
      await deletePatient(id).unwrap();
      toast.success('Patient and all related records deleted successfully');
  
      // RTK Query will automatically refetch when tags are invalidated
      // But we can also explicitly refetch to ensure immediate update
      refetch();
  
    } catch (err) {
      toast.error(err?.data?.message || err?.message || 'Failed to delete patient');
    }
  };
  

  const handleExport = () => {
    if (!data?.data?.patients || data.data.patients.length === 0) {
      toast.warning('No patient data available to export');
      return;
    }
    
    try {
      // Format all patient data for export
      const formattedData = formatPatientsForExport(data.data.patients);
      
      // Generate filename with current date
      const filename = `patients_export_${new Date().toISOString().split('T')[0]}`;
      
      // Export directly to Excel with blue theme
      exportData(formattedData, filename, 'excel', 'blue');
      toast.success('Excel file downloaded successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export patient data');
    }
  };

  // Handle print patient details
  const handlePrint = async (patientId) => {
    if (!patientId) {
      toast.error('Invalid patient ID. Unable to print patient details.');
      return;
    }

    try {
      toast.info('Loading complete patient data for printing...');
      
      // Fetch all related data in parallel
      const baseUrl = import.meta.env.VITE_API_URL || '/api';
      
      const [patientResponse, clinicalResponse, adlResponse] = await Promise.all([
        fetch(`${baseUrl}/patients/${patientId}`, {
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        }),
        fetch(`${baseUrl}/clinical-proforma/patient/${patientId}`, {
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        }).catch(() => ({ ok: false })), // Gracefully handle if endpoint doesn't exist
        fetch(`${baseUrl}/adl-files/patient/${patientId}`, {
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        }).catch(() => ({ ok: false })), // Gracefully handle if endpoint doesn't exist
      ]);

      if (!patientResponse.ok) {
        throw new Error('Failed to fetch patient details');
      }

      const patientResult = await patientResponse.json();
      const patient = patientResult?.data?.patient;

      if (!patient) {
        toast.error('Patient data not found');
        return;
      }

      // Get clinical proforma data (may be empty array)
      let clinicalProformas = [];
      if (clinicalResponse.ok) {
        try {
          const clinicalResult = await clinicalResponse.json();
          clinicalProformas = clinicalResult?.data?.proformas || clinicalResult?.data || [];
        } catch (e) {
          console.warn('Could not parse clinical proforma data:', e);
        }
      }

      // Get ADL file data (may be empty array)
      let adlFiles = [];
      if (adlResponse.ok) {
        try {
          const adlResult = await adlResponse.json();
          adlFiles = adlResult?.data?.files || adlResult?.data || [];
        } catch (e) {
          console.warn('Could not parse ADL file data:', e);
        }
      }

      // Create print content with all data
      const printContent = generatePrintContent(patient, clinicalProformas, adlFiles);
      
      // Create a new window for printing
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error('Please allow pop-ups to print patient details');
        return;
      }
      
      printWindow.document.write(printContent);
      printWindow.document.close();
      
      // Wait for content to load, then print
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
          toast.success('Print dialog opened');
        }, 250);
      };
    } catch (err) {
      console.error('Print error:', err);
      toast.error(err?.message || 'Failed to print patient details');
    }
  };

  // Generate print-friendly HTML content
  const generatePrintContent = (patient, clinicalProformas = [], adlFiles = []) => {
    const formatValue = (value) => {
      if (value === null || value === undefined || value === '') return 'N/A';
      if (typeof value === 'boolean') return value ? 'Yes' : 'No';
      if (Array.isArray(value)) {
        if (value.length === 0) return 'N/A';
        return JSON.stringify(value, null, 2);
      }
      if (typeof value === 'object') {
        return JSON.stringify(value, null, 2);
      }
      return String(value);
    };
    
    const formatDate = (date) => {
      if (!date) return 'N/A';
      try {
        return new Date(date).toLocaleDateString('en-IN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      } catch {
        return date;
      }
    };

    const formatDateTime = (date) => {
      if (!date) return 'N/A';
      try {
        return new Date(date).toLocaleString('en-IN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      } catch {
        return date;
      }
    };

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Patient Details - ${formatValue(patient.name)}</title>
  <style>
    @page {
      size: A4;
      margin: 15mm;
    }
    * {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      font-family: 'Arial', sans-serif;
      font-size: 11px;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
    }
    .header {
      text-align: center;
      border-bottom: 3px solid #1f2937;
      padding-bottom: 10px;
      margin-bottom: 20px;
    }
    .header h1 {
      margin: 0;
      font-size: 18px;
      color: #1f2937;
    }
    .header h2 {
      margin: 5px 0 0 0;
      font-size: 14px;
      color: #4b5563;
      font-weight: normal;
    }
    .section {
      margin-bottom: 20px;
      page-break-inside: avoid;
    }
    .section-title {
      font-size: 13px;
      font-weight: bold;
      color: #1f2937;
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 5px;
      margin-bottom: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-bottom: 15px;
    }
    .info-item {
      margin-bottom: 8px;
    }
    .info-label {
      font-weight: bold;
      color: #4b5563;
      font-size: 10px;
      margin-bottom: 2px;
    }
    .info-value {
      color: #111827;
      font-size: 11px;
    }
    .full-width {
      grid-column: 1 / -1;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
      font-size: 10px;
    }
    table th, table td {
      border: 1px solid #d1d5db;
      padding: 6px 8px;
      text-align: left;
    }
    table th {
      background-color: #f3f4f6;
      font-weight: bold;
      color: #111827;
    }
    .footer {
      margin-top: 30px;
      padding-top: 15px;
      border-top: 2px solid #e5e7eb;
      text-align: center;
      font-size: 9px;
      color: #6b7280;
    }
    @media print {
      body {
        margin: 0;
        padding: 0;
      }
      .section {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>POSTGRADUATE INSTITUTE OF MEDICAL EDUCATION & RESEARCH</h1>
    <h2>Department of Psychiatry - Patient Details</h2>
  </div>

  <div class="section">
    <div class="section-title">Basic Information</div>
    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">Patient Name</div>
        <div class="info-value">${formatValue(patient.name)}</div>
      </div>
      <div class="info-item">
        <div class="info-label">CR Number</div>
        <div class="info-value">${formatValue(patient.cr_no)}</div>
      </div>
      <div class="info-item">
        <div class="info-label">PSY Number</div>
        <div class="info-value">${formatValue(patient.psy_no)}</div>
      </div>
      ${patient.adl_no ? `
      <div class="info-item">
        <div class="info-label">ADL Number</div>
        <div class="info-value">${formatValue(patient.adl_no)}</div>
      </div>
      ` : ''}
      ${patient.special_clinic_no ? `
      <div class="info-item">
        <div class="info-label">Special Clinic Number</div>
        <div class="info-value">${formatValue(patient.special_clinic_no)}</div>
      </div>
      ` : ''}
      <div class="info-item">
        <div class="info-label">Age</div>
        <div class="info-value">${formatValue(patient.age)} years</div>
      </div>
      <div class="info-item">
        <div class="info-label">Sex</div>
        <div class="info-value">${formatValue(patient.sex)}</div>
      </div>
      ${patient.father_name ? `
      <div class="info-item">
        <div class="info-label">Father's Name</div>
        <div class="info-value">${formatValue(patient.father_name)}</div>
      </div>
      ` : ''}
      <div class="info-item">
        <div class="info-label">Contact Number</div>
        <div class="info-value">${formatValue(patient.contact_number)}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Assigned Doctor</div>
        <div class="info-value">${formatValue(patient.assigned_doctor_name)} (${formatValue(patient.assigned_doctor_role)})</div>
      </div>
      <div class="info-item">
        <div class="info-label">Assigned Room</div>
        <div class="info-value">${formatValue(patient.assigned_room)}</div>
      </div>
      ${patient.category ? `
      <div class="info-item">
        <div class="info-label">Category</div>
        <div class="info-value">${formatValue(patient.category)}</div>
      </div>
      ` : ''}
      ${patient.department ? `
      <div class="info-item">
        <div class="info-label">Department</div>
        <div class="info-value">${formatValue(patient.department)}</div>
      </div>
      ` : ''}
      ${patient.unit_consit ? `
      <div class="info-item">
        <div class="info-label">Unit/Constitution</div>
        <div class="info-value">${formatValue(patient.unit_consit)}</div>
      </div>
      ` : ''}
      ${patient.room_no ? `
      <div class="info-item">
        <div class="info-label">Room Number</div>
        <div class="info-value">${formatValue(patient.room_no)}</div>
      </div>
      ` : ''}
      ${patient.serial_no ? `
      <div class="info-item">
        <div class="info-label">Serial Number</div>
        <div class="info-value">${formatValue(patient.serial_no)}</div>
      </div>
      ` : ''}
      ${patient.file_no ? `
      <div class="info-item">
        <div class="info-label">File Number</div>
        <div class="info-value">${formatValue(patient.file_no)}</div>
      </div>
      ` : ''}
      ${patient.unit_days ? `
      <div class="info-item">
        <div class="info-label">Unit Days</div>
        <div class="info-value">${formatValue(patient.unit_days)}</div>
      </div>
      ` : ''}
    </div>
  </div>

  ${patient.age_group || patient.marital_status || patient.occupation || patient.no_of_children || patient.no_of_children_male || patient.no_of_children_female ? `
  <div class="section">
    <div class="section-title">Personal Information</div>
    <div class="info-grid">
      ${patient.age_group ? `
      <div class="info-item">
        <div class="info-label">Age Group</div>
        <div class="info-value">${formatValue(patient.age_group)}</div>
      </div>
      ` : ''}
      ${patient.marital_status ? `
      <div class="info-item">
        <div class="info-label">Marital Status</div>
        <div class="info-value">${formatValue(patient.marital_status)}</div>
      </div>
      ` : ''}
      ${patient.year_of_marriage ? `
      <div class="info-item">
        <div class="info-label">Year of Marriage</div>
        <div class="info-value">${formatValue(patient.year_of_marriage)}</div>
      </div>
      ` : ''}
      ${patient.no_of_children ? `
      <div class="info-item">
        <div class="info-label">Number of Children</div>
        <div class="info-value">${formatValue(patient.no_of_children)}</div>
      </div>
      ` : ''}
      ${patient.no_of_children_male ? `
      <div class="info-item">
        <div class="info-label">Number of Male Children</div>
        <div class="info-value">${formatValue(patient.no_of_children_male)}</div>
      </div>
      ` : ''}
      ${patient.no_of_children_female ? `
      <div class="info-item">
        <div class="info-label">Number of Female Children</div>
        <div class="info-value">${formatValue(patient.no_of_children_female)}</div>
      </div>
      ` : ''}
      ${patient.occupation ? `
      <div class="info-item">
        <div class="info-label">Occupation</div>
        <div class="info-value">${formatValue(patient.occupation)}</div>
      </div>
      ` : ''}
      ${patient.actual_occupation ? `
      <div class="info-item">
        <div class="info-label">Actual Occupation</div>
        <div class="info-value">${formatValue(patient.actual_occupation)}</div>
      </div>
      ` : ''}
      ${patient.education_level ? `
      <div class="info-item">
        <div class="info-label">Education Level</div>
        <div class="info-value">${formatValue(patient.education_level)}</div>
      </div>
      ` : ''}
      ${patient.completed_years_of_education ? `
      <div class="info-item">
        <div class="info-label">Years of Education</div>
        <div class="info-value">${formatValue(patient.completed_years_of_education)}</div>
      </div>
      ` : ''}
      ${patient.education ? `
      <div class="info-item">
        <div class="info-label">Education</div>
        <div class="info-value">${formatValue(patient.education)}</div>
      </div>
      ` : ''}
    </div>
  </div>
  ` : ''}

  ${patient.present_address || patient.present_address_line_1 || patient.permanent_address || patient.local_address || patient.address_line ? `
  <div class="section">
    <div class="section-title">Address Information</div>
    <div class="info-grid">
      ${patient.present_address ? `
      <div class="info-item full-width">
        <div class="info-label">Present Address</div>
        <div class="info-value">${formatValue(patient.present_address)}</div>
      </div>
      ` : ''}
      ${patient.present_address_line_1 ? `
      <div class="info-item full-width">
        <div class="info-label">Present Address Line 1</div>
        <div class="info-value">${formatValue(patient.present_address_line_1)}</div>
      </div>
      ` : ''}
      ${patient.present_address_line_2 ? `
      <div class="info-item full-width">
        <div class="info-label">Present Address Line 2</div>
        <div class="info-value">${formatValue(patient.present_address_line_2)}</div>
      </div>
      ` : ''}
      ${patient.present_city_town_village ? `
      <div class="info-item">
        <div class="info-label">Present City/Town/Village</div>
        <div class="info-value">${formatValue(patient.present_city_town_village)}</div>
      </div>
      ` : ''}
      ${patient.present_district ? `
      <div class="info-item">
        <div class="info-label">Present District</div>
        <div class="info-value">${formatValue(patient.present_district)}</div>
      </div>
      ` : ''}
      ${patient.present_state ? `
      <div class="info-item">
        <div class="info-label">Present State</div>
        <div class="info-value">${formatValue(patient.present_state)}</div>
      </div>
      ` : ''}
      ${patient.present_pin_code ? `
      <div class="info-item">
        <div class="info-label">Present PIN Code</div>
        <div class="info-value">${formatValue(patient.present_pin_code)}</div>
      </div>
      ` : ''}
      ${patient.present_country ? `
      <div class="info-item">
        <div class="info-label">Present Country</div>
        <div class="info-value">${formatValue(patient.present_country)}</div>
      </div>
      ` : ''}
      ${patient.permanent_address ? `
      <div class="info-item full-width">
        <div class="info-label">Permanent Address</div>
        <div class="info-value">${formatValue(patient.permanent_address)}</div>
      </div>
      ` : ''}
      ${patient.permanent_address_line_1 ? `
      <div class="info-item full-width">
        <div class="info-label">Permanent Address Line 1</div>
        <div class="info-value">${formatValue(patient.permanent_address_line_1)}</div>
      </div>
      ` : ''}
      ${patient.permanent_address_line_2 ? `
      <div class="info-item full-width">
        <div class="info-label">Permanent Address Line 2</div>
        <div class="info-value">${formatValue(patient.permanent_address_line_2)}</div>
      </div>
      ` : ''}
      ${patient.permanent_city_town_village ? `
      <div class="info-item">
        <div class="info-label">Permanent City/Town/Village</div>
        <div class="info-value">${formatValue(patient.permanent_city_town_village)}</div>
      </div>
      ` : ''}
      ${patient.permanent_district ? `
      <div class="info-item">
        <div class="info-label">Permanent District</div>
        <div class="info-value">${formatValue(patient.permanent_district)}</div>
      </div>
      ` : ''}
      ${patient.permanent_state ? `
      <div class="info-item">
        <div class="info-label">Permanent State</div>
        <div class="info-value">${formatValue(patient.permanent_state)}</div>
      </div>
      ` : ''}
      ${patient.permanent_pin_code ? `
      <div class="info-item">
        <div class="info-label">Permanent PIN Code</div>
        <div class="info-value">${formatValue(patient.permanent_pin_code)}</div>
      </div>
      ` : ''}
      ${patient.permanent_country ? `
      <div class="info-item">
        <div class="info-label">Permanent Country</div>
        <div class="info-value">${formatValue(patient.permanent_country)}</div>
      </div>
      ` : ''}
      ${patient.local_address ? `
      <div class="info-item full-width">
        <div class="info-label">Local Address</div>
        <div class="info-value">${formatValue(patient.local_address)}</div>
      </div>
      ` : ''}
      ${patient.address_line ? `
      <div class="info-item full-width">
        <div class="info-label">Address Line</div>
        <div class="info-value">${formatValue(patient.address_line)}</div>
      </div>
      ` : ''}
      ${patient.address_line_2 ? `
      <div class="info-item full-width">
        <div class="info-label">Address Line 2</div>
        <div class="info-value">${formatValue(patient.address_line_2)}</div>
      </div>
      ` : ''}
      ${patient.city ? `
      <div class="info-item">
        <div class="info-label">City</div>
        <div class="info-value">${formatValue(patient.city)}</div>
      </div>
      ` : ''}
      ${patient.district ? `
      <div class="info-item">
        <div class="info-label">District</div>
        <div class="info-value">${formatValue(patient.district)}</div>
      </div>
      ` : ''}
      ${patient.state ? `
      <div class="info-item">
        <div class="info-label">State</div>
        <div class="info-value">${formatValue(patient.state)}</div>
      </div>
      ` : ''}
      ${patient.pin_code ? `
      <div class="info-item">
        <div class="info-label">PIN Code</div>
        <div class="info-value">${formatValue(patient.pin_code)}</div>
      </div>
      ` : ''}
      ${patient.country ? `
      <div class="info-item">
        <div class="info-label">Country</div>
        <div class="info-value">${formatValue(patient.country)}</div>
      </div>
      ` : ''}
      ${patient.school_college_office ? `
      <div class="info-item full-width">
        <div class="info-label">School/College/Office</div>
        <div class="info-value">${formatValue(patient.school_college_office)}</div>
      </div>
      ` : ''}
    </div>
  </div>
  ` : ''}

  ${patient.family_type || patient.head_name || patient.religion || patient.head_age || patient.head_education || patient.head_occupation || patient.head_income ? `
  <div class="section">
    <div class="section-title">Family Information</div>
    <div class="info-grid">
      ${patient.family_type ? `
      <div class="info-item">
        <div class="info-label">Family Type</div>
        <div class="info-value">${formatValue(patient.family_type)}</div>
      </div>
      ` : ''}
      ${patient.head_name ? `
      <div class="info-item">
        <div class="info-label">Head of Family</div>
        <div class="info-value">${formatValue(patient.head_name)}</div>
      </div>
      ` : ''}
      ${patient.head_age ? `
      <div class="info-item">
        <div class="info-label">Head Age</div>
        <div class="info-value">${formatValue(patient.head_age)}</div>
      </div>
      ` : ''}
      ${patient.head_relationship ? `
      <div class="info-item">
        <div class="info-label">Relationship to Head</div>
        <div class="info-value">${formatValue(patient.head_relationship)}</div>
      </div>
      ` : ''}
      ${patient.head_education ? `
      <div class="info-item">
        <div class="info-label">Head Education</div>
        <div class="info-value">${formatValue(patient.head_education)}</div>
      </div>
      ` : ''}
      ${patient.head_occupation ? `
      <div class="info-item">
        <div class="info-label">Head Occupation</div>
        <div class="info-value">${formatValue(patient.head_occupation)}</div>
      </div>
      ` : ''}
      ${patient.head_income ? `
      <div class="info-item">
        <div class="info-label">Head Income</div>
        <div class="info-value">₹${formatValue(patient.head_income)}</div>
      </div>
      ` : ''}
      ${patient.religion ? `
      <div class="info-item">
        <div class="info-label">Religion</div>
        <div class="info-value">${formatValue(patient.religion)}</div>
      </div>
      ` : ''}
      ${patient.locality ? `
      <div class="info-item">
        <div class="info-label">Locality</div>
        <div class="info-value">${formatValue(patient.locality)}</div>
      </div>
      ` : ''}
    </div>
  </div>
  ` : ''}

  ${patient.patient_income || patient.family_income ? `
  <div class="section">
    <div class="section-title">Financial Information</div>
    <div class="info-grid">
      ${patient.patient_income ? `
      <div class="info-item">
        <div class="info-label">Patient Income</div>
        <div class="info-value">₹${formatValue(patient.patient_income)}</div>
      </div>
      ` : ''}
      ${patient.family_income ? `
      <div class="info-item">
        <div class="info-label">Family Income</div>
        <div class="info-value">₹${formatValue(patient.family_income)}</div>
      </div>
      ` : ''}
    </div>
  </div>
  ` : ''}

  ${patient.referred_by || patient.mobility || patient.distance_from_hospital || patient.exact_source || patient.seen_in_walk_in_on || patient.worked_up_on ? `
  <div class="section">
    <div class="section-title">Referral & Mobility</div>
    <div class="info-grid">
      ${patient.referred_by ? `
      <div class="info-item">
        <div class="info-label">Referred By</div>
        <div class="info-value">${formatValue(patient.referred_by)}</div>
      </div>
      ` : ''}
      ${patient.exact_source ? `
      <div class="info-item">
        <div class="info-label">Exact Source</div>
        <div class="info-value">${formatValue(patient.exact_source)}</div>
      </div>
      ` : ''}
      ${patient.mobility ? `
      <div class="info-item">
        <div class="info-label">Mobility</div>
        <div class="info-value">${formatValue(patient.mobility)}</div>
      </div>
      ` : ''}
      ${patient.distance_from_hospital ? `
      <div class="info-item">
        <div class="info-label">Distance from Hospital</div>
        <div class="info-value">${formatValue(patient.distance_from_hospital)}</div>
      </div>
      ` : ''}
      ${patient.seen_in_walk_in_on ? `
      <div class="info-item">
        <div class="info-label">Seen in Walk-in On</div>
        <div class="info-value">${formatDate(patient.seen_in_walk_in_on)}</div>
      </div>
      ` : ''}
      ${patient.worked_up_on ? `
      <div class="info-item">
        <div class="info-label">Worked Up On</div>
        <div class="info-value">${formatDate(patient.worked_up_on)}</div>
      </div>
      ` : ''}
    </div>
  </div>
  ` : ''}

  ${clinicalProformas && clinicalProformas.length > 0 ? `
  <div class="section">
    <div class="section-title">Clinical Proforma Visits (${clinicalProformas.length})</div>
    ${clinicalProformas.map((proforma, index) => `
    <div style="margin-bottom: 25px; padding: 15px; border: 1px solid #e5e7eb; border-radius: 8px; background-color: #f9fafb;">
      <h3 style="margin: 0 0 15px 0; font-size: 12px; font-weight: bold; color: #1f2937; border-bottom: 1px solid #d1d5db; padding-bottom: 8px;">
        Visit ${index + 1} - ${formatDate(proforma.visit_date)}
      </h3>
      <div class="info-grid">
        ${proforma.visit_type ? `
        <div class="info-item">
          <div class="info-label">Visit Type</div>
          <div class="info-value">${formatValue(proforma.visit_type)}</div>
        </div>
        ` : ''}
        ${proforma.room_no ? `
        <div class="info-item">
          <div class="info-label">Room Number</div>
          <div class="info-value">${formatValue(proforma.room_no)}</div>
        </div>
        ` : ''}
        ${proforma.doctor_name ? `
        <div class="info-item">
          <div class="info-label">Doctor</div>
          <div class="info-value">${formatValue(proforma.doctor_name)} (${formatValue(proforma.doctor_role)})</div>
        </div>
        ` : ''}
        ${proforma.informant_present !== undefined ? `
        <div class="info-item">
          <div class="info-label">Informant Present</div>
          <div class="info-value">${formatValue(proforma.informant_present)}</div>
        </div>
        ` : ''}
        ${proforma.nature_of_information ? `
        <div class="info-item full-width">
          <div class="info-label">Nature of Information</div>
          <div class="info-value">${formatValue(proforma.nature_of_information)}</div>
        </div>
        ` : ''}
        ${proforma.onset_duration ? `
        <div class="info-item">
          <div class="info-label">Onset Duration</div>
          <div class="info-value">${formatValue(proforma.onset_duration)}</div>
        </div>
        ` : ''}
        ${proforma.course ? `
        <div class="info-item">
          <div class="info-label">Course</div>
          <div class="info-value">${formatValue(proforma.course)}</div>
        </div>
        ` : ''}
        ${proforma.precipitating_factor ? `
        <div class="info-item full-width">
          <div class="info-label">Precipitating Factor</div>
          <div class="info-value">${formatValue(proforma.precipitating_factor)}</div>
        </div>
        ` : ''}
        ${proforma.illness_duration ? `
        <div class="info-item">
          <div class="info-label">Illness Duration</div>
          <div class="info-value">${formatValue(proforma.illness_duration)}</div>
        </div>
        ` : ''}
        ${proforma.current_episode_since ? `
        <div class="info-item">
          <div class="info-label">Current Episode Since</div>
          <div class="info-value">${formatValue(proforma.current_episode_since)}</div>
        </div>
        ` : ''}
        ${proforma.mood ? `
        <div class="info-item">
          <div class="info-label">Mood</div>
          <div class="info-value">${formatValue(proforma.mood)}</div>
        </div>
        ` : ''}
        ${proforma.behaviour ? `
        <div class="info-item">
          <div class="info-label">Behaviour</div>
          <div class="info-value">${formatValue(proforma.behaviour)}</div>
        </div>
        ` : ''}
        ${proforma.speech ? `
        <div class="info-item">
          <div class="info-label">Speech</div>
          <div class="info-value">${formatValue(proforma.speech)}</div>
        </div>
        ` : ''}
        ${proforma.thought ? `
        <div class="info-item">
          <div class="info-label">Thought</div>
          <div class="info-value">${formatValue(proforma.thought)}</div>
        </div>
        ` : ''}
        ${proforma.perception ? `
        <div class="info-item">
          <div class="info-label">Perception</div>
          <div class="info-value">${formatValue(proforma.perception)}</div>
        </div>
        ` : ''}
        ${proforma.somatic ? `
        <div class="info-item">
          <div class="info-label">Somatic</div>
          <div class="info-value">${formatValue(proforma.somatic)}</div>
        </div>
        ` : ''}
        ${proforma.bio_functions ? `
        <div class="info-item">
          <div class="info-label">Bio Functions</div>
          <div class="info-value">${formatValue(proforma.bio_functions)}</div>
        </div>
        ` : ''}
        ${proforma.adjustment ? `
        <div class="info-item">
          <div class="info-label">Adjustment</div>
          <div class="info-value">${formatValue(proforma.adjustment)}</div>
        </div>
        ` : ''}
        ${proforma.cognitive_function ? `
        <div class="info-item">
          <div class="info-label">Cognitive Function</div>
          <div class="info-value">${formatValue(proforma.cognitive_function)}</div>
        </div>
        ` : ''}
        ${proforma.fits ? `
        <div class="info-item">
          <div class="info-label">Fits</div>
          <div class="info-value">${formatValue(proforma.fits)}</div>
        </div>
        ` : ''}
        ${proforma.sexual_problem ? `
        <div class="info-item">
          <div class="info-label">Sexual Problem</div>
          <div class="info-value">${formatValue(proforma.sexual_problem)}</div>
        </div>
        ` : ''}
        ${proforma.substance_use ? `
        <div class="info-item full-width">
          <div class="info-label">Substance Use</div>
          <div class="info-value">${formatValue(proforma.substance_use)}</div>
        </div>
        ` : ''}
        ${proforma.past_history ? `
        <div class="info-item full-width">
          <div class="info-label">Past History</div>
          <div class="info-value">${formatValue(proforma.past_history)}</div>
        </div>
        ` : ''}
        ${proforma.family_history ? `
        <div class="info-item full-width">
          <div class="info-label">Family History</div>
          <div class="info-value">${formatValue(proforma.family_history)}</div>
        </div>
        ` : ''}
        ${proforma.associated_medical_surgical ? `
        <div class="info-item full-width">
          <div class="info-label">Associated Medical/Surgical</div>
          <div class="info-value">${formatValue(proforma.associated_medical_surgical)}</div>
        </div>
        ` : ''}
        ${proforma.mse_behaviour ? `
        <div class="info-item">
          <div class="info-label">MSE - Behaviour</div>
          <div class="info-value">${formatValue(proforma.mse_behaviour)}</div>
        </div>
        ` : ''}
        ${proforma.mse_affect ? `
        <div class="info-item">
          <div class="info-label">MSE - Affect</div>
          <div class="info-value">${formatValue(proforma.mse_affect)}</div>
        </div>
        ` : ''}
        ${proforma.mse_thought ? `
        <div class="info-item">
          <div class="info-label">MSE - Thought</div>
          <div class="info-value">${formatValue(proforma.mse_thought)}</div>
        </div>
        ` : ''}
        ${proforma.mse_delusions ? `
        <div class="info-item">
          <div class="info-label">MSE - Delusions</div>
          <div class="info-value">${formatValue(proforma.mse_delusions)}</div>
        </div>
        ` : ''}
        ${proforma.mse_perception ? `
        <div class="info-item">
          <div class="info-label">MSE - Perception</div>
          <div class="info-value">${formatValue(proforma.mse_perception)}</div>
        </div>
        ` : ''}
        ${proforma.mse_cognitive_function ? `
        <div class="info-item">
          <div class="info-label">MSE - Cognitive Function</div>
          <div class="info-value">${formatValue(proforma.mse_cognitive_function)}</div>
        </div>
        ` : ''}
        ${proforma.gpe ? `
        <div class="info-item full-width">
          <div class="info-label">General Physical Examination</div>
          <div class="info-value">${formatValue(proforma.gpe)}</div>
        </div>
        ` : ''}
        ${proforma.diagnosis ? `
        <div class="info-item full-width">
          <div class="info-label">Diagnosis</div>
          <div class="info-value">${formatValue(proforma.diagnosis)}</div>
        </div>
        ` : ''}
        ${proforma.icd_code ? `
        <div class="info-item">
          <div class="info-label">ICD Code</div>
          <div class="info-value">${formatValue(proforma.icd_code)}</div>
        </div>
        ` : ''}
        ${proforma.disposal ? `
        <div class="info-item">
          <div class="info-label">Disposal</div>
          <div class="info-value">${formatValue(proforma.disposal)}</div>
        </div>
        ` : ''}
        ${proforma.workup_appointment ? `
        <div class="info-item">
          <div class="info-label">Workup Appointment</div>
          <div class="info-value">${formatDate(proforma.workup_appointment)}</div>
        </div>
        ` : ''}
        ${proforma.referred_to ? `
        <div class="info-item">
          <div class="info-label">Referred To</div>
          <div class="info-value">${formatValue(proforma.referred_to)}</div>
        </div>
        ` : ''}
        ${proforma.treatment_prescribed ? `
        <div class="info-item full-width">
          <div class="info-label">Treatment Prescribed</div>
          <div class="info-value">${formatValue(proforma.treatment_prescribed)}</div>
        </div>
        ` : ''}
        ${proforma.prescriptions ? `
        <div class="info-item full-width">
          <div class="info-label">Prescriptions</div>
          <div class="info-value">${formatValue(proforma.prescriptions)}</div>
        </div>
        ` : ''}
        ${proforma.doctor_decision ? `
        <div class="info-item">
          <div class="info-label">Doctor Decision</div>
          <div class="info-value">${formatValue(proforma.doctor_decision)}</div>
        </div>
        ` : ''}
        ${proforma.requires_adl_file !== undefined ? `
        <div class="info-item">
          <div class="info-label">Requires Out Patient Intake Record</div>
          <div class="info-value">${formatValue(proforma.requires_adl_file)}</div>
        </div>
        ` : ''}
        ${proforma.adl_reasoning ? `
        <div class="info-item full-width">
          <div class="info-label">Out Patient Intake Record Reasoning</div>
          <div class="info-value">${formatValue(proforma.adl_reasoning)}</div>
        </div>
        ` : ''}
        ${proforma.created_at ? `
        <div class="info-item">
          <div class="info-label">Created At</div>
          <div class="info-value">${formatDateTime(proforma.created_at)}</div>
        </div>
        ` : ''}
      </div>
    </div>
    `).join('')}
  </div>
  ` : ''}

  ${adlFiles && adlFiles.length > 0 ? `
  <div class="section">
    <div class="section-title">Out Patient Intake Record (${adlFiles.length})</div>
    ${adlFiles.map((adl, index) => `
    <div style="margin-bottom: 25px; padding: 15px; border: 1px solid #e5e7eb; border-radius: 8px; background-color: #f9fafb;">
      <h3 style="margin: 0 0 15px 0; font-size: 12px; font-weight: bold; color: #1f2937; border-bottom: 1px solid #d1d5db; padding-bottom: 8px;">
        Out Patient Intake Record ${index + 1} - ${formatValue(adl.adl_no || `ID: ${adl.id}`)}
      </h3>
      <div class="info-grid">
        ${adl.file_status ? `
        <div class="info-item">
          <div class="info-label">File Status</div>
          <div class="info-value">${formatValue(adl.file_status)}</div>
        </div>
        ` : ''}
        ${adl.file_created_date ? `
        <div class="info-item">
          <div class="info-label">File Created Date</div>
          <div class="info-value">${formatDate(adl.file_created_date)}</div>
        </div>
        ` : ''}
        ${adl.physical_file_location ? `
        <div class="info-item full-width">
          <div class="info-label">Physical File Location</div>
          <div class="info-value">${formatValue(adl.physical_file_location)}</div>
        </div>
        ` : ''}
        ${adl.last_accessed_date ? `
        <div class="info-item">
          <div class="info-label">Last Accessed Date</div>
          <div class="info-value">${formatDate(adl.last_accessed_date)}</div>
        </div>
        ` : ''}
        ${adl.last_accessed_by_name ? `
        <div class="info-item">
          <div class="info-label">Last Accessed By</div>
          <div class="info-value">${formatValue(adl.last_accessed_by_name)}</div>
        </div>
        ` : ''}
        ${adl.total_visits ? `
        <div class="info-item">
          <div class="info-label">Total Visits</div>
          <div class="info-value">${formatValue(adl.total_visits)}</div>
        </div>
        ` : ''}
        ${adl.created_by_name ? `
        <div class="info-item">
          <div class="info-label">Created By</div>
          <div class="info-value">${formatValue(adl.created_by_name)} (${formatValue(adl.created_by_role)})</div>
        </div>
        ` : ''}
        ${adl.notes ? `
        <div class="info-item full-width">
          <div class="info-label">Notes</div>
          <div class="info-value">${formatValue(adl.notes)}</div>
        </div>
        ` : ''}
        ${adl.history_narrative ? `
        <div class="info-item full-width">
          <div class="info-label">History Narrative</div>
          <div class="info-value">${formatValue(adl.history_narrative)}</div>
        </div>
        ` : ''}
        ${adl.history_specific_enquiry ? `
        <div class="info-item full-width">
          <div class="info-label">History Specific Enquiry</div>
          <div class="info-value">${formatValue(adl.history_specific_enquiry)}</div>
        </div>
        ` : ''}
        ${adl.history_drug_intake ? `
        <div class="info-item full-width">
          <div class="info-label">History Drug Intake</div>
          <div class="info-value">${formatValue(adl.history_drug_intake)}</div>
        </div>
        ` : ''}
        ${adl.history_treatment_place ? `
        <div class="info-item">
          <div class="info-label">History Treatment Place</div>
          <div class="info-value">${formatValue(adl.history_treatment_place)}</div>
        </div>
        ` : ''}
        ${adl.history_treatment_dates ? `
        <div class="info-item">
          <div class="info-label">History Treatment Dates</div>
          <div class="info-value">${formatDate(adl.history_treatment_dates)}</div>
        </div>
        ` : ''}
        ${adl.history_treatment_drugs ? `
        <div class="info-item full-width">
          <div class="info-label">History Treatment Drugs</div>
          <div class="info-value">${formatValue(adl.history_treatment_drugs)}</div>
        </div>
        ` : ''}
        ${adl.history_treatment_response ? `
        <div class="info-item full-width">
          <div class="info-label">History Treatment Response</div>
          <div class="info-value">${formatValue(adl.history_treatment_response)}</div>
        </div>
        ` : ''}
        ${adl.informants ? `
        <div class="info-item full-width">
          <div class="info-label">Informants</div>
          <div class="info-value">${formatValue(adl.informants)}</div>
        </div>
        ` : ''}
        ${adl.complaints_patient ? `
        <div class="info-item full-width">
          <div class="info-label">Complaints - Patient</div>
          <div class="info-value">${formatValue(adl.complaints_patient)}</div>
        </div>
        ` : ''}
        ${adl.complaints_informant ? `
        <div class="info-item full-width">
          <div class="info-label">Complaints - Informant</div>
          <div class="info-value">${formatValue(adl.complaints_informant)}</div>
        </div>
        ` : ''}
        ${adl.past_history_medical ? `
        <div class="info-item full-width">
          <div class="info-label">Past History - Medical</div>
          <div class="info-value">${formatValue(adl.past_history_medical)}</div>
        </div>
        ` : ''}
        ${adl.past_history_psychiatric_diagnosis ? `
        <div class="info-item full-width">
          <div class="info-label">Past History - Psychiatric Diagnosis</div>
          <div class="info-value">${formatValue(adl.past_history_psychiatric_diagnosis)}</div>
        </div>
        ` : ''}
        ${adl.past_history_psychiatric_treatment ? `
        <div class="info-item full-width">
          <div class="info-label">Past History - Psychiatric Treatment</div>
          <div class="info-value">${formatValue(adl.past_history_psychiatric_treatment)}</div>
        </div>
        ` : ''}
        ${adl.family_history_father_age ? `
        <div class="info-item">
          <div class="info-label">Family History - Father Age</div>
          <div class="info-value">${formatValue(adl.family_history_father_age)}</div>
        </div>
        ` : ''}
        ${adl.family_history_father_education ? `
        <div class="info-item">
          <div class="info-label">Family History - Father Education</div>
          <div class="info-value">${formatValue(adl.family_history_father_education)}</div>
        </div>
        ` : ''}
        ${adl.family_history_father_occupation ? `
        <div class="info-item">
          <div class="info-label">Family History - Father Occupation</div>
          <div class="info-value">${formatValue(adl.family_history_father_occupation)}</div>
        </div>
        ` : ''}
        ${adl.family_history_mother_age ? `
        <div class="info-item">
          <div class="info-label">Family History - Mother Age</div>
          <div class="info-value">${formatValue(adl.family_history_mother_age)}</div>
        </div>
        ` : ''}
        ${adl.family_history_mother_education ? `
        <div class="info-item">
          <div class="info-label">Family History - Mother Education</div>
          <div class="info-value">${formatValue(adl.family_history_mother_education)}</div>
        </div>
        ` : ''}
        ${adl.family_history_mother_occupation ? `
        <div class="info-item">
          <div class="info-label">Family History - Mother Occupation</div>
          <div class="info-value">${formatValue(adl.family_history_mother_occupation)}</div>
        </div>
        ` : ''}
        ${adl.provisional_diagnosis ? `
        <div class="info-item full-width">
          <div class="info-label">Provisional Diagnosis</div>
          <div class="info-value">${formatValue(adl.provisional_diagnosis)}</div>
        </div>
        ` : ''}
        ${adl.treatment_plan ? `
        <div class="info-item full-width">
          <div class="info-label">Treatment Plan</div>
          <div class="info-value">${formatValue(adl.treatment_plan)}</div>
        </div>
        ` : ''}
        ${adl.consultant_comments ? `
        <div class="info-item full-width">
          <div class="info-label">Consultant Comments</div>
          <div class="info-value">${formatValue(adl.consultant_comments)}</div>
        </div>
        ` : ''}
        ${adl.created_at ? `
        <div class="info-item">
          <div class="info-label">Created At</div>
          <div class="info-value">${formatDateTime(adl.created_at)}</div>
        </div>
        ` : ''}
      </div>
    </div>
    `).join('')}
  </div>
  ` : ''}

  <div class="section">
    <div class="section-title">Status Information</div>
    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">Case Complexity</div>
        <div class="info-value">${patient.has_adl_file || patient.case_complexity === 'complex' ? 'Complex' : 'Simple'}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Out Patient Intake Record</div>
        <div class="info-value">${patient.has_adl_file || (adlFiles && adlFiles.length > 0) ? 'Yes' : 'No'}</div>
      </div>
      ${patient.date ? `
      <div class="info-item">
        <div class="info-label">Registration Date</div>
        <div class="info-value">${formatDate(patient.date)}</div>
      </div>
      ` : ''}
      ${clinicalProformas && clinicalProformas.length > 0 ? `
      <div class="info-item">
        <div class="info-label">Total Clinical Visits</div>
        <div class="info-value">${clinicalProformas.length}</div>
      </div>
      ` : ''}
    </div>
  </div>

  <div class="footer">
    <p>Generated on ${new Date().toLocaleString('en-IN')}</p>
    <p>PGIMER - Department of Psychiatry | Electronic Medical Record System</p>
  </div>
</body>
</html>
    `;
  };

  const columns = [
    {
      header: (
        <div className="flex items-center gap-2">
          <FiFileText className="w-4 h-4 text-primary-600" />
          <span className="font-semibold">CR No</span>
        </div>
      ),
      accessor: 'cr_no',
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-lg flex items-center justify-center">
            <FiFileText className="w-4 h-4 text-blue-600" />
          </div>
          <span className="font-medium text-gray-900">{row.cr_no || 'N/A'}</span>
        </div>
      ),
    },
    {
      header: (
        <div className="flex items-center gap-2">
          <FiUsers className="w-4 h-4 text-primary-600" />
          <span className="font-semibold">Patient Info</span>
        </div>
      ),
      render: (row) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-r from-green-100 to-emerald-100 rounded-full flex items-center justify-center">
              <FiHeart className="w-3 h-3 text-green-600" />
            </div>
            <span className="font-semibold text-gray-900">{row.name}</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <FiClock className="w-3 h-3" />
              {row.age} years
            </span>
            <span className="px-2 py-1 bg-gray-100 rounded-full text-xs font-medium">
              {row.sex}
            </span>
          </div>
        </div>
      ),
    },
    {
      header: (
        <div className="flex items-center gap-2">
          <FiShield className="w-4 h-4 text-primary-600" />
          <span className="font-semibold">Doctor</span>
        </div>
      ),
      render: (row) => (
        row.assigned_doctor_name ? (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg flex items-center justify-center">
              <FiUsers className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <Badge className="bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 border-purple-200">
                {row.assigned_doctor_name}
              </Badge>
              <p className="text-xs text-gray-500 mt-1">{row.assigned_doctor_role}</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
              <FiUsers className="w-4 h-4 text-gray-400" />
            </div>
            <span className="text-gray-400 text-sm">Unassigned</span>
          </div>
        )
      ),
    },
    {
      header: (
        <div className="flex items-center gap-2">
          <FiFileText className="w-4 h-4 text-primary-600" />
          <span className="font-semibold">PSY No</span>
        </div>
      ),
      accessor: 'psy_no',
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-r from-orange-100 to-yellow-100 rounded-lg flex items-center justify-center">
            <FiFileText className="w-4 h-4 text-orange-600" />
          </div>
          <span className="font-medium text-gray-900">{row.psy_no || 'N/A'}</span>
        </div>
      ),
    },
    {
      header: (
        <div className="flex items-center gap-2">
          <FiTrendingUp className="w-4 h-4 text-primary-600" />
          <span className="font-semibold">Status</span>
        </div>
      ),
      render: (row) => {
        // If patient has ADL file, status should be "complex"
        const isComplex = row.has_adl_file || row.case_complexity === 'complex';
        const statusText = isComplex ? 'complex' : 'simple';
        
        return (
        <div className="space-y-2">
          <Badge 
              variant={ row.has_adl_file ? ' success ' : 'warning'}
            className={`${
              !row.has_adl_file 
                ? 'bg-gradient-to-r from-orange-100 to-yellow-100 text-orange-800 border-orange-200 gap-1`' 
                : 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border-green-200'
            }`}
          >
              {/* {statusText}  */}
              Out Patient Intake Record
          </Badge>
          <div className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${
              row.has_adl_file ? 'bg-green-500' : 'bg-gray-300'
            }`}></div>
            <span className="text-xs text-gray-600">
               {row.has_adl_file ? 'Yes' : 'No'}
            </span>
          </div>
        </div>
        );
      },
    },
    {
      header: (
        <div className="flex items-center gap-2">
          {/* <FiMoreVertical className="w-4 h-4 text-primary-600" /> */}
          <span className="font-semibold">Actions</span>
        </div>
      ),
      render: (row) => {
        const patientId = row.id
        // getPatientId(row);
        return (
        <div className="flex gap-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => handleView(row)}
              className="h-9 w-9 p-0 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border border-blue-200 hover:border-blue-300 shadow-sm hover:shadow-md transition-all duration-200 rounded-lg"
              title={`View Details for Patient ID: ${patientId || 'N/A'}`}
            >
              <FiEye className="w-4 h-4 text-blue-600" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => handleEdit(row)}
              className="h-9 w-9 p-0 bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 border border-green-200 hover:border-green-300 shadow-sm hover:shadow-md transition-all duration-200 rounded-lg"
              title="Edit Patient"
            >
              <FiEdit className="w-4 h-4 text-green-600" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => handlePrint(patientId)}
              className="h-9 w-9 p-0 bg-gradient-to-r from-purple-50 to-indigo-50 hover:from-purple-100 hover:to-indigo-100 border border-purple-200 hover:border-purple-300 shadow-sm hover:shadow-md transition-all duration-200 rounded-lg"
              title="Print Patient Details"
            >
              <FiPrinter className="w-4 h-4 text-purple-600" />
            </Button>
            {/* Show Delete button only for Admin, not for MWO */}
            {(isAdmin(user?.role) && !isMWO(user?.role)) && patientId && (
              <Button 
                variant="ghost" 
                size="sm"
                className="h-9 w-9 p-0 bg-gradient-to-r from-red-50 to-rose-50 hover:from-red-100 hover:to-rose-100 border border-red-200 hover:border-red-300 shadow-sm hover:shadow-md transition-all duration-200 rounded-lg"
                title="Delete Patient"
                onClick={() => handleDelete(patientId)}
              >
                <FiTrash2 className="w-4 h-4 text-red-600" />
              </Button>
            )}
        </div>
        );
      },
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        {/* Header Section */}
        {/* Main Content Card */}
        <Card className="shadow-lg border border-gray-200/50 bg-white/90 backdrop-blur-sm">
          {error && (
            <div className="mb-6 bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="p-2.5 bg-red-100 rounded-lg flex-shrink-0">
                  <FiShield className="w-5 h-5 text-red-600" />
                </div>
                <div className="flex-1">
                  <p className="text-red-800 font-semibold text-base mb-1">Error Loading Patients</p>
                  <p className="text-red-600 text-sm">{error?.data?.message || 'Failed to load patients. Please try again.'}</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Enhanced Search and Filter Section */}
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <FiSearch className="w-5 h-5 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                </div>
                <Input
                  placeholder="Search by name, CR number, or PSY number..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-12 h-12 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all duration-200 shadow-sm hover:shadow-md"
                />
              </div>
              {!isMWO(user?.role) && (
                <div className="flex flex-col sm:flex-row gap-3 lg:flex-col xl:flex-row">
                  <Link to="/patients/new">
                    <Button className="bg-gradient-to-r h-12 px-5 from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 shadow-lg hover:shadow-xl transition-all duration-200 whitespace-nowrap">
                      <FiPlus className="mr-2" />
                      Add Patient
                    </Button>
                  </Link>
                </div>
              )}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="h-12 px-5 bg-white border-2 border-primary-200 hover:bg-primary-50 hover:border-primary-300 shadow-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleExport}
                  disabled={!data?.data?.patients || data.data.patients.length === 0}
                >
                  <FiDownload className="mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </div>

          {(isLoading || isFetching) ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="relative">
                <div className="w-20 h-20 border-4 border-primary-100 border-t-primary-600 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <FiUsers className="w-8 h-8 text-primary-600" />
                </div>
              </div>
              <p className="mt-6 text-gray-600 font-medium text-lg">Loading patients...</p>
              <p className="mt-2 text-gray-500 text-sm">Please wait while we fetch the data</p>
            </div>
          ) : data?.data?.patients?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-6">
                <FiUsers className="w-12 h-12 text-gray-400" />
              </div>
              <p className="text-xl font-semibold text-gray-700 mb-2">No patients found</p>
              <p className="text-gray-500 text-center max-w-md">
                {search 
                  ? `No patients match your search "${search}". Try a different search term.`
                  : 'There are no patients in the system yet. Add your first patient to get started.'}
              </p>
              {user?.role !== 'MWO' && !search && (
                <Link to="/patients/new" className="mt-6">
                  <Button className="bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 shadow-lg">
                    <FiPlus className="mr-2" />
                    Add First Patient
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <>
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <Table
                  columns={columns}
                  data={data?.data?.patients || []}
                  loading={isLoading}
                />
              </div>

              {data?.data?.pagination && data.data.pagination.pages > 1 && (
                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm mt-4">
                  <Pagination
                    currentPage={data.data.pagination.page}
                    totalPages={data.data.pagination.pages}
                    totalItems={data.data.pagination.total}
                    itemsPerPage={limit}
                    onPageChange={setPage}
                  />
                </div>
              )}
            </>
          )}
        </Card>

      </div>
    </div>
  );
};

export default PatientsPage;

