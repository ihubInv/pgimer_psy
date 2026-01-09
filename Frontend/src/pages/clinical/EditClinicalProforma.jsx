import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  useGetClinicalProformaByIdQuery,
  useUpdateClinicalProformaMutation,
  useCreateClinicalProformaMutation,
  useGetAllClinicalOptionsQuery,
  useGetClinicalOptionsQuery,
  useAddClinicalOptionMutation,
  useUpdateClinicalOptionMutation,
  useDeleteClinicalOptionMutation,
  useGetAllClinicalProformasQuery
} from '../../features/clinical/clinicalApiSlice';
import { useGetADLFileByIdQuery, useGetAllADLFilesQuery,useUpdateADLFileMutation, useCreateADLFileMutation } from '../../features/adl/adlApiSlice';
import { useGetPatientByIdQuery, useGetPatientVisitHistoryQuery } from '../../features/patients/patientsApiSlice';
import { useGetClinicalProformaByPatientIdQuery } from '../../features/clinical/clinicalApiSlice';
import { useGetDoctorsQuery } from '../../features/users/usersApiSlice';
import { useGetPatientFilesQuery, useUpdatePatientFilesMutation, useCreatePatientFilesMutation } from '../../features/patients/patientFilesApiSlice';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../../features/auth/authSlice';
import { CLINICAL_PROFORMA_FORM, VISIT_TYPES, DOCTOR_DECISION, CASE_SEVERITY } from '../../utils/constants';
import LoadingSpinner from '../../components/LoadingSpinner';
import Card from '../../components/Card';
import Input from '../../components/Input';
import Select from '../../components/Select';
import Textarea from '../../components/Textarea';
import Button from '../../components/Button';
import { FiArrowLeft, FiAlertCircle, FiSave, FiHeart, FiActivity, FiUser, FiClipboard, FiList, FiCheckSquare, FiFileText, FiX, FiPlus, FiChevronDown, FiChevronUp, FiCalendar, FiPrinter } from 'react-icons/fi';
import icd11Codes from '../../assets/ICD11_Codes.json';
import { useUpdatePrescriptionMutation,useGetAllPrescriptionQuery, useCreatePrescriptionMutation } from '../../features/prescriptions/prescriptionApiSlice';
import PrescriptionEdit from '../PrescribeMedication/PrescriptionEdit';
import EditADL from '../adl/EditADL';
import DatePicker from '../../components/CustomDatePicker';
import { IconInput } from '../../components/IconInput';
import { CheckboxGroup } from '../../components/CheckboxGroup';
import { ICD11CodeSelector } from '../../components/ICD11CodeSelector';
import FileUpload from '../../components/FileUpload';
import FilePreview from '../../components/FilePreview';
import PatientClinicalHistory from '../../components/PatientClinicalHistory';



const EditClinicalProforma = ({ initialData: propInitialData = null, onUpdate: propOnUpdate = null, onFormDataChange = null, hideFileUpload = false }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTab = searchParams.get('returnTab');
  const returnPath = searchParams.get('returnPath');
  const mode = searchParams.get('mode'); // 'create' or 'update' from URL
  const isFollowUpMode = searchParams.get('followup') === 'true'; // Follow-up mode - only show Clinical Assessment and Prescription
  const [createPrescriptions, { isLoading: isSavingPrescriptions }] = useCreatePrescriptionMutation();

  const { data: proformaData, isLoading: isLoadingProforma, isFetching, refetch, error: proformaError } = useGetAllClinicalProformasQuery({});

  // Convert id to number for comparison since patient_id is a number
  // URL params return strings, but patient_id in database is integer
  const patientIdFromUrl = id ? parseInt(id, 10) : null;
  const proforma = proformaData?.data?.proformas?.find(p => p.patient_id === patientIdFromUrl);
  const isErrorProforma = !!proformaError;
  const isComplexCase = proforma?.doctor_decision === 'complex_case' && proforma?.adl_file_id;

  // Check if the case is already marked as complex (from original data, not form state)
  // This determines if we should disable the doctor_decision dropdown
  // Only disable if case is already complex AND has an ADL file (to prevent changing from complex to simple)
  // Allow changing from simple to complex (no ADL file exists yet)
  // Explicitly check for truthy adl_file_id (not null, undefined, 0, or empty string)
  const hasAdlFile = (id) => id !== null && id !== undefined && id !== 0 && id !== '';
  const isAlreadyComplex = (proforma?.doctor_decision === 'complex_case' && hasAdlFile(proforma?.adl_file_id)) || 
                           (propInitialData?.doctor_decision === 'complex_case' && hasAdlFile(propInitialData?.adl_file_id));
  

  // Determine if this is create or update mode
  // Priority:
  // 1. If mode parameter is explicitly set in URL, use it
  // 2. If propInitialData has an id (embedded in PatientDetailsEdit with existing proforma) → Update
  // 3. If id exists in URL and proforma exists → Update
  // 4. Otherwise → Create
  const isUpdateMode = mode === 'update' ||
    (mode !== 'create' && (
      (propInitialData?.id) || // Embedded mode with existing proforma
      (id && proforma) // Standalone mode with existing proforma
    ));

  // Fetch ADL file data if this is a complex case
  const {
    data: adlFileData,
    isLoading: isLoadingADL
  } = useGetADLFileByIdQuery(
    proforma?.adl_file_id,
    { skip: !isComplexCase }
  );

  // Fetch patient data - use patient_id from propInitialData or proforma or URL
  const patientId = propInitialData?.patient_id || proforma?.patient_id || patientIdFromUrl;
  const { data: patientData } = useGetPatientByIdQuery(
    patientId,
    { skip: !patientId }
  );
  const patient = patientData?.data?.patient;

  // Fetch visit history and clinical proformas for existing patients in create mode
  const isCreateMode = mode === 'create' || (!isUpdateMode && !propInitialData?.id);
  const { data: visitHistoryData, isLoading: isLoadingVisitHistory } = useGetPatientVisitHistoryQuery(
    patientId,
    { skip: !patientId || !isCreateMode || !!propInitialData } // Skip if embedded (handled by parent)
  );
  const { data: patientClinicalData } = useGetClinicalProformaByPatientIdQuery(
    patientId,
    { skip: !patientId || !isCreateMode || !!propInitialData } // Skip if embedded (handled by parent)
  );
  const visitHistory = visitHistoryData || [];
  const patientProformas = patientClinicalData?.data?.proformas || [];
  const hasHistory = visitHistory.length > 0 || patientProformas.length > 0;

  // State to control showing history vs form
  const [showProformaForm, setShowProformaForm] = useState(() => {
    // If embedded (has propInitialData), always show form
    if (propInitialData) return true;
    // Otherwise show form directly initially, will update when data loads
    return true;
  });

  // Update showProformaForm when history data loads
  useEffect(() => {
    if (!propInitialData && isCreateMode) {
      // If we have history data and haven't shown form yet, show history first
      if (hasHistory && showProformaForm) {
        setShowProformaForm(false);
      }
      // If no history and we're showing history, switch to form
      else if (!hasHistory && !showProformaForm && !isLoadingVisitHistory) {
        setShowProformaForm(true);
      }
    }
  }, [hasHistory, isCreateMode, propInitialData, isLoadingVisitHistory, showProformaForm]);

  const { data: existingAdlFileData } = useGetAllADLFilesQuery({});

  const existingAdlFile = existingAdlFileData?.data?.files?.find(f => f.patient_id === patient?.id && f.clinical_proforma_id === proforma?.id);

  const { data: existingPrescriptionData } = useGetAllPrescriptionQuery({});

  const existingPrescription = existingPrescriptionData?.data?.prescriptions?.find(p => p.patient_id === patient?.id && p.clinical_proforma_id === proforma?.id);

  const { data: doctorsData } = useGetDoctorsQuery({ page: 1, limit: 100 });
  const doctors = doctorsData?.data?.doctors || [];

  // Update and Create mutations
  const [updateProforma, { isLoading: isUpdating }] = useUpdateClinicalProformaMutation();
  const [createProforma, { isLoading: isCreating }] = useCreateClinicalProformaMutation();
  const [createADLFile, { isLoading: isCreatingADLFile }] = useCreateADLFileMutation();

  


  const normalizeArrayField = (value) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      // First try to parse as JSON
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : (parsed ? [parsed] : []);
      } catch {
        // If not JSON, check if it's a comma-separated string
        if (value.includes(',')) {
          // Split by comma and trim each item
          return value.split(',').map(item => item.trim()).filter(item => item.length > 0);
        }
        // Single value string
        return value.trim() ? [value.trim()] : [];
      }
    }
    return value ? [value] : [];
  };

  // Prepare initial form data - return default values if proforma not found
  const initialFormData = useMemo(() => {
    // If initialData prop is provided, use it (merge with defaults)
    if (propInitialData) {


      // Helper to get value, preserving null/undefined but defaulting empty strings
      const getValue = (val, fallback = '') => {
        if (val === null || val === undefined) return fallback;
        if (typeof val === 'string' && val.trim() === '') return fallback;
        return val;
      };

      // Helper to format date
      const formatDate = (dateVal) => {
        if (!dateVal) return new Date().toISOString().split('T')[0];
        if (typeof dateVal === 'string') {
          // If it's already in YYYY-MM-DD format, return as-is
          if (/^\d{4}-\d{2}-\d{2}$/.test(dateVal)) return dateVal;
          // If it's a full ISO string, extract date part
          if (dateVal.includes('T')) return dateVal.split('T')[0];
          return dateVal;
        }
        return new Date().toISOString().split('T')[0];
      };

      return {
        patient_id: getValue(propInitialData.patient_id),
        visit_date: formatDate(propInitialData.visit_date),
        visit_type: getValue(propInitialData.visit_type, 'first_visit'),
        room_no: getValue(propInitialData.room_no),
        assigned_doctor: getValue(propInitialData.assigned_doctor),
        informant_present: propInitialData.informant_present ?? true,
        nature_of_information: normalizeArrayField(propInitialData.nature_of_information),
        onset_duration: getValue(propInitialData.onset_duration),
        course: getValue(propInitialData.course),
        precipitating_factor: getValue(propInitialData.precipitating_factor),
        illness_duration: getValue(propInitialData.illness_duration),
        current_episode_since: formatDate(propInitialData.current_episode_since),
        mood: normalizeArrayField(propInitialData.mood),
        mood_notes: getValue(propInitialData.mood_notes),
        behaviour: normalizeArrayField(propInitialData.behaviour),
        behaviour_notes: getValue(propInitialData.behaviour_notes),
        speech: normalizeArrayField(propInitialData.speech),
        speech_notes: getValue(propInitialData.speech_notes),
        thought: normalizeArrayField(propInitialData.thought),
        thought_notes: getValue(propInitialData.thought_notes),
        perception: normalizeArrayField(propInitialData.perception),
        perception_notes: getValue(propInitialData.perception_notes),
        somatic: normalizeArrayField(propInitialData.somatic),
        somatic_notes: getValue(propInitialData.somatic_notes),
        bio_functions: normalizeArrayField(propInitialData.bio_functions),
        bio_functions_notes: getValue(propInitialData.bio_functions_notes),
        adjustment: normalizeArrayField(propInitialData.adjustment),
        adjustment_notes: getValue(propInitialData.adjustment_notes),
        cognitive_function: normalizeArrayField(propInitialData.cognitive_function),
        cognitive_function_notes: getValue(propInitialData.cognitive_function_notes),
        fits: normalizeArrayField(propInitialData.fits),
        fits_notes: getValue(propInitialData.fits_notes),
        sexual_problem: normalizeArrayField(propInitialData.sexual_problem),
        sexual_problem_notes: getValue(propInitialData.sexual_problem_notes),
        substance_use: normalizeArrayField(propInitialData.substance_use),
        substance_use_notes: getValue(propInitialData.substance_use_notes),
        present_history: getValue(propInitialData.present_history),
        past_history: getValue(propInitialData.past_history),
        treatment_history: getValue(propInitialData.treatment_history),
        family_history: getValue(propInitialData.family_history),
        associated_medical_surgical: normalizeArrayField(propInitialData.associated_medical_surgical),
        associated_medical_surgical_notes: getValue(propInitialData.associated_medical_surgical_notes),
        mse_behaviour: normalizeArrayField(propInitialData.mse_behaviour),
        mse_behaviour_notes: getValue(propInitialData.mse_behaviour_notes),
        mse_affect: normalizeArrayField(propInitialData.mse_affect),
        mse_affect_notes: getValue(propInitialData.mse_affect_notes),
        mse_thought: getValue(propInitialData.mse_thought),
        mse_thought_notes: getValue(propInitialData.mse_thought_notes),
        mse_delusions: getValue(propInitialData.mse_delusions),
        mse_perception: normalizeArrayField(propInitialData.mse_perception),
        mse_perception_notes: getValue(propInitialData.mse_perception_notes),
        mse_cognitive_function: normalizeArrayField(propInitialData.mse_cognitive_function),
        mse_cognitive_function_notes: getValue(propInitialData.mse_cognitive_function_notes),
        gpe: getValue(propInitialData.gpe),
        diagnosis: getValue(propInitialData.diagnosis),
        icd_code: getValue(propInitialData.icd_code),
        disposal: getValue(propInitialData.disposal),
        workup_appointment: formatDate(propInitialData.workup_appointment),
        referred_to: getValue(propInitialData.referred_to),
        treatment_prescribed: getValue(propInitialData.treatment_prescribed),
        // If case is already complex (has ADL file), always use 'complex_case', otherwise use provided value or default to 'simple_case'
        doctor_decision: (propInitialData?.doctor_decision === 'complex_case' && (propInitialData?.adl_file_id !== null && propInitialData?.adl_file_id !== undefined && propInitialData?.adl_file_id !== 0 && propInitialData?.adl_file_id !== '')) 
          ? 'complex_case' 
          : getValue(propInitialData.doctor_decision, 'simple_case'),
        // case_severity: getValue(propInitialData.case_severity),
        // requires_adl_file: propInitialData.requires_adl_file ?? false,
        // adl_reasoning: getValue(propInitialData.adl_reasoning),
      };
    }

    // If no proforma, return default empty form data
    if (!proforma) {
      return {
        patient_id: patientId?.toString() || '',
        visit_date: new Date().toISOString().split('T')[0],
        visit_type: isFollowUpMode ? 'follow_up' : 'first_visit',
        room_no: '',
        assigned_doctor: '',
        informant_present: true,
        nature_of_information: [],
        onset_duration: '',
        course: '',
        precipitating_factor: '',
        illness_duration: '',
        current_episode_since: '',
        mood: [],
        mood_notes: '',
        behaviour: [],
        behaviour_notes: '',
        speech: [],
        speech_notes: '',
        thought: [],
        thought_notes: '',
        perception: [],
        perception_notes: '',
        somatic: [],
        somatic_notes: '',
        bio_functions: [],
        bio_functions_notes: '',
        adjustment: [],
        adjustment_notes: '',
        cognitive_function: [],
        cognitive_function_notes: '',
        fits: [],
        fits_notes: '',
        sexual_problem: [],
        sexual_problem_notes: '',
        substance_use: [],
        substance_use_notes: '',
        present_history: '',
        past_history: '',
        treatment_history: '',
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
      };
    }

    const baseData = {
      patient_id: proforma.patient_id?.toString() || '',
      visit_date: proforma.visit_date || new Date().toISOString().split('T')[0],
      visit_type: proforma.visit_type || 'first_visit',
      room_no: proforma.room_no || '',
      assigned_doctor: proforma.assigned_doctor?.toString() || '',
      informant_present: proforma.informant_present ?? true,
      informant_who: proforma.informant_who || '',
      nature_of_information: normalizeArrayField(proforma.nature_of_information),
      onset_duration: proforma.onset_duration || '',
      course: proforma.course || '',
      precipitating_factor: proforma.precipitating_factor || '',
      illness_duration: proforma.illness_duration || '',
      current_episode_since: proforma.current_episode_since || '',
      mood: normalizeArrayField(proforma.mood),
      mood_notes: proforma.mood_notes || '',
      behaviour: normalizeArrayField(proforma.behaviour),
      behaviour_notes: proforma.behaviour_notes || '',
      speech: normalizeArrayField(proforma.speech),
      speech_notes: proforma.speech_notes || '',
      thought: normalizeArrayField(proforma.thought),
      thought_notes: proforma.thought_notes || '',
      perception: normalizeArrayField(proforma.perception),
      perception_notes: proforma.perception_notes || '',
      somatic: normalizeArrayField(proforma.somatic),
      somatic_notes: proforma.somatic_notes || '',
      bio_functions: normalizeArrayField(proforma.bio_functions),
      bio_functions_notes: proforma.bio_functions_notes || '',
      adjustment: normalizeArrayField(proforma.adjustment),
      adjustment_notes: proforma.adjustment_notes || '',
      cognitive_function: normalizeArrayField(proforma.cognitive_function),
      cognitive_function_notes: proforma.cognitive_function_notes || '',
      fits: normalizeArrayField(proforma.fits),
      fits_notes: proforma.fits_notes || '',
      sexual_problem: normalizeArrayField(proforma.sexual_problem),
      sexual_problem_notes: proforma.sexual_problem_notes || '',
      substance_use: normalizeArrayField(proforma.substance_use),
      substance_use_notes: proforma.substance_use_notes || '',
      present_history: proforma.present_history || '',
      past_history: proforma.past_history || '',
      treatment_history: proforma.treatment_history || '',
      family_history: proforma.family_history || '',
      associated_medical_surgical: normalizeArrayField(proforma.associated_medical_surgical),
      associated_medical_surgical_notes: proforma.associated_medical_surgical_notes || '',
      mse_behaviour: normalizeArrayField(proforma.mse_behaviour),
      mse_behaviour_notes: proforma.mse_behaviour_notes || '',
      mse_affect: normalizeArrayField(proforma.mse_affect),
      mse_affect_notes: proforma.mse_affect_notes || '',
      mse_thought: proforma.mse_thought || '',
      mse_thought_notes: proforma.mse_thought_notes || '',
      mse_delusions: proforma.mse_delusions || '',
      mse_perception: normalizeArrayField(proforma.mse_perception),
      mse_perception_notes: proforma.mse_perception_notes || '',
      mse_cognitive_function: normalizeArrayField(proforma.mse_cognitive_function),
      mse_cognitive_function_notes: proforma.mse_cognitive_function_notes || '',
      gpe: proforma.gpe || '',
      diagnosis: proforma.diagnosis || '',
      icd_code: proforma.icd_code || '',
      disposal: proforma.disposal || '',
      workup_appointment: proforma.workup_appointment || '',
      referred_to: proforma.referred_to || '',
      treatment_prescribed: proforma.treatment_prescribed || '',
      doctor_decision: proforma.doctor_decision || 'simple_case',
    };

    return baseData;
  }, [proforma, propInitialData]);

  // Initialize with default empty values if initialFormData is not ready
  const defaultFormData = {
    patient_id: patientId?.toString() || '',
    visit_date: new Date().toISOString().split('T')[0],
    visit_type: isFollowUpMode ? 'follow_up' : 'first_visit',
    room_no: '',
    assigned_doctor: '',
    informant_present: true,
    informant_who: '',
    nature_of_information: [],
    onset_duration: '',
    course: '',
    precipitating_factor: '',
    illness_duration: '',
    current_episode_since: '',
    mood: [],
    mood_notes: '',
    behaviour: [],
    behaviour_notes: '',
    speech: [],
    speech_notes: '',
    thought: [],
    thought_notes: '',
    perception: [],
    perception_notes: '',
    somatic: [],
    somatic_notes: '',
    bio_functions: [],
    bio_functions_notes: '',
    adjustment: [],
    adjustment_notes: '',
    cognitive_function: [],
    cognitive_function_notes: '',
    fits: [],
    fits_notes: '',
    sexual_problem: [],
    sexual_problem_notes: '',
    substance_use: [],
    substance_use_notes: '',
    present_history: '',
    past_history: '',
    treatment_history: '',
    family_history: '',
    associated_medical_surgical: [],
    associated_medical_surgical_notes: '',
    mse_behaviour: [],
    mse_behaviour_notes: '',
    mse_affect: [],
    mse_affect_notes: '',
    mse_thought: '',
    mse_thought_notes: '',
    mse_delusions: '',
    mse_perception: [],
    mse_perception_notes: '',
    mse_cognitive_function: [],
    mse_cognitive_function_notes: '',
    gpe: '',
    diagnosis: '',
    icd_code: '',
    disposal: '',
    workup_appointment: '',
    referred_to: '',
    treatment_prescribed: '',
    doctor_decision: 'simple_case',
  };

  // Initialize form data - ensure visit_type is set correctly for follow-up mode
  const initialFormDataWithFollowUp = useMemo(() => {
    const data = initialFormData || defaultFormData;
    if (isFollowUpMode && patientId) {
      return {
        ...data,
        patient_id: patientId.toString(),
        visit_type: 'follow_up',
        visit_date: new Date().toISOString().split('T')[0],
      };
    }
    return data;
  }, [initialFormData, isFollowUpMode, patientId]);

  const [formData, setFormData] = useState(initialFormDataWithFollowUp);
  const [errors, setErrors] = useState({});
  const currentUser = useSelector(selectCurrentUser);
  
  // Ref to track the latest formData to ensure we always use current values in submit
  const formDataRef = useRef(formData);
  
  // Update ref whenever formData changes
  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);

  // Debug logging (moved here after formData is defined)
  useEffect(() => {
 
  }, [proforma?.doctor_decision, propInitialData?.doctor_decision, proforma?.adl_file_id, propInitialData?.adl_file_id, isAlreadyComplex, formData?.doctor_decision]);

  // File upload state
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [filesToRemove, setFilesToRemove] = useState([]);
  const { data: patientFilesData, refetch: refetchFiles } = useGetPatientFilesQuery(patientId, {
    skip: !patientId,
    refetchOnMountOrArgChange: true
  });
  const [updatePatientFiles, { isLoading: isUploadingFiles }] = useUpdatePatientFilesMutation();
  const [createPatientFiles] = useCreatePatientFilesMutation();
  
  // Get existing files from API
  const existingFiles = patientFilesData?.data?.files || [];
  const canEditFiles = patientFilesData?.data?.can_edit !== false;
  
  // Debug: Log files data
  useEffect(() => {
  }, [patientFilesData, existingFiles]);

  // Card expand/collapse state - persist in localStorage
  const getInitialExpandedCards = () => {
    try {
      const saved = localStorage.getItem('clinicalProformaExpandedCards');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          clinicalProforma: parsed.clinicalProforma !== false, // Default to true if not explicitly false
          adlfile: parsed.adlfile !== false,
          prescription: parsed.prescription !== false,
        };
      }
    } catch (e) {
      console.error('Error loading expanded cards state:', e);
    }
    return {
      clinicalProforma: true, // Default to expanded
      adlfile: true,
      prescription: true,
    };
  };

  const [expandedCards, setExpandedCards] = useState(getInitialExpandedCards);

  const toggleCard = (cardName) => {
    setExpandedCards(prev => {
      const updated = { ...prev, [cardName]: !prev[cardName] };
      // Persist to localStorage
      try {
        localStorage.setItem('clinicalProformaExpandedCards', JSON.stringify(updated));
      } catch (e) {
        console.error('Error saving expanded cards state:', e);
      }
      return updated;
    });
  };

  // Print functionality for Walk-in Clinical Proforma section
  const printSectionRef = useRef(null);
  
  const handlePrintSection = (sectionName) => {
    if (!printSectionRef.current) return;

    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow pop-ups to print this section');
      return;
    }

    // Get the section content
    const sectionElement = printSectionRef.current;
    const sectionHTML = sectionElement.innerHTML;

    // Create print-friendly HTML
    // Determine color scheme based on section name
    const getColorScheme = (section) => {
      if (section.includes('Patient Details') || section.includes('Patient')) {
        return {
          border: '#2563eb',
          bg: '#f8fafc',
          text: '#1e40af',
          headerBg: 'linear-gradient(to bottom, #f8fafc, #ffffff)',
          tableHeader: '#1e40af',
          tableEven: '#f8fafc'
        };
      } else if (section.includes('Clinical Proforma') || section.includes('Walk-in')) {
        return {
          border: '#059669',
          bg: '#f0fdf4',
          text: '#047857',
          headerBg: 'linear-gradient(to bottom, #f0fdf4, #ffffff)',
          tableHeader: '#047857',
          tableEven: '#f0fdf4'
        };
      } else if (section.includes('ADL') || section.includes('Intake')) {
        return {
          border: '#7c3aed',
          bg: '#faf5ff',
          text: '#6d28d9',
          headerBg: 'linear-gradient(to bottom, #faf5ff, #ffffff)',
          tableHeader: '#6d28d9',
          tableEven: '#faf5ff'
        };
      } else {
        return {
          border: '#d97706',
          bg: '#fffbeb',
          text: '#b45309',
          headerBg: 'linear-gradient(to bottom, #fffbeb, #ffffff)',
          tableHeader: '#b45309',
          tableEven: '#fffbeb'
        };
      }
    };
    
    const colors = getColorScheme(sectionName);
    
    const printContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${sectionName} - ${patient?.name || 'Patient'}</title>
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
      border-bottom: 4px solid ${colors.border};
      padding-bottom: 12px;
      margin-bottom: 25px;
      background: ${colors.headerBg};
      padding-top: 10px;
    }
    .header h1 {
      margin: 0;
      font-size: 16pt;
      font-weight: bold;
      color: ${colors.text};
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
      color: ${colors.text};
      margin: 20px 0 12px 0;
      padding-bottom: 6px;
      border-bottom: 2px solid #e2e8f0;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .field-group {
      margin-bottom: 15px;
      padding: 8px;
      background: ${colors.bg};
      border-left: 3px solid ${colors.border};
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
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 15px;
    }
    .info-item {
      margin-bottom: 8px;
    }
    .info-label {
      font-weight: 600;
      color: #475569;
      font-size: 9pt;
      margin-bottom: 4px;
      text-transform: uppercase;
      letter-spacing: 0.2px;
    }
    .info-value {
      color: #1e293b;
      font-size: 10pt;
      font-weight: 500;
      padding-left: 8px;
    }
    .full-width {
      grid-column: 1 / -1;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
      font-size: 9pt;
      page-break-inside: auto;
    }
    table thead {
      background: ${colors.tableHeader};
      color: #fff;
    }
    table th {
      padding: 10px 8px;
      text-align: left;
      font-weight: 600;
      font-size: 9pt;
      border: 1px solid ${colors.border};
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
      background: ${colors.tableEven};
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
    <h2>Department of Psychiatry - ${sectionName}</h2>
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

    // Wait for content to load, then print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        toast.success('Print dialog opened');
      }, 250);
    };
  };

  // Track previous initialFormData to avoid unnecessary updates
  const prevInitialDataRef = useRef(null);
  // Track if user has manually edited the form to prevent overwriting their changes
  const userHasEditedRef = useRef(false);

  // Update formData when initialFormData changes (only on mount or when initialData actually changes)
  useEffect(() => {
    if (initialFormData) {
      const prevData = prevInitialDataRef.current;
      // Always update if:
      // 1. No previous data exists, OR
      // 2. Patient ID changed (different patient), OR
      // 3. Using propInitialData and it has an ID that changed (different proforma), OR
      // 4. Key fields have changed (doctor_decision, diagnosis, etc.)
      const proformaIdChanged = propInitialData?.id && prevData?.proformaId !== propInitialData.id;
      const patientIdChanged = prevData?.patient_id !== initialFormData.patient_id;
      // Check if key fields in initialFormData have changed (not user form changes)
      // Only update if the initial data source (propInitialData) has actually changed
      const keyFieldsChanged = prevData?.doctor_decision !== initialFormData.doctor_decision ||
        prevData?.diagnosis !== initialFormData.diagnosis ||
        prevData?.visit_date !== initialFormData.visit_date;

      // More aggressive update logic: update if propInitialData exists and has changed
      const propDataChanged = propInitialData && (
        !prevData?.proformaId ||
        prevData.proformaId !== propInitialData.id ||
        (!prevData.proformaId && propInitialData.id)
      );

      // Detect when data loads from API after page refresh
      // This happens when: proforma exists, we have prevData but it was from defaults (no proformaId), and user hasn't edited
      // Check if proforma ID exists now but didn't in prevData (data just loaded)
      const proformaIdJustLoaded = proforma?.id && prevData && !prevData.proformaId && !propInitialData && !userHasEditedRef.current;
      // Also check if proforma data just became available (was undefined/null, now has data)
      const proformaDataJustLoaded = !prevData?.hasProformaData && proforma && !propInitialData && !userHasEditedRef.current;
      const dataJustLoaded = proformaIdJustLoaded || proformaDataJustLoaded || (!prevData && proforma && !userHasEditedRef.current && !propInitialData);

      // Only update if:
      // 1. No previous data exists, OR
      // 2. Patient ID changed (different patient), OR
      // 3. Proforma ID changed (different proforma), OR
      // 4. propInitialData changed (different proforma passed as prop), OR
      // 5. Key fields in initialFormData changed AND it's the same patient (initial data was updated externally)
      // 6. Data just loaded from API (important for page refresh - when proforma loads after initial empty state)
      // DO NOT update if user is just changing form fields - only update if the source data changed
      // IMPORTANT: Don't reset if user has manually edited the form (unless it's a different patient/proforma)
      const shouldUpdate = (!prevData && !userHasEditedRef.current) ||
        patientIdChanged ||
        proformaIdChanged ||
        (propDataChanged && !userHasEditedRef.current) ||
        (keyFieldsChanged && prevData.patient_id === initialFormData.patient_id && prevData.proformaId === (propInitialData?.id || null) && !userHasEditedRef.current) ||
        dataJustLoaded;

      if (shouldUpdate) {
        setFormData(initialFormData);
        // Reset the user edited flag when we update from external source
        userHasEditedRef.current = false;
        // Notify parent of initial form data (defer to avoid setState during render)
        if (onFormDataChange) {
          // Use setTimeout to defer the call until after render
          setTimeout(() => {
            onFormDataChange(initialFormData);
          }, 0);
        }
        prevInitialDataRef.current = {
          ...initialFormData,
          proformaId: propInitialData?.id || proforma?.id || null,
          hasProformaData: !!proforma
        };
      }
    }
  }, [initialFormData, onFormDataChange, propInitialData?.id, proforma?.id, proforma, isLoadingProforma]);

  // Additional effect to handle data loading after page refresh
  // This ensures formData is updated when proforma data becomes available
  useEffect(() => {
    // Only run if we're not using propInitialData (standalone mode) and data has finished loading
    if (!propInitialData && !isLoadingProforma && proforma && initialFormData) {
      // Use a ref to check current formData without causing dependency issues
      const currentFormData = formDataRef.current;
      // Check if formData is still using defaults but we have real data
      const hasDefaultData = !currentFormData?.mood?.length && !currentFormData?.mood_notes && 
                             (initialFormData.mood?.length > 0 || initialFormData.mood_notes);
      
      if (hasDefaultData && !userHasEditedRef.current) {
        setFormData(initialFormData);
        formDataRef.current = initialFormData;
      }
    }
  }, [proforma, isLoadingProforma, initialFormData, propInitialData]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    // Handle checkbox groups (arrays) and regular checkboxes/inputs
    // CheckboxGroup passes arrays directly, regular inputs pass strings/booleans
    const newValue = type === 'checkbox' ? checked : (Array.isArray(value) ? value : value);
    
    // Mark that user has manually edited the form
    userHasEditedRef.current = true;
    setFormData((prev) => {
      const updated = {
        ...prev,
        [name]: newValue,
      };
      
      // Update formDataRef immediately to ensure submit uses latest data
      formDataRef.current = updated;
      
      // Notify parent component of form data changes, especially doctor_decision
      // Defer to avoid setState during render warning
      if (onFormDataChange) {
        setTimeout(() => {
          onFormDataChange(updated);
        }, 0);
      }
      return updated;
    });
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };


  const handleSubmitClinicalProforma = async (e) => {
    
    e.preventDefault();

    // Get the latest formData from ref to ensure we're using current values
    // This ensures we capture any recent changes that might not be in the closure yet
    const currentFormData = formDataRef.current;

    // Prevent changing from complex case to simple case
    // Only block if the user actually changed from complex_case to something else
    const originalDecision = proforma?.doctor_decision || propInitialData?.doctor_decision;
    const isChangingFromComplexToSimple = originalDecision === 'complex_case' && 
                                          currentFormData.doctor_decision === 'simple_case' &&
                                          isAlreadyComplex;
    
    if (isChangingFromComplexToSimple) {
      toast.error('Cannot change from Instantly Requires Detailed Work-Up to Requires Detailed Workup on Next Follow-Up. The case must remain complex.');
      setFormData(prev => ({ ...prev, doctor_decision: 'complex_case' }));
      return;
    }

    const newErrors = {};
    if (!currentFormData.patient_id) newErrors.patient_id = 'Patient is required';
    if (!currentFormData.visit_date) newErrors.visit_date = 'Visit date is required';

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    try {
      const join = (arr) => Array.isArray(arr) ? arr.join(", ") : arr;

      // CASE 1: Using parent-provided update through props  
      if (propInitialData && propOnUpdate) {
        const updateData = {
          patient_id: currentFormData.patient_id,
          visit_date: currentFormData.visit_date,
          visit_type: currentFormData.visit_type,
          room_no: currentFormData.room_no,
          assigned_doctor: currentFormData.assigned_doctor,
          informant_present: currentFormData.informant_present,
          informant_who: currentFormData.informant_who,
          nature_of_information: join(currentFormData.nature_of_information),
          onset_duration: currentFormData.onset_duration,
          course: currentFormData.course,
          precipitating_factor: currentFormData.precipitating_factor,
          illness_duration: currentFormData.illness_duration,
          current_episode_since: currentFormData.current_episode_since,
          mood: join(currentFormData.mood),
          mood_notes: currentFormData.mood_notes,
          behaviour: join(currentFormData.behaviour),
          behaviour_notes: currentFormData.behaviour_notes,
          speech: join(currentFormData.speech),
          speech_notes: currentFormData.speech_notes,
          thought: join(currentFormData.thought),
          thought_notes: currentFormData.thought_notes,
          perception: join(currentFormData.perception),
          perception_notes: currentFormData.perception_notes,
          somatic: join(currentFormData.somatic),
          somatic_notes: currentFormData.somatic_notes,
          bio_functions: join(currentFormData.bio_functions),
          bio_functions_notes: currentFormData.bio_functions_notes,
          adjustment: join(currentFormData.adjustment),
          adjustment_notes: currentFormData.adjustment_notes,
          cognitive_function: join(currentFormData.cognitive_function),
          cognitive_function_notes: currentFormData.cognitive_function_notes,
          fits: join(currentFormData.fits),
          fits_notes: currentFormData.fits_notes,
          sexual_problem: join(currentFormData.sexual_problem),
          sexual_problem_notes: currentFormData.sexual_problem_notes,
          substance_use: join(currentFormData.substance_use),
          substance_use_notes: currentFormData.substance_use_notes,
          present_history: currentFormData.present_history,
          past_history: currentFormData.past_history,
          treatment_history: currentFormData.treatment_history,
          family_history: currentFormData.family_history,
          associated_medical_surgical: join(currentFormData.associated_medical_surgical),
          associated_medical_surgical_notes: currentFormData.associated_medical_surgical_notes,
          mse_behaviour: join(currentFormData.mse_behaviour),
          mse_behaviour_notes: currentFormData.mse_behaviour_notes,
          mse_affect: join(currentFormData.mse_affect),
          mse_affect_notes: currentFormData.mse_affect_notes,
          mse_thought: currentFormData.mse_thought,
          mse_thought_notes: currentFormData.mse_thought_notes,
          mse_delusions: currentFormData.mse_delusions,
          mse_perception: join(currentFormData.mse_perception),
          mse_perception_notes: currentFormData.mse_perception_notes,
          mse_cognitive_function: join(currentFormData.mse_cognitive_function),
          mse_cognitive_function_notes: currentFormData.mse_cognitive_function_notes,
          gpe: currentFormData.gpe,
          diagnosis: currentFormData.diagnosis,
          icd_code: currentFormData.icd_code,
          disposal: currentFormData.disposal,
          workup_appointment: currentFormData.workup_appointment,
          referred_to: currentFormData.referred_to,
          treatment_prescribed: currentFormData.treatment_prescribed,
          doctor_decision: currentFormData.doctor_decision,
          // case_severity: currentFormData.case_severity,
        };

        try {
          await propOnUpdate(updateData);
          toast.success("Clinical proforma updated successfully!");
        } catch (err) {
          toast.error(err?.data?.message || "Failed to update proforma");
        }

        return;
      }

      // CASE 2: Create new proforma or Update existing proforma
      const proformaData = {
        patient_id: parseInt(currentFormData.patient_id, 10),
        visit_date: currentFormData.visit_date,
        visit_type: currentFormData.visit_type,
        room_no: currentFormData.room_no || null,
        assigned_doctor: currentFormData.assigned_doctor ? parseInt(currentFormData.assigned_doctor, 10) : null,
        informant_present: currentFormData.informant_present ?? true,
        informant_who: currentFormData.informant_who || null,
        nature_of_information: join(currentFormData.nature_of_information) || null,
        onset_duration: currentFormData.onset_duration || null,
        course: currentFormData.course || null,
        precipitating_factor: currentFormData.precipitating_factor || null,
        illness_duration: currentFormData.illness_duration || null,
        current_episode_since: currentFormData.current_episode_since || null,
        mood: join(currentFormData.mood) || null,
        mood_notes: currentFormData.mood_notes || null,
        behaviour: join(currentFormData.behaviour) || null,
        behaviour_notes: currentFormData.behaviour_notes || null,
        speech: join(currentFormData.speech) || null,
        speech_notes: currentFormData.speech_notes || null,
        thought: join(currentFormData.thought) || null,
        thought_notes: currentFormData.thought_notes || null,
        perception: join(currentFormData.perception) || null,
        perception_notes: currentFormData.perception_notes || null,
        somatic: join(currentFormData.somatic) || null,
        somatic_notes: currentFormData.somatic_notes || null,
        bio_functions: join(currentFormData.bio_functions) || null,
        bio_functions_notes: currentFormData.bio_functions_notes || null,
        adjustment: join(currentFormData.adjustment) || null,
        adjustment_notes: currentFormData.adjustment_notes || null,
        cognitive_function: join(currentFormData.cognitive_function) || null,
        cognitive_function_notes: currentFormData.cognitive_function_notes || null,
        fits: join(currentFormData.fits) || null,
        fits_notes: currentFormData.fits_notes || null,
        sexual_problem: join(currentFormData.sexual_problem) || null,
        sexual_problem_notes: currentFormData.sexual_problem_notes || null,
        substance_use: join(currentFormData.substance_use) || null,
        substance_use_notes: currentFormData.substance_use_notes || null,
        present_history: currentFormData.present_history || null,
        past_history: currentFormData.past_history || null,
        treatment_history: currentFormData.treatment_history || null,
        family_history: currentFormData.family_history || null,
        associated_medical_surgical: join(currentFormData.associated_medical_surgical) || null,
        associated_medical_surgical_notes: currentFormData.associated_medical_surgical_notes || null,
        mse_behaviour: join(currentFormData.mse_behaviour) || null,
        mse_behaviour_notes: currentFormData.mse_behaviour_notes || null,
        mse_affect: join(currentFormData.mse_affect) || null,
        mse_affect_notes: currentFormData.mse_affect_notes || null,
        mse_thought: currentFormData.mse_thought || null,
        mse_thought_notes: currentFormData.mse_thought_notes || null,
        mse_delusions: currentFormData.mse_delusions || null,
        mse_perception: join(currentFormData.mse_perception) || null,
        mse_perception_notes: currentFormData.mse_perception_notes || null,
        mse_cognitive_function: join(currentFormData.mse_cognitive_function) || null,
        mse_cognitive_function_notes: currentFormData.mse_cognitive_function_notes || null,
        gpe: currentFormData.gpe || null,
        diagnosis: currentFormData.diagnosis || null,
        icd_code: currentFormData.icd_code || null,
        disposal: currentFormData.disposal || null,
        workup_appointment: currentFormData.workup_appointment || null,
        referred_to: currentFormData.referred_to || null,
        treatment_prescribed: currentFormData.treatment_prescribed || null,
        doctor_decision: currentFormData.doctor_decision || 'simple_case',
        // case_severity: currentFormData.case_severity || null,
      };

      let savedProforma = null;

      // ==============================
      // TRY–CATCH #1: Create or Update Proforma
      // CRITICAL RULE: Each new patient visit MUST create a NEW performa record
      // Only update when explicitly editing a specific existing performa (corrections only)
      // ==============================
      try {
        // Determine if we're editing an existing performa or creating a new visit
        // CRITICAL RULE: Only update if propInitialData has an id (explicitly editing a specific past visit performa for corrections)
        // For existing patients with pre-filled data (no id), ALWAYS CREATE a new record
        // This ensures:
        // 1. New patients → blank form → creates new record
        // 2. Existing patients → pre-filled form (reference) → creates new record (old data unchanged)
        // 3. Past visit corrections → form with id → updates that specific record
        const isEditingSpecificProforma = propInitialData?.id && (isUpdateMode || (propInitialData?.id && id && proforma?.id));
        
        if (isEditingSpecificProforma) {
          // Update existing performa (ONLY for corrections/edits of a specific past visit record)
          // This is the ONLY case where we update - when explicitly editing a past visit
          const performaIdToUpdate = propInitialData?.id || proforma?.id;
          const updateData = { ...proformaData, id: performaIdToUpdate };
          const result = await updateProforma(updateData).unwrap();
          savedProforma = result?.data?.proforma || proforma;
          toast.success("Clinical proforma updated successfully!");
        } else {
          // CREATE NEW performa for this visit (default behavior for all new visits)
          // This applies to:
          // - New patients (blank form)
          // - Existing patients (pre-filled form from last visit - creates new record)
          // This ensures each visit creates a new immutable record
          // Old performas remain untouched as historical records
          const result = await createProforma(proformaData).unwrap();
          savedProforma = result?.data?.clinical_proforma;
          toast.success("Clinical proforma created successfully!");
          // Reset user edited flag after successful save to allow future updates
          userHasEditedRef.current = false;
          // Refetch proformas to get the new one
          refetch();
        }
      } catch (err) {
        console.error('Proforma save error:', err);
        const errorMessage = err?.data?.message || err?.message || "Failed to save clinical proforma";
        toast.error(errorMessage);
        return; // Stop further API calls
      }

      // ==============================
      // TRY–CATCH #2: Handle File Uploads/Updates
      // ==============================
      if (patientId && ((selectedFiles && selectedFiles.length > 0) || (filesToRemove && filesToRemove.length > 0))) {
        try {
          // Check if patient files record exists
          const hasExistingFiles = existingFiles && existingFiles.length > 0;
          
          if (hasExistingFiles && (selectedFiles.length > 0 || filesToRemove.length > 0)) {
            // Update existing record
            const fileRecord = patientFilesData?.data;
            await updatePatientFiles({
              patient_id: patientId,
              files: selectedFiles,
              files_to_remove: filesToRemove
            }).unwrap();
            
            if (selectedFiles.length > 0) {
              toast.success(`${selectedFiles.length} file(s) uploaded successfully!`);
            }
            if (filesToRemove.length > 0) {
              toast.success(`${filesToRemove.length} file(s) removed successfully!`);
            }
            
            setSelectedFiles([]);
            setFilesToRemove([]);
            // Refetch files after update with delay to ensure backend processing is complete
            setTimeout(() => {
              if (refetchFiles) {
                refetchFiles();
              }
            }, 1000);
          } else if (selectedFiles.length > 0) {
            // Create new record
            await createPatientFiles({
              patient_id: patientId,
              user_id: currentUser?.id,
              files: selectedFiles
            }).unwrap();
            
            toast.success(`${selectedFiles.length} file(s) uploaded successfully!`);
            setSelectedFiles([]);
            // Refetch files after create with delay to ensure backend processing is complete
            setTimeout(() => {
              if (refetchFiles) {
                refetchFiles();
              }
            }, 1000);
          }
        } catch (fileErr) {
          console.error('File upload error:', fileErr);
          toast.error(fileErr?.data?.message || 'Failed to update files. Proforma was saved successfully.');
        }
      }

      // Use savedProforma.id if we just created one, otherwise use proforma.id
      const proformaId = savedProforma?.id || proforma?.id;

      if (formData.doctor_decision === "complex_case") {
        // Only call API if ADL does NOT exist
        if (!existingAdlFile && patient?.id && proformaId) {
          try {
            await createADLFile({
              patient_id: patient.id,
              clinical_proforma_id: proformaId,
            }).unwrap();
      
            toast.success("ADL file created");
          } catch (err) {
            console.error('ADL creation error:', err);
            toast.error(err?.data?.message || "Failed to create ADL file");
          }
        }
      }
      

      // ======================================
      // TRY–CATCH #4: Create Bulk Prescriptions
      // ======================================
      if (!existingPrescription && patient?.id && proformaId) {
        try {
          await createPrescriptions({
            patient_id: patient.id,
            clinical_proforma_id: proformaId,
          }).unwrap();
          toast.success("Prescriptions updated");
        } catch (err) {
          console.error('Prescription creation error:', err);
          toast.error(err?.data?.message || "Failed to create prescriptions");
        }
      }

    } catch (err) {
      console.error('Unexpected error in handleSubmitClinicalProforma:', err);
      const errorMessage = err?.data?.message || err?.message || "Unexpected error occurred";
      toast.error(errorMessage);
    }
  };





  // Loading state - only show if fetching by ID (not when using initialData prop)
  if (!propInitialData && (isLoadingProforma || (isComplexCase && isLoadingADL))) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  // Error state - only show if fetching by ID (not when using initialData prop)
  if (!propInitialData && isErrorProforma) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <div className="text-center py-12">
            <FiAlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Error Loading Walk-in Clinical Proforma</h2>
            <p className="text-gray-600 mb-6">
              {proformaError?.data?.message || 'Failed to load clinical proforma data'}
            </p>
            <div className="flex gap-4 justify-center">
              <Button
                onClick={() => navigate(-1)}
                className="bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg shadow-green-500/30 px-4 py-2 rounded-md flex items-center gap-2 transition-all duration-200 hover:from-green-600 hover:to-green-700 hover:shadow-xl hover:shadow-green-500/40"
              >
                <FiArrowLeft className="w-4 h-4" />
                Go Back
              </Button>
              <Button
                onClick={() => window.location.reload()}
                className="bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg shadow-green-500/30 px-4 py-2 rounded-md flex items-center gap-2 transition-all duration-200 hover:from-green-600 hover:to-green-700 hover:shadow-xl hover:shadow-green-500/40"
              >
                Retry
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Always show form, even if proforma not found - allow editing/creating
  // initialFormData will always have default values now

  // Fetch all clinical options from database
  const { data: allOptionsData, isLoading: isLoadingOptions } = useGetAllClinicalOptionsQuery();
  
  // Default options for checkbox groups - only used as fallback if database is completely empty
  // These should be seeded into the database, not used directly
  const defaultOptions = {
    mood: ['Anxious', 'Sad', 'Cheerful', 'Agitated', 'Fearful', 'Irritable'],
    behaviour: ['Suspiciousness', 'Talking/Smiling to self', 'Hallucinatory behaviour', 'Increased goal-directed activity', 'Compulsions', 'Apathy', 'Anhedonia', 'Avolution', 'Stupor', 'Posturing', 'Stereotypy', 'Ambitendency', 'Disinhibition', 'Impulsivity', 'Anger outbursts', 'Suicide/self-harm attempts'],
    speech: ['Irrelevant', 'Incoherent', 'Pressure', 'Alogia', 'Mutism'],
    thought: ['Reference', 'Persecution', 'Grandiose', 'Love Infidelity', 'Bizarre', 'Pessimism', 'Worthlessness', 'Guilt', 'Poverty', 'Nihilism', 'Hypochondriasis', 'Wish to die', 'Active suicidal ideation', 'Plans', 'Worries', 'Obsessions', 'Phobias', 'Panic attacks'],
    perception: ['Hallucination - Auditory', 'Hallucination - Visual', 'Hallucination - Tactile', 'Hallucination - Olfactory', 'Passivity', 'Depersonalization', 'Derealization'],
    somatic: ['Pains', 'Numbness', 'Weakness', 'Fatigue', 'Tremors', 'Palpitations', 'Dyspnoea', 'Dizziness'],
    bio_functions: ['Sleep', 'Appetite', 'Bowel/Bladder', 'Self-care'],
    adjustment: ['Work output', 'Socialization'],
    cognitive_function: ['Disorientation', 'Inattention', 'Impaired Memory', 'Intelligence'],
    fits: ['Epileptic', 'Dissociative', 'Mixed', 'Not clear'],
    sexual_problem: ['Dhat', 'Poor erection', 'Early ejaculation', 'Decreased desire', 'Perversion', 'Homosexuality', 'Gender dysphoria'],
    substance_use: ['Alcohol', 'Opioid', 'Cannabis', 'Benzodiazepines', 'Tobacco'],
    associated_medical_surgical: ['Hypertension', 'Diabetes', 'Dyslipidemia', 'Thyroid dysfunction'],
    mse_behaviour: ['Uncooperative', 'Unkempt', 'Fearful', 'Odd', 'Suspicious', 'Retarded', 'Excited', 'Aggressive', 'Apathetic', 'Catatonic', 'Demonstrative'],
    mse_affect: ['Sad', 'Anxious', 'Elated', 'Inappropriate', 'Blunted', 'Labile'],
    mse_perception: ['Hallucinations - Auditory', 'Hallucinations - Visual', 'Hallucinations - Tactile', 'Hallucinations - Olfactory', 'Illusions', 'Depersonalization', 'Derealization'],
    mse_cognitive_function: ['Impaired', 'Not impaired'],
    nature_of_information: ['Reliable', 'Unreliable', 'Adequate', 'Inadequate'],
  };

  // Use database options if available, otherwise fallback to defaults
  // Only use defaults if database is completely empty (no groups at all)
  const clinicalOptions = allOptionsData && Object.keys(allOptionsData).length > 0 
    ? allOptionsData 
    : defaultOptions;

  // Determine if this is embedded (has initialData prop) or standalone page
  const isEmbedded = !!propInitialData;

  // For standalone create mode with existing patient history, show history first
  const shouldShowHistory = !isEmbedded && isCreateMode && !showProformaForm && hasHistory;

  const formContent = (
    <>
      {/* Show patient history first if in standalone create mode and patient has history */}
      {shouldShowHistory && (
        <PatientClinicalHistory
          patient={patient}
          visitHistory={visitHistory}
          clinicalProformas={patientProformas}
          onAddNewProforma={() => setShowProformaForm(true)}
          isLoading={isLoadingVisitHistory}
        />
      )}

      {/* Show proforma form */}
      {showProformaForm && (
      <form onSubmit={handleSubmitClinicalProforma}>
          {isEmbedded ? (
            // When embedded, render form content directly without Card wrapper
            <div ref={printSectionRef} className="space-y-6">
              {/* Form Header */}
              {/* {isCreateMode && !propInitialData?.id && patientId && !isFollowUpMode && (
                <div className="mb-4 pb-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {isFollowUpMode ? 'Follow-Up Clinical Assessment' : 'Walk-in Clinical Proforma'}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {isFollowUpMode ? 'Follow-up visit assessment and prescription' : 'Create a new clinical proforma for this visit'}
                  </p>
                      </div>
                    )} */}

              {/* Follow-Up Mode Header */}
              {isFollowUpMode && (
                <div className="mb-4 pb-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Follow-Up Clinical Assessment</h3>
                  <p className="text-sm text-gray-500 mt-1">Patient: {patient?.name || 'N/A'} (CR: {patient?.cr_no || 'N/A'})</p>
                </div>
              )}

              {/* Basic Information Section - Hide in Follow-Up Mode */}
              {!isFollowUpMode && (
              <div className="space-y-4">
                {/* <h2 className="text-xl font-semibold text-gray-800 border-b pb-2">Basic Information</h2> */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">


                  <DatePicker

                    label="Date"
                    name="date"
                    value={formData.date || ''}
                    onChange={handleChange}
                    defaultToday={true}
                  />
                  <Input
                    label="Patient Name"
                    value={patient.name || ''}
                    onChange={handleChange}

                  />

                  <Input
                    label="Age"
                    value={patient.age || ''}
                    onChange={handleChange}

                  />
                  <Input
                    label="Sex"
                    value={patient.sex || ''}
                    onChange={handleChange}

                  />
                </div>


              </div>
              )}

              {/* Informant Section */}

              <div className="space-y-4">

                <h2 className="text-xl font-semibold text-gray-800 border-b pb-2">Informant</h2>
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-3">
                    {[
                      { v: true, t: 'Present' },
                      { v: false, t: 'Absent' },
                    ].map(({ v, t }) => (
                      <label key={t} className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm cursor-pointer transition-colors ${formData.informant_present === v ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-gray-200 bg-white hover:bg-gray-50'
                        }`}>
                        <input
                          type="radio"
                          name="informant_present"
                          checked={formData.informant_present === v}
                          onChange={() => handleChange({ target: { name: 'informant_present', value: v } })}
                          className="h-4 w-4 text-primary-600"
                        />
                        <span className="font-medium">{t}</span>
                      </label>
                    ))}
                  </div>
                  
                  {/* Who is present - shown only when Present is selected */}
                  {formData.informant_present === true && (
                    <Input
                      label="Who is present with the patient?"
                      name="informant_who"
                      value={formData.informant_who || ''}
                      onChange={handleChange}
                      placeholder="Enter who is present with the patient (e.g., Spouse, Parent, Sibling, etc.)"
                    />
                  )}
                  
                  <CheckboxGroup 
                    label="Nature of information" 
                    name="nature_of_information" 
                    value={formData.nature_of_information || []} 
                    onChange={handleChange} 
                    options={clinicalOptions.nature_of_information || ['Reliable', 'Unreliable', 'Adequate', 'Inadequate']} 
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <h2 className="text-xl font-semibold text-gray-800 border-b pb-2">Onset Duration</h2>
                      <div className="flex flex-wrap gap-3">
                        {[{ v: '<1_week', t: '1. < 1 week' }, { v: '1w_1m', t: '2. 1 week – 1 month' }, { v: '>1_month', t: '3. > 1 month' }, { v: 'not_known', t: '4. Not known' }].map(({ v, t }) => (
                          <label key={v} className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm cursor-pointer transition-colors ${formData.onset_duration === v ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-gray-200 bg-white hover:bg-gray-50'
                            }`}>
                            <input
                              type="radio"
                              name="onset_duration"
                              value={v}
                              checked={formData.onset_duration === v}
                              onChange={handleChange}
                              className="h-4 w-4 text-primary-600"
                            />
                            <span className="font-medium">{t}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <h2 className="text-xl font-semibold text-gray-800 border-b pb-2">Course</h2>
                      <div className="flex flex-wrap gap-3">
                        {['Continuous', 'Episodic', 'Fluctuating', 'Deteriorating', 'Improving'].map((opt) => (
                          <label key={opt} className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm cursor-pointer transition-colors ${formData.course === opt ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-gray-200 bg-white hover:bg-gray-50'
                            }`}>
                            <input
                              type="radio"
                              name="course"
                              value={opt}
                              checked={formData.course === opt}
                              onChange={handleChange}
                              className="h-4 w-4 text-primary-600"
                            />
                            <span className="font-medium">{opt}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                  <Textarea
                    label="Precipitating Factor"
                    name="precipitating_factor"
                    value={formData.precipitating_factor}
                    onChange={handleChange}
                    rows={3}
                  />
                  <Input
                    label="Total Duration of Illness"
                    name="illness_duration"
                    value={formData.illness_duration}
                    onChange={handleChange}
                  />
                  <Input
                    label="Current Episode Duration / Worsening Since"
                    name="current_episode_since"
                    value={formData.current_episode_since}
                    onChange={handleChange}
                  />
                </div>
              </div>

              {/* Complaints / History of Presenting Illness */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-800 border-b pb-2">Complaints / History of Presenting Illness</h2>
                <div className="space-y-6">
                  <CheckboxGroup label="Mood" name="mood" value={formData.mood || []} onChange={handleChange} options={clinicalOptions.mood || []} note={formData.mood_notes || ''} onNoteChange={handleChange} />
                  <CheckboxGroup label="Behaviour" name="behaviour" value={formData.behaviour || []} onChange={handleChange} options={clinicalOptions.behaviour || []} note={formData.behaviour_notes || ''} onNoteChange={handleChange} />
                  <CheckboxGroup label="Speech" name="speech" value={formData.speech || []} onChange={handleChange} options={clinicalOptions.speech || []} note={formData.speech_notes || ''} onNoteChange={handleChange} />
                  <CheckboxGroup label="Thought" name="thought" value={formData.thought || []} onChange={handleChange} options={clinicalOptions.thought || []} note={formData.thought_notes || ''} onNoteChange={handleChange} />
                  <CheckboxGroup label="Perception" name="perception" value={formData.perception || []} onChange={handleChange} options={clinicalOptions.perception || []} note={formData.perception_notes || ''} onNoteChange={handleChange} />
                  <CheckboxGroup label="Somatic" name="somatic" value={formData.somatic || []} onChange={handleChange} options={clinicalOptions.somatic || []} note={formData.somatic_notes || ''} onNoteChange={handleChange} />
                  <CheckboxGroup label="Bio-functions" name="bio_functions" value={formData.bio_functions || []} onChange={handleChange} options={clinicalOptions.bio_functions || []} note={formData.bio_functions_notes || ''} onNoteChange={handleChange} />
                  <CheckboxGroup label="Adjustment" name="adjustment" value={formData.adjustment || []} onChange={handleChange} options={clinicalOptions.adjustment || []} note={formData.adjustment_notes || ''} onNoteChange={handleChange} />
                  <CheckboxGroup label="Cognitive Function" name="cognitive_function" value={formData.cognitive_function || []} onChange={handleChange} options={clinicalOptions.cognitive_function || []} note={formData.cognitive_function_notes || ''} onNoteChange={handleChange} />
                  <CheckboxGroup label="Fits" name="fits" value={formData.fits || []} onChange={handleChange} options={clinicalOptions.fits || []} note={formData.fits_notes || ''} onNoteChange={handleChange} />
                  <CheckboxGroup label="Sexual Problem" name="sexual_problem" value={formData.sexual_problem || []} onChange={handleChange} options={clinicalOptions.sexual_problem || []} note={formData.sexual_problem_notes || ''} onNoteChange={handleChange} />
                  <CheckboxGroup label="Substance Use" name="substance_use" value={formData.substance_use || []} onChange={handleChange} options={clinicalOptions.substance_use || []} note={formData.substance_use_notes || ''} onNoteChange={handleChange} />
                </div>
              </div>

              {/* Additional History */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-800 border-b pb-2">Additional History</h2>
                <div className="space-y-4">
                  <Textarea
                    label="Present History"
                    name="present_history"
                    value={formData.present_history}
                    onChange={handleChange}
                    rows={4}
                  />
                  <Textarea
                    label="Past Psychiatric History"
                    name="past_history"
                    value={formData.past_history}
                    onChange={handleChange}
                    rows={4}
                  />
                  <Textarea
                    label="Treatment History"
                    name="treatment_history"
                    value={formData.treatment_history}
                    onChange={handleChange}
                    rows={4}
                  />
                  <Textarea
                    label="Family History"
                    name="family_history"
                    value={formData.family_history}
                    onChange={handleChange}
                    rows={4}
                  />
                  <CheckboxGroup
                    label="Associated Medical/Surgical Illness"
                    name="associated_medical_surgical"
                    value={formData.associated_medical_surgical || []}
                    onChange={handleChange}
                    options={clinicalOptions.associated_medical_surgical || []}
                    note={formData.associated_medical_surgical_notes || ''}
                    onNoteChange={handleChange}
                  />
                </div>
              </div>

              {/* Mental State Examination (MSE) */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-800 border-b pb-2">Mental State Examination (MSE)</h2>
                <div className="space-y-6">
                  <CheckboxGroup label="Behaviour" name="mse_behaviour" value={formData.mse_behaviour || []} onChange={handleChange} options={clinicalOptions.mse_behaviour || []} note={formData.mse_behaviour_notes || ''} onNoteChange={handleChange} />
                  <CheckboxGroup label="Affect & Mood" name="mse_affect" value={formData.mse_affect || []} onChange={handleChange} options={clinicalOptions.mse_affect || []} note={formData.mse_affect_notes || ''} onNoteChange={handleChange} />
                  <CheckboxGroup
                    label="Thought (Flow, Form, Content)"
                    name="mse_thought"
                    value={formData.mse_thought || []}
                    onChange={handleChange}
                    options={clinicalOptions.mse_thought || []}
                    note={formData.mse_thought_notes || ''}
                    onNoteChange={handleChange}
                    rightInlineExtra={
                      <Input
                        name="mse_delusions"
                        value={formData.mse_delusions}
                        onChange={handleChange}
                        placeholder="Delusions / Ideas of (optional)"
                        className="max-w-xs"
                      />
                    }
                  />
                  <CheckboxGroup label="Perception" name="mse_perception" value={formData.mse_perception || []} onChange={handleChange} options={clinicalOptions.mse_perception || []} note={formData.mse_perception_notes || ''} onNoteChange={handleChange} />
                  <CheckboxGroup label="Cognitive Functions" name="mse_cognitive_function" value={formData.mse_cognitive_function || []} onChange={handleChange} options={clinicalOptions.mse_cognitive_function || []} note={formData.mse_cognitive_function_notes || ''} onNoteChange={handleChange} />
                </div>
              </div>

              {/* General Physical Examination */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-800 border-b pb-2">General Physical Examination</h2>
                <div className="space-y-4">
                  <Textarea
                    label="GPE Findings"
                    name="gpe"
                    value={formData.gpe}
                    onChange={handleChange}
                    rows={4}
                    placeholder="BP, Pulse, Weight, BMI, General appearance, Systemic examination..."
                  />
                </div>
              </div>

              {/* Diagnosis & Management */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-800 border-b pb-2">Diagnosis & Management</h2>
                <div className="space-y-4">
                  <Textarea
                    label="Diagnosis"
                    name="diagnosis"
                    value={formData.diagnosis}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Primary and secondary diagnoses..."
                  />
                  <ICD11CodeSelector
                    value={formData.icd_code}
                    onChange={handleChange}
                    error={errors.icd_code}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* <Select
                      label="Case Severity"
                      name="case_severity"
                      value={formData.case_severity}
                      onChange={handleChange}
                      options={CASE_SEVERITY}
                    /> */}
                
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                  <Textarea
                    label="Disposal & Referral"
                    name="disposal"
                    value={formData.disposal}
                    onChange={handleChange}
                    rows={2}
                    placeholder="Admission, discharge, follow-up..."
                  />
                  {/* <Input
                  label="Workup Appointment"
                  type="date"
                  name="workup_appointment"
                  value={formData.workup_appointment}
                  onChange={handleChange}
                /> */}


                  <DatePicker
                    icon={<FiCalendar className="w-4 h-4" />}
                    label="Workup Appointment"
                    name="workup_appointment"
                    value={formData.workup_appointment}
                    onChange={handleChange}
                    defaultToday={true}
                  />
                  <Textarea
                    label="Referred To"
                    name="referred_to"
                    value={formData.referred_to}
                    onChange={handleChange}
                    rows={2}
                    placeholder="Other departments or specialists..."
                  />
                  <Textarea
                    label="Treatment Prescribed"
                    name="treatment_prescribed"
                    value={formData.treatment_prescribed}
                    onChange={handleChange}
                    rows={4}
                    placeholder="Treatment details..."
                  />

<div>
                      <Select
                        label="Doctor Decision"
                        name="doctor_decision"
                        value={formData.doctor_decision}
                        onChange={handleChange}
                        options={DOCTOR_DECISION}
                        required
                        disabled={isAlreadyComplex}
                        title={isAlreadyComplex ? "Cannot change from Instantly Requires Detailed Work-Up to Requires Detailed Workup on Next Follow-Up" : ""}
                      />
                      {isAlreadyComplex && (
                        <p className="mt-1 text-xs text-amber-600 flex items-center gap-1">
                          <FiAlertCircle className="w-3 h-3" />
                          This case is already marked as Instantly Requires Detailed Work-Up and cannot be changed back to Requires Detailed Workup on Next Follow-Up.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Patient Documents & Files Section - Hide in Follow-Up Mode */}
              {patientId && !isFollowUpMode && (
                <div className="space-y-6 pt-6 border-t border-gray-200">
                  <h4 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                    <div className="p-2.5 bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-sm rounded-xl border border-white/30 shadow-md">
                      <FiFileText className="w-5 h-5 text-purple-600" />
                    </div>
                    Patient Documents & Files
                  </h4>

                  {/* File Upload Component */}
                  {!hideFileUpload && (
                    <div className="mb-6">
                      <FileUpload
                        files={selectedFiles}
                        onFilesChange={setSelectedFiles}
                        maxFiles={20}
                        maxSizeMB={10}
                        patientId={patientId}
                        disabled={!patientId}
                      />
                    </div>
                  )}

                  {/* Existing Files Preview */}
                  {existingFiles && existingFiles.length > 0 && (
                    <div className="mt-6">
                      <h5 className="text-lg font-semibold text-gray-800 mb-4">
                        Existing Files ({existingFiles.filter(file => !filesToRemove.includes(file)).length})
                      </h5>
                      <FilePreview
                        files={existingFiles.filter(file => !filesToRemove.includes(file))}
                        onDelete={canEditFiles ? (filePath) => {
                          setFilesToRemove(prev => {
                            if (!prev.includes(filePath)) {
                              return [...prev, filePath];
                            }
                            return prev;
                          });
                        } : undefined}
                        canDelete={canEditFiles}
                        baseUrl={import.meta.env.VITE_API_URL || '/api'}
                      />
                    </div>
                  )}
                  {existingFiles && existingFiles.length === 0 && (
                    <div className="mt-6 text-center py-4 text-gray-500">
                      <p>No files uploaded yet</p>
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
              )}

              {/* Submit Button */}
              <div className="flex justify-end gap-3 pt-6 border-t">
                {/* <Button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg shadow-green-500/30 px-4 py-2 rounded-md transition-all duration-200 hover:from-green-600 hover:to-green-700 hover:shadow-xl hover:shadow-green-500/40"
                >
                  <FiArrowLeft className="w-4 h-4" />
                  Cancel
                </Button> */}
                <Button
                  type="submit"
                  loading={isUpdating || isUploadingFiles}
                  disabled={isUpdating || isUploadingFiles}
                  className="bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/30 gap-3"
                >
                  <FiSave className="w-4 h-4" />
                  {(isUpdating || isCreating || isUploadingFiles)
                    ? 'Saving...'
                    : isFollowUpMode
                      ? 'Save Follow-Up Visit'
                    : (mode === 'create' || (!isUpdateMode && !proforma?.id))
                      ? 'Create Walk-in Clinical Proforma'
                      : 'Update Walk-in Clinical Proforma'}
                </Button>
              </div>
            </div>
          ) : (
            // When standalone, render with Card wrapper
            <Card className="mb-8 shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          {/* Collapsible Header */}
          <div
            className="flex items-center justify-between p-6 border-b border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <div 
              className="flex items-center gap-4 cursor-pointer flex-1"
              onClick={() => toggleCard('clinicalProforma')}
            >
              <div className="p-3 bg-green-100 rounded-lg">
                <FiClipboard className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900"> Walk-in Clinical Proforma</h3>
                {patient && (
                  <p className="text-sm text-gray-500 mt-1">
                    {patient.name || 'N/A'} - {patient.cr_no || 'N/A'}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrintSection('Walk-in Clinical Proforma');
                }}
                className="h-9 w-9 p-0 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border border-blue-200 hover:border-blue-300 shadow-sm hover:shadow-md transition-all duration-200 rounded-lg"
                title="Print Walk-in Clinical Proforma"
              >
                <FiPrinter className="w-4 h-4 text-blue-600" />
              </Button>
              <div 
                className="cursor-pointer"
                onClick={() => toggleCard('clinicalProforma')}
              >
                {expandedCards.clinicalProforma ? (
                  <FiChevronUp className="h-6 w-6 text-gray-500" />
                ) : (
                  <FiChevronDown className="h-6 w-6 text-gray-500" />
                )}
              </div>
            </div>
          </div>

          {expandedCards.clinicalProforma && (
            <div ref={printSectionRef} className="p-6 space-y-6">
              {/* Basic Information Section */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <DatePicker
                    label="Date"
                    name="date"
                    value={formData.date || ''}
                    onChange={handleChange}
                    defaultToday={true}
                  />
                  <Input
                    label="Patient Name"
                    value={patient.name || ''}
                    onChange={handleChange}
                  />
                  <Input
                    label="Age"
                    value={patient.age || ''}
                    onChange={handleChange}
                  />
                  <Input
                    label="Sex"
                    value={patient.sex || ''}
                    onChange={handleChange}
                  />
                </div>
              </div>

              {/* Informant Section */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-800 border-b pb-2">Informant</h2>
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-3">
                    {[
                      { v: true, t: 'Present' },
                      { v: false, t: 'Absent' },
                    ].map(({ v, t }) => (
                      <label key={t} className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm cursor-pointer transition-colors ${formData.informant_present === v ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-gray-200 bg-white hover:bg-gray-50'
                        }`}>
                        <input
                          type="radio"
                          name="informant_present"
                          checked={formData.informant_present === v}
                          onChange={() => handleChange({ target: { name: 'informant_present', value: v } })}
                          className="h-4 w-4 text-primary-600"
                        />
                        <span className="font-medium">{t}</span>
                      </label>
                    ))}
                  </div>
                  
                  {/* Who is present - shown only when Present is selected */}
                  {formData.informant_present === true && (
                    <Input
                      label="Who is present with the patient?"
                      name="informant_who"
                      value={formData.informant_who || ''}
                      onChange={handleChange}
                      placeholder="Enter who is present with the patient (e.g., Spouse, Parent, Sibling, etc.)"
                    />
                  )}
                  
                  <CheckboxGroup 
                    label="Nature of information" 
                    name="nature_of_information" 
                    value={formData.nature_of_information || []} 
                    onChange={handleChange} 
                    options={clinicalOptions.nature_of_information || ['Reliable', 'Unreliable', 'Adequate', 'Inadequate']} 
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <h2 className="text-xl font-semibold text-gray-800 border-b pb-2">Onset Duration</h2>
                      <div className="flex flex-wrap gap-3">
                        {[{ v: '<1_week', t: '1. < 1 week' }, { v: '1w_1m', t: '2. 1 week – 1 month' }, { v: '>1_month', t: '3. > 1 month' }, { v: 'not_known', t: '4. Not known' }].map(({ v, t }) => (
                          <label key={v} className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm cursor-pointer transition-colors ${formData.onset_duration === v ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-gray-200 bg-white hover:bg-gray-50'
                            }`}>
                            <input
                              type="radio"
                              name="onset_duration"
                              value={v}
                              checked={formData.onset_duration === v}
                              onChange={handleChange}
                              className="h-4 w-4 text-primary-600"
                            />
                            <span className="font-medium">{t}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <h2 className="text-xl font-semibold text-gray-800 border-b pb-2">Course</h2>
                      <div className="flex flex-wrap gap-3">
                        {['Continuous', 'Episodic', 'Fluctuating', 'Deteriorating', 'Improving'].map((opt) => (
                          <label key={opt} className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm cursor-pointer transition-colors ${formData.course === opt ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-gray-200 bg-white hover:bg-gray-50'
                            }`}>
                            <input
                              type="radio"
                              name="course"
                              value={opt}
                              checked={formData.course === opt}
                              onChange={handleChange}
                              className="h-4 w-4 text-primary-600"
                            />
                            <span className="font-medium">{opt}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                  <Textarea
                    label="Precipitating Factor"
                    name="precipitating_factor"
                    value={formData.precipitating_factor}
                    onChange={handleChange}
                    rows={3}
                  />
                  <Input
                    label="Total Duration of Illness"
                    name="illness_duration"
                    value={formData.illness_duration}
                    onChange={handleChange}
                  />
                  <Input
                    label="Current Episode Duration / Worsening Since"
                    name="current_episode_since"
                    value={formData.current_episode_since}
                    onChange={handleChange}
                  />
                </div>
              </div>

              {/* Complaints / History of Presenting Illness */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-800 border-b pb-2">Complaints / History of Presenting Illness</h2>
                <div className="space-y-6">
                    <CheckboxGroup label="Mood" name="mood" value={formData.mood || []} onChange={handleChange} options={clinicalOptions.mood || []} note={formData.mood_notes || ''} onNoteChange={handleChange} />
                    <CheckboxGroup label="Behaviour" name="behaviour" value={formData.behaviour || []} onChange={handleChange} options={clinicalOptions.behaviour || []} note={formData.behaviour_notes || ''} onNoteChange={handleChange} />
                    <CheckboxGroup label="Speech" name="speech" value={formData.speech || []} onChange={handleChange} options={clinicalOptions.speech || []} note={formData.speech_notes || ''} onNoteChange={handleChange} />
                    <CheckboxGroup label="Thought" name="thought" value={formData.thought || []} onChange={handleChange} options={clinicalOptions.thought || []} note={formData.thought_notes || ''} onNoteChange={handleChange} />
                    <CheckboxGroup label="Perception" name="perception" value={formData.perception || []} onChange={handleChange} options={clinicalOptions.perception || []} note={formData.perception_notes || ''} onNoteChange={handleChange} />
                    <CheckboxGroup label="Somatic" name="somatic" value={formData.somatic || []} onChange={handleChange} options={clinicalOptions.somatic || []} note={formData.somatic_notes || ''} onNoteChange={handleChange} />
                    <CheckboxGroup label="Bio-functions" name="bio_functions" value={formData.bio_functions || []} onChange={handleChange} options={clinicalOptions.bio_functions || []} note={formData.bio_functions_notes || ''} onNoteChange={handleChange} />
                    <CheckboxGroup label="Adjustment" name="adjustment" value={formData.adjustment || []} onChange={handleChange} options={clinicalOptions.adjustment || []} note={formData.adjustment_notes || ''} onNoteChange={handleChange} />
                    <CheckboxGroup label="Cognitive Function" name="cognitive_function" value={formData.cognitive_function || []} onChange={handleChange} options={clinicalOptions.cognitive_function || []} note={formData.cognitive_function_notes || ''} onNoteChange={handleChange} />
                    <CheckboxGroup label="Fits" name="fits" value={formData.fits || []} onChange={handleChange} options={clinicalOptions.fits || []} note={formData.fits_notes || ''} onNoteChange={handleChange} />
                    <CheckboxGroup label="Sexual Problem" name="sexual_problem" value={formData.sexual_problem || []} onChange={handleChange} options={clinicalOptions.sexual_problem || []} note={formData.sexual_problem_notes || ''} onNoteChange={handleChange} />
                    <CheckboxGroup label="Substance Use" name="substance_use" value={formData.substance_use || []} onChange={handleChange} options={clinicalOptions.substance_use || []} note={formData.substance_use_notes || ''} onNoteChange={handleChange} />
                </div>
              </div>

              {/* Additional History */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-800 border-b pb-2">Additional History</h2>
                <div className="space-y-4">
                  <Textarea
                    label="Present History"
                    name="present_history"
                    value={formData.present_history}
                    onChange={handleChange}
                    rows={4}
                  />
                  <Textarea
                    label="Past Psychiatric History"
                    name="past_history"
                    value={formData.past_history}
                    onChange={handleChange}
                    rows={4}
                  />
                  <Textarea
                    label="Treatment History"
                    name="treatment_history"
                    value={formData.treatment_history}
                    onChange={handleChange}
                    rows={4}
                  />
                  <Textarea
                    label="Family History"
                    name="family_history"
                    value={formData.family_history}
                    onChange={handleChange}
                    rows={4}
                  />
                  <CheckboxGroup
                    label="Associated Medical/Surgical Illness"
                    name="associated_medical_surgical"
                    value={formData.associated_medical_surgical || []}
                    onChange={handleChange}
                    options={clinicalOptions.associated_medical_surgical || []}
                    note={formData.associated_medical_surgical_notes || ''}
                    onNoteChange={handleChange}
                  />
                </div>
              </div>

              {/* Mental State Examination (MSE) */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-800 border-b pb-2">Mental State Examination (MSE)</h2>
                <div className="space-y-6">
                    <CheckboxGroup label="Behaviour" name="mse_behaviour" value={formData.mse_behaviour || []} onChange={handleChange} options={clinicalOptions.mse_behaviour || []} note={formData.mse_behaviour_notes || ''} onNoteChange={handleChange} />
                    <CheckboxGroup label="Affect & Mood" name="mse_affect" value={formData.mse_affect || []} onChange={handleChange} options={clinicalOptions.mse_affect || []} note={formData.mse_affect_notes || ''} onNoteChange={handleChange} />
                  <CheckboxGroup
                    label="Thought (Flow, Form, Content)"
                    name="mse_thought"
                    value={formData.mse_thought || []}
                    onChange={handleChange}
                    options={clinicalOptions.mse_thought || []}
                    note={formData.mse_thought_notes || ''}
                    onNoteChange={handleChange}
                    rightInlineExtra={
                      <Input
                        name="mse_delusions"
                        value={formData.mse_delusions}
                        onChange={handleChange}
                        placeholder="Delusions / Ideas of (optional)"
                        className="max-w-xs"
                      />
                    }
                  />
                    <CheckboxGroup label="Perception" name="mse_perception" value={formData.mse_perception || []} onChange={handleChange} options={clinicalOptions.mse_perception || []} note={formData.mse_perception_notes || ''} onNoteChange={handleChange} />
                    <CheckboxGroup label="Cognitive Functions" name="mse_cognitive_function" value={formData.mse_cognitive_function || []} onChange={handleChange} options={clinicalOptions.mse_cognitive_function || []} note={formData.mse_cognitive_function_notes || ''} onNoteChange={handleChange} />
                </div>
              </div>

              {/* General Physical Examination */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-800 border-b pb-2">General Physical Examination</h2>
                <div className="space-y-4">
                  <Textarea
                    label="GPE Findings"
                    name="gpe"
                    value={formData.gpe}
                    onChange={handleChange}
                    rows={4}
                    placeholder="BP, Pulse, Weight, BMI, General appearance, Systemic examination..."
                  />
                </div>
              </div>

              {/* Diagnosis & Management */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-800 border-b pb-2">Diagnosis & Management</h2>
                <div className="space-y-4">
                  <Textarea
                    label="Diagnosis"
                    name="diagnosis"
                    value={formData.diagnosis}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Primary and secondary diagnoses..."
                  />
                  <ICD11CodeSelector
                    value={formData.icd_code}
                    onChange={handleChange}
                    error={errors.icd_code}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Textarea
                    label="Disposal & Referral"
                    name="disposal"
                    value={formData.disposal}
                    onChange={handleChange}
                    rows={2}
                    placeholder="Admission, discharge, follow-up..."
                  />
                  <DatePicker
                    icon={<FiCalendar className="w-4 h-4" />}
                    label="Workup Appointment"
                    name="workup_appointment"
                    value={formData.workup_appointment}
                    onChange={handleChange}
                    defaultToday={true}
                  />
                  <Textarea
                    label="Referred To"
                    name="referred_to"
                    value={formData.referred_to}
                    onChange={handleChange}
                    rows={2}
                    placeholder="Other departments or specialists..."
                  />
                  <Textarea
                    label="Treatment Prescribed"
                    name="treatment_prescribed"
                    value={formData.treatment_prescribed}
                    onChange={handleChange}
                    rows={4}
                    placeholder="Treatment details..."
                  />
<div>
                      <Select
                        label="Doctor Decision"
                        name="doctor_decision"
                        value={formData.doctor_decision}
                        onChange={handleChange}
                        options={DOCTOR_DECISION}
                        required
                        disabled={isAlreadyComplex}
                        title={isAlreadyComplex ? "Cannot change from Instantly Requires Detailed Work-Up to Requires Detailed Workup on Next Follow-Up" : ""}
                      />
                      {isAlreadyComplex && (
                        <p className="mt-1 text-xs text-amber-600 flex items-center gap-1">
                          <FiAlertCircle className="w-3 h-3" />
                          This case is already marked as Instantly Requires Detailed Work-Up and cannot be changed back to Requires Detailed Workup on Next Follow-Up.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Patient Documents & Files Section - Hide in Follow-Up Mode */}
              {patientId && !isFollowUpMode && (
                <div className="space-y-6 pt-6 border-t border-gray-200">
                  <h4 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                    <div className="p-2.5 bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-sm rounded-xl border border-white/30 shadow-md">
                      <FiFileText className="w-5 h-5 text-purple-600" />
                    </div>
                    Patient Documents & Files
                  </h4>

                  {/* File Upload Component */}
                  {!hideFileUpload && (
                    <div className="mb-6">
                      <FileUpload
                        files={selectedFiles}
                        onFilesChange={setSelectedFiles}
                        maxFiles={20}
                        maxSizeMB={10}
                        patientId={patientId}
                        disabled={!patientId}
                      />
                    </div>
                  )}

                  {/* Existing Files Preview */}
                  {existingFiles && existingFiles.length > 0 && (
                    <div className="mt-6">
                      <h5 className="text-lg font-semibold text-gray-800 mb-4">
                        Existing Files ({existingFiles.filter(file => !filesToRemove.includes(file)).length})
                      </h5>
                      <FilePreview
                        files={existingFiles.filter(file => !filesToRemove.includes(file))}
                        onDelete={canEditFiles ? (filePath) => {
                          setFilesToRemove(prev => {
                            if (!prev.includes(filePath)) {
                              return [...prev, filePath];
                            }
                            return prev;
                          });
                        } : undefined}
                        canDelete={canEditFiles}
                        baseUrl={import.meta.env.VITE_API_URL || '/api'}
                      />
                    </div>
                  )}
                  {existingFiles && existingFiles.length === 0 && (
                    <div className="mt-6 text-center py-4 text-gray-500">
                      <p>No files uploaded yet</p>
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
              )}

              {/* Submit Button */}
              <div className="flex justify-end gap-3 pt-6 border-t">
                <Button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg shadow-green-500/30 px-4 py-2 rounded-md transition-all duration-200 hover:from-green-600 hover:to-green-700 hover:shadow-xl hover:shadow-green-500/40"
                >
                  <FiArrowLeft className="w-4 h-4" />
                  Cancel
                </Button>
                <Button
                  type="submit"
                  loading={isUpdating || isUploadingFiles}
                  disabled={isUpdating || isUploadingFiles}
                  className="bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/30"
                >
                  <FiSave className="w-4 h-4" />
                  {(isUpdating || isCreating || isUploadingFiles)
                    ? 'Saving...'
                    : (mode === 'create' || (!isUpdateMode && !proforma?.id))
                      ? 'Create'
                      : 'Update'}
                </Button>
              </div>
            </div>
          )}
        </Card>
          )}
      </form>
      )}
    </>
  );

  // If embedded, return just the form without full page wrapper
  if (isEmbedded) {
    return formContent;
  }

  // If standalone, return with full page wrapper
  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-teal-50">
      <div className="w-full px-6 py-8 space-y-8">
        {formContent}
      </div>
    </div>
  );
};

export default EditClinicalProforma;
