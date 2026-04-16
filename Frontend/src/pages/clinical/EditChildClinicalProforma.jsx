import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useSelector, useDispatch } from 'react-redux';
import { selectCurrentUser } from '../../features/auth/authSlice';
import { childClinicalApiSlice } from '../../features/clinical/childClinicalApiSlice';
import LoadingSpinner from '../../components/LoadingSpinner';
import Card from '../../components/Card';
import Input from '../../components/Input';
import Select from '../../components/Select';
import Textarea from '../../components/Textarea';
import Button from '../../components/Button';
import DatePicker from '../../components/CustomDatePicker';
import { IconInput } from '../../components/IconInput';
import { FiArrowLeft, FiSave, FiUser, FiCalendar, FiClock, FiEdit3, FiClipboard, FiPrinter, FiChevronDown, FiChevronUp, FiAlertCircle } from 'react-icons/fi';
import {
  CHILD_CLINICAL_DURATION_OF_ILLNESS_OPTIONS,
  CHILD_CLINICAL_ONSET_OPTIONS,
  CHILD_CLINICAL_COURSE_OPTIONS,
  CHILD_CLINICAL_SOURCE_OF_REFERRAL_OPTIONS,
  CHILD_CLINICAL_PHYSICAL_DEVELOPMENT_OPTIONS,
  CHILD_CLINICAL_FAMILY_HISTORY_OPTIONS,
  CHILD_CLINICAL_DISPOSAL_STATUS_OPTIONS,
  CHILD_CLINICAL_RELIABILITY_OPTIONS,
  CHILD_CLINICAL_FAMILY_TYPE_OPTIONS,
  CHILD_CLINICAL_SCHOOL_TYPE_OPTIONS,
  CHILD_CLINICAL_ACADEMIC_PERFORMANCE_OPTIONS,
  CHILD_CLINICAL_BULLYING_OPTIONS,
  CHILD_CLINICAL_NEURODEVELOPMENTAL_CONCERNS,
  CHILD_CLINICAL_BEHAVIORAL_CONCERNS,
  CHILD_CLINICAL_EMOTIONAL_PSYCHOLOGICAL_SYMPTOMS,
  CHILD_CLINICAL_TRAUMA_PSYCHOSOCIAL_STRESSORS,
  CHILD_CLINICAL_FAMILY_HISTORY_NEW,
  CHILD_CLINICAL_RISK_ASSESSMENT,
  CHILD_CLINICAL_INVESTIGATIONS_REQUIRED,
  CHILD_CLINICAL_PSYCHOLOGICAL_TREATMENT_OPTIONS,
} from '../../utils/constants';

// ── Top-level helpers (defined OUTSIDE component to keep stable references) ──

const SectionCard = ({ number, title, accent, headerBg, children }) => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
    <div className={`flex items-center gap-3 px-5 py-3 ${headerBg} border-b border-gray-100`}>
      <span className={`flex items-center justify-center w-7 h-7 rounded-full text-white text-xs font-bold shadow-sm ${accent}`}>
        {number}
      </span>
      <h2 className="font-semibold text-gray-800 text-sm tracking-wide uppercase">{title}</h2>
    </div>
    <div className={`p-5 border-l-4 ${accent.replace('bg-', 'border-')}`}>
      {children}
    </div>
  </div>
);

const ChipSelect = ({ options, selectedValues, activeClass, disabled, onToggle }) => (
  <div className="flex flex-wrap gap-2">
    {options.map(opt => {
      const isSelected = (selectedValues || []).includes(opt.value);
      return (
        <button
          key={opt.value}
          type="button"
          onClick={() => !disabled && onToggle(opt.value)}
          disabled={disabled}
          className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all duration-150 ${
            isSelected
              ? `${activeClass} text-white border-transparent shadow-sm scale-[1.02]`
              : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400 hover:bg-gray-50'
          } ${disabled ? 'cursor-default' : 'cursor-pointer'}`}
        >
          {isSelected && <span className="mr-1 text-xs">✓</span>}
          {opt.label}
        </button>
      );
    })}
  </div>
);

const RadioPill = ({ name, options, value, onChange, activeClass, disabled }) => (
  <div className="flex flex-wrap gap-2">
    {options.map(opt => (
      <label
        key={opt}
        className={`flex items-center px-4 py-2 rounded-full border text-sm font-medium transition-all duration-150 ${
          value === opt
            ? `${activeClass} text-white border-transparent shadow-sm`
            : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
        } ${disabled ? 'cursor-default' : 'cursor-pointer'}`}
      >
        <input
          type="radio"
          name={name}
          value={opt}
          checked={value === opt}
          onChange={onChange}
          disabled={disabled}
          className="sr-only"
        />
        {opt}
      </label>
    ))}
  </div>
);

const EditChildClinicalProforma = ({ 
  initialData: propInitialData = null, 
  childPatientId: propChildPatientId = null,
  onUpdate: propOnUpdate = null 
}) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const currentUser = useSelector(selectCurrentUser);
  const dispatch = useDispatch();
  
  // Check if we're in view mode (URL doesn't contain /edit)
  const location = window.location.pathname;
  const isViewMode = id && !location.includes('/edit') && !propInitialData && !propChildPatientId;
  
  const childPatientIdFromQuery = searchParams.get('child_patient_id');
  const childPatientId = propChildPatientId || childPatientIdFromQuery || null;
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [childPatient, setChildPatient] = useState(null);
  
  // Card expand/collapse state - persist in localStorage
  const getInitialExpandedCards = () => {
    try {
      const saved = localStorage.getItem('childClinicalProformaExpandedCards');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          clinicalProforma: parsed.clinicalProforma !== false, // Default to true if not explicitly false
        };
      }
    } catch (e) {
      console.error('Error loading expanded cards state:', e);
    }
    return {
      clinicalProforma: true, // Default to expanded
    };
  };

  const [expandedCards, setExpandedCards] = useState(getInitialExpandedCards);

  const toggleCard = (cardName) => {
    setExpandedCards(prev => {
      const updated = { ...prev, [cardName]: !prev[cardName] };
      // Persist to localStorage
      try {
        localStorage.setItem('childClinicalProformaExpandedCards', JSON.stringify(updated));
      } catch (e) {
        console.error('Error saving expanded cards state:', e);
      }
      return updated;
    });
  };

  // Print functionality for Child Clinical Proforma section
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

    // Create print-friendly HTML with green color scheme for Child Clinical Proforma
    const colorScheme = {
      border: '#059669',
      bg: '#f0fdf4',
      text: '#047857',
      headerBg: 'linear-gradient(to bottom, #f0fdf4, #ffffff)',
      tableHeader: '#047857',
      tableEven: '#f0fdf4'
    };

    const printHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${sectionName}</title>
          <style>
            @media print {
              @page { margin: 1cm; }
              body { margin: 0; padding: 0; }
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #1f2937;
              padding: 20px;
              background: ${colorScheme.bg};
            }
            h1, h2, h3, h4 {
              color: ${colorScheme.text};
              margin-top: 1.5em;
              margin-bottom: 0.5em;
            }
            h1 { font-size: 24px; border-bottom: 3px solid ${colorScheme.border}; padding-bottom: 10px; }
            h2 { font-size: 20px; border-bottom: 2px solid ${colorScheme.border}; padding-bottom: 8px; }
            h3 { font-size: 18px; }
            h4 { font-size: 16px; }
            .section {
              background: white;
              border: 2px solid ${colorScheme.border};
              border-radius: 8px;
              padding: 20px;
              margin-bottom: 20px;
              page-break-inside: avoid;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 15px 0;
            }
            th {
              background: ${colorScheme.tableHeader};
              color: white;
              padding: 10px;
              text-align: left;
              font-weight: 600;
            }
            td {
              padding: 8px 10px;
              border-bottom: 1px solid #e5e7eb;
            }
            tr:nth-child(even) {
              background: ${colorScheme.tableEven};
            }
            .label {
              font-weight: 600;
              color: ${colorScheme.text};
              margin-top: 10px;
              display: block;
            }
            .value {
              margin-bottom: 15px;
              padding: 8px;
              background: #f9fafb;
              border-left: 3px solid ${colorScheme.border};
            }
            .header {
              background: ${colorScheme.headerBg};
              padding: 15px;
              border-radius: 8px 8px 0 0;
              margin: -20px -20px 20px -20px;
              border-bottom: 2px solid ${colorScheme.border};
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${sectionName}</h1>
            ${childPatient ? `<p><strong>Patient:</strong> ${childPatient.child_name} (CR: ${childPatient.cr_number || 'N/A'})</p>` : ''}
            <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
          </div>
          ${sectionHTML}
        </body>
      </html>
    `;

    printWindow.document.write(printHTML);
    printWindow.document.close();
    
    // Wait for content to load, then print
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };
  
  // Form state - Updated to match new proforma structure
  const [formData, setFormData] = useState({
    // SECTION 1: BASIC INFORMATION
    child_name: '',
    age: '',
    sex: '',
    date: new Date().toISOString().split('T')[0],
    informant_relationship: '',
    reliability: '',
    family_type: '',
    socioeconomic_status: '',
    
    // SECTION 2: SCHOOL INFORMATION
    school_name: '',
    school_class: '',
    school_type: '',
    academic_performance: '',
    school_refusal: '',
    bullying: '',
    
    // SECTION 3: PRESENTING COMPLAINTS
    presenting_complaints: '',
    
    // SECTION 4: NEURODEVELOPMENTAL CONCERNS
    neurodevelopmental_concerns: [],
    neurodevelopmental_description: '',
    
    // SECTION 5: BEHAVIORAL CONCERNS
    behavioral_concerns: [],
    behavioral_description: '',
    
    // SECTION 6: EMOTIONAL & PSYCHOLOGICAL SYMPTOMS
    emotional_psychological_symptoms: [],
    emotional_psychological_description: '',
    
    // SECTION 7: TRAUMA & PSYCHOSOCIAL STRESSORS
    trauma_psychosocial_stressors: [],
    trauma_description: '',
    
    // SECTION 8: MEDICAL & FAMILY HISTORY
    associated_medical_illness: '',
    developmental_history: '',
    family_history: [],
    
    // SECTION 9: RISK ASSESSMENT
    risk_assessment: [],
    
    // SECTION 10: MENTAL STATUS EXAMINATION
    mse_appearance_behaviour: '',
    mse_rapport: '',
    mse_speech: '',
    mse_mood_affect: '',
    mse_thought: '',
    mse_perception: '',
    mse_cognition: '',
    mse_insight_judgment: '',
    
    // SECTION 11: DIAGNOSIS & FORMULATION
    provisional_diagnosis: '',
    
    // SECTION 12: INVESTIGATIONS REQUIRED
    investigations_required: [],
    
    // SECTION 13: TREATMENT PLAN
    pharmacological_treatment: '',
    psychological_treatment: [],
    high_risk_management: '',
    
    // SECTION 14: FOLLOW-UP & DISPOSAL
    follow_up_after: '',
    referred_to: '',
    
    // Legacy fields (for backward compatibility)
    source_of_referral: '',
    duration_of_illness: '',
    onset: '',
    course: '',
    has_physical_illness: false,
    physical_illness_specification: '',
    significant_physical_findings: '',
    physical_development: '',
    family_history_details: '',
    investigation_detailed_medical_workup: false,
    investigation_social_family_assessment: false,
    investigation_school_related_evaluation: false,
    investigation_play_observation: false,
    investigation_neurology_consultation: false,
    investigation_paediatrics_consultation: false,
    investigation_ent_consultation: false,
    investigation_iq_testing: false,
    investigation_psychological_tests: false,
    remarks_provisional_diagnosis: '',
    therapy_drugs: false,
    therapy_antiepileptics: false,
    therapy_parental_counselling: false,
    therapy_play_therapy: false,
    therapy_individual_psychotherapy: false,
    therapy_behavioral_therapy: false,
    therapy_psychological_testing: false,
    therapy_nil_evaluation_only: false,
    disposal_status: '',
    disposal_reason: '',
    disposal_date: '',
    disposal_time: '',
    disposal_distance: '',
    disposal_remarks: '',
    
    // Status
    status: 'draft',
  });

  // Fetch child patient data
  useEffect(() => {
    const fetchChildPatient = async () => {
      if (!childPatientId) return;
      
      setIsLoading(true);
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(
          `${import.meta.env.VITE_API_URL || '/api'}/child-patient/${childPatientId}`,
          {
            headers: {
              'Authorization': token ? `Bearer ${token}` : '',
            },
            credentials: 'include'
          }
        );
        
        if (response.ok) {
          const data = await response.json();
          const patient = data.data?.childPatient || data.data?.child_patient;
          setChildPatient(patient);
          
          // Auto-fill from child patient registration
          if (patient) {
            setFormData(prev => ({
              ...prev,
              child_name: patient.child_name || '',
              sex: patient.sex || '',
              // Extract approximate age from age_group
              age: patient.age_group ? extractAgeFromGroup(patient.age_group) : '',
            }));
          }
        }
      } catch (error) {
        console.error('Error fetching child patient:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchChildPatient();
  }, [childPatientId]);

  // Load existing proforma if editing
  useEffect(() => {
    const fetchProforma = async () => {
      // If propInitialData is provided, skip (will be handled by another useEffect)
      if (propInitialData) return;
      
      // Case 1: Fetch by proforma ID (when accessed via route /child-clinical-proformas/:id)
      if (id && !propChildPatientId) {
        setIsLoading(true);
        try {
          const token = localStorage.getItem('token');
          const response = await fetch(
            `${import.meta.env.VITE_API_URL || '/api'}/child-clinical-proformas/${id}`,
            {
              headers: {
                'Authorization': token ? `Bearer ${token}` : '',
              },
              credentials: 'include'
            }
          );
          
          if (response.ok) {
            const data = await response.json();
            const proforma = data.data?.proforma;
            if (proforma) {
              // Helper to ensure array format
              const ensureArray = (value) => {
                if (Array.isArray(value)) return value;
                if (value) return [value];
                return [];
              };
              
              setFormData(prev => ({
                ...prev,
                ...proforma,
                // Ensure all new array fields are properly formatted
                neurodevelopmental_concerns: ensureArray(proforma.neurodevelopmental_concerns),
                behavioral_concerns: ensureArray(proforma.behavioral_concerns),
                emotional_psychological_symptoms: ensureArray(proforma.emotional_psychological_symptoms),
                trauma_psychosocial_stressors: ensureArray(proforma.trauma_psychosocial_stressors),
                risk_assessment: ensureArray(proforma.risk_assessment),
                investigations_required: ensureArray(proforma.investigations_required),
                psychological_treatment: ensureArray(proforma.psychological_treatment),
                // Legacy fields for backward compatibility
                source_of_referral: Array.isArray(proforma.source_of_referral) 
                  ? (proforma.source_of_referral.length > 0 ? proforma.source_of_referral[0] : '')
                  : (proforma.source_of_referral || ''),
                family_history: ensureArray(proforma.family_history),
              }));
            }
          }
        } catch (error) {
          console.error('Error fetching proforma:', error);
        } finally {
          setIsLoading(false);
        }
        return;
      }
      
      // Case 2: Fetch most recent proforma by child patient ID (when embedded in CreateChildPatient)
      if (propChildPatientId && !id) {
        setIsLoading(true);
        try {
          const token = localStorage.getItem('token');
          const response = await fetch(
            `${import.meta.env.VITE_API_URL || '/api'}/child-clinical-proformas/child-patient/${propChildPatientId}`,
            {
              headers: {
                'Authorization': token ? `Bearer ${token}` : '',
              },
              credentials: 'include'
            }
          );
          
          if (response.ok) {
            const data = await response.json();
            const proformas = data.data?.proformas || [];
            // Get the most recent proforma (first one, as they should be sorted by date desc)
            const proforma = proformas.length > 0 ? proformas[0] : null;
            if (proforma) {
              // Helper to ensure array format
              const ensureArray = (value) => {
                if (Array.isArray(value)) return value;
                if (value) return [value];
                return [];
              };
              
              setFormData(prev => ({
                ...prev,
                ...proforma,
                // Ensure all new array fields are properly formatted
                neurodevelopmental_concerns: ensureArray(proforma.neurodevelopmental_concerns),
                behavioral_concerns: ensureArray(proforma.behavioral_concerns),
                emotional_psychological_symptoms: ensureArray(proforma.emotional_psychological_symptoms),
                trauma_psychosocial_stressors: ensureArray(proforma.trauma_psychosocial_stressors),
                risk_assessment: ensureArray(proforma.risk_assessment),
                investigations_required: ensureArray(proforma.investigations_required),
                psychological_treatment: ensureArray(proforma.psychological_treatment),
                // Legacy fields for backward compatibility
                source_of_referral: Array.isArray(proforma.source_of_referral) 
                  ? (proforma.source_of_referral.length > 0 ? proforma.source_of_referral[0] : '')
                  : (proforma.source_of_referral || ''),
                family_history: ensureArray(proforma.family_history),
              }));
            }
          }
        } catch (error) {
          console.error('Error fetching proforma by child patient ID:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };
    
    fetchProforma();
  }, [id, propInitialData, propChildPatientId]);

  // Load from propInitialData if provided
  useEffect(() => {
    if (propInitialData) {
      // Helper to ensure array format
      const ensureArray = (value) => {
        if (Array.isArray(value)) return value;
        if (value) return [value];
        return [];
      };
      
      setFormData(prev => ({
        ...prev,
        ...propInitialData,
        // Ensure all new array fields are properly formatted
        neurodevelopmental_concerns: ensureArray(propInitialData.neurodevelopmental_concerns),
        behavioral_concerns: ensureArray(propInitialData.behavioral_concerns),
        emotional_psychological_symptoms: ensureArray(propInitialData.emotional_psychological_symptoms),
        trauma_psychosocial_stressors: ensureArray(propInitialData.trauma_psychosocial_stressors),
        risk_assessment: ensureArray(propInitialData.risk_assessment),
        investigations_required: ensureArray(propInitialData.investigations_required),
        psychological_treatment: ensureArray(propInitialData.psychological_treatment),
        // Legacy fields for backward compatibility
        source_of_referral: Array.isArray(propInitialData.source_of_referral) 
          ? (propInitialData.source_of_referral.length > 0 ? propInitialData.source_of_referral[0] : '')
          : (propInitialData.source_of_referral || ''),
        family_history: ensureArray(propInitialData.family_history),
      }));
    }
  }, [propInitialData]);

  // Helper to extract approximate age from age group
  const extractAgeFromGroup = (ageGroup) => {
    const ageMap = {
      'Less than 1 year': 0,
      '1 – 5 years': 3,
      '5 – 10 years': 7,
      '10 – 15 years': 12
    };
    return ageMap[ageGroup] || '';
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleMultiSelect = (name, value) => {
    // Prevent changes in view mode
    if (isViewMode) return;
    
    setFormData(prev => {
      const current = prev[name] || [];
      const index = current.indexOf(value);
      if (index > -1) {
        return { ...prev, [name]: current.filter(item => item !== value) };
      } else {
        return { ...prev, [name]: [...current, value] };
      }
    });
  };

  const handleSubmit = async (e, submitStatus = 'draft') => {
    e.preventDefault();
    
    // Validation - Updated for new structure
    // No specific validations required for new structure, but keeping legacy validations for backward compatibility
    if (formData.has_physical_illness && !formData.physical_illness_specification.trim()) {
      toast.error('Please specify the physical illness');
      return;
    }
    
    if (formData.disposal_status === 'Managed in Walk-in only' && !formData.disposal_reason.trim()) {
      toast.error('Please provide a reason for "Managed in Walk-in only"');
      return;
    }
    
    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      const url = id 
        ? `${import.meta.env.VITE_API_URL || '/api'}/child-clinical-proformas/${id}`
        : `${import.meta.env.VITE_API_URL || '/api'}/child-clinical-proformas`;
      
      const method = id ? 'PUT' : 'POST';
      
      // Helper function to sanitize date fields - convert empty strings to null
      const sanitizeDate = (dateValue) => {
        if (!dateValue || dateValue === '' || (typeof dateValue === 'string' && dateValue.trim() === '')) {
          return null;
        }
        return dateValue;
      };

      // Helper function to sanitize time fields - convert empty strings to null
      const sanitizeTime = (timeValue) => {
        if (!timeValue || timeValue === '' || (typeof timeValue === 'string' && timeValue.trim() === '')) {
          return null;
        }
        return timeValue;
      };

      // Ensure all multi-select arrays are properly formatted
      const ensureArray = (value) => {
        if (Array.isArray(value)) return value;
        if (value) return [value];
        return [];
      };

      // Build payload with proper type handling - includes both new and legacy fields
      const payload = {
        ...formData,
        child_patient_id: childPatientId || formData.child_patient_id,
        status: submitStatus,
        visit_date: formData.date || new Date().toISOString().split('T')[0],
        room_no: childPatient?.assigned_room || formData.room_no,
        assigned_doctor: currentUser?.id || formData.assigned_doctor,
        // Ensure all array fields are properly formatted
        neurodevelopmental_concerns: ensureArray(formData.neurodevelopmental_concerns),
        behavioral_concerns: ensureArray(formData.behavioral_concerns),
        emotional_psychological_symptoms: ensureArray(formData.emotional_psychological_symptoms),
        trauma_psychosocial_stressors: ensureArray(formData.trauma_psychosocial_stressors),
        family_history: ensureArray(formData.family_history),
        risk_assessment: ensureArray(formData.risk_assessment),
        investigations_required: ensureArray(formData.investigations_required),
        psychological_treatment: ensureArray(formData.psychological_treatment),
        // Legacy fields for backward compatibility
        source_of_referral: ensureArray(formData.source_of_referral),
        // Sanitize date fields - convert empty strings to null
        date: sanitizeDate(formData.date) || new Date().toISOString().split('T')[0],
        disposal_date: sanitizeDate(formData.disposal_date),
        // Sanitize time fields - convert empty strings to null
        disposal_time: sanitizeTime(formData.disposal_time),
      };

      // Debug: Log payload to verify data types (remove in production if needed)
      console.log('[EditChildClinicalProforma] Payload being sent:', {
        'duration_of_illness (type)': typeof payload.duration_of_illness,
        'duration_of_illness (value)': payload.duration_of_illness,
        'onset (type)': typeof payload.onset,
        'onset (value)': payload.onset,
        'course (type)': typeof payload.course,
        'course (value)': payload.course,
        'physical_development (type)': typeof payload.physical_development,
        'physical_development (value)': payload.physical_development,
        'disposal_status (type)': typeof payload.disposal_status,
        'disposal_status (value)': payload.disposal_status,
        'source_of_referral (type)': Array.isArray(payload.source_of_referral) ? 'array' : typeof payload.source_of_referral,
        'source_of_referral (value)': payload.source_of_referral,
        'family_history (type)': Array.isArray(payload.family_history) ? 'array' : typeof payload.family_history,
        'family_history (value)': payload.family_history,
        'complaints_disobedience (type)': typeof payload.complaints_disobedience,
        'complaints_disobedience (value)': payload.complaints_disobedience,
      });
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify(payload),
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (response.ok) {
        toast.success(submitStatus === 'submitted' 
          ? 'Child clinical proforma submitted successfully' 
          : 'Child clinical proforma saved as draft');
        
        if (propOnUpdate) {
          propOnUpdate(data.data?.proforma);
        } else if (!id) {
          // After creating a new proforma, invalidate cache to trigger refetch in Today's Patients
          const childPatientIdToInvalidate = childPatientId || formData.child_patient_id;
          if (childPatientIdToInvalidate) {
            dispatch(
              childClinicalApiSlice.util.invalidateTags([
                { type: 'ChildClinical', id: `child-patient-${childPatientIdToInvalidate}` },
                'ChildClinical'
              ])
            );
          }
          
          // Navigate back to Today's Patients page
          // The button will automatically change from "Clinical Proforma" to "Follow-Up"
          navigate('/clinical-today-patients');
        }
      } else {
        toast.error(data.message || 'Failed to save child clinical proforma');
      }
    } catch (error) {
      console.error('Error saving proforma:', error);
      toast.error('Failed to save child clinical proforma');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── TOP HEADER ─────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-blue-800 via-blue-900 to-indigo-900 text-white shadow-xl print:hidden">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
              >
                <FiArrowLeft className="w-5 h-5" />
              </button>
            <div>
                <p className="text-blue-300 text-xs font-semibold uppercase tracking-widest">
                  PGIMER — Child & Adolescent Psychiatry
                </p>
                <h1 className="text-lg font-bold leading-tight">Walk-In Clinical Proforma</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
              {isViewMode && (
                <span className="hidden sm:inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-semibold border border-amber-400/30">
                  <FiAlertCircle className="w-3 h-3" /> View Mode
                </span>
              )}
              <button
              type="button"
                onClick={() => handlePrintSection('Child Clinical Proforma')}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-sm"
            >
                <FiPrinter className="w-4 h-4" />
                <span className="hidden sm:inline">Print</span>
              </button>
              {isViewMode && id && (
                <button
              type="button"
                  onClick={() => navigate(`/child-clinical-proformas/${id}/edit`)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500 hover:bg-green-400 transition-colors text-sm font-semibold shadow-lg shadow-green-900/30"
                >
                  <FiEdit3 className="w-4 h-4" /> Edit
                </button>
              )}
            </div>
          </div>

          {/* Patient Info Strip */}
          {childPatient && (
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white/10 rounded-2xl p-4 border border-white/10">
              {[
                { label: 'Patient Name', value: childPatient.child_name || formData.child_name || '—' },
                { label: 'CR Number',   value: childPatient.cr_number  || '—' },
                { label: 'CGC Number',  value: childPatient.cgc_number || '—' },
                { label: 'Age / Sex',   value: `${childPatient.age || formData.age || '—'} yrs / ${childPatient.sex || formData.sex || '—'}` },
              ].map(item => (
                <div key={item.label}>
                  <p className="text-blue-300 text-xs font-semibold uppercase tracking-wide mb-0.5">{item.label}</p>
                  <p className="text-white font-semibold truncate">{item.value}</p>
                </div>
              ))}
            </div>
          )}
          </div>
        </div>

      {/* ── FORM BODY ──────────────────────────────────────────────────────── */}
      <div ref={printSectionRef} className="px-4 py-6">
        <form
          onSubmit={(e) => { if (isViewMode) { e.preventDefault(); return; } handleSubmit(e, 'draft'); }}
          className="space-y-4"
        >

          {/* ── 1. BASIC INFORMATION ─────────────────────────────────────── */}
          <SectionCard number={1} title="Basic Information" accent="bg-blue-600" headerBg="bg-blue-50">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="col-span-2">
                <IconInput
                  icon={<FiUser className="w-4 h-4" />}
                  label="Patient Name"
                  name="child_name"
                  value={formData.child_name}
                  readOnly
                  className="bg-gray-50"
                />
              </div>
                <Input
                label="Age (years)"
                  name="age"
                  type="number"
                  value={formData.age}
                  onChange={handleChange}
                placeholder="Age"
                  readOnly={isViewMode}
                  className={isViewMode ? "bg-gray-50" : ""}
                />
                <Select
                  label="Sex"
                  name="sex"
                  value={formData.sex}
                  onChange={handleChange}
                  options={[
                  { value: 'Male',   label: 'Male'   },
                    { value: 'Female', label: 'Female' },
                  { value: 'Other',  label: 'Other'  },
                  ]}
                  readOnly
                  className="bg-gray-50"
                />
              <div className="col-span-2">
                <DatePicker
                  label="Date of Visit"
                  name="date"
                  value={formData.date}
                  onChange={(value) => !isViewMode && setFormData(prev => ({ ...prev, date: value }))}
                  disabled={isViewMode}
                />
              </div>
              <div className="col-span-2">
                <Input
                  label="Informant / Relationship to Child"
                  name="informant_relationship"
                  value={formData.informant_relationship}
                          onChange={handleChange}
                  placeholder="e.g., Mother, Father, Guardian"
                  readOnly={isViewMode}
                  className={isViewMode ? "bg-gray-50" : ""}
                        />
                  </div>
              <div>
                <Select
                  label="Reliability of Informant"
                  name="reliability"
                  value={formData.reliability}
                  onChange={handleChange}
                  options={CHILD_CLINICAL_RELIABILITY_OPTIONS}
                  readOnly={isViewMode}
                  className={isViewMode ? "bg-gray-50" : ""}
                />
                </div>
              <div>
                <Select
                  label="Family Type"
                  name="family_type"
                  value={formData.family_type}
                  onChange={handleChange}
                  options={CHILD_CLINICAL_FAMILY_TYPE_OPTIONS}
                  readOnly={isViewMode}
                  className={isViewMode ? "bg-gray-50" : ""}
                />
              </div>
              <div className="col-span-2">
                <Input
                  label="Socioeconomic Status"
                  name="socioeconomic_status"
                  value={formData.socioeconomic_status}
                      onChange={handleChange}
                  placeholder="e.g., Lower class, Middle class, Upper class"
                  readOnly={isViewMode}
                  className={isViewMode ? "bg-gray-50" : ""}
                    />
              </div>
            </div>
          </SectionCard>

          {/* ── 2. SCHOOL INFORMATION ────────────────────────────────────── */}
          <SectionCard number={2} title="School Information" accent="bg-violet-600" headerBg="bg-violet-50">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="col-span-2">
                <Input
                  label="School Name"
                  name="school_name"
                  value={formData.school_name}
                      onChange={handleChange}
                  placeholder="Enter school name"
                  readOnly={isViewMode}
                  className={isViewMode ? "bg-gray-50" : ""}
                    />
              </div>
              <Input
                label="Class / Grade"
                name="school_class"
                value={formData.school_class}
                      onChange={handleChange}
                placeholder="e.g., 5th, 8th"
                readOnly={isViewMode}
                className={isViewMode ? "bg-gray-50" : ""}
              />
              <Select
                label="School Type"
                name="school_type"
                value={formData.school_type}
                onChange={handleChange}
                options={CHILD_CLINICAL_SCHOOL_TYPE_OPTIONS}
                readOnly={isViewMode}
                className={isViewMode ? "bg-gray-50" : ""}
              />
              <Select
                label="Academic Performance"
                name="academic_performance"
                value={formData.academic_performance}
                onChange={handleChange}
                options={CHILD_CLINICAL_ACADEMIC_PERFORMANCE_OPTIONS}
                readOnly={isViewMode}
                className={isViewMode ? "bg-gray-50" : ""}
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">School Refusal</label>
                <RadioPill
                  name="school_refusal"
                  options={['Yes', 'No']}
                  value={formData.school_refusal}
                  onChange={handleChange}
                  activeClass="bg-violet-600"
                      disabled={isViewMode}
                    />
              </div>
              <div>
                <Select
                  label="Bullying"
                  name="bullying"
                  value={formData.bullying}
                  onChange={handleChange}
                  options={CHILD_CLINICAL_BULLYING_OPTIONS}
                  readOnly={isViewMode}
                  className={isViewMode ? "bg-gray-50" : ""}
                />
            </div>
            </div>
          </SectionCard>

          {/* ── 3. PRESENTING COMPLAINTS ─────────────────────────────────── */}
          <SectionCard number={3} title="Presenting Complaints" accent="bg-amber-600" headerBg="bg-amber-50">
            <Textarea
              label=""
              name="presenting_complaints"
              value={formData.presenting_complaints}
              onChange={handleChange}
              rows={5}
              placeholder="Describe the main complaints, their duration, and how they started..."
              readOnly={isViewMode}
              className={isViewMode ? "bg-gray-50" : ""}
            />
          </SectionCard>

          {/* ── 4. NEURODEVELOPMENTAL CONCERNS ───────────────────────────── */}
          <SectionCard number={4} title="Neurodevelopmental Concerns" accent="bg-teal-600" headerBg="bg-teal-50">
            <div className="space-y-4">
              <ChipSelect
                options={CHILD_CLINICAL_NEURODEVELOPMENTAL_CONCERNS}
                selectedValues={formData.neurodevelopmental_concerns}
                activeClass="bg-teal-600"
                        disabled={isViewMode}
                onToggle={(val) => handleMultiSelect('neurodevelopmental_concerns', val)}
                      />
                  <Textarea
                label="Additional Description"
                name="neurodevelopmental_description"
                value={formData.neurodevelopmental_description}
                    onChange={handleChange}
                    rows={3}
                placeholder="Describe neurodevelopmental concerns in detail..."
                readOnly={isViewMode}
                className={isViewMode ? "bg-gray-50" : ""}
                  />
              </div>
          </SectionCard>

          {/* ── 5. BEHAVIORAL CONCERNS ───────────────────────────────────── */}
          <SectionCard number={5} title="Behavioral Concerns" accent="bg-red-600" headerBg="bg-red-50">
            <div className="space-y-4">
              <ChipSelect
                options={CHILD_CLINICAL_BEHAVIORAL_CONCERNS}
                selectedValues={formData.behavioral_concerns}
                activeClass="bg-red-600"
                disabled={isViewMode}
                onToggle={(val) => handleMultiSelect('behavioral_concerns', val)}
                        />
              <Textarea
                label="Additional Description"
                name="behavioral_description"
                value={formData.behavioral_description}
                          onChange={handleChange}
                rows={3}
                placeholder="Describe behavioral concerns in detail..."
                readOnly={isViewMode}
                className={isViewMode ? "bg-gray-50" : ""}
                        />
                  </div>
          </SectionCard>

          {/* ── 6. EMOTIONAL & PSYCHOLOGICAL SYMPTOMS ────────────────────── */}
          <SectionCard number={6} title="Emotional & Psychological Symptoms" accent="bg-pink-600" headerBg="bg-pink-50">
            <div className="space-y-4">
              <ChipSelect
                options={CHILD_CLINICAL_EMOTIONAL_PSYCHOLOGICAL_SYMPTOMS}
                selectedValues={formData.emotional_psychological_symptoms}
                activeClass="bg-pink-600"
                disabled={isViewMode}
                onToggle={(val) => handleMultiSelect('emotional_psychological_symptoms', val)}
              />
              <Textarea
                label="Additional Description"
                name="emotional_psychological_description"
                value={formData.emotional_psychological_description}
                          onChange={handleChange}
                rows={3}
                placeholder="Describe emotional and psychological symptoms..."
                readOnly={isViewMode}
                className={isViewMode ? "bg-gray-50" : ""}
                        />
                  </div>
          </SectionCard>

          {/* ── 7. TRAUMA & PSYCHOSOCIAL STRESSORS ───────────────────────── */}
          <SectionCard number={7} title="Trauma & Psychosocial Stressors" accent="bg-orange-600" headerBg="bg-orange-50">
            <div className="space-y-4">
              <ChipSelect
                options={CHILD_CLINICAL_TRAUMA_PSYCHOSOCIAL_STRESSORS}
                selectedValues={formData.trauma_psychosocial_stressors}
                activeClass="bg-orange-600"
                disabled={isViewMode}
                onToggle={(val) => handleMultiSelect('trauma_psychosocial_stressors', val)}
              />
                <Textarea
                label="Additional Description"
                name="trauma_description"
                value={formData.trauma_description}
                  onChange={handleChange}
                rows={3}
                placeholder="Describe traumatic events or psychosocial stressors..."
                readOnly={isViewMode}
                className={isViewMode ? "bg-gray-50" : ""}
                />
            </div>
          </SectionCard>

          {/* ── 8. MEDICAL & FAMILY HISTORY ──────────────────────────────── */}
          <SectionCard number={8} title="Medical & Family History" accent="bg-green-700" headerBg="bg-green-50">
            <div className="space-y-4">
              <Input
                label="Associated Medical Illness"
                name="associated_medical_illness"
                value={formData.associated_medical_illness}
                  onChange={handleChange}
                placeholder="e.g., Epilepsy, Diabetes, None"
                readOnly={isViewMode}
                className={isViewMode ? "bg-gray-50" : ""}
              />
                    <Textarea
                label="Developmental History"
                name="developmental_history"
                value={formData.developmental_history}
                      onChange={handleChange}
                      rows={3}
                placeholder="Birth history, developmental milestones (motor, speech, social)..."
                readOnly={isViewMode}
                className={isViewMode ? "bg-gray-50" : ""}
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Family History of:</label>
                <ChipSelect
                  options={CHILD_CLINICAL_FAMILY_HISTORY_NEW}
                  selectedValues={formData.family_history}
                  activeClass="bg-green-700"
                  disabled={isViewMode}
                  onToggle={(val) => handleMultiSelect('family_history', val)}
                    />
                </div>
              </div>
          </SectionCard>

          {/* ── 9. RISK ASSESSMENT ───────────────────────────────────────── */}
          <SectionCard number={9} title="Risk Assessment" accent="bg-rose-700" headerBg="bg-rose-50">
            <div className="space-y-3">
              <p className="text-xs text-rose-700 font-medium bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                ⚠️ Select all applicable risk factors present
              </p>
              <ChipSelect
                options={CHILD_CLINICAL_RISK_ASSESSMENT}
                selectedValues={formData.risk_assessment}
                activeClass="bg-rose-700"
                disabled={isViewMode}
                onToggle={(val) => handleMultiSelect('risk_assessment', val)}
              />
            </div>
          </SectionCard>

          {/* ── 10. MENTAL STATUS EXAMINATION ────────────────────────────── */}
          <SectionCard number={10} title="Mental Status Examination (MSE)" accent="bg-indigo-600" headerBg="bg-indigo-50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { label: 'Appearance & Behaviour', name: 'mse_appearance_behaviour', placeholder: 'e.g., Well groomed, calm, cooperative...' },
                { label: 'Rapport',                name: 'mse_rapport',              placeholder: 'e.g., Good rapport established...' },
                { label: 'Speech',                 name: 'mse_speech',               placeholder: 'e.g., Normal rate, rhythm and tone...' },
                { label: 'Mood & Affect',          name: 'mse_mood_affect',          placeholder: 'e.g., Euthymic, affect congruent...' },
                { label: 'Thought',                name: 'mse_thought',              placeholder: 'e.g., Normal form and content...' },
                { label: 'Perception',             name: 'mse_perception',           placeholder: 'e.g., No perceptual abnormalities...' },
                { label: 'Cognition',              name: 'mse_cognition',            placeholder: 'e.g., Oriented, memory intact...' },
                { label: 'Insight & Judgment',     name: 'mse_insight_judgment',     placeholder: 'e.g., Good insight, sound judgment...' },
                    ].map(field => (
                <Textarea
                  key={field.name}
                  label={field.label}
                  name={field.name}
                  value={formData[field.name]}
                          onChange={handleChange}
                  rows={2}
                  placeholder={field.placeholder}
                  readOnly={isViewMode}
                  className={isViewMode ? "bg-gray-50" : ""}
                        />
                    ))}
                  </div>
          </SectionCard>

          {/* ── 11. DIAGNOSIS & FORMULATION ──────────────────────────────── */}
          <SectionCard number={11} title="Diagnosis & Formulation" accent="bg-blue-700" headerBg="bg-blue-50">
                <Textarea
              label="Provisional Diagnosis"
              name="provisional_diagnosis"
              value={formData.provisional_diagnosis}
                  onChange={handleChange}
                  rows={4}
              placeholder="Enter provisional diagnosis, formulation and ICD-10/DSM-5 codes if applicable..."
              readOnly={isViewMode}
              className={isViewMode ? "bg-gray-50" : ""}
            />
          </SectionCard>

          {/* ── 12. INVESTIGATIONS REQUIRED ──────────────────────────────── */}
          <SectionCard number={12} title="Investigations Required" accent="bg-cyan-600" headerBg="bg-cyan-50">
            <ChipSelect
              options={CHILD_CLINICAL_INVESTIGATIONS_REQUIRED}
              selectedValues={formData.investigations_required}
              activeClass="bg-cyan-600"
              disabled={isViewMode}
              onToggle={(val) => handleMultiSelect('investigations_required', val)}
            />
          </SectionCard>

          {/* ── 13. TREATMENT PLAN ───────────────────────────────────────── */}
          <SectionCard number={13} title="Treatment Plan" accent="bg-emerald-700" headerBg="bg-emerald-50">
            <div className="space-y-5">
              <Textarea
                label="Pharmacological Treatment"
                name="pharmacological_treatment"
                value={formData.pharmacological_treatment}
                onChange={handleChange}
                rows={3}
                placeholder="e.g., Tab Risperidone 0.5mg OD, Tab Methylphenidate 5mg BD..."
                readOnly={isViewMode}
                className={isViewMode ? "bg-gray-50" : ""}
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Psychological Treatment</label>
                <ChipSelect
                  options={CHILD_CLINICAL_PSYCHOLOGICAL_TREATMENT_OPTIONS}
                  selectedValues={formData.psychological_treatment}
                  activeClass="bg-emerald-700"
                  disabled={isViewMode}
                  onToggle={(val) => handleMultiSelect('psychological_treatment', val)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  High Risk Management (Mx)
                </label>
                <div className="flex flex-wrap gap-2">
                  {['Yes', 'No'].map(opt => (
                    <label
                      key={opt}
                      className={`flex items-center gap-2 px-5 py-2 rounded-full border text-sm font-semibold transition-all duration-150 ${
                        formData.high_risk_management === opt
                          ? opt === 'Yes'
                            ? 'bg-red-600 text-white border-transparent shadow-sm'
                            : 'bg-gray-600 text-white border-transparent shadow-sm'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                      } ${isViewMode ? 'cursor-default' : 'cursor-pointer'}`}
                    >
                    <input
                        type="radio"
                        name="high_risk_management"
                        value={opt}
                        checked={formData.high_risk_management === opt}
                      onChange={handleChange}
                        disabled={isViewMode}
                        className="sr-only"
                    />
                      {opt === 'Yes' ? '⚠️ Yes — High Risk' : '✓ No — Low Risk'}
                  </label>
                ))}
              </div>
            </div>
            </div>
          </SectionCard>

          {/* ── 14. FOLLOW-UP & DISPOSAL ─────────────────────────────────── */}
          <SectionCard number={14} title="Follow-Up & Disposal" accent="bg-slate-600" headerBg="bg-slate-50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                label="Follow-up After"
                name="follow_up_after"
                value={formData.follow_up_after}
                  onChange={handleChange}
                placeholder="e.g., 2 weeks, 1 month"
                readOnly={isViewMode}
                className={isViewMode ? "bg-gray-50" : ""}
                />
                <Input
                label="Referred To"
                name="referred_to"
                value={formData.referred_to}
                  onChange={handleChange}
                placeholder="e.g., Paediatrics, Neurology, Social Work"
                readOnly={isViewMode}
                className={isViewMode ? "bg-gray-50" : ""}
                />
              </div>
          </SectionCard>

          {/* ── ACTION BAR ───────────────────────────────────────────────── */}
          <div className="sticky bottom-4 z-10 print:hidden">
            <div className="bg-white/90 backdrop-blur-md border border-gray-200 rounded-2xl shadow-xl px-5 py-4 flex items-center justify-between gap-3">
              <p className="text-xs text-gray-500 hidden sm:block">
                {isViewMode
                  ? '📄 Viewing submitted proforma'
                  : '📝 Fill all sections carefully before submitting'}
              </p>
              <div className="flex items-center gap-3 ml-auto">
              {!isViewMode && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate(-1)}
                      className="text-gray-600 border-gray-300 hover:bg-gray-50"
                  >
                    Cancel
                  </Button>
                  <Button
                      type="button"
                    loading={isSaving}
                    onClick={(e) => handleSubmit(e, 'draft')}
                      className="flex items-center gap-2 bg-gray-700 hover:bg-gray-800 text-white px-5 py-2.5 rounded-xl shadow-sm"
                  >
                      <FiSave className="w-4 h-4" />
                      Save Draft
                  </Button>
                  <Button
                    type="button"
                    loading={isSaving}
                    onClick={(e) => handleSubmit(e, 'submitted')}
                      className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-green-500/30"
                  >
                      <FiClipboard className="w-4 h-4" />
                      Submit Proforma
                  </Button>
                </>
              )}
              {isViewMode && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate(-1)}
                      className="text-gray-600 border-gray-300 hover:bg-gray-50"
                  >
                      <FiArrowLeft className="w-4 h-4 mr-1" />
                    Go Back
                  </Button>
                    {id && (
                  <Button
                    type="button"
                    onClick={() => navigate(`/child-clinical-proformas/${id}/edit`)}
                        className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-green-500/30"
                  >
                        <FiEdit3 className="w-4 h-4" />
                        Edit Proforma
                  </Button>
                    )}
                </>
              )}
            </div>
            </div>
          </div>

          </form>
          </div>
    </div>
  );
};

export default EditChildClinicalProforma;
