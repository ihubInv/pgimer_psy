import { Link, useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { useRef } from 'react';
import { toast } from 'react-toastify';
import { FiEdit, FiTrash2, FiArrowLeft, FiPrinter, FiFileText, FiActivity } from 'react-icons/fi';
import {
  useDeleteClinicalProformaMutation,
  useGetClinicalProformaByIdQuery,
} from '../../features/clinical/clinicalApiSlice';
import { useGetADLFileByIdQuery } from '../../features/adl/adlApiSlice';
import { useGetPatientFilesQuery } from '../../features/patients/patientFilesApiSlice';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Badge from '../../components/Badge';
import LoadingSpinner from '../../components/LoadingSpinner';
import FilePreview from '../../components/FilePreview';
import { formatDate } from '../../utils/formatters';
import { getDoctorDecisionLabel } from '../../utils/enumMappings';
import { useGetPatientVisitHistoryQuery } from '../../features/patients/patientsApiSlice';
import { useGetClinicalProformaByPatientIdQuery } from '../../features/clinical/clinicalApiSlice';
import PatientClinicalHistory from '../../components/PatientClinicalHistory';

const ClinicalProformaDetails = ({ proforma: propProforma }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { id: routeId } = useParams(); // Get id from route params
  const returnTab = searchParams.get('returnTab'); // Get returnTab from URL
  
  // Fetch proforma data if accessed via route (no prop provided)
  const { data: proformaData, isLoading: isLoadingProforma, error: proformaError } = useGetClinicalProformaByIdQuery(
    routeId,
    { skip: !routeId || !!propProforma } // Skip if prop is provided or no routeId
  );
  
  // Use prop if provided, otherwise use fetched data
  const proforma = propProforma || proformaData?.data?.proforma;
  
  // Get proforma ID
  const id = proforma?.id || routeId;
  
  // Delete mutation
  const [deleteProforma, { isLoading: isDeleting }] = useDeleteClinicalProformaMutation();
  
  // Fetch ADL file data if this is a complex case
  const isComplexCase = proforma?.doctor_decision === 'complex_case' && proforma?.adl_file_id;
  const { data: adlFileData, isLoading: adlFileLoading } = useGetADLFileByIdQuery(
    proforma?.adl_file_id,
    { skip: !isComplexCase }
  );
  const adlFile = adlFileData?.data?.file;
  
  // Fetch patient files for preview
  const patientId = proforma?.patient_id;
  const { data: patientFilesData } = useGetPatientFilesQuery(patientId, {
    skip: !patientId
  });
  const existingFiles = patientFilesData?.data?.files || [];

  // Fetch patient visit history and clinical proformas to show history
  const { data: visitHistoryData, isLoading: isLoadingVisitHistory } = useGetPatientVisitHistoryQuery(
    patientId,
    { skip: !patientId }
  );
  const { data: patientClinicalData } = useGetClinicalProformaByPatientIdQuery(
    patientId,
    { skip: !patientId }
  );
  const visitHistory = visitHistoryData || [];
  const patientProformas = patientClinicalData?.data?.proformas || [];
  // Filter out current proforma from history
  const otherProformas = patientProformas.filter(p => p.id !== proforma?.id);
  const hasHistory = visitHistory.length > 0 || otherProformas.length > 0;

  const handleDelete = async () => {
    if (!id) {
      toast.error('Cannot delete: Proforma ID not found');
      return;
    }
    
    if (window.confirm('Are you sure you want to delete this clinical proforma? This action cannot be undone.')) {
      try {
        await deleteProforma(id).unwrap();
        toast.success('Clinical proforma deleted successfully');
        
        // Navigate back immediately
        if (returnTab) {
          navigate(`/clinical-today-patients${returnTab === 'existing' ? '?tab=existing' : ''}`, { replace: true });
        } else {
          navigate('/clinical', { replace: true });
        }
      } catch (err) {
        toast.error(err?.data?.message || 'Failed to delete proforma');
      }
    }
  };

  const handleBack = () => {
    // Navigate back to Today Patients with preserved tab if returnTab exists
    if (returnTab) {
      navigate(`/clinical-today-patients${returnTab === 'existing' ? '?tab=existing' : ''}`);
    } else {
      navigate('/clinical');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Print functionality refs
  const patientDetailsPrintRef = useRef(null);
  const clinicalProformaPrintRef = useRef(null);
  const adlPrintRef = useRef(null);

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
  <title>Patient Details - ${proforma?.patient_name || 'Patient'}</title>
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
  <title>Walk-in Clinical Proforma - ${proforma?.patient_name || 'Patient'}</title>
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
  <title>Out-Patient Intake Record - ${proforma?.patient_name || 'Patient'}</title>
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

  // Show loading state when fetching proforma via route
  if (isLoadingProforma) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  // Show error state if proforma fetch failed
  if (proformaError) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 mb-4">Failed to load clinical proforma</p>
        <p className="text-gray-500 mb-4">{proformaError?.data?.message || 'An error occurred'}</p>
        <Button 
          className="mt-4" 
          onClick={handleBack}
        >
          <FiArrowLeft className="mr-2" /> Back
        </Button>
      </div>
    );
  }

  // Show not found if no proforma data
  if (!proforma) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Clinical proforma not found</p>
        <Button 
          className="mt-4" 
          onClick={() => {
            const returnTab = new URLSearchParams(window.location.search).get('returnTab');
            if (returnTab) {
              navigate(`/clinical-today-patients${returnTab === 'existing' ? '?tab=existing' : ''}`);
            } else {
              navigate('/clinical');
            }
          }}
        >
          Back to Clinical Records
        </Button>
      </div>
    );
  }

  // Helper function to format array values
  const formatArrayValue = (value) => {
    if (!value) return null;
    
    // If it's already an array, format it
    if (Array.isArray(value)) {
      if (value.length === 0) return null;
      return value.join(', ');
    }
    
    // If it's a string that looks like a JSON array, try to parse it
    if (typeof value === 'string') {
      const trimmed = value.trim();
      
      // Check if it looks like a JSON array (starts with [ and ends with ])
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.join(', ');
          }
        } catch (e) {
          // If parsing fails, return the original string
        }
      }
      
      // Check if it's a malformed JSON array with curly braces (starts with { and ends with })
      // Example: {"Depressive","Suicidal","Obsessions"}
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        try {
          // Try to parse as JSON first
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.join(', ');
          }
        } catch (e) {
          // If JSON.parse fails, try to extract values from malformed format
          // Remove outer braces and split by comma
          const innerContent = trimmed.slice(1, -1); // Remove { and }
          // Extract quoted strings
          const matches = innerContent.match(/"([^"]+)"/g);
          if (matches && matches.length > 0) {
            const values = matches.map(m => m.slice(1, -1)); // Remove quotes
            return values.join(', ');
          }
        }
      }
    }
    
    // Return the value as is if it's not an array
    return value;
  };

  const InfoSection = ({ title, data }) => (
    <Card title={title} className="mb-6">
      <div className="space-y-4">
        {Object.entries(data).map(([key, value]) => {
          const formattedValue = formatArrayValue(value);
          return formattedValue && (
            <div key={key}>
              <label className="text-sm font-medium text-gray-500 capitalize">
                {key.replace(/_/g, ' ')}
              </label>
              <p className="text-gray-900 mt-1 whitespace-pre-wrap">{formattedValue}</p>
            </div>
          );
        })}
      </div>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Patient Visit History Section - Show if patient has other visits/proformas */}
      {hasHistory && (
        <PatientClinicalHistory
          patient={{
            id: patientId,
            name: proforma?.patient_name,
            cr_no: proforma?.cr_no
          }}
          visitHistory={visitHistory}
          clinicalProformas={otherProformas}
          onAddNewProforma={() => navigate(`/patients/${patientId}?edit=true&mode=create`)}
          isLoading={isLoadingVisitHistory}
        />
      )}

      {/* <div className="flex items-center justify-between no-print">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <FiArrowLeft className="mr-2" /> Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900"> Walk-in Clinical Proforma</h1>
            <p className="text-gray-600 mt-1">View clinical assessment details</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <FiPrinter className="mr-2" /> Print
          </Button>
          <Link to={`/clinical/${id}/edit`}>
            <Button variant="outline">
              <FiEdit className="mr-2" /> Edit
            </Button>
          </Link>
          <Button variant="danger" onClick={handleDelete} loading={isDeleting}>
            <FiTrash2 className="mr-2" /> Delete
          </Button>
        </div>
      </div> */}

      {/* Patient & Visit Info */}
      <Card 
        title="Patient & Visit Information"
        // actions={
        //   <Button
        //     type="button"
        //     variant="ghost"
        //     size="sm"
        //     onClick={handlePrintPatientDetails}
        //     className="h-8 w-8 p-0 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border border-blue-200 hover:border-blue-300 shadow-sm hover:shadow-md transition-all duration-200 rounded-lg"
        //     title="Print Patient Details"
        //   >
        //     <FiPrinter className="w-4 h-4 text-blue-600" />
        //   </Button>
        // }
      >
        <div ref={patientDetailsPrintRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <label className="text-sm font-medium text-gray-500">Patient Name</label>
            <p className="text-lg font-semibold">{proforma.patient_name || 'N/A'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Visit Date</label>
            <p className="text-lg">{formatDate(proforma.visit_date)}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Visit Type</label>
            <Badge variant={proforma.visit_type === 'first_visit' ? 'primary' : 'default'}>
              {proforma.visit_type === 'first_visit' ? 'First Visit' : 'Follow Up'}
            </Badge>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Room Number</label>
            <p className="text-lg">{proforma.room_no || 'Not specified'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Doctor</label>
            <p className="text-lg">{proforma.doctor_name || 'N/A'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Created On</label>
            <p className="text-lg">{formatDate(proforma.created_at)}</p>
          </div>
        </div>
      </Card>

      {/* Walk-in Clinical Proforma Section */}
      <div ref={clinicalProformaPrintRef}>
        {/* History */}
        <InfoSection
          title="History of Present Illness"
        data={{
          'Onset & Duration': proforma.onset_duration,
          'Course': proforma.course,
          'Precipitating Factor': proforma.precipitating_factor,
          'Illness Duration': proforma.illness_duration,
          'Current Episode Since': proforma.current_episode_since ? formatDate(proforma.current_episode_since) : null,
        }}
      />

      {/* MSE */}
      <InfoSection
        title="Mental State Examination"
        data={{
          'Behaviour': proforma.mse_behaviour,
          'Affect': proforma.mse_affect,
          'Thought': proforma.mse_thought,
          'Delusions': proforma.mse_delusions,
          'Perception': proforma.mse_perception,
          'Cognitive Function': proforma.mse_cognitive_function,
        }}
      />

      {/* Additional History */}
      <InfoSection
        title="Additional History"
        data={{
          'Bio-Functions': proforma.bio_functions,
          'Substance Use': proforma.substance_use,
          'Past History': proforma.past_history,
          'Family History': proforma.family_history,
          'Associated Medical/Surgical': proforma.associated_medical_surgical,
        }}
      />

      {/* Physical Examination */}
      {proforma.gpe && (
        <Card title="General Physical Examination">
          <p className="text-gray-900 whitespace-pre-wrap">{proforma.gpe}</p>
        </Card>
      )}

      {/* Diagnosis & Management */}
      <Card title="Diagnosis & Management">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-gray-500">Diagnosis</label>
              <p className="text-lg font-semibold mt-1">{proforma.diagnosis}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">ICD Code</label>
              <p className="text-lg mt-1">{proforma.icd_code || 'Not specified'}</p>
            </div>
            {/* <div>
              <label className="text-sm font-medium text-gray-500">Case Severity</label>
              <div className="mt-1">
                <Badge variant={proforma.case_severity === 'severe' ? 'danger' : 'warning'}>
                  {proforma.case_severity}
                </Badge>
              </div>
            </div> */}
            <div>
              <label className="text-sm font-medium text-gray-500">Doctor Decision</label>
              <div className="mt-1">
                <Badge variant={proforma.doctor_decision === 'complex_case' ? 'warning' : 'success'}>
                  {getDoctorDecisionLabel(proforma.doctor_decision) || 'N/A'}
                </Badge>
              </div>
            </div>
          </div>

          {proforma.treatment_prescribed && (
            <div>
              <label className="text-sm font-medium text-gray-500">Treatment Prescribed</label>
              <p className="text-gray-900 mt-1 whitespace-pre-wrap">{proforma.treatment_prescribed}</p>
            </div>
          )}

          {proforma.disposal && (
            <div>
              <label className="text-sm font-medium text-gray-500">Disposal</label>
              <p className="text-gray-900 mt-1">{proforma.disposal}</p>
            </div>
          )}

          {proforma.referred_to && (
            <div>
              <label className="text-sm font-medium text-gray-500">Referred To</label>
              <p className="text-gray-900 mt-1">{proforma.referred_to}</p>
            </div>
          )}
        </div>
      </Card>
      </div>

      {/* Print button for Walk-in Clinical Proforma section */}
      {/* <div className="flex justify-end mb-4 no-print">
        <Button
          type="button"
          variant="outline"
          onClick={handlePrintClinicalProforma}
          className="bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 border border-green-200 hover:border-green-300"
        >
          <FiPrinter className="mr-2" /> Print Walk-in Clinical Proforma
        </Button>
      </div> */}

      {/* ADL File Requirements */}
      {proforma.requires_adl_file && (
        <Card title="Out Patient Intake Record Requirements">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="warning">Requires Out Patient Intake Record File</Badge>
              {isComplexCase && adlFile && (
                <Link to={`/adl-files/${adlFile.id}`}>
                  <Button variant="outline" size="sm">
                    <FiFileText className="mr-2" /> View Out Patient Intake Record  Details
                  </Button>
                </Link>
              )}
            </div>
            {proforma.adl_reasoning && (
              <div>
                <label className="text-sm font-medium text-gray-500">Reasoning</label>
                <p className="text-gray-900 mt-1 whitespace-pre-wrap">{proforma.adl_reasoning}</p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Complex Case - Additional Detail Data (from ADL File) */}
      {isComplexCase && adlFile && (
        <>
          <Card 
            title="Complex Case - Additional Details"
            actions={
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handlePrintADL}
                className="h-8 w-8 p-0 bg-gradient-to-r from-purple-50 to-indigo-50 hover:from-purple-100 hover:to-indigo-100 border border-purple-200 hover:border-purple-300 shadow-sm hover:shadow-md transition-all duration-200 rounded-lg"
                title="Print Out-Patient Intake Record"
              >
                <FiPrinter className="w-4 h-4 text-purple-600" />
              </Button>
            }
            className="border-2 border-red-200 bg-red-50/30"
          >
            <div className="mb-4 flex items-center gap-2">
              <FiActivity className="w-5 h-5 text-red-600" />
              <Badge variant="danger" className="text-sm font-semibold">
                Complex Case - Data from Out Patient Intake Record
              </Badge>
              <Link to={`/adl-files/${adlFile.id}`}>
                <Button variant="outline" size="sm">
                  <FiFileText className="mr-2" /> View Full Out Patient Intake Record
                </Button>
              </Link>
            </div>

            {adlFileLoading ? (
              <LoadingSpinner className="h-32" />
            ) : (
              <div ref={adlPrintRef} className="space-y-6">
                {/* History of Present Illness - Expanded */}
                {(adlFile.history_narrative || adlFile.history_specific_enquiry || adlFile.history_drug_intake) && (
                  <InfoSection
                    title="History of Present Illness (Expanded)"
                    data={{
                      'Narrative': adlFile.history_narrative,
                      'Specific Enquiry': adlFile.history_specific_enquiry,
                      'Drug Intake': adlFile.history_drug_intake,
                      'Treatment Place': adlFile.history_treatment_place,
                      'Treatment Dates': adlFile.history_treatment_dates,
                      'Treatment Drugs': adlFile.history_treatment_drugs,
                      'Treatment Response': adlFile.history_treatment_response,
                    }}
                  />
                )}

                {/* Informants */}
                {adlFile.informants && Array.isArray(adlFile.informants) && adlFile.informants.length > 0 && (
                  <Card title="Informants" className="mt-4">
                    <div className="space-y-3">
                      {adlFile.informants.map((informant, index) => (
                        <div key={index} className="p-3 border border-gray-200 rounded">
                          <p className="font-medium">{informant.name || `Informant ${index + 1}`}</p>
                          {informant.relation && <p className="text-sm text-gray-600">Relation: {informant.relation}</p>}
                          {informant.age && <p className="text-sm text-gray-600">Age: {informant.age}</p>}
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Past History - Detailed */}
                {(adlFile.past_history_medical || adlFile.past_history_psychiatric_dates || adlFile.past_history_psychiatric_diagnosis) && (
                  <InfoSection
                    title="Past History (Detailed)"
                    data={{
                      'Medical History': adlFile.past_history_medical,
                      'Psychiatric Dates': adlFile.past_history_psychiatric_dates,
                      'Psychiatric Diagnosis': adlFile.past_history_psychiatric_diagnosis,
                      'Psychiatric Treatment': adlFile.past_history_psychiatric_treatment,
                      'Interim Period': adlFile.past_history_psychiatric_interim,
                      'Recovery': adlFile.past_history_psychiatric_recovery,
                    }}
                  />
                )}

                {/* Family History - Detailed */}
                {(adlFile.family_history_father_age || adlFile.family_history_mother_age) && (
                  <InfoSection
                    title="Family History (Detailed)"
                    data={{
                      'Father - Age': adlFile.family_history_father_age,
                      'Father - Education': adlFile.family_history_father_education,
                      'Father - Occupation': adlFile.family_history_father_occupation,
                      'Father - Personality': adlFile.family_history_father_personality,
                      'Father - Deceased': adlFile.family_history_father_deceased ? 'Yes' : 'No',
                      'Mother - Age': adlFile.family_history_mother_age,
                      'Mother - Education': adlFile.family_history_mother_education,
                      'Mother - Occupation': adlFile.family_history_mother_occupation,
                      'Mother - Personality': adlFile.family_history_mother_personality,
                      'Mother - Deceased': adlFile.family_history_mother_deceased ? 'Yes' : 'No',
                    }}
                  />
                )}

                {/* Mental Status Examination - Expanded */}
                {(adlFile.mse_general_demeanour || adlFile.mse_affect_subjective || adlFile.mse_thought_flow) && (
                  <InfoSection
                    title="Mental Status Examination (Expanded)"
                    data={{
                      'General Demeanour': adlFile.mse_general_demeanour,
                      'General Awareness': adlFile.mse_general_awareness,
                      'Affect - Subjective': adlFile.mse_affect_subjective,
                      'Affect - Tone': adlFile.mse_affect_tone,
                      'Thought Flow': adlFile.mse_thought_flow,
                      'Thought Form': adlFile.mse_thought_form,
                      'Thought Content': adlFile.mse_thought_content,
                      'Cognitive - Consciousness': adlFile.mse_cognitive_consciousness,
                      'Insight - Understanding': adlFile.mse_insight_understanding,
                      'Insight - Judgement': adlFile.mse_insight_judgement,
                    }}
                  />
                )}

                {/* Physical Examination - Comprehensive */}
                {(adlFile.physical_appearance || adlFile.physical_pulse || adlFile.physical_bp) && (
                  <InfoSection
                    title="Physical Examination (Comprehensive)"
                    data={{
                      'Appearance': adlFile.physical_appearance,
                      'Body Build': adlFile.physical_body_build,
                      'Pulse': adlFile.physical_pulse,
                      'Blood Pressure': adlFile.physical_bp,
                      'Height': adlFile.physical_height,
                      'Weight': adlFile.physical_weight,
                      'CVS Apex': adlFile.physical_cvs_apex,
                      'CVS Heart Sounds': adlFile.physical_cvs_heart_sounds,
                      'CNS Cranial': adlFile.physical_cns_cranial,
                    }}
                  />
                )}

                {/* Provisional Diagnosis and Treatment Plan */}
                {(adlFile.provisional_diagnosis || adlFile.treatment_plan) && (
                  <Card title="Provisional Diagnosis and Treatment Plan" className="border-2 border-blue-200 bg-blue-50/30">
                    <div className="space-y-4">
                      {adlFile.provisional_diagnosis && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Provisional Diagnosis</label>
                          <p className="text-gray-900 mt-1 whitespace-pre-wrap">{adlFile.provisional_diagnosis}</p>
                        </div>
                      )}
                      {adlFile.treatment_plan && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Treatment Plan</label>
                          <p className="text-gray-900 mt-1 whitespace-pre-wrap">{adlFile.treatment_plan}</p>
                        </div>
                      )}
                    </div>
                  </Card>
                )}

                {/* Comments of the Consultant */}
                {adlFile.consultant_comments && (
                  <Card title="Comments of the Consultant" className="border-2 border-purple-200 bg-purple-50/30">
                    <p className="text-gray-900 whitespace-pre-wrap">{adlFile.consultant_comments}</p>
                  </Card>
                )}
              </div>
            )}
          </Card>
        </>
      )}

      {/* Patient Documents & Files Preview Section */}
      {patientId && existingFiles && existingFiles.length > 0 && (
        <Card title="Patient Documents & Files" className="mb-6">
          <div className="p-6">
            <FilePreview
              files={existingFiles}
              canDelete={false}
              baseUrl={import.meta.env.VITE_API_URL || 'http://localhost:2025/api'}
            />
          </div>
        </Card>
      )}
    </div>
  );
};

export default ClinicalProformaDetails;

