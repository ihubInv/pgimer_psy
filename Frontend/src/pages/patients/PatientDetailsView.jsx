import { useState, useMemo, useEffect, useRef, memo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Card from '../../components/Card';
import { formatDate, formatDateForDatePicker } from '../../utils/formatters';
import {
  getFileStatusLabel, getCaseSeverityLabel,formatDateTime
} from '../../utils/enumMappings';
import { 
  isAdmin, isJrSr, isMWO, PATIENT_REGISTRATION_FORM, isJR, isSR, 
  REFERRED_BY_OPTIONS, SEX_OPTIONS, MARITAL_STATUS, OCCUPATION_OPTIONS, 
  EDUCATION_OPTIONS, RELIGION_OPTIONS, FAMILY_TYPE_OPTIONS, LOCALITY_OPTIONS, 
  HEAD_RELATIONSHIP_OPTIONS, MOBILITY_OPTIONS 
} from '../../utils/constants';
import {
  FiUser, FiUsers, FiBriefcase,  FiHome, FiMapPin, FiPhone,
  FiCalendar, FiGlobe, FiFileText, FiHash, FiClock,
  FiHeart, FiBookOpen, FiTrendingUp, FiShield,
  FiNavigation, FiSave, FiX, FiLayers, 
  FiFolder, FiChevronDown, FiChevronUp, FiPackage, FiDownload, FiEye, FiPrinter
} from 'react-icons/fi';
import Button from '../../components/Button';
import { toast } from 'react-toastify';
import {
  downloadPatientReportExcel,
  openPatientReportPrint,
  openPatientReportSectionPrint,
} from '../../utils/patientReportApi';

import { useGetPrescriptionByIdQuery, useGetPrescriptionsByPatientIdQuery } from '../../features/prescriptions/prescriptionApiSlice';
import { useGetPatientVisitHistoryQuery, useGetPatientFilesQuery } from '../../features/patients/patientsApiSlice';
import OutPatientIntakeRecordSummaryView from '../../components/OutPatientIntakeRecordSummaryView';
import PrescriptionView from '../PrescribeMedication/PrescriptionView';
import WalkInClinicalProformaSummaryView from '../../components/WalkInClinicalProformaSummaryView';
import FilePreview from '../../components/FilePreview';
import {
  PatientDetailField,
  PatientDetailSectionTitle,
  PatientDetailFieldGroup,
  PatientDetailCardShell,
  ReadOnlyToneProvider,
} from '../../components/PatientDetailReadOnlyCard';
import { VIEW_NESTED_PANEL_CLASS, VIEW_SECTION_ICON } from '../../utils/viewDetailsUi';
import ViewEmptyMessage from '../../components/ViewEmptyMessage';
import { selectCurrentUser } from '../../features/auth/authSlice';
import { useSelector } from 'react-redux';
import PGI_Logo from '../../assets/PGI_Logo.png';
import { clinicalProformaRecordsOnly } from '../../utils/clinicalPatientRecords';
import {
  buildPrescriptionPrintDocument,
  printPatientPrescriptions,
} from '../../utils/prescriptionPrint';
import {
  mapAdultPatientForPrint,
  mapApiPatientForPrint,
} from '../../utils/prescriptionPrintPatient';
import {
  generateAdlIntakePrintHtml,
  adlIntakeSectionHtml,
  adlIntakeContentOnlyHtml,
} from '../../utils/adlIntakePrint';
import {
  patientDetailsSectionHtml,
  patientDetailsContentOnlyHtml,
} from '../../utils/patientDetailsPrint';
import {
  clinicalProformaSectionHtml,
  clinicalProformaContentOnlyHtml,
} from '../../utils/clinicalProformaPrint';
import { useGetAllClinicalOptionsQuery } from '../../features/clinical/clinicalApiSlice';

const PatientDetailsView = memo(({ patient, formData, clinicalData, adlData, outpatientData, userRole }) => {
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
      // For PWO: These fields should not exist in displayData
      ...(userRole && !isMWO(userRole) ? {
      category: formData?.category || patient?.category || '',
      unit_consit: formData?.unit_consit || patient?.unit_consit || '',
      room_no: formData?.room_no || patient?.room_no || '',
      serial_no: formData?.serial_no || patient?.serial_no || '',
      unit_days: formData?.unit_days || patient?.unit_days || '',
      } : {}),
      department: formData?.department || patient?.department || '',
      file_no: formData?.file_no || patient?.file_no || '',
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

  // Generic helper function to get label from options array
  const getLabelFromOptions = (value, options) => {
    if (!value) return 'N/A';
    const option = options.find(opt => opt.value === value);
    return option ? option.label : value;
  };

  // Helper functions for each field
  const getSexLabel = (value) => getLabelFromOptions(value, SEX_OPTIONS);
  const getMaritalStatusLabel = (value) => getLabelFromOptions(value, MARITAL_STATUS);
  const getOccupationLabel = (value) => getLabelFromOptions(value, OCCUPATION_OPTIONS);
  const getEducationLabel = (value) => getLabelFromOptions(value, EDUCATION_OPTIONS);
  const getReligionLabel = (value) => getLabelFromOptions(value, RELIGION_OPTIONS);
  const getFamilyTypeLabel = (value) => getLabelFromOptions(value, FAMILY_TYPE_OPTIONS);
  const getLocalityLabel = (value) => getLabelFromOptions(value, LOCALITY_OPTIONS);
  const getHeadRelationshipLabel = (value) => getLabelFromOptions(value, HEAD_RELATIONSHIP_OPTIONS);
  const getHeadEducationLabel = (value) => getLabelFromOptions(value, EDUCATION_OPTIONS);
  const getHeadOccupationLabel = (value) => getLabelFromOptions(value, OCCUPATION_OPTIONS);
  const getMobilityLabel = (value) => getLabelFromOptions(value, MOBILITY_OPTIONS);
  const getReferredByLabel = (value) => getLabelFromOptions(value, REFERRED_BY_OPTIONS);

  const [expandedCards, setExpandedCards] = useState({
    patient: false,
    clinical: false,
    adl: false,
    prescriptions: false,
    pastHistory: false,
  });

  // State to track which individual visits are expanded within each card
  const [expandedVisits, setExpandedVisits] = useState({});
  
  // State for past history cards
  const [expandedPastHistoryCards, setExpandedPastHistoryCards] = useState({
    patientDetails: false,
    intakeRecord: false,
  });

  // State to track which visit cards are expanded (visit-based structure)
  const [expandedVisitCards, setExpandedVisitCards] = useState({});
  
  // State to track which sections within each visit are expanded
  const [expandedVisitSections, setExpandedVisitSections] = useState({});


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

  // Shared HTML sanitiser used by ALL print functions.
  // Removes SVGs (no Tailwind sizing in print window → they become giant blocks),
  // UI controls, and empty icon-wrapper divs.
  const sanitizePrintHtml = (rawHtml, { stripButtons = true } = {}) => {
    if (!rawHtml) return '';
    const tmp = document.createElement('div');
    tmp.innerHTML = rawHtml;
    if (stripButtons) {
      tmp.querySelectorAll(
        '.no-print, [class*="no-print"], button, [role="button"], script, style'
      ).forEach(el => el.remove());
    }
    tmp.querySelectorAll('svg').forEach(el => el.remove());
    tmp.querySelectorAll('div, span').forEach(el => {
      if (!el.textContent.trim() && !el.querySelector('img')) el.remove();
    });
    tmp.querySelectorAll('*').forEach(el => {
      el.style.pageBreakBefore = 'auto';
      el.style.pageBreakAfter  = 'auto';
      el.style.breakBefore     = 'auto';
      el.style.breakAfter      = 'auto';
      el.style.minHeight       = '0';
    });
    return tmp.innerHTML.trim();
  };

  // Shared CSS injected into every individual print window.
  const SHARED_PRINT_CSS = `
    @page { size: A4; margin: 12mm 15mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 10pt; line-height: 1.5; color: #000; background: #fff; margin: 0; padding: 0; }
    body * { color: #000 !important; background: #fff !important; text-shadow: none !important; box-shadow: none !important; }
    svg, button, .no-print, [class*="no-print"], [role="button"] { display: none !important; }
    .print-header { display: flex; align-items: center; justify-content: center; gap: 14px; border-bottom: 2px solid #000; padding: 8px 0 12px; margin-bottom: 14px; }
    .print-header .logo { height: 64px; width: auto; object-fit: contain; }
    .print-header .header-text { text-align: center; flex: 1; }
    .print-header .header-text h1 { margin: 0; font-size: 13pt; font-weight: 700; text-transform: uppercase; }
    .print-header .header-text h2 { margin: 2px 0 0; font-size: 10pt; font-weight: 600; }
    .print-header .header-text p  { margin: 2px 0 0; font-size: 9pt; }
    .print-footer { margin-top: 14px; padding-top: 8px; border-top: 1px solid #000; font-size: 8.5pt; text-align: center; }
    .section-title { font-size: 11pt; font-weight: 700; text-transform: uppercase; border-bottom: 1px solid #000; padding-bottom: 4px; margin: 12px 0 8px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
    th, td { border: 1px solid #000 !important; padding: 5px 8px; text-align: left; vertical-align: top; font-size: 9.5pt; }
    th { background: #f0f0f0 !important; font-weight: 600; }
    .grid, [class*="grid-cols-"] { display: grid !important; grid-template-columns: repeat(3, minmax(0,1fr)) !important; gap: 8px !important; }
    [class*="col-span-"] { grid-column: auto !important; }
    :empty:not(img):not(br):not(hr) { display: none !important; }
  `;

  // Build a full print HTML document from cleaned section HTML.
  const buildPrintDoc = (title, cleanHtml, logoBase64, sectionLabel = '') => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>${SHARED_PRINT_CSS}</style>
</head>
<body>
  <div class="print-header">
    ${logoBase64 ? `<img src="${logoBase64}" alt="PGIMER Logo" class="logo" />` : ''}
    <div class="header-text">
      <h1>Postgraduate Institute of Medical Education &amp; Research</h1>
      <h2>Department of Psychiatry</h2>
      ${sectionLabel ? `<p>${sectionLabel}</p>` : ''}
    </div>
  </div>
  <div class="print-body">${cleanHtml}</div>
  <div class="print-footer">
    <p><strong>Generated:</strong> ${new Date().toLocaleString('en-IN', { year:'numeric', month:'long', day:'numeric', hour:'2-digit', minute:'2-digit' })}</p>
    <p>PGIMER – Department of Psychiatry | Electronic Medical Record System</p>
    <p>Computer-generated document — no signature required.</p>
  </div>
</body>
</html>`;

  // Shared helper to fetch the PGI logo as base64.
  const fetchLogoBase64 = async () => {
    try {
      const res  = await fetch(PGI_Logo);
      const blob = await res.blob();
      return await new Promise(resolve => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
    } catch { return ''; }
  };

  const handlePrintFromCard = (cardName, printHandler) => {
    if (expandedCards[cardName]) {
      printHandler();
      return;
    }

    setExpandedCards((prev) => ({
      ...prev,
      [cardName]: true,
    }));

    // Wait one render tick for the printable ref to mount.
    window.setTimeout(() => {
      printHandler();
    }, 250);
  };

  const handlePrintAllCards = async () => {
    if (!patient?.id) {
      toast.error('No patient loaded');
      return;
    }
    try {
      toast.info('Loading print report...');
      await openPatientReportPrint(patient.id);
      toast.success('Print dialog opened');
    } catch (err) {
      console.error('Print error:', err);
      toast.error(err?.message || 'Failed to print patient report');
    }
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

  // New functions for visit-based structure
  const toggleVisitCard = (visitId) => {
    const isCurrentlyExpanded = expandedVisitCards[visitId] === true;
    
    // Toggle the visit card
    setExpandedVisitCards(prev => ({
      ...prev,
      [visitId]: !prev[visitId]
    }));

    // If expanding the card, automatically expand all form sections
    if (!isCurrentlyExpanded) {
      // Find the visit to check which forms exist
      const visit = unifiedVisits.find(v => v.visitId === visitId);
      if (visit) {
        // Expand all sections that exist for this visit
        const sectionsToExpand = ['clinicalProforma']; // Always present
        if (visit.hasAdl) sectionsToExpand.push('adl');
        if (visit.hasPrescription) sectionsToExpand.push('prescription');
        
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
  const patientAdlFiles = adlData?.data?.adlFiles || adlData?.data?.files || [];

  // Fetch patient files for image preview (available for all roles including MWO)
  const { data: patientFilesData, refetch: refetchFiles } = useGetPatientFilesQuery(patient?.id, {
    skip: !patient?.id,
    refetchOnMountOrArgChange: true
  });
  const existingFiles = patientFilesData?.data?.files || [];
  
  // Debug logging for files
  useEffect(() => {
    if (patientFilesData) {
      console.log('[PatientDetailsView] Patient files data:', {
        patientFilesData,
        existingFiles,
        filesCount: existingFiles.length,
        patientId: patient?.id,
        sampleFile: existingFiles[0]
      });
    }
  }, [patientFilesData, existingFiles, patient?.id]);

 
  const patientProformas = Array.isArray(clinicalData?.data?.proformas)
    ? clinicalData.data.proformas
    : [];

  const clinicalProformaRows = useMemo(
    () => clinicalProformaRecordsOnly(patientProformas),
    [patientProformas]
  );

  // Debug: Log proformas to verify data is being fetched
  useEffect(() => {
    if (patientProformas.length > 0) {
      console.log('[PatientDetailsView] Patient proformas:', patientProformas.length, patientProformas.map(p => ({
        id: p.id,
        visit_date: p.visit_date,
        created_at: p.created_at,
        patient_id: p.patient_id
      })));
    }
  }, [patientProformas]);

  // Fetch patient visit history
  const { data: visitHistoryData } = useGetPatientVisitHistoryQuery(
    patient?.id,
    { skip: !patient?.id }
  );
  const visitHistory = visitHistoryData || [];

  // Get today's date string for filtering
  const todayDateString = toISTDateString(new Date());

  // For Past History card: show all proformas (including today's saved visits)
  // This ensures that newly created visits appear in Past History once they're saved
  // In view mode, we show all proformas since there's no "current visit being edited"
  const trulyPastProformas = useMemo(() => {
    return patientProformas.filter(proforma => {
      if (!proforma) return false;
      // Include all proformas in view mode (no current visit to exclude)
      return true;
    });
  }, [patientProformas]);

  // Get the first visit proforma (Walk-In Clinical Proforma) - only from the initial first visit
  // This should be static and not change based on follow-up visits
  const lastVisitProforma = useMemo(() => {
    if (patientProformas.length === 0) return null;
    
    // Filter to only get first visit proformas (not follow-ups)
    // Exclude minimal proformas and follow-up visits
    const firstVisitProformas = patientProformas.filter(proforma => {
      // Exclude follow-up visit records
      if (proforma.record_type === 'followup_visit') {
        return false;
      }
      
      // Only include first visit proformas
      if (proforma.visit_type !== 'first_visit') {
        return false;
      }
      
      // Exclude minimal proformas created for prescription linking
      if (proforma.record_type === 'clinical_proforma' && 
          proforma.visit_type === 'follow_up') {
        const isMinimalProforma = proforma.treatment_prescribed?.includes('Follow-up visit') ||
                                  proforma.treatment_prescribed?.includes('followup_visits') ||
                                  proforma.treatment_prescribed?.includes('see followup_visits');
        if (isMinimalProforma) {
          return false;
        }
      }
      
      return true;
    });
    
    if (firstVisitProformas.length === 0) return null;
    
    // Sort by visit_date or created_at, oldest first (to get the very first visit)
    const sorted = [...firstVisitProformas].sort((a, b) => {
      const dateA = new Date(a.visit_date || a.created_at || 0);
      const dateB = new Date(b.visit_date || b.created_at || 0);
      return dateA - dateB; // Oldest first (first visit)
    });
    
    return sorted[0]; // Return the first visit (oldest)
  }, [patientProformas]);

 
  const proformaIds = useMemo(() => {
    const ids = clinicalProformaRows.map((p) => p?.id).filter(Boolean).slice(0, 10);
    // Pad to exactly 10 elements with null to ensure consistent hook calls
    while (ids.length < 10) {
      ids.push(null);
    }
    return ids;
  }, [clinicalProformaRows]);

  
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

  // Fetch ALL prescriptions by patient_id (includes prescriptions without clinical_proforma_id)
  const { data: patientPrescriptionsData } = useGetPrescriptionsByPatientIdQuery(
    patient?.id, 
    { skip: !patient?.id }
  );

  // Clinical options for checkbox label resolution in Clinical Proforma print
  const { data: allClinicalOptionsData } = useGetAllClinicalOptionsQuery();
  const clinicalOptions = allClinicalOptionsData || {};

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
    const addedIds = new Set(); // Track added prescription IDs to avoid duplicates
    
    // First, add prescriptions from patient-level query (includes those without proforma)
    const patientPrescriptions = patientPrescriptionsData?.data?.prescriptions || [];
    patientPrescriptions.forEach(prescRecord => {
      if (prescRecord.prescription && Array.isArray(prescRecord.prescription)) {
        prescRecord.prescription.forEach(prescription => {
          const uniqueKey = `${prescRecord.id}-${prescription.id || prescription.medicine}`;
          if (!addedIds.has(uniqueKey)) {
            addedIds.add(uniqueKey);
            prescriptions.push({
              ...prescription,
              prescription_record_id: prescRecord.id,
              proforma_id: prescRecord.clinical_proforma_id,
              visit_date: prescRecord.visit_date || prescRecord.created_at,
              visit_type: prescRecord.visit_type,
              created_at: prescRecord.created_at
            });
          }
        });
      }
    });
    
    // Then add prescriptions from proforma queries (fallback for any missed)
    prescriptionResults.forEach((result, index) => {
      const proformaId = proformaIds[index];
      if (proformaId && result.data?.data?.prescription?.prescription) {
        const proforma = clinicalProformaRows.find((p) => p.id === proformaId);
        const prescriptionData = result.data.data.prescription;
        prescriptionData.prescription.forEach(prescription => {
          const uniqueKey = `${prescriptionData.id}-${prescription.id || prescription.medicine}`;
          if (!addedIds.has(uniqueKey)) {
            addedIds.add(uniqueKey);
          prescriptions.push({
            ...prescription,
              prescription_record_id: prescriptionData.id,
            proforma_id: proformaId,
            visit_date: proforma?.visit_date || proforma?.created_at,
            visit_type: proforma?.visit_type
          });
          }
        });
      }
    });
    
    // Sort by visit date/created_at (most recent first)
    return prescriptions.sort((a, b) => {
      const dateA = new Date(a.visit_date || a.created_at || 0);
      const dateB = new Date(b.visit_date || b.created_at || 0);
      return dateB - dateA;
    });
  }, [prescriptionResults, clinicalProformaRows, proformaIds, patientPrescriptionsData]);

  // Group prescriptions by visit date (keep for backward compatibility if needed)
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

  // Create unified visit structure: group proformas, ADL files, and prescriptions by visit
  const unifiedVisits = useMemo(() => {
    // Filter out minimal clinical proformas created for follow-up prescription linking
    // These are identified by: visit_type='follow_up' AND treatment_prescribed contains 'Follow-up visit'
    // AND record_type='clinical_proforma' (not 'followup_visit')
    const filteredProformas = trulyPastProformas.filter(proforma => {
      // Keep follow-up visit records (from followup_visits table)
      if (proforma.record_type === 'followup_visit') {
        return true;
      }
      // Filter out minimal clinical proformas created for follow-up prescription linking
      // These are identified by: visit_type='follow_up' AND treatment_prescribed contains 'Follow-up visit' or 'followup_visits'
      // AND record_type='clinical_proforma' (not 'followup_visit')
      // Also check if there's a corresponding follow-up visit for the same date - if so, exclude the minimal proforma
      if (proforma.record_type === 'clinical_proforma' && 
          proforma.visit_type === 'follow_up') {
        // Check if this is a minimal proforma (has treatment_prescribed mentioning follow-up)
        const isMinimalProforma = proforma.treatment_prescribed?.includes('Follow-up visit') ||
                                  proforma.treatment_prescribed?.includes('followup_visits') ||
                                  proforma.treatment_prescribed?.includes('see followup_visits');
        
        // Also check if there's a corresponding follow-up visit record for the same date
        const hasCorrespondingFollowUp = trulyPastProformas.some(p => 
          p.record_type === 'followup_visit' &&
          p.visit_date === proforma.visit_date
        );
        
        // Exclude if it's a minimal proforma OR if there's a corresponding follow-up visit
        if (isMinimalProforma || hasCorrespondingFollowUp) {
          // This is a minimal proforma created for prescription linking - exclude it
          // The actual follow-up visit will be shown separately
          return false;
        }
      }
      // Keep all other clinical proformas (regular visits)
      return true;
    });

    // Sort proformas chronologically (newest first - latest visit at top)
    const sortedProformas = [...filteredProformas].sort((a, b) => {
      const dateA = new Date(a.visit_date || a.created_at || 0);
      const dateB = new Date(b.visit_date || b.created_at || 0);
      return dateB - dateA; // Newest first (latest visit at top)
    });

    // Track which prescription records have been associated with visits
    const usedPrescriptionRecordIds = new Set();

    const findAdlForVisit = (visitProforma, visitId, isFollowUpVisit) => {
      if (isFollowUpVisit || !patientAdlFiles.length) return null;
      const byClinical = patientAdlFiles.find(
        (adl) =>
          adl.clinical_proforma_id != null &&
          String(adl.clinical_proforma_id) === String(visitId)
      );
      if (byClinical) return byClinical;
      const linkedAdlId = visitProforma?.adl_file_id;
      if (linkedAdlId != null && linkedAdlId !== '' && linkedAdlId !== 0) {
        return patientAdlFiles.find((adl) => String(adl.id) === String(linkedAdlId)) || null;
      }
      return null;
    };

    // Create visit objects with all associated forms
    const proformaVisits = sortedProformas.map((proforma) => {
      // Handle follow-up visits (record_type === 'followup_visit')
      const isFollowUp = proforma.record_type === 'followup_visit';
      const visitId = isFollowUp ? proforma.followup_id : proforma.id;
      const visitDate = proforma.visit_date || proforma.created_at;
      
      // Find associated ADL file (only for regular clinical proformas, not follow-ups)
      const adlFile = !isFollowUp ? findAdlForVisit(proforma, visitId, isFollowUp) : null;
      
      // Find associated prescription
      // For follow-ups, we need to find prescription by clinical_proforma_id if it exists
      // For regular proformas, use the existing logic
      let prescription = null;
      let followUpProforma = null; // Declare outside if block for use in minimalProformaId
      
      if (isFollowUp) {
        // For follow-ups, try to find prescription by matching visit date
        // Follow-ups might have a minimal clinical proforma created for prescription linking
        // Look for a clinical proforma with the same visit_date and visit_type='follow_up'
        // that was created for prescription linking (has treatment_prescribed mentioning follow-up)
        followUpProforma = patientProformas.find(p => {
          if (p.record_type === 'followup_visit') return false; // Skip the follow-up visit record itself
          const proformaDate = toISTDateString(p.visit_date || p.created_at);
          const followUpDate = toISTDateString(visitDate);
          return proformaDate === followUpDate && 
                 p.visit_type === 'follow_up' &&
                 p.record_type === 'clinical_proforma' &&
                 (p.treatment_prescribed?.includes('Follow-up visit') || 
                  p.treatment_prescribed?.includes('followup_visits') ||
                  p.treatment_prescribed?.includes('see followup_visits'));
        });
        if (followUpProforma && followUpProforma.id) {
          // Try to find prescription in the prescriptionResults array
          const prescriptionResult = prescriptionResults.find((result, idx) => {
            return proformaIds[idx] === followUpProforma.id && result.data?.data?.prescription?.prescription;
          });
          prescription = prescriptionResult?.data?.data?.prescription?.prescription || null;
          
          // If not found in prescriptionResults, try fetching directly (fallback)
          // This handles cases where the minimal proforma might not be in the first 10 proformas
          if (!prescription && followUpProforma.id) {
            // The prescription should be linked to this minimal proforma's ID
            // We'll rely on the PrescriptionView component to fetch it if needed
          }
        }
      } else {
      const prescriptionResult = prescriptionResults.find((result, idx) => {
        return proformaIds[idx] === visitId && result.data?.data?.prescription?.prescription;
      });
        prescription = prescriptionResult?.data?.data?.prescription?.prescription || null;
      }

      // Store the minimal clinical proforma ID for follow-up visits (for PrescriptionView to fetch directly)
      const minimalProformaId = isFollowUp && followUpProforma ? followUpProforma.id : null;

      // Also check patient-level prescriptions (includes those without proforma)
      if (!prescription && allPrescriptions.length > 0) {
        // Find prescriptions that match this visit date or proforma ID
        const visitDateStr = toISTDateString(visitDate);
        const matchingPrescriptions = allPrescriptions.filter(p => {
          const prescDateStr = toISTDateString(p.visit_date || p.created_at);
          return prescDateStr === visitDateStr || p.proforma_id === visitId;
        });
        if (matchingPrescriptions.length > 0) {
          prescription = matchingPrescriptions;
          // Mark these prescription records as used
          matchingPrescriptions.forEach(p => {
            if (p.prescription_record_id) usedPrescriptionRecordIds.add(p.prescription_record_id);
          });
        }
      }
      
      // Also mark prescriptions with matching proforma_id as used
      allPrescriptions.forEach(p => {
        if (p.proforma_id === visitId && p.prescription_record_id) {
          usedPrescriptionRecordIds.add(p.prescription_record_id);
        }
      });

      // Check if there are any prescriptions for this visit (by proforma_id OR by date)
      const visitDateStr = toISTDateString(visitDate);
      const hasPrescriptionByDate = allPrescriptions.some(p => {
        const prescDateStr = toISTDateString(p.visit_date || p.created_at);
        return prescDateStr === visitDateStr || p.proforma_id === visitId;
      });

      return {
        visitId,
        visitDate,
        proforma,
        adlFile: adlFile || null,
        prescription: prescription || null,
        hasAdl: !!adlFile,
        hasPrescription: !!prescription || !!minimalProformaId || hasPrescriptionByDate, // Mark as having prescription if any exists (by proforma OR by date)
        isFollowUp: isFollowUp, // Flag to identify follow-up visits
        clinicalAssessment: isFollowUp ? proforma.clinical_assessment : null, // Follow-up assessment
        minimalProformaId: minimalProformaId, // Store minimal proforma ID for PrescriptionView
        isStandalonePrescription: false, // Not a standalone prescription
      };
    });
    
    // Create visit entries for standalone prescriptions (those without an associated proforma)
    // Group standalone prescriptions by date
    const standalonePrescriptionsByDate = {};
    allPrescriptions.forEach(p => {
      // Skip if this prescription record is already used in a proforma visit
      if (p.prescription_record_id && usedPrescriptionRecordIds.has(p.prescription_record_id)) {
        return;
      }
      // Skip if it has a proforma_id (it should be linked to a proforma visit)
      if (p.proforma_id) {
        return;
      }
      
      const dateStr = toISTDateString(p.visit_date || p.created_at);
      if (!standalonePrescriptionsByDate[dateStr]) {
        standalonePrescriptionsByDate[dateStr] = [];
      }
      standalonePrescriptionsByDate[dateStr].push(p);
    });
    
    // Create standalone prescription visits
    const standalonePrescriptionVisits = Object.entries(standalonePrescriptionsByDate).map(([dateStr, prescriptions]) => {
      const firstPrescription = prescriptions[0];
      return {
        visitId: `standalone-prescription-${dateStr}`,
        visitDate: firstPrescription.visit_date || firstPrescription.created_at,
        proforma: null, // No proforma
        adlFile: null,
        prescription: prescriptions, // Array of prescription items
        hasAdl: false,
        hasPrescription: true,
        isFollowUp: false,
        clinicalAssessment: null,
        minimalProformaId: null,
        isStandalonePrescription: true, // Flag to identify standalone prescription visits
      };
    });

    // When ADL is not linked by clinical_proforma_id / proforma.adl_file_id, attach by same
    // calendar day as the walk-in visit (IST). Each ADL attaches to at most one visit.
    const assignedAdlIds = new Set(
      proformaVisits
        .map((v) => v.adlFile?.id)
        .filter((id) => id != null && id !== '')
        .map((id) => String(id))
    );
    const proformaVisitsWithDateAdl = proformaVisits.map((visit) => {
      if (visit.isFollowUp || visit.adlFile || !visit.proforma) return visit;
      const visitDay = toISTDateString(visit.visitDate);
      if (!visitDay) return visit;
      const adl = patientAdlFiles.find((a) => {
        if (assignedAdlIds.has(String(a.id))) return false;
        const adlDay = toISTDateString(a.file_created_date || a.created_at);
        return adlDay && adlDay === visitDay;
      });
      if (!adl) return visit;
      assignedAdlIds.add(String(adl.id));
      return { ...visit, adlFile: adl, hasAdl: true };
    });
    
    // Combine proforma visits and standalone prescription visits, sort by date (newest first)
    const allVisits = [...proformaVisitsWithDateAdl, ...standalonePrescriptionVisits].sort((a, b) => {
      const dateA = new Date(a.visitDate || 0);
      const dateB = new Date(b.visitDate || 0);
      return dateB - dateA;
    });
    
    return allVisits;
  }, [trulyPastProformas, patientAdlFiles, prescriptionResults, proformaIds, patientProformas, allPrescriptions]);

  /** Past History (view): follow-up visits only, grouped by IST calendar date */
  const pastHistoryFollowUpDays = useMemo(() => {
    const byDate = {};
    trulyPastProformas.forEach((row) => {
      if (row.record_type !== 'followup_visit') return;
      const visitDate = row.visit_date || row.created_at;
      if (!visitDate) return;
      const dateKey = toISTDateString(visitDate);
      if (!dateKey) return;
      if (!byDate[dateKey]) byDate[dateKey] = [];
      const fid = row.followup_id ?? row.id;
      byDate[dateKey].push({
        visitId: `followup-${fid}`,
        visitDate,
        followUp: row,
      });
    });
    return Object.entries(byDate)
      .map(([date, visits]) => ({
        visitDate: date,
        visits: [...visits].sort(
          (a, b) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime()
        ),
      }))
      .sort((a, b) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime());
  }, [trulyPastProformas]);

  const pastHistoryFollowUpCount = useMemo(
    () => trulyPastProformas.filter((p) => p.record_type === 'followup_visit').length,
    [trulyPastProformas]
  );

  // Print functionality refs
  const patientDetailsPrintRef = useRef(null);
  const clinicalProformaPrintRef = useRef(null);
  const adlPrintRef = useRef(null);
  const prescriptionPrintRef = useRef(null);
  
  // Past History print refs
  const pastHistoryPatientDetailsPrintRef = useRef(null);
  const pastHistoryClinicalProformaPrintRef = useRef(null);
  const pastHistoryADLPrintRef = useRef(null);
  const pastHistoryPrescriptionPrintRef = useRef(null);
  // Visit-based print refs (using Map to store refs for each visit)
  const visitPrintRefs = useRef(new Map());

  const printSectionFromApi = async (section) => {
    if (!patient?.id) {
      toast.error('No patient loaded');
      return;
    }
    try {
      toast.info('Loading print report...');
      await openPatientReportSectionPrint(patient.id, section);
      toast.success('Print dialog opened');
    } catch (err) {
      console.error('Print error:', err);
      toast.error(err?.message || 'Failed to print patient report');
    }
  };

  const handlePrintPatientDetails = () => printSectionFromApi('patient-details');
  const handlePrintClinicalProforma = () => printSectionFromApi('clinical-proforma');
  const handlePrintADL = () => printSectionFromApi('adl');
  const handlePrintPrescription = () => printSectionFromApi('prescription');

  const adultPatientForPrescriptionPrint = useMemo(() => {
    const fromApi = mapApiPatientForPrint(patientPrescriptionsData?.data?.patient);
    if (fromApi?.name) return fromApi;
    return mapAdultPatientForPrint({
      name: displayData?.name,
      cr_no: displayData?.cr_no,
      psy_no: displayData?.psy_no,
      age: displayData?.age,
      sex: displayData?.sex,
      contact_number: displayData?.contact_number,
      assigned_doctor_name: displayData?.assigned_doctor_name,
      assigned_doctor_role: displayData?.assigned_doctor_role,
      assigned_room: displayData?.assigned_room,
    });
  }, [patientPrescriptionsData, displayData]);

  // Export patient details to Excel (backend API)
  const handleExportPatient = async () => {
    if (!patient?.id) {
      toast.error('No patient data available to export');
      return;
    }
    try {
      toast.info('Generating Excel report...');
      await downloadPatientReportExcel(patient.id);
      toast.success('Patient report exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error(error?.message || 'Failed to export patient report');
    }
  };

  // Print handlers for Past History cards
  const handlePrintPastHistoryPatientDetails = async () => {
    // Ensure card is expanded first
    if (!expandedPastHistoryCards.patientDetails) {
      togglePastHistoryCard('patientDetails');
      // Wait a bit for the DOM to update
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    if (!pastHistoryPatientDetailsPrintRef.current) {
      toast.error('Please expand the Patient Details section first');
      console.error('Print ref not available for Patient Details');
      return;
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
        toast.error('Please allow pop-ups to print this section');
        return;
      }

      const sectionElement = pastHistoryPatientDetailsPrintRef.current;
      const printContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Patient Details - Past History</title>
            <style>
              @page { margin: 20mm; size: A4; }
              body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
              .header { text-align: center; margin-bottom: 30px; }
              .logo { max-width: 100px; height: auto; }
              h1 { color: #1e40af; margin: 10px 0; }
              .section { margin-bottom: 30px; }
              .field { margin-bottom: 15px; }
              .label { font-weight: bold; color: #374151; font-size: 12pt; }
              .value { color: #1f2937; font-size: 11pt; margin-top: 5px; }
              button, .no-print { display: none !important; }
              svg { display: none !important; }
              @media print {
                body { padding: 0; }
                .section { page-break-inside: avoid; }
              }
            </style>
          </head>
          <body>
            <div class="header">
              ${logoBase64 ? `<img src="${logoBase64}" alt="Logo" class="logo" />` : ''}
              <h1>Patient Details - Past History</h1>
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
      toast.error('Failed to print Patient Details. Please try again.');
    }
  };

  const handlePrintPastHistoryClinicalProforma = async () => {
    // Ensure card is expanded first
    if (!expandedPastHistoryCards.clinicalProforma) {
      togglePastHistoryCard('clinicalProforma');
      // Wait a bit for the DOM to update
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    if (!pastHistoryClinicalProformaPrintRef.current) {
      toast.error('Please expand the Walk-in Clinical Proforma section first');
      console.error('Print ref not available for Clinical Proforma');
      return;
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
        toast.error('Please allow pop-ups to print this section');
        return;
      }

      const sectionElement = pastHistoryClinicalProformaPrintRef.current;
      const printContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Walk-in Clinical Proforma - Past History</title>
            <style>
              @page { margin: 20mm; size: A4; }
              body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
              .header { text-align: center; margin-bottom: 30px; }
              .logo { max-width: 100px; height: auto; }
              h1 { color: #059669; margin: 10px 0; }
              .section { margin-bottom: 30px; }
              button, .no-print { display: none !important; }
              svg { display: none !important; }
              @media print {
                body { padding: 0; }
                .section { page-break-inside: avoid; }
              }
            </style>
          </head>
          <body>
            <div class="header">
              ${logoBase64 ? `<img src="${logoBase64}" alt="Logo" class="logo" />` : ''}
              <h1>Walk-in Clinical Proforma - Past History</h1>
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
      toast.error('Failed to print Walk-in Clinical Proforma. Please try again.');
    }
  };

  const handlePrintPastHistoryADL = () => {
    const adlFile = patientAdlFiles[0];
    if (!adlFile) { toast.error('No intake record found'); return; }
    const printWindow = window.open('', '_blank');
    if (!printWindow) { toast.error('Please allow pop-ups to print this section'); return; }
    printWindow.document.write(generateAdlIntakePrintHtml(adlFile, patient));
    printWindow.document.close();
    printWindow.onload = () => setTimeout(() => { printWindow.print(); toast.success('Print dialog opened'); }, 400);
  };

  // Print handler for unified visit cards
  const handlePrintVisit = async (visitId, visitDate) => {
    // Find the visit data
    const visit = unifiedVisits.find(v => v.visitId === visitId);
    if (!visit) {
      toast.error('Visit not found');
      return;
    }

    // Ensure visit card is expanded first
    if (!isVisitCardExpanded(visitId)) {
      toggleVisitCard(visitId);
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    // Expand all sections for this visit to ensure they're in the DOM
    // Use setState directly to ensure all sections are expanded
    const sectionsToExpand = ['clinicalProforma'];
    if (visit.hasAdl) sectionsToExpand.push('adl');
    if (visit.hasPrescription) sectionsToExpand.push('prescription');
    
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
        const hasClinicalContent =
          visitPrintRef.querySelector('.walk-in-clinical-proforma-summary') ||
          (visitPrintRef.querySelector('div.mt-3') &&
            (visitPrintRef.textContent.includes('Visit date') ||
              visitPrintRef.textContent.includes('Visit Type') ||
              visitPrintRef.textContent.includes('Room No') ||
              visitPrintRef.querySelector('[class*="ClinicalProforma"]') ||
              visitPrintRef.querySelector('table') ||
              visitPrintRef.querySelector('div[class*="grid"]')));
        
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
      // These contain the actual form content (WalkInClinicalProformaSummaryView, ViewADL, etc.)
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

      // Remove all SVG icons — Tailwind sizing classes don't apply in the print window
      // causing them to render as large blank rectangles.
      clonedElement.querySelectorAll('svg').forEach(svg => svg.remove());
      // Remove empty icon-wrapper divs left behind after SVG removal.
      clonedElement.querySelectorAll('div').forEach(el => {
        if (!el.textContent.trim() && !el.querySelector('img')) el.remove();
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

      // Transform checkbox/radio groups to compact format with horizontal wrapping
      // Find all checkbox/radio groups and make them display in flex with wrapping
      const checkboxGroups = clonedElement.querySelectorAll('div.flex.flex-wrap, div[class*="flex-wrap"], div[class*="space-y"]');
      checkboxGroups.forEach(group => {
        const hasCheckboxes = group.querySelector('input[type="checkbox"], input[type="radio"]');
        if (hasCheckboxes) {
          group.style.display = 'flex';
          group.style.flexWrap = 'wrap';
          group.style.gap = '6px 12px';
          group.style.marginBottom = '8px';
          group.style.alignItems = 'flex-start';
        }
      });

      // Find all labels with checkboxes/radios and make them compact
      const checkboxLabels = clonedElement.querySelectorAll('label:has(input[type="checkbox"]), label:has(input[type="radio"])');
      checkboxLabels.forEach(label => {
        const input = label.querySelector('input[type="checkbox"], input[type="radio"]');
        if (input && !input.checked) {
          // Hide unchecked items
          label.style.display = 'none';
        } else if (input && input.checked) {
          // Style checked items compactly - inline-flex for horizontal layout
          label.style.display = 'inline-flex';
          label.style.alignItems = 'center';
          label.style.margin = '0';
          label.style.padding = '3px 6px';
          label.style.fontSize = '9pt';
          label.style.background = 'transparent';
          label.style.border = '1px solid #000';
          label.style.borderRadius = '0';
          label.style.fontWeight = '500';
          label.style.whiteSpace = 'nowrap';
          label.style.flexShrink = '0';
          if (input.type === 'checkbox' || input.type === 'radio') {
            input.style.width = '12px';
            input.style.height = '12px';
            input.style.marginRight = '6px';
            input.style.marginBottom = '0';
            input.style.flexShrink = '0';
          }
        }
      });

      // Also handle space-y containers that might have checkboxes
      const spaceYContainers = clonedElement.querySelectorAll('.space-y-2, .space-y-3, .space-y-4');
      spaceYContainers.forEach(container => {
        const hasCheckboxes = container.querySelector('input[type="checkbox"], input[type="radio"]');
        if (hasCheckboxes) {
          container.style.display = 'flex';
          container.style.flexWrap = 'wrap';
          container.style.gap = '6px 12px';
          container.style.alignItems = 'flex-start';
        }
      });

      // Handle form field groups - allow 2-3 columns for regular form fields
      const formFieldGroups = clonedElement.querySelectorAll('.grid, [class*="grid-cols"]');
      formFieldGroups.forEach(group => {
        // Don't modify if it already has checkboxes/radios (handled above)
        const hasCheckboxes = group.querySelector('input[type="checkbox"], input[type="radio"]');
        if (!hasCheckboxes) {
          // Check if it's a form field group (has inputs, selects, textareas)
          const hasFormFields = group.querySelector('input:not([type="checkbox"]):not([type="radio"]), select, textarea');
          if (hasFormFields) {
            // Allow 2-3 columns based on content
            const fieldCount = group.querySelectorAll('input:not([type="checkbox"]):not([type="radio"]), select, textarea').length;
            if (fieldCount <= 2) {
              group.style.gridTemplateColumns = 'repeat(2, 1fr)';
            } else {
              group.style.gridTemplateColumns = 'repeat(3, 1fr)';
            }
            group.style.gap = '8px 12px';
          }
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
                  color: #000;
                }
                @bottom-right {
                  content: "Page " counter(page) " of " counter(pages);
                  font-size: 9pt;
                  color: #000;
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
                color: #000;
                background: #fff;
              }
              .print-header { 
                text-align: center; 
                margin-bottom: 20px;
                padding-bottom: 12px;
                border-bottom: 2px solid #000;
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
                color: #000;
                margin: 5px 0;
                letter-spacing: 0.5px;
              }
              .document-title {
                font-size: 14pt;
                font-weight: 600;
                color: #000;
                margin-top: 5px;
              }
              .patient-info-box {
                background: transparent;
                border: 1px solid #000;
                border-radius: 0;
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
                color: #000;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-bottom: 3px;
              }
              .patient-info-value {
                font-size: 10pt;
                color: #000;
                font-weight: 600;
              }
              .visit-header { 
                background: transparent;
                color: #000;
                padding: 10px 15px; 
                border: 1px solid #000;
                border-radius: 0;
                margin-bottom: 20px;
                box-shadow: none;
                page-break-after: avoid;
              }
              .visit-header p {
                margin: 0;
                font-size: 11pt;
                font-weight: 600;
                color: #000;
              }
              .form-section {
                margin-bottom: 25px;
                page-break-inside: avoid;
                border: 1px solid #000;
                border-radius: 0;
                padding: 18px;
                background: transparent;
                box-shadow: none;
              }
              .form-section-title {
                font-size: 13pt;
                font-weight: bold;
                margin-bottom: 12px;
                padding-bottom: 8px;
                border-bottom: 2px solid #000;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                color: #000;
              }
              .form-section.clinical-proforma .form-section-title {
                color: #000;
                border-bottom-color: #000;
              }
              .form-section.adl .form-section-title {
                color: #000;
                border-bottom-color: #000;
              }
              .form-section.prescription .form-section-title {
                color: #000;
                border-bottom-color: #000;
              }
              h2 { 
                color: #000; 
                margin: 18px 0 10px 0; 
                border-bottom: 1px solid #000; 
                padding-bottom: 6px;
                font-size: 12pt;
                font-weight: bold;
                page-break-after: avoid;
              }
              h3 { 
                color: #000; 
                margin: 14px 0 8px 0;
                font-size: 11pt;
                font-weight: 600;
                page-break-after: avoid;
              }
              h4 { 
                color: #000; 
                margin: 12px 0 6px 0;
                font-size: 10.5pt;
                font-weight: 600;
              }
              h5 {
                font-size: 10.5pt;
                margin: 10px 0 5px 0;
                font-weight: 600;
                color: #000;
              }
              .field-group {
                margin-bottom: 12px;
                padding: 8px;
                background: transparent;
                border-left: 2px solid #000;
                page-break-inside: avoid;
              }
              .field-label {
                font-weight: 600;
                color: #000;
                font-size: 9pt;
                text-transform: uppercase;
                letter-spacing: 0.3px;
                margin-bottom: 4px;
              }
              .field-value {
                color: #000;
                font-size: 10pt;
                line-height: 1.5;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin: 12px 0;
                font-size: 9.5pt;
                page-break-inside: avoid;
                box-shadow: none;
              }
              table td, table th {
                padding: 10px 12px;
                border: 1px solid #000;
                text-align: left;
                vertical-align: top;
              }
              table th {
                background: transparent;
                font-weight: bold;
                color: #000;
                font-size: 9.5pt;
                text-transform: uppercase;
                letter-spacing: 0.3px;
                border-bottom: 2px solid #000;
              }
              table tr:nth-child(even) {
                background-color: transparent;
              }
              table tr:hover {
                background-color: transparent;
              }
              .section { 
                margin-bottom: 20px; 
                page-break-inside: avoid; 
              }
              .border-l-4 {
                border-left: 2px solid #000 !important;
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
                background: transparent !important;
                color: #000 !important;
                border: 1px solid #000 !important;
                padding: 6px 10px !important;
                border-radius: 0 !important;
                font-size: 10pt !important;
              }
              /* Compact checkbox/radio button groups - horizontal layout with wrapping */
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
              /* Checkbox/radio groups container - flex with wrapping for horizontal layout */
              .flex.flex-wrap, 
              [class*="flex-wrap"],
              .space-y-2:has(input[type="checkbox"]),
              .space-y-2:has(input[type="radio"]),
              .space-y-3:has(input[type="checkbox"]),
              .space-y-3:has(input[type="radio"]),
              .space-y-4:has(input[type="checkbox"]),
              .space-y-4:has(input[type="radio"]) {
                display: flex !important;
                flex-wrap: wrap !important;
                gap: 6px 12px !important;
                margin-bottom: 8px !important;
                align-items: flex-start !important;
                page-break-inside: avoid !important;
              }
              /* Hide unchecked checkboxes/radios in print - only show checked ones */
              input[type="checkbox"]:not(:checked),
              input[type="radio"]:not(:checked) {
                display: none !important;
              }
              /* Style checked items - compact display in horizontal row */
              label:has(input[type="checkbox"]:checked),
              label:has(input[type="radio"]:checked) {
                display: inline-flex !important;
                align-items: center !important;
                margin: 0 !important;
                padding: 3px 6px !important;
                font-size: 9pt !important;
                line-height: 1.2 !important;
                background: transparent !important;
                border: 1px solid #000 !important;
                border-radius: 0 !important;
                font-weight: 500 !important;
                white-space: nowrap !important;
                flex-shrink: 0 !important;
                page-break-inside: avoid !important;
              }
              /* Hide labels with unchecked inputs */
              label:has(input[type="checkbox"]:not(:checked)),
              label:has(input[type="radio"]:not(:checked)) {
                display: none !important;
              }
              /* Form field groups - allow 2-3 columns */
              .grid:has(input:not([type="checkbox"]):not([type="radio"])),
              .grid:has(select),
              .grid:has(textarea),
              [class*="grid-cols"]:has(input:not([type="checkbox"]):not([type="radio"])),
              [class*="grid-cols"]:has(select),
              [class*="grid-cols"]:has(textarea) {
                display: grid !important;
                gap: 8px 12px !important;
              }
              /* Default to 2 columns for form fields, 3 if more content */
              .grid:has(input:not([type="checkbox"]):not([type="radio"])),
              .grid:has(select),
              .grid:has(textarea) {
                grid-template-columns: repeat(2, 1fr) !important;
              }
              /* 3 columns for larger groups */
              .grid.grid-cols-3,
              [class*="grid-cols-3"] {
                grid-template-columns: repeat(3, 1fr) !important;
              }
              .grid.grid-cols-4,
              [class*="grid-cols-4"] {
                grid-template-columns: repeat(3, 1fr) !important;
              }
              button, .no-print, [class*="no-print"], nav, header, aside, 
              [class*="Button"], [class*="chevron"], [class*="Chevron"], 
              [class*="Printer"], [role="button"], input[type="button"],
              input[type="submit"], .cursor-pointer:not(.print-keep),
              svg[class*="chevron"], svg[class*="Chevron"] {
                display: none !important;
              }
              svg { display: none !important; }
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
                * {
                  background: transparent !important;
                  background-color: transparent !important;
                }
                body {
                  background: #fff !important;
                }
                .form-section {
                  page-break-inside: avoid;
                  margin-bottom: 15px;
                  border: 1px solid #000;
                  background: transparent !important;
                }
                .section { 
                  page-break-inside: avoid; 
                }
                .patient-info-box {
                  page-break-after: avoid;
                  background: transparent !important;
                }
                .visit-header {
                  page-break-after: avoid;
                  background: transparent !important;
                }
                table th {
                  background: transparent !important;
                }
                table tr {
                  background: transparent !important;
                }
                @page {
                  margin: 12mm 10mm 12mm 15mm;
                }
                a {
                  color: #000;
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

  const handlePrintPastHistoryPrescription = () => {
    const records = patientPrescriptionsData?.data?.prescriptions || [];
    if (!records.length && !allPrescriptions.length) {
      toast.error('No prescriptions to print');
      return;
    }
    printPatientPrescriptions(adultPatientForPrescriptionPrint, records, {
      flatMedications: allPrescriptions,
      formatDate,
    });
  };

  // Note: canViewPrescriptions is now determined by filled_by_role above

  return (
    <ReadOnlyToneProvider tone="neutral">
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button variant="outline" className="no-print" onClick={handlePrintAllCards}>
          <FiPrinter className="h-4 w-4 mr-2" />
          Print All Cards
        </Button>
      </div>
      {/* Card 1: Patient Details */}
        <Card variant="solid">
        <div
            className="flex items-center justify-between p-6 border-b border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <div 
              className="flex items-center gap-4 cursor-pointer flex-1"
          onClick={() => toggleCard('patient')}
        >
              <div className={VIEW_SECTION_ICON.patient}>
              <FiUser className="h-6 w-6 text-slate-700" />
            </div>
            <div>
                <h3 className="text-xl font-bold text-gray-900">Patient Details</h3>
                <p className="text-sm text-gray-500 mt-1">{patient?.name || 'New Patient'} - {patient?.cr_no || 'N/A'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="no-print"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrintFromCard('patient', handlePrintPatientDetails);
                }}
              >
                <FiPrinter className="h-4 w-4 mr-1" />
                Print
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
              {/* Out Patient Card — read-only tiles (sidebar / total patients view style) */}
              <PatientDetailCardShell>
                <div className="px-5 pt-5">
                  <PatientDetailSectionTitle>Out Patient Card</PatientDetailSectionTitle>
                </div>
                <div className="space-y-4 px-5 pb-5">
                  <PatientDetailFieldGroup>
                    <PatientDetailField label="CR No." value={displayData.cr_no} />
                    <PatientDetailField
                      label="Date"
                      value={displayData.date ? formatDate(displayData.date) : ''}
                    />
                    <PatientDetailField label="Name" value={displayData.name} />
                    <PatientDetailField label="Mobile No." value={displayData.contact_number} />
                    <PatientDetailField label="Age" value={displayData.age} />
                    <PatientDetailField label="Sex" value={getSexLabel(displayData.sex)} />
                    {userRole && !isMWO(userRole) && (
                      <PatientDetailField label="Category" value={displayData.category} />
                    )}
                    <PatientDetailField label="Father's Name" value={displayData.father_name} />
                    <PatientDetailField label="Department" value={displayData.department} />
                    {userRole && !isMWO(userRole) && (
                      <>
                        <PatientDetailField label="Unit/Consit" value={displayData.unit_consit} />
                        <PatientDetailField label="Room No." value={displayData.room_no} />
                        <PatientDetailField label="Serial No." value={displayData.serial_no} />
                      </>
                    )}
                  </PatientDetailFieldGroup>
                  <PatientDetailFieldGroup>
                    <PatientDetailField
                      label="File No."
                      value={displayData.file_no}
                      className={userRole && !isMWO(userRole) ? '' : 'md:col-span-1'}
                    />
                    {userRole && !isMWO(userRole) && (
                      <PatientDetailField label="Unit Days" value={displayData.unit_days} />
                    )}
                  </PatientDetailFieldGroup>
                  <div className="space-y-3 border-t border-gray-100 pt-4">
                    <p className="text-sm font-semibold uppercase tracking-wide text-gray-800">
                      Address details
                    </p>
                    <PatientDetailFieldGroup>
                      <PatientDetailField
                        label="Address Line (House No., Street, Locality)"
                        value={displayData.address_line}
                        className="md:col-span-2"
                      />
                      <PatientDetailField label="City/Town/Village" value={displayData.city} />
                      <PatientDetailField label="District" value={displayData.district} />
                      <PatientDetailField label="State" value={displayData.state} />
                      <PatientDetailField label="Country" value={displayData.country} />
                      <PatientDetailField label="Pin Code" value={displayData.pin_code} />
                    </PatientDetailFieldGroup>
                  </div>
                </div>
              </PatientDetailCardShell>

              {/* Out-Patient Record — read-only tiles */}
              <PatientDetailCardShell className="mb-8">
                <div className="px-5 pt-5">
                  <PatientDetailSectionTitle>Out-Patient Record</PatientDetailSectionTitle>
                </div>
                <div className="space-y-6 px-5 pb-5">
                  <PatientDetailFieldGroup>
                    <PatientDetailField
                      label="Seen in Walk-in-on"
                      value={
                        displayData.seen_in_walk_in_on
                          ? formatDate(displayData.seen_in_walk_in_on)
                          : ''
                      }
                    />
                    <PatientDetailField
                      label="Worked up on"
                      value={
                        displayData.worked_up_on ? formatDate(displayData.worked_up_on) : ''
                      }
                    />
                    <PatientDetailField label="CR No." value={displayData.cr_no} />
                    <PatientDetailField label="Psy. No." value={displayData.psy_no} />
                    <PatientDetailField
                      label="Special Clinic No."
                      value={displayData.special_clinic_no}
                    />
                    <PatientDetailField label="Name" value={displayData.name} />
                    <PatientDetailField label="Sex" value={getSexLabel(displayData.sex)} />
                    <PatientDetailField label="Age Group" value={displayData.age_group} />
                    <PatientDetailField
                      label="Marital Status"
                      value={getMaritalStatusLabel(displayData.marital_status)}
                    />
                    <PatientDetailField
                      label="Year of marriage"
                      value={displayData.year_of_marriage}
                    />
                    <PatientDetailField
                      label="No. of Children: M"
                      value={displayData.no_of_children_male}
                    />
                    <PatientDetailField
                      label="No. of Children: F"
                      value={displayData.no_of_children_female}
                    />
                    <PatientDetailField
                      label="Occupation"
                      value={getOccupationLabel(displayData.occupation)}
                    />
                    <PatientDetailField
                      label="Education"
                      value={getEducationLabel(
                        displayData.education || displayData.education_level
                      )}
                    />
                    <PatientDetailField label="Family Income (₹)" value={displayData.family_income} />
                    <PatientDetailField
                      label="Patient Income (₹)"
                      value={displayData.income || displayData.patient_income}
                    />
                    <PatientDetailField
                      label="Religion"
                      value={getReligionLabel(displayData.religion)}
                    />
                    <PatientDetailField
                      label="Family Type"
                      value={getFamilyTypeLabel(displayData.family_type)}
                    />
                    <PatientDetailField
                      label="Locality"
                      value={getLocalityLabel(displayData.locality)}
                    />
                    <PatientDetailField label="Assigned Doctor" value={displayData.assigned_doctor_name} />
                    <PatientDetailField label="Assigned Room" value={displayData.assigned_room} />
                    <PatientDetailField label="Family Head Name" value={displayData.head_name} />
                    <PatientDetailField label="Family Head Age" value={displayData.head_age} />
                    <PatientDetailField
                      label="Relationship With Family Head"
                      value={getHeadRelationshipLabel(displayData.head_relationship)}
                    />
                    <PatientDetailField
                      label="Family Head Education"
                      value={getHeadEducationLabel(displayData.head_education)}
                    />
                    <PatientDetailField
                      label="Family Head Occupation"
                      value={getHeadOccupationLabel(displayData.head_occupation)}
                    />
                    <PatientDetailField label="Family Head Income (₹)" value={displayData.head_income} />
                    <PatientDetailField
                      label="Exact distance from hospital"
                      value={displayData.distance_from_hospital}
                    />
                    <PatientDetailField
                      label="Mobility of the patient"
                      value={getMobilityLabel(displayData.mobility)}
                    />
                    <PatientDetailField
                      label="Referred by"
                      value={getReferredByLabel(displayData.referred_by)}
                    />
                  </PatientDetailFieldGroup>

                  <div className="space-y-3 border-t border-gray-100 pt-4">
                    <p className="text-sm font-semibold uppercase tracking-wide text-gray-800">
                      Permanent Address
                    </p>
                    <PatientDetailFieldGroup>
                      <PatientDetailField
                        label="Address Line"
                        value={formData.permanent_address_line_1}
                        className="md:col-span-2"
                      />
                      <PatientDetailField
                        label="City/Town/Village"
                        value={formData.permanent_city_town_village}
                      />
                      <PatientDetailField label="District" value={formData.permanent_district} />
                      <PatientDetailField label="State" value={formData.permanent_state} />
                      <PatientDetailField label="Country" value={formData.permanent_country} />
                      <PatientDetailField label="Pin Code" value={formData.permanent_pin_code} />
                    </PatientDetailFieldGroup>
                  </div>

                  <div className="space-y-3 border-t border-gray-100 pt-4">
                    <p className="text-sm font-semibold uppercase tracking-wide text-gray-800">
                      Present Address
                    </p>
                    <PatientDetailFieldGroup>
                      <PatientDetailField
                        label="Address Line"
                        value={formData.present_address_line_1}
                        className="md:col-span-2"
                      />
                      <PatientDetailField
                        label="City/Town/Village"
                        value={formData.present_city_town_village}
                      />
                      <PatientDetailField label="District" value={formData.present_district} />
                      <PatientDetailField label="State" value={formData.present_state} />
                      <PatientDetailField label="Country" value={formData.present_country} />
                      <PatientDetailField label="Pin Code" value={formData.present_pin_code} />
                    </PatientDetailFieldGroup>
                  </div>

                  <div className="space-y-3 border-t border-gray-100 pt-4">
                    <p className="text-sm font-semibold uppercase tracking-wide text-gray-800">
                      Local Address
                    </p>
                    <PatientDetailFieldGroup>
                      <PatientDetailField
                        label="Local Address"
                        value={formData.local_address}
                        className="md:col-span-2"
                      />
                    </PatientDetailFieldGroup>
                  </div>
                </div>
              </PatientDetailCardShell>

              <div className="my-6 border-t border-gray-200" />

              {patient?.id && (
                <div className="no-print rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                  <h4 className="mb-4 flex items-center gap-3 text-xl font-bold text-gray-900">
                    <div className="rounded-xl border border-white/30 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 p-2.5 shadow-md backdrop-blur-sm">
                      <FiFileText className="h-5 w-5 text-indigo-600" />
                    </div>
                    Patient Documents & Files
                  </h4>
                  <FilePreview
                    files={existingFiles}
                    patient_id={patient?.id}
                    canDelete={false}
                    baseUrl={(import.meta.env.VITE_API_URL || '/api').replace(/\/api$/, '')}
                    refetchFiles={refetchFiles}
                  />
                </div>
              )}
              
            </form>


          </div>
        )}
       
      </Card>

      {/* Card 2: Walk-in Clinical Proforma - Show only if filled_by_role is Admin, JR, or SR */}
      {canViewClinicalProforma && (
        <Card variant="solid">
          <div
            className="flex items-center justify-between p-6 border-b border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <div 
              className="flex items-center gap-4 cursor-pointer flex-1"
            onClick={() => toggleCard('clinical')}
          >
              <div className={VIEW_SECTION_ICON.clinical}>
                <FiFileText className="h-6 w-6 text-emerald-700" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Walk-in Clinical Proforma</h3>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <p className="text-sm text-gray-500">
                    {lastVisitProforma
                      ? `First visit: ${formatDate(lastVisitProforma.visit_date || lastVisitProforma.created_at)}`
                    : 'No clinical records'}
                </p>
                  {lastVisitProforma && (
                    <>
                      <span className="text-gray-400">•</span>
                      <span className="px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800">
                        First Visit
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="no-print"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrintFromCard('clinical', handlePrintClinicalProforma);
                }}
              >
                <FiPrinter className="h-4 w-4 mr-1" />
                Print
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
              {/* First Visit Section - Show full proforma form (static, only from initial visit) */}
              {lastVisitProforma ? (
                <div className="space-y-4 border-t border-gray-200 pt-6">
                  <h4 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-semibold">
                      First Visit
                    </span>
                    <span className="text-sm text-gray-500 font-normal">
                      {formatDate(lastVisitProforma.visit_date || lastVisitProforma.created_at)}
                                  </span>
                  </h4>
                  
                  {/* Read-only summary: same tile layout as Patient Details; only recorded fields */}
                  <div ref={clinicalProformaPrintRef} className="clinical-proforma-view">
                    <WalkInClinicalProformaSummaryView proforma={lastVisitProforma} patient={patient} />
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <FiFileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-base font-medium">No Proforma Available</p>
                </div>
              )}
            </div>
          )}
        </Card>
      )}
      {/* Card 3: Additional Details (ADL File) - Show card even if empty, as long as user has permission */}
      {canViewADLFile && (
        <Card variant="solid">
          <div
            className="flex items-center justify-between p-6 border-b border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <div 
              className="flex items-center gap-4 cursor-pointer flex-1"
            onClick={() => toggleCard('adl')}
          >
              <div className={VIEW_SECTION_ICON.intake}>
                <FiFolder className="h-6 w-6 text-violet-700" />
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
                variant="outline"
                size="sm"
                className="no-print"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrintFromCard('adl', handlePrintADL);
                }}
              >
                <FiPrinter className="h-4 w-4 mr-1" />
                Print
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
            <div ref={adlPrintRef} className="p-6">
              {patientAdlFiles.length > 0 ? (
                <OutPatientIntakeRecordSummaryView adlFile={patientAdlFiles[0]} patient={patient} />
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <FiFolder className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-base font-medium">Form Not Yet Submitted</p>
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Card 4: Prescription History - Show only if current user is Admin, JR, or SR */}
      {canViewPrescriptions && (
        <Card variant="solid">
          <div
            className="flex items-center justify-between p-6 border-b border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <div 
              className="flex items-center gap-4 cursor-pointer flex-1"
            onClick={() => toggleCard('prescriptions')}
          >
              <div className={VIEW_SECTION_ICON.prescription}>
                <FiPackage className="h-6 w-6 text-amber-700" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Prescription</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {allPrescriptions.length > 0
                    ? `${allPrescriptions.length} prescription${allPrescriptions.length > 1 ? 's' : ''} across ${Object.keys(prescriptionsByVisit).length} visit${Object.keys(prescriptionsByVisit).length > 1 ? 's' : ''}`
                    : 'No Data Available'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="no-print"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrintFromCard('prescriptions', handlePrintPrescription);
                }}
              >
                <FiPrinter className="h-4 w-4 mr-1" />
                Print
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
            <div ref={prescriptionPrintRef} className="p-6">
              {allPrescriptions.length > 0 ? (
                <PrescriptionView
                  prescription={allPrescriptions}
                  clinicalProformaId={allPrescriptions[0]?.proforma_id ?? proformaIds[0]}
                  patientId={patient?.id}
                />
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <FiPackage className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-base font-medium">No Data Available</p>
                  <p className="text-sm text-gray-400 mt-1">Prescriptions will appear here once medications are prescribed</p>
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Card 5: Past History — follow-up visits and notes only (grouped by date) */}
      {canViewClinicalProforma && (
        <Card variant="solid">
          <div className="flex items-center justify-between border-b border-gray-200 p-6 transition-colors hover:bg-gray-50">
            <div
              className="flex flex-1 cursor-pointer items-center gap-4"
              onClick={() => toggleCard('pastHistory')}
            >
              <div className="rounded-lg bg-purple-100 p-3">
                <FiClock className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Past History</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {pastHistoryFollowUpCount > 0
                    ? `${pastHistoryFollowUpCount} follow-up visit${pastHistoryFollowUpCount !== 1 ? 's' : ''} on ${pastHistoryFollowUpDays.length} day${pastHistoryFollowUpDays.length !== 1 ? 's' : ''} — view only`
                    : 'No follow-up visits — view only'}
                  {patient?.id && existingFiles.length > 0 && (
                    <span className="block sm:inline sm:before:content-['\00a0•\00a0'] mt-1 sm:mt-0 text-indigo-700">
                      {existingFiles.length} document{existingFiles.length !== 1 ? 's' : ''} on file
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="cursor-pointer" onClick={() => toggleCard('pastHistory')}>
              {expandedCards.pastHistory ? (
                <FiChevronUp className="h-6 w-6 text-gray-500" />
              ) : (
                <FiChevronDown className="h-6 w-6 text-gray-500" />
              )}
            </div>
          </div>

          {expandedCards.pastHistory && (
            <div className="space-y-4 p-6">
              {patient?.id && (
                <div className="no-print rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50/80 to-white p-5 shadow-sm">
                  <h4 className="mb-2 flex items-center gap-2 text-lg font-bold text-gray-900">
                    <span className="rounded-lg border border-indigo-100 bg-white p-2 shadow-sm">
                      <FiFileText className="h-5 w-5 text-indigo-600" />
                    </span>
                    Patient documents & files
                  </h4>
                  <p className="mb-4 text-sm text-gray-600">
                    Scanned files on record (including uploads from follow-up visits, walk-in proforma, and this profile).
                  </p>
                  {existingFiles.length > 0 ? (
                    <FilePreview
                      files={existingFiles}
                      patient_id={patient.id}
                      canDelete={false}
                      baseUrl={(import.meta.env.VITE_API_URL || '/api').replace(/\/api$/, '')}
                      refetchFiles={refetchFiles}
                    />
                  ) : (
                    <p className="rounded-lg border border-dashed border-gray-200 bg-white py-6 text-center text-sm text-gray-500">
                      No documents uploaded yet.
                    </p>
                  )}
                </div>
              )}

              {pastHistoryFollowUpDays.length > 0 ? (
                <div className="space-y-6">
                  {pastHistoryFollowUpDays.map((visitGroup) => {
                    const visitDate = formatDate(visitGroup.visitDate);
                    const dateKey = visitGroup.visitDate;
                    const dateToggleId = `past-ph-date-${dateKey}`;
                    const isDateExpanded = isVisitCardExpanded(dateToggleId);
                    const n = visitGroup.visits.length;

                    return (
                      <Card key={dateToggleId} variant="solid">
                        <div
                          className="flex cursor-pointer items-center justify-between border-b border-gray-200 p-5 transition-colors hover:bg-gray-50"
                          onClick={() => toggleVisitCard(dateToggleId)}
                        >
                          <div className="flex items-center gap-4">
                            <div className={VIEW_SECTION_ICON.history}>
                              <FiCalendar className="h-6 w-6 text-slate-600" />
                            </div>
                            <div>
                              <h4 className="text-xl font-bold text-gray-900">{visitDate}</h4>
                              <p className="mt-1 text-sm text-gray-500">
                                {n === 1 ? '1 follow-up visit' : `${n} follow-up visits`}
                              </p>
                            </div>
                          </div>
                          <div className="cursor-pointer" onClick={() => toggleVisitCard(dateToggleId)}>
                            {isDateExpanded ? (
                              <FiChevronUp className="h-6 w-6 text-gray-500" />
                            ) : (
                              <FiChevronDown className="h-6 w-6 text-gray-500" />
                            )}
                          </div>
                        </div>

                        {isDateExpanded && (
                          <div className="space-y-4 p-6">
                            {visitGroup.visits.map(({ visitId, followUp }) => {
                              const notes =
                                followUp.clinical_assessment ||
                                followUp.clinicalAssessment ||
                                '';
                              return (
                                <div
                                  key={visitId}
                                  className={VIEW_NESTED_PANEL_CLASS}
                                >
                                  <h5 className="mb-3 flex items-center gap-2 text-base font-semibold text-gray-900">
                                    <FiFileText className="h-4 w-4 text-blue-600" />
                                    Follow-up visit
                                  </h5>
                                  <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                                    <div>
                                      <p className="mb-1 text-gray-500">Visit date</p>
                                      <p className="font-medium text-gray-900">
                                        {formatDate(followUp.visit_date || followUp.created_at)}
                                      </p>
                                    </div>
                                    {followUp.room_no && (
                                      <div>
                                        <p className="mb-1 text-gray-500">Room</p>
                                        <p className="font-medium text-gray-900">{followUp.room_no}</p>
                                      </div>
                                    )}
                                    {(followUp.assigned_doctor_name || followUp.doctor_name) && (
                                      <div>
                                        <p className="mb-1 text-gray-500">Assigned doctor</p>
                                        <p className="font-medium text-gray-900">
                                          {followUp.assigned_doctor_name || followUp.doctor_name}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                  {notes ? (
                                    <div className="mt-3">
                                      <p className="mb-2 text-sm font-medium text-gray-500">Notes</p>
                                      <div className="min-h-[60px] whitespace-pre-wrap rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-900">
                                        {notes}
                                      </div>
                                    </div>
                                  ) : (
                                    <p className="mt-3 text-sm italic text-gray-500">No notes recorded.</p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <ViewEmptyMessage
                  message="No follow-up history"
                  description="This patient has no follow-up visits in past history yet."
                  icon={FiFileText}
                />
              )}
            </div>
          )}
        </Card>
      )}
    </div>
    </ReadOnlyToneProvider>
  );
});

PatientDetailsView.displayName = 'PatientDetailsView';

export default PatientDetailsView;
