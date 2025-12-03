import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Card from '../../components/Card';
import { formatDate, formatDateForDatePicker } from '../../utils/formatters';
import {
  getFileStatusLabel, getCaseSeverityLabel,formatDateTime
} from '../../utils/enumMappings';
import { isAdmin, isJrSr, isMWO, PATIENT_REGISTRATION_FORM, isJR, isSR } from '../../utils/constants';
import {
  FiUser, FiUsers, FiBriefcase,  FiHome, FiMapPin, FiPhone,
  FiCalendar, FiGlobe, FiFileText, FiHash, FiClock,
  FiHeart, FiBookOpen, FiTrendingUp, FiShield,
  FiNavigation,  FiEdit3, FiSave, FiX, FiLayers, 
  FiFolder, FiChevronDown, FiChevronUp, FiPackage,  FiDownload, FiPrinter, FiEye
} from 'react-icons/fi';
import Button from '../../components/Button';
import { IconInput } from '../../components/IconInput';
import { toast } from 'react-toastify';
import * as XLSX from 'xlsx-js-style';

import { useGetPrescriptionByIdQuery } from '../../features/prescriptions/prescriptionApiSlice';
import { useGetPatientVisitHistoryQuery } from '../../features/patients/patientsApiSlice';
import ViewADL from '../adl/ViewADL';
import ClinicalProformaDetails from '../clinical/ClinicalProformaDetails';
import PrescriptionView from '../PrescribeMedication/PrescriptionView';
import EditClinicalProforma from '../clinical/EditClinicalProforma';
import { selectCurrentUser } from '../../features/auth/authSlice';
import { useSelector } from 'react-redux';
import PGI_Logo from '../../assets/PGI_Logo.png';



const PatientDetailsView = ({ patient, formData, clinicalData, adlData, outpatientData, userRole }) => {
  const navigate = useNavigate();
  const currentUser = useSelector(selectCurrentUser);

  const [searchParams] = useSearchParams();
  const returnTab = searchParams.get('returnTab');
  

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
    prescriptions: false,
    pastHistory: false
  });

  // State to track which individual visits are expanded within each card
  const [expandedVisits, setExpandedVisits] = useState({});
  
  // State for past history cards
  const [expandedPastHistoryCards, setExpandedPastHistoryCards] = useState({
    patientDetails: false,
    clinicalProforma: false,
    intakeRecord: false,
    prescription: false
  });


  const isAdminUser = isAdmin(currentUser?.role);
  const isResident = isJR(currentUser?.role);
  const isFaculty = isSR(currentUser?.role);
  const isJrSrUser = isJrSr(currentUser?.role);
  const toggleCard = (cardName) => {
    setExpandedCards(prev => ({
      ...prev,
      [cardName]: !prev[cardName]
    }));
  };

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
    return expandedVisits[key] === true;
  };

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


  const canViewAllSections = userRole && (
    isAdmin(userRole) ||
    isJrSr(userRole)
  );
  const canViewClinicalProforma = canViewAllSections;
  const canViewADLFile = canViewAllSections;
  const canViewPrescriptions = canViewAllSections;
  const patientAdlFiles = adlData?.data?.adlFiles || [];


 
  const patientProformas = Array.isArray(clinicalData?.data?.proformas)
    ? clinicalData.data.proformas
    : [];

  // Fetch patient visit history
  const { data: visitHistoryData } = useGetPatientVisitHistoryQuery(
    patient?.id,
    { skip: !patient?.id }
  );
  const visitHistory = visitHistoryData || [];

  // Get today's date string for filtering
  const todayDateString = toISTDateString(new Date());

  // For Past History card: exclude today's proformas (only show truly past visits)
  const trulyPastProformas = useMemo(() => {
    return patientProformas.filter(proforma => {
      if (!proforma) return false;
      const proformaDate = toISTDateString(proforma.visit_date || proforma.created_at);
      if (!proformaDate) return true; // Include proformas without date as past
      return proformaDate !== todayDateString;
    });
  }, [patientProformas, todayDateString]);

  // Get the last visit proforma (most recent one)
  const lastVisitProforma = useMemo(() => {
    if (patientProformas.length === 0) return null;
    // Sort by visit_date or created_at, most recent first
    const sorted = [...patientProformas].sort((a, b) => {
      const dateA = new Date(a.visit_date || a.created_at || 0);
      const dateB = new Date(b.visit_date || b.created_at || 0);
      return dateB - dateA; // Most recent first
    });
    return sorted[0];
  }, [patientProformas]);

 
  const proformaIds = useMemo(() => {
    const ids = patientProformas.map(p => p?.id).filter(Boolean).slice(0, 10);
    // Pad to exactly 10 elements with null to ensure consistent hook calls
    while (ids.length < 10) {
      ids.push(null);
    }
    return ids;
  }, [patientProformas]);

  
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

  // Hide submit buttons, Add buttons, and disable checkboxes in embedded clinical proforma view
  useEffect(() => {
    if (expandedCards.clinical && clinicalProformaPrintRef.current) {
      const form = clinicalProformaPrintRef.current.querySelector('form');
      if (form) {
        // Hide submit button section (last div with flex justify-end)
        const allDivs = form.querySelectorAll('div.flex.justify-end');
        allDivs.forEach(div => {
          const hasSubmitButton = div.querySelector('button[type="submit"]');
          if (hasSubmitButton) {
            div.style.display = 'none';
          }
        });
        // Also hide any submit buttons directly
        const submitButtons = form.querySelectorAll('button[type="submit"]');
        submitButtons.forEach(btn => {
          btn.style.display = 'none';
        });
        // Hide cancel buttons, Add buttons, and cross (X) buttons
        const allButtons = form.querySelectorAll('button');
        allButtons.forEach(btn => {
          const text = btn.textContent?.trim() || '';
          // Check for buttons with X icon or cross symbol
          const svg = btn.querySelector('svg');
          let hasXIcon = false;
          if (svg) {
            const svgPaths = svg.querySelectorAll('path');
            svgPaths.forEach(path => {
              const d = path.getAttribute('d') || '';
              // Common X icon path patterns
              if (d.includes('M18 6L6 18') || 
                  d.includes('M6 6l12 12') || 
                  d.includes('M6 18L18 6') ||
                  d.includes('M6 6 L18 18') ||
                  d.includes('M18 6 L6 18')) {
                hasXIcon = true;
              }
            });
            const svgClass = svg.className?.toString().toLowerCase() || '';
            if (svgClass.includes('x') || svgClass.includes('close') || svgClass.includes('times')) {
              hasXIcon = true;
            }
          }
          const ariaLabel = (btn.getAttribute('aria-label') || '').toLowerCase();
          const title = (btn.getAttribute('title') || '').toLowerCase();
          const className = (btn.className || '').toLowerCase();
          const isCloseButton = ariaLabel.includes('close') || 
                               ariaLabel.includes('remove') || 
                               ariaLabel.includes('delete') ||
                               ariaLabel.includes('clear') ||
                               title.includes('close') ||
                               title.includes('remove') ||
                               title.includes('delete') ||
                               title.includes('clear') ||
                               className.includes('close') ||
                               className.includes('remove') ||
                               className.includes('delete') ||
                               className.includes('clear') ||
                               className.includes('times');
          
          // Hide buttons that match any of these criteria
          if (text === 'Cancel' || 
              text.includes('Create') || 
              text.includes('Update') || 
              text.includes('Saving') || 
              text.includes('Add') || 
              text === '+ Add' || 
              text === '×' || 
              text === '✕' ||
              text === 'X' ||
              hasXIcon ||
              isCloseButton) {
            btn.style.display = 'none';
          }
        });
        // Disable all checkboxes
        const checkboxes = form.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
          checkbox.disabled = true;
          checkbox.style.cursor = 'not-allowed';
        });
        // Disable all radio buttons
        const radioButtons = form.querySelectorAll('input[type="radio"]');
        radioButtons.forEach(radio => {
          radio.disabled = true;
          radio.style.cursor = 'not-allowed';
        });
        // Disable all text inputs and textareas
        const textInputs = form.querySelectorAll('input[type="text"], input[type="number"], textarea, select');
        textInputs.forEach(input => {
          input.disabled = true;
          input.style.cursor = 'not-allowed';
        });
      }
    }
  }, [expandedCards.clinical, lastVisitProforma]);

  // Print functionality for Patient Details section
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
      color: #1e40af;
      font-weight: 600;
    }
    /* Hide non-printable elements */
    button, .no-print, [class*="no-print"], nav, header, aside, [class*="Button"], 
    [class*="chevron"], [class*="Printer"], [role="button"], input[type="button"],
    input[type="submit"], .cursor-pointer:not(.print-keep) {
      display: none !important;
    }
    /* Clean up React component structure for print */
    [class*="relative"], [class*="absolute"], [class*="backdrop-blur"], 
    [class*="shadow"], [class*="rounded"], [class*="border-white"] {
      position: static !important;
      backdrop-filter: none !important;
      box-shadow: none !important;
      border-radius: 0 !important;
      border: none !important;
    }
    /* Simplify field containers */
    [class*="relative"] > [class*="relative"] {
      position: static !important;
    }
    /* Ensure proper spacing */
    [class*="space-y"], [class*="gap-"] {
      margin-bottom: 10px !important;
    }
    /* Grid layout for fields - ensure proper 2-column layout */
    .grid, [class*="grid"] {
      display: grid !important;
      grid-template-columns: repeat(2, 1fr) !important;
      gap: 10px !important;
      margin-bottom: 12px !important;
    }
    .grid-cols-1 { grid-template-columns: 1fr !important; }
    .grid-cols-2 { grid-template-columns: repeat(2, 1fr) !important; }
    .grid-cols-3 { grid-template-columns: repeat(2, 1fr) !important; }
    .grid-cols-4 { grid-template-columns: repeat(2, 1fr) !important; }
    /* Field items styling - handle nested structure */
    [class*="relative"] {
      position: static !important;
    }
    [class*="relative"] > [class*="relative"] {
      position: static !important;
      margin-bottom: 8px !important;
      padding: 8px 10px !important;
      background: #f8fafc !important;
      border-left: 3px solid #3b82f6 !important;
      border-radius: 4px !important;
      page-break-inside: avoid !important;
    }
    [class*="relative"] > [class*="absolute"] {
      display: none !important;
    }
    label, [class*="font-semibold"] {
      display: block !important;
      font-weight: 600 !important;
      font-size: 8pt !important;
      color: #475569 !important;
      margin-bottom: 4px !important;
      text-transform: uppercase !important;
    }
    p, [class*="text-base"], [class*="text-lg"], [class*="text-gray-900"] {
      display: block !important;
      font-size: 9pt !important;
      color: #1e293b !important;
      margin: 0 !important;
      padding: 0 !important;
    }
    /* Section titles */
    h3, h4, [class*="text-xl"], [class*="text-2xl"] {
      font-weight: bold !important;
      margin-bottom: 12px !important;
      padding-bottom: 6px !important;
      border-bottom: 2px solid #3b82f6 !important;
      text-transform: uppercase !important;
    }
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
      /* Field containers */
      [class*="relative"]:has(label), [class*="relative"]:has([class*="font-semibold"]) {
        display: block !important;
        margin-bottom: 8px !important;
        padding: 6px 8px !important;
        background: #f8fafc !important;
        border-left: 3px solid #3b82f6 !important;
        border-radius: 3px !important;
        page-break-inside: avoid !important;
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

  // Print functionality for Walk-in Clinical Proforma section
  const handlePrintClinicalProforma = async () => {
    if (!clinicalProformaPrintRef.current) return;

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
      border-bottom: 4px solid #10b981;
      margin-bottom: 25px;
      background: linear-gradient(to bottom, #f0fdf4, #ffffff);
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
      color: #047857;
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
      color: #047857;
      border-bottom: 3px solid #10b981;
      padding-bottom: 8px;
      margin-bottom: 15px;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      background: linear-gradient(to right, #d1fae5, #ffffff);
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
      background: linear-gradient(to bottom, #047857, #059669);
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
      background: #f0fdf4;
    }
    table tbody tr:hover {
      background: #d1fae5;
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
      color: #047857;
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
      /* Field containers */
      [class*="relative"]:has(label), [class*="relative"]:has([class*="font-semibold"]) {
        display: block !important;
        margin-bottom: 8px !important;
        padding: 6px 8px !important;
        background: #f8fafc !important;
        border-left: 3px solid #3b82f6 !important;
        border-radius: 3px !important;
        page-break-inside: avoid !important;
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
      <p class="subtitle">Walk-in Clinical Proforma</p>
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
      /* Field containers */
      [class*="relative"]:has(label), [class*="relative"]:has([class*="font-semibold"]) {
        display: block !important;
        margin-bottom: 8px !important;
        padding: 6px 8px !important;
        background: #f8fafc !important;
        border-left: 3px solid #3b82f6 !important;
        border-radius: 3px !important;
        page-break-inside: avoid !important;
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
      /* Field containers */
      [class*="relative"]:has(label), [class*="relative"]:has([class*="font-semibold"]) {
        display: block !important;
        margin-bottom: 8px !important;
        padding: 6px 8px !important;
        background: #f8fafc !important;
        border-left: 3px solid #3b82f6 !important;
        border-radius: 3px !important;
        page-break-inside: avoid !important;
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
      <p class="subtitle">Prescription History</p>
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
          'Doctor Decision': proforma.doctor_decision === 'complex_case' ? 'Instantly Requires Detailed Work-Up' : (proforma.doctor_decision === 'simple_case' ? 'Requires Detailed Workup on Next Follow-Up' : 'N/A'),
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
    <div className="space-y-6">
      {/* Card 1: Patient Details */}
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
            <form>
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
                        value={displayData.cr_no || ''}
                        disabled={true}
                        className="disabled:bg-gray-200 disabled:cursor-not-allowed disabled:text-gray-900"
                      />
                      <IconInput
                        icon={<FiCalendar className="w-4 h-4" />}
                        label="Date"
                        name="date"
                        value={displayData.date ? formatDate(displayData.date) : ''}
                        disabled={true}
                        className="disabled:bg-gray-200 disabled:cursor-not-allowed disabled:text-gray-900"
                      />
                      <IconInput
                        icon={<FiUser className="w-4 h-4" />}
                        label="Name"
                        name="name"
                        value={displayData.name || ''}
                        disabled={true}
                        className="disabled:bg-gray-200 disabled:cursor-not-allowed disabled:text-gray-900"
                      />
                      <IconInput
                        icon={<FiPhone className="w-4 h-4" />}
                        label="Mobile No."
                        name="contact_number"
                        value={displayData.contact_number || ''}
                        disabled={true}
                        className="disabled:bg-gray-200 disabled:cursor-not-allowed disabled:text-gray-900"
                      />
                    </div>

                    {/* Second Row - Age, Sex, Category, Father's Name */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <IconInput
                        icon={<FiClock className="w-4 h-4" />}
                        label="Age"
                        name="age"
                        value={displayData.age || ''}
                        type="number"
                        disabled={true}
                        className="disabled:bg-gray-200 disabled:cursor-not-allowed disabled:text-gray-900"
                      />
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                          Sex
                          </label>
                        <div className="bg-gray-200 px-4 py-2 rounded-lg text-gray-900 cursor-not-allowed">
                          {displayData.sex || 'N/A'}
                      </div>
                      </div>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                          <FiShield className="w-4 h-4 text-primary-600" />
                          Category
                        </label>
                        <div className="bg-gray-200 px-4 py-2 rounded-lg text-gray-900 cursor-not-allowed">
                          {displayData.category || 'N/A'}
                      </div>
                      </div>
                      <IconInput
                        icon={<FiUsers className="w-4 h-4" />}
                        label="Father's Name"
                        name="father_name"
                        value={displayData.father_name || ''}
                        disabled={true}
                        className="disabled:bg-gray-200 disabled:cursor-not-allowed disabled:text-gray-900"
                      />
                    </div>
                    {/* Fourth Row - Department, Unit/Consit, Room No., Serial No. */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <IconInput
                        icon={<FiLayers className="w-4 h-4" />}
                        label="Department"
                        name="department"
                        value={displayData.department || ''}
                        disabled={true}
                        className="disabled:bg-gray-200 disabled:cursor-not-allowed disabled:text-gray-900"
                      />
                      <IconInput
                        icon={<FiUsers className="w-4 h-4" />}
                        label="Unit/Consit"
                        name="unit_consit"
                        value={displayData.unit_consit || ''}
                        disabled={true}
                        className="disabled:bg-gray-200 disabled:cursor-not-allowed disabled:text-gray-900"
                      />
                      <IconInput
                        icon={<FiHome className="w-4 h-4" />}
                        label="Room No."
                        name="room_no"
                        value={displayData.room_no || ''}
                        disabled={true}
                        className="disabled:bg-gray-200 disabled:cursor-not-allowed disabled:text-gray-900"
                      />
                      <IconInput
                        icon={<FiHash className="w-4 h-4" />}
                        label="Serial No."
                        name="serial_no"
                        value={displayData.serial_no || ''}
                        disabled={true}
                        className="disabled:bg-gray-200 disabled:cursor-not-allowed disabled:text-gray-900"
                      />
                    </div>

                    {/* Fifth Row - File No., Unit Days */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <IconInput
                        icon={<FiFileText className="w-4 h-4" />}
                        label="File No."
                        name="file_no"
                        value={displayData.file_no || ''}
                        disabled={true}
                        className="disabled:bg-gray-200 disabled:cursor-not-allowed disabled:text-gray-900"
                      />
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-800">Unit Days</label>
                        <div className="bg-gray-200 px-4 py-2 rounded-lg text-gray-900 cursor-not-allowed">
                          {displayData.unit_days || 'N/A'}
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
                        <IconInput
                          icon={<FiHome className="w-4 h-4" />}
                          label="Address Line (House No., Street, Locality)"
                          name="address_line"
                          value={displayData.address_line || ''}
                          disabled={true}
                          className="disabled:bg-gray-200 disabled:cursor-not-allowed disabled:text-gray-900"
                        />

                        {/* Location Fields */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <IconInput
                            icon={<FiGlobe className="w-4 h-4" />}
                            label="Country"
                            name="country"
                            value={displayData.country || ''}
                            disabled={true}
                            className="disabled:bg-gray-200 disabled:cursor-not-allowed disabled:text-gray-900"
                          />
                          <IconInput
                            icon={<FiMapPin className="w-4 h-4" />}
                            label="State"
                            name="state"
                            value={displayData.state || ''}
                            disabled={true}
                            className="disabled:bg-gray-200 disabled:cursor-not-allowed disabled:text-gray-900"
                          />
                          <IconInput
                            icon={<FiLayers className="w-4 h-4" />}
                            label="District"
                            name="district"
                            value={displayData.district || ''}
                            disabled={true}
                            className="disabled:bg-gray-200 disabled:cursor-not-allowed disabled:text-gray-900"
                          />
                          <IconInput
                            icon={<FiHome className="w-4 h-4" />}
                            label="City/Town/Village"
                            name="city"
                            value={displayData.city || ''}
                            disabled={true}
                            className="disabled:bg-gray-200 disabled:cursor-not-allowed disabled:text-gray-900"
                          />
                        </div>

                        {/* Pin Code Row */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <IconInput
                            icon={<FiHash className="w-4 h-4" />}
                            label="Pin Code"
                            name="pin_code"
                            value={displayData.pin_code || ''}
                            type="number"
                            disabled={true}
                            className="disabled:bg-gray-200 disabled:cursor-not-allowed disabled:text-gray-900"
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
                        <IconInput
                          icon={<FiCalendar className="w-4 h-4" />}
                          label="Seen in Walk-in-on"
                          name="seen_in_walk_in_on"
                          value={displayData.seen_in_walk_in_on ? formatDate(displayData.seen_in_walk_in_on) : ''}
                          disabled={true}
                          className="disabled:bg-gray-200 disabled:cursor-not-allowed disabled:text-gray-900"
                        />
                        <IconInput
                          icon={<FiCalendar className="w-4 h-4" />}
                          label="Worked up on"
                          name="worked_up_on"
                          value={displayData.worked_up_on ? formatDate(displayData.worked_up_on) : ''}
                          disabled={true}
                          className="disabled:bg-gray-200 disabled:cursor-not-allowed disabled:text-gray-900"
                        />
                        <IconInput
                          icon={<FiHash className="w-4 h-4" />}
                          label="CR No."
                          name="cr_no"
                          value={displayData.cr_no || ''}
                          disabled={true}
                          className="disabled:bg-gray-200 disabled:cursor-not-allowed disabled:text-gray-900"
                        />
                        <IconInput
                          icon={<FiFileText className="w-4 h-4" />}
                          label="Psy. No."
                          name="psy_no"
                          value={displayData.psy_no || ''}
                          disabled={true}
                          className="disabled:bg-gray-200 disabled:cursor-not-allowed disabled:text-gray-900"
                        />
                        <IconInput
                          icon={<FiHeart className="w-4 h-4" />}
                          label="Special Clinic No."
                          name="special_clinic_no"
                          value={displayData.special_clinic_no || ''}
                          disabled={true}
                          className="disabled:bg-gray-200 disabled:cursor-not-allowed disabled:text-gray-900"
                        />
                        <IconInput
                          icon={<FiUser className="w-4 h-4" />}
                          label="Name"
                          name="name"
                          value={displayData.name || ''}
                          disabled={true}
                          className="disabled:bg-gray-200 disabled:cursor-not-allowed disabled:text-gray-900"
                        />
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-gray-800">Sex</label>
                          <div className="bg-gray-200 px-4 py-2 rounded-lg text-gray-900 cursor-not-allowed">
                            {displayData.sex || 'N/A'}
                        </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-gray-800">Age Group</label>
                          <div className="bg-gray-200 px-4 py-2 rounded-lg text-gray-900 cursor-not-allowed">
                            {displayData.age_group || 'N/A'}
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
        <Card className="shadow-lg border-0 bg-white">
          <div
            className="flex items-center justify-between p-6 border-b border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <div 
              className="flex items-center gap-4 cursor-pointer flex-1"
            onClick={() => toggleCard('clinical')}
          >
              <div className="p-3 bg-green-100 rounded-lg">
                <FiFileText className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Walk-in Clinical Proforma</h3>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <p className="text-sm text-gray-500">
                    {lastVisitProforma
                      ? `Last visit: ${formatDate(lastVisitProforma.visit_date || lastVisitProforma.created_at)}`
                    : 'No clinical records'}
                </p>
                  {lastVisitProforma && lastVisitProforma.visit_type && (
                    <>
                      <span className="text-gray-400">•</span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        lastVisitProforma.visit_type === 'first_visit' 
                          ? 'bg-purple-100 text-purple-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {lastVisitProforma.visit_type === 'first_visit' ? 'First Visit' : 'Follow-up'}
                      </span>
                    </>
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
                  handlePrintClinicalProforma();
                }}
                className="h-9 w-9 p-0 bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 border border-green-200 hover:border-green-300 shadow-sm hover:shadow-md transition-all duration-200 rounded-lg"
                title="Print Walk-in Clinical Proforma"
              >
                <FiPrinter className="w-4 h-4 text-green-600" />
              </Button>
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
              {/* Last Visit Section - Show full proforma form */}
              {lastVisitProforma ? (
                <div className="space-y-4 border-t border-gray-200 pt-6">
                  <h4 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                      Last Visit
                    </span>
                    <span className="text-sm text-gray-500 font-normal">
                      {formatDate(lastVisitProforma.visit_date || lastVisitProforma.created_at)}
                                  </span>
                  </h4>
                  
                  {/* Show clinical proforma form with all fields */}
                  <div ref={clinicalProformaPrintRef} className="border-2 border-blue-300 rounded-lg p-4 bg-blue-50/30 clinical-proforma-view">
                    <EditClinicalProforma
                      key={`view-proforma-${lastVisitProforma?.id || Date.now()}`}
                      initialData={{
                        ...lastVisitProforma,
                        patient_id: lastVisitProforma.patient_id?.toString() || patient?.id?.toString() || '',
                        visit_date: lastVisitProforma.visit_date ? (lastVisitProforma.visit_date.includes('T') ? lastVisitProforma.visit_date.split('T')[0] : lastVisitProforma.visit_date) : new Date().toISOString().split('T')[0],
                        assigned_doctor: lastVisitProforma.assigned_doctor?.toString() || patient?.assigned_doctor_id?.toString() || '',
                        onset_duration: lastVisitProforma.onset_duration || '',
                        course: lastVisitProforma.course || '',
                        precipitating_factor: lastVisitProforma.precipitating_factor || '',
                        illness_duration: lastVisitProforma.illness_duration || '',
                        current_episode_since: lastVisitProforma.current_episode_since || '',
                        past_history: lastVisitProforma.past_history || '',
                        family_history: lastVisitProforma.family_history || '',
                        gpe: lastVisitProforma.gpe || '',
                        diagnosis: lastVisitProforma.diagnosis || '',
                        icd_code: lastVisitProforma.icd_code || '',
                        disposal: lastVisitProforma.disposal || '',
                        workup_appointment: lastVisitProforma.workup_appointment || '',
                        referred_to: lastVisitProforma.referred_to || '',
                        treatment_prescribed: lastVisitProforma.treatment_prescribed || '',
                        mse_delusions: lastVisitProforma.mse_delusions || '',
                        adl_reasoning: lastVisitProforma.adl_reasoning || '',
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
                        associated_medical_surgical: lastVisitProforma.associated_medical_surgical || [],
                        mse_behaviour: lastVisitProforma.mse_behaviour || [],
                        mse_affect: lastVisitProforma.mse_affect || [],
                        mse_thought: lastVisitProforma.mse_thought || [],
                        mse_perception: lastVisitProforma.mse_perception || [],
                        mse_cognitive_function: lastVisitProforma.mse_cognitive_function || [],
                        informant_present: lastVisitProforma.informant_present ?? true,
                        nature_of_information: lastVisitProforma.nature_of_information || '',
                      }}
                      onUpdate={() => {}}
                      hideFileUpload={true}
                    />
                  </div>
                </div>
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
                    : 'No Out Patient Intake Record files'}
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
                className="h-9 w-9 p-0 bg-gradient-to-r from-purple-50 to-indigo-50 hover:from-purple-100 hover:to-indigo-100 border border-purple-200 hover:border-purple-300 shadow-sm hover:shadow-md transition-all duration-200 rounded-lg"
                title="Print Out-Patient Intake Record"
              >
                <FiPrinter className="w-4 h-4 text-purple-600" />
              </Button>
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
            <div className="p-6">
              {patientAdlFiles.length > 0 ? (
              
                <ViewADL adlFiles={patientAdlFiles[0]}/>
               
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <FiFolder className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-base">No  Out Patient Intake Record found</p>
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Card 4: Prescription History - Show only if current user is Admin, JR, or SR */}
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
                <h3 className="text-xl font-bold text-gray-900">Prescription History</h3>
                <p className="text-sm text-gray-500 mt-1">
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
                className="h-9 w-9 p-0 bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 border border-amber-200 hover:border-amber-300 shadow-sm hover:shadow-md transition-all duration-200 rounded-lg"
                title="Print Prescription History"
              >
                <FiPrinter className="w-4 h-4 text-amber-600" />
              </Button>
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

      {/* Card 5: Past History - View-only display organized by card type */}
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
                    const sortedProformas = [...trulyPastProformas].sort((a, b) => {
                      const dateA = new Date(a.visit_date || a.created_at || 0);
                      const dateB = new Date(b.visit_date || b.created_at || 0);
                      return dateA - dateB; // Oldest first (chronological order)
                    });

                    // Check if any ADL files exist
                    const hasAdlFiles = sortedProformas.some(proforma => 
                      patientAdlFiles.some(adl => adl.clinical_proforma_id === proforma.id)
                    );

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
                              {/* View-only fields */}
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
                            </div>
                          )}
                        </Card>

                        {/* 2. Walk-in Clinical Proforma Card - Show all visit-wise proformas, expandable/collapsible */}
                        <Card className="shadow-md border-2 border-green-200">
                          <div
                            className="flex items-center justify-between p-4 border-b border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
                            onClick={() => togglePastHistoryCard('clinicalProforma')}
                          >
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-green-100 rounded-lg">
                                <FiFileText className="h-5 w-5 text-green-600" />
                              </div>
                              <h4 className="text-lg font-bold text-gray-900">Walk-in Clinical Proforma</h4>
                            </div>
                            <div className="flex items-center gap-2">
                              {expandedPastHistoryCards.clinicalProforma ? (
                                <FiChevronUp className="h-5 w-5 text-gray-500" />
                              ) : (
                                <FiChevronDown className="h-5 w-5 text-gray-500" />
                              )}
                </div>
                          </div>
                          {expandedPastHistoryCards.clinicalProforma && (
                            <div className="p-6">
                              <div className="space-y-4">
                                {sortedProformas.map((proforma, index) => {
                                  const visitNumber = index + 1;
                                  const visitDate = formatDate(proforma.visit_date || proforma.created_at);
                                  const visitId = proforma.id || `proforma-${index}`;
                                  const isExpanded = isVisitExpanded('clinicalProforma', visitId);
                                  return (
                                    <Card key={visitId} className="border border-gray-200 shadow-sm">
                                      <div
                                        className="flex items-center justify-between p-4 border-b border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
                                        onClick={() => toggleVisit('clinicalProforma', visitId)}
                                      >
                                        <div className="flex items-center gap-3">
                                          <div className="p-2 bg-green-100 rounded-lg">
                                            <FiHash className="h-4 w-4 text-green-600" />
                                          </div>
                                          <div>
                                            <h5 className="text-md font-semibold text-gray-800">
                                              Visit {visitNumber} - Walk-in Clinical Proforma
                                            </h5>
                                            <p className="text-xs text-gray-500 mt-1">{visitDate}</p>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          {isExpanded ? (
                                            <FiChevronUp className="h-5 w-5 text-gray-500" />
                                          ) : (
                                            <FiChevronDown className="h-5 w-5 text-gray-500" />
              )}
            </div>
                                      </div>
                                      {isExpanded && (
                                        <div className="p-4">
                                          {/* View-only when not in edit mode */}
                                          <ClinicalProformaDetails proforma={proforma} />
                                        </div>
          )}
        </Card>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </Card>

                        {/* 3. Out Patient Intake Record Card - Only if ADL files exist, expandable/collapsible */}
                        {hasAdlFiles && (
                          <Card className="shadow-md border-2 border-orange-200">
                            <div
                              className="flex items-center justify-between p-4 border-b border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
                              onClick={() => togglePastHistoryCard('intakeRecord')}
                            >
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-orange-100 rounded-lg">
                                  <FiFolder className="h-5 w-5 text-orange-600" />
                                </div>
                                <h4 className="text-lg font-bold text-gray-900">Out Patient Intake Record</h4>
                              </div>
                              <div className="flex items-center gap-2">
                                {expandedPastHistoryCards.intakeRecord ? (
                                  <FiChevronUp className="h-5 w-5 text-gray-500" />
                                ) : (
                                  <FiChevronDown className="h-5 w-5 text-gray-500" />
                                )}
                              </div>
                            </div>
                            {expandedPastHistoryCards.intakeRecord && (
                              <div className="p-6">
                                <div className="space-y-4">
                                  {sortedProformas.map((proforma, index) => {
                                    const adlFile = patientAdlFiles.find(adl => adl.clinical_proforma_id === proforma.id);
                                    if (!adlFile) return null;
                                    
                                    const visitNumber = index + 1;
                                    const visitDate = formatDate(proforma.visit_date || proforma.created_at);
                                    const visitId = adlFile.id || adlFile.adl_file_id || adlFile.adlFileId || `adl-${index}`;
                                    const isExpanded = isVisitExpanded('intakeRecord', visitId);
                                    return (
                                      <Card key={visitId} className="border border-gray-200 shadow-sm">
                                        <div
                                          className="flex items-center justify-between p-4 border-b border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
                                          onClick={() => toggleVisit('intakeRecord', visitId)}
                                        >
                                          <div className="flex items-center gap-3">
                                            <div className="p-2 bg-orange-100 rounded-lg">
                                              <FiHash className="h-4 w-4 text-orange-600" />
                                            </div>
                                            <div>
                                              <h5 className="text-md font-semibold text-gray-800">
                                                Visit {visitNumber} - Out Patient Intake Record
                                              </h5>
                                              <p className="text-xs text-gray-500 mt-1">{visitDate}</p>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            {isExpanded ? (
                                              <FiChevronUp className="h-5 w-5 text-gray-500" />
                                            ) : (
                                              <FiChevronDown className="h-5 w-5 text-gray-500" />
                                            )}
                                          </div>
                                        </div>
                                        {isExpanded && (
                                          <div className="p-4">
                                            {/* View-only when not in edit mode */}
                                            <ViewADL adlFiles={adlFile} />
                                          </div>
                                        )}
                                      </Card>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </Card>
                        )}

                        {/* 4. Prescription Card - Show all visit-wise prescriptions, expandable/collapsible */}
                        <Card className="shadow-md border-2 border-amber-200">
                          <div
                            className="flex items-center justify-between p-4 border-b border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
                            onClick={() => togglePastHistoryCard('prescription')}
                          >
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-amber-100 rounded-lg">
                                <FiPackage className="h-5 w-5 text-amber-600" />
                              </div>
                              <h4 className="text-lg font-bold text-gray-900">Prescription</h4>
                            </div>
                            <div className="flex items-center gap-2">
                              {expandedPastHistoryCards.prescription ? (
                                <FiChevronUp className="h-5 w-5 text-gray-500" />
                              ) : (
                                <FiChevronDown className="h-5 w-5 text-gray-500" />
                              )}
                            </div>
                          </div>
                          {expandedPastHistoryCards.prescription && (
                            <div className="p-6">
                              <div className="space-y-4">
                                {sortedProformas.map((proforma, index) => {
                                  const visitNumber = index + 1;
                                  const visitDate = formatDate(proforma.visit_date || proforma.created_at);
                                  const visitId = proforma.id || `prescription-${index}`;
                                  const isExpanded = isVisitExpanded('prescription', visitId);
                                  return (
                                    <Card key={visitId} className="border border-gray-200 shadow-sm">
                                      <div
                                        className="flex items-center justify-between p-4 border-b border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
                                        onClick={() => toggleVisit('prescription', visitId)}
                                      >
                                        <div className="flex items-center gap-3">
                                          <div className="p-2 bg-amber-100 rounded-lg">
                                            <FiHash className="h-4 w-4 text-amber-600" />
</div>
                                          <div>
                                            <h5 className="text-md font-semibold text-gray-800">
                                              Visit {visitNumber} - Prescription
                                            </h5>
                                            <p className="text-xs text-gray-500 mt-1">{visitDate}</p>
      </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          {isExpanded ? (
                                            <FiChevronUp className="h-5 w-5 text-gray-500" />
                                          ) : (
                                            <FiChevronDown className="h-5 w-5 text-gray-500" />
                                          )}
                                        </div>
                                      </div>
                                      {isExpanded && (
                                        <div className="p-4">
                                          {/* View-only when not in edit mode */}
                                          <PrescriptionView 
                                            clinicalProformaId={proforma.id}
                                            patientId={patient?.id}
                                          />
                                        </div>
                                      )}
                                    </Card>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </Card>
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
    </div>
  );
};

export default PatientDetailsView;
