import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  FiUser, FiUsers, FiBriefcase,  FiHome, FiMapPin, FiPhone,
  FiCalendar, FiGlobe, FiFileText,  FiClock,
  FiHeart, FiBookOpen, FiTrendingUp, FiShield,
  FiNavigation, FiEdit3, FiSave, FiX, FiLayers, 
  FiFolder, FiChevronDown, FiChevronUp, FiPackage, FiHash ,  FiPrinter, FiClipboard, FiEye, FiPlus
} from 'react-icons/fi';
import { useUpdatePatientMutation, useGetPatientVisitHistoryQuery, useGetPatientFilesQuery } from '../../features/patients/patientsApiSlice';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../../features/auth/authSlice';
import Card from '../../components/Card';
import Select from '../../components/Select';
import Button from '../../components/Button';
import DatePicker from '../../components/CustomDatePicker';
import FileUpload from '../../components/FileUpload';
import FilePreview from '../../components/FilePreview';
import { formatDateForDatePicker, formatDate } from '../../utils/formatters';
import { useGetClinicalProformaByIdQuery } from '../../features/clinical/clinicalApiSlice';
import {
  MARITAL_STATUS, FAMILY_TYPE_OPTIONS, LOCALITY_OPTIONS, RELIGION_OPTIONS, SEX_OPTIONS,
  AGE_GROUP_OPTIONS, OCCUPATION_OPTIONS, EDUCATION_OPTIONS,
  MOBILITY_OPTIONS, REFERRED_BY_OPTIONS, UNIT_DAYS_OPTIONS, HEAD_RELATIONSHIP_OPTIONS, CATEGORY_OPTIONS,  isAdmin, isMWO, isJrSr, isSR, isJR
} from '../../utils/constants';
import EditClinicalProforma from '../clinical/EditClinicalProforma';
import EditADL from '../adl/EditADL';
import PrescriptionEdit from '../PrescribeMedication/PrescriptionEdit';
import CreatePrescription from '../PrescribeMedication/CreatePrescription';
import PrescriptionView from '../PrescribeMedication/PrescriptionView';
import ClinicalProformaDetails from '../clinical/ClinicalProformaDetails';
import ViewADL from '../adl/ViewADL';
import PatientClinicalHistory from '../../components/PatientClinicalHistory';
import { useGetADLFileByIdQuery, useGetADLFileByPatientIdQuery } from '../../features/adl/adlApiSlice';
import { useGetPrescriptionByIdQuery } from '../../features/prescriptions/prescriptionApiSlice';

import { SelectWithOther } from '../../components/SelectWithOther';
import {IconInput} from '../../components/IconInput';
import PGI_Logo from '../../assets/PGI_Logo.png';

const PatientDetailsEdit = ({ patient, formData: initialFormData, clinicalData, adlData, usersData, userRole, onSave, onCancel }) => {
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode'); // Check for 'create' mode
  const isEdit = searchParams.get('edit') === 'true'; // Check for 'edit' mode
  const isCreateMode = mode === 'create'; // Check if mode is 'create'
  const [currentDoctorDecision, setCurrentDoctorDecision] = useState(null);
  const [occupationOther, setOccupationOther] = useState(''); // Custom occupation value
  const [familyTypeOther, setFamilyTypeOther] = useState(''); // Custom family type value
  const [localityOther, setLocalityOther] = useState(''); // Custom locality value
  const [religionOther, setReligionOther] = useState(''); // Custom religion value
  const [headRelationshipOther, setHeadRelationshipOther] = useState(''); // Custom head relationship value
  const [mobilityOther, setMobilityOther] = useState(''); // Custom mobility value
  const [referredByOther, setReferredByOther] = useState(''); // Custom referred by value
  const [showOccupationOther, setShowOccupationOther] = useState(false);
  const [showFamilyTypeOther, setShowFamilyTypeOther] = useState(false);
  const [showLocalityOther, setShowLocalityOther] = useState(false);
  const [showReligionOther, setShowReligionOther] = useState(false);
  const [showHeadRelationshipOther, setShowHeadRelationshipOther] = useState(false);
  const [showMobilityOther, setShowMobilityOther] = useState(false);
  const [showReferredByOther, setShowReferredByOther] = useState(false);
  const [sameAsPermanent, setSameAsPermanent] = useState(false);
  
  const navigate = useNavigate();
  const currentUser = useSelector(selectCurrentUser);
  const [updatePatient, { isLoading }] = useUpdatePatientMutation();
  // File upload state and API hooks
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [filesToRemove, setFilesToRemove] = useState([]);
  const [autoFillAdlData, setAutoFillAdlData] = useState(null);
  const { data: patientFilesData, refetch: refetchFiles } = useGetPatientFilesQuery(patient?.id, {
    skip: !patient?.id,
    refetchOnMountOrArgChange: true
  });
  // Get existing files from API
  const existingFiles = patientFilesData?.data?.files || [];
  const canEditFiles = patientFilesData?.data?.can_edit !== false; // Default to true if not specified
  
  // Helper function to normalize file paths for comparison
  const normalizeFilePath = (filePath) => {
    if (!filePath) return '';
    
    // Handle if filePath is an object with path/url property
    if (typeof filePath === 'object' && filePath !== null) {
      filePath = filePath.path || filePath.url || filePath.filePath || String(filePath);
    }
    
    // Convert to string if not already
    filePath = String(filePath);
    
    // If it's a full URL, extract the path
    if (filePath.startsWith('http://') || filePath.startsWith('http://')) {
      try {
        const url = new URL(filePath);
        return url.pathname;
      } catch {
        // If URL parsing fails, try to extract path manually
        const match = filePath.match(/\/fileupload\/.*/) || filePath.match(/\/uploads\/.*/);
        return match ? match[0] : filePath;
      }
    }
    
    // If it's an absolute file system path, extract relative path
    if (filePath.includes('/fileupload/')) {
      const fileuploadIndex = filePath.indexOf('/fileupload/');
      return filePath.substring(fileuploadIndex);
    }
    if (filePath.includes('/uploads/')) {
      const uploadsIndex = filePath.indexOf('/uploads/');
      return filePath.substring(uploadsIndex);
    }
    
    // If it starts with /, return as-is (already a relative path)
    if (filePath.startsWith('/')) {
      return filePath;
    }
    
    // Otherwise, assume it needs /fileupload prefix
    return `/fileupload/${filePath}`;
  };
  
  useEffect(() => {
    // Debug logging
    if (patientFilesData) {
      console.log('[PatientDetailsEdit] Patient files data:', {
        files: existingFiles,
        canEdit: canEditFiles,
        filesToRemove: filesToRemove
      });
    }
  }, [patientFilesData, existingFiles, canEditFiles, filesToRemove]);

  const isAdminUser = isAdmin(currentUser?.role);
  const isResident = isJR(currentUser?.role);
  const isFaculty = isSR(currentUser?.role);
  const isJrSrUser = isJrSr(currentUser?.role);

  // Card expand/collapse state - initialize with false, will auto-expand when data loads
  const [expandedCards, setExpandedCards] = useState({
    patient: false,
    clinical: false,
    adl: false,
    prescriptions: false,
    pastHistory: false
  });

  // State to track which Past History sub-cards are expanded
  const [expandedPastHistoryCards, setExpandedPastHistoryCards] = useState({
    patientDetails: false,
  });

  // State to track which visit cards are expanded (visit-based structure)
  const [expandedVisitCards, setExpandedVisitCards] = useState({});
  
  // State to track which sections within each visit are expanded
  const [expandedVisitSections, setExpandedVisitSections] = useState({});

  // State to track which individual visits are expanded within each card (legacy, kept for compatibility)
  const [expandedVisits, setExpandedVisits] = useState({});

  const togglePastHistoryCard = (cardName) => {
    setExpandedPastHistoryCards(prev => ({
      ...prev,
      [cardName]: !prev[cardName]
    }));
  };

  const toggleVisit = (cardType, visitId) => {
    const key = `${cardType}-${visitId}`;
    setExpandedVisits(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const isVisitExpanded = (cardType, visitId) => {
    const key = `${cardType}-${visitId}`;
    // Default to minimized (false) if not set
    return expandedVisits[key] === true;
  };

  // New functions for visit-based structure
  const toggleVisitCard = (visitId, visit = null) => {
    const isCurrentlyExpanded = expandedVisitCards[visitId] === true;
    
    // Toggle the visit card
    setExpandedVisitCards(prev => ({
      ...prev,
      [visitId]: !prev[visitId]
    }));

    // If expanding the card, automatically expand all form sections
    if (!isCurrentlyExpanded) {
      // If visit object is provided, use it; otherwise try to find it from trulyPastProformas
      let visitData = visit;
      if (!visitData) {
        // Try to construct visit data from available data
        const proforma = trulyPastProformas.find(p => p.id === visitId);
        if (proforma) {
          const hasAdl = patientAdlFiles.some(adl => adl.clinical_proforma_id === visitId);
          visitData = {
            visitId,
            hasAdl,
            hasPrescription: false // We'll check this if needed
          };
        }
      }
      
      if (visitData) {
        // Expand all sections that exist for this visit
        const sectionsToExpand = ['clinicalProforma']; // Always present
        if (visitData.hasAdl) sectionsToExpand.push('adl');
        if (visitData.hasPrescription) sectionsToExpand.push('prescription');
        
        // Set all sections to expanded
        setExpandedVisitSections(prev => {
          const newSections = { ...prev };
          sectionsToExpand.forEach(section => {
            const key = `${visitId}-${section}`;
            newSections[key] = true;
          });
          return newSections;
        });
      }
    }
  };

  const toggleVisitSection = (visitId, section) => {
    const key = `${visitId}-${section}`;
    setExpandedVisitSections(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const isVisitCardExpanded = (visitId) => {
    return expandedVisitCards[visitId] === true;
  };

  const isVisitSectionExpanded = (visitId, section) => {
    const key = `${visitId}-${section}`;
    return expandedVisitSections[key] === true;
  };

  const toggleCard = (cardName) => {
    setExpandedCards(prev => ({
      ...prev,
      [cardName]: !prev[cardName]
    }));
  };

  // Print functionality refs
  const patientDetailsPrintRef = useRef(null);
  const adlPrintRef = useRef(null);
  const prescriptionPrintRef = useRef(null);
  // Visit-based print refs (using Map to store refs for each visit)
  const visitPrintRefs = useRef(new Map());
  
  const handlePrintPatientDetails = async () => {
    if (!patientDetailsPrintRef.current) return;

    // Convert logo to base64 for embedding in print
    let logoBase64 = '';
    try {
      const logoResponse = await fetch(PGI_Logo);
      const logoBlob = await logoResponse.blob();
      const logoReader = new FileReader();
      logoBase64 = await new Promise((resolve) => {
        logoReader.onloadend = () => resolve(logoReader.result);
        logoReader.readAsDataURL(logoBlob);
      });
    } catch (e) {
      console.warn('Could not load logo for print:', e);
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow pop-ups to print this section');
      return;
    }

    const sectionElement = patientDetailsPrintRef.current;
    let sectionHTML = sectionElement.innerHTML;
    
    // Clean up empty elements from HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = sectionHTML;
    
    // Remove empty elements (but keep inputs, textareas, selects, images, br, hr)
    const emptyElements = tempDiv.querySelectorAll(':empty');
    emptyElements.forEach(el => {
      const tagName = el.tagName?.toLowerCase();
      if (!['input', 'textarea', 'select', 'img', 'br', 'hr', 'option'].includes(tagName)) {
        // Check if it's an input/textarea/select with no value
        if (tagName === 'input' && (!el.value || el.value.trim() === '')) {
          el.remove();
        } else if (tagName !== 'input' && tagName !== 'textarea' && tagName !== 'select') {
          el.remove();
        }
      }
    });
    
    // Remove empty containers
    const emptyContainers = tempDiv.querySelectorAll('div:empty, span:empty, p:empty');
    emptyContainers.forEach(el => el.remove());
    
    sectionHTML = tempDiv.innerHTML;

    const printContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Patient Details - ${patient?.name || 'Patient'}</title>
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
    /* Hide empty elements */
    :empty:not(input):not(textarea):not(select):not(img):not(br):not(hr):not(option) {
      display: none !important;
    }
    /* Hide empty form fields */
    input[value=""], input:not([value]),
    textarea:empty,
    select:not([value]):not([value=""]) {
      display: none !important;
    }
    /* Hide empty containers */
    div:empty, span:empty, p:empty {
      display: none !important;
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
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 20px;
      padding: 20px 0;
      border-bottom: 4px solid #1e40af;
      margin-bottom: 25px;
      background: linear-gradient(to bottom, #f8fafc, #ffffff);
    }
    .logo-container {
      flex-shrink: 0;
    }
    .logo-container img {
      height: 70px;
      width: auto;
      object-fit: contain;
    }
    .header-text {
      text-align: center;
      flex: 1;
    }
    .header-text h1 {
      margin: 0;
      font-size: 20pt;
      font-weight: bold;
      color: #1e40af;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      line-height: 1.2;
    }
    .header-text h2 {
      margin: 6px 0 0 0;
      font-size: 14pt;
      color: #475569;
      font-weight: 600;
    }
    .header-text .subtitle {
      margin: 4px 0 0 0;
      font-size: 11pt;
      color: #64748b;
      font-weight: 500;
    }
    .content {
      padding: 0;
    }
    .section {
      margin-bottom: 20px;
      page-break-inside: avoid;
    }
    .section {
      margin-bottom: 20px;
      page-break-inside: avoid;
      background: #ffffff;
      padding: 15px;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
    }
    .section:last-of-type {
      margin-bottom: 0;
    }
    .section-title {
      font-size: 13pt;
      font-weight: bold;
      color: #1e40af;
      border-bottom: 3px solid #3b82f6;
      padding-bottom: 8px;
      margin-bottom: 15px;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      background: linear-gradient(to right, #eff6ff, #ffffff);
      padding-left: 10px;
      padding-right: 10px;
      padding-top: 8px;
      margin-left: -15px;
      margin-right: -15px;
      margin-top: -15px;
      border-radius: 6px 6px 0 0;
    }
    /* Field Grid Layout - Print Optimized */
    .info-grid, [class*="grid"], .grid {
      display: grid !important;
      grid-template-columns: repeat(2, 1fr) !important;
      gap: 10px !important;
      margin-bottom: 12px !important;
    }
    .info-item, .field-group {
      margin-bottom: 8px !important;
      padding: 8px 10px !important;
      background: #f8fafc !important;
      border-left: 3px solid #3b82f6 !important;
      border-radius: 4px !important;
      break-inside: avoid !important;
    }
    .info-item.full-width, .field-group.full-width {
      grid-column: 1 / -1 !important;
    }
    .field-label, .info-label {
      font-weight: 600 !important;
      color: #475569 !important;
      font-size: 9pt !important;
      margin-bottom: 4px !important;
      text-transform: uppercase !important;
      letter-spacing: 0.3px !important;
      display: block !important;
    }
    .field-value, .info-value {
      color: #1e293b !important;
      font-size: 10pt !important;
      font-weight: 500 !important;
      padding-left: 4px !important;
      display: block !important;
    }
    /* Handle Tailwind grid classes in print */
    [class*="grid-cols-1"] { grid-template-columns: 1fr !important; }
    [class*="grid-cols-2"] { grid-template-columns: repeat(2, 1fr) !important; }
    [class*="grid-cols-3"] { grid-template-columns: repeat(3, 1fr) !important; }
    [class*="grid-cols-4"] { grid-template-columns: repeat(2, 1fr) !important; }
    [class*="grid-cols-5"], [class*="grid-cols-6"] { grid-template-columns: repeat(2, 1fr) !important; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 15px;
      font-size: 9pt;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    table th, table td {
      border: 1px solid #cbd5e1;
      padding: 10px 12px;
      text-align: left;
    }
    table th {
      background: linear-gradient(to bottom, #1e40af, #2563eb);
      color: #ffffff;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-size: 9pt;
    }
    table tbody tr {
      background: #ffffff;
    }
    table tbody tr:nth-child(even) {
      background: #f8fafc;
    }
    table tbody tr:hover {
      background: #eff6ff;
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
        font-size: 9pt;
      }
      /* Hide empty elements in print */
      :empty:not(input):not(textarea):not(select):not(img):not(br):not(hr):not(option) {
        display: none !important;
      }
      /* Hide empty form fields */
      input[value=""], input:not([value]),
      textarea:empty,
      select:not([value]):not([value=""]) {
        display: none !important;
      }
      /* Hide empty containers */
      div:empty, span:empty, p:empty {
        display: none !important;
      }
      /* Remove excessive spacing */
      [class*="space-y"]:empty,
      [class*="gap-"]:empty {
        display: none !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      /* Force 2-column layout for all grids */
      .grid, [class*="grid"], [class*="grid-cols"] {
        display: grid !important;
        grid-template-columns: repeat(2, 1fr) !important;
        gap: 8px !important;
        margin-bottom: 10px !important;
      }
      /* Full width items */
      [class*="col-span"], [class*="full-width"] {
        grid-column: 1 / -1 !important;
      }
      .section {
        page-break-inside: avoid;
        margin-bottom: 15px;
      }
      /* Field containers - show values from inputs */
      [class*="relative"]:has(label), [class*="relative"]:has([class*="font-semibold"]) {
        display: block !important;
        margin-bottom: 8px !important;
        padding: 6px 8px !important;
        background: #f8fafc !important;
        border-left: 3px solid #3b82f6 !important;
        border-radius: 3px !important;
        page-break-inside: avoid !important;
      }
      /* Show input values */
      input[type="text"], input[type="number"], input[type="date"],
      select, textarea {
        display: block !important;
        font-size: 9pt !important;
        color: #1e293b !important;
        margin: 0 !important;
        padding: 2px 0 !important;
        background: transparent !important;
        border: none !important;
        width: 100% !important;
        -webkit-appearance: none !important;
        -moz-appearance: none !important;
        appearance: none !important;
      }
      /* Remove decorative elements */
      [class*="gradient"], [class*="blur"], [class*="shadow-xl"], 
      [class*="backdrop-blur"], [class*="absolute"] {
        background: transparent !important;
        backdrop-filter: none !important;
        box-shadow: none !important;
        position: static !important;
      }
      table {
        page-break-inside: auto;
        font-size: 8pt;
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
    ${logoBase64 ? `
    <div class="logo-container">
      <img src="${logoBase64}" alt="PGIMER Logo" />
    </div>
    ` : ''}
    <div class="header-text">
      <h1>POSTGRADUATE INSTITUTE OF MEDICAL EDUCATION & RESEARCH</h1>
      <h2>Department of Psychiatry</h2>
      <p class="subtitle">Patient Medical Record</p>
    </div>
  </div>
  <div class="content">
    ${sectionHTML}
  </div>
  <div class="footer">
    <p><strong>Generated on:</strong> ${new Date().toLocaleString('en-IN', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    })}</p>
    <p><strong>PGIMER - Department of Psychiatry</strong> | Electronic Medical Record System</p>
    <p style="font-size: 8pt; margin-top: 8px; color: #94a3b8;">This is a computer-generated document. No signature required.</p>
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
      }, 500);
    };
  };

  // Print functionality for ADL section
  const handlePrintADL = async () => {
    if (!adlPrintRef.current) return;

    // Convert logo to base64 for embedding in print
    let logoBase64 = '';
    try {
      const logoResponse = await fetch(PGI_Logo);
      const logoBlob = await logoResponse.blob();
      const logoReader = new FileReader();
      logoBase64 = await new Promise((resolve) => {
        logoReader.onloadend = () => resolve(logoReader.result);
        logoReader.readAsDataURL(logoBlob);
      });
    } catch (e) {
      console.warn('Could not load logo for print:', e);
    }

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
  <title>Out-Patient Intake Record - ${patient?.name || 'Patient'}</title>
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
    /* Hide empty elements */
    :empty:not(input):not(textarea):not(select):not(img):not(br):not(hr):not(option) {
      display: none !important;
    }
    /* Hide empty form fields */
    input[value=""], input:not([value]),
    textarea:empty,
    select:not([value]):not([value=""]) {
      display: none !important;
    }
    /* Hide empty containers */
    div:empty, span:empty, p:empty {
      display: none !important;
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
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 20px;
      padding: 20px 0;
      border-bottom: 4px solid #8b5cf6;
      margin-bottom: 25px;
      background: linear-gradient(to bottom, #faf5ff, #ffffff);
    }
    .logo-container {
      flex-shrink: 0;
    }
    .logo-container img {
      height: 70px;
      width: auto;
      object-fit: contain;
    }
    .header-text {
      text-align: center;
      flex: 1;
    }
    .header-text h1 {
      margin: 0;
      font-size: 20pt;
      font-weight: bold;
      color: #6d28d9;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      line-height: 1.2;
    }
    .header-text h2 {
      margin: 6px 0 0 0;
      font-size: 14pt;
      color: #475569;
      font-weight: 600;
    }
    .header-text .subtitle {
      margin: 4px 0 0 0;
      font-size: 11pt;
      color: #64748b;
      font-weight: 500;
    }
    .content {
      padding: 0;
    }
    .section {
      margin-bottom: 20px;
      page-break-inside: avoid;
    }
    .section {
      margin-bottom: 20px;
      page-break-inside: avoid;
      background: #ffffff;
      padding: 15px;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
    }
    .section:last-of-type {
      margin-bottom: 0;
    }
    .section-title {
      font-size: 13pt;
      font-weight: bold;
      color: #6d28d9;
      border-bottom: 3px solid #8b5cf6;
      padding-bottom: 8px;
      margin-bottom: 15px;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      background: linear-gradient(to right, #f5f3ff, #ffffff);
      padding-left: 10px;
      padding-right: 10px;
      padding-top: 8px;
      margin-left: -15px;
      margin-right: -15px;
      margin-top: -15px;
      border-radius: 6px 6px 0 0;
    }
    .field-group {
      margin-bottom: 10px;
      padding: 6px 8px;
      background: #faf5ff;
      border-left: 3px solid #8b5cf6;
      border-radius: 4px;
    }
    .field-label {
      font-weight: 600;
      color: #475569;
      font-size: 9pt;
      margin-bottom: 4px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .field-value {
      color: #1e293b;
      font-size: 10pt;
      font-weight: 500;
      padding-left: 4px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 15px;
      font-size: 9pt;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    table th, table td {
      border: 1px solid #cbd5e1;
      padding: 10px 12px;
      text-align: left;
    }
    table th {
      background: linear-gradient(to bottom, #6d28d9, #7c3aed);
      color: #ffffff;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-size: 9pt;
    }
    table tbody tr {
      background: #ffffff;
    }
    table tbody tr:nth-child(even) {
      background: #faf5ff;
    }
    table tbody tr:hover {
      background: #f5f3ff;
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
      margin-top: 40px;
      padding-top: 20px;
      border-top: 3px solid #e2e8f0;
      text-align: center;
      font-size: 9pt;
      color: #64748b;
      background: #f8fafc;
      padding: 15px;
      border-radius: 6px;
      page-break-inside: avoid;
    }
    .footer p {
      margin: 4px 0;
    }
    .footer strong {
      color: #6d28d9;
      font-weight: 600;
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
        font-size: 9pt;
      }
      /* Hide empty elements in print */
      :empty:not(input):not(textarea):not(select):not(img):not(br):not(hr):not(option) {
        display: none !important;
      }
      /* Hide empty form fields */
      input[value=""], input:not([value]),
      textarea:empty,
      select:not([value]):not([value=""]) {
        display: none !important;
      }
      /* Hide empty containers */
      div:empty, span:empty, p:empty {
        display: none !important;
      }
      /* Remove excessive spacing */
      [class*="space-y"]:empty,
      [class*="gap-"]:empty {
        display: none !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      /* Force 2-column layout for all grids */
      .grid, [class*="grid"], [class*="grid-cols"] {
        display: grid !important;
        grid-template-columns: repeat(2, 1fr) !important;
        gap: 8px !important;
        margin-bottom: 10px !important;
      }
      /* Full width items */
      [class*="col-span"], [class*="full-width"] {
        grid-column: 1 / -1 !important;
      }
      .section {
        page-break-inside: avoid;
        margin-bottom: 15px;
      }
      /* Field containers - show values from inputs */
      [class*="relative"]:has(label), [class*="relative"]:has([class*="font-semibold"]) {
        display: block !important;
        margin-bottom: 8px !important;
        padding: 6px 8px !important;
        background: #f8fafc !important;
        border-left: 3px solid #3b82f6 !important;
        border-radius: 3px !important;
        page-break-inside: avoid !important;
      }
      /* Show input values */
      input[type="text"], input[type="number"], input[type="date"],
      select, textarea {
        display: block !important;
        font-size: 9pt !important;
        color: #1e293b !important;
        margin: 0 !important;
        padding: 2px 0 !important;
        background: transparent !important;
        border: none !important;
        width: 100% !important;
        -webkit-appearance: none !important;
        -moz-appearance: none !important;
        appearance: none !important;
      }
      /* Remove decorative elements */
      [class*="gradient"], [class*="blur"], [class*="shadow-xl"], 
      [class*="backdrop-blur"], [class*="absolute"] {
        background: transparent !important;
        backdrop-filter: none !important;
        box-shadow: none !important;
        position: static !important;
      }
      table {
        page-break-inside: auto;
        font-size: 8pt;
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
    ${logoBase64 ? `
    <div class="logo-container">
      <img src="${logoBase64}" alt="PGIMER Logo" />
    </div>
    ` : ''}
    <div class="header-text">
      <h1>POSTGRADUATE INSTITUTE OF MEDICAL EDUCATION & RESEARCH</h1>
      <h2>Department of Psychiatry</h2>
      <p class="subtitle">Out-Patient Intake Record</p>
    </div>
  </div>
  <div class="content">
    ${sectionHTML}
  </div>
  <div class="footer">
    <p><strong>Generated on:</strong> ${new Date().toLocaleString('en-IN', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    })}</p>
    <p><strong>PGIMER - Department of Psychiatry</strong> | Electronic Medical Record System</p>
    <p style="font-size: 8pt; margin-top: 8px; color: #94a3b8;">This is a computer-generated document. No signature required.</p>
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
      }, 500);
    };
  };

  // Print functionality for Prescription section
  const handlePrintPrescription = async () => {
    if (!prescriptionPrintRef.current) return;

    // Convert logo to base64 for embedding in print
    let logoBase64 = '';
    try {
      const logoResponse = await fetch(PGI_Logo);
      const logoBlob = await logoResponse.blob();
      const logoReader = new FileReader();
      logoBase64 = await new Promise((resolve) => {
        logoReader.onloadend = () => resolve(logoReader.result);
        logoReader.readAsDataURL(logoBlob);
      });
    } catch (e) {
      console.warn('Could not load logo for print:', e);
    }

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
  <title>Prescription - ${patient?.name || 'Patient'}</title>
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
    /* Hide empty elements */
    :empty:not(input):not(textarea):not(select):not(img):not(br):not(hr):not(option) {
      display: none !important;
    }
    /* Hide empty form fields */
    input[value=""], input:not([value]),
    textarea:empty,
    select:not([value]):not([value=""]) {
      display: none !important;
    }
    /* Hide empty containers */
    div:empty, span:empty, p:empty {
      display: none !important;
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
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 20px;
      padding: 20px 0;
      border-bottom: 4px solid #f59e0b;
      margin-bottom: 25px;
      background: linear-gradient(to bottom, #fffbeb, #ffffff);
    }
    .logo-container {
      flex-shrink: 0;
    }
    .logo-container img {
      height: 70px;
      width: auto;
      object-fit: contain;
    }
    .header-text {
      text-align: center;
      flex: 1;
    }
    .header-text h1 {
      margin: 0;
      font-size: 20pt;
      font-weight: bold;
      color: #d97706;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      line-height: 1.2;
    }
    .header-text h2 {
      margin: 6px 0 0 0;
      font-size: 14pt;
      color: #475569;
      font-weight: 600;
    }
    .header-text .subtitle {
      margin: 4px 0 0 0;
      font-size: 11pt;
      color: #64748b;
      font-weight: 500;
    }
    .content {
      padding: 0;
    }
    .section {
      margin-bottom: 20px;
      page-break-inside: avoid;
      background: #ffffff;
      padding: 15px;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
    }
    .section:last-of-type {
      margin-bottom: 0;
    }
    .section-title {
      font-size: 13pt;
      font-weight: bold;
      color: #d97706;
      border-bottom: 3px solid #f59e0b;
      padding-bottom: 8px;
      margin-bottom: 15px;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      background: linear-gradient(to right, #fffbeb, #ffffff);
      padding-left: 10px;
      padding-right: 10px;
      padding-top: 8px;
      margin-left: -15px;
      margin-right: -15px;
      margin-top: -15px;
      border-radius: 6px 6px 0 0;
    }
    .field-group {
      margin-bottom: 10px;
      padding: 6px 8px;
      background: #fffbeb;
      border-left: 3px solid #f59e0b;
      border-radius: 4px;
    }
    .field-label {
      font-weight: 600;
      color: #475569;
      font-size: 9pt;
      margin-bottom: 4px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .field-value {
      color: #1e293b;
      font-size: 10pt;
      font-weight: 500;
      padding-left: 4px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 15px;
      font-size: 9pt;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    table th, table td {
      border: 1px solid #cbd5e1;
      padding: 10px 12px;
      text-align: left;
    }
    table th {
      background: linear-gradient(to bottom, #d97706, #f59e0b);
      color: #ffffff;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-size: 9pt;
    }
    table tbody tr {
      background: #ffffff;
    }
    table tbody tr:nth-child(even) {
      background: #fffbeb;
    }
    table tbody tr:hover {
      background: #fef3c7;
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
      margin-top: 40px;
      padding-top: 20px;
      border-top: 3px solid #e2e8f0;
      text-align: center;
      font-size: 9pt;
      color: #64748b;
      background: #f8fafc;
      padding: 15px;
      border-radius: 6px;
      page-break-inside: avoid;
    }
    .footer p {
      margin: 4px 0;
    }
    .footer strong {
      color: #d97706;
      font-weight: 600;
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
        font-size: 9pt;
      }
      /* Hide empty elements in print */
      :empty:not(input):not(textarea):not(select):not(img):not(br):not(hr):not(option) {
        display: none !important;
      }
      /* Hide empty form fields */
      input[value=""], input:not([value]),
      textarea:empty,
      select:not([value]):not([value=""]) {
        display: none !important;
      }
      /* Hide empty containers */
      div:empty, span:empty, p:empty {
        display: none !important;
      }
      /* Remove excessive spacing */
      [class*="space-y"]:empty,
      [class*="gap-"]:empty {
        display: none !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      /* Force 2-column layout for all grids */
      .grid, [class*="grid"], [class*="grid-cols"] {
        display: grid !important;
        grid-template-columns: repeat(2, 1fr) !important;
        gap: 8px !important;
        margin-bottom: 10px !important;
      }
      /* Full width items */
      [class*="col-span"], [class*="full-width"] {
        grid-column: 1 / -1 !important;
      }
      .section {
        page-break-inside: avoid;
        margin-bottom: 15px;
      }
      /* Field containers - show values from inputs */
      [class*="relative"]:has(label), [class*="relative"]:has([class*="font-semibold"]) {
        display: block !important;
        margin-bottom: 8px !important;
        padding: 6px 8px !important;
        background: #f8fafc !important;
        border-left: 3px solid #3b82f6 !important;
        border-radius: 3px !important;
        page-break-inside: avoid !important;
      }
      /* Show input values */
      input[type="text"], input[type="number"], input[type="date"],
      select, textarea {
        display: block !important;
        font-size: 9pt !important;
        color: #1e293b !important;
        margin: 0 !important;
        padding: 2px 0 !important;
        background: transparent !important;
        border: none !important;
        width: 100% !important;
        -webkit-appearance: none !important;
        -moz-appearance: none !important;
        appearance: none !important;
      }
      /* Remove decorative elements */
      [class*="gradient"], [class*="blur"], [class*="shadow-xl"], 
      [class*="backdrop-blur"], [class*="absolute"] {
        background: transparent !important;
        backdrop-filter: none !important;
        box-shadow: none !important;
        position: static !important;
      }
      table {
        page-break-inside: auto;
        font-size: 8pt;
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
    ${logoBase64 ? `
    <div class="logo-container">
      <img src="${logoBase64}" alt="PGIMER Logo" />
    </div>
    ` : ''}
    <div class="header-text">
      <h1>POSTGRADUATE INSTITUTE OF MEDICAL EDUCATION & RESEARCH</h1>
      <h2>Department of Psychiatry</h2>
      <p class="subtitle">Prescription</p>
    </div>
  </div>
  <div class="content">
    ${sectionHTML}
  </div>
  <div class="footer">
    <p><strong>Generated on:</strong> ${new Date().toLocaleString('en-IN', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    })}</p>
    <p><strong>PGIMER - Department of Psychiatry</strong> | Electronic Medical Record System</p>
    <p style="font-size: 8pt; margin-top: 8px; color: #94a3b8;">This is a computer-generated document. No signature required.</p>
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
      }, 500);
    };
  };

  // Print handler for unified visit cards
  const handlePrintVisit = async (visitId, visitDate) => {
    // Find the visit from trulyPastProformas
    const visitProforma = trulyPastProformas.find(p => p.id === visitId);
    if (!visitProforma) {
      toast.error('Visit not found');
      return;
    }

    // Check which forms exist for this visit
    const hasAdl = patientAdlFiles.some(adl => adl.clinical_proforma_id === visitId);
    // Note: Prescription check would need to be added if prescription data is available

    // Ensure visit card is expanded first
    if (!isVisitCardExpanded(visitId)) {
      toggleVisitCard(visitId);
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    // Expand all sections for this visit to ensure they're in the DOM
    // Use setState directly to ensure all sections are expanded
    const sectionsToExpand = ['clinicalProforma'];
    if (hasAdl) sectionsToExpand.push('adl');
    // Add prescription if available
    sectionsToExpand.push('prescription');
    
    const newExpandedSections = { ...expandedVisitSections };
    sectionsToExpand.forEach(section => {
      const key = `${visitId}-${section}`;
      newExpandedSections[key] = true;
    });
    setExpandedVisitSections(newExpandedSections);

    // Wait for React to render - use multiple wait cycles
    await new Promise(resolve => setTimeout(resolve, 100));
    await new Promise(resolve => requestAnimationFrame(resolve));
    await new Promise(resolve => setTimeout(resolve, 100));
    await new Promise(resolve => requestAnimationFrame(resolve));
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Retry mechanism: check if content exists, if not wait more
    // We need to check for the actual content components, not just containers
    let retries = 0;
    const maxRetries = 10;
    let visitPrintRef = visitPrintRefs.current.get(visitId);
    
    while (retries < maxRetries) {
      visitPrintRef = visitPrintRefs.current.get(visitId);
      if (visitPrintRef) {
        // Check for actual content - look for specific elements that indicate content is rendered
        const hasClinicalContent = visitPrintRef.querySelector('div.mt-3') && 
          (visitPrintRef.textContent.includes('Visit Type') || 
           visitPrintRef.textContent.includes('Room No') ||
           visitPrintRef.querySelector('[class*="ClinicalProforma"]') ||
           visitPrintRef.querySelector('table') ||
           visitPrintRef.querySelector('div[class*="grid"]'));
        
        if (hasClinicalContent) {
          console.log('Content found after', retries, 'retries');
          break;
        }
      }
      await new Promise(resolve => setTimeout(resolve, 200));
      retries++;
    }

    if (!visitPrintRef) {
      toast.error('Please expand the visit card first');
      console.error('Print ref not available for visit:', visitId);
      return;
    }

    // Final verification - check if we have actual content
    const finalCheck = visitPrintRef.querySelector('div.mt-3');
    if (!finalCheck) {
      console.warn('Content sections not found, but proceeding with print...');
      // Still proceed - maybe the content is there but selector is different
    }

    try {
      let logoBase64 = '';
      try {
        const logoResponse = await fetch(PGI_Logo);
        const logoBlob = await logoResponse.blob();
        const logoReader = new FileReader();
        logoBase64 = await new Promise((resolve) => {
          logoReader.onloadend = () => resolve(logoReader.result);
          logoReader.readAsDataURL(logoBlob);
        });
      } catch (e) {
        console.warn('Could not load logo for print:', e);
      }

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error('Please allow pop-ups to print this visit');
        return;
      }

      // Clone the element to avoid modifying the original
      const clonedElement = visitPrintRef.cloneNode(true);
      
      // IMPORTANT: First, ensure all content divs with mt-3 class are visible
      // These contain the actual form content (ClinicalProformaDetails, ViewADL, etc.)
      const contentDivs = clonedElement.querySelectorAll('div.mt-3');
      contentDivs.forEach(div => {
        div.style.display = '';
        div.style.visibility = 'visible';
        // Remove any parent that might be hiding it
        let parent = div.parentElement;
        while (parent && parent !== clonedElement) {
          if (parent.style.display === 'none') {
            parent.style.display = '';
          }
          parent = parent.parentElement;
        }
      });

      // Remove all interactive elements and chevrons, but PRESERVE content divs
      const elementsToRemove = clonedElement.querySelectorAll(
        'button, .no-print, [class*="no-print"], nav, header, aside, [class*="Button"], ' +
        '[class*="chevron"], [class*="Chevron"], [class*="Printer"], [role="button"], ' +
        'input[type="button"], input[type="submit"], ' +
        '.cursor-pointer:not(.print-keep):not(div.mt-3):not(div.mt-3 *), [onclick]'
      );
      elementsToRemove.forEach(el => {
        // Don't remove if it's inside a content div
        if (!el.closest('div.mt-3')) {
          el.remove();
        }
      });

      // Remove chevron icons from section headers (but keep the headers themselves)
      const chevrons = clonedElement.querySelectorAll('svg[class*="chevron"], svg[class*="Chevron"]');
      chevrons.forEach(chevron => {
        // Only remove if not inside content
        if (!chevron.closest('div.mt-3')) {
          chevron.remove();
        }
      });

      // Clean up header divs that only contain chevrons, but keep headers with content
      const headerDivs = clonedElement.querySelectorAll('div.flex.items-center.justify-between');
      headerDivs.forEach(div => {
        // Only remove if it's a header div with just chevron, not content
        const hasOnlyChevron = div.children.length === 1 && div.querySelector('svg[class*="chevron"]');
        const isContentHeader = div.querySelector('h5') && !div.closest('div.mt-3');
        if (hasOnlyChevron && !isContentHeader) {
          // Check if this div is just for chevron, not a real header
          const hasTitle = div.textContent.trim().length > 10; // Has meaningful text
          if (!hasTitle) {
            div.remove();
          }
        }
      });

      // Ensure all conditional sections are visible (remove display:none if any)
      const allElements = clonedElement.querySelectorAll('*');
      allElements.forEach(el => {
        if (el.style.display === 'none' && el.closest('div.mt-3')) {
          el.style.display = '';
        }
      });

      // Transform checkbox/radio groups to compact format
      // Find all checkbox/radio groups and make them display in grid
      const checkboxGroups = clonedElement.querySelectorAll('div.flex.flex-wrap, div[class*="flex-wrap"]');
      checkboxGroups.forEach(group => {
        const hasCheckboxes = group.querySelector('input[type="checkbox"], input[type="radio"]');
        if (hasCheckboxes) {
          group.style.display = 'grid';
          group.style.gridTemplateColumns = 'repeat(4, 1fr)';
          group.style.gap = '4px 8px';
          group.style.marginBottom = '8px';
        }
      });

      // Find all labels with checkboxes/radios and make them compact
      const checkboxLabels = clonedElement.querySelectorAll('label');
      checkboxLabels.forEach(label => {
        const input = label.querySelector('input[type="checkbox"], input[type="radio"]');
        if (input) {
          if (!input.checked) {
            // Hide unchecked items
            label.style.display = 'none';
          } else {
            // Style checked items compactly
            label.style.display = 'inline-flex';
            label.style.alignItems = 'center';
            label.style.margin = '2px 8px 2px 0';
            label.style.padding = '3px 6px';
            label.style.fontSize = '9pt';
            label.style.background = '#e0f2fe';
            label.style.border = '1px solid #0ea5e9';
            label.style.borderRadius = '3px';
            label.style.fontWeight = '500';
            input.style.width = '12px';
            input.style.height = '12px';
            input.style.marginRight = '6px';
            input.style.marginBottom = '0';
          }
        }
      });

      // Also handle space-y containers that might have checkboxes
      const spaceYContainers = clonedElement.querySelectorAll('.space-y-2, .space-y-3, .space-y-4');
      spaceYContainers.forEach(container => {
        const hasCheckboxes = container.querySelector('input[type="checkbox"], input[type="radio"]');
        if (hasCheckboxes) {
          container.style.display = 'grid';
          container.style.gridTemplateColumns = 'repeat(4, 1fr)';
          container.style.gap = '4px 8px';
        }
      });

      // Debug: Log what we're about to print
      const contentCheck = clonedElement.querySelectorAll('div.mt-3');
      console.log('Content divs found:', contentCheck.length);
      contentCheck.forEach((div, idx) => {
        console.log(`Content div ${idx}:`, div.textContent.substring(0, 100));
      });

      const sectionElement = clonedElement;
      
      // Get patient info for header
      const patientName = patient?.name || 'N/A';
      const patientCRNo = patient?.cr_no || 'N/A';
      const patientAge = patient?.age || 'N/A';
      const patientSex = patient?.sex || 'N/A';
      
      const printContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Visit Record - ${visitDate}</title>
            <meta charset="UTF-8">
            <style>
              @page { 
                margin: 12mm 10mm 12mm 15mm; 
                size: A4;
                @top-center {
                  content: "PGIMER - Patient Visit Record";
                  font-size: 9pt;
                  color: #666;
                }
                @bottom-right {
                  content: "Page " counter(page) " of " counter(pages);
                  font-size: 9pt;
                  color: #666;
                }
              }
              * {
                box-sizing: border-box;
                margin: 0;
                padding: 0;
              }
              body { 
                font-family: 'Times New Roman', 'Georgia', serif; 
                margin: 0; 
                padding: 0;
                font-size: 10.5pt;
                line-height: 1.6;
                color: #1a1a1a;
                background: #fff;
              }
              .print-header { 
                text-align: center; 
                margin-bottom: 20px;
                padding-bottom: 12px;
                border-bottom: 3px solid #2563eb;
                page-break-after: avoid;
              }
              .logo { 
                max-width: 100px; 
                height: auto;
                margin-bottom: 8px;
                display: block;
                margin-left: auto;
                margin-right: auto;
              }
              .hospital-name {
                font-size: 16pt;
                font-weight: bold;
                color: #1e40af;
                margin: 5px 0;
                letter-spacing: 0.5px;
              }
              .document-title {
                font-size: 14pt;
                font-weight: 600;
                color: #374151;
                margin-top: 5px;
              }
              .patient-info-box {
                background: linear-gradient(to right, #eff6ff, #f0f9ff);
                border: 2px solid #3b82f6;
                border-radius: 4px;
                padding: 12px 15px;
                margin-bottom: 20px;
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 12px;
                page-break-after: avoid;
              }
              .patient-info-item {
                display: flex;
                flex-direction: column;
              }
              .patient-info-label {
                font-size: 8.5pt;
                color: #64748b;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-bottom: 3px;
              }
              .patient-info-value {
                font-size: 10pt;
                color: #1e293b;
                font-weight: 600;
              }
              .visit-header { 
                background: linear-gradient(135deg, #7c3aed 0%, #6366f1 100%);
                color: white;
                padding: 10px 15px; 
                border-radius: 4px; 
                margin-bottom: 20px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                page-break-after: avoid;
              }
              .visit-header p {
                margin: 0;
                font-size: 11pt;
                font-weight: 600;
              }
              .form-section {
                margin-bottom: 25px;
                page-break-inside: avoid;
                border: 2px solid #e5e7eb;
                border-radius: 6px;
                padding: 18px;
                background: #ffffff;
                box-shadow: 0 1px 3px rgba(0,0,0,0.05);
              }
              .form-section-title {
                font-size: 13pt;
                font-weight: bold;
                margin-bottom: 12px;
                padding-bottom: 8px;
                border-bottom: 3px solid;
                text-transform: uppercase;
                letter-spacing: 0.5px;
              }
              .form-section.clinical-proforma .form-section-title {
                color: #059669;
                border-bottom-color: #059669;
              }
              .form-section.adl .form-section-title {
                color: #ea580c;
                border-bottom-color: #ea580c;
              }
              .form-section.prescription .form-section-title {
                color: #d97706;
                border-bottom-color: #d97706;
              }
              h2 { 
                color: #1e40af; 
                margin: 18px 0 10px 0; 
                border-bottom: 2px solid #3b82f6; 
                padding-bottom: 6px;
                font-size: 12pt;
                font-weight: bold;
                page-break-after: avoid;
              }
              h3 { 
                color: #059669; 
                margin: 14px 0 8px 0;
                font-size: 11pt;
                font-weight: 600;
                page-break-after: avoid;
              }
              h4 { 
                color: #7c3aed; 
                margin: 12px 0 6px 0;
                font-size: 10.5pt;
                font-weight: 600;
              }
              h5 {
                font-size: 10.5pt;
                margin: 10px 0 5px 0;
                font-weight: 600;
                color: #374151;
              }
              .field-group {
                margin-bottom: 12px;
                padding: 8px;
                background: #f9fafb;
                border-left: 3px solid #3b82f6;
                page-break-inside: avoid;
              }
              .field-label {
                font-weight: 600;
                color: #475569;
                font-size: 9pt;
                text-transform: uppercase;
                letter-spacing: 0.3px;
                margin-bottom: 4px;
              }
              .field-value {
                color: #1e293b;
                font-size: 10pt;
                line-height: 1.5;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin: 12px 0;
                font-size: 9.5pt;
                page-break-inside: avoid;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
              }
              table td, table th {
                padding: 10px 12px;
                border: 1px solid #cbd5e1;
                text-align: left;
                vertical-align: top;
              }
              table th {
                background: linear-gradient(to bottom, #f1f5f9, #e2e8f0);
                font-weight: bold;
                color: #1e293b;
                font-size: 9.5pt;
                text-transform: uppercase;
                letter-spacing: 0.3px;
                border-bottom: 2px solid #3b82f6;
              }
              table tr:nth-child(even) {
                background-color: #f8fafc;
              }
              table tr:hover {
                background-color: #f1f5f9;
              }
              .section { 
                margin-bottom: 20px; 
                page-break-inside: avoid; 
              }
              .border-l-4 {
                border-left: 4px solid #3b82f6 !important;
                padding-left: 12px !important;
                margin-left: 0 !important;
              }
              .grid {
                display: grid;
                gap: 10px;
              }
              .grid-cols-2 {
                grid-template-columns: repeat(2, 1fr);
              }
              .grid-cols-3 {
                grid-template-columns: repeat(3, 1fr);
              }
              .grid-cols-4 {
                grid-template-columns: repeat(4, 1fr);
              }
              input[disabled], textarea[disabled], select[disabled] {
                background: #f1f5f9 !important;
                color: #1e293b !important;
                border: 1px solid #cbd5e1 !important;
                padding: 6px 10px !important;
                border-radius: 4px !important;
                font-size: 10pt !important;
              }
              /* Compact checkbox/radio button groups */
              label:has(input[type="checkbox"]), 
              label:has(input[type="radio"]),
              label input[type="checkbox"],
              label input[type="radio"] {
                display: inline-flex !important;
                align-items: center !important;
              }
              input[type="checkbox"], input[type="radio"] {
                width: 12px !important;
                height: 12px !important;
                margin-right: 6px !important;
                margin-bottom: 0 !important;
                flex-shrink: 0 !important;
                cursor: default !important;
              }
              /* Checkbox/radio groups container - make them display in columns */
              .flex.flex-wrap, 
              [class*="flex-wrap"],
              .space-y-2,
              .space-y-3,
              .space-y-4 {
                display: grid !important;
                grid-template-columns: repeat(4, 1fr) !important;
                gap: 4px 8px !important;
                margin-bottom: 8px !important;
                page-break-inside: avoid !important;
              }
              /* Hide unchecked checkboxes/radios in print - only show checked ones */
              input[type="checkbox"]:not(:checked),
              input[type="radio"]:not(:checked) {
                display: none !important;
              }
              /* Style checked items - compact display */
              label:has(input[type="checkbox"]:checked),
              label:has(input[type="radio"]:checked) {
                display: inline-flex !important;
                align-items: center !important;
                margin: 2px 4px 2px 0 !important;
                padding: 3px 6px !important;
                font-size: 9pt !important;
                line-height: 1.2 !important;
                background: #e0f2fe !important;
                border: 1px solid #0ea5e9 !important;
                border-radius: 3px !important;
                font-weight: 500 !important;
                page-break-inside: avoid !important;
              }
              /* Hide labels with unchecked inputs */
              label:has(input[type="checkbox"]:not(:checked)),
              label:has(input[type="radio"]:not(:checked)) {
                display: none !important;
              }
              button, .no-print, [class*="no-print"], nav, header, aside, 
              [class*="Button"], [class*="chevron"], [class*="Chevron"], 
              [class*="Printer"], [role="button"], input[type="button"],
              input[type="submit"], .cursor-pointer:not(.print-keep),
              svg[class*="chevron"], svg[class*="Chevron"] {
                display: none !important;
              }
              .mt-3 {
                margin-top: 12px !important;
              }
              .mb-3 {
                margin-bottom: 12px !important;
              }
              .p-4, .p-6 {
                padding: 12px !important;
              }
              .space-y-4 > * + * {
                margin-top: 12px;
              }
              .space-y-6 > * + * {
                margin-top: 18px;
              }
              @media print {
                body { 
                  padding: 0;
                  font-size: 10pt;
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
                }
                .form-section {
                  page-break-inside: avoid;
                  margin-bottom: 15px;
                  border: 1.5px solid #cbd5e1;
                }
                .section { 
                  page-break-inside: avoid; 
                }
                .patient-info-box {
                  page-break-after: avoid;
                }
                .visit-header {
                  page-break-after: avoid;
                }
                @page {
                  margin: 12mm 10mm 12mm 15mm;
                }
                a {
                  color: #1e40af;
                  text-decoration: underline;
                }
              }
            </style>
          </head>
          <body>
            <div class="print-header">
              ${logoBase64 ? `<img src="${logoBase64}" alt="PGIMER Logo" class="logo" />` : ''}
              <div class="hospital-name">POSTGRADUATE INSTITUTE OF MEDICAL EDUCATION & RESEARCH</div>
              <div class="document-title">PATIENT VISIT RECORD</div>
            </div>
            <div class="patient-info-box">
              <div class="patient-info-item">
                <span class="patient-info-label">Patient Name</span>
                <span class="patient-info-value">${patientName}</span>
              </div>
              <div class="patient-info-item">
                <span class="patient-info-label">CR No.</span>
                <span class="patient-info-value">${patientCRNo}</span>
              </div>
              <div class="patient-info-item">
                <span class="patient-info-label">Age</span>
                <span class="patient-info-value">${patientAge}</span>
              </div>
              <div class="patient-info-item">
                <span class="patient-info-label">Sex</span>
                <span class="patient-info-value">${patientSex}</span>
              </div>
            </div>
            <div class="visit-header">
              <p><strong>Visit Date:</strong> ${visitDate}</p>
            </div>
            ${sectionElement.innerHTML}
          </body>
        </html>
      `;

      printWindow.document.write(printContent);
      printWindow.document.close();

      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
          toast.success('Print dialog opened');
        }, 500);
      };
    } catch (error) {
      console.error('Print error:', error);
      toast.error('Failed to print visit. Please try again.');
    }
  };

  // Determine which sections to show based on CURRENT USER's role (userRole)
  // If current user is System Administrator, JR, or SR → Show all sections
  const canViewAllSections = userRole && (
    isAdmin(userRole) ||
    isJrSr(userRole)
  );
  const canViewClinicalProforma = canViewAllSections;
  const canViewPrescriptions = canViewAllSections;

  // ADL File: Show only if case is complex OR ADL file already exists
  // Handle different possible data structures from API
  const patientAdlFiles = adlData?.data?.adlFiles || adlData?.data?.files || adlData?.data || [];
  const patientProformas = Array.isArray(clinicalData?.data?.proformas)
    ? clinicalData.data.proformas
    : [];

  // Fetch visit history for existing patients
  const { data: visitHistoryData, isLoading: isLoadingVisitHistory } = useGetPatientVisitHistoryQuery(
    patient?.id,
    { skip: !patient?.id }
  );
  // Extract visit history from API response
  // The API returns { success: true, data: { patient: ..., visitHistory: [...] } }
  const visitHistory = visitHistoryData?.visitHistory || visitHistoryData?.data?.visitHistory || [];

  // Helper function to convert date to IST date string (YYYY-MM-DD)
  const toISTDateString = (dateInput) => {
    try {
      if (!dateInput) return '';
      const d = new Date(dateInput);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); // YYYY-MM-DD
    } catch (_) {
      return '';
    }
  };

  // Check if patient was created today
  const isNewPatientToday = () => {
    if (!patient?.created_at) return false;
    const todayDateString = toISTDateString(new Date());
    const patientCreatedDate = toISTDateString(patient.created_at);
    return patientCreatedDate && patientCreatedDate === todayDateString;
  };

  // Get today's date string for filtering
  const todayDateString = toISTDateString(new Date());
  
  // First, determine if patient is existing (has past history or not created today)
  // This needs to be calculated before filtering to avoid circular dependency
  const hasAnyPastVisits = visitHistory.some(visit => {
    if (!visit) return false;
    const visitDate = toISTDateString(visit.visit_date);
    return visitDate && visitDate !== todayDateString;
  });
  
  const hasAnyPastProformas = patientProformas.some(proforma => {
    if (!proforma) return false;
    const proformaDate = toISTDateString(proforma.visit_date || proforma.created_at);
    return proformaDate && proformaDate !== todayDateString;
  });
  
  // Patient is existing if: not created today OR has past visits/proformas
  const isExistingPatient = !isNewPatientToday() || hasAnyPastVisits || hasAnyPastProformas;
  
  // Get today's visits (current visit) - for display in current visit section
  const todayVisitHistory = visitHistory.filter(visit => {
    const visitDate = toISTDateString(visit.visit_date);
    return visitDate && visitDate === todayDateString;
  });
  
  // For existing patients, show ALL visits in history (including today's) from registration date
  // For new patients, only show past visits (exclude today's)
  const pastVisitHistory = isExistingPatient 
    ? visitHistory.filter(visit => visit !== null && visit !== undefined) // Show all visits for existing patients from registration
    : visitHistory.filter(visit => {
        if (!visit) return false;
        const visitDate = toISTDateString(visit.visit_date);
        // For new patients, exclude today's visits from past history
        if (!visitDate) return true; // Include visits without date as past
        return visitDate !== todayDateString;
      });
  
  // Separate today's proformas (current visit) from past proformas
  const todayProformas = patientProformas.filter(proforma => {
    const proformaDate = toISTDateString(proforma.visit_date || proforma.created_at);
    return proformaDate && proformaDate === todayDateString;
  });
  
  // Get the latest proforma for current visit (most recent today's proforma)
  // This is used to identify which visit is currently being edited/viewed
  // Must be defined before trulyPastProformas which uses it
  const currentVisitProforma = todayProformas.length > 0 
    ? todayProformas.sort((a, b) => {
        const dateA = new Date(a.visit_date || a.created_at || 0);
        const dateB = new Date(b.visit_date || b.created_at || 0);
        return dateB - dateA; // Most recent first
      })[0]
    : null;
  
  // For existing patients, show ALL proformas in history (including today's) from registration date
  // For new patients, only show past proformas (exclude today's)
  const pastProformas = isExistingPatient
    ? patientProformas.filter(proforma => proforma !== null && proforma !== undefined) // Show all proformas for existing patients from registration
    : patientProformas.filter(proforma => {
        if (!proforma) return false;
        const proformaDate = toISTDateString(proforma.visit_date || proforma.created_at);
        // For new patients, exclude today's proformas from past history
        if (!proformaDate) return true; // Include proformas without date as past
        return proformaDate !== todayDateString;
      });

  // For Past History card: show all proformas except the one currently being edited
  // This ensures that newly created visits appear in Past History once they're saved
  // We exclude only the currentVisitProforma (if it exists) to avoid showing it in both sections
  const trulyPastProformas = patientProformas.filter(proforma => {
    if (!proforma) return false;
    // Exclude the current visit proforma if it exists (to avoid duplication)
    // All other proformas (including today's saved visits) should appear in Past History
    if (currentVisitProforma && proforma.id === currentVisitProforma.id) {
      return false; // Exclude current visit being edited
    }
    return true; // Include all other proformas (past and today's saved visits)
  });

  // Create unified visit structure: group proformas, ADL files, and prescriptions by visit
  const unifiedVisits = useMemo(() => {
    // Sort proformas chronologically (newest first - latest visit at top)
    const sortedProformas = [...trulyPastProformas].sort((a, b) => {
      const dateA = new Date(a.visit_date || a.created_at || 0);
      const dateB = new Date(b.visit_date || b.created_at || 0);
      return dateB - dateA; // Newest first (latest visit at top)
    });

    // Create visit objects with all associated forms
    return sortedProformas.map((proforma) => {
      const visitId = proforma.id;
      const visitDate = proforma.visit_date || proforma.created_at;
      
      // Find associated ADL file
      const adlFile = patientAdlFiles.find(adl => adl.clinical_proforma_id === visitId);
      
      // Note: Prescription data would need to be fetched separately if needed
      // For now, we'll assume it might exist but we don't have the data structure here
      
      return {
        visitId,
        visitDate,
        proforma,
        adlFile: adlFile || null,
        prescription: null, // Would need to be fetched if needed
        hasAdl: !!adlFile,
        hasPrescription: false, // Would need to check if prescription exists
      };
    });
  }, [trulyPastProformas, patientAdlFiles]);

  // Get the last visit's proforma for pre-filling form (for existing patients)
  // This is used as reference only - will create a NEW record when submitted
  // IMPORTANT: Use ALL proformas (including today's) to get the most recent one for pre-filling
  // We want to pre-fill with the most recent visit data, even if it's today's visit
  const lastVisitProforma = patientProformas.length > 0
    ? [...patientProformas].sort((a, b) => {
        const dateA = new Date(a.visit_date || a.created_at || 0);
        const dateB = new Date(b.visit_date || b.created_at || 0);
        return dateB - dateA; // Most recent first
      })[0]
    : null;

  // Check if patient has actual past history (not including today's visits/proformas)
  const hasPastHistory = pastVisitHistory.length > 0 || pastProformas.length > 0;

  // Check if patient is new (created today) and has no past history
  const isNewPatientWithNoHistory = isNewPatientToday() && !hasPastHistory;

  // Determine if patient is today's patient
  // Today's patient: created today OR has visit/proforma today
  const isTodaysPatient = isNewPatientToday() || todayProformas.length > 0 || todayVisitHistory.length > 0;

  // State to control showing form (only show if no current visit proforma or editing)
  const [showProformaForm, setShowProformaForm] = useState(() => {
    // If mode=create is passed, always show form directly
    if (isCreateMode) {
      return true;
    }
    // If there's a current visit proforma, don't show form initially
    // Otherwise, show form for new proforma
    // For new patients, always show form initially
    return !currentVisitProforma;
  });

  // State for selected proforma to edit (only for past visit corrections, not current visit)
  // CRITICAL: Never auto-select current visit proforma - "Edit" on current visit = Create New
  const [selectedProformaId, setSelectedProformaId] = useState(() => {
    // Always start with null - never auto-select current visit proforma
    return null;
  });

  // Update showProformaForm when currentVisitProforma changes (after data loads)
  useEffect(() => {
    // If mode=create is passed (from Today's Patients), always show form directly
    if (isCreateMode) {
      setSelectedProformaId(null);
      setShowProformaForm(true);
      // Ensure the clinical proforma card is expanded
      setExpandedCards(prev => ({ ...prev, clinical: true }));
      return;
    }
    
    if (currentVisitProforma?.id) {
      // If current visit proforma exists, don't show form initially
      // User must click "Create New" to open blank form
      setShowProformaForm(false);
    } else {
      // If no current visit proforma, show form for new proforma
      setSelectedProformaId(null);
      setShowProformaForm(true);
    }
  }, [currentVisitProforma, isCreateMode]);

  // Ensure form is shown for new patients without history
  useEffect(() => {
    if (isNewPatientWithNoHistory && !currentVisitProforma) {
      setShowProformaForm(true);
      // Also ensure card is expanded for new patients
      setExpandedCards(prev => ({ ...prev, clinical: true }));
    }
  }, [isNewPatientWithNoHistory, currentVisitProforma]);

  // Update showProformaForm when user explicitly edits a past proforma (corrections only)
  useEffect(() => {
    // CRITICAL: Only allow editing past visit performas (corrections)
    // Current visit "Edit" button creates new performa (handled in button onClick)
    // If selectedProformaId is set, it means user is correcting a past performa
    if (selectedProformaId && (!currentVisitProforma || selectedProformaId !== currentVisitProforma.id?.toString())) {
      // User is editing a past performa (correction) - show form with that data
      setShowProformaForm(true);
    }
  }, [selectedProformaId, currentVisitProforma]);


  // Fetch selected proforma data for editing (ONLY for past visit corrections, not current visit)
  // CRITICAL: Only fetch if selectedProformaId is set AND it's NOT the current visit proforma
  const isEditingPastProforma = selectedProformaId && 
    (!currentVisitProforma || selectedProformaId !== currentVisitProforma.id?.toString());
  
  const {
    data: selectedProformaData,
    isLoading: isLoadingSelectedProforma,
    refetch: refetchSelectedProforma
  } = useGetClinicalProformaByIdQuery(
    selectedProformaId,
    {
      skip: !isEditingPastProforma, // Only fetch for past performa corrections, never for current visit
      refetchOnMountOrArgChange: true // Always refetch when ID changes
    }
  );

  const selectedProforma = selectedProformaData?.data?.proforma || selectedProformaData?.data?.clinical_proforma;

  // Debug logging for selected proforma
  useEffect(() => {
    if (selectedProforma) {

    }
  }, [selectedProforma]);

  // Debug logging to help troubleshoot ADL data (after all variables are defined)
  useEffect(() => {}, [adlData, patientAdlFiles.length, selectedProforma?.adl_file_id]);

  // Auto-expand clinical card when selected proforma loads OR for new patients without proforma
  useEffect(() => {
    if (selectedProforma) {
      setExpandedCards(prev => ({ ...prev, clinical: true }));
    } else if (!currentVisitProforma && isNewPatientWithNoHistory) {
      // Auto-expand for new patients so they can see the form to create first proforma
      setExpandedCards(prev => ({ ...prev, clinical: true }));
    }
  }, [selectedProforma, currentVisitProforma, isNewPatientWithNoHistory]);

  // Initialize currentDoctorDecision from existing proformas or default (only once)
  useEffect(() => {
    if (currentDoctorDecision === null) {
      const hasComplexCase = patientProformas.some(p => p.doctor_decision === 'complex_case');
      if (hasComplexCase) {
        setCurrentDoctorDecision('complex_case');
      } else if (selectedProforma?.doctor_decision) {
        setCurrentDoctorDecision(selectedProforma.doctor_decision);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientProformas.length, selectedProforma?.doctor_decision]);

  const hasAdlFiles = patientAdlFiles.length > 0 || selectedProforma?.adl_file_id;
  const canViewADLFile = canViewAllSections && hasAdlFiles;
  const isSelectedComplexCase = selectedProforma?.doctor_decision === 'complex_case' && selectedProforma?.adl_file_id;

  // Removed auto-expand logic - cards now default to collapsed (false)
  // ADL and Prescription cards will remain collapsed by default

  


  const [formData, setFormData] = useState(() => {
    // Helper to safely get value
    const getVal = (val, fallback = '') => {
      if (val === null || val === undefined) return fallback;
      return val;
    };

    // Merge patient data with initialFormData, prioritizing patient data
    const merged = {
      // Basic info - use patient data first, then initialFormData, then empty string
      name: getVal(patient?.name, getVal(initialFormData?.name)),
      sex: getVal(patient?.sex, getVal(initialFormData?.sex)),
      age: getVal(patient?.age, getVal(initialFormData?.age)),
      cr_no: getVal(patient?.cr_no, getVal(initialFormData?.cr_no)),
      psy_no: getVal(patient?.psy_no, getVal(initialFormData?.psy_no)),
      special_clinic_no: getVal(patient?.special_clinic_no, getVal(initialFormData?.special_clinic_no)),
      contact_number: getVal(patient?.contact_number, getVal(initialFormData?.contact_number)),
      father_name: getVal(patient?.father_name, getVal(initialFormData?.father_name)),
      category: getVal(patient?.category, getVal(initialFormData?.category)),

      // Dates
      date: getVal(patient?.date, getVal(initialFormData?.date)),
      seen_in_walk_in_on: getVal(patient?.seen_in_walk_in_on, getVal(initialFormData?.seen_in_walk_in_on)),
      worked_up_on: getVal(patient?.worked_up_on, getVal(initialFormData?.worked_up_on)),

      // Quick Entry
      department: getVal(patient?.department, getVal(initialFormData?.department)),
      unit_consit: getVal(patient?.unit_consit, getVal(initialFormData?.unit_consit)),
      room_no: getVal(patient?.room_no, getVal(initialFormData?.room_no)),
      serial_no: getVal(patient?.serial_no, getVal(initialFormData?.serial_no)),
      file_no: getVal(patient?.file_no, getVal(initialFormData?.file_no)),
      unit_days: getVal(patient?.unit_days, getVal(initialFormData?.unit_days)),

      // Personal Information
      age_group: getVal(patient?.age_group, getVal(initialFormData?.age_group)),
      marital_status: getVal(patient?.marital_status, getVal(initialFormData?.marital_status)),
      year_of_marriage: getVal(patient?.year_of_marriage, getVal(initialFormData?.year_of_marriage)),
      no_of_children_male: getVal(patient?.no_of_children_male, getVal(initialFormData?.no_of_children_male)),
      no_of_children_female: getVal(patient?.no_of_children_female, getVal(initialFormData?.no_of_children_female)),

      // Occupation & Education
      occupation: getVal(patient?.occupation, getVal(initialFormData?.occupation)),
      occupation_other: getVal(patient?.occupation_other, getVal(initialFormData?.occupation_other)),
      education: getVal(patient?.education, getVal(initialFormData?.education)),
      locality: getVal(patient?.locality, getVal(initialFormData?.locality)),
      locality_other: getVal(patient?.locality_other, getVal(initialFormData?.locality_other)),
      patient_income: getVal(patient?.patient_income, getVal(initialFormData?.patient_income)),
      family_income: getVal(patient?.family_income, getVal(initialFormData?.family_income)),
      religion: getVal(patient?.religion, getVal(initialFormData?.religion)),
      religion_other: getVal(patient?.religion_other, getVal(initialFormData?.religion_other)),
      family_type: getVal(patient?.family_type, getVal(initialFormData?.family_type)),
      family_type_other: getVal(patient?.family_type_other, getVal(initialFormData?.family_type_other)),

      // Head of Family
      head_name: getVal(patient?.head_name, getVal(initialFormData?.head_name)),
      head_age: getVal(patient?.head_age, getVal(initialFormData?.head_age)),
      head_relationship: getVal(patient?.head_relationship, getVal(initialFormData?.head_relationship)),
      head_relationship_other: getVal(patient?.head_relationship_other, getVal(initialFormData?.head_relationship_other)),
      head_education: getVal(patient?.head_education, getVal(initialFormData?.head_education)),
      head_occupation: getVal(patient?.head_occupation, getVal(initialFormData?.head_occupation)),
      head_income: getVal(patient?.head_income, getVal(initialFormData?.head_income)),

      // Referral & Mobility
      distance_from_hospital: getVal(patient?.distance_from_hospital, getVal(initialFormData?.distance_from_hospital)),
      mobility: getVal(patient?.mobility, getVal(initialFormData?.mobility)),
      mobility_other: getVal(patient?.mobility_other, getVal(initialFormData?.mobility_other)),
      referred_by: getVal(patient?.referred_by, getVal(initialFormData?.referred_by)),
      referred_by_other: getVal(patient?.referred_by_other, getVal(initialFormData?.referred_by_other)),

      // Address
      address_line: getVal(patient?.address_line, getVal(initialFormData?.address_line)),
      country: getVal(patient?.country, getVal(initialFormData?.country)),
      state: getVal(patient?.state, getVal(initialFormData?.state)),
      district: getVal(patient?.district, getVal(initialFormData?.district)),
      city: getVal(patient?.city, getVal(initialFormData?.city)),
      pin_code: getVal(patient?.pin_code, getVal(initialFormData?.pin_code)),

      // Permanent Address fields
      permanent_address_line_1: getVal(patient?.permanent_address_line_1, getVal(initialFormData?.permanent_address_line_1)),
      permanent_city_town_village: getVal(patient?.permanent_city_town_village, getVal(initialFormData?.permanent_city_town_village)),
      permanent_district: getVal(patient?.permanent_district, getVal(initialFormData?.permanent_district)),
      permanent_state: getVal(patient?.permanent_state, getVal(initialFormData?.permanent_state)),
      permanent_pin_code: getVal(patient?.permanent_pin_code, getVal(initialFormData?.permanent_pin_code)),
      permanent_country: getVal(patient?.permanent_country, getVal(initialFormData?.permanent_country)),

      // Present Address fields
      present_address_line_1: getVal(patient?.present_address_line_1, getVal(initialFormData?.present_address_line_1)),
      present_address_line_2: getVal(patient?.present_address_line_2, getVal(initialFormData?.present_address_line_2)),
      present_city_town_village: getVal(patient?.present_city_town_village, getVal(initialFormData?.present_city_town_village)),
      present_city_town_village_2: getVal(patient?.present_city_town_village_2, getVal(initialFormData?.present_city_town_village_2)),
      present_district: getVal(patient?.present_district, getVal(initialFormData?.present_district)),
      present_district_2: getVal(patient?.present_district_2, getVal(initialFormData?.present_district_2)),
      present_state: getVal(patient?.present_state, getVal(initialFormData?.present_state)),
      present_state_2: getVal(patient?.present_state_2, getVal(initialFormData?.present_state_2)),
      present_pin_code: getVal(patient?.present_pin_code, getVal(initialFormData?.present_pin_code)),
      present_pin_code_2: getVal(patient?.present_pin_code_2, getVal(initialFormData?.present_pin_code_2)),
      present_country: getVal(patient?.present_country, getVal(initialFormData?.present_country)),
      present_country_2: getVal(patient?.present_country_2, getVal(initialFormData?.present_country_2)),

      // Local Address field
      local_address: getVal(patient?.local_address, getVal(initialFormData?.local_address)),

      // Assignment
      assigned_doctor_id: patient?.assigned_doctor_id ? String(patient.assigned_doctor_id) : getVal(initialFormData?.assigned_doctor_id),
      assigned_doctor_name: getVal(patient?.assigned_doctor_name, getVal(initialFormData?.assigned_doctor_name)),
      assigned_room: getVal(patient?.assigned_room, getVal(initialFormData?.assigned_room)),
    };
    return merged;
  });

  // Update form data when patient prop changes (handles cases where patient loads after initial render)
  // This ensures ALL existing data is populated when editing
  useEffect(() => {
    if (patient && (patient.id || Object.keys(patient).length > 0)) {

      setFormData(prev => {
        // Populate ALL fields from patient data, handling null/undefined values
        // Use patient value if available (even if null), otherwise keep previous value
        const updated = { ...prev };

        // Helper to safely get value (handles null, undefined, empty string)
        const getValue = (val, fallback = '') => {
          if (val === null || val === undefined) return fallback;
          return val;
        };

        // Basic info - always update if patient has these fields
        if ('name' in patient) updated.name = getValue(patient.name);
        if ('sex' in patient) updated.sex = getValue(patient.sex);
        if ('age' in patient) updated.age = getValue(patient.age);
        if ('cr_no' in patient) updated.cr_no = getValue(patient.cr_no);
        if ('psy_no' in patient) updated.psy_no = getValue(patient.psy_no);
        if ('special_clinic_no' in patient) updated.special_clinic_no = getValue(patient.special_clinic_no);
        if ('contact_number' in patient) updated.contact_number = getValue(patient.contact_number);
        if ('father_name' in patient) updated.father_name = getValue(patient.father_name);
        if ('category' in patient) updated.category = getValue(patient.category);

        // Dates
        if ('date' in patient) updated.date = getValue(patient.date);
        if ('seen_in_walk_in_on' in patient) updated.seen_in_walk_in_on = getValue(patient.seen_in_walk_in_on);
        if ('worked_up_on' in patient) updated.worked_up_on = getValue(patient.worked_up_on);

        // Quick Entry fields
        if ('department' in patient) updated.department = getValue(patient.department);
        if ('unit_consit' in patient) updated.unit_consit = getValue(patient.unit_consit);
        if ('room_no' in patient) updated.room_no = getValue(patient.room_no);
        if ('serial_no' in patient) updated.serial_no = getValue(patient.serial_no);
        if ('file_no' in patient) updated.file_no = getValue(patient.file_no);
        if ('unit_days' in patient) updated.unit_days = getValue(patient.unit_days);

        // Personal Information
        if ('age_group' in patient) updated.age_group = getValue(patient.age_group);
        if ('marital_status' in patient) updated.marital_status = getValue(patient.marital_status);
        if ('year_of_marriage' in patient) updated.year_of_marriage = getValue(patient.year_of_marriage);
        if ('no_of_children_male' in patient) updated.no_of_children_male = getValue(patient.no_of_children_male);
        if ('no_of_children_female' in patient) updated.no_of_children_female = getValue(patient.no_of_children_female);

        // Occupation & Education
        if ('occupation' in patient) updated.occupation = getValue(patient.occupation);
        if ('occupation_other' in patient) {
          updated.occupation_other = getValue(patient.occupation_other);
          // Sync custom occupation value state
          if (patient.occupation_other) {
            setOccupationOther(patient.occupation_other);
          }
        }
        if ('education' in patient) updated.education = getValue(patient.education);
        if ('locality' in patient) updated.locality = getValue(patient.locality);
        if ('locality_other' in patient) {
          updated.locality_other = getValue(patient.locality_other);
          if (patient.locality_other) {
            setLocalityOther(patient.locality_other);
          }
        }
       
        if ('patient_income' in patient) updated.patient_income = getValue(patient.patient_income);
        if ('family_income' in patient) updated.family_income = getValue(patient.family_income);
        if ('religion' in patient) updated.religion = getValue(patient.religion);
        if ('religion_other' in patient) {
          updated.religion_other = getValue(patient.religion_other);
          if (patient.religion_other) {
            setReligionOther(patient.religion_other);
          }
        }
        if ('family_type' in patient) updated.family_type = getValue(patient.family_type);
        if ('family_type_other' in patient) {
          updated.family_type_other = getValue(patient.family_type_other);
          if (patient.family_type_other) {
            setFamilyTypeOther(patient.family_type_other);
          }
        }

        // Head of Family
        if ('head_name' in patient) updated.head_name = getValue(patient.head_name);
        if ('head_age' in patient) updated.head_age = getValue(patient.head_age);
        if ('head_relationship' in patient) updated.head_relationship = getValue(patient.head_relationship);
        if ('head_relationship_other' in patient) {
          updated.head_relationship_other = getValue(patient.head_relationship_other);
          if (patient.head_relationship_other) {
            setHeadRelationshipOther(patient.head_relationship_other);
          }
        }
        if ('head_education' in patient) updated.head_education = getValue(patient.head_education);
        if ('head_occupation' in patient) updated.head_occupation = getValue(patient.head_occupation);
        if ('head_income' in patient) updated.head_income = getValue(patient.head_income);

        // Referral & Mobility
        if ('distance_from_hospital' in patient) updated.distance_from_hospital = getValue(patient.distance_from_hospital);
        if ('mobility' in patient) updated.mobility = getValue(patient.mobility);
        if ('mobility_other' in patient) {
          updated.mobility_other = getValue(patient.mobility_other);
          if (patient.mobility_other) {
            setMobilityOther(patient.mobility_other);
          }
        }
        if ('referred_by' in patient) updated.referred_by = getValue(patient.referred_by);
        if ('referred_by_other' in patient) {
          updated.referred_by_other = getValue(patient.referred_by_other);
          if (patient.referred_by_other) {
            setReferredByOther(patient.referred_by_other);
          }
        }

        // Address
        if ('address_line' in patient) updated.address_line = getValue(patient.address_line);
        if ('country' in patient) updated.country = getValue(patient.country);
        if ('state' in patient) updated.state = getValue(patient.state);
        if ('district' in patient) updated.district = getValue(patient.district);
        if ('city' in patient) updated.city = getValue(patient.city);
        if ('pin_code' in patient) updated.pin_code = getValue(patient.pin_code);

        // Permanent Address
        if ('permanent_address_line_1' in patient) updated.permanent_address_line_1 = getValue(patient.permanent_address_line_1);
        if ('permanent_city_town_village' in patient) updated.permanent_city_town_village = getValue(patient.permanent_city_town_village);
        if ('permanent_district' in patient) updated.permanent_district = getValue(patient.permanent_district);
        if ('permanent_state' in patient) updated.permanent_state = getValue(patient.permanent_state);
        if ('permanent_pin_code' in patient) updated.permanent_pin_code = getValue(patient.permanent_pin_code);
        if ('permanent_country' in patient) updated.permanent_country = getValue(patient.permanent_country);

        // Present Address
        if ('present_address_line_1' in patient) updated.present_address_line_1 = getValue(patient.present_address_line_1);
        if ('present_address_line_2' in patient) updated.present_address_line_2 = getValue(patient.present_address_line_2);
        if ('present_city_town_village' in patient) updated.present_city_town_village = getValue(patient.present_city_town_village);
        if ('present_city_town_village_2' in patient) updated.present_city_town_village_2 = getValue(patient.present_city_town_village_2);
        if ('present_district' in patient) updated.present_district = getValue(patient.present_district);
        if ('present_district_2' in patient) updated.present_district_2 = getValue(patient.present_district_2);
        if ('present_state' in patient) updated.present_state = getValue(patient.present_state);
        if ('present_state_2' in patient) updated.present_state_2 = getValue(patient.present_state_2);
        if ('present_pin_code' in patient) updated.present_pin_code = getValue(patient.present_pin_code);
        if ('present_pin_code_2' in patient) updated.present_pin_code_2 = getValue(patient.present_pin_code_2);
        if ('present_country' in patient) updated.present_country = getValue(patient.present_country);
        if ('present_country_2' in patient) updated.present_country_2 = getValue(patient.present_country_2);

        // Local Address
        if ('local_address' in patient) updated.local_address = getValue(patient.local_address);

        // Assignment
        if ('assigned_doctor_id' in patient) {
          updated.assigned_doctor_id = patient.assigned_doctor_id ? String(patient.assigned_doctor_id) : '';
        }
        if ('assigned_doctor_name' in patient) updated.assigned_doctor_name = getValue(patient.assigned_doctor_name);
        if ('assigned_room' in patient) updated.assigned_room = getValue(patient.assigned_room);


        return updated;
      });
    }
  }, [patient, patient?.id]); // Include patient.id to ensure it triggers when patient data loads

  // State declarations
  const [errors, setErrors] = useState({});



  // Check if fields with "others"/"other" are selected to show custom inputs
  useEffect(() => {
    if (formData.occupation === 'others') {
      setShowOccupationOther(true);
      if (formData.occupation_other) {
        setOccupationOther(formData.occupation_other);
      }
    } else {
      setShowOccupationOther(false);
    }
  }, [formData.occupation, formData.occupation_other]);

  useEffect(() => {
    if (formData.family_type === 'others') {
      setShowFamilyTypeOther(true);
      if (formData.family_type_other) {
        setFamilyTypeOther(formData.family_type_other);
      }
    } else {
      setShowFamilyTypeOther(false);
    }
  }, [formData.family_type, formData.family_type_other]);

  useEffect(() => {
    if (formData.locality === 'other') {
      setShowLocalityOther(true);
      if (formData.locality_other) {
        setLocalityOther(formData.locality_other);
      }
    } else {
      setShowLocalityOther(false);
    }
  }, [formData.locality, formData.locality_other]);

  useEffect(() => {
    if (formData.religion === 'others') {
      setShowReligionOther(true);
      if (formData.religion_other) {
        setReligionOther(formData.religion_other);
      }
    } else {
      setShowReligionOther(false);
    }
  }, [formData.religion, formData.religion_other]);

  useEffect(() => {
    if (formData.head_relationship === 'other') {
      setShowHeadRelationshipOther(true);
      if (formData.head_relationship_other) {
        setHeadRelationshipOther(formData.head_relationship_other);
      }
    } else {
      setShowHeadRelationshipOther(false);
    }
  }, [formData.head_relationship, formData.head_relationship_other]);

  useEffect(() => {
    if (formData.mobility === 'others') {
      setShowMobilityOther(true);
      if (formData.mobility_other) {
        setMobilityOther(formData.mobility_other);
      }
    } else {
      setShowMobilityOther(false);
    }
  }, [formData.mobility, formData.mobility_other]);

  useEffect(() => {
    if (formData.referred_by === 'others') {
      setShowReferredByOther(true);
      if (formData.referred_by_other) {
        setReferredByOther(formData.referred_by_other);
      }
    } else {
      setShowReferredByOther(false);
    }
  }, [formData.referred_by, formData.referred_by_other]);




  // Sync present address with permanent address when sameAsPermanent is checked
  useEffect(() => {
    if (sameAsPermanent) {
      setFormData(prev => ({
        ...prev,
        present_address_line_1: prev.permanent_address_line_1 || '',
        present_city_town_village: prev.permanent_city_town_village || '',
        present_district: prev.permanent_district || '',
        present_state: prev.permanent_state || '',
        present_pin_code: prev.permanent_pin_code || '',
        present_country: prev.permanent_country || ''
      }));
    }
  }, [
    sameAsPermanent,
    formData.permanent_address_line_1,
    formData.permanent_city_town_village,
    formData.permanent_district,
    formData.permanent_state,
    formData.permanent_pin_code,
    formData.permanent_country
  ]);


  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Configuration for fields with "others"/"other" option
    const othersFieldsConfig = {
      occupation: { showSetter: setShowOccupationOther, valueSetter: setOccupationOther, customField: 'occupation_other' },
      family_type: { showSetter: setShowFamilyTypeOther, valueSetter: setFamilyTypeOther, customField: 'family_type_other' },
      locality: { showSetter: setShowLocalityOther, valueSetter: setLocalityOther, customField: 'locality_other' },
      religion: { showSetter: setShowReligionOther, valueSetter: setReligionOther, customField: 'religion_other' },
      head_relationship: { showSetter: setShowHeadRelationshipOther, valueSetter: setHeadRelationshipOther, customField: 'head_relationship_other' },
      mobility: { showSetter: setShowMobilityOther, valueSetter: setMobilityOther, customField: 'mobility_other' },
      referred_by: { showSetter: setShowReferredByOther, valueSetter: setReferredByOther, customField: 'referred_by_other' }
    };

    // Handle "others"/"other" selection
    const fieldConfig = othersFieldsConfig[name];
    if (fieldConfig) {
      const isOthers = value === 'others' || value === 'other';
      fieldConfig.showSetter(isOthers);
      if (!isOthers) {
        fieldConfig.valueSetter('');
        setFormData(prev => ({ ...prev, [fieldConfig.customField]: null }));
      }
      return;
    }

    // Handle custom "other" input values
    const customFieldMatch = name.match(/^(.+)_other$/);
    if (customFieldMatch) {
      const baseField = customFieldMatch[1];
      const config = othersFieldsConfig[baseField];
      if (config) {
        config.valueSetter(value);
        setFormData(prev => ({ ...prev, [name]: value }));
      }
      return;
    }


    // Clear field errors
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }

    // Auto-select age group based on age
    if (name === 'age') {
      const age = parseInt(value);
      if (!isNaN(age)) {
        const ageGroup =
          age <= 15 ? '0-15' :
            age <= 30 ? '15-30' :
              age <= 45 ? '30-45' :
                age <= 60 ? '45-60' : '60+';
        setFormData(prev => ({ ...prev, age_group: ageGroup }));
      }
    }
  };

  const handlePatientChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // When assigned_doctor_id changes, update assigned_doctor_name
    if (name === 'assigned_doctor_id' && value) {
      const selectedDoctor = (usersData?.data?.users || []).find(u => String(u.id) === value);
      if (selectedDoctor) {
        setFormData(prev => ({ 
          ...prev, 
          assigned_doctor_id: value,
          assigned_doctor_name: selectedDoctor.name 
        }));
      }
    }

  };

  const validate = () => {
    const newErrors = {};

    const patientName = formData.name || '';
    const patientSex = formData.sex || '';
    const patientAge = formData.age || '';
    const patientCRNo = formData.cr_no || '';

    if (!patientName || !patientName.trim()) newErrors.patientName = 'Name is required';
    if (!patientSex) newErrors.patientSex = 'Sex is required';
    if (!patientAge) newErrors.patientAge = 'Age is required';

    // CR number validation
    if (patientCRNo) {
      if (patientCRNo.length < 3) {
        newErrors.patientCRNo = 'CR number must be at least 3 characters long';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    if (!patient?.id) {
      toast.error('Patient ID is required');
      return;
    }

    // Get patient data early for validation
    const patientName = (formData.name || '').trim();
    const patientSex = formData.sex || '';
    const patientAge = formData.age || '';
    const patientCRNo = formData.cr_no || '';


    try {
      // Validate required fields
      if (!patientName) {
        toast.error('Patient name is required');
        return;
      }
      if (!patientSex) {
        toast.error('Patient sex is required');
        return;
      }
      if (!patientAge) {
        toast.error('Patient age is required');
        return;
      }

      const parseIntSafe = (val) => {
        if (val === '' || val === undefined || val === null) return null;
        const parsed = parseInt(val);
        return isNaN(parsed) ? null : parsed;
      };

      const parseFloatSafe = (val) => {
        if (val === '' || val === undefined || val === null) return null;
        const parsed = parseFloat(val);
        return isNaN(parsed) ? null : parsed;
      };

      const updatePatientData = {
        // Required basic fields
        name: patientName,
        sex: patientSex,
        date: formData.date || null,
        age: parseIntSafe(patientAge),
        assigned_room: formData.assigned_room || null,
        assigned_doctor_id: formData.assigned_doctor_id || null,
        assigned_doctor_name: formData.assigned_doctor_name || null,
        ...(patientCRNo && { cr_no: patientCRNo }),
        psy_no: formData.psy_no || null,
        seen_in_walk_in_on: formData.seen_in_walk_in_on || formData.date || null,
        worked_up_on: formData.worked_up_on || null,
        special_clinic_no: formData.special_clinic_no || null,

        // Personal Information
        age_group: formData.age_group || null,
        marital_status: formData.marital_status || null,
        year_of_marriage: parseIntSafe(formData.year_of_marriage),
        no_of_children_male: parseIntSafe(formData.no_of_children_male),
        no_of_children_female: parseIntSafe(formData.no_of_children_female),

        // Occupation & Education
        // If "others" is selected, use the custom occupation value, otherwise use the selected option
        occupation: formData.occupation === 'others'
          ? (formData.occupation_other || occupationOther || null)
          : (formData.occupation || null),
        education: formData.education || null,

        // Financial Information
        patient_income: parseFloatSafe(formData.patient_income),
        family_income: parseFloatSafe(formData.family_income),

        // Family Information
        // If "others"/"other" is selected, use the custom value, otherwise use the selected option
        religion: formData.religion === 'others'
          ? (formData.religion_other || religionOther || null)
          : (formData.religion || null),
        family_type: formData.family_type === 'others'
          ? (formData.family_type_other || familyTypeOther || null)
          : (formData.family_type || null),
        locality: formData.locality === 'other'
          ? (formData.locality_other || localityOther || null)
          : (formData.locality || null),
        head_name: formData.head_name || formData.father_name || null,
        head_age: parseIntSafe(formData.head_age),
        head_relationship: formData.head_relationship === 'other'
          ? (formData.head_relationship_other || headRelationshipOther || null)
          : (formData.head_relationship || null),
        head_education: formData.head_education || null,
        head_occupation: formData.head_occupation || null,
        head_income: parseFloatSafe(formData.head_income),

        // Referral & Mobility
        distance_from_hospital: formData.distance_from_hospital || null,
        mobility: formData.mobility === 'others'
          ? (formData.mobility_other || mobilityOther || null)
          : (formData.mobility || null),
        referred_by: formData.referred_by === 'others'
          ? (formData.referred_by_other || referredByOther || null)
          : (formData.referred_by || null),

        // Contact Information
        contact_number: formData.contact_number || null,

        // Quick Entry fields
        department: formData.department || null,
        unit_consit: formData.unit_consit || null,
        room_no: formData.room_no || null,
        serial_no: formData.serial_no || null,
        file_no: formData.file_no || null,
        unit_days: formData.unit_days || null,

        // Address fields
        address_line: formData.address_line || null,
        country: formData.country || null,
        state: formData.state || null,
        district: formData.district || null,
        city: formData.city || null,
        pin_code: formData.pin_code || null,

        // Permanent Address fields
        permanent_address_line_1: formData.permanent_address_line_1 || null,
        permanent_city_town_village: formData.permanent_city_town_village || null,
        permanent_district: formData.permanent_district || null,
        permanent_state: formData.permanent_state || null,
        permanent_pin_code: formData.permanent_pin_code || null,
        permanent_country: formData.permanent_country || null,

        // Present Address fields
        present_address_line_1: formData.present_address_line_1 || null,
        present_address_line_2: formData.present_address_line_2 || null,
        present_city_town_village: formData.present_city_town_village || null,
        present_city_town_village_2: formData.present_city_town_village_2 || null,
        present_district: formData.present_district || null,
        present_district_2: formData.present_district_2 || null,
        present_state: formData.present_state || null,
        present_state_2: formData.present_state_2 || null,
        present_pin_code: formData.present_pin_code || null,
        present_pin_code_2: formData.present_pin_code_2 || null,
        present_country: formData.present_country || null,
        present_country_2: formData.present_country_2 || null,

        // Local Address field
        local_address: formData.local_address || null,

        // Additional fields
        category: formData.category || null,
        // assigned_doctor_id is integer
        ...(formData.assigned_doctor_id && { assigned_doctor_id: parseInt(formData.assigned_doctor_id, 10) }),
      };

      // Update patient record with files if any are selected or removed
      const hasFiles = selectedFiles && selectedFiles.length > 0;
      const hasFilesToRemove = filesToRemove && filesToRemove.length > 0;
      
      // Normalize files to remove before sending
      const normalizedFilesToRemove = filesToRemove.map(file => normalizeFilePath(file)).filter(Boolean);
      
      console.log('[PatientDetailsEdit] Submitting update:', {
        hasFiles,
        hasFilesToRemove,
        filesToRemove: normalizedFilesToRemove,
        selectedFilesCount: selectedFiles?.length || 0
      });
      
      if (hasFiles || hasFilesToRemove) {
        // Update patient with files using FormData
        await updatePatient({
          id: patient.id,
          ...updatePatientData,
          files: selectedFiles,
          files_to_remove: normalizedFilesToRemove
        }).unwrap();
        
        // Refetch files after update with a small delay to ensure backend processing is complete
        // Only refetch if patient ID exists (query was started)
        setTimeout(() => {
          if (refetchFiles && patient?.id) {
            try {
              refetchFiles();
            } catch (error) {
              // Query might not have been started (was skipped), ignore error
              console.warn('[PatientDetailsEdit] Could not refetch files:', error.message);
            }
          }
        }, 1000);
      } else {
        // Update patient without files using JSON
        await updatePatient({
          id: patient.id,
          ...updatePatientData
        }).unwrap();
      }

      // If we reach here, the update was successful
      const successMessage = 'Patient updated successfully!' + 
        (hasFiles ? ` ${selectedFiles.length} file(s) uploaded.` : '') +
        (hasFilesToRemove ? ` ${normalizedFilesToRemove.length} file(s) removed.` : '');
      toast.success(successMessage);
      
      // Clear file selection after successful update
      if (hasFiles) {
        setSelectedFiles([]);
      }
      if (hasFilesToRemove) {
        setFilesToRemove([]);
      }
      
      // Call onSave callback if provided
      if (onSave) {
        onSave();
      } else {
        // Navigate back to patients list
        navigate('/patients');
      }

    } catch (err) {
      console.error('Update error:', err);

      // Handle specific error cases
      if (err?.data?.message?.includes('duplicate key value violates unique constraint "patients_cr_no_key"') ||
        err?.data?.error?.includes('duplicate key value violates unique constraint "patients_cr_no_key"')) {
        toast.error('CR number is already registered');
        setFormData(prev => ({ ...prev, cr_no: patient?.cr_no || '' }));
      } else if (err?.data?.message?.includes('duplicate key value violates unique constraint') ||
        err?.data?.error?.includes('duplicate key value violates unique constraint')) {
        toast.error('A record with this information already exists. Please check your data and try again.');
      } else {
        toast.error(err?.data?.message || err?.data?.error || 'Failed to update patient');
      }
    }
  };

  return (
    <div className="space-y-6">

      {/* Patient Details Card - Collapsible */}
      <Card className="shadow-lg border-0 bg-white">
        <div
          className="flex items-center justify-between p-6 border-b border-gray-200 hover:bg-gray-50 transition-colors"
        >
          <div 
            className="flex items-center gap-4 cursor-pointer flex-1"
            onClick={() => toggleCard('patient')}
          >
            <div className="p-3 bg-blue-100 rounded-lg">
              <FiUser className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Patient Details</h3>
              <p className="text-sm text-gray-500 mt-1">{patient?.name || 'New Patient'} - {patient?.cr_no || 'N/A'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isEdit && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrintPatientDetails();
                }}
                className="h-9 w-9 p-0 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border border-blue-200 hover:border-blue-300 shadow-sm hover:shadow-md transition-all duration-200 rounded-lg"
                title="Print Patient Details"
              >
                <FiPrinter className="w-4 h-4 text-blue-600" />
              </Button>
            )}
            <div 
              className="cursor-pointer"
              onClick={() => toggleCard('patient')}
            >
              {expandedCards.patient ? (
                <FiChevronUp className="h-6 w-6 text-gray-500" />
              ) : (
                <FiChevronDown className="h-6 w-6 text-gray-500" />
              )}
            </div>
          </div>
        </div>

        {expandedCards.patient && (
          <div ref={patientDetailsPrintRef} className="p-6">
            <form onSubmit={handleSubmit}>
              {/* Quick Entry Section with Glassmorphism */}
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 rounded-3xl blur-xl pointer-events-none"></div>
                <Card
                  title={
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 backdrop-blur-sm rounded-xl border border-white/30 shadow-lg">
                        <FiEdit3 className="w-6 h-6 text-indigo-600" />
                      </div>
                      <span className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">OUT PATIENT CARD</span>
                    </div>
                  }
                  className="relative mb-8 shadow-2xl border border-white/30 bg-white/70 backdrop-blur-xl rounded-3xl overflow-hidden">
                  <div className="space-y-8">
                    {/* First Row - Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <IconInput
                        icon={<FiHash className="w-4 h-4" />}
                        label="CR No."
                        name="cr_no"
                        value={formData.cr_no || ''}
                        onChange={handleChange}
                        placeholder="Enter CR number"
                        disabled={true}
                        className="disabled:bg-gray-200 disabled:cursor-not-allowed disabled:text-gray-900"
                      />
                      <DatePicker
                        icon={<FiCalendar className="w-4 h-4" />}
                        label="Date"
                        name="date"
                        value={formatDateForDatePicker(formData.date)}
                        onChange={handleChange}
                        defaultToday={false}
                      />

                      <IconInput
                        icon={<FiUser className="w-4 h-4" />}
                        label="Name"
                        name="name"
                        value={formData.name || ''}
                        onChange={handleChange}
                        placeholder="Enter patient name"
                        error={errors.patientName}
                        className=""
                      />
                      <IconInput
                        icon={<FiPhone className="w-4 h-4" />}
                        label="Mobile No."
                        name="contact_number"
                        value={formData.contact_number || ''}
                        onChange={handleChange}
                        placeholder="Enter mobile number"
                        className=""
                      />
                    </div>

                    {/* Second Row - Age, Sex, Category, Father's Name */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <IconInput
                        icon={<FiClock className="w-4 h-4" />}
                        label="Age"
                        name="age"
                        value={formData.age || ''}
                        onChange={handleChange}
                        type="number"
                        placeholder="Enter age"
                        error={errors.patientAge}
                        className=""
                      />
                      <div className="space-y-2">
                        <Select
                          label="Sex"
                          name="sex"
                          value={formData.sex || ''}
                          onChange={handleChange}
                          options={SEX_OPTIONS}
                          placeholder="Select sex"
                          error={errors.patientSex}
                          searchable={true}
                          className="bg-white/60 backdrop-blur-md border-2 border-gray-300/60"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                          <FiShield className="w-4 h-4 text-primary-600" />
                          Category
                        </label>
                        <Select
                          name="category"
                          value={formData.category || ''}
                          onChange={handleChange}
                          options={CATEGORY_OPTIONS}
                          placeholder="Select category"
                          searchable={true}
                          className="bg-white/60 backdrop-blur-md border-2 border-gray-300/60"
                        />
                      </div>
                      <IconInput
                        icon={<FiUsers className="w-4 h-4" />}
                        label="Father's Name"
                        name="father_name"
                        value={formData.father_name || ''}
                        onChange={handleChange}
                        placeholder="Enter father's name"
                        className=""
                      />
                    </div>
                    {/* Fourth Row - Department, Unit/Consit, Room No., Serial No. */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <IconInput
                        icon={<FiLayers className="w-4 h-4" />}
                        label="Department"
                        name="department"
                        value={formData.department || ''}
                        onChange={handleChange}
                        placeholder="Enter department"
                        className=""
                      />
                      <IconInput
                        icon={<FiUsers className="w-4 h-4" />}
                        label="Unit/Consit"
                        name="unit_consit"
                        value={formData.unit_consit || ''}
                        onChange={handleChange}
                        placeholder="Enter unit/consit"
                        className=""
                      />
                      <IconInput
                        icon={<FiHome className="w-4 h-4" />}
                        label="Room No."
                        name="room_no"
                        value={formData.room_no || ''}
                        onChange={handleChange}
                        placeholder="Enter room number"
                        className=""
                      />
                      <IconInput
                        icon={<FiHash className="w-4 h-4" />}
                        label="Serial No."
                        name="serial_no"
                        value={formData.serial_no || ''}
                        onChange={handleChange}
                        placeholder="Enter serial number"
                        className=""
                      />
                    </div>

                    {/* Fifth Row - File No., Unit Days */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <IconInput
                        icon={<FiFileText className="w-4 h-4" />}
                        label="File No."
                        name="file_no"
                        value={formData.file_no || ''}
                        onChange={handleChange}
                        placeholder="Enter file number"
                        className=""
                      />
                      <div className="space-y-2">
                        <Select
                          label="Unit Days"
                          name="unit_days"
                          value={formData.unit_days || ''}
                          onChange={handleChange}
                          options={UNIT_DAYS_OPTIONS}
                          placeholder="Select unit days"
                          searchable={true}
                          className="bg-white/60 backdrop-blur-md border-2 border-gray-300/60"
                        />
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
                        <IconInput
                          icon={<FiHome className="w-4 h-4" />}
                          label="Address Line (House No., Street, Locality)"
                          name="address_line"
                          value={formData.address_line || ''}
                          onChange={handleChange}
                          placeholder="Enter house number, street, locality"
                          required
                          className=""
                        />

                        {/* Location Fields */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <IconInput
                            icon={<FiGlobe className="w-4 h-4" />}
                            label="Country"
                            name="country"
                            value={formData.country || ''}
                            onChange={handleChange}
                            placeholder="Enter country"
                            className=""
                          />
                          <IconInput
                            icon={<FiMapPin className="w-4 h-4" />}
                            label="State"
                            name="state"
                            value={formData.state || ''}
                            onChange={handleChange}
                            placeholder="Enter state"
                            required
                            className=""
                          />
                          <IconInput
                            icon={<FiLayers className="w-4 h-4" />}
                            label="District"
                            name="district"
                            value={formData.district || ''}
                            onChange={handleChange}
                            placeholder="Enter district"
                            required
                            className=""
                          />
                          <IconInput
                            icon={<FiHome className="w-4 h-4" />}
                            label="City/Town/Village"
                            name="city"
                            value={formData.city || ''}
                            onChange={handleChange}
                            placeholder="Enter city, town or village"
                            required
                            className=""
                          />
                        </div>

                        {/* Pin Code Row */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <IconInput
                            icon={<FiHash className="w-4 h-4" />}
                            label="Pin Code"
                            name="pin_code"
                            value={formData.pin_code || ''}
                            onChange={handleChange}
                            placeholder="Enter pin code"
                            type="number"
                            required
                            className=""
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Basic Information with Glassmorphism */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10 rounded-3xl blur-xl pointer-events-none"></div>
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
                        <DatePicker
                          icon={<FiCalendar className="w-4 h-4" />}
                          label="Seen in Walk-in-on"
                          name="seen_in_walk_in_on"
                          value={formatDateForDatePicker(formData.seen_in_walk_in_on)}
                          onChange={handleChange}
                          defaultToday={true}
                        />
                        <DatePicker
                          icon={<FiCalendar className="w-4 h-4" />}
                          label="Worked up on"
                          name="worked_up_on"
                          value={formatDateForDatePicker(formData.worked_up_on)}
                          onChange={handleChange}
                          defaultToday={true}
                        />

                        <IconInput
                          icon={<FiHash className="w-4 h-4" />}
                          label="CR No."
                          name="cr_no"
                          value={formData.cr_no || ''}
                          onChange={handleChange}
                          placeholder="Enter CR number"
                          disabled={true}
                          className="disabled:bg-gray-200 disabled:cursor-not-allowed"
                        />

                        <IconInput
                          icon={<FiFileText className="w-4 h-4" />}
                          label="Psy. No."
                          name="psy_no"
                          value={formData.psy_no}
                          onChange={handlePatientChange}
                          placeholder="Enter PSY number"
                          error={errors.patientPSYNo}
                          className=""
                        />
                        <IconInput
                          icon={<FiHeart className="w-4 h-4" />}
                          label="Special Clinic No."
                          name="special_clinic_no"
                          value={formData.special_clinic_no}
                          onChange={handleChange}
                          placeholder="Enter special clinic number"
                          className=""
                        />

                        <IconInput
                          icon={<FiUser className="w-4 h-4" />}
                          label="Name"
                          name="name"
                          value={formData.name || ''}
                          onChange={handleChange}
                          placeholder="Enter patient name"
                          disabled={true}
                          className="disabled:bg-gray-200 disabled:cursor-not-allowed"
                        />

                        <div className="space-y-2">
                          <Select
                            label="Sex"
                            name="sex"
                            value={formData.sex || ''}
                            onChange={handleChange}
                            options={SEX_OPTIONS}
                            placeholder="Select sex"
                            error={errors.patientSex}
                            searchable={true}

                            disabled={true}
                            className="disabled:bg-gray-200 disabled:cursor-not-allowed disabled:text-gray-900"
                          />
                        </div>

                        <Select
                          label="Age Group"
                          name="age_group"
                          value={formData.age_group || ''}
                          onChange={handleChange}
                          options={AGE_GROUP_OPTIONS}
                          placeholder="Select age group"
                          searchable={true}
                          className="bg-gradient-to-r from-blue-50 to-indigo-50"
                        />
                        <Select
                          label="Marital Status"
                          name="marital_status"
                          value={formData.marital_status || ''}
                          onChange={handleChange}
                          options={MARITAL_STATUS}
                          placeholder="Select marital status"
                          searchable={true}
                          className="bg-gradient-to-r from-pink-50 to-rose-50"
                        />
                        <IconInput
                          icon={<FiCalendar className="w-4 h-4" />}
                          label="Year of marriage"
                          name="year_of_marriage"
                          value={formData.year_of_marriage}
                          onChange={handleChange}
                          type="number"
                          placeholder="Enter year of marriage"
                          min="1900"
                          max={new Date().getFullYear()}
                          className="bg-gradient-to-r from-purple-50 to-pink-50"
                        />


                        <IconInput
                          icon={<FiUsers className="w-4 h-4" />}
                          label="No. of Children: M"
                          name="no_of_children_male"
                          value={formData.no_of_children_male}
                          onChange={handleChange}
                          type="number"
                          placeholder="Male"
                          min="0"
                          max="20"
                          className="bg-gradient-to-r from-blue-50 to-indigo-50"
                        />
                        <IconInput
                          icon={<FiUsers className="w-4 h-4" />}
                          label="No. of Children: F"
                          name="no_of_children_female"
                          value={formData.no_of_children_female}
                          onChange={handleChange}
                          type="number"
                          placeholder="Female"
                          min="0"
                          max="20"
                          className="bg-gradient-to-r from-pink-50 to-rose-50"
                        />

                        <SelectWithOther
                          icon={<FiBriefcase className="w-4 h-4" />}
                          label=" Occupation"
                          name="occupation"
                          value={formData.occupation}
                          onChange={handleChange}
                          options={OCCUPATION_OPTIONS}
                          placeholder="Select Occupation"
                          searchable={true}
                          className="bg-gradient-to-r from-green-50 to-emerald-50"
                          customValue={occupationOther}
                          setCustomValue={setOccupationOther}
                          showCustomInput={showOccupationOther}
                          formData={formData}
                          customFieldName="occupation_other"
                          inputLabel="Specify Occupation"
                        />

                        <Select
                          icon={<FiBookOpen className="w-4 h-4" />}
                          label="Education"
                          name="education"
                          value={formData.education}
                          onChange={handleChange}
                          options={EDUCATION_OPTIONS}
                          placeholder="Select education"
                          searchable={true}
                          className="bg-gradient-to-r from-green-50 to-emerald-50"
                        />


                        <IconInput
                          icon={<FiTrendingUp className="w-4 h-4" />}
                          label="Family Income (₹)"
                          name="family_income"
                          value={formData.family_income}
                          onChange={handleChange}

                          type="number"
                          placeholder="Family income"
                          min="0"
                          className="bg-gradient-to-r from-teal-50 to-cyan-50"

                        />
                        <IconInput
                          icon={<FiTrendingUp className="w-4 h-4" />}
                          label="Patient Income (₹)"
                          name="patient_income"
                          value={formData.patient_income}
                          onChange={handleChange}
                          type="number"
                          placeholder="Patient income"
                          min="0"
                          className="bg-gradient-to-r from-teal-50 to-cyan-50"
                        />
                        <SelectWithOther
                          label="Religion"
                          name="religion"
                          value={formData.religion || ''}
                          onChange={handleChange}
                          options={RELIGION_OPTIONS}
                          placeholder="Select religion"
                          searchable={true}
                          className="bg-gradient-to-r from-teal-50 to-cyan-50"
                          customValue={religionOther}
                          setCustomValue={setReligionOther}
                          showCustomInput={showReligionOther}
                          formData={formData}
                          customFieldName="religion_other"
                          inputLabel="Specify Religion"
                        />
                        <SelectWithOther
                          label="Family Type"
                          name="family_type"
                          value={formData.family_type || ''}
                          onChange={handleChange}
                          options={FAMILY_TYPE_OPTIONS}
                          placeholder="Select family type"
                          searchable={true}
                          className="bg-gradient-to-r from-teal-50 to-cyan-50"
                          customValue={familyTypeOther}
                          setCustomValue={setFamilyTypeOther}
                          showCustomInput={showFamilyTypeOther}
                          formData={formData}
                          customFieldName="family_type_other"
                          inputLabel="Specify Family Type"
                        />
                        <SelectWithOther
                          label="Locality"
                          name="locality"
                          value={formData.locality || ''}
                          onChange={handleChange}
                          options={LOCALITY_OPTIONS}
                          placeholder="Select locality"
                          searchable={true}
                          className="bg-gradient-to-r from-teal-50 to-cyan-50"
                          customValue={localityOther}
                          setCustomValue={setLocalityOther}
                          showCustomInput={showLocalityOther}
                          formData={formData}
                          customFieldName="locality_other"
                          inputLabel="Specify Locality"
                        />
                        
                        <IconInput
                          icon={<FiUser className="w-4 h-4" />}
                          label="Family Head Name"
                          name="head_name"
                          value={formData.head_name}
                          onChange={handleChange}
                          placeholder="Enter head of family name"
                          className="bg-gradient-to-r from-blue-50 to-indigo-50"
                        />
                        <IconInput
                          icon={<FiClock className="w-4 h-4" />}
                          label=" Family Head  Age"
                          name="head_age"
                          value={formData.head_age}
                          onChange={handleChange}
                          type="number"
                          placeholder="Enter age"
                          min="0"
                          max="150"
                          className="bg-gradient-to-r from-orange-50 to-yellow-50"
                        />

                        <SelectWithOther
                          label="Relationship With Family Head"
                          name="head_relationship"
                          value={formData.head_relationship || ''}
                          onChange={handleChange}
                          options={HEAD_RELATIONSHIP_OPTIONS}
                          placeholder="Select relationship"
                          searchable={true}
                          className="bg-gradient-to-r from-green-50 to-emerald-50"
                          customValue={headRelationshipOther}
                          setCustomValue={setHeadRelationshipOther}
                          showCustomInput={showHeadRelationshipOther}
                          formData={formData}
                          customFieldName="head_relationship_other"
                          inputLabel="Specify Relationship"
                        />


                        <Select
                          icon={<FiBookOpen className="w-4 h-4" />}
                          label="Family Head Education"
                          name="head_education"
                          value={formData.head_education}
                          onChange={handleChange}
                          options={EDUCATION_OPTIONS}
                          placeholder="Select education"
                          searchable={true}
                          className="bg-gradient-to-r from-green-50 to-emerald-50"
                        />

                        <Select
                          icon={<FiBriefcase className="w-4 h-4" />}
                          label=" Family Head Occupation"
                          name="head_occupation"
                          value={formData.head_occupation}
                          onChange={handleChange}
                          options={OCCUPATION_OPTIONS}
                          placeholder="Select education"
                          searchable={true}
                          className="bg-gradient-to-r from-green-50 to-emerald-50"
                        />
                        <IconInput
                          icon={<FiTrendingUp className="w-4 h-4" />}
                          label="Family Head Income (₹)"
                          name="head_income"
                          value={formData.head_income}
                          onChange={handleChange}
                          type="number"
                          placeholder="Monthly income"
                          min="0"
                          className="bg-gradient-to-r from-amber-50 to-orange-50"
                        />

                        <IconInput
                          icon={<FiNavigation className="w-4 h-4" />}
                          label="Exact distance from hospital"
                          name="distance_from_hospital"
                          value={formData.distance_from_hospital}
                          onChange={handleChange}
                          placeholder="Enter distance from hospital"
                          className=""
                        />

                        <SelectWithOther
                          label="Mobility of the patient"
                          name="mobility"
                          value={formData.mobility || ''}
                          onChange={handleChange}
                          options={MOBILITY_OPTIONS}
                          placeholder="Select mobility"
                          searchable={true}
                          className="bg-white/60 backdrop-blur-md border-2 border-gray-300/60"
                          customValue={mobilityOther}
                          setCustomValue={setMobilityOther}
                          showCustomInput={showMobilityOther}
                          formData={formData}
                          customFieldName="mobility_other"
                          inputLabel="Specify Mobility"
                        />

                        <SelectWithOther
                          label="Referred by"
                          name="referred_by"
                          value={formData.referred_by || ''}
                          onChange={handleChange}
                          options={REFERRED_BY_OPTIONS}
                          placeholder="Select referred by"
                          searchable={true}
                          className="bg-white/60 backdrop-blur-md border-2 border-gray-300/60"
                          customValue={referredByOther}
                          setCustomValue={setReferredByOther}
                          showCustomInput={showReferredByOther}
                          formData={formData}
                          customFieldName="referred_by_other"
                          inputLabel="Specify Referred By"
                        />
                         {/* <Select
                           name="assigned_doctor_id"
                           label="Assigned Doctor"
                           value={formData.assigned_doctor_id || ''}
                           onChange={handlePatientChange}
                           options={(usersData?.data?.users || [])
                             .map(u => ({
                               value: String(u.id),
                               label: `${u.name} - ${isJR(u.role) ? 'Resident' : isSR(u.role) ? 'Faculty' : u.role}`
                             }))}
                           placeholder="Select doctor (optional)"
                           searchable={true}
                           className="bg-gradient-to-r from-violet-50 to-purple-50"
                           containerClassName="relative z-[9999]"
                           dropdownZIndex={2147483647}
                         />


                        <IconInput
                          icon={<FiHome className="w-4 h-4" />}
                          label="Assigned Room"
                          name="assigned_room"
                          value={formData.assigned_room || ''}
                          onChange={handleChange}
                          placeholder="Enter assigned room"
                          className="bg-gradient-to-r from-teal-50 to-cyan-50"
                        /> */}

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
                             <IconInput
                               icon={<FiHome className="w-4 h-4" />}
                               label="Address Line"
                               name="permanent_address_line_1"
                               value={formData.permanent_address_line_1 || ''}
                               onChange={handleChange}
                               placeholder="Enter house number, street, locality"
                               className=""
                             />
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                               <IconInput
                                 icon={<FiHome className="w-4 h-4" />}
                                 label="City/Town/Village"
                                 name="permanent_city_town_village"
                                 value={formData.permanent_city_town_village || ''}
                                 onChange={handleChange}
                                 placeholder="Enter city, town or village"
                                 className=""
                               />
                               <IconInput
                                 icon={<FiLayers className="w-4 h-4" />}
                                 label="District"
                                 name="permanent_district"
                                 value={formData.permanent_district || ''}
                                 onChange={handleChange}
                                 placeholder="Enter district"
                                 className=""
                               />
                               <IconInput
                                 icon={<FiMapPin className="w-4 h-4" />}
                                 label="State"
                                 name="permanent_state"
                                 value={formData.permanent_state || ''}
                                 onChange={handleChange}
                                 placeholder="Enter state"
                                 className=""
                               />
                               <IconInput
                                 icon={<FiHash className="w-4 h-4" />}
                                 label="Pin Code"
                                 name="permanent_pin_code"
                                 value={formData.permanent_pin_code || ''}
                                 onChange={handleChange}
                                 placeholder="Enter pin code"
                                 type="number"
                                 className=""
                               />
                               <IconInput
                                 icon={<FiGlobe className="w-4 h-4" />}
                                 label="Country"
                                 name="permanent_country"
                                 value={formData.permanent_country || ''}
                                 onChange={handleChange}
                                 placeholder="Enter country"
                                 className=""
                               />
                             </div>
                           </div>
                         </div>

                         {/* Present Address Section */}
                         <div className="space-y-6 pt-6 border-t border-white/30">
                          <div className="flex items-center justify-between mb-6">
                            <h4 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                              <div className="p-2.5 bg-gradient-to-br from-orange-500/20 to-amber-500/20 backdrop-blur-sm rounded-xl border border-white/30 shadow-md">
                                <FiMapPin className="w-5 h-5 text-orange-600" />
                              </div>
                              Present Address
                            </h4>
                            <label className="flex items-center gap-2 cursor-pointer group">
                              <input
                                type="checkbox"
                                checked={sameAsPermanent}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setSameAsPermanent(checked);
                                  if (checked) {
                                    // Copy permanent address to present address
                                    setFormData(prev => ({
                                      ...prev,
                                      present_address_line_1: prev.permanent_address_line_1 || '',
                                      present_city_town_village: prev.permanent_city_town_village || '',
                                      present_district: prev.permanent_district || '',
                                      present_state: prev.permanent_state || '',
                                      present_pin_code: prev.permanent_pin_code || '',
                                      present_country: prev.permanent_country || ''
                                    }));
                                  } else {
                                    // Clear present address fields when unchecked
                                    setFormData(prev => ({
                                      ...prev,
                                      present_address_line_1: '',
                                      present_city_town_village: '',
                                      present_district: '',
                                      present_state: '',
                                      present_pin_code: '',
                                      present_country: ''
                                    }));
                                  }
                                }}
                                className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500 focus:ring-2 cursor-pointer"
                              />
                              <span className="text-sm font-medium text-gray-700 group-hover:text-primary-600 transition-colors">
                                Same as Permanent Address
                              </span>
                            </label>
                          </div>

                          <div className="space-y-6">
                            <IconInput
                              icon={<FiHome className="w-4 h-4" />}
                              label="Address Line"
                              name="present_address_line_1"
                              value={formData.present_address_line_1 || ''}
                              onChange={handleChange}
                              placeholder="Enter house number, street, locality"
                              disabled={sameAsPermanent}
                              className={sameAsPermanent ? "disabled:bg-gray-100 disabled:cursor-not-allowed" : ""}
                            />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <IconInput
                                icon={<FiHome className="w-4 h-4" />}
                                label="City/Town/Village"
                                name="present_city_town_village"
                                value={formData.present_city_town_village || ''}
                                onChange={handleChange}
                                placeholder="Enter city, town or village"
                                disabled={sameAsPermanent}
                                className={sameAsPermanent ? "disabled:bg-gray-100 disabled:cursor-not-allowed" : ""}
                              />
                              <IconInput
                                icon={<FiLayers className="w-4 h-4" />}
                                label="District"
                                name="present_district"
                                value={formData.present_district || ''}
                                onChange={handleChange}
                                placeholder="Enter district"
                                disabled={sameAsPermanent}
                                className={sameAsPermanent ? "disabled:bg-gray-100 disabled:cursor-not-allowed" : ""}
                              />
                              <IconInput
                                icon={<FiMapPin className="w-4 h-4" />}
                                label="State"
                                name="present_state"
                                value={formData.present_state || ''}
                                onChange={handleChange}
                                placeholder="Enter state"
                                disabled={sameAsPermanent}
                                className={sameAsPermanent ? "disabled:bg-gray-100 disabled:cursor-not-allowed" : ""}
                              />
                              <IconInput
                                icon={<FiHash className="w-4 h-4" />}
                                label="Pin Code"
                                name="present_pin_code"
                                value={formData.present_pin_code || ''}
                                onChange={handleChange}
                                placeholder="Enter pin code"
                                type="number"
                                disabled={sameAsPermanent}
                                className={sameAsPermanent ? "disabled:bg-gray-100 disabled:cursor-not-allowed" : ""}
                              />
                              <IconInput
                                icon={<FiGlobe className="w-4 h-4" />}
                                label="Country"
                                name="present_country"
                                value={formData.present_country || ''}
                                onChange={handleChange}
                                placeholder="Enter country"
                                disabled={sameAsPermanent}
                                className={sameAsPermanent ? "disabled:bg-gray-100 disabled:cursor-not-allowed" : ""}
                              />
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
                            <IconInput
                              icon={<FiHome className="w-4 h-4" />}
                              label="Local Address"
                              name="local_address"
                              value={formData.local_address || ''}
                              onChange={handleChange}
                              placeholder="Enter local address"
                              className=""
                            />
                          </div>

                          <Select
                                name="assigned_doctor_id"
                                label="Assigned Doctor"
                                value={formData.assigned_doctor_id}
                                onChange={handlePatientChange}
                                options={(usersData?.data?.users || [])
                                  .map(u => ({
                                    value: String(u.id),
                                    label: `${u.name} - ${isJR(u.role) ? 'Resident' : isSR(u.role) ? 'Faculty' : u.role}`
                                  }))}
                                placeholder="Select doctor (optional)"
                                searchable={true}
                                className="bg-gradient-to-r from-violet-50 to-purple-50"
                                containerClassName="relative z-[9999]"
                                dropdownZIndex={2147483647}
                              />


                              <IconInput
                                icon={<FiHome className="w-4 h-4" />}
                                label="Assigned Room"
                                name="assigned_room"
                                value={formData.assigned_room || ''}
                                onChange={handleChange}
                                placeholder="Enter assigned room"
                                className="bg-gradient-to-r from-teal-50 to-cyan-50"
                              />
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-white/30 my-6"></div>

                    {/* Patient Documents & Files Section */}
                    <div className="space-y-6 pt-6 border-t border-white/30">
                      <h4 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                        <div className="p-2.5 bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-sm rounded-xl border border-white/30 shadow-md">
                          <FiFileText className="w-5 h-5 text-purple-600" />
                        </div>
                        Patient Documents & Files
                      </h4>

                      {/* File Upload Component */}
                      <div className="mb-6">
                        <FileUpload
                          files={selectedFiles}
                          onFilesChange={setSelectedFiles}
                          maxFiles={20}
                          maxSizeMB={10}
                          patientId={patient?.id}
                          disabled={!patient?.id}
                        />
                      </div>

                      {/* Existing Files Preview */}
                      {existingFiles && existingFiles.length > 0 && (
                        <div className="mt-6">
                          <h5 className="text-lg font-semibold text-gray-800 mb-4">
                            Existing Files
                            {!canEditFiles && (
                              <span className="ml-2 text-sm text-gray-500 font-normal">
                                (Read-only - You don't have permission to delete files)
                              </span>
                            )}
                          </h5>
                          <FilePreview
                            files={existingFiles.filter(file => {
                              const normalizedFile = normalizeFilePath(file);
                              return !filesToRemove.some(removed => normalizeFilePath(removed) === normalizedFile);
                            })}
                            patient_id={patient?.id}
                            canDelete={canEditFiles}
                            baseUrl={(import.meta.env.VITE_API_URL || '/api').replace(/\/api$/, '')}
                            onFileDeleted={async (filePath, normalizedPath) => {
                              // Refetch files to update the UI immediately
                              // Only refetch if patient ID exists (query was started)
                              if (patient?.id && refetchFiles) {
                                try {
                                  await refetchFiles();
                                } catch (error) {
                                  // Query might not have been started (was skipped), ignore error
                                  console.warn('[PatientDetailsEdit] Could not refetch files after delete:', error.message);
                                }
                              }
                              
                              // Also remove from filesToRemove if it was there
                              setFilesToRemove(prev => prev.filter(removed => {
                                const normalizedRemoved = normalizeFilePath(removed);
                                return normalizedRemoved !== normalizedPath;
                              }));
                            }}
                          />
                        </div>
                      )}

                      {/* Files to be removed indicator */}
                      {filesToRemove.length > 0 && (
                        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <p className="text-sm text-yellow-800">
                            <strong>{filesToRemove.length}</strong> file(s) will be removed when you save.
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row justify-end gap-4 mt-6">
                      {/* <Button
                        type="button"
                        variant="outline"
                        onClick={onCancel || (() => navigate('/patients'))}
                        className="px-6 lg:px-8 py-3 bg-white/60 backdrop-blur-md border border-white/30 hover:bg-white/80 hover:border-gray-300/50 text-gray-800 font-semibold shadow-sm hover:shadow-md transition-all duration-200"
                      >
                        <FiX className="mr-2" />
                        Cancel
                      </Button> */}
                      <Button
                        type="submit"
                        loading={isLoading }
                        disabled={isLoading }
                        className="px-6 lg:px-8 py-3 bg-gradient-to-r from-primary-600 via-indigo-600 to-blue-600 hover:from-primary-700 hover:via-indigo-700 hover:to-blue-700 text-white font-bold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                      >
                        <FiSave className="mr-2" />
                        {isLoading  ? (isCreateMode ? 'Creating...' : 'Updating...') : (isCreateMode ? 'Create Patient' : 'Update Patient')}
                      </Button>
                    </div>
                  </div>
                </Card>
              </div>
            </form>
          </div>
        )}
      </Card>

      {/* Additional Sections: Walk-in Clinical Proforma, ADL File, Prescriptions */}
      {/* Card 1: Walk-in Clinical Proforma - Show only if current user is Admin, JR, or SR */}
      {canViewClinicalProforma && (
        <Card className="shadow-lg border-0 bg-white">
          <div
            className="flex items-center justify-between p-6 border-b border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <div 
              className="flex items-center gap-4 cursor-pointer flex-1"
              onClick={() => toggleCard('clinical')}
            >
              <div className="p-3 bg-green-100 rounded-lg">
                <FiClipboard className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Walk-in Clinical Proforma</h3>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <p className="text-sm text-gray-500">
                    {isTodaysPatient && isExistingPatient
                      ? `Today's Patient - ${pastProformas.length} past visit${pastProformas.length > 1 ? 's' : ''}`
                      : isTodaysPatient
                      ? "Today's Patient - First visit"
                      : isExistingPatient
                      ? `Existing Patient - ${pastProformas.length} past visit${pastProformas.length > 1 ? 's' : ''}`
                      : 'No visits'}
                  </p>
                  {currentVisitProforma && (
                    <>
                      <span className="text-gray-400">•</span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        currentVisitProforma.visit_type === 'first_visit' 
                          ? 'bg-purple-100 text-purple-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {currentVisitProforma.visit_type === 'first_visit' ? 'First Visit' : 'Follow-up'}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div 
                className="cursor-pointer"
                onClick={() => toggleCard('clinical')}
              >
                {expandedCards.clinical ? (
                  <FiChevronUp className="h-6 w-6 text-gray-500" />
                ) : (
                  <FiChevronDown className="h-6 w-6 text-gray-500" />
                )}
              </div>
            </div>
          </div>

          {expandedCards.clinical && (
            <div className="p-6 space-y-6">
              {/* Current Visit Section - Show today's proforma if exists */}
              {currentVisitProforma && !showProformaForm && (
                <div className="space-y-4 border-t border-gray-200 pt-6">
                  <h4 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                      Current Visit
                    </span>
                    <span className="text-sm text-gray-500 font-normal">
                      {formatDate(currentVisitProforma.visit_date || currentVisitProforma.created_at)}
                    </span>
                  </h4>
                  
                  <div className="border-2 border-blue-300 rounded-lg p-4 bg-blue-50/30 hover:border-blue-400 hover:shadow-md transition-all">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            currentVisitProforma.visit_type === 'first_visit' 
                              ? 'bg-purple-100 text-purple-800' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {currentVisitProforma.visit_type === 'first_visit' ? 'First Visit' : 'Follow-up'}
                          </span>
                          {currentVisitProforma.doctor_decision && (
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              currentVisitProforma.doctor_decision === 'complex_case' 
                                ? 'bg-red-100 text-red-800' 
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {currentVisitProforma.doctor_decision === 'complex_case' 
                                ? 'Complex Case' 
                                : 'Simple Case'}
                            </span>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 gap-3 mt-3">
                          {currentVisitProforma.doctor_name && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <FiUser className="w-4 h-4" />
                              <span><span className="font-medium text-gray-800">Doctor:</span> {currentVisitProforma.doctor_name}</span>
                            </div>
                          )}
                          {currentVisitProforma.room_no && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <FiHome className="w-4 h-4" />
                              <span><span className="font-medium text-gray-800">Room:</span> {currentVisitProforma.room_no}</span>
                            </div>
                          )}
                          {currentVisitProforma.diagnosis && (
                            <div className="flex items-start gap-2 text-sm text-gray-600">
                              <FiFileText className="w-4 h-4 mt-0.5" />
                              <span><span className="font-medium text-gray-800">Diagnosis:</span> {currentVisitProforma.diagnosis}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/clinical/${currentVisitProforma.id}`)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs"
                        >
                          <FiEye className="w-3.5 h-3.5" />
                          View
                        </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                // CRITICAL: "Edit" on current visit = Create New (don't load old data)
                                // Clear selectedProformaId to ensure blank form opens
                                setSelectedProformaId(null);
                                setShowProformaForm(true);
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs"
                            >
                              <FiEdit3 className="w-3.5 h-3.5" />
                              Create New
                            </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Current Visit Form - Show if no current visit proforma exists OR if user is editing OR if new patient */}
              {/* Always show for new patients without history */}
              {(() => {
                // Always show form for new patients without history
                if (isNewPatientWithNoHistory) return true;
                // Show form if no current visit proforma or user wants to edit
                return showProformaForm || !currentVisitProforma;
              })() && (
                <div className={currentVisitProforma && !showProformaForm ? "border-t border-gray-200 pt-6 mt-6" : ""}>
                  {/* Show header for new patients or when adding new proforma */}
                  {(!isExistingPatient || !hasPastHistory || pastProformas.length === 0) && !currentVisitProforma ? (
                    <div className="mb-4">
                      <h4 className="text-lg font-semibold text-gray-800">Walk-in Clinical Proforma</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        {!isExistingPatient 
                          ? "Create the first walk-in clinical proforma for this new patient."
                          : "Create a new walk-in clinical proforma for this visit."}
                      </p>
                    </div>
                  ) : hasPastHistory && pastProformas.length > 0 ? (
                    <div className="mb-4">
                      <h4 className="text-lg font-semibold text-gray-800">New Walk-in Clinical Proforma</h4>
                    </div>
                  ) : null}
                  <EditClinicalProforma
                    key={selectedProforma?.id || `new-proforma-${patient?.id || Date.now()}`} // Force re-render when selectedProforma changes
                    // CRITICAL RULES:
                    // 1. Only pass initialData with id when editing a PAST visit performa (corrections)
                    // 2. Current visit "Edit" = Create New (blank form, no old data)
                    // 3. Never load current visit performa data - always create fresh
                    onAutoFillADL={(adlData) => {
                      // Store ADL data for auto-filling the ADL form
                      // This will be used when the ADL form is rendered
                      setAutoFillAdlData(adlData);
                    }}
                    initialData={selectedProforma && selectedProforma.id && isEditingPastProforma ? {
            // CASE 1: Editing a PAST visit performa (corrections only) - includes id for update
            // Pass full existing proforma data if available
            ...selectedProforma,
            patient_id: selectedProforma.patient_id?.toString() || patient?.id?.toString() || '',
            visit_date: selectedProforma.visit_date ? (selectedProforma.visit_date.includes('T') ? selectedProforma.visit_date.split('T')[0] : selectedProforma.visit_date) : new Date().toISOString().split('T')[0],
            assigned_doctor: selectedProforma.assigned_doctor?.toString() || patient?.assigned_doctor_id?.toString() || '',
            // Ensure all fields are passed, even if null/undefined
            onset_duration: selectedProforma.onset_duration || '',
            course: selectedProforma.course || '',
            precipitating_factor: selectedProforma.precipitating_factor || '',
            illness_duration: selectedProforma.illness_duration || '',
            current_episode_since: selectedProforma.current_episode_since || '',
            past_history: selectedProforma.past_history || '',
            family_history: selectedProforma.family_history || '',
            gpe: selectedProforma.gpe || '',
            diagnosis: selectedProforma.diagnosis || '',
            icd_code: selectedProforma.icd_code || '',
            disposal: selectedProforma.disposal || '',
            workup_appointment: selectedProforma.workup_appointment || '',
            referred_to: selectedProforma.referred_to || '',
            treatment_prescribed: selectedProforma.treatment_prescribed || '',
            mse_delusions: selectedProforma.mse_delusions || '',
            adl_reasoning: selectedProforma.adl_reasoning || '',
          } : isCreateMode ? {
            // CASE 2A: mode=create from Today's Patients - Always use blank/empty form
            // This ensures a completely fresh form with no pre-filled data
            patient_id: patient?.id?.toString() || '',
            visit_date: new Date().toISOString().split('T')[0], // Always use today's date for new visit
            visit_type: 'follow_up', // Existing patients are always follow-ups
            room_no: patient?.room_no || '',
            assigned_doctor: patient?.assigned_doctor_id?.toString() || '',
            informant_present: true,
            nature_of_information: '',
            onset_duration: '',
            course: '',
            precipitating_factor: '',
            illness_duration: '',
            current_episode_since: '',
            mood: [],
            behaviour: [],
            speech: [],
            thought: [],
            perception: [],
            somatic: [],
            bio_functions: [],
            adjustment: [],
            cognitive_function: [],
            fits: [],
            sexual_problem: [],
            substance_use: [],
            past_history: '',
            family_history: '',
            associated_medical_surgical: [],
            mse_behaviour: [],
            mse_affect: [],
            mse_thought: '',
            mse_delusions: '',
            mse_perception: [],
            mse_cognitive_function: [],
            gpe: '',
            diagnosis: '',
            icd_code: '',
            disposal: '',
            workup_appointment: '',
            referred_to: '',
            treatment_prescribed: '',
            doctor_decision: 'simple_case',
            // NOTE: No id field - this ensures a NEW record is created on submit
          } : lastVisitProforma && !isNewPatientWithNoHistory ? {
            // CASE 2: Existing patient - Pre-fill with last visit's data (as reference only)
            // CRITICAL: Do NOT include id - this ensures a NEW record is created on submit
            // This data is shown as reference, but any edits will create a new visit record
            patient_id: patient?.id?.toString() || '',
            visit_date: new Date().toISOString().split('T')[0], // Always use today's date for new visit
            visit_type: 'follow_up', // Existing patients are always follow-ups
            room_no: patient?.room_no || lastVisitProforma.room_no || '',
            assigned_doctor: patient?.assigned_doctor_id?.toString() || lastVisitProforma.assigned_doctor?.toString() || '',
            informant_present: lastVisitProforma.informant_present ?? true,
            nature_of_information: lastVisitProforma.nature_of_information || '',
            onset_duration: lastVisitProforma.onset_duration || '',
            course: lastVisitProforma.course || '',
            precipitating_factor: lastVisitProforma.precipitating_factor || '',
            illness_duration: lastVisitProforma.illness_duration || '',
            current_episode_since: lastVisitProforma.current_episode_since || '',
            mood: lastVisitProforma.mood || [],
            behaviour: lastVisitProforma.behaviour || [],
            speech: lastVisitProforma.speech || [],
            thought: lastVisitProforma.thought || [],
            perception: lastVisitProforma.perception || [],
            somatic: lastVisitProforma.somatic || [],
            bio_functions: lastVisitProforma.bio_functions || [],
            adjustment: lastVisitProforma.adjustment || [],
            cognitive_function: lastVisitProforma.cognitive_function || [],
            fits: lastVisitProforma.fits || [],
            sexual_problem: lastVisitProforma.sexual_problem || [],
            substance_use: lastVisitProforma.substance_use || [],
            past_history: lastVisitProforma.past_history || '',
            family_history: lastVisitProforma.family_history || '',
            associated_medical_surgical: lastVisitProforma.associated_medical_surgical || [],
            mse_behaviour: lastVisitProforma.mse_behaviour || [],
            mse_affect: lastVisitProforma.mse_affect || [],
            mse_thought: lastVisitProforma.mse_thought || '',
            mse_delusions: lastVisitProforma.mse_delusions || '',
            mse_perception: lastVisitProforma.mse_perception || [],
            mse_cognitive_function: lastVisitProforma.mse_cognitive_function || [],
            gpe: lastVisitProforma.gpe || '',
            diagnosis: lastVisitProforma.diagnosis || '',
            icd_code: lastVisitProforma.icd_code || '',
            disposal: lastVisitProforma.disposal || '',
            workup_appointment: lastVisitProforma.workup_appointment || '',
            referred_to: lastVisitProforma.referred_to || '',
            treatment_prescribed: lastVisitProforma.treatment_prescribed || '',
            doctor_decision: lastVisitProforma.doctor_decision || 'simple_case',
            // NOTE: No id field - this ensures a NEW record is created on submit
          } : {
            // CASE 3: New patient (no past history) - Blank form (same UI structure)
            patient_id: patient?.id?.toString() || '',
            visit_date: new Date().toISOString().split('T')[0],
            visit_type: 'first_visit',
            room_no: patient?.room_no || '',
            assigned_doctor: patient?.assigned_doctor_id?.toString() || '',
            informant_present: true,
            nature_of_information: '',
            onset_duration: '',
            course: '',
            precipitating_factor: '',
            illness_duration: '',
            current_episode_since: '',
            mood: [],
            behaviour: [],
            speech: [],
            thought: [],
            perception: [],
            somatic: [],
            bio_functions: [],
            adjustment: [],
            cognitive_function: [],
            fits: [],
            sexual_problem: [],
            substance_use: [],
            past_history: '',
            family_history: '',
            associated_medical_surgical: [],
            mse_behaviour: [],
            mse_affect: [],
            mse_thought: '',
            mse_delusions: '',
            mse_perception: [],
            mse_cognitive_function: [],
            gpe: '',
            diagnosis: '',
            icd_code: '',
            disposal: '',
            workup_appointment: '',
            referred_to: '',
            treatment_prescribed: '',
            doctor_decision: 'simple_case',
          }}
          onFormDataChange={(formData) => {
            // Track doctor_decision changes to show/hide ADL card
            if (formData?.doctor_decision !== undefined) {
              setCurrentDoctorDecision(formData.doctor_decision);
            }
          }}
        />
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Card 2: Deatail Work-Up File - Show only if case is complex OR ADL file exists */}
      {canViewADLFile && (
        <Card className="shadow-lg border-0 bg-white">
          <div
            className="flex items-center justify-between p-6 border-b border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <div 
              className="flex items-center gap-4 cursor-pointer flex-1"
              onClick={() => toggleCard('adl')}
            >
              <div className="p-3 bg-purple-100 rounded-lg">
                <FiFolder className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Out Patient Intake Record</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {patientAdlFiles.length > 0
                    ? `${patientAdlFiles.length} file${patientAdlFiles.length > 1 ? 's' : ''} found`
                    : selectedProforma?.adl_file_id
                      ? 'Out Patient Intake Record  linked to proforma'
                      : 'No Out Patient Intake Record files'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!isEdit && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePrintADL();
                  }}
                  className="h-9 w-9 p-0 bg-gradient-to-r from-purple-50 to-indigo-50 hover:from-purple-100 hover:to-indigo-100 border border-purple-200 hover:border-purple-300 shadow-sm hover:shadow-md transition-all duration-200 rounded-lg"
                  title="Print Out-Patient Intake Record"
                >
                  <FiPrinter className="w-4 h-4 text-purple-600" />
                </Button>
              )}
              <div 
                className="cursor-pointer"
                onClick={() => toggleCard('adl')}
              >
                {expandedCards.adl ? (
                  <FiChevronUp className="h-6 w-6 text-gray-500" />
                ) : (
                  <FiChevronDown className="h-6 w-6 text-gray-500" />
                )}
              </div>
            </div>
          </div>

          {expandedCards.adl && (
            <div ref={adlPrintRef} className="p-6">
              {patientAdlFiles.length > 0 ? (
                <div className="space-y-6">
                  {patientAdlFiles.map((file, index) => {
                    // Debug logging for each file


                    return (
                      <EditADL
                        key={file.id || `adl-${index}`}
                        adlFileId={file.id || file.adl_file_id || file.adlFileId}
                        isEmbedded={true}
                        patientId={patient?.id?.toString()}
                        clinicalProformaId={file.clinical_proforma_id?.toString() || selectedProforma?.id?.toString()}
                      />
                    );
                  })}
                </div>
              ) : selectedProforma?.adl_file_id ? (
                // If selected proforma has ADL file ID but file not in patientAdlFiles, use the ID
                <EditADL
                  adlFileId={selectedProforma.adl_file_id}
                  isEmbedded={true}
                  patientId={patient?.id?.toString()}
                  clinicalProformaId={selectedProforma?.id?.toString()}
                />
              ) : (
                <EditADL
                  isEmbedded={true}
                  patientId={patient?.id?.toString()}
                  clinicalProformaId={selectedProforma?.id?.toString()}
                  initialAdlData={autoFillAdlData}
                  key={autoFillAdlData ? `adl-auto-fill-${Date.now()}` : `adl-new-${patient?.id}`}
                />
              )}
            </div>
          )}
        </Card>
      )}

      {/* Card 3: Prescription History - Show only if current user is Admin, JR, or SR */}
      {canViewPrescriptions && (
        <Card className="shadow-lg border-0 bg-white">
          <div
            className="flex items-center justify-between p-6 border-b border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <div 
              className="flex items-center gap-4 cursor-pointer flex-1"
              onClick={() => toggleCard('prescriptions')}
            >
              <div className="p-3 bg-amber-100 rounded-lg">
                <FiPackage className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Prescription</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {patientProformas.length > 0
                    ? `View prescriptions for ${patientProformas.length} visit${patientProformas.length > 1 ? 's' : ''}`
                    : 'No prescriptions found'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!isEdit && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePrintPrescription();
                  }}
                  className="h-9 w-9 p-0 bg-gradient-to-r from-amber-50 to-yellow-50 hover:from-amber-100 hover:to-yellow-100 border border-amber-200 hover:border-amber-300 shadow-sm hover:shadow-md transition-all duration-200 rounded-lg"
                  title="Print Prescription"
                >
                  <FiPrinter className="w-4 h-4 text-amber-600" />
                </Button>
              )}
              <div 
                className="cursor-pointer"
                onClick={() => toggleCard('prescriptions')}
              >
                {expandedCards.prescriptions ? (
                  <FiChevronUp className="h-6 w-6 text-gray-500" />
                ) : (
                  <FiChevronDown className="h-6 w-6 text-gray-500" />
                )}
              </div>
            </div>
          </div>

          {expandedCards.prescriptions && (
            <div ref={prescriptionPrintRef} className="p-6">
              {/* Check URL params for edit mode */}
              {isEdit && isCreateMode ? (
                // Show CreatePrescription with empty fields when ?edit=true&mode=create
                <CreatePrescription
                  patientId={patient?.id}
                  clinicalProformaId={currentVisitProforma?.id}
                  returnTab={null}
                  currentUser={currentUser}
                />
              ) : patientProformas.length > 0 ? (
                // Show all proformas with PrescriptionEdit (both normal view and edit=true without mode=create)
                <div className="space-y-6">
                  {patientProformas.map((proforma, index) => (
                    <React.Fragment key={proforma.id || index}>
                      <PrescriptionEdit
                        proforma={proforma}
                        index={index}
                        patientId={patient?.id}
                      />
                    </React.Fragment>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 max-w-2xl mx-auto">
                    <FiPackage className="h-12 w-12 mx-auto mb-4 text-amber-500" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      No Walk-in Clinical Proforma Found
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      To add prescriptions, you need to create a clinical proforma first.
                      Please create a clinical proforma in the "Walk-in Clinical Proforma" section above,
                      and then you'll be able to add prescriptions for that visit.
                    </p>
                    <p className="text-xs text-gray-500 italic">
                      Once a clinical proforma is created, prescription fields will appear here automatically.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Card 4: Past History - View-only display organized by card type */}
      {(canViewPrescriptions || canViewClinicalProforma) && (
        <Card className="shadow-lg border-0 bg-white">
          <div
            className="flex items-center justify-between p-6 border-b border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <div 
              className="flex items-center gap-4 cursor-pointer flex-1"
              onClick={() => toggleCard('pastHistory')}
            >
              <div className="p-3 bg-purple-100 rounded-lg">
                <FiClock className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Past History</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {trulyPastProformas.length > 0 
                    ? `${trulyPastProformas.length} past visit${trulyPastProformas.length > 1 ? 's' : ''} - View only`
                    : 'No past visits - View only'}
                </p>
              </div>
            </div>
            <div 
              className="cursor-pointer"
              onClick={() => toggleCard('pastHistory')}
            >
              {expandedCards.pastHistory ? (
                <FiChevronUp className="h-6 w-6 text-gray-500" />
              ) : (
                <FiChevronDown className="h-6 w-6 text-gray-500" />
              )}
            </div>
          </div>

          {expandedCards.pastHistory && (
            <div className="p-6 space-y-4">
              {trulyPastProformas.length > 0 ? (
                <>
                  {/* Sort past proformas by visit date (oldest first - chronological order) */}
                  {(() => {
                    const sortedProformas = trulyPastProformas.sort((a, b) => {
                      const dateA = new Date(a.visit_date || a.created_at || 0);
                      const dateB = new Date(b.visit_date || b.created_at || 0);
                      return dateA - dateB; // Oldest first (chronological order)
                    });

                    // Check if any ADL files exist
                    const hasAdlFiles = sortedProformas.some(proforma => 
                      patientAdlFiles.some(adl => adl.clinical_proforma_id === proforma.id)
                    );

                    // Determine if we're in edit mode for past history
                    const isEditMode = isEdit;

                    return (
                      <>
                        {/* 1. Patient Details Card - Show once only, expandable/collapsible */}
                        <Card className="shadow-md border-2 border-blue-200">
                          <div
                            className="flex items-center justify-between p-4 border-b border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
                            onClick={() => togglePastHistoryCard('patientDetails')}
                          >
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-blue-100 rounded-lg">
                                <FiUser className="h-5 w-5 text-blue-600" />
                              </div>
                              <h4 className="text-lg font-bold text-gray-900">Patient Details</h4>
                            </div>
                            <div className="flex items-center gap-2">
                              {expandedPastHistoryCards.patientDetails ? (
                                <FiChevronUp className="h-5 w-5 text-gray-500" />
                              ) : (
                                <FiChevronDown className="h-5 w-5 text-gray-500" />
                              )}
                            </div>
                          </div>
                          {expandedPastHistoryCards.patientDetails && (
                            <div className="p-6">
                              {isEditMode ? (
                                // Editable form fields when edit=true
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                  <div>
                                    <label className="text-xs font-medium text-gray-500">Patient Name</label>
                                    <input
                                      type="text"
                                      value={formData.name || ''}
                                      onChange={handleChange}
                                      name="name"
                                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs font-medium text-gray-500">CR No</label>
                                    <input
                                      type="text"
                                      value={formData.cr_no || ''}
                                      onChange={handleChange}
                                      name="cr_no"
                                      disabled
                                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 cursor-not-allowed"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs font-medium text-gray-500">PSY No</label>
                                    <input
                                      type="text"
                                      value={formData.psy_no || ''}
                                      onChange={handleChange}
                                      name="psy_no"
                                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs font-medium text-gray-500">Age</label>
                                    <input
                                      type="text"
                                      value={formData.age || ''}
                                      onChange={handleChange}
                                      name="age"
                                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs font-medium text-gray-500">Sex</label>
                                    <Select
                                      name="sex"
                                      value={formData.sex || ''}
                                      onChange={handleChange}
                                      options={SEX_OPTIONS}
                                      placeholder="Select sex"
                                      searchable={true}
                                      className="mt-1"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs font-medium text-gray-500">Assigned Room</label>
                                    <input
                                      type="text"
                                      value={formData.assigned_room || ''}
                                      onChange={handleChange}
                                      name="assigned_room"
                                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                                    />
                                  </div>
                                </div>
                              ) : (
                                // View-only fields when not in edit mode
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                  <div>
                                    <label className="text-xs font-medium text-gray-500">Patient Name</label>
                                    <input
                                      type="text"
                                      value={patient?.name || ''}
                                      disabled
                                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 cursor-not-allowed"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs font-medium text-gray-500">CR No</label>
                                    <input
                                      type="text"
                                      value={patient?.cr_no || ''}
                                      disabled
                                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 cursor-not-allowed"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs font-medium text-gray-500">PSY No</label>
                                    <input
                                      type="text"
                                      value={patient?.psy_no || ''}
                                      disabled
                                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 cursor-not-allowed"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs font-medium text-gray-500">Age</label>
                                    <input
                                      type="text"
                                      value={patient?.age || ''}
                                      disabled
                                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 cursor-not-allowed"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs font-medium text-gray-500">Sex</label>
                                    <input
                                      type="text"
                                      value={patient?.sex || ''}
                                      disabled
                                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 cursor-not-allowed"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs font-medium text-gray-500">Assigned Room</label>
                                    <input
                                      type="text"
                                      value={patient?.assigned_room || ''}
                                      disabled
                                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 cursor-not-allowed"
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </Card>

                        {/* Unified Visit Cards - Each visit shows all forms completed during that visit */}
                        {unifiedVisits.length > 0 ? (
                          <div className="space-y-6">
                            {unifiedVisits.map((visit) => {
                              const visitDate = formatDate(visit.visitDate);
                              const isExpanded = isVisitCardExpanded(visit.visitId);
                              
                              return (
                                <Card key={visit.visitId} className="shadow-lg border-2 border-purple-200">
                                  {/* Visit Header */}
                                  <div
                                    className="flex items-center justify-between p-5 border-b border-gray-200 hover:bg-purple-50 transition-colors cursor-pointer"
                                    onClick={() => toggleVisitCard(visit.visitId, visit)}
                                  >
                                    <div className="flex items-center gap-4">
                                      <div className="p-3 bg-purple-100 rounded-lg">
                                        <FiClock className="h-6 w-6 text-purple-600" />
                                      </div>
                                      <div>
                                        <h4 className="text-xl font-bold text-gray-900">
                                          {visitDate}
                                        </h4>
                                        <div className="flex items-center gap-3 mt-2">
                                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                                            <FiFileText className="w-3 h-3" />
                                            Clinical Proforma
                                          </span>
                                          {visit.hasAdl && (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-medium">
                                              <FiFolder className="w-3 h-3" />
                                              ADL Record
                                            </span>
                                          )}
                                          {visit.hasPrescription && (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs font-medium">
                                              <FiPackage className="w-3 h-3" />
                                              Prescription
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handlePrintVisit(visit.visitId, visitDate);
                                        }}
                                        className="h-8 w-8 p-0 bg-gradient-to-r from-purple-50 to-indigo-50 hover:from-purple-100 hover:to-indigo-100 border border-purple-200 hover:border-purple-300 shadow-sm hover:shadow-md transition-all duration-200 rounded-lg"
                                        title={`Print Visit - ${visitDate}`}
                                      >
                                        <FiPrinter className="w-3.5 h-3.5 text-purple-600" />
                                      </Button>
                                      {isExpanded ? (
                                        <FiChevronUp className="h-6 w-6 text-gray-500" />
                                      ) : (
                                        <FiChevronDown className="h-6 w-6 text-gray-500" />
                                      )}
                                    </div>
                                  </div>

                                  {/* Visit Content - All forms for this visit */}
                                  {isExpanded && (
                                    <div ref={(el) => {
                                      if (el) visitPrintRefs.current.set(visit.visitId, el);
                                      else visitPrintRefs.current.delete(visit.visitId);
                                    }} className="p-6 space-y-6">
                                      {/* 1. Clinical Proforma Section */}
                                      <div className="border-l-4 border-green-500 pl-4">
                                        <div className="flex items-center justify-between mb-3">
                                          <h5 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                                            <FiFileText className="h-5 w-5 text-green-600" />
                                            Walk-in Clinical Proforma
                                          </h5>
                                          {isVisitSectionExpanded(visit.visitId, 'clinicalProforma') ? (
                                            <FiChevronUp 
                                              className="h-5 w-5 text-gray-500 cursor-pointer"
                                              onClick={() => toggleVisitSection(visit.visitId, 'clinicalProforma')}
                                            />
                                          ) : (
                                            <FiChevronDown 
                                              className="h-5 w-5 text-gray-500 cursor-pointer"
                                              onClick={() => toggleVisitSection(visit.visitId, 'clinicalProforma')}
                                            />
                                          )}
                                        </div>
                                        {isVisitSectionExpanded(visit.visitId, 'clinicalProforma') && (
                                          <div className="mt-3">
                                            {isEditMode ? (
                                              <EditClinicalProforma
                                                key={visit.proforma.id}
                                                initialData={{
                                                  ...visit.proforma,
                                                  patient_id: visit.proforma.patient_id?.toString() || patient?.id?.toString() || '',
                                                  visit_date: visit.proforma.visit_date ? (visit.proforma.visit_date.includes('T') ? visit.proforma.visit_date.split('T')[0] : visit.proforma.visit_date) : new Date().toISOString().split('T')[0],
                                                  assigned_doctor: visit.proforma.assigned_doctor?.toString() || patient?.assigned_doctor_id?.toString() || '',
                                                }}
                                              />
                                            ) : (
                                              <ClinicalProformaDetails proforma={visit.proforma} />
                                            )}
                                          </div>
                                        )}
                                      </div>

                                      {/* 2. ADL File Section (if exists) */}
                                      {visit.hasAdl && (
                                        <div className="border-l-4 border-orange-500 pl-4">
                                          <div className="flex items-center justify-between mb-3">
                                            <h5 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                                              <FiFolder className="h-5 w-5 text-orange-600" />
                                              Out Patient Intake Record (ADL)
                                            </h5>
                                            {isVisitSectionExpanded(visit.visitId, 'adl') ? (
                                              <FiChevronUp 
                                                className="h-5 w-5 text-gray-500 cursor-pointer"
                                                onClick={() => toggleVisitSection(visit.visitId, 'adl')}
                                              />
                                            ) : (
                                              <FiChevronDown 
                                                className="h-5 w-5 text-gray-500 cursor-pointer"
                                                onClick={() => toggleVisitSection(visit.visitId, 'adl')}
                                              />
                                            )}
                                          </div>
                                          {isVisitSectionExpanded(visit.visitId, 'adl') && (
                                            <div className="mt-3">
                                              {isEditMode ? (
                                                <EditADL
                                                  key={visit.adlFile.id}
                                                  adlFileId={visit.adlFile.id || visit.adlFile.adl_file_id || visit.adlFile.adlFileId}
                                                  isEmbedded={true}
                                                  patientId={patient?.id?.toString()}
                                                  clinicalProformaId={visit.proforma.id?.toString()}
                                                />
                                              ) : (
                                                <ViewADL adlFiles={visit.adlFile} />
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      )}

                                      {/* 3. Prescription Section (if exists) */}
                                      {visit.hasPrescription && (
                                        <div className="border-l-4 border-amber-500 pl-4">
                                          <div className="flex items-center justify-between mb-3">
                                            <h5 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                                              <FiPackage className="h-5 w-5 text-amber-600" />
                                              Prescription
                                            </h5>
                                            {isVisitSectionExpanded(visit.visitId, 'prescription') ? (
                                              <FiChevronUp 
                                                className="h-5 w-5 text-gray-500 cursor-pointer"
                                                onClick={() => toggleVisitSection(visit.visitId, 'prescription')}
                                              />
                                            ) : (
                                              <FiChevronDown 
                                                className="h-5 w-5 text-gray-500 cursor-pointer"
                                                onClick={() => toggleVisitSection(visit.visitId, 'prescription')}
                                              />
                                            )}
                                          </div>
                                          {isVisitSectionExpanded(visit.visitId, 'prescription') && (
                                            <div className="mt-3">
                                              <PrescriptionView 
                                                clinicalProformaId={visit.proforma.id}
                                                patientId={patient?.id}
                                              />
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </Card>
                              );
                            })}
                          </div>
                        ) : (
                <div className="text-center py-12">
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 max-w-2xl mx-auto">
                    <FiClock className="h-12 w-12 mx-auto mb-4 text-purple-500" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      No Past History Found
                    </h3>
                    <p className="text-sm text-gray-600">
                      This patient has no past visit records. Past visit history will appear here once additional visits are recorded.
                    </p>
                  </div>
                </div>
              )}
                      </>
                    );
                  })()}
                </>
              ) : (
                <div className="text-center py-12">
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 max-w-2xl mx-auto">
                    <FiClock className="h-12 w-12 mx-auto mb-4 text-purple-500" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      No Past History Found
                    </h3>
                    <p className="text-sm text-gray-600">
                      This patient has no past visit records. Past visit history will appear here once additional visits are recorded.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      )}

{(isResident || isFaculty || isJrSrUser || isAdminUser) && (
  <div className="flex mt-4 flex-col sm:flex-row justify-end gap-4">
    <Button
      type="button"
      variant="outline"
      onClick={() => navigate('/patients')}
      className="px-6 lg:px-8 py-3 bg-white/60 backdrop-blur-md border border-white/30 hover:bg-white/80 hover:border-gray-300/50 text-gray-800 font-semibold shadow-sm hover:shadow-md transition-all duration-200"
    >
      <FiX className="mr-2" />
      Cancel
    </Button>
    <Button
      type="button"
      onClick={() => navigate("/patients")}
      className="px-6 lg:px-8 py-3 bg-gradient-to-r from-primary-600 via-indigo-600 to-blue-600 hover:from-primary-700 hover:via-indigo-700 hover:to-blue-700 text-white font-bold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
    >
      <FiSave className="mr-2" />
      View All Patients
    </Button>
  </div>
)}
    </div>
  );
};

export default PatientDetailsEdit;


