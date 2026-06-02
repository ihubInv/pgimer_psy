import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import {
  FiUser, FiUsers, FiHome, FiMapPin, FiCalendar, FiGlobe,
  FiFileText, FiHash, FiSave, FiX, FiCamera, FiUpload, FiEdit,
  FiClock, FiChevronDown, FiChevronUp, FiEye, FiEdit3, FiClipboard, FiPackage,
  FiFolder, FiPrinter,
} from 'react-icons/fi';
import { IconInput } from '../../components/IconInput';
import Card from '../../components/Card';
import Select from '../../components/Select';
import Button from '../../components/Button';
import DatePicker from '../../components/CustomDatePicker';
import FileUpload from '../../components/FileUpload';
import {
  CHILD_AGE_GROUP_OPTIONS,
  CHILD_EDUCATIONAL_STATUS_OPTIONS,
  CHILD_OCCUPATIONAL_STATUS_OPTIONS,
  CHILD_RELIGION_OPTIONS,
  CHILD_HEAD_RELATIONSHIP_OPTIONS,
  CHILD_HEAD_EDUCATION_OPTIONS,
  CHILD_HEAD_OCCUPATION_OPTIONS,
  CHILD_HEAD_MONTHLY_INCOME_OPTIONS,
  CHILD_LOCALITY_OPTIONS,
  CHILD_DISTANCE_TRAVELLED_OPTIONS,
  CHILD_SOURCE_OF_REFERRAL_OPTIONS,
  CHILD_SEX_OPTIONS,
  INDIA_STATES,
  isMWO,
  isAdmin,
  isJR,
  isSR,
} from '../../utils/constants';
import { selectCurrentUser, selectCurrentToken } from '../../features/auth/authSlice';
import { useGetAllRoomsQuery } from '../../features/rooms/roomsApiSlice';
import { useGetChildClinicalProformasByChildPatientIdQuery } from '../../features/clinical/childClinicalApiSlice';
import { useGetFollowUpsByChildPatientIdQuery } from '../../features/followUp/followUpApiSlice';
import { useGetPrescriptionsByPatientIdQuery } from '../../features/prescriptions/prescriptionApiSlice';
import { formatDate } from '../../utils/formatters';
import EditChildClinicalProforma from '../clinical/EditChildClinicalProforma';
import EditChildCapWorkup from '../adl/EditChildCapWorkup';
import { useGetChildCapWorkupsByChildPatientIdQuery } from '../../features/childCapWorkup/childCapWorkupApiSlice';
import PrescriptionView from '../PrescribeMedication/PrescriptionView';
import ChildPatientRegistrationViewCards from '../../components/ChildPatientRegistrationViewCards';
import { ReadOnlyToneProvider } from '../../components/PatientDetailReadOnlyCard';
import ViewEmptyMessage from '../../components/ViewEmptyMessage';
import {
  VIEW_NESTED_PANEL_CLASS,
  VIEW_PAGE_SHELL_CLASS,
  VIEW_SECTION_ICON,
} from '../../utils/viewDetailsUi';
import {
  buildPrescriptionPrintDocument,
  printPatientPrescriptions,
} from '../../utils/prescriptionPrint';
import {
  mapApiPatientForPrint,
  mapChildPatientForPrint,
} from '../../utils/prescriptionPrintPatient';
import ChildClinicalProformaSummaryView from '../../components/ChildClinicalProformaSummaryView';
import FilePreview from '../../components/FilePreview';
import PGI_Logo from '../../assets/PGI_Logo.png';

const CreateChildPatient = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode'); // 'view' or 'edit'
  const section = searchParams.get('section');
  const isViewMode = mode === 'view';
  const isEditMode = Boolean(id) && !isViewMode;
  const isIntakeOnlyMode = isEditMode && section === 'intakeRecord';
  const currentUser = useSelector(selectCurrentUser);
  const token = useSelector(selectCurrentToken);
  const isAdminUser = isAdmin(currentUser?.role);
  const isResident = isJR(currentUser?.role);
  const isFaculty = isSR(currentUser?.role);
  const canEditChildWalkInProforma = isResident || isFaculty || isAdminUser;
  const hideChildViewChromeForMWO = isViewMode && isMWO(currentUser?.role);
  // Same as adult edit: everyone sees Patient Details; MWO does not see clinical / ADL / prescription stack
  const showChildRegistrationCard = !isIntakeOnlyMode;
  const showClinicalProformaAndIntakeInEdit =
    isEditMode && id && !isMWO(currentUser?.role);
  /** Today's / view flow: show clinical + intake + prescription cards (same idea as edit), read-only summaries */
  const showChildClinicalSummaryInView =
    isViewMode && Boolean(id) && !isMWO(currentUser?.role);
  // Match adult PatientDetails edit: clean shell + page title (not the CGC marketing gradient)
  const useAdultEditShell = Boolean(id) && isEditMode && !isViewMode;
  const usePatientViewShell = isViewMode && Boolean(id);
  const { data: roomsData } = useGetAllRoomsQuery({ page: 1, limit: 100, is_active: true });
  
  const [formData, setFormData] = useState({
    // Visit Details
    seen_as_walk_in_on: new Date().toISOString().split('T')[0],
    
    // Identification Details
    cr_number: '',
    cgc_number: '',
    
    // Address Details
    address_line: '',
    city_town_village: '',
    district: '',
    state: '',
    country: 'India',
    pincode: '',
    
    // Child Personal Information
    child_name: '',
    sex: '',
    mobile_no: '',
    age: '',
    
    // Age Group
    age_group: '',
    
    // Educational Status
    educational_status: '',
    
    // Occupational Status
    occupational_status: '',
    
    // Religion
    religion: '',
    
    // Head of Family Details
    head_name: '',
    head_relationship: '',
    head_age: '',
    head_education: '',
    head_occupation: '',
    head_monthly_income: '',
    
    // Locality
    locality: '',
    
    // Distance Travelled
    distance_travelled: '',
    
    // Source of Referral
    source_of_referral: '',
    
    // Present Address
    present_address_line: '',
    present_city_town_village: '',
    present_district: '',
    present_state: '',
    present_country: 'India',
    present_pincode: '',
    
    // Permanent Address
    permanent_address_line: '',
    permanent_city_town_village: '',
    permanent_district: '',
    permanent_state: '',
    permanent_country: 'India',
    permanent_pincode: '',
    
    // Local Address
    local_address_line: '',
    local_city_town_village: '',
    local_district: '',
    local_state: '',
    local_country: 'India',
    local_pincode: '',
    
    // Assigned Room
    assigned_room: '',

    // Documents (from API — view mode previews)
    documents: [],
    photo_path: '',
  });

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [selectedDocuments, setSelectedDocuments] = useState([]);
  const [sameAsPresent, setSameAsPresent] = useState(false);
  
  // State for expanded cards — all collapsed on first load (user expands as needed)
  const [expandedCards, setExpandedCards] = useState({
    pastHistory: false,
    childPatientRegistration: false,
    childClinicalProforma: false,
    prescription: false,
    intakeRecord: false,
    viewChildClinical: false,
    viewIntake: false,
    viewPrescription: false,
  });
  
  // State for expanded visit cards
  const [expandedVisitCards, setExpandedVisitCards] = useState({});
  const childPatientDetailsPrintRef = useRef(null);
  const childClinicalPrintRef = useRef(null);
  const childCapPrintRef = useRef(null);
  const childPrescriptionPrintRef = useRef(null);
  
  // Fetch child clinical proformas when viewing/editing
  const { data: childClinicalData, isLoading: isLoadingChildProformas } = useGetChildClinicalProformasByChildPatientIdQuery(
    id,
    {
      skip: !id || (!isViewMode && !isEditMode),
      refetchOnMountOrArgChange: true,
    }
  );
  
  // Fetch child follow-ups when viewing
  const { data: childFollowUpData, isLoading: isLoadingChildFollowUps } = useGetFollowUpsByChildPatientIdQuery(
    { child_patient_id: id, page: 1, limit: 100 },
    {
      skip: !id || !isViewMode,
      refetchOnMountOrArgChange: true,
    }
  );
  
  // Prescriptions for this patient only (avoids broad list + works for all roles including MWO)
  const { data: childCapWorkupData, isLoading: isLoadingChildCapWorkup } =
    useGetChildCapWorkupsByChildPatientIdQuery(id, {
      skip: !id || !isViewMode,
      refetchOnMountOrArgChange: true,
    });

  const { data: prescriptionData, isLoading: isLoadingPrescriptions } = useGetPrescriptionsByPatientIdQuery(
    id,
    {
      skip: !id || (!isViewMode && !isEditMode),
      refetchOnMountOrArgChange: true,
    }
  );

  // Extract child clinical proformas
  const childClinicalProformas = Array.isArray(childClinicalData?.data?.proformas)
    ? childClinicalData.data.proformas
    : [];

  const firstChildWalkInProforma = useMemo(() => {
    if (!childClinicalProformas.length) return null;
    const sortedOldestFirst = [...childClinicalProformas].sort(
      (a, b) =>
        new Date(a.visit_date || a.created_at || 0) - new Date(b.visit_date || b.created_at || 0)
    );
    return sortedOldestFirst[0] || null;
  }, [childClinicalProformas]);

  /** Walk-in child proforma: start in read-only summary when a record exists (like adult PatientDetailsEdit). */
  const [isEditingChildWalkInProforma, setIsEditingChildWalkInProforma] = useState(false);
  const childWalkInProformaUxInitRef = useRef(false);

  useEffect(() => {
    childWalkInProformaUxInitRef.current = false;
  }, [id]);

  useEffect(() => {
    if (!showClinicalProformaAndIntakeInEdit || !id) return;
    if (isLoadingChildProformas) return;
    if (childWalkInProformaUxInitRef.current) return;
    childWalkInProformaUxInitRef.current = true;
    setIsEditingChildWalkInProforma(childClinicalProformas.length === 0);
  }, [showClinicalProformaAndIntakeInEdit, id, isLoadingChildProformas, childClinicalProformas.length]);
  
  // Extract child follow-ups
  const childFollowUps = Array.isArray(childFollowUpData?.data?.followups)
    ? childFollowUpData.data.followups
    : [];
  
  const prescriptions = Array.isArray(prescriptionData?.data?.prescriptions)
    ? prescriptionData.data.prescriptions
    : [];

  const childCapWorkupRecords = Array.isArray(childCapWorkupData?.data?.records)
    ? childCapWorkupData.data.records
    : [];

  const flatChildPrescriptionItems = useMemo(() => {
    const items = [];
    prescriptions.forEach((rec) => {
      if (Array.isArray(rec.prescription)) {
        items.push(...rec.prescription);
      }
    });
    return items;
  }, [prescriptions]);

  const childPatientForPrescriptionPrint = useMemo(() => {
    const fromApi = mapApiPatientForPrint(prescriptionData?.data?.patient);
    if (fromApi?.name) return fromApi;
    return mapChildPatientForPrint({
      child_name: formData.child_name,
      cr_number: formData.cr_number,
      cgc_number: formData.cgc_number,
      age: formData.age,
      sex: formData.sex,
      mobile_no: formData.mobile_no,
    });
  }, [prescriptionData, formData]);

  const handlePrintChildPrescriptionView = () => {
    printPatientPrescriptions(childPatientForPrescriptionPrint, prescriptions, {
      flatMedications: flatChildPrescriptionItems,
      formatDate: formatDate,
    });
  };

  useEffect(() => {
    if (!isViewMode || !id) return;
    setExpandedCards((prev) => ({
      ...prev,
      childPatientRegistration: true,
      viewChildClinical: true,
      viewIntake: true,
      viewPrescription: true,
    }));
  }, [isViewMode, id]);

  const childDocumentFilesForPreview = useMemo(() => {
    const docs = Array.isArray(formData.documents) ? [...formData.documents] : [];
    if (formData.photo_path && !docs.includes(formData.photo_path)) {
      return [formData.photo_path, ...docs];
    }
    return docs;
  }, [formData.documents, formData.photo_path]);

  // Match PatientDetailsEdit Walk-in Clinical Proforma subtitle pattern
  const walkInClinicalProformaSubtitle = useMemo(() => {
    if (!firstChildWalkInProforma) {
      return "Today's Patient - First visit";
    }
    return `First visit: ${formatDate(
      firstChildWalkInProforma.visit_date || firstChildWalkInProforma.created_at
    )}`;
  }, [firstChildWalkInProforma]);

  const prescriptionCardSubtitle =
    prescriptions.length > 0
      ? `View prescriptions for ${prescriptions.length} visit${prescriptions.length > 1 ? 's' : ''}`
      : 'No prescriptions found';
  
  // Helper function to toggle card expansion
  const toggleCard = (cardName) => {
    setExpandedCards(prev => ({
      ...prev,
      [cardName]: !prev[cardName]
    }));
  };

  const openChildIntakeForm = () => {
    if (!id) return;
    navigate(`/child-patient/${id}?mode=edit&section=intakeRecord`);
  };

  useEffect(() => {
    if (!id || section !== 'intakeRecord') return;

    if (isViewMode) {
      navigate(`/child-patient/${id}?mode=edit&section=intakeRecord`, { replace: true });
      return;
    }

    setExpandedCards((prev) => ({
      ...prev,
      intakeRecord: true,
    }));
  }, [id, section, isViewMode, navigate]);
  
  // Helper function to toggle visit card expansion
  const toggleVisitCard = (visitId) => {
    setExpandedVisitCards(prev => ({
      ...prev,
      [visitId]: !prev[visitId]
    }));
  };
  
  // Helper function to check if visit card is expanded
  const isVisitCardExpanded = (visitId) => {
    return expandedVisitCards[visitId] === true;
  };

  const sanitizeSectionHtml = (rawHtml, { stripDocuments = false } = {}) => {
    if (!rawHtml) return '';
    const temp = document.createElement('div');
    temp.innerHTML = rawHtml;

    temp
      .querySelectorAll(
        '.no-print, [class*="no-print"], button, [role="button"], script, style'
      )
      .forEach((el) => el.remove());

    if (stripDocuments) {
      const docHeadings = Array.from(temp.querySelectorAll('h4'));
      docHeadings.forEach((heading) => {
        const headingText = (heading.textContent || '').trim().toLowerCase();
        if (headingText.includes('patient documents & files')) {
          const block = heading.closest('div.rounded-xl') || heading.parentElement;
          if (block) block.remove();
        }
      });
    }

    temp.querySelectorAll('*').forEach((el) => {
      el.style.pageBreakBefore = 'auto';
      el.style.pageBreakAfter = 'auto';
      el.style.breakBefore = 'auto';
      el.style.breakAfter = 'auto';
      el.style.minHeight = '0';
    });

    return temp.innerHTML.trim();
  };

  const buildCombinedPrintDocument = (sections, documentTitle, logoBase64 = '') => {
    const combinedHtml = sections
      .map(
        (section) => `
          <section class="print-section">
            <h3>${section.title}</h3>
            ${section.html}
          </section>
        `
      )
      .join('');

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${documentTitle}</title>
  <style>
    @page { size: A4; margin: 12mm 15mm; }
    * { box-sizing: border-box; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      color: #000;
      background: #fff;
      margin: 0;
      padding: 0;
      font-size: 10pt;
      line-height: 1.5;
    }
    body * {
      color: #000 !important;
      background: #fff !important;
      text-shadow: none !important;
      box-shadow: none !important;
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 14px;
      border-bottom: 1px solid #000;
      padding: 8px 0 12px;
      margin-bottom: 14px;
    }
    .logo { height: 60px; width: auto; filter: grayscale(100%); object-fit: contain; }
    .header-text { text-align: center; flex: 1; }
    .header-text h1 {
      margin: 0;
      font-size: 14pt;
      font-weight: 700;
      text-transform: uppercase;
    }
    .header-text h2 { margin: 2px 0 0; font-size: 10pt; font-weight: 600; }
    .header-text p { margin: 3px 0 0; font-size: 10pt; }
    .print-section {
      margin-bottom: 14px;
      border: 1px solid #000;
      padding: 10px;
      page-break-inside: auto;
      break-inside: auto;
      page-break-before: auto !important;
      break-before: auto !important;
    }
    .print-section * {
      page-break-before: auto !important;
      break-before: auto !important;
      page-break-after: auto !important;
      break-after: auto !important;
    }
    .print-section > h3 {
      margin: 0 0 8px;
      padding-bottom: 4px;
      border-bottom: 1px solid #000;
      font-size: 11pt;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }
    .print-section .grid,
    .print-section [class*="grid-cols-"],
    .print-section [class*="grid "] {
      display: grid !important;
      grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
      gap: 8px !important;
      align-items: start !important;
    }
    .print-section [class*="col-span-"],
    .print-section [class*="md:col-span-"],
    .print-section [class*="lg:col-span-"] {
      grid-column: auto !important;
    }
    .print-footer {
      margin-top: 14px;
      padding-top: 8px;
      border-top: 1px solid #000;
      font-size: 8.5pt;
      text-align: center;
      color: #000;
    }
    table, th, td {
      border: 1px solid #000 !important;
      border-collapse: collapse;
    }
    th, td { padding: 6px 8px; text-align: left; vertical-align: top; }
  </style>
</head>
<body>
  <div class="header">
    ${logoBase64 ? `<img src="${logoBase64}" alt="PGIMER Logo" class="logo" />` : ''}
    <div class="header-text">
      <h1>POSTGRADUATE INSTITUTE OF MEDICAL EDUCATION & RESEARCH</h1>
      <h2>Department of Psychiatry</h2>
      <p>Combined Child Patient Report</p>
    </div>
  </div>
  ${combinedHtml}
  <div class="print-footer">
    <p><strong>Generated on:</strong> ${new Date().toLocaleString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })}</p>
    <p>PGIMER - Department of Psychiatry | Electronic Medical Record System</p>
    <p>This is a computer-generated document. No signature required.</p>
  </div>
</body>
</html>`;
  };

  const printSection = async (title, sectionRef, { stripDocuments = false } = {}) => {
    const sectionEl = sectionRef?.current;
    if (!sectionEl) {
      toast.error('Please expand this section first');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow pop-ups to print this section');
      return;
    }

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

    const cleanedHtml = sanitizeSectionHtml(sectionEl.innerHTML, { stripDocuments });

    const printContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    @page { size: A4; margin: 12mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 10pt;
      line-height: 1.5;
      color: #000;
      background: #fff;
    }
    body * {
      color: #000 !important;
      text-shadow: none !important;
      box-shadow: none !important;
      background: #fff !important;
      border-color: #000 !important;
    }
    .print-header {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 14px;
      border-bottom: 1px solid #000;
      margin-bottom: 12px;
      padding-bottom: 8px;
    }
    .logo {
      height: 60px;
      width: auto;
      filter: grayscale(100%);
      object-fit: contain;
    }
    .header-text {
      text-align: center;
      flex: 1;
    }
    .header-text h1 {
      margin: 0;
      font-size: 13pt;
      font-weight: 700;
      color: #000;
      text-transform: uppercase;
    }
    .header-text h2 {
      margin: 2px 0 0;
      font-size: 10pt;
      font-weight: 600;
      color: #000;
    }
    .header-text p {
      margin: 2px 0 0;
      font-size: 9pt;
      color: #000;
    }
    .print-footer {
      margin-top: 14px;
      padding-top: 8px;
      border-top: 1px solid #000;
      font-size: 8.5pt;
      text-align: center;
      color: #000;
    }
    .print-content .grid,
    .print-content [class*="grid-cols-"] {
      display: grid !important;
      grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
      gap: 8px !important;
      align-items: start !important;
    }
    .print-content [class*="col-span-"] {
      grid-column: auto !important;
    }
    .print-content .no-print,
    .print-content [class*="no-print"],
    .print-content button,
    .print-content [role="button"] {
      display: none !important;
    }
    table, th, td {
      border: 1px solid #000 !important;
      border-collapse: collapse;
    }
    th, td { padding: 6px 8px; text-align: left; vertical-align: top; }
  </style>
</head>
<body>
  <div class="print-header">
    ${logoBase64 ? `<img src="${logoBase64}" alt="PGIMER Logo" class="logo" />` : ''}
    <div class="header-text">
      <h1>POSTGRADUATE INSTITUTE OF MEDICAL EDUCATION & RESEARCH</h1>
      <h2>Department of Psychiatry</h2>
      <p>${title}</p>
    </div>
  </div>
  <div class="print-content">${cleanedHtml}</div>
  <div class="print-footer">
    <p><strong>Generated on:</strong> ${new Date().toLocaleString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}</p>
    <p>PGIMER - Department of Psychiatry | Electronic Medical Record System</p>
    <p>This is a computer-generated document. No signature required.</p>
  </div>
</body>
</html>`;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.onload = () => {
      setTimeout(() => printWindow.print(), 300);
    };
  };

  const handlePrintFromChildCard = (cardName, sectionRef, title, options = {}) => {
    if (expandedCards[cardName]) {
      printSection(title, sectionRef, options);
      return;
    }
    setExpandedCards((prev) => ({ ...prev, [cardName]: true }));
    window.setTimeout(() => {
      printSection(title, sectionRef, options);
    }, 350);
  };

  const handlePrintAllChildCards = async () => {
    setExpandedCards((prev) => ({
      ...prev,
      childPatientRegistration: true,
      viewChildClinical: true,
      viewIntake: true,
      viewPrescription: true,
    }));

    await new Promise((resolve) => window.setTimeout(resolve, 450));

    const sections = [];

    if (childPatientDetailsPrintRef.current) {
      const html = sanitizeSectionHtml(childPatientDetailsPrintRef.current.innerHTML, {
        stripDocuments: true,
      });
      if (html) {
        sections.push({ title: 'Child Patient Details', html });
      }
    }
    if (childClinicalPrintRef.current) {
      const html = sanitizeSectionHtml(childClinicalPrintRef.current.innerHTML);
      if (html) {
        sections.push({ title: 'Child Clinical Proforma', html });
      }
    }
    if (childCapPrintRef.current) {
      const html = sanitizeSectionHtml(childCapPrintRef.current.innerHTML);
      if (html) {
        sections.push({ title: 'CAP Detailed Work-up Record', html });
      }
    }
    if (prescriptions.length > 0 || flatChildPrescriptionItems.length > 0) {
      const prescHtml = buildPrescriptionPrintDocument(
        childPatientForPrescriptionPrint,
        prescriptions,
        { flatMedications: flatChildPrescriptionItems, formatDate }
      );
      if (prescHtml) {
        sections.push({ title: 'Prescription', html: prescHtml });
      }
    } else if (childPrescriptionPrintRef.current) {
      const html = sanitizeSectionHtml(childPrescriptionPrintRef.current.innerHTML);
      if (html) {
        sections.push({ title: 'Prescription', html });
      }
    }

    if (!sections.length) {
      toast.error('No printable sections found');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow pop-ups to print this section');
      return;
    }

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

    const patientLabel = formData.child_name || 'Child Patient';
    const printContent = buildCombinedPrintDocument(
      sections,
      `Combined Child Patient Report - ${patientLabel}`,
      logoBase64
    );

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        toast.success('Combined print dialog opened');
      }, 500);
    };
  };
  
  // Helper function to convert date to IST date string (YYYY-MM-DD)
  const toISTDateString = (dateInput) => {
    try {
      if (!dateInput) return '';
      const d = new Date(dateInput);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    } catch (_) {
      return '';
    }
  };
  
  // Past History card (child view): follow-up visits only, grouped by calendar date (IST)
  const unifiedVisits = useMemo(() => {
    if (!isViewMode) return [];

    const visitsByDate = {};
    childFollowUps.forEach((followUp) => {
      if (!followUp) return;
      const visitDate = followUp.visit_date || followUp.created_at;
      if (!visitDate) return;
      const dateKey = toISTDateString(visitDate);
      if (!dateKey) return;

      if (!visitsByDate[dateKey]) {
        visitsByDate[dateKey] = [];
      }
      visitsByDate[dateKey].push({
        visitId: `followup-${followUp.id}`,
        visitDate,
        followUp: {
          ...followUp,
          child_patient_id: followUp.child_patient_id || id,
        },
      });
    });

    return Object.entries(visitsByDate)
      .map(([date, visits]) => ({
        visitDate: date,
        visits: [...visits].sort(
          (a, b) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime()
        ),
      }))
      .sort((a, b) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime());
  }, [childFollowUps, id, isViewMode]);

  // Load existing child patient data if ID is provided
  useEffect(() => {
    const loadChildPatientData = async () => {
      if (!id) return;

      setIsLoadingData(true);
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL || '/api'}/child-patient/${id}`,
          {
            headers: {
              'Authorization': token ? `Bearer ${token}` : '',
            },
            credentials: 'include'
          }
        );

        if (response.ok) {
          const data = await response.json();
          const childPatient = data.data?.childPatient || data.data?.child_patient;
          
          if (childPatient) {
            // Format seen_as_walk_in_on date properly
            let seenAsWalkInOn = childPatient.seen_as_walk_in_on;
            if (seenAsWalkInOn) {
              // If it's a date string, ensure it's in YYYY-MM-DD format
              if (typeof seenAsWalkInOn === 'string') {
                const date = new Date(seenAsWalkInOn);
                if (!isNaN(date.getTime())) {
                  seenAsWalkInOn = date.toISOString().split('T')[0];
                }
              } else if (seenAsWalkInOn instanceof Date) {
                seenAsWalkInOn = seenAsWalkInOn.toISOString().split('T')[0];
              }
            } else {
              seenAsWalkInOn = new Date().toISOString().split('T')[0];
            }
            
            setFormData({
              seen_as_walk_in_on: seenAsWalkInOn,
              cr_number: childPatient.cr_number || '',
              cgc_number: childPatient.cgc_number || '',
              address_line: childPatient.address_line || '',
              city_town_village: childPatient.city_town_village || '',
              district: childPatient.district || '',
              state: childPatient.state || '',
              country: childPatient.country || 'India',
              pincode: childPatient.pincode || '',
              child_name: childPatient.child_name || '',
              sex: childPatient.sex || '',
              mobile_no: childPatient.mobile_no || '',
              age: childPatient.age || '',
              age_group: childPatient.age_group || '',
              educational_status: childPatient.educational_status || '',
              occupational_status: childPatient.occupational_status || '',
              religion: childPatient.religion || '',
              head_name: childPatient.head_name || '',
              head_relationship: childPatient.head_relationship || '',
              head_age: childPatient.head_age || '',
              head_education: childPatient.head_education || '',
              head_occupation: childPatient.head_occupation || '',
              head_monthly_income: childPatient.head_monthly_income || '',
              locality: childPatient.locality || '',
              distance_travelled: childPatient.distance_travelled || '',
              source_of_referral: childPatient.source_of_referral || '',
              present_address_line: childPatient.present_address_line || '',
              present_city_town_village: childPatient.present_city_town_village || '',
              present_district: childPatient.present_district || '',
              present_state: childPatient.present_state || '',
              present_country: childPatient.present_country || 'India',
              present_pincode: childPatient.present_pincode || '',
              permanent_address_line: childPatient.permanent_address_line || '',
              permanent_city_town_village: childPatient.permanent_city_town_village || '',
              permanent_district: childPatient.permanent_district || '',
              permanent_state: childPatient.permanent_state || '',
              permanent_country: childPatient.permanent_country || 'India',
              permanent_pincode: childPatient.permanent_pincode || '',
              local_address_line: childPatient.local_address || '',
              local_city_town_village: '',
              local_district: '',
              local_state: '',
              local_country: 'India',
              local_pincode: '',
              assigned_room: childPatient.assigned_room || '',
              documents: Array.isArray(childPatient.documents) ? childPatient.documents : [],
              photo_path: childPatient.photo_path || '',
            });
          }
        }
      } catch (error) {
        console.error('Error loading child patient data:', error);
        toast.error('Failed to load child patient data');
      } finally {
        setIsLoadingData(false);
      }
    };

    loadChildPatientData();
  }, [id, token]);

  // Helper function to calculate age group from age (for children up to 15 years)
  const calculateAgeGroup = (age) => {
    const ageNum = parseInt(age, 10);
    if (isNaN(ageNum) || ageNum < 0) return '';
    
    if (ageNum === 0) return 'Less than 1 year';
    if (ageNum >= 1 && ageNum <= 5) return '1 – 5 years';
    if (ageNum >= 6 && ageNum <= 10) return '5 – 10 years';
    if (ageNum >= 11 && ageNum <= 15) return '10 – 15 years';
    return '';
  };

  const handleChange = (e) => {
    // Prevent changes in view mode
    if (isViewMode) {
      return;
    }
    
    const { name, value } = e.target;
    
    // Handle mobile number - only allow numeric input, max 10 digits
    if (name === 'mobile_no') {
      const numericValue = value.replace(/\D/g, '').slice(0, 10);
      setFormData(prev => ({
        ...prev,
        [name]: numericValue
      }));
      // Clear error for this field
      if (errors[name]) {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[name];
          return newErrors;
        });
      }
      return;
    }
    
    // Handle age - auto-calculate age group
    if (name === 'age') {
      const ageValue = value.replace(/\D/g, ''); // Only allow digits
      const ageGroup = calculateAgeGroup(ageValue);
      
      setFormData(prev => ({
        ...prev,
        [name]: ageValue,
        age_group: ageGroup // Auto-set age group
      }));
      
      // Clear errors
      if (errors[name] || errors.age_group) {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[name];
          delete newErrors.age_group;
          return newErrors;
        });
      }
      return;
    }
    
    // Handle age_group - if manually changed, clear age (to allow manual override)
    if (name === 'age_group') {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
      // Clear error for this field
      if (errors[name]) {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[name];
          return newErrors;
        });
      }
      return;
    }
    
    // Default handling for other fields
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // Auto-map Address Details to Present Address when Address Details fields are filled
  useEffect(() => {
    setFormData(prev => {
      const updates = {};
      
      // Only update if Address Details field has a value
      if (prev.address_line) {
        updates.present_address_line = prev.address_line;
      }
      if (prev.city_town_village) {
        updates.present_city_town_village = prev.city_town_village;
      }
      if (prev.district) {
        updates.present_district = prev.district;
      }
      if (prev.state) {
        updates.present_state = prev.state;
      }
      if (prev.country) {
        updates.present_country = prev.country;
      }
      if (prev.pincode) {
        updates.present_pincode = prev.pincode;
      }
      
      return Object.keys(updates).length > 0 ? { ...prev, ...updates } : prev;
    });
  }, [formData.address_line, formData.city_town_village, formData.district, formData.state, formData.country, formData.pincode]);

  // Sync permanent address with present address when checkbox is checked
  useEffect(() => {
    if (sameAsPresent) {
      setFormData(prev => ({
        ...prev,
        permanent_address_line: prev.present_address_line || '',
        permanent_city_town_village: prev.present_city_town_village || '',
        permanent_district: prev.present_district || '',
        permanent_state: prev.present_state || '',
        permanent_country: prev.present_country || 'India',
        permanent_pincode: prev.present_pincode || ''
      }));
    }
  }, [sameAsPresent, formData.present_address_line, formData.present_city_town_village, formData.present_district, formData.present_state, formData.present_country, formData.present_pincode]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.child_name || formData.child_name.trim() === '') {
      newErrors.child_name = 'Child name is required';
    }

    // Validate mobile number - must be exactly 10 digits (mandatory)
    if (!formData.mobile_no || formData.mobile_no.trim() === '') {
      newErrors.mobile_no = 'Mobile number is required';
    } else if (!/^\d{10}$/.test(formData.mobile_no)) {
      newErrors.mobile_no = 'Mobile number must be exactly 10 digits';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Prevent submission in view mode
    if (isViewMode) {
      toast.info('Form is in view mode. Click Edit to make changes.');
      return;
    }

    if (!validateForm()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsLoading(true);

    try {
      const formDataToSend = new FormData();

      // Add all form fields
      Object.keys(formData).forEach(key => {
        if (formData[key] !== null && formData[key] !== undefined && formData[key] !== '') {
          formDataToSend.append(key, formData[key]);
        }
      });

      // Add documents (use "files" field name as expected by backend)
      selectedDocuments.forEach((file, index) => {
        formDataToSend.append('files', file);
      });

      // Use same pattern as apiSlice - VITE_API_URL should already include /api
      const baseUrl = import.meta.env.VITE_API_URL || '/api';
      
      // Use PUT for edit mode, POST for create mode
      const method = isEditMode ? 'PUT' : 'POST';
      const url = isEditMode 
        ? `${baseUrl}/child-patient/${id}`
        : `${baseUrl}/child-patient/register`;
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: formDataToSend,
        credentials: 'include'
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || (isEditMode ? 'Failed to update child patient' : 'Failed to register child patient'));
      }

      toast.success(isEditMode ? 'Child patient updated successfully!' : 'Child patient registered successfully!');
      
      // Reset form
      setFormData({
        seen_as_walk_in_on: new Date().toISOString().split('T')[0],
        cr_number: '',
        cgc_number: '',
        address_line: '',
        city_town_village: '',
        district: '',
        state: '',
        country: 'India',
        pincode: '',
        child_name: '',
        sex: '',
        age_group: '',
        educational_status: '',
        occupational_status: '',
        religion: '',
        head_name: '',
        head_relationship: '',
        head_age: '',
        head_education: '',
        head_occupation: '',
        head_monthly_income: '',
        locality: '',
        distance_travelled: '',
        source_of_referral: '',
        present_address_line: '',
        present_city_town_village: '',
        present_district: '',
        present_state: '',
        present_country: 'India',
        present_pincode: '',
        permanent_address_line: '',
        permanent_city_town_village: '',
        permanent_district: '',
        permanent_state: '',
        permanent_country: 'India',
        permanent_pincode: '',
        local_address_line: '',
        local_city_town_village: '',
        local_district: '',
        local_state: '',
        local_country: 'India',
        local_pincode: '',
        assigned_room: '',
      });
      setSelectedDocuments([]);
      setErrors({});

      // Navigate to patients list or stay on page
      // navigate('/patients');
    } catch (error) {
      console.error('Error registering child patient:', error);
      toast.error(error.message || 'Failed to register child patient');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/patients');
  };

  const rooms = roomsData?.data?.rooms || [];

  return (
    <ReadOnlyToneProvider tone="neutral">
    <div
      className={
        usePatientViewShell
          ? VIEW_PAGE_SHELL_CLASS
          : useAdultEditShell
          ? 'space-y-6'
          : 'min-h-screen bg-gradient-to-br from-slate-100 via-blue-50/30 to-indigo-100/40 relative overflow-hidden'
      }
    >
      {!useAdultEditShell && !usePatientViewShell && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-400/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-400/20 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl" />
        </div>
      )}

      <div
        className={
          useAdultEditShell || usePatientViewShell
            ? 'relative w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6'
            : 'relative w-full px-4 sm:px-6 lg:px-8 py-6 lg:py-10 space-y-6 lg:space-y-8'
        }
      >
        {usePatientViewShell && !isMWO(currentUser?.role) && (
          <div className="flex flex-wrap items-center justify-between gap-4 w-full">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 tracking-wide">
                Patient Details
              </h1>
              <p className="text-gray-600 mt-2 text-base tracking-normal">
                View patient records (read-only)
              </p>
            </div>
            <Button
              variant="outline"
              className="no-print"
              onClick={handlePrintAllChildCards}
            >
              <FiPrinter className="h-4 w-4 mr-2" />
              Print All Cards
            </Button>
          </div>
        )}
        {useAdultEditShell && !isIntakeOnlyMode && (
          <div className="flex items-center gap-4 w-full">
            <div>
              <h1 className="text-3xl font-bold text-blue-800 drop-shadow-sm tracking-wide transition-colors hover:text-cyan-700">
                Edit Patient Details
              </h1>
              <p className="text-gray-600 mt-2 text-base tracking-normal">
                Update patient information
              </p>
            </div>
          </div>
        )}
        {/* Registration / view: always. Edit demographics: MWO only (others use proforma+intake below). */}
        {showChildRegistrationCard && (
          <Card variant={id ? 'solid' : 'glass'}>
            {/* Collapsible header: view, new registration, or edit (same expand key as body below) */}
            {isViewMode ? (
              <div
                className="flex items-center justify-between p-6 border-b border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => toggleCard('childPatientRegistration')}
              >
                <div className="flex items-center gap-4">
                  <div className={VIEW_SECTION_ICON.patient}>
                    <FiUsers className="h-6 w-6 text-slate-700" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      Child Patient Details
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {formData.child_name || 'Child Patient'} -{' '}
                      {formData.cr_number || 'N/A'}
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
                      handlePrintFromChildCard(
                        'childPatientRegistration',
                        childPatientDetailsPrintRef,
                        'Child Patient Details',
                        { stripDocuments: true }
                      );
                    }}
                  >
                    <FiPrinter className="h-4 w-4 mr-1" />
                    Print
                  </Button>
                  <div className="cursor-pointer">
                  {expandedCards.childPatientRegistration ? (
                    <FiChevronUp className="h-6 w-6 text-gray-500" />
                  ) : (
                    <FiChevronDown className="h-6 w-6 text-gray-500" />
                  )}
                </div>
                </div>
              </div>
            ) : (
              <div
                className="flex items-center justify-between p-6 border-b border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => toggleCard('childPatientRegistration')}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={
                      useAdultEditShell
                        ? 'p-3 bg-blue-100 rounded-lg'
                        : 'p-3 bg-gradient-to-br from-primary-100 to-primary-200 rounded-lg'
                    }
                  >
                    {useAdultEditShell ? (
                      <FiUser className="h-6 w-6 text-blue-600" />
                    ) : (
                      <FiUsers className="h-6 w-6 text-primary-600" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      {useAdultEditShell
                        ? 'Patient Details'
                        : isEditMode
                          ? 'Edit Child Patient'
                          : 'Child Guidance Clinic (CGC) - Child Patient Registration'}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {useAdultEditShell
                        ? `${formData.child_name || 'Patient'} - ${formData.cr_number || 'N/A'}`
                        : isEditMode
                          ? 'Update child patient registration details'
                          : 'Postgraduate Institute of Medical Education & Research, Chandigarh'}
                    </p>
                  </div>
                </div>
                <div className="cursor-pointer">
                  {expandedCards.childPatientRegistration ? (
                    <FiChevronUp className="h-6 w-6 text-gray-500" />
                  ) : (
                    <FiChevronDown className="h-6 w-6 text-gray-500" />
                  )}
                </div>
              </div>
            )}

            {expandedCards.childPatientRegistration && (
              !isViewMode ? (
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Visit Details & Identification Details - Single Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <DatePicker
                icon={<FiCalendar className="w-4 h-4" />}
                label="Seen as Walk-in On"
                name="seen_as_walk_in_on"
                value={formData.seen_as_walk_in_on}
                onChange={handleChange}
                defaultToday={true}
                disabled={isViewMode}
                readOnly={isViewMode}
              />
              <IconInput
                icon={<FiHash className="w-4 h-4" />}
                label="CR Number"
                name="cr_number"
                value={formData.cr_number}
                onChange={handleChange}
                placeholder="Enter CR number"
                error={errors.cr_number}
                readOnly={isViewMode}
                disabled={isViewMode}
                className={isViewMode ? "bg-gray-50 cursor-not-allowed" : ""}
              />
              <IconInput
                icon={<FiHash className="w-4 h-4" />}
                label="CGC Number"
                name="cgc_number"
                value={formData.cgc_number}
                onChange={handleChange}
                placeholder="Enter CGC number"
                error={errors.cgc_number}
                readOnly={isViewMode}
                disabled={isViewMode}
                className={isViewMode ? "bg-gray-50 cursor-not-allowed" : ""}
              />
            </div>

            {/* Address Details */}
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Address Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <IconInput
                icon={<FiMapPin className="w-4 h-4" />}
                label="Address Line"
                name="address_line"
                value={formData.address_line}
                onChange={handleChange}
                placeholder="Enter address"
                readOnly={isViewMode}
                disabled={isViewMode}
                className={isViewMode ? "bg-gray-50 cursor-not-allowed" : ""}
              />
              <IconInput
                icon={<FiMapPin className="w-4 h-4" />}
                label="City / Town / Village"
                name="city_town_village"
                value={formData.city_town_village}
                onChange={handleChange}
                placeholder="Enter city/town/village"
                readOnly={isViewMode}
                disabled={isViewMode}
                className={isViewMode ? "bg-gray-50 cursor-not-allowed" : ""}
              />
              <IconInput
                icon={<FiMapPin className="w-4 h-4" />}
                label="District"
                name="district"
                value={formData.district}
                onChange={handleChange}
                placeholder="Enter district"
                readOnly={isViewMode}
                disabled={isViewMode}
                className={isViewMode ? "bg-gray-50 cursor-not-allowed" : ""}
              />
              <Select
                icon={<FiGlobe className="w-4 h-4" />}
                label="State"
                name="state"
                value={formData.state}
                onChange={handleChange}
                options={INDIA_STATES}
                placeholder="Select state"
                searchable={true}
                disabled={isViewMode}
              />
              <IconInput
                icon={<FiGlobe className="w-4 h-4" />}
                label="Country"
                name="country"
                value={formData.country}
                onChange={handleChange}
                placeholder="Enter country"
                readOnly={isViewMode}
                disabled={isViewMode}
                className={isViewMode ? "bg-gray-50 cursor-not-allowed" : ""}
              />
              <IconInput
                icon={<FiHash className="w-4 h-4" />}
                label="Pincode"
                name="pincode"
                value={formData.pincode}
                onChange={handleChange}
                placeholder="Enter pincode"
                type="number"
                readOnly={isViewMode}
                disabled={isViewMode}
                className={isViewMode ? "bg-gray-50 cursor-not-allowed" : ""}
              />
              </div>
            </div>

            {/* Child Personal Information */}
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Child Personal Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <IconInput
                icon={<FiUser className="w-4 h-4" />}
                label={<span>Child Name <span className="text-red-500">*</span></span>}
                name="child_name"
                value={formData.child_name}
                onChange={handleChange}
                placeholder="Enter child name"
                error={errors.child_name}
                required
                readOnly={isViewMode}
                disabled={isViewMode}
                className={isViewMode ? "bg-gray-50 cursor-not-allowed" : ""}
              />
              <IconInput
                icon={<FiUser className="w-4 h-4" />}
                label={<span>Mobile No. <span className="text-red-500">*</span></span>}
                name="mobile_no"
                value={formData.mobile_no}
                onChange={handleChange}
                placeholder="Enter 10-digit mobile number"
                error={errors.mobile_no}
                required
                maxLength={10}
                type="tel"
                readOnly={isViewMode}
                disabled={isViewMode}
                className={isViewMode ? "bg-gray-50 cursor-not-allowed" : ""}
              />
              <Select
                icon={<FiUser className="w-4 h-4" />}
                label="Sex"
                name="sex"
                value={formData.sex}
                onChange={handleChange}
                options={CHILD_SEX_OPTIONS}
                placeholder="Select sex"
                disabled={isViewMode}
              />
              <IconInput
                icon={<FiCalendar className="w-4 h-4" />}
                label="Age"
                name="age"
                value={formData.age}
                onChange={handleChange}
                placeholder="Enter age (0-18)"
                error={errors.age}
                type="number"
                min="0"
                max="18"
                readOnly={isViewMode}
                disabled={isViewMode}
                className={isViewMode ? "bg-gray-50 cursor-not-allowed" : ""}
              />
              <Select
                icon={<FiUser className="w-4 h-4" />}
                label="Age Group"
                name="age_group"
                value={formData.age_group}
                onChange={handleChange}
                options={CHILD_AGE_GROUP_OPTIONS}
                placeholder={formData.age ? "Auto-selected from age" : "Select age group"}
                disabled={isViewMode || (formData.age && formData.age !== '' && formData.age != null)}
                className={formData.age && formData.age !== '' && formData.age != null ? "bg-gray-50 cursor-not-allowed" : ""}
                title={formData.age && formData.age !== '' && formData.age != null ? "Age group is auto-calculated from age" : ""}
              />
              <Select
                icon={<FiFileText className="w-4 h-4" />}
                label="Educational Status"
                name="educational_status"
                value={formData.educational_status}
                onChange={handleChange}
                options={CHILD_EDUCATIONAL_STATUS_OPTIONS}
                placeholder="Select educational status"
                disabled={isViewMode}
              />
              <Select
                icon={<FiFileText className="w-4 h-4" />}
                label="Occupational Status"
                name="occupational_status"
                value={formData.occupational_status}
                onChange={handleChange}
                options={CHILD_OCCUPATIONAL_STATUS_OPTIONS}
                placeholder="Select occupational status"
                disabled={isViewMode}
              />
              <Select
                icon={<FiFileText className="w-4 h-4" />}
                label="Religion"
                name="religion"
                value={formData.religion}
                onChange={handleChange}
                options={CHILD_RELIGION_OPTIONS}
                placeholder="Select religion"
                disabled={isViewMode}
              />
              </div>
            </div>

            {/* Head of Family Details */}
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Head of Family Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <IconInput
                icon={<FiUser className="w-4 h-4" />}
                label="Name"
                name="head_name"
                value={formData.head_name}
                onChange={handleChange}
                placeholder="Enter head of family name"
                readOnly={isViewMode}
                disabled={isViewMode}
                className={isViewMode ? "bg-gray-50 cursor-not-allowed" : ""}
              />
              <Select
                icon={<FiUser className="w-4 h-4" />}
                label="Relationship with Child"
                name="head_relationship"
                value={formData.head_relationship}
                onChange={handleChange}
                options={CHILD_HEAD_RELATIONSHIP_OPTIONS}
                placeholder="Select relationship"
                disabled={isViewMode}
              />
              <IconInput
                icon={<FiUser className="w-4 h-4" />}
                label="Age"
                name="head_age"
                value={formData.head_age}
                onChange={handleChange}
                placeholder="Enter age"
                type="number"
                readOnly={isViewMode}
                disabled={isViewMode}
                className={isViewMode ? "bg-gray-50 cursor-not-allowed" : ""}
              />
              <Select
                icon={<FiFileText className="w-4 h-4" />}
                label="Education"
                name="head_education"
                value={formData.head_education}
                onChange={handleChange}
                options={CHILD_HEAD_EDUCATION_OPTIONS}
                placeholder="Select education"
                disabled={isViewMode}
              />
              <Select
                icon={<FiFileText className="w-4 h-4" />}
                label="Occupation"
                name="head_occupation"
                value={formData.head_occupation}
                onChange={handleChange}
                options={CHILD_HEAD_OCCUPATION_OPTIONS}
                placeholder="Select occupation"
                disabled={isViewMode}
              />
              <Select
                icon={<FiFileText className="w-4 h-4" />}
                label="Monthly Income"
                name="head_monthly_income"
                value={formData.head_monthly_income}
                onChange={handleChange}
                options={CHILD_HEAD_MONTHLY_INCOME_OPTIONS}
                placeholder="Select monthly income"
                disabled={isViewMode}
              />
              </div>
            </div>

            {/* Locality, Distance, Referral */}
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Locality, Distance & Referral</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select
                icon={<FiMapPin className="w-4 h-4" />}
                label="Locality"
                name="locality"
                value={formData.locality}
                onChange={handleChange}
                options={CHILD_LOCALITY_OPTIONS}
                placeholder="Select locality"
                disabled={isViewMode}
              />
              <Select
                icon={<FiMapPin className="w-4 h-4" />}
                label="Distance Travelled"
                name="distance_travelled"
                value={formData.distance_travelled}
                onChange={handleChange}
                options={CHILD_DISTANCE_TRAVELLED_OPTIONS}
                placeholder="Select distance travelled"
                disabled={isViewMode}
              />
              <Select
                icon={<FiFileText className="w-4 h-4" />}
                label="Source of Referral"
                name="source_of_referral"
                value={formData.source_of_referral}
                onChange={handleChange}
                options={CHILD_SOURCE_OF_REFERRAL_OPTIONS}
                placeholder="Select source of referral"
                disabled={isViewMode}
              />
              </div>
            </div>

            {/* Address Information */}
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Address Information</h4>
              
              {/* Present Address */}
              <div className="mb-4">
                <h5 className="text-md font-semibold text-gray-800 mb-3">Present Address</h5>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <IconInput
                icon={<FiMapPin className="w-4 h-4" />}
                label="Present Address Line"
                name="present_address_line"
                value={formData.present_address_line}
                onChange={handleChange}
                placeholder="Enter present address"
                readOnly={isViewMode}
                disabled={isViewMode}
                className={isViewMode ? "bg-gray-50 cursor-not-allowed" : ""}
              />
              <IconInput
                icon={<FiMapPin className="w-4 h-4" />}
                label="Present City / Town / Village"
                name="present_city_town_village"
                value={formData.present_city_town_village}
                onChange={handleChange}
                placeholder="Enter city/town/village"
                readOnly={isViewMode}
                disabled={isViewMode}
                className={isViewMode ? "bg-gray-50 cursor-not-allowed" : ""}
              />
              <IconInput
                icon={<FiMapPin className="w-4 h-4" />}
                label="Present District"
                name="present_district"
                value={formData.present_district}
                onChange={handleChange}
                placeholder="Enter district"
                readOnly={isViewMode}
                disabled={isViewMode}
                className={isViewMode ? "bg-gray-50 cursor-not-allowed" : ""}
              />
              <Select
                icon={<FiGlobe className="w-4 h-4" />}
                label="Present State"
                name="present_state"
                value={formData.present_state}
                onChange={handleChange}
                options={INDIA_STATES}
                placeholder="Select state"
                searchable={true}
                disabled={isViewMode}
              />
              <IconInput
                icon={<FiGlobe className="w-4 h-4" />}
                label="Present Country"
                name="present_country"
                value={formData.present_country}
                onChange={handleChange}
                placeholder="Enter country"
                readOnly={isViewMode}
                disabled={isViewMode}
                className={isViewMode ? "bg-gray-50 cursor-not-allowed" : ""}
              />
              <IconInput
                icon={<FiHash className="w-4 h-4" />}
                label="Present Pincode"
                name="present_pincode"
                value={formData.present_pincode}
                onChange={handleChange}
                placeholder="Enter pincode"
                type="number"
                readOnly={isViewMode}
                disabled={isViewMode}
                className={isViewMode ? "bg-gray-50 cursor-not-allowed" : ""}
              />
                </div>
              </div>

              {/* Permanent Address */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-3">
                  <h5 className="text-md font-semibold text-gray-800">Permanent Address</h5>
              <label className={`flex items-center gap-2 text-sm text-gray-600 ${isViewMode ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                <input
                  type="checkbox"
                  checked={sameAsPresent}
                  onChange={(e) => setSameAsPresent(e.target.checked)}
                  className="rounded"
                  disabled={isViewMode}
                />
                  <span>Same as Present Address</span>
                </label>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <IconInput
                icon={<FiMapPin className="w-4 h-4" />}
                label="Permanent Address Line"
                name="permanent_address_line"
                value={formData.permanent_address_line}
                onChange={handleChange}
                placeholder="Enter permanent address"
                disabled={sameAsPresent || isViewMode}
                readOnly={isViewMode}
                className={isViewMode ? "bg-gray-50 cursor-not-allowed" : ""}
              />
              <IconInput
                icon={<FiMapPin className="w-4 h-4" />}
                label="Permanent City / Town / Village"
                name="permanent_city_town_village"
                value={formData.permanent_city_town_village}
                onChange={handleChange}
                placeholder="Enter city/town/village"
                disabled={sameAsPresent || isViewMode}
                readOnly={isViewMode}
                className={isViewMode ? "bg-gray-50 cursor-not-allowed" : ""}
              />
              <IconInput
                icon={<FiMapPin className="w-4 h-4" />}
                label="Permanent District"
                name="permanent_district"
                value={formData.permanent_district}
                onChange={handleChange}
                placeholder="Enter district"
                disabled={sameAsPresent || isViewMode}
                readOnly={isViewMode}
                className={isViewMode ? "bg-gray-50 cursor-not-allowed" : ""}
              />
              <Select
                icon={<FiGlobe className="w-4 h-4" />}
                label="Permanent State"
                name="permanent_state"
                value={formData.permanent_state}
                onChange={handleChange}
                options={INDIA_STATES}
                placeholder="Select state"
                disabled={sameAsPresent || isViewMode}
                searchable={true}
              />
              <IconInput
                icon={<FiGlobe className="w-4 h-4" />}
                label="Permanent Country"
                name="permanent_country"
                value={formData.permanent_country}
                onChange={handleChange}
                placeholder="Enter country"
                disabled={sameAsPresent || isViewMode}
                readOnly={isViewMode}
                className={isViewMode ? "bg-gray-50 cursor-not-allowed" : ""}
              />
              <IconInput
                icon={<FiHash className="w-4 h-4" />}
                label="Permanent Pincode"
                name="permanent_pincode"
                value={formData.permanent_pincode}
                onChange={handleChange}
                placeholder="Enter pincode"
                type="number"
                disabled={sameAsPresent || isViewMode}
                readOnly={isViewMode}
                className={isViewMode ? "bg-gray-50 cursor-not-allowed" : ""}
              />
              </div>
              </div>

              {/* Local Address */}
              <div className="mb-4">
                <h5 className="text-md font-semibold text-gray-800 mb-3">Local Address</h5>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-3">
                    <IconInput
                      icon={<FiMapPin className="w-4 h-4" />}
                      label="Local Address"
                      name="local_address_line"
                      value={formData.local_address_line}
                      onChange={handleChange}
                      placeholder="Enter local address manually"
                      readOnly={isViewMode}
                      disabled={isViewMode}
                      className={isViewMode ? "bg-gray-50 cursor-not-allowed" : ""}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Assigned Room */}
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Assigned Room</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select
                icon={<FiHome className="w-4 h-4" />}
                label="Assigned Room"
                name="assigned_room"
                value={formData.assigned_room}
                onChange={handleChange}
                options={rooms.map(room => ({
                  value: room.room_number,
                  label: `${room.room_number}${room.room_name ? ` - ${room.room_name}` : ''}`
                }))}
                placeholder="Select room"
                disabled={isViewMode}
              />
              </div>
            </div>

            {/* Patient Documents & Files */}
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Patient Documents & Files</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload Documents (PDF / Image)
                  </label>
                  <FileUpload
                    files={selectedDocuments}
                    onFilesChange={setSelectedDocuments}
                    maxFiles={20}
                    maxSizeMB={10}
                    accept=".pdf,.jpg,.jpeg,.png"
                    disabled={isViewMode}
                  />
                  {selectedDocuments.length > 0 && (
                    <p className="mt-2 text-sm text-gray-600">
                      {selectedDocuments.length} file(s) selected
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex flex-col sm:flex-row justify-end gap-4 mt-8">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                className="px-6 lg:px-8 py-3"
              >
                <FiX className="mr-2" />
                {isViewMode ? 'Back' : 'Cancel'}
              </Button>
              {isViewMode ? (
                <Button
                  type="button"
                  onClick={() => navigate(`/child-patient/${id}?mode=edit`)}
                  className="px-6 lg:px-8 py-3 bg-[#0ea5e9] hover:bg-[#0284c7] text-white font-bold shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  <FiEdit className="mr-2" />
                  Edit
                </Button>
              ) : (
                <Button
                  type="submit"
                  loading={isLoading}
                  disabled={isLoading || isLoadingData}
                  className={
                    useAdultEditShell
                      ? 'px-6 lg:px-8 py-3 bg-gradient-to-r from-primary-600 via-indigo-600 to-blue-600 hover:from-primary-700 hover:via-indigo-700 hover:to-blue-700 text-white font-bold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105'
                      : 'px-6 lg:px-8 py-3 bg-[#0ea5e9] hover:bg-[#0284c7] text-white font-bold shadow-lg hover:shadow-xl transition-all duration-200'
                  }
                >
                  <FiSave className="mr-2" />
                  {isLoading
                    ? isEditMode
                      ? 'Updating...'
                      : 'Registering...'
                    : isEditMode
                      ? useAdultEditShell
                        ? 'Update Patient'
                        : 'Update Child Patient'
                      : 'Register Child Patient'}
                </Button>
              )}
            </div>
          </form>
              ) : (
                <>
                  <div ref={childPatientDetailsPrintRef} className="space-y-6 p-6">
                    <ChildPatientRegistrationViewCards formData={formData} rooms={rooms} />
                    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                      <h4 className="mb-4 flex items-center gap-3 text-lg font-semibold text-gray-900">
                        <div className="rounded-lg bg-indigo-50 p-2">
                          <FiFileText className="h-5 w-5 text-indigo-600" />
                        </div>
                        Patient Documents & Files
                      </h4>
                      {childDocumentFilesForPreview.length === 0 ? (
                        <ViewEmptyMessage message="No Data Available" />
                      ) : (
                        <FilePreview
                          files={childDocumentFilesForPreview}
                          patient_id={id}
                          canDelete={false}
                          baseUrl={(import.meta.env.VITE_API_URL || '/api').replace(/\/api$/, '')}
                        />
                      )}
                    </div>
                  </div>
                  {!hideChildViewChromeForMWO && (
                    <div className="flex flex-col sm:flex-row justify-end gap-4 border-t border-gray-100 bg-white px-6 py-5">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleCancel}
                        className="px-6 lg:px-8 py-3"
                      >
                        <FiX className="mr-2" />
                        Back
                      </Button>
                    </div>
                  )}
                </>
              )
            )}
        </Card>
        )}

        {/* View mode (non-MWO): clinical stack for Today's Patients / view — mirrors edit cards, read-only */}
        {showChildClinicalSummaryInView && (
          <>
            <Card variant="solid">
              <div className="flex items-center justify-between p-6 border-b border-gray-200 hover:bg-gray-50 transition-colors">
                <div
                  className="flex cursor-pointer items-center gap-4 flex-1"
                  onClick={() => toggleCard('viewChildClinical')}
                >
                  <div className={VIEW_SECTION_ICON.clinical}>
                    <FiClipboard className="h-6 w-6 text-emerald-700" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Child Clinical Proforma</h3>
                    <p className="mt-1 text-sm text-gray-500">{walkInClinicalProformaSubtitle}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="no-print"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePrintFromChildCard(
                        'viewChildClinical',
                        childClinicalPrintRef,
                        'Child Clinical Proforma'
                      );
                    }}
                  >
                    <FiPrinter className="h-4 w-4 mr-1" />
                    Print
                  </Button>
                  <div className="cursor-pointer" onClick={() => toggleCard('viewChildClinical')}>
                    {expandedCards.viewChildClinical ? (
                      <FiChevronUp className="h-6 w-6 text-gray-500" />
                    ) : (
                      <FiChevronDown className="h-6 w-6 text-gray-500" />
                    )}
                  </div>
                </div>
              </div>
              {expandedCards.viewChildClinical && (
                <div ref={childClinicalPrintRef} className="p-6">
                  {isLoadingChildProformas ? (
                    <p className="text-sm text-gray-500">Loading…</p>
                  ) : childClinicalProformas.length === 0 ? (
                    <ViewEmptyMessage message="No Proforma Available" icon={FiClipboard} />
                  ) : (
                    <div className="space-y-10">
                      {[...childClinicalProformas]
                        .sort(
                          (a, b) =>
                            new Date(b.visit_date || b.created_at || 0) -
                            new Date(a.visit_date || a.created_at || 0)
                        )
                        .map((p, idx) => (
                          <div key={p.id}>
                            {idx > 0 && <div className="mb-10 border-t border-gray-200" />}
                            <div className="mb-4">
                              <p className="text-sm text-gray-600">
                                <span className="font-semibold text-gray-800">Record</span>{' '}
                                {formatDate(p.visit_date || p.created_at)}
                              </p>
                            </div>
                            <ChildClinicalProformaSummaryView proforma={p} hideTitleBlock />
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </Card>

            <Card variant="solid">
              <div className="flex items-center justify-between p-6 border-b border-gray-200 hover:bg-gray-50 transition-colors">
                <div
                  className="flex cursor-pointer items-center gap-4 flex-1"
                  onClick={() => toggleCard('viewIntake')}
                >
                  <div className={VIEW_SECTION_ICON.intake}>
                    <FiFolder className="h-6 w-6 text-violet-700" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">CAP Detailed Work-up Record</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Child & Adolescent Psychiatry detailed intake record
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
                      handlePrintFromChildCard(
                        'viewIntake',
                        childCapPrintRef,
                        'CAP Detailed Work-up Record'
                      );
                    }}
                  >
                    <FiPrinter className="h-4 w-4 mr-1" />
                    Print
                  </Button>
                  <div className="cursor-pointer" onClick={() => toggleCard('viewIntake')}>
                    {expandedCards.viewIntake ? (
                      <FiChevronUp className="h-6 w-6 text-gray-500" />
                    ) : (
                      <FiChevronDown className="h-6 w-6 text-gray-500" />
                    )}
                  </div>
                </div>
              </div>
              {expandedCards.viewIntake && (
                <div ref={childCapPrintRef} className="p-6">
                  {isLoadingChildCapWorkup ? (
                    <p className="text-sm text-gray-500">Loading…</p>
                  ) : childCapWorkupRecords.length === 0 ? (
                    <ViewEmptyMessage message="Form Not Yet Submitted" icon={FiFolder} />
                  ) : (
                    <EditChildCapWorkup
                      childPatientId={id}
                      isEmbedded
                      readOnlyView
                    />
                  )}
                </div>
              )}
            </Card>

            <Card variant="solid">
              <div className="flex items-center justify-between p-6 border-b border-gray-200 hover:bg-gray-50 transition-colors">
                <div
                  className="flex cursor-pointer items-center gap-4 flex-1"
                  onClick={() => toggleCard('viewPrescription')}
                >
                  <div className={VIEW_SECTION_ICON.prescription}>
                    <FiPackage className="h-6 w-6 text-amber-700" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Prescription</h3>
                    <p className="mt-1 text-sm text-gray-500">{prescriptionCardSubtitle}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="no-print"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!expandedCards.viewPrescription) {
                        setExpandedCards((prev) => ({ ...prev, viewPrescription: true }));
                        window.setTimeout(handlePrintChildPrescriptionView, 350);
                      } else {
                        handlePrintChildPrescriptionView();
                      }
                    }}
                  >
                    <FiPrinter className="h-4 w-4 mr-1" />
                    Print
                  </Button>
                  <div className="cursor-pointer" onClick={() => toggleCard('viewPrescription')}>
                    {expandedCards.viewPrescription ? (
                      <FiChevronUp className="h-6 w-6 text-gray-500" />
                    ) : (
                      <FiChevronDown className="h-6 w-6 text-gray-500" />
                    )}
                  </div>
                </div>
              </div>
              {expandedCards.viewPrescription && (
                <div ref={childPrescriptionPrintRef} className="p-6 print-prescription-screen-only">
                  {isLoadingPrescriptions ? (
                    <p className="text-sm text-gray-500">Loading…</p>
                  ) : flatChildPrescriptionItems.length === 0 ? (
                    <ViewEmptyMessage message="No Data Available" icon={FiPackage} />
                  ) : (
                    <PrescriptionView
                      prescription={flatChildPrescriptionItems}
                      patientId={id}
                    />
                  )}
                </div>
              )}
            </Card>
          </>
        )}

        {/* Edit mode (non-MWO): same card order & chrome as adult PatientDetailsEdit */}
        {showClinicalProformaAndIntakeInEdit && (
          <>
            {!isIntakeOnlyMode && (
            <Card variant="solid">
              <div
                className="flex items-center justify-between p-6 border-b border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <div
                  className="flex items-center gap-4 cursor-pointer flex-1"
                  onClick={() => toggleCard('childClinicalProforma')}
                >
                  <div className="p-3 bg-green-100 rounded-lg">
                    <FiClipboard className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Walk-in Clinical Proforma</h3>
                    <p className="text-sm text-gray-500 mt-1">{walkInClinicalProformaSubtitle}</p>
                  </div>
                </div>
                <div
                  className="cursor-pointer"
                  onClick={() => toggleCard('childClinicalProforma')}
                >
                  {expandedCards.childClinicalProforma ? (
                    <FiChevronUp className="h-6 w-6 text-gray-500" />
                  ) : (
                    <FiChevronDown className="h-6 w-6 text-gray-500" />
                  )}
                </div>
              </div>

              {expandedCards.childClinicalProforma && (
                <div className="p-6">
                  {isLoadingChildProformas ? (
                    <p className="text-sm text-gray-500">Loading…</p>
                  ) : isEditingChildWalkInProforma || !firstChildWalkInProforma ? (
                    <div className="space-y-4">
                      {firstChildWalkInProforma && isEditingChildWalkInProforma && (
                        <div className="flex justify-end">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setIsEditingChildWalkInProforma(false)}
                            className="flex items-center gap-1.5 bg-amber-50 border-amber-400 text-amber-800 hover:bg-amber-100"
                          >
                            <FiX className="w-3.5 h-3.5" />
                            Cancel Edit
                          </Button>
                        </div>
                      )}
                      <EditChildClinicalProforma
                        childPatientId={id}
                        onUpdate={() => setIsEditingChildWalkInProforma(false)}
                      />
                    </div>
                  ) : (
                    <div className="space-y-4 border-t border-gray-200 pt-6">
                      <h4 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-800">
                          First Visit
                        </span>
                        <span className="text-sm text-gray-500 font-normal">
                          {formatDate(
                            firstChildWalkInProforma.visit_date ||
                              firstChildWalkInProforma.created_at
                          )}
                        </span>
                      </h4>

                      <div className={VIEW_NESTED_PANEL_CLASS}>
                        <div className="flex items-start justify-between mb-4 gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2 flex-wrap">
                              <span className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-800">
                                First Visit
                              </span>
                            </div>
                            <div className="grid grid-cols-1 gap-3 mt-3">
                              {firstChildWalkInProforma.doctor_name && (
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <FiUser className="w-4 h-4 shrink-0" />
                                  <span>
                                    <span className="font-medium text-gray-800">Doctor:</span>{' '}
                                    {firstChildWalkInProforma.doctor_name}
                                  </span>
                                </div>
                              )}
                              {firstChildWalkInProforma.room_no && (
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <FiHome className="w-4 h-4 shrink-0" />
                                  <span>
                                    <span className="font-medium text-gray-800">Room:</span>{' '}
                                    {firstChildWalkInProforma.room_no}
                                  </span>
                                </div>
                              )}
                              {(firstChildWalkInProforma.provisional_diagnosis ||
                                firstChildWalkInProforma.diagnosis) && (
                                <div className="flex items-start gap-2 text-sm text-gray-600">
                                  <FiFileText className="w-4 h-4 mt-0.5 shrink-0" />
                                  <span>
                                    <span className="font-medium text-gray-800">Diagnosis:</span>{' '}
                                    {firstChildWalkInProforma.provisional_diagnosis ||
                                      firstChildWalkInProforma.diagnosis}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <Button
                              variant="outline"
                              size="sm"
                              type="button"
                              onClick={() =>
                                navigate(`/child-clinical-proformas/${firstChildWalkInProforma.id}`)
                              }
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs"
                            >
                              <FiEye className="w-3.5 h-3.5" />
                              View
                            </Button>
                            {isEditMode &&
                              canEditChildWalkInProforma && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  type="button"
                                  onClick={() => setIsEditingChildWalkInProforma(true)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-50 border-blue-400 text-blue-700 hover:bg-blue-100"
                                >
                                  <FiEdit3 className="w-3.5 h-3.5" />
                                  Edit Proforma
                                </Button>
                              )}
                          </div>
                        </div>

                        <div className="mt-4">
                          <ChildClinicalProformaSummaryView
                            proforma={firstChildWalkInProforma}
                            hideTitleBlock
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
            )}

            <Card variant="solid">
              <div
                className="flex items-center justify-between p-6 border-b border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <div
                  className="flex items-center gap-4 cursor-pointer flex-1"
                  onClick={() => toggleCard('intakeRecord')}
                >
                  <div className={VIEW_SECTION_ICON.intake}>
                    <FiFolder className="h-6 w-6 text-violet-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">CAP Detailed Work-up Record</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Child & Adolescent Psychiatry detailed intake record
                    </p>
                  </div>
                </div>
                <div
                  className="cursor-pointer"
                  onClick={() => toggleCard('intakeRecord')}
                >
                  {expandedCards.intakeRecord ? (
                    <FiChevronUp className="h-6 w-6 text-gray-500" />
                  ) : (
                    <FiChevronDown className="h-6 w-6 text-gray-500" />
                  )}
                </div>
              </div>

              {expandedCards.intakeRecord && (
                <div className="p-6">
                  <EditChildCapWorkup
                    isEmbedded={true}
                    childPatientId={id}
                    hideToolbar={isIntakeOnlyMode}
                    flatLayout={isIntakeOnlyMode}
                  />
                </div>
              )}
            </Card>

            {!isIntakeOnlyMode && (
            <Card variant="solid">
              <div
                className="flex items-center justify-between p-6 border-b border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <div
                  className="flex items-center gap-4 cursor-pointer flex-1"
                  onClick={() => toggleCard('prescription')}
                >
                  <div className="p-3 bg-amber-100 rounded-lg">
                    <FiPackage className="h-6 w-6 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Prescription</h3>
                    <p className="text-sm text-gray-500 mt-1">{prescriptionCardSubtitle}</p>
                  </div>
                </div>
                <div
                  className="cursor-pointer"
                  onClick={() => toggleCard('prescription')}
                >
                  {expandedCards.prescription ? (
                    <FiChevronUp className="h-6 w-6 text-gray-500" />
                  ) : (
                    <FiChevronDown className="h-6 w-6 text-gray-500" />
                  )}
                </div>
              </div>

              {expandedCards.prescription && (
                <div className="p-6">
                  {isLoadingPrescriptions ? (
                    <p className="text-sm text-gray-500">Loading prescriptions…</p>
                  ) : prescriptions.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 max-w-2xl mx-auto">
                        <FiPackage className="h-12 w-12 mx-auto mb-4 text-amber-500" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No prescriptions found</h3>
                        <p className="text-sm text-gray-600">
                          Prescriptions created for this patient will appear here after the walk-in clinical
                          proforma is saved.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <ul className="space-y-3">
                      {prescriptions.map((rec) => (
                        <li
                          key={rec.id || rec.prescription_record_id || JSON.stringify(rec.created_at)}
                          className="rounded-lg border border-gray-200 bg-gray-50/80 px-4 py-3 text-sm text-gray-800"
                        >
                          <span className="font-medium text-gray-900">
                            {formatDate(rec.visit_date || rec.created_at || rec.prescription_date)}
                          </span>
                          {Array.isArray(rec.prescription) && rec.prescription.length > 0 && (
                            <span className="text-gray-600">
                              {' '}
                              · {rec.prescription.length} medicine{rec.prescription.length > 1 ? 's' : ''}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </Card>
            )}
          </>
        )}
        
        {/* Past History Section - hidden for Psychiatric Welfare Officer (MWO) */}
        {id && isViewMode && !isMWO(currentUser?.role) && (
          <Card variant="solid" className="mt-6">
            <div
              className="flex items-center justify-between p-6 border-b border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <div 
                className="flex items-center gap-4 cursor-pointer flex-1"
                onClick={() => toggleCard('pastHistory')}
              >
                <div className={VIEW_SECTION_ICON.history}>
                  <FiClock className="h-6 w-6 text-slate-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Past History</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {childFollowUps.length > 0
                      ? `${childFollowUps.length} follow-up visit${childFollowUps.length !== 1 ? 's' : ''} on ${unifiedVisits.length} day${unifiedVisits.length !== 1 ? 's' : ''} — view only`
                      : 'No follow-up visits — view only'}
                    {childDocumentFilesForPreview.length > 0 && (
                      <span className="block sm:inline sm:before:content-['\00a0•\00a0'] mt-1 sm:mt-0 text-indigo-700">
                        {childDocumentFilesForPreview.length} document
                        {childDocumentFilesForPreview.length !== 1 ? 's' : ''} on file
                      </span>
                    )}
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
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
                  <h4 className="mb-2 flex items-center gap-2 text-lg font-bold text-gray-900">
                    <span className="rounded-lg bg-white border border-gray-200 p-2">
                      <FiFileText className="h-5 w-5 text-slate-600" />
                    </span>
                    Patient documents & files
                  </h4>
                  <p className="mb-4 text-sm text-gray-600">
                    Registration and follow-up uploads stored on this child&apos;s record (same files as in Patient Documents above).
                  </p>
                  {childDocumentFilesForPreview.length > 0 ? (
                    <FilePreview
                      files={childDocumentFilesForPreview}
                      patient_id={null}
                      canDelete={false}
                      baseUrl={(import.meta.env.VITE_API_URL || '/api').replace(/\/api$/, '')}
                    />
                  ) : (
                    <p className="rounded-lg border border-dashed border-gray-200 bg-white py-6 text-center text-sm text-gray-500">
                      No documents uploaded yet.
                    </p>
                  )}
                </div>

                {unifiedVisits.length > 0 ? (
                  <div className="space-y-6">
                    {unifiedVisits.map((visitGroup) => {
                      const visitDate = formatDate(visitGroup.visitDate);
                      const dateKey = visitGroup.visitDate;
                      const isDateExpanded = isVisitCardExpanded(`date-${dateKey}`);
                      const n = visitGroup.visits.length;

                      return (
                        <Card key={`date-${dateKey}`} className={viewDetailsCardClass}>
                          <div
                            className="flex items-center justify-between p-5 border-b border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
                            onClick={() => toggleVisitCard(`date-${dateKey}`)}
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
                            <div
                              className="cursor-pointer"
                              onClick={() => toggleVisitCard(`date-${dateKey}`)}
                            >
                              {isDateExpanded ? (
                                <FiChevronUp className="h-6 w-6 text-gray-500" />
                              ) : (
                                <FiChevronDown className="h-6 w-6 text-gray-500" />
                              )}
                            </div>
                          </div>

                          {isDateExpanded && (
                            <div className="space-y-4 p-6">
                              {visitGroup.visits.map(({ visitId, followUp }) => (
                                <div
                                  key={visitId}
                                  className="rounded-lg border border-gray-200 bg-gray-50 p-4"
                                >
                                  <h5 className="mb-3 flex items-center gap-2 text-base font-semibold text-gray-900">
                                    <FiFileText className="h-4 w-4 text-slate-600" />
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
                                    {followUp.assigned_doctor_name && (
                                      <div>
                                        <p className="mb-1 text-gray-500">Assigned doctor</p>
                                        <p className="font-medium text-gray-900">
                                          {followUp.assigned_doctor_name}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                  {followUp.clinical_assessment ? (
                                    <div className="mt-3">
                                      <p className="mb-2 text-sm font-medium text-gray-500">Notes</p>
                                      <div className="min-h-[60px] whitespace-pre-wrap rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-900">
                                        {followUp.clinical_assessment}
                                      </div>
                                    </div>
                                  ) : (
                                    <p className="mt-3 text-sm italic text-gray-500">No notes recorded.</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <div className="mx-auto max-w-2xl rounded-lg border border-gray-200 bg-gray-50 p-6">
                      <FiFileText className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                      <h3 className="mb-2 text-lg font-semibold text-gray-900">No follow-up history</h3>
                      <p className="text-sm text-gray-600">
                        This child patient has no follow-up visits recorded yet.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
    </ReadOnlyToneProvider>
  );
};

export default CreateChildPatient;
