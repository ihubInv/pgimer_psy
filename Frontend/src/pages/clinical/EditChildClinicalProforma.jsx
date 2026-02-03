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
} from '../../utils/constants';

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
  
  // Form state
  const [formData, setFormData] = useState({
    // SECTION A: BASIC INFORMATION
    child_name: '',
    age: '',
    sex: '',
    date: new Date().toISOString().split('T')[0],
    source_of_referral: '',
    
    // SECTION B: DURATION OF ILLNESS
    duration_of_illness: '',
    
    // SECTION C: ONSET
    onset: '',
    
    // SECTION D: COURSE
    course: '',
    
    // SECTION E: ASSOCIATED PHYSICAL ILLNESS
    has_physical_illness: false,
    physical_illness_specification: '',
    
    // SECTION F: COMPLAINTS
    complaints_obstinacy: false,
    complaints_disobedience: false,
    complaints_aggressiveness: false,
    complaints_temper_tantrums: false,
    complaints_hyperactivity: false,
    complaints_stealing: false,
    complaints_delinquent_behaviour: false,
    complaints_low_intelligence: false,
    complaints_scholastic_backwardness: false,
    complaints_poor_memory: false,
    complaints_speech_difficulty: false,
    complaints_hearing_difficulty: false,
    complaints_epileptic: false,
    complaints_non_epileptic: false,
    complaints_both: false,
    complaints_unclear: false,
    complaints_abnormal_behaviour: false,
    complaints_irrelevant_talking: false,
    complaints_withdrawnness: false,
    complaints_shyness: false,
    complaints_excessive_clinging: false,
    complaints_anxiety: false,
    complaints_depression: false,
    complaints_feeding_problems: false,
    complaints_neurosis: false,
    complaints_thumb_sucking: false,
    complaints_nail_biting: false,
    complaints_abnormal_movements: false,
    complaints_somatic_complaints: false,
    complaints_odd_behaviour: false,
    complaints_inadequate_personal_care: false,
    
    // SECTION G: EXAMINATION
    significant_physical_findings: '',
    physical_development: '',
    family_history: [],
    family_history_details: '',
    
    // SECTION H: DIAGNOSIS & INVESTIGATION
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
    
    // SECTION I: THERAPY SUGGESTED
    therapy_drugs: false,
    therapy_antiepileptics: false,
    therapy_parental_counselling: false,
    therapy_play_therapy: false,
    therapy_individual_psychotherapy: false,
    therapy_behavioral_therapy: false,
    therapy_psychological_testing: false,
    therapy_nil_evaluation_only: false,
    
    // SECTION J: DISPOSAL
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
              setFormData(prev => ({
                ...prev,
                ...proforma,
                source_of_referral: Array.isArray(proforma.source_of_referral) 
                  ? (proforma.source_of_referral.length > 0 ? proforma.source_of_referral[0] : '')
                  : (proforma.source_of_referral || ''),
                family_history: Array.isArray(proforma.family_history) 
                  ? proforma.family_history 
                  : (proforma.family_history ? [proforma.family_history] : []),
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
              setFormData(prev => ({
                ...prev,
                ...proforma,
                source_of_referral: Array.isArray(proforma.source_of_referral) 
                  ? (proforma.source_of_referral.length > 0 ? proforma.source_of_referral[0] : '')
                  : (proforma.source_of_referral || ''),
                family_history: Array.isArray(proforma.family_history) 
                  ? proforma.family_history 
                  : (proforma.family_history ? [proforma.family_history] : []),
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
      setFormData(prev => ({
        ...prev,
        ...propInitialData,
        source_of_referral: Array.isArray(propInitialData.source_of_referral) 
          ? (propInitialData.source_of_referral.length > 0 ? propInitialData.source_of_referral[0] : '')
          : (propInitialData.source_of_referral || ''),
        family_history: Array.isArray(propInitialData.family_history) 
          ? propInitialData.family_history 
          : (propInitialData.family_history ? [propInitialData.family_history] : []),
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
    
    // Validation
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

      // Ensure family_history is always an array (for multi-select)
      const familyHistoryArray = Array.isArray(formData.family_history) 
        ? formData.family_history 
        : (formData.family_history ? [formData.family_history] : []);

      // Convert source_of_referral from string to array for backend compatibility
      // If it's already an array (multi-select), use it; otherwise convert single value to array
      const sourceOfReferralArray = Array.isArray(formData.source_of_referral)
        ? formData.source_of_referral
        : (formData.source_of_referral ? [formData.source_of_referral] : []);

      // Build payload with proper type handling
      const payload = {
        ...formData,
        child_patient_id: childPatientId || formData.child_patient_id,
        status: submitStatus,
        visit_date: formData.date || new Date().toISOString().split('T')[0],
        room_no: childPatient?.assigned_room || formData.room_no,
        assigned_doctor: currentUser?.id || formData.assigned_doctor,
        // Ensure arrays are properly formatted for backend
        source_of_referral: sourceOfReferralArray,
        family_history: familyHistoryArray,
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
          navigate('/clinical/today-patients');
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
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Standalone mode - render with Card wrapper matching Adult version */}
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
              <h3 className="text-xl font-bold text-gray-900">Child Clinical Proforma</h3>
              {childPatient && (
                <p className="text-sm text-gray-500 mt-1">
                  {childPatient.child_name} - {childPatient.cr_number || 'N/A'}
                </p>
              )}
              {isViewMode && (
                <span className="text-xs text-gray-500 mt-1 block">(View Mode)</span>
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
                handlePrintSection('Child Clinical Proforma');
              }}
              className="h-9 w-9 p-0 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border border-blue-200 hover:border-blue-300 shadow-sm hover:shadow-md transition-all duration-200 rounded-lg"
              title="Print Child Clinical Proforma"
            >
              <FiPrinter className="w-4 h-4 text-blue-600" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="h-9 w-9 p-0 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 border border-gray-200 hover:border-gray-300 shadow-sm hover:shadow-md transition-all duration-200 rounded-lg"
              title="Go Back"
            >
              <FiArrowLeft className="w-4 h-4 text-gray-600" />
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
            <form onSubmit={(e) => {
              if (isViewMode) {
                e.preventDefault();
                return;
              }
              handleSubmit(e, 'draft');
            }} className="space-y-6">
            {/* Basic Information Section */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-800 border-b pb-2">Basic Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <IconInput
                  icon={<FiUser className="w-4 h-4" />}
                  label="Child Name"
                  name="child_name"
                  value={formData.child_name}
                  onChange={handleChange}
                  readOnly
                  className="bg-gray-50"
                />
                <Input
                  label="Age"
                  name="age"
                  type="number"
                  value={formData.age}
                  onChange={handleChange}
                  placeholder="Enter age"
                  readOnly={isViewMode}
                  className={isViewMode ? "bg-gray-50" : ""}
                />
                <Select
                  label="Sex"
                  name="sex"
                  value={formData.sex}
                  onChange={handleChange}
                  options={[
                    { value: 'Male', label: 'Male' },
                    { value: 'Female', label: 'Female' },
                    { value: 'Other', label: 'Other' },
                  ]}
                  readOnly
                  className="bg-gray-50"
                />
                <DatePicker
                  label="Date"
                  name="date"
                  value={formData.date}
                  onChange={(value) => !isViewMode && setFormData(prev => ({ ...prev, date: value }))}
                  disabled={isViewMode}
                />
                <div className="md:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Source of Referral
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {CHILD_CLINICAL_SOURCE_OF_REFERRAL_OPTIONS.map(option => (
                      <label 
                        key={option.value} 
                        className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm cursor-pointer transition-colors ${
                          formData.source_of_referral === option.value 
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-800' 
                            : 'border-gray-200 bg-white hover:bg-gray-50'
                        } ${isViewMode ? 'cursor-not-allowed opacity-75' : ''}`}
                      >
                        <input
                          type="radio"
                          name="source_of_referral"
                          value={option.value}
                          checked={formData.source_of_referral === option.value}
                          onChange={handleChange}
                          disabled={isViewMode}
                          className="h-4 w-4 text-primary-600"
                        />
                        <span className="font-medium">{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Duration of Illness Section */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-800 border-b pb-2">Duration of Illness</h2>
              <div className="flex flex-wrap gap-3">
                {CHILD_CLINICAL_DURATION_OF_ILLNESS_OPTIONS.map(option => (
                  <label 
                    key={option.value} 
                    className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm cursor-pointer transition-colors ${
                      formData.duration_of_illness === option.value 
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-800' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    } ${isViewMode ? 'cursor-not-allowed opacity-75' : ''}`}
                  >
                    <input
                      type="radio"
                      name="duration_of_illness"
                      value={option.value}
                      checked={formData.duration_of_illness === option.value}
                      onChange={handleChange}
                      disabled={isViewMode}
                      className="h-4 w-4 text-primary-600"
                    />
                    <span className="font-medium">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Onset Section */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-800 border-b pb-2">Onset</h2>
              <div className="flex flex-wrap gap-3">
                {CHILD_CLINICAL_ONSET_OPTIONS.map(option => (
                  <label 
                    key={option.value} 
                    className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm cursor-pointer transition-colors ${
                      formData.onset === option.value 
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-800' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    } ${isViewMode ? 'cursor-not-allowed opacity-75' : ''}`}
                  >
                    <input
                      type="radio"
                      name="onset"
                      value={option.value}
                      checked={formData.onset === option.value}
                      onChange={handleChange}
                      disabled={isViewMode}
                      className="h-4 w-4 text-primary-600"
                    />
                    <span className="font-medium">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Course Section */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-800 border-b pb-2">Course</h2>
              <div className="flex flex-wrap gap-3">
                {CHILD_CLINICAL_COURSE_OPTIONS.map(option => (
                  <label 
                    key={option.value} 
                    className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm cursor-pointer transition-colors ${
                      formData.course === option.value 
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-800' 
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    } ${isViewMode ? 'cursor-not-allowed opacity-75' : ''}`}
                  >
                    <input
                      type="radio"
                      name="course"
                      value={option.value}
                      checked={formData.course === option.value}
                      onChange={handleChange}
                      disabled={isViewMode}
                      className="h-4 w-4 text-primary-600"
                    />
                    <span className="font-medium">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Associated Physical Illness Section */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-800 border-b pb-2">Associated Physical Illness</h2>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-3">
                  {[
                    { v: false, t: 'No' },
                    { v: true, t: 'Yes' },
                  ].map(({ v, t }) => (
                    <label 
                      key={t} 
                      className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm cursor-pointer transition-colors ${
                        formData.has_physical_illness === v 
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-800' 
                          : 'border-gray-200 bg-white hover:bg-gray-50'
                      } ${isViewMode ? 'cursor-not-allowed opacity-75' : ''}`}
                    >
                      <input
                        type="radio"
                        name="has_physical_illness"
                        checked={formData.has_physical_illness === v}
                        onChange={() => !isViewMode && setFormData(prev => ({ ...prev, has_physical_illness: v, physical_illness_specification: v ? prev.physical_illness_specification : '' }))}
                        disabled={isViewMode}
                        className="h-4 w-4 text-primary-600"
                      />
                      <span className="font-medium">{t}</span>
                    </label>
                  ))}
                </div>
                {formData.has_physical_illness && (
                  <Textarea
                    label="Specification (Mandatory if Yes)"
                    name="physical_illness_specification"
                    value={formData.physical_illness_specification}
                    onChange={handleChange}
                    rows={3}
                    required
                  />
                )}
              </div>
            </div>

            {/* Complaints / History of Presenting Illness */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-800 border-b pb-2">Complaints / History of Presenting Illness</h2>
              <div className="space-y-4">
                <div>
                  <h4 className="text-md font-medium text-gray-800 mb-2">1️⃣ Behavioral Issues</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {[
                      'obstinacy', 'disobedience', 'aggressiveness', 'temper_tantrums',
                      'hyperactivity', 'stealing', 'delinquent_behaviour', 'low_intelligence',
                      'scholastic_backwardness', 'poor_memory', 'speech_difficulty', 'hearing_difficulty',
                      'epileptic', 'non_epileptic', 'both', 'unclear'
                    ].map(field => (
                      <label key={field} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          name={`complaints_${field}`}
                          checked={formData[`complaints_${field}`]}
                          onChange={handleChange}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm text-gray-700 capitalize">{field.replace(/_/g, ' ')}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-md font-medium text-gray-800 mb-2">2️⃣ Psychological Symptoms</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {[
                      'abnormal_behaviour', 'irrelevant_talking', 'withdrawnness', 'shyness',
                      'excessive_clinging', 'anxiety', 'depression'
                    ].map(field => (
                      <label key={field} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          name={`complaints_${field}`}
                          checked={formData[`complaints_${field}`]}
                          onChange={handleChange}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm text-gray-700 capitalize">{field.replace(/_/g, ' ')}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-md font-medium text-gray-800 mb-2">3️⃣ Specific Problems</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {[
                      'feeding_problems', 'neurosis', 'thumb_sucking', 'nail_biting',
                      'abnormal_movements', 'somatic_complaints', 'odd_behaviour', 'inadequate_personal_care'
                    ].map(field => (
                      <label key={field} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          name={`complaints_${field}`}
                          checked={formData[`complaints_${field}`]}
                          onChange={handleChange}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm text-gray-700 capitalize">{field.replace(/_/g, ' ')}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Examination Section */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-800 border-b pb-2">Examination</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Textarea
                  label="Significant Physical Findings"
                  name="significant_physical_findings"
                  value={formData.significant_physical_findings}
                  onChange={handleChange}
                  rows={4}
                />
                <Select
                  label="Physical Development"
                  name="physical_development"
                  value={formData.physical_development}
                  onChange={handleChange}
                  options={CHILD_CLINICAL_PHYSICAL_DEVELOPMENT_OPTIONS}
                />
                <div className="md:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Family History (Multi-select)
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    {CHILD_CLINICAL_FAMILY_HISTORY_OPTIONS.map(option => (
                      <label key={option.value} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.family_history.includes(option.value)}
                          onChange={() => handleMultiSelect('family_history', option.value)}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm text-gray-700">{option.label}</span>
                      </label>
                    ))}
                  </div>
                  {formData.family_history.includes('Others') && (
                    <Textarea
                      label="FH Details (Conditional)"
                      name="family_history_details"
                      value={formData.family_history_details}
                      onChange={handleChange}
                      rows={3}
                      className="mt-2"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Diagnosis & Investigation Section */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-800 border-b pb-2">Diagnosis & Investigation</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Investigations Required
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {[
                      'detailed_medical_workup', 'social_family_assessment', 'school_related_evaluation',
                      'play_observation', 'neurology_consultation', 'paediatrics_consultation',
                      'ent_consultation', 'iq_testing', 'psychological_tests'
                    ].map(field => (
                      <label key={field} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          name={`investigation_${field}`}
                          checked={formData[`investigation_${field}`]}
                          onChange={handleChange}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm text-gray-700 capitalize">{field.replace(/_/g, ' ')}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <Textarea
                  label="Remarks / Provisional Diagnosis"
                  name="remarks_provisional_diagnosis"
                  value={formData.remarks_provisional_diagnosis}
                  onChange={handleChange}
                  rows={4}
                />
              </div>
            </div>

            {/* Therapy Suggested Section */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-800 border-b pb-2">Therapy Suggested</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {[
                  'drugs', 'antiepileptics', 'parental_counselling', 'play_therapy',
                  'individual_psychotherapy', 'behavioral_therapy', 'psychological_testing', 'nil_evaluation_only'
                ].map(field => (
                  <label key={field} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name={`therapy_${field}`}
                      checked={formData[`therapy_${field}`]}
                      onChange={handleChange}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700 capitalize">
                      {field === 'nil_evaluation_only' ? 'Nil (only evaluation done)' : field.replace(/_/g, ' ')}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Disposal Section */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-800 border-b pb-2">Disposal</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Select
                  label="Status"
                  name="disposal_status"
                  value={formData.disposal_status}
                  onChange={handleChange}
                  options={CHILD_CLINICAL_DISPOSAL_STATUS_OPTIONS}
                />
                {formData.disposal_status === 'Managed in Walk-in only' && (
                  <Textarea
                    label="Reason (Mandatory if Walk-in only)"
                    name="disposal_reason"
                    value={formData.disposal_reason}
                    onChange={handleChange}
                    rows={3}
                    required
                    className="md:col-span-2"
                  />
                )}
                <DatePicker
                  label="Date"
                  name="disposal_date"
                  value={formData.disposal_date}
                  onChange={(value) => setFormData(prev => ({ ...prev, disposal_date: value }))}
                />
                <Input
                  label="Time"
                  name="disposal_time"
                  type="time"
                  value={formData.disposal_time}
                  onChange={handleChange}
                />
                <Input
                  label="Distance"
                  name="disposal_distance"
                  value={formData.disposal_distance}
                  onChange={handleChange}
                />
                <Textarea
                  label="Remarks"
                  name="disposal_remarks"
                  value={formData.disposal_remarks}
                  onChange={handleChange}
                  rows={3}
                  className="md:col-span-3"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-200">
              {!isViewMode && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate(-1)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="outline"
                    loading={isSaving}
                    onClick={(e) => handleSubmit(e, 'draft')}
                    className="bg-gradient-to-r from-gray-500 to-gray-600 text-white shadow-lg shadow-gray-500/30 hover:from-gray-600 hover:to-gray-700 hover:shadow-xl hover:shadow-gray-500/40"
                  >
                    <FiSave className="w-4 h-4 mr-2" />
                    Save as Draft
                  </Button>
                  <Button
                    type="button"
                    loading={isSaving}
                    onClick={(e) => handleSubmit(e, 'submitted')}
                    className="bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg shadow-green-500/30 hover:from-green-600 hover:to-green-700 hover:shadow-xl hover:shadow-green-500/40"
                  >
                    Submit
                  </Button>
                </>
              )}
              {isViewMode && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate(-1)}
                    className="bg-gradient-to-r from-gray-500 to-gray-600 text-white shadow-lg shadow-gray-500/30 hover:from-gray-600 hover:to-gray-700 hover:shadow-xl hover:shadow-gray-500/40"
                  >
                    <FiArrowLeft className="w-4 h-4 mr-2" />
                    Go Back
                  </Button>
                  <Button
                    type="button"
                    onClick={() => navigate(`/child-clinical-proformas/${id}/edit`)}
                    className="bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg shadow-green-500/30 hover:from-green-600 hover:to-green-700 hover:shadow-xl hover:shadow-green-500/40"
                  >
                    <FiEdit3 className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                </>
              )}
            </div>
          </form>
          </div>
        )}
      </Card>
    </div>
  );
};

export default EditChildClinicalProforma;
