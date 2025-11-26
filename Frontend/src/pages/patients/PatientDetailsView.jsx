import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Card from '../../components/Card';
import Badge from '../../components/Badge';
import Select from '../../components/Select';
import { formatDate } from '../../utils/formatters';
import {
  getFileStatusLabel, getCaseSeverityLabel,
  formatAddress, formatCurrency, formatDateTime
} from '../../utils/enumMappings';
import { isAdmin, isJrSr, isMWO, PATIENT_REGISTRATION_FORM, isJR, isSR } from '../../utils/constants';
import {
  FiUser, FiUsers, FiBriefcase, FiDollarSign, FiHome, FiMapPin, FiPhone,
  FiCalendar, FiGlobe, FiFileText, FiHash, FiClock,
  FiHeart, FiBookOpen, FiTrendingUp, FiShield,
  FiNavigation, FiTruck, FiEdit3, FiSave, FiX, FiLayers, FiLoader,
  FiFolder, FiChevronDown, FiChevronUp, FiPackage, FiEdit, FiPlus, FiTrash2, FiCheck, FiDownload, FiPrinter
} from 'react-icons/fi';
import Button from '../../components/Button';
import { toast } from 'react-toastify';
import * as XLSX from 'xlsx-js-style';

import { useGetPrescriptionByIdQuery } from '../../features/prescriptions/prescriptionApiSlice';
import { useGetPatientFilesQuery } from '../../features/patients/patientFilesApiSlice';
import FilePreview from '../../components/FilePreview';
import ViewADL from '../adl/ViewADL';
import ClinicalProformaDetails from '../clinical/ClinicalProformaDetails';
import PrescriptionView from '../PrescribeMedication/PrescriptionView';
// const IconInput = ({ icon, label, loading = false, error, defaultValue, ...props }) => {
//   // Filter out non-DOM props that shouldn't be passed to the input element
//   const {
//     defaultToday,
//     searchable,
//     formData,
//     customFieldName,
//     inputLabel,
//     options,
//     customValue,
//     setCustomValue,
//     showCustomInput,
//     containerClassName,
//     dropdownZIndex,
//     ...domProps
//   } = props;

//   // Remove defaultValue if value is provided to avoid controlled/uncontrolled warning
//   const inputProps = domProps.value !== undefined ? { ...domProps } : { ...domProps, defaultValue };

//   return (
//     <div className="space-y-2">
//       <label className="flex items-center gap-2 text-sm font-semibold text-gray-800">
//         {icon && <span className="text-primary-600">{icon}</span>}
//         {label}
//         {loading && (
//           <FiLoader className="w-4 h-4 text-blue-500 animate-spin" />
//         )}
//       </label>
//       <div className="relative">
//         {icon && (
//           <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
//             <span className="text-gray-500">{icon}</span>
//           </div>
//         )}
//         <input
//           {...inputProps}
//           className={`w-full px-4 py-3 ${icon ? 'pl-11' : 'pl-4'} bg-white/60 backdrop-blur-md border-2 border-gray-300/60 rounded-xl shadow-sm focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 focus:bg-white/80 transition-all duration-300 hover:bg-white/70 hover:border-primary-400/70 placeholder:text-gray-400 text-gray-900 font-medium ${inputProps.className || ''}`}
//         />
//       </div>
//       {error && (
//         <p className="text-red-500 text-xs mt-1 flex items-center gap-1 font-medium">
//           <FiX className="w-3 h-3" />
//           {error}
//         </p>
//       )}
//     </div>
//   );
// };



const PatientDetailsView = ({ patient, formData, clinicalData, adlData, outpatientData, userRole }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTab = searchParams.get('returnTab');
  
  // Fetch patient files for preview
  const { data: patientFilesData } = useGetPatientFilesQuery(patient?.id, {
    skip: !patient?.id
  });
  const existingFiles = patientFilesData?.data?.files || [];

  // Merge patient and formData to ensure all fields are available with proper fallbacks
  // This ensures data is available immediately even if formData hasn't loaded yet
  // Priority: formData > patient > empty string
  const displayData = useMemo(() => {
    return {
      ...patient,
      ...formData,
      // Use formData first, then fallback to patient for critical fields
      cr_no: formData?.cr_no || patient?.cr_no || '',
      psy_no: formData?.psy_no || patient?.psy_no || '',
      name: formData?.name || patient?.name || '',
      sex: formData?.sex || patient?.sex || '',
      age: formData?.age || patient?.age || '',
      contact_number: formData?.contact_number || patient?.contact_number || '',
      assigned_room: formData?.assigned_room || patient?.assigned_room || '',
      assigned_doctor_id: formData?.assigned_doctor_id || patient?.assigned_doctor_id || '',
      assigned_doctor_name: formData?.assigned_doctor_name || patient?.assigned_doctor_name || '',
      assigned_doctor_role: formData?.assigned_doctor_role || patient?.assigned_doctor_role || '',
      date: formData?.date || patient?.date || '',
      father_name: formData?.father_name || patient?.father_name || '',
      category: formData?.category || patient?.category || '',
      department: formData?.department || patient?.department || '',
      unit_consit: formData?.unit_consit || patient?.unit_consit || '',
      room_no: formData?.room_no || patient?.room_no || '',
      serial_no: formData?.serial_no || patient?.serial_no || '',
      file_no: formData?.file_no || patient?.file_no || '',
      unit_days: formData?.unit_days || patient?.unit_days || '',
      address_line: formData?.address_line || patient?.address_line || '',
      country: formData?.country || patient?.country || '',
      state: formData?.state || patient?.state || '',
      district: formData?.district || patient?.district || '',
      city: formData?.city || patient?.city || '',
      pin_code: formData?.pin_code || patient?.pin_code || '',
      special_clinic_no: formData?.special_clinic_no || patient?.special_clinic_no || '',
      seen_in_walk_in_on: formData?.seen_in_walk_in_on || patient?.seen_in_walk_in_on || '',
      worked_up_on: formData?.worked_up_on || patient?.worked_up_on || '',
      // Additional fields that might be in either source
      age_group: formData?.age_group || patient?.age_group || '',
      marital_status: formData?.marital_status || patient?.marital_status || '',
      year_of_marriage: formData?.year_of_marriage || patient?.year_of_marriage || '',
      no_of_children_male: formData?.no_of_children_male || patient?.no_of_children_male || '',
      no_of_children_female: formData?.no_of_children_female || patient?.no_of_children_female || '',
      occupation: formData?.occupation || patient?.occupation || '',
      education: formData?.education || formData?.education_level || patient?.education || patient?.education_level || '',
      patient_income: formData?.patient_income || patient?.patient_income || '',
      family_income: formData?.family_income || patient?.family_income || '',
      religion: formData?.religion || patient?.religion || '',
      family_type: formData?.family_type || patient?.family_type || '',
      locality: formData?.locality || patient?.locality || '',
      head_name: formData?.head_name || patient?.head_name || '',
      head_age: formData?.head_age || patient?.head_age || '',
      head_relationship: formData?.head_relationship || patient?.head_relationship || '',
      head_education: formData?.head_education || patient?.head_education || '',
      head_occupation: formData?.head_occupation || patient?.head_occupation || '',
      head_income: formData?.head_income || patient?.head_income || '',
      distance_from_hospital: formData?.distance_from_hospital || patient?.distance_from_hospital || '',
      mobility: formData?.mobility || patient?.mobility || '',
      referred_by: formData?.referred_by || patient?.referred_by || '',
    };
  }, [patient, formData]);

  const [expandedCards, setExpandedCards] = useState({
    patient: true,
    clinical: false,
    adl: false,
    prescriptions: false
  });

  const toggleCard = (cardName) => {
    setExpandedCards(prev => ({
      ...prev,
      [cardName]: !prev[cardName]
    }));
  };

  // Determine which sections to show based on CURRENT USER's role (userRole), not filled_by_role
  // If current user is System Administrator, JR, or SR → Show all 4 sections
  // If current user is Psychiatric Welfare Officer (MWO) → Show only Patient Details
  const canViewAllSections = userRole && (
    isAdmin(userRole) ||
    isJrSr(userRole)
  );
  const canViewClinicalProforma = canViewAllSections;

  const canViewADLFile = canViewAllSections;
  const canViewPrescriptions = canViewAllSections;


  const patientAdlFiles = adlData?.data?.adlFiles || [];


  // Get clinical proformas for this patient - ensure it's always an array
  const patientProformas = Array.isArray(clinicalData?.data?.proformas)
    ? clinicalData.data.proformas
    : [];

  // Fetch prescriptions for all proformas
  // Always compute proformaIds as an array with exactly 10 elements (padding with null)
  // This ensures hooks are always called with the same structure
  const proformaIds = useMemo(() => {
    const ids = patientProformas.map(p => p?.id).filter(Boolean).slice(0, 10);
    // Pad to exactly 10 elements with null to ensure consistent hook calls
    while (ids.length < 10) {
      ids.push(null);
    }
    return ids;
  }, [patientProformas]);

  // Always call the same number of hooks (10) in the same order
  // This ensures React hooks are called in a consistent order every render
  // proformaIds is guaranteed to have exactly 10 elements (padded with null if needed)
  const prescriptionResult1 = useGetPrescriptionByIdQuery({ clinical_proforma_id: proformaIds[0] }, { skip: !proformaIds[0] });
  const prescriptionResult2 = useGetPrescriptionByIdQuery({ clinical_proforma_id: proformaIds[1] }, { skip: !proformaIds[1] });
  const prescriptionResult3 = useGetPrescriptionByIdQuery({ clinical_proforma_id: proformaIds[2] }, { skip: !proformaIds[2] });
  const prescriptionResult4 = useGetPrescriptionByIdQuery({ clinical_proforma_id: proformaIds[3] }, { skip: !proformaIds[3] });
  const prescriptionResult5 = useGetPrescriptionByIdQuery({ clinical_proforma_id: proformaIds[4] }, { skip: !proformaIds[4] });
  const prescriptionResult6 = useGetPrescriptionByIdQuery({ clinical_proforma_id: proformaIds[5] }, { skip: !proformaIds[5] });
  const prescriptionResult7 = useGetPrescriptionByIdQuery({ clinical_proforma_id: proformaIds[6] }, { skip: !proformaIds[6] });
  const prescriptionResult8 = useGetPrescriptionByIdQuery({ clinical_proforma_id: proformaIds[7] }, { skip: !proformaIds[7] });
  const prescriptionResult9 = useGetPrescriptionByIdQuery({ clinical_proforma_id: proformaIds[8] }, { skip: !proformaIds[8] });
  const prescriptionResult10 = useGetPrescriptionByIdQuery({ clinical_proforma_id: proformaIds[9] }, { skip: !proformaIds[9] });

  // Combine all prescription results - always use all 10 results
  const prescriptionResults = [
    prescriptionResult1,
    prescriptionResult2,
    prescriptionResult3,
    prescriptionResult4,
    prescriptionResult5,
    prescriptionResult6,
    prescriptionResult7,
    prescriptionResult8,
    prescriptionResult9,
    prescriptionResult10,
  ];

  // Combine all prescriptions and group by proforma/visit date
  const allPrescriptions = useMemo(() => {
    const prescriptions = [];
    prescriptionResults.forEach((result, index) => {
      const proformaId = proformaIds[index];
      if (proformaId && result.data?.data?.prescription?.prescription) {
        const proforma = patientProformas.find(p => p.id === proformaId);
        const prescriptionData = result.data.data.prescription;
        prescriptionData.prescription.forEach(prescription => {
          prescriptions.push({
            ...prescription,
            proforma_id: proformaId,
            visit_date: proforma?.visit_date || proforma?.created_at,
            visit_type: proforma?.visit_type
          });
        });
      }
    });
    // Sort by visit date (most recent first)
    return prescriptions.sort((a, b) => {
      const dateA = new Date(a.visit_date || 0);
      const dateB = new Date(b.visit_date || 0);
      return dateB - dateA;
    });
  }, [prescriptionResults, patientProformas, proformaIds]);

  // Group prescriptions by visit date
  const prescriptionsByVisit = useMemo(() => {
    const grouped = {};
    allPrescriptions.forEach(prescription => {
      const visitDate = prescription.visit_date
        ? formatDate(prescription.visit_date)
        : 'Unknown Date';
      if (!grouped[visitDate]) {
        grouped[visitDate] = {
          date: prescription.visit_date,
          visitType: prescription.visit_type,
          prescriptions: []
        };
      }
      grouped[visitDate].prescriptions.push(prescription);
    });
    return grouped;
  }, [allPrescriptions]);

  // Print functionality refs
  const patientDetailsPrintRef = useRef(null);
  const clinicalProformaPrintRef = useRef(null);
  const adlPrintRef = useRef(null);
  const prescriptionPrintRef = useRef(null);

  // Print functionality for Patient Details section
  const handlePrintPatientDetails = () => {
    if (!patientDetailsPrintRef.current) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow pop-ups to print this section');
      return;
    }

    const sectionElement = patientDetailsPrintRef.current;
    const sectionHTML = sectionElement.innerHTML;

    const printContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Patient Details - ${displayData?.name || 'Patient'}</title>
  <style>
    @page {
      size: A4;
      margin: 12mm 15mm;
    }
    * {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      box-sizing: border-box;
    }
    body {
      font-family: 'Arial', 'Helvetica', sans-serif;
      font-size: 10pt;
      line-height: 1.5;
      color: #1a1a1a;
      margin: 0;
      padding: 0;
      background: #fff;
    }
    .header {
      text-align: center;
      border-bottom: 4px solid #2563eb;
      padding-bottom: 12px;
      margin-bottom: 25px;
      background: linear-gradient(to bottom, #f8fafc, #ffffff);
      padding-top: 10px;
    }
    .header h1 {
      margin: 0;
      font-size: 16pt;
      font-weight: bold;
      color: #1e40af;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .header h2 {
      margin: 6px 0 0 0;
      font-size: 12pt;
      color: #475569;
      font-weight: 600;
    }
    .content {
      padding: 0;
    }
    .section {
      margin-bottom: 20px;
      page-break-inside: avoid;
    }
    .section-title {
      font-size: 12pt;
      font-weight: bold;
      color: #1e40af;
      margin: 20px 0 12px 0;
      padding-bottom: 6px;
      border-bottom: 2px solid #e2e8f0;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .field-group {
      margin-bottom: 15px;
      padding: 8px;
      background: #f8fafc;
      border-left: 3px solid #3b82f6;
      border-radius: 4px;
    }
    .field-label {
      font-weight: 600;
      color: #475569;
      font-size: 9pt;
      margin-bottom: 4px;
      text-transform: uppercase;
      letter-spacing: 0.2px;
    }
    .field-value {
      color: #1e293b;
      font-size: 10pt;
      font-weight: 500;
      padding-left: 8px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
      font-size: 9pt;
      page-break-inside: auto;
    }
    table thead {
      background: #1e40af;
      color: #fff;
    }
    table th {
      padding: 10px 8px;
      text-align: left;
      font-weight: 600;
      font-size: 9pt;
      border: 1px solid #1e3a8a;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    table td {
      padding: 8px;
      border: 1px solid #cbd5e1;
      background: #fff;
    }
    table tbody tr {
      page-break-inside: avoid;
    }
    table tbody tr:nth-child(even) {
      background: #f8fafc;
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 8pt;
      font-weight: 600;
      border: 1px solid;
    }
    .footer {
      margin-top: 30px;
      padding-top: 15px;
      border-top: 2px solid #e2e8f0;
      text-align: center;
      font-size: 8pt;
      color: #64748b;
      page-break-inside: avoid;
    }
    button, .no-print, [class*="no-print"] {
      display: none !important;
    }
    .grid {
      display: grid;
      gap: 12px;
    }
    .grid-cols-1 { grid-template-columns: 1fr; }
    .grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
    .grid-cols-3 { grid-template-columns: repeat(3, 1fr); }
    .grid-cols-4 { grid-template-columns: repeat(4, 1fr); }
    @media print {
      body {
        margin: 0;
        padding: 0;
      }
      .section {
        page-break-inside: avoid;
      }
      table {
        page-break-inside: auto;
      }
      tr {
        page-break-inside: avoid;
        page-break-after: auto;
      }
      thead {
        display: table-header-group;
      }
      tfoot {
        display: table-footer-group;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>POSTGRADUATE INSTITUTE OF MEDICAL EDUCATION & RESEARCH</h1>
    <h2>Department of Psychiatry - Patient Details</h2>
  </div>
  <div class="content">
    ${sectionHTML}
  </div>
  <div class="footer">
    <p style="margin: 4px 0;"><strong>Generated on:</strong> ${new Date().toLocaleString('en-IN')}</p>
    <p style="margin: 4px 0;">PGIMER - Department of Psychiatry | Electronic Medical Record System</p>
  </div>
</body>
</html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();

    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        toast.success('Print dialog opened');
      }, 250);
    };
  };

  // Print functionality for Walk-in Clinical Proforma section
  const handlePrintClinicalProforma = () => {
    if (!clinicalProformaPrintRef.current) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow pop-ups to print this section');
      return;
    }

    const sectionElement = clinicalProformaPrintRef.current;
    const sectionHTML = sectionElement.innerHTML;

    const printContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Walk-in Clinical Proforma - ${displayData?.name || 'Patient'}</title>
  <style>
    @page {
      size: A4;
      margin: 12mm 15mm;
    }
    * {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      box-sizing: border-box;
    }
    body {
      font-family: 'Arial', 'Helvetica', sans-serif;
      font-size: 10pt;
      line-height: 1.5;
      color: #1a1a1a;
      margin: 0;
      padding: 0;
      background: #fff;
    }
    .header {
      text-align: center;
      border-bottom: 4px solid #059669;
      padding-bottom: 12px;
      margin-bottom: 25px;
      background: linear-gradient(to bottom, #f0fdf4, #ffffff);
      padding-top: 10px;
    }
    .header h1 {
      margin: 0;
      font-size: 16pt;
      font-weight: bold;
      color: #047857;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .header h2 {
      margin: 6px 0 0 0;
      font-size: 12pt;
      color: #475569;
      font-weight: 600;
    }
    .content {
      padding: 0;
    }
    .section {
      margin-bottom: 20px;
      page-break-inside: avoid;
    }
    .section-title {
      font-size: 12pt;
      font-weight: bold;
      color: #047857;
      margin: 20px 0 12px 0;
      padding-bottom: 6px;
      border-bottom: 2px solid #d1fae5;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .field-group {
      margin-bottom: 15px;
      padding: 8px;
      background: #f0fdf4;
      border-left: 3px solid #10b981;
      border-radius: 4px;
    }
    .field-label {
      font-weight: 600;
      color: #475569;
      font-size: 9pt;
      margin-bottom: 4px;
      text-transform: uppercase;
      letter-spacing: 0.2px;
    }
    .field-value {
      color: #1e293b;
      font-size: 10pt;
      font-weight: 500;
      padding-left: 8px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
      font-size: 9pt;
      page-break-inside: auto;
    }
    table thead {
      background: #047857;
      color: #fff;
    }
    table th {
      padding: 10px 8px;
      text-align: left;
      font-weight: 600;
      font-size: 9pt;
      border: 1px solid #065f46;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    table td {
      padding: 8px;
      border: 1px solid #cbd5e1;
      background: #fff;
    }
    table tbody tr {
      page-break-inside: avoid;
    }
    table tbody tr:nth-child(even) {
      background: #f0fdf4;
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 8pt;
      font-weight: 600;
      border: 1px solid;
    }
    .footer {
      margin-top: 30px;
      padding-top: 15px;
      border-top: 2px solid #e2e8f0;
      text-align: center;
      font-size: 8pt;
      color: #64748b;
      page-break-inside: avoid;
    }
    button, .no-print, [class*="no-print"] {
      display: none !important;
    }
    .grid {
      display: grid;
      gap: 12px;
    }
    .grid-cols-1 { grid-template-columns: 1fr; }
    .grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
    .grid-cols-3 { grid-template-columns: repeat(3, 1fr); }
    .grid-cols-4 { grid-template-columns: repeat(4, 1fr); }
    @media print {
      body {
        margin: 0;
        padding: 0;
      }
      .section {
        page-break-inside: avoid;
      }
      table {
        page-break-inside: auto;
      }
      tr {
        page-break-inside: avoid;
        page-break-after: auto;
      }
      thead {
        display: table-header-group;
      }
      tfoot {
        display: table-footer-group;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>POSTGRADUATE INSTITUTE OF MEDICAL EDUCATION & RESEARCH</h1>
    <h2>Department of Psychiatry - Walk-in Clinical Proforma</h2>
  </div>
  <div class="content">
    ${sectionHTML}
  </div>
  <div class="footer">
    <p style="margin: 4px 0;"><strong>Generated on:</strong> ${new Date().toLocaleString('en-IN')}</p>
    <p style="margin: 4px 0;">PGIMER - Department of Psychiatry | Electronic Medical Record System</p>
  </div>
</body>
</html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();

    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        toast.success('Print dialog opened');
      }, 250);
    };
  };

  // Print functionality for ADL section
  const handlePrintADL = () => {
    if (!adlPrintRef.current) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow pop-ups to print this section');
      return;
    }

    const sectionElement = adlPrintRef.current;
    const sectionHTML = sectionElement.innerHTML;

    const printContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Out-Patient Intake Record - ${displayData?.name || 'Patient'}</title>
  <style>
    @page {
      size: A4;
      margin: 12mm 15mm;
    }
    * {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      box-sizing: border-box;
    }
    body {
      font-family: 'Arial', 'Helvetica', sans-serif;
      font-size: 10pt;
      line-height: 1.5;
      color: #1a1a1a;
      margin: 0;
      padding: 0;
      background: #fff;
    }
    .header {
      text-align: center;
      border-bottom: 4px solid #7c3aed;
      padding-bottom: 12px;
      margin-bottom: 25px;
      background: linear-gradient(to bottom, #faf5ff, #ffffff);
      padding-top: 10px;
    }
    .header h1 {
      margin: 0;
      font-size: 16pt;
      font-weight: bold;
      color: #6d28d9;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .header h2 {
      margin: 6px 0 0 0;
      font-size: 12pt;
      color: #475569;
      font-weight: 600;
    }
    .content {
      padding: 0;
    }
    .section {
      margin-bottom: 20px;
      page-break-inside: avoid;
    }
    .section-title {
      font-size: 12pt;
      font-weight: bold;
      color: #6d28d9;
      margin: 20px 0 12px 0;
      padding-bottom: 6px;
      border-bottom: 2px solid #e9d5ff;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .field-group {
      margin-bottom: 15px;
      padding: 8px;
      background: #faf5ff;
      border-left: 3px solid #a78bfa;
      border-radius: 4px;
    }
    .field-label {
      font-weight: 600;
      color: #475569;
      font-size: 9pt;
      margin-bottom: 4px;
      text-transform: uppercase;
      letter-spacing: 0.2px;
    }
    .field-value {
      color: #1e293b;
      font-size: 10pt;
      font-weight: 500;
      padding-left: 8px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
      font-size: 9pt;
      page-break-inside: auto;
    }
    table thead {
      background: #6d28d9;
      color: #fff;
    }
    table th {
      padding: 10px 8px;
      text-align: left;
      font-weight: 600;
      font-size: 9pt;
      border: 1px solid #5b21b6;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    table td {
      padding: 8px;
      border: 1px solid #cbd5e1;
      background: #fff;
    }
    table tbody tr {
      page-break-inside: avoid;
    }
    table tbody tr:nth-child(even) {
      background: #faf5ff;
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 8pt;
      font-weight: 600;
      border: 1px solid;
    }
    .footer {
      margin-top: 30px;
      padding-top: 15px;
      border-top: 2px solid #e2e8f0;
      text-align: center;
      font-size: 8pt;
      color: #64748b;
      page-break-inside: avoid;
    }
    button, .no-print, [class*="no-print"] {
      display: none !important;
    }
    .grid {
      display: grid;
      gap: 12px;
    }
    .grid-cols-1 { grid-template-columns: 1fr; }
    .grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
    .grid-cols-3 { grid-template-columns: repeat(3, 1fr); }
    .grid-cols-4 { grid-template-columns: repeat(4, 1fr); }
    @media print {
      body {
        margin: 0;
        padding: 0;
      }
      .section {
        page-break-inside: avoid;
      }
      table {
        page-break-inside: auto;
      }
      tr {
        page-break-inside: avoid;
        page-break-after: auto;
      }
      thead {
        display: table-header-group;
      }
      tfoot {
        display: table-footer-group;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>POSTGRADUATE INSTITUTE OF MEDICAL EDUCATION & RESEARCH</h1>
    <h2>Department of Psychiatry - Out-Patient Intake Record</h2>
  </div>
  <div class="content">
    ${sectionHTML}
  </div>
  <div class="footer">
    <p style="margin: 4px 0;"><strong>Generated on:</strong> ${new Date().toLocaleString('en-IN')}</p>
    <p style="margin: 4px 0;">PGIMER - Department of Psychiatry | Electronic Medical Record System</p>
  </div>
</body>
</html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();

    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        toast.success('Print dialog opened');
      }, 250);
    };
  };

  // Print functionality for Prescription section
  const handlePrintPrescription = () => {
    if (!prescriptionPrintRef.current) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow pop-ups to print this section');
      return;
    }

    const sectionElement = prescriptionPrintRef.current;
    const sectionHTML = sectionElement.innerHTML;

    const printContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Prescription History - ${displayData?.name || 'Patient'}</title>
  <style>
    @page {
      size: A4;
      margin: 12mm 15mm;
    }
    * {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      box-sizing: border-box;
    }
    body {
      font-family: 'Arial', 'Helvetica', sans-serif;
      font-size: 10pt;
      line-height: 1.5;
      color: #1a1a1a;
      margin: 0;
      padding: 0;
      background: #fff;
    }
    .header {
      text-align: center;
      border-bottom: 4px solid #d97706;
      padding-bottom: 12px;
      margin-bottom: 25px;
      background: linear-gradient(to bottom, #fffbeb, #ffffff);
      padding-top: 10px;
    }
    .header h1 {
      margin: 0;
      font-size: 16pt;
      font-weight: bold;
      color: #b45309;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .header h2 {
      margin: 6px 0 0 0;
      font-size: 12pt;
      color: #475569;
      font-weight: 600;
    }
    .content {
      padding: 0;
    }
    .section {
      margin-bottom: 20px;
      page-break-inside: avoid;
    }
    .section-title {
      font-size: 12pt;
      font-weight: bold;
      color: #b45309;
      margin: 20px 0 12px 0;
      padding-bottom: 6px;
      border-bottom: 2px solid #fed7aa;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .field-group {
      margin-bottom: 15px;
      padding: 8px;
      background: #fffbeb;
      border-left: 3px solid #fbbf24;
      border-radius: 4px;
    }
    .field-label {
      font-weight: 600;
      color: #475569;
      font-size: 9pt;
      margin-bottom: 4px;
      text-transform: uppercase;
      letter-spacing: 0.2px;
    }
    .field-value {
      color: #1e293b;
      font-size: 10pt;
      font-weight: 500;
      padding-left: 8px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
      font-size: 9pt;
      page-break-inside: auto;
    }
    table thead {
      background: #b45309;
      color: #fff;
    }
    table th {
      padding: 10px 8px;
      text-align: left;
      font-weight: 600;
      font-size: 9pt;
      border: 1px solid #92400e;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    table td {
      padding: 8px;
      border: 1px solid #cbd5e1;
      background: #fff;
    }
    table tbody tr {
      page-break-inside: avoid;
    }
    table tbody tr:nth-child(even) {
      background: #fffbeb;
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 8pt;
      font-weight: 600;
      border: 1px solid;
    }
    .footer {
      margin-top: 30px;
      padding-top: 15px;
      border-top: 2px solid #e2e8f0;
      text-align: center;
      font-size: 8pt;
      color: #64748b;
      page-break-inside: avoid;
    }
    button, .no-print, [class*="no-print"] {
      display: none !important;
    }
    .grid {
      display: grid;
      gap: 12px;
    }
    .grid-cols-1 { grid-template-columns: 1fr; }
    .grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
    .grid-cols-3 { grid-template-columns: repeat(3, 1fr); }
    .grid-cols-4 { grid-template-columns: repeat(4, 1fr); }
    @media print {
      body {
        margin: 0;
        padding: 0;
      }
      .section {
        page-break-inside: avoid;
      }
      table {
        page-break-inside: auto;
      }
      tr {
        page-break-inside: avoid;
        page-break-after: auto;
      }
      thead {
        display: table-header-group;
      }
      tfoot {
        display: table-footer-group;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>POSTGRADUATE INSTITUTE OF MEDICAL EDUCATION & RESEARCH</h1>
    <h2>Department of Psychiatry - Prescription History</h2>
  </div>
  <div class="content">
    ${sectionHTML}
  </div>
  <div class="footer">
    <p style="margin: 4px 0;"><strong>Generated on:</strong> ${new Date().toLocaleString('en-IN')}</p>
    <p style="margin: 4px 0;">PGIMER - Department of Psychiatry | Electronic Medical Record System</p>
  </div>
</body>
</html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();

    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        toast.success('Print dialog opened');
      }, 250);
    };
  };

  // Helper function to apply header styles with different colors
  const applyHeaderStyles = (ws, colorRanges) => {
    if (!ws['!ref']) return;

    const range = XLSX.utils.decode_range(ws['!ref']);
    const numCols = range.e.c + 1;

    // Apply styles to each header cell
    for (let col = 0; col < numCols; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });

      if (!ws[cellAddress]) continue;

      // Find which color range this column belongs to
      let headerColor = '2E86AB'; // Default blue
      for (const range of colorRanges) {
        if (col >= range.start && col <= range.end) {
          headerColor = range.color;
          break;
        }
      }

      // Apply header styling with bold, colored background, and white text
      ws[cellAddress].s = {
        font: {
          bold: true,
          color: { rgb: "FFFFFF" },
          size: 12
        },
        fill: {
          fgColor: { rgb: headerColor }
        },
        alignment: {
          horizontal: "center",
          vertical: "center",
          wrapText: true
        },
        border: {
          top: { style: "thin", color: { rgb: "000000" } },
          bottom: { style: "thin", color: { rgb: "000000" } },
          left: { style: "thin", color: { rgb: "000000" } },
          right: { style: "thin", color: { rgb: "000000" } }
        }
      };
    }

    // Set column widths for better readability
    const colWidths = [];
    for (let col = 0; col < numCols; col++) {
      const header = ws[XLSX.utils.encode_cell({ r: 0, c: col })]?.v || '';
      let width = Math.max(String(header).length * 1.2, 12);
      if (String(header).includes('Address') || String(header).includes('Description')) {
        width = Math.max(width, 25);
      } else if (String(header).includes('Date') || String(header).includes('Time')) {
        width = Math.max(width, 18);
      } else if (String(header).includes('Income') || String(header).includes('Amount')) {
        width = Math.max(width, 15);
      }
      colWidths.push({ wch: Math.min(width, 50) });
    }
    ws['!cols'] = colWidths;
  };

  // Export patient details to Excel
  // Psychiatric Welfare Officer (MWO) can only export patient details, not clinical proformas, ADL files, or prescriptions
  const handleExportPatient = () => {
    try {
      if (!patient && !displayData) {
        toast.error('No patient data available to export');
        return;
      }

      // Check if user is MWO (Psychiatric Welfare Officer)
      const isMWOUser = userRole && isMWO(userRole);

      // Create a new workbook
      const wb = XLSX.utils.book_new();

      // Sheet 1: Patient Basic Details (always included)
      // Use PATIENT_REGISTRATION_FORM labels as Excel headers
      const patientExportData = {};

      PATIENT_REGISTRATION_FORM.forEach(field => {
        const value = displayData[field.value];

        // Handle special cases
        if (field.value === 'mobile_no') {
          // Use contact_number if mobile_no is not available
          patientExportData[field.label] = displayData.contact_number || displayData.mobile_no || 'N/A';
        } else if (field.value === 'date') {
          // Format date if available
          patientExportData[field.label] = value ? formatDate(value) : 'N/A';
        } else if (field.value === 'seen_in_walk_in_on' || field.value === 'worked_up_on') {
          // Format date fields
          patientExportData[field.label] = value ? formatDate(value) : 'N/A';
        } else if (field.value === 'patient_income') {
          // Use patient_income if patient_income is not available
          const incomeValue = value || displayData.patient_income || '';
          patientExportData[field.label] = incomeValue ? (typeof incomeValue === 'number' ? `₹${incomeValue}` : incomeValue) : 'N/A';
        } else if (field.value === 'family_income') {
          // Use family_income if family_income is not available
          const familyIncomeValue = value || displayData.family_income || '';
          patientExportData[field.label] = familyIncomeValue ? (typeof familyIncomeValue === 'number' ? `₹${familyIncomeValue}` : familyIncomeValue) : 'N/A';
        } else if (field.value === 'education') {
          // Use education_level if education is not available
          patientExportData[field.label] = value || displayData.education_level || 'N/A';
        } else if (field.value === 'assigned_doctor_name') {
          // Format assigned doctor with role if available
          const doctorName = value || displayData.assigned_doctor_name || '';
          const doctorRole = displayData.assigned_doctor_role || '';
          patientExportData[field.label] = doctorName
            ? (doctorRole ? `${doctorName} (${doctorRole})` : doctorName)
            : 'Not assigned';
        } else {
          // Default: use value or 'N/A'
          patientExportData[field.label] = (value !== null && value !== undefined && value !== '') ? value : 'N/A';
        }
      });

      const ws1 = XLSX.utils.json_to_sheet([patientExportData]);

      // Apply header styling with different colors for different sections
      // Color ranges based on PATIENT_REGISTRATION_FORM structure
      const totalFields = PATIENT_REGISTRATION_FORM.length;
      applyHeaderStyles(ws1, [
        { start: 0, end: 13, color: '2E86AB' }, // Quick Entry & Registration (Blue) - CR No to Contact Number
        // { start: 14, end: 18, color: '28A745' }, // Personal Info (Green) - Seen in Walk-in to Age Group
        // { start: 19, end: 22, color: '6F42C1' }, // Personal Information (Purple) - Marital Status to No of Children Female
        // { start: 23, end: 27, color: 'FD7E14' }, // Occupation & Education (Orange) - Occupation to Family Type
        // { start: 28, end: 33, color: 'DC3545' }, // Head of Family (Red) - Family Head Name to Family Head Income
        // { start: 34, end: 36, color: '20C997' }, // Distance, Mobility, Referred (Teal)
        // { start: 37, end: 42, color: '6610F2' }, // Address Details (Indigo) - Address Line to Pin Code
        // { start: 43, end: totalFields - 1, color: 'E83E8C' }, // Additional Fields (Pink) - Assigned Doctor fields
      ]);

      XLSX.utils.book_append_sheet(wb, ws1, 'Patient Details');

      // Sheet 2: Clinical Proformas (only if user has permission and is not MWO)
      if (!isMWOUser && canViewClinicalProforma && patientProformas.length > 0) {
        const proformaData = patientProformas.map((proforma, index) => ({
          'Visit #': index + 1,
          'Visit Date': proforma.visit_date ? formatDate(proforma.visit_date) : 'N/A',
          'Visit Type': proforma.visit_type === 'first_visit' ? 'First Visit' : 'Follow-up',
          'Room Number': proforma.room_no || 'N/A',
          'Doctor Name': proforma.doctor_name || 'N/A',
          'Doctor Role': proforma.doctor_role || 'N/A',
          'Case Severity': getCaseSeverityLabel(proforma.case_severity) || 'N/A',
          'Decision': proforma.decision || 'N/A',
          'Doctor Decision': proforma.doctor_decision === 'complex_case' ? 'Complex Case' : (proforma.doctor_decision === 'simple_case' ? 'Simple Case' : 'N/A'),
          'Requires ADL File': proforma.requires_adl_file ? 'Yes' : 'No',
          'Informant Present': proforma.informant_present ? 'Yes' : 'No',
          'Diagnosis': proforma.diagnosis || 'N/A',
          'ICD Code': proforma.icd_code || 'N/A',
          'Disposal': proforma.disposal || 'N/A',
          'Workup Appointment': proforma.workup_appointment ? formatDate(proforma.workup_appointment) : 'N/A',
          'Referred To': proforma.referred_to || 'N/A',
          'Treatment Prescribed': proforma.treatment_prescribed || 'N/A',
          'ADL Reasoning': proforma.adl_reasoning || 'N/A',
          'Created At': proforma.created_at ? formatDateTime(proforma.created_at) : 'N/A',
        }));
        const ws2 = XLSX.utils.json_to_sheet(proformaData);
        applyHeaderStyles(ws2, [{ start: 0, end: 17, color: '2E86AB' }]); // Blue for all columns
        XLSX.utils.book_append_sheet(wb, ws2, 'Clinical Proformas');
      }

      // Sheet 3: ADL Files (only if user has permission and is not MWO)
      if (!isMWOUser && canViewADLFile && patientAdlFiles.length > 0) {
        const adlData = patientAdlFiles.map((file, index) => ({
          'ADL File #': index + 1,
          'ADL Number': file.adl_no || 'N/A',
          'File Status': getFileStatusLabel(file.file_status) || 'N/A',
          'Patient Name': file.patient_name || 'N/A',
          'CR Number': file.cr_no || 'N/A',
          'PSY Number': file.psy_no || 'N/A',
          'Assigned Doctor': file.assigned_doctor_name ? `${file.assigned_doctor_name}${file.assigned_doctor_role ? ` (${file.assigned_doctor_role})` : ''}` : 'N/A',
          'Visit Date': file.proforma_visit_date ? formatDate(file.proforma_visit_date) : 'N/A',
          'Created By': file.created_by_name ? `${file.created_by_name}${file.created_by_role ? ` (${file.created_by_role})` : ''}` : 'N/A',
          'Physical File Location': file.physical_file_location || 'N/A',
          'Total Visits': file.total_visits || 'N/A',
          'File Created Date': file.file_created_date ? formatDate(file.file_created_date) : 'N/A',
          'Last Updated': file.updated_at ? formatDateTime(file.updated_at) : 'N/A',
        }));
        const ws3 = XLSX.utils.json_to_sheet(adlData);
        applyHeaderStyles(ws3, [{ start: 0, end: 11, color: '6F42C1' }]); // Purple for all columns
        XLSX.utils.book_append_sheet(wb, ws3, 'ADL Files');
      }

      // Sheet 4: Prescriptions (only if user has permission and is not MWO)
      if (!isMWOUser && canViewPrescriptions && allPrescriptions.length > 0) {
        const prescriptionData = allPrescriptions.map((prescription, index) => ({
          'Prescription #': index + 1,
          'Visit Date': prescription.visit_date ? formatDate(prescription.visit_date) : 'N/A',
          'Visit Type': prescription.visit_type === 'first_visit' ? 'First Visit' : 'Follow-up',
          'Medicine': prescription.medicine || 'N/A',
          'Dosage': prescription.dosage || 'N/A',
          'When to Take': prescription.when_to_take || prescription.when || 'N/A',
          'Frequency': prescription.frequency || 'N/A',
          'Duration': prescription.duration || 'N/A',
          'Quantity': prescription.quantity || prescription.qty || 'N/A',
          'Details': prescription.details || 'N/A',
          'Notes': prescription.notes || 'N/A',
          'Prescribed At': prescription.created_at ? formatDateTime(prescription.created_at) : 'N/A',
        }));
        const ws4 = XLSX.utils.json_to_sheet(prescriptionData);
        applyHeaderStyles(ws4, [{ start: 0, end: 10, color: '28A745' }]); // Green for all columns
        XLSX.utils.book_append_sheet(wb, ws4, 'Prescriptions');
      }

      // Generate filename with patient name and date
      const patientName = displayData.name || displayData.cr_no || 'Patient';
      const sanitizedName = patientName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const filename = `patient_${sanitizedName}_${new Date().toISOString().split('T')[0]}`;

      // Write the file
      XLSX.writeFile(wb, `${filename}.xlsx`);

      // Show appropriate success message based on role
      if (isMWOUser) {
        toast.success('Patient details exported to Excel successfully (Patient Details only)');
      } else {
        toast.success('Patient details exported to Excel successfully');
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export patient details');
    }
  };

  // Note: canViewPrescriptions is now determined by filled_by_role above

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-400/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="relative z-10 space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Card 1: Patient Details */}
        <Card className="relative shadow-2xl border border-white/40 bg-white/70 backdrop-blur-2xl rounded-3xl overflow-hidden">

        <div
          className="flex items-center justify-between cursor-pointer p-6 border-b border-white/30 backdrop-blur-sm bg-white/30 hover:bg-white/40 transition-all duration-300"
          onClick={() => toggleCard('patient')}
        >
          <div className="flex items-center gap-4">
            <div className="p-3 backdrop-blur-md bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-xl border border-white/30 shadow-lg">
              <FiUser className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Patient Details</h3>
              <p className="text-sm text-gray-600 mt-1">{patient.name} - {patient.cr_no || 'N/A'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handlePrintPatientDetails();
              }}
              className="h-8 w-8 p-0 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border border-blue-200 hover:border-blue-300 shadow-sm hover:shadow-md transition-all duration-200 rounded-lg"
              title="Print Patient Details"
            >
              <FiPrinter className="w-4 h-4 text-blue-600" />
            </Button>
            {expandedCards.patient ? (
              <FiChevronUp className="h-6 w-6 text-gray-500" />
            ) : (
              <FiChevronDown className="h-6 w-6 text-gray-500" />
            )}
          </div>
        </div>

        {expandedCards.patient && (
          <div className="p-6">
            <form>
              {/* Quick Entry Section with Glassmorphism */}
              <div ref={patientDetailsPrintRef} className="relative mb-8">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 rounded-3xl blur-xl"></div>

                <Card
                  title={
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 backdrop-blur-sm rounded-xl border border-white/30 shadow-lg">

                        <FiEdit3 className="w-6 h-6 text-indigo-600" />
                      </div>
                      <span className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">OUT PATIENT CARD</span>
                    </div>
                  }
                  actions={
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleExportPatient}
                      className="px-6 lg:px-8 py-3 bg-green-50 backdrop-blur-md border border-green-200 hover:bg-green-100 hover:border-green-300 text-green-700 font-semibold shadow-sm hover:shadow-md transition-all duration-200"
                    >
                      <FiDownload className="mr-2" />
                      Export to Excel
                    </Button>
                  }
                  className="relative mb-8 shadow-2xl border border-white/30 bg-white/70 backdrop-blur-xl rounded-3xl overflow-hidden">
                  <div className="space-y-8">
                    {/* First Row - Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-indigo-500/5 rounded-xl"></div>
                        <div className="relative backdrop-blur-sm bg-white/40 border border-white/40 rounded-xl p-4 shadow-sm">
                          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                            <FiHash className="w-4 h-4 text-primary-600" />
                            CR No.
                          </label>
                          <p className="text-base font-medium text-gray-900">{displayData.cr_no || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-indigo-500/5 rounded-xl"></div>
                        <div className="relative backdrop-blur-sm bg-white/40 border border-white/40 rounded-xl p-4 shadow-sm">
                          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                            <FiCalendar className="w-4 h-4 text-primary-600" />
                            Date
                          </label>
                          <p className="text-base font-medium text-gray-900">{displayData.date ? formatDate(displayData.date) : 'N/A'}</p>
                        </div>
                      </div>
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-purple-500/5 rounded-xl"></div>
                        <div className="relative backdrop-blur-sm bg-white/40 border border-white/40 rounded-xl p-4 shadow-sm">
                          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                            <FiUser className="w-4 h-4 text-primary-600" />
                            Name
                          </label>
                          <p className="text-base font-medium text-gray-900">{displayData.name || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-pink-500/5 rounded-xl"></div>
                        <div className="relative backdrop-blur-sm bg-white/40 border border-white/40 rounded-xl p-4 shadow-sm">
                          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                            <FiPhone className="w-4 h-4 text-primary-600" />
                            Mobile No.
                          </label>
                          <p className="text-base font-medium text-gray-900">{displayData.contact_number || 'N/A'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Second Row - Age, Sex, Category, Father's Name */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-indigo-500/5 rounded-xl"></div>
                        <div className="relative backdrop-blur-sm bg-white/40 border border-white/40 rounded-xl p-4 shadow-sm">
                          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                            <FiClock className="w-4 h-4 text-primary-600" />
                            Age
                          </label>
                          <p className="text-base font-medium text-gray-900">{displayData.age || 'N/A'}</p>
                      </div>
                      </div>
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-purple-500/5 rounded-xl"></div>
                        <div className="relative backdrop-blur-sm bg-white/40 border border-white/40 rounded-xl p-4 shadow-sm">
                          <label className="text-sm font-semibold text-gray-700 mb-2 block">Sex</label>
                          <p className="text-base font-medium text-gray-900">{displayData.sex || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-pink-500/5 rounded-xl"></div>
                        <div className="relative backdrop-blur-sm bg-white/40 border border-white/40 rounded-xl p-4 shadow-sm">
                          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                          <FiShield className="w-4 h-4 text-primary-600" />
                          Category
                        </label>
                          <p className="text-base font-medium text-gray-900">{displayData.category || 'N/A'}</p>
                      </div>
                      </div>
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-pink-500/5 to-rose-500/5 rounded-xl"></div>
                        <div className="relative backdrop-blur-sm bg-white/40 border border-white/40 rounded-xl p-4 shadow-sm">
                          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                            <FiUsers className="w-4 h-4 text-primary-600" />
                            Father's Name
                          </label>
                          <p className="text-base font-medium text-gray-900">{displayData.father_name || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                    {/* Fourth Row - Department, Unit/Consit, Room No., Serial No. */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-indigo-500/5 rounded-xl"></div>
                        <div className="relative backdrop-blur-sm bg-white/40 border border-white/40 rounded-xl p-4 shadow-sm">
                          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                            <FiLayers className="w-4 h-4 text-primary-600" />
                            Department
                          </label>
                          <p className="text-base font-medium text-gray-900">{displayData.department || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-purple-500/5 rounded-xl"></div>
                        <div className="relative backdrop-blur-sm bg-white/40 border border-white/40 rounded-xl p-4 shadow-sm">
                          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                            <FiUsers className="w-4 h-4 text-primary-600" />
                            Unit/Consit
                          </label>
                          <p className="text-base font-medium text-gray-900">{displayData.unit_consit || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-pink-500/5 rounded-xl"></div>
                        <div className="relative backdrop-blur-sm bg-white/40 border border-white/40 rounded-xl p-4 shadow-sm">
                          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                            <FiHome className="w-4 h-4 text-primary-600" />
                            Room No.
                          </label>
                          <p className="text-base font-medium text-gray-900">{displayData.room_no || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-pink-500/5 to-rose-500/5 rounded-xl"></div>
                        <div className="relative backdrop-blur-sm bg-white/40 border border-white/40 rounded-xl p-4 shadow-sm">
                          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                            <FiHash className="w-4 h-4 text-primary-600" />
                            Serial No.
                          </label>
                          <p className="text-base font-medium text-gray-900">{displayData.serial_no || 'N/A'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Fifth Row - File No., Unit Days */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-indigo-500/5 rounded-xl"></div>
                        <div className="relative backdrop-blur-sm bg-white/40 border border-white/40 rounded-xl p-4 shadow-sm">
                          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                            <FiFileText className="w-4 h-4 text-primary-600" />
                            File No.
                          </label>
                          <p className="text-base font-medium text-gray-900">{displayData.file_no || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-purple-500/5 rounded-xl"></div>
                        <div className="relative backdrop-blur-sm bg-white/40 border border-white/40 rounded-xl p-4 shadow-sm">
                          <label className="text-sm font-semibold text-gray-700 mb-2 block">Unit Days</label>
                          <p className="text-base font-medium text-gray-900">{displayData.unit_days || 'N/A'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Address Details */}
                    <div className="space-y-6 pt-6 border-t border-white/30">
                      <h4 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                        <div className="p-2.5 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 backdrop-blur-sm rounded-xl border border-white/30 shadow-md">
                          <FiMapPin className="w-5 h-5 text-blue-600" />
                        </div>
                        Address Details
                      </h4>

                      <div className="space-y-6">
                        {/* Address Line */}
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-indigo-500/5 rounded-xl"></div>
                          <div className="relative backdrop-blur-sm bg-white/40 border border-white/40 rounded-xl p-4 shadow-sm">
                            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                              <FiHome className="w-4 h-4 text-primary-600" />
                              Address Line (House No., Street, Locality)
                            </label>
                            <p className="text-base font-medium text-gray-900">{displayData.address_line || 'N/A'}</p>
                          </div>
                        </div>

                        {/* Location Fields */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-indigo-500/5 rounded-xl"></div>
                            <div className="relative backdrop-blur-sm bg-white/40 border border-white/40 rounded-xl p-4 shadow-sm">
                              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                                <FiGlobe className="w-4 h-4 text-primary-600" />
                                Country
                              </label>
                              <p className="text-base font-medium text-gray-900">{displayData.country || 'N/A'}</p>
                            </div>
                          </div>
                          <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-purple-500/5 rounded-xl"></div>
                            <div className="relative backdrop-blur-sm bg-white/40 border border-white/40 rounded-xl p-4 shadow-sm">
                              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                                <FiMapPin className="w-4 h-4 text-primary-600" />
                                State
                              </label>
                              <p className="text-base font-medium text-gray-900">{displayData.state || 'N/A'}</p>
                            </div>
                          </div>
                          <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-pink-500/5 rounded-xl"></div>
                            <div className="relative backdrop-blur-sm bg-white/40 border border-white/40 rounded-xl p-4 shadow-sm">
                              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                                <FiLayers className="w-4 h-4 text-primary-600" />
                                District
                              </label>
                              <p className="text-base font-medium text-gray-900">{displayData.district || 'N/A'}</p>
                            </div>
                          </div>
                          <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-pink-500/5 to-rose-500/5 rounded-xl"></div>
                            <div className="relative backdrop-blur-sm bg-white/40 border border-white/40 rounded-xl p-4 shadow-sm">
                              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                                <FiHome className="w-4 h-4 text-primary-600" />
                                City/Town/Village
                              </label>
                              <p className="text-base font-medium text-gray-900">{displayData.city || 'N/A'}</p>
                            </div>
                          </div>
                        </div>

                        {/* Pin Code Row */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-indigo-500/5 rounded-xl"></div>
                            <div className="relative backdrop-blur-sm bg-white/40 border border-white/40 rounded-xl p-4 shadow-sm">
                              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                                <FiHash className="w-4 h-4 text-primary-600" />
                                Pin Code
                              </label>
                              <p className="text-base font-medium text-gray-900">{displayData.pin_code || 'N/A'}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Basic Information with Glassmorphism */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10 rounded-3xl blur-xl"></div>
                <Card
                  title={
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 backdrop-blur-sm rounded-xl border border-white/30 shadow-lg">
                        <FiUser className="w-6 h-6 text-emerald-600" />
                      </div>
                      <span className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">OUT-PATIENT RECORD</span>
                    </div>
                  }
                  className="relative mb-8 shadow-2xl border border-white/30 bg-white/70 backdrop-blur-xl rounded-3xl overflow-visible"
                >
                  <div className="space-y-8">
                    {/* Patient Identification */}
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-indigo-500/5 rounded-xl"></div>
                          <div className="relative backdrop-blur-sm bg-white/40 border border-white/40 rounded-xl p-4 shadow-sm">
                            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                              <FiCalendar className="w-4 h-4 text-primary-600" />
                              Seen in Walk-in-on
                            </label>
                            <p className="text-base font-medium text-gray-900">{displayData.seen_in_walk_in_on ? formatDate(displayData.seen_in_walk_in_on) : 'N/A'}</p>
                        </div>
                        </div>
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-purple-500/5 rounded-xl"></div>
                          <div className="relative backdrop-blur-sm bg-white/40 border border-white/40 rounded-xl p-4 shadow-sm">
                            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                              <FiCalendar className="w-4 h-4 text-primary-600" />
                              Worked up on
                            </label>
                            <p className="text-base font-medium text-gray-900">{displayData.worked_up_on ? formatDate(displayData.worked_up_on) : 'N/A'}</p>
                          </div>
                        </div>
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-pink-500/5 rounded-xl"></div>
                          <div className="relative backdrop-blur-sm bg-white/40 border border-white/40 rounded-xl p-4 shadow-sm">
                            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                              <FiHash className="w-4 h-4 text-primary-600" />
                              CR No.
                            </label>
                            <p className="text-base font-medium text-gray-900">{displayData.cr_no || 'N/A'}</p>
                          </div>
                        </div>
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-to-r from-pink-500/5 to-rose-500/5 rounded-xl"></div>
                          <div className="relative backdrop-blur-sm bg-white/40 border border-white/40 rounded-xl p-4 shadow-sm">
                            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                              <FiFileText className="w-4 h-4 text-primary-600" />
                              Psy. No.
                            </label>
                            <p className="text-base font-medium text-gray-900">{displayData.psy_no || 'N/A'}</p>
                          </div>
                        </div>
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-indigo-500/5 rounded-xl"></div>
                          <div className="relative backdrop-blur-sm bg-white/40 border border-white/40 rounded-xl p-4 shadow-sm">
                            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                              <FiHeart className="w-4 h-4 text-primary-600" />
                              Special Clinic No.
                            </label>
                            <p className="text-base font-medium text-gray-900">{displayData.special_clinic_no || 'N/A'}</p>
                          </div>
                        </div>
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-purple-500/5 rounded-xl"></div>
                          <div className="relative backdrop-blur-sm bg-white/40 border border-white/40 rounded-xl p-4 shadow-sm">
                            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                              <FiUser className="w-4 h-4 text-primary-600" />
                              Name
                            </label>
                            <p className="text-base font-medium text-gray-900">{displayData.name || 'N/A'}</p>
                          </div>
                        </div>
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-pink-500/5 rounded-xl"></div>
                          <div className="relative backdrop-blur-sm bg-white/40 border border-white/40 rounded-xl p-4 shadow-sm">
                            <label className="text-sm font-semibold text-gray-700 mb-2 block">Sex</label>
                            <p className="text-base font-medium text-gray-900">{displayData.sex || 'N/A'}</p>
                          </div>
                        </div>
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-to-r from-pink-500/5 to-rose-500/5 rounded-xl"></div>
                          <div className="relative backdrop-blur-sm bg-white/40 border border-white/40 rounded-xl p-4 shadow-sm">
                            <label className="text-sm font-semibold text-gray-700 mb-2 block">Age Group</label>
                            <p className="text-base font-medium text-gray-900">{displayData.age_group || 'N/A'}</p>
                          </div>
                        </div>
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-indigo-500/5 rounded-xl"></div>
                          <div className="relative backdrop-blur-sm bg-white/40 border border-white/40 rounded-xl p-4 shadow-sm">
                            <label className="text-sm font-semibold text-gray-700 mb-2 block">Marital Status</label>
                            <p className="text-base font-medium text-gray-900">{displayData.marital_status || 'N/A'}</p>
                          </div>
                        </div>
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-purple-500/5 rounded-xl"></div>
                          <div className="relative backdrop-blur-sm bg-white/40 border border-white/40 rounded-xl p-4 shadow-sm">
                            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                              <FiCalendar className="w-4 h-4 text-primary-600" />
                              Year of marriage
                            </label>
                            <p className="text-base font-medium text-gray-900">{displayData.year_of_marriage || 'N/A'}</p>
                          </div>
                        </div>
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-pink-500/5 rounded-xl"></div>
                          <div className="relative backdrop-blur-sm bg-white/40 border border-white/40 rounded-xl p-4 shadow-sm">
                            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                              <FiUsers className="w-4 h-4 text-primary-600" />
                              No. of Children: M
                            </label>
                            <p className="text-base font-medium text-gray-900">{displayData.no_of_children_male || 'N/A'}</p>
                          </div>
                        </div>
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-to-r from-pink-500/5 to-rose-500/5 rounded-xl"></div>
                          <div className="relative backdrop-blur-sm bg-white/40 border border-white/40 rounded-xl p-4 shadow-sm">
                            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                              <FiUsers className="w-4 h-4 text-primary-600" />
                              No. of Children: F
                            </label>
                            <p className="text-base font-medium text-gray-900">{displayData.no_of_children_female || 'N/A'}</p>
                          </div>
                        </div>
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-indigo-500/5 rounded-xl"></div>
                          <div className="relative backdrop-blur-sm bg-white/40 border border-white/40 rounded-xl p-4 shadow-sm">
                            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                              <FiBriefcase className="w-4 h-4 text-primary-600" />
                              Occupation
                            </label>
                            <p className="text-base font-medium text-gray-900">{displayData.occupation || 'N/A'}</p>
                          </div>
                        </div>
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-purple-500/5 rounded-xl"></div>
                          <div className="relative backdrop-blur-sm bg-white/40 border border-white/40 rounded-xl p-4 shadow-sm">
                            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                              <FiBookOpen className="w-4 h-4 text-primary-600" />
                              Education
                            </label>
                            <p className="text-base font-medium text-gray-900">{displayData.education || displayData.education_level || 'N/A'}</p>
                          </div>
                        </div>
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-pink-500/5 rounded-xl"></div>
                          <div className="relative backdrop-blur-sm bg-white/40 border border-white/40 rounded-xl p-4 shadow-sm">
                            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                              <FiTrendingUp className="w-4 h-4 text-primary-600" />
                              Family Income (₹)
                            </label>
                            <p className="text-base font-medium text-gray-900">{displayData.family_income || 'N/A'}</p>
                          </div>
                        </div>
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-to-r from-pink-500/5 to-rose-500/5 rounded-xl"></div>
                          <div className="relative backdrop-blur-sm bg-white/40 border border-white/40 rounded-xl p-4 shadow-sm">
                            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                              <FiTrendingUp className="w-4 h-4 text-primary-600" />
                              Patient Income (₹)
                            </label>
                            <p className="text-base font-medium text-gray-900">{displayData.income || displayData.patient_income || 'N/A'}</p>
                          </div>
                        </div>
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-indigo-500/5 rounded-xl"></div>
                          <div className="relative backdrop-blur-sm bg-white/40 border border-white/40 rounded-xl p-4 shadow-sm">
                            <label className="text-sm font-semibold text-gray-700 mb-2 block">Religion</label>
                            <p className="text-base font-medium text-gray-900">{displayData.religion || 'N/A'}</p>
                          </div>
                        </div>
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-purple-500/5 rounded-xl"></div>
                          <div className="relative backdrop-blur-sm bg-white/40 border border-white/40 rounded-xl p-4 shadow-sm">
                            <label className="text-sm font-semibold text-gray-700 mb-2 block">Family Type</label>
                            <p className="text-base font-medium text-gray-900">{displayData.family_type || 'N/A'}</p>
                          </div>
                        </div>
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-pink-500/5 rounded-xl"></div>
                          <div className="relative backdrop-blur-sm bg-white/40 border border-white/40 rounded-xl p-4 shadow-sm">
                            <label className="text-sm font-semibold text-gray-700 mb-2 block">Locality</label>
                            <p className="text-base font-medium text-gray-900">{displayData.locality || 'N/A'}</p>
                          </div>
                        </div>
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-to-r from-pink-500/5 to-rose-500/5 rounded-xl"></div>
                          <div className="relative backdrop-blur-sm bg-white/40 border border-white/40 rounded-xl p-4 shadow-sm">
                            <label className="text-sm font-semibold text-gray-700 mb-2 block">Assigned Doctor</label>
                            <p className="text-base font-medium text-gray-900">{displayData.assigned_doctor_name ? `${displayData.assigned_doctor_name}${displayData.assigned_doctor_role ? ` (${displayData.assigned_doctor_role})` : ''}` : 'Not assigned'}</p>
                          </div>
                        </div>
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-indigo-500/5 rounded-xl"></div>
                          <div className="relative backdrop-blur-sm bg-white/40 border border-white/40 rounded-xl p-4 shadow-sm">
                            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                              <FiHome className="w-4 h-4 text-primary-600" />
                              Assigned Room
                            </label>
                            <p className="text-base font-medium text-gray-900">{displayData.assigned_room || 'N/A'}</p>
                          </div>
                        </div>
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-purple-500/5 rounded-xl"></div>
                          <div className="relative backdrop-blur-sm bg-white/40 border border-white/40 rounded-xl p-4 shadow-sm">
                            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                              <FiUser className="w-4 h-4 text-primary-600" />
                              Family Head Name
                            </label>
                            <p className="text-base font-medium text-gray-900">{displayData.head_name || 'N/A'}</p>
                          </div>
                        </div>
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-pink-500/5 rounded-xl"></div>
                          <div className="relative backdrop-blur-sm bg-white/40 border border-white/40 rounded-xl p-4 shadow-sm">
                            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                              <FiClock className="w-4 h-4 text-primary-600" />
                              Family Head Age
                            </label>
                            <p className="text-base font-medium text-gray-900">{displayData.head_age || 'N/A'}</p>
                          </div>
                        </div>
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-to-r from-pink-500/5 to-rose-500/5 rounded-xl"></div>
                          <div className="relative backdrop-blur-sm bg-white/40 border border-white/40 rounded-xl p-4 shadow-sm">
                            <label className="text-sm font-semibold text-gray-700 mb-2 block">Relationship With Family Head</label>
                            <p className="text-base font-medium text-gray-900">{displayData.head_relationship || 'N/A'}</p>
                          </div>
                        </div>
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-indigo-500/5 rounded-xl"></div>
                          <div className="relative backdrop-blur-sm bg-white/40 border border-white/40 rounded-xl p-4 shadow-sm">
                            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                              <FiBookOpen className="w-4 h-4 text-primary-600" />
                              Family Head Education
                            </label>
                            <p className="text-base font-medium text-gray-900">{displayData.head_education || 'N/A'}</p>
                          </div>
                        </div>
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-purple-500/5 rounded-xl"></div>
                          <div className="relative backdrop-blur-sm bg-white/40 border border-white/40 rounded-xl p-4 shadow-sm">
                            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                              <FiBriefcase className="w-4 h-4 text-primary-600" />
                              Family Head Occupation
                            </label>
                            <p className="text-base font-medium text-gray-900">{displayData.head_occupation || 'N/A'}</p>
                          </div>
                        </div>
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-pink-500/5 rounded-xl"></div>
                          <div className="relative backdrop-blur-sm bg-white/40 border border-white/40 rounded-xl p-4 shadow-sm">
                            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                              <FiTrendingUp className="w-4 h-4 text-primary-600" />
                              Family Head Income (₹)
                            </label>
                            <p className="text-base font-medium text-gray-900">{displayData.head_income || 'N/A'}</p>
                          </div>
                        </div>
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-to-r from-pink-500/5 to-rose-500/5 rounded-xl"></div>
                          <div className="relative backdrop-blur-sm bg-white/40 border border-white/40 rounded-xl p-4 shadow-sm">
                            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                              <FiNavigation className="w-4 h-4 text-primary-600" />
                              Exact distance from hospital
                            </label>
                            <p className="text-base font-medium text-gray-900">{displayData.distance_from_hospital || 'N/A'}</p>
                          </div>
                        </div>
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-indigo-500/5 rounded-xl"></div>
                          <div className="relative backdrop-blur-sm bg-white/40 border border-white/40 rounded-xl p-4 shadow-sm">
                            <label className="text-sm font-semibold text-gray-700 mb-2 block">Mobility of the patient</label>
                            <p className="text-base font-medium text-gray-900">{displayData.mobility || 'N/A'}</p>
                          </div>
                        </div>
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-purple-500/5 rounded-xl"></div>
                          <div className="relative backdrop-blur-sm bg-white/40 border border-white/40 rounded-xl p-4 shadow-sm">
                            <label className="text-sm font-semibold text-gray-700 mb-2 block">Referred by</label>
                            <p className="text-base font-medium text-gray-900">{displayData.referred_by || 'N/A'}</p>
                          </div>
                        </div>
                      </div>

                         {/* Permanent Address Section */}
                         <div className="space-y-6 pt-6 border-t border-white/30">
                           <h4 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                             <div className="p-2.5 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 backdrop-blur-sm rounded-xl border border-white/30 shadow-md">
                               <FiMapPin className="w-5 h-5 text-blue-600" />
                             </div>
                             Permanent Address
                           </h4>

                           <div className="space-y-6">
                             <div className="relative">
                               <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-indigo-500/5 rounded-xl"></div>
                               <div className="relative backdrop-blur-sm bg-white/40 border border-white/40 rounded-xl p-4 shadow-sm">
                                 <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                                   <FiHome className="w-4 h-4 text-primary-600" />
                                   Address Line
                                 </label>
                                 <p className="text-base font-medium text-gray-900">{formData.permanent_address_line_1 || 'N/A'}</p>
                               </div>
                             </div>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                               <div className="relative">
                                 <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-indigo-500/5 rounded-xl"></div>
                                 <div className="relative backdrop-blur-sm bg-white/40 border border-white/40 rounded-xl p-4 shadow-sm">
                                   <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                                     <FiHome className="w-4 h-4 text-primary-600" />
                                     City/Town/Village
                                   </label>
                                   <p className="text-base font-medium text-gray-900">{formData.permanent_city_town_village || 'N/A'}</p>
                                 </div>
                               </div>
                               <div className="relative">
                                 <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-purple-500/5 rounded-xl"></div>
                                 <div className="relative backdrop-blur-sm bg-white/40 border border-white/40 rounded-xl p-4 shadow-sm">
                                   <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                                     <FiLayers className="w-4 h-4 text-primary-600" />
                                     District
                                   </label>
                                   <p className="text-base font-medium text-gray-900">{formData.permanent_district || 'N/A'}</p>
                                 </div>
                               </div>
                               <div className="relative">
                                 <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-pink-500/5 rounded-xl"></div>
                                 <div className="relative backdrop-blur-sm bg-white/40 border border-white/40 rounded-xl p-4 shadow-sm">
                                   <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                                     <FiMapPin className="w-4 h-4 text-primary-600" />
                                     State
                                   </label>
                                   <p className="text-base font-medium text-gray-900">{formData.permanent_state || 'N/A'}</p>
                                 </div>
                               </div>
                               <div className="relative">
                                 <div className="absolute inset-0 bg-gradient-to-r from-pink-500/5 to-rose-500/5 rounded-xl"></div>
                                 <div className="relative backdrop-blur-sm bg-white/40 border border-white/40 rounded-xl p-4 shadow-sm">
                                   <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                                     <FiHash className="w-4 h-4 text-primary-600" />
                                     Pin Code
                                   </label>
                                   <p className="text-base font-medium text-gray-900">{formData.permanent_pin_code || 'N/A'}</p>
                                 </div>
                               </div>
                               <div className="relative">
                                 <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-indigo-500/5 rounded-xl"></div>
                                 <div className="relative backdrop-blur-sm bg-white/40 border border-white/40 rounded-xl p-4 shadow-sm">
                                   <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                                     <FiGlobe className="w-4 h-4 text-primary-600" />
                                     Country
                                   </label>
                                   <p className="text-base font-medium text-gray-900">{formData.permanent_country || 'N/A'}</p>
                                 </div>
                               </div>
                             </div>
                           </div>
                         </div>

                         {/* Present Address Section */}
                         <div className="space-y-6 pt-6 border-t border-white/30">
                           <h4 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                             <div className="p-2.5 bg-gradient-to-br from-orange-500/20 to-amber-500/20 backdrop-blur-sm rounded-xl border border-white/30 shadow-md">
                               <FiMapPin className="w-5 h-5 text-orange-600" />
                             </div>
                             Present Address
                           </h4>

                          <div className="space-y-6">
                            <div className="relative">
                              <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 to-amber-500/5 rounded-xl"></div>
                              <div className="relative backdrop-blur-sm bg-white/40 border border-white/40 rounded-xl p-4 shadow-sm">
                                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                                  <FiHome className="w-4 h-4 text-primary-600" />
                                  Address Line
                                </label>
                                <p className="text-base font-medium text-gray-900">{formData.present_address_line_1 || 'N/A'}</p>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="relative">
                                <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 to-amber-500/5 rounded-xl"></div>
                                <div className="relative backdrop-blur-sm bg-white/40 border border-white/40 rounded-xl p-4 shadow-sm">
                                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                                    <FiHome className="w-4 h-4 text-primary-600" />
                                    City/Town/Village
                                  </label>
                                  <p className="text-base font-medium text-gray-900">{formData.present_city_town_village || 'N/A'}</p>
                                </div>
                              </div>
                              <div className="relative">
                                <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 to-yellow-500/5 rounded-xl"></div>
                                <div className="relative backdrop-blur-sm bg-white/40 border border-white/40 rounded-xl p-4 shadow-sm">
                                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                                    <FiLayers className="w-4 h-4 text-primary-600" />
                                    District
                                  </label>
                                  <p className="text-base font-medium text-gray-900">{formData.present_district || 'N/A'}</p>
                                </div>
                              </div>
                              <div className="relative">
                                <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/5 to-orange-500/5 rounded-xl"></div>
                                <div className="relative backdrop-blur-sm bg-white/40 border border-white/40 rounded-xl p-4 shadow-sm">
                                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                                    <FiMapPin className="w-4 h-4 text-primary-600" />
                                    State
                                  </label>
                                  <p className="text-base font-medium text-gray-900">{formData.present_state || 'N/A'}</p>
                                </div>
                              </div>
                              <div className="relative">
                                <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 to-amber-500/5 rounded-xl"></div>
                                <div className="relative backdrop-blur-sm bg-white/40 border border-white/40 rounded-xl p-4 shadow-sm">
                                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                                    <FiHash className="w-4 h-4 text-primary-600" />
                                    Pin Code
                                  </label>
                                  <p className="text-base font-medium text-gray-900">{formData.present_pin_code || 'N/A'}</p>
                                </div>
                              </div>
                              <div className="relative">
                                <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 to-yellow-500/5 rounded-xl"></div>
                                <div className="relative backdrop-blur-sm bg-white/40 border border-white/40 rounded-xl p-4 shadow-sm">
                                  <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                                    <FiGlobe className="w-4 h-4 text-primary-600" />
                                    Country
                                  </label>
                                  <p className="text-base font-medium text-gray-900">{formData.present_country || 'N/A'}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Local Address Section */}
                        <div className="space-y-6 pt-6 border-t border-white/30">
                          <h4 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                            <div className="p-2.5 bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-sm rounded-xl border border-white/30 shadow-md">
                              <FiNavigation className="w-5 h-5 text-purple-600" />
                            </div>
                            Local Address
                          </h4>

                          <div className="space-y-6">
                            <div className="relative">
                              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-pink-500/5 rounded-xl"></div>
                              <div className="relative backdrop-blur-sm bg-white/40 border border-white/40 rounded-xl p-4 shadow-sm">
                                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                                  <FiHome className="w-4 h-4 text-primary-600" />
                                  Local Address
                                </label>
                                <p className="text-base font-medium text-gray-900">{formData.local_address || 'N/A'}</p>
                          </div>
                            </div>
                            <div className="relative">
                              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-indigo-500/5 rounded-xl"></div>
                              <div className="relative backdrop-blur-sm bg-white/40 border border-white/40 rounded-xl p-4 shadow-sm">
                                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                                  <FiUser className="w-4 h-4 text-primary-600" />
                                  Assigned Doctor
                                </label>
                                <p className="text-base font-medium text-gray-900">{formData.assigned_doctor_name || displayData.assigned_doctor_name || 'N/A'}</p>
                              </div>
                            </div>
                            <div className="relative">
                              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-purple-500/5 rounded-xl"></div>
                              <div className="relative backdrop-blur-sm bg-white/40 border border-white/40 rounded-xl p-4 shadow-sm">
                                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                                  <FiHome className="w-4 h-4 text-primary-600" />
                                  Assigned Room
                                </label>
                                <p className="text-base font-medium text-gray-900">{formData.assigned_room || 'N/A'}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-white/30 my-6"></div>


                  </div>
                </Card>
              </div>
              
            </form>


          </div>
        )}
       
      </Card>

      {/* Card 2: Walk-in Clinical Proforma - Show only if filled_by_role is Admin, JR, or SR */}
      {canViewClinicalProforma && (
        <Card className="relative shadow-2xl border border-white/40 bg-white/70 backdrop-blur-2xl rounded-3xl overflow-hidden">
          <div
            className="flex items-center justify-between cursor-pointer p-6 border-b border-white/30 backdrop-blur-sm bg-white/30 hover:bg-white/40 transition-all duration-300"
            onClick={() => toggleCard('clinical')}
          >
            <div className="flex items-center gap-4">
              <div className="p-3 backdrop-blur-md bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl border border-white/30 shadow-lg">
                <FiFileText className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Walk-in Clinical Proforma</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {patientProformas.length > 0
                    ? `${patientProformas.length} record${patientProformas.length > 1 ? 's' : ''} found`
                    : 'No clinical records'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrintClinicalProforma();
                }}
                className="h-8 w-8 p-0 bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 border border-green-200 hover:border-green-300 shadow-sm hover:shadow-md transition-all duration-200 rounded-lg"
                title="Print Walk-in Clinical Proforma"
              >
                <FiPrinter className="w-4 h-4 text-green-600" />
              </Button>
              {expandedCards.clinical ? (
                <FiChevronUp className="h-6 w-6 text-gray-500" />
              ) : (
                <FiChevronDown className="h-6 w-6 text-gray-500" />
              )}
            </div>
          </div>

          {expandedCards.clinical && (
            <div className="p-6">
              {patientProformas.length > 0 ? (
                <>
                <ClinicalProformaDetails proforma={patientProformas[0]} />
                </>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <FiFileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-base">No clinical proforma records found</p>
                </div>
              )}
            </div>
          )}
        </Card>
      )}
      {/* Card 3: Additional Details (ADL File) - Show card even if empty, as long as user has permission */}
      {canViewADLFile && (
        <Card className="relative shadow-2xl border border-white/40 bg-white/70 backdrop-blur-2xl rounded-3xl overflow-hidden">
          <div
            className="flex items-center justify-between cursor-pointer p-6 border-b border-white/30 backdrop-blur-sm bg-white/30 hover:bg-white/40 transition-all duration-300"
            onClick={() => toggleCard('adl')}
          >
            <div className="flex items-center gap-4">
              <div className="p-3 backdrop-blur-md bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl border border-white/30 shadow-lg">
                <FiFolder className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Additional Details (ADL File)</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {patientAdlFiles.length > 0
                    ? `${patientAdlFiles.length} file${patientAdlFiles.length > 1 ? 's' : ''} found`
                    : 'No ADL files'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrintADL();
                }}
                className="h-8 w-8 p-0 bg-gradient-to-r from-purple-50 to-indigo-50 hover:from-purple-100 hover:to-indigo-100 border border-purple-200 hover:border-purple-300 shadow-sm hover:shadow-md transition-all duration-200 rounded-lg"
                title="Print Out-Patient Intake Record"
              >
                <FiPrinter className="w-4 h-4 text-purple-600" />
              </Button>
              {expandedCards.adl ? (
                <FiChevronUp className="h-6 w-6 text-gray-500" />
              ) : (
                <FiChevronDown className="h-6 w-6 text-gray-500" />
              )}
            </div>
          </div>

          {expandedCards.adl && (
            <div className="p-6">
              {patientAdlFiles.length > 0 ? (
              
                <ViewADL adlFiles={patientAdlFiles[0]}/>
               
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <FiFolder className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-base">No ADL files found</p>
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Card 4: Prescription History - Show only if current user is Admin, JR, or SR */}
      {canViewPrescriptions && (
        <Card className="relative shadow-2xl border border-white/40 bg-white/70 backdrop-blur-2xl rounded-3xl overflow-hidden">
          <div
            className="flex items-center justify-between cursor-pointer p-6 border-b border-white/30 backdrop-blur-sm bg-white/30 hover:bg-white/40 transition-all duration-300"
            onClick={() => toggleCard('prescriptions')}
          >
            <div className="flex items-center gap-4">
              <div className="p-3 backdrop-blur-md bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-xl border border-white/30 shadow-lg">
                <FiPackage className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Prescription History</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {allPrescriptions.length > 0
                    ? `${allPrescriptions.length} prescription${allPrescriptions.length > 1 ? 's' : ''} across ${Object.keys(prescriptionsByVisit).length} visit${Object.keys(prescriptionsByVisit).length > 1 ? 's' : ''}`
                    : 'No prescriptions found'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrintPrescription();
                }}
                className="h-8 w-8 p-0 bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 border border-amber-200 hover:border-amber-300 shadow-sm hover:shadow-md transition-all duration-200 rounded-lg"
                title="Print Prescription History"
              >
                <FiPrinter className="w-4 h-4 text-amber-600" />
              </Button>
              {expandedCards.prescriptions ? (
                <FiChevronUp className="h-6 w-6 text-gray-500" />
              ) : (
                <FiChevronDown className="h-6 w-6 text-gray-500" />
              )}
            </div>
          </div>

          {expandedCards.prescriptions && (
            <div className="p-6">
              {allPrescriptions.length > 0 ? (

                
                <PrescriptionView prescription={allPrescriptions[0]} clinicalProformaId={proformaIds[0]} patientId={patient?.id}/>
              
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <FiPackage className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-base">No prescription history found</p>
                  <p className="text-sm text-gray-400 mt-1">Prescriptions will appear here once medications are prescribed</p>
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Patient Documents & Files Preview Section */}
      {/* {patient?.id && existingFiles && existingFiles.length > 0 && (
        <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm">
          <div className="p-6">
            <h4 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-sm rounded-xl border border-white/30 shadow-md">
                <FiFileText className="w-5 h-5 text-purple-600" />
              </div>
              Patient Documents & Files
            </h4>
            <FilePreview
              files={existingFiles}
              canDelete={false}
              baseUrl={import.meta.env.VITE_API_URL || 'http://localhost:2025/api'}
            />
          </div>
        </Card>
      )} */}

<div className="flex mt-4 flex-col sm:flex-row justify-end gap-4">

<Button
  type="button"
  variant="outline"
  onClick={(() => navigate('/patients'))}
  className="px-6 lg:px-8 py-3 bg-white/60 backdrop-blur-md border border-white/30 hover:bg-white/80 hover:border-gray-300/50 text-gray-800 font-semibold shadow-sm hover:shadow-md transition-all duration-200"
>
  <FiX className="mr-2" />
  Cancel
</Button>
<Button
  type="button"
  onClick={() => {
    if (returnTab) {
      navigate(`/clinical-today-patients${returnTab === 'existing' ? '?tab=existing' : ''}`);
    } else {
      navigate("/patients");
    }
  }}
  className="px-6 lg:px-8 py-3 bg-gradient-to-r from-primary-600 via-indigo-600 to-blue-600 hover:from-primary-700 hover:via-indigo-700 hover:to-blue-700 text-white font-bold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
>
  <FiSave className="mr-2" />
Print All
</Button>
<Button
  type="submit"
  onClick={() => {
    if (returnTab) {
      navigate(`/clinical-today-patients${returnTab === 'existing' ? '?tab=existing' : ''}`);
    } else {
      navigate("/patients");
    }
  }}
  className="px-6 lg:px-8 py-3 bg-gradient-to-r from-primary-600 via-indigo-600 to-blue-600 hover:from-primary-700 hover:via-indigo-700 hover:to-blue-700 text-white font-bold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
>
  <FiSave className="mr-2" />
  View All Patient
</Button>
</div>
      </div>
    </div>
  );
};

export default PatientDetailsView;
