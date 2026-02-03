import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import {
  FiUser, FiUsers, FiHome, FiMapPin, FiCalendar, FiGlobe,
  FiFileText, FiHash, FiSave, FiX, FiCamera, FiUpload, FiEdit,
  FiClock, FiChevronDown, FiChevronUp, FiEye, FiEdit3, FiClipboard, FiPackage
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
  isMWO
} from '../../utils/constants';
import { selectCurrentUser, selectCurrentToken } from '../../features/auth/authSlice';
import { useGetAllRoomsQuery } from '../../features/rooms/roomsApiSlice';
import { useGetChildClinicalProformasByChildPatientIdQuery } from '../../features/clinical/childClinicalApiSlice';
import { useGetFollowUpsByChildPatientIdQuery } from '../../features/followUp/followUpApiSlice';
import { useGetAllPrescriptionQuery } from '../../features/prescriptions/prescriptionApiSlice';
import { formatDate } from '../../utils/formatters';
import EditChildClinicalProforma from '../clinical/EditChildClinicalProforma';
import EditADL from '../adl/EditADL';

const CreateChildPatient = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode'); // 'view' or 'edit'
  const isViewMode = mode === 'view';
  const isEditMode = Boolean(id) && !isViewMode;
  const currentUser = useSelector(selectCurrentUser);
  const token = useSelector(selectCurrentToken);
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
  });

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [selectedDocuments, setSelectedDocuments] = useState([]);
  const [selectedPhoto, setSelectedPhoto] = useState([]);
  const [sameAsPresent, setSameAsPresent] = useState(false);
  
  // State for expanded cards (Past History section and Edit mode cards)
  const [expandedCards, setExpandedCards] = useState({
    pastHistory: false,
    childRegistration: false,
    childPatientRegistration: true, // Default expanded in view mode
    childClinicalProforma: true, // Default expanded in edit mode
    intakeRecord: true, // Default expanded in edit mode
  });
  
  // State for expanded visit cards
  const [expandedVisitCards, setExpandedVisitCards] = useState({});
  
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
  
  // Fetch all prescriptions (will filter by child_patient_id or clinical_proforma_id later)
  const { data: prescriptionData, isLoading: isLoadingPrescriptions } = useGetAllPrescriptionQuery(
    { limit: 100 },
    {
      skip: !id || !isViewMode,
      refetchOnMountOrArgChange: true,
    }
  );
  
  // Extract child clinical proformas
  const childClinicalProformas = Array.isArray(childClinicalData?.data?.proformas)
    ? childClinicalData.data.proformas
    : [];
  
  // Extract child follow-ups
  const childFollowUps = Array.isArray(childFollowUpData?.data?.followups)
    ? childFollowUpData.data.followups
    : [];
  
  // Extract prescriptions and filter for this child patient
  const allPrescriptions = Array.isArray(prescriptionData?.data?.prescriptions)
    ? prescriptionData.data.prescriptions
    : [];
  
  // Filter prescriptions to only those for this child patient
  const prescriptions = useMemo(() => {
    if (!id || !allPrescriptions.length) return [];
    
    // Get all child clinical proforma IDs for this child patient
    const childProformaIds = childClinicalProformas.map(p => p.id).filter(Boolean);
    
    // Filter prescriptions that are:
    // 1. Linked to child clinical proformas for this child patient, OR
    // 2. Have patient_id matching the child patient ID (standalone prescriptions)
    return allPrescriptions.filter(p => {
      // Check if prescription is linked to a child clinical proforma for this child patient
      if (p.clinical_proforma_id && childProformaIds.includes(p.clinical_proforma_id)) {
        return true;
      }
      // Also include prescriptions with patient_id matching child patient ID (for standalone prescriptions)
      if (p.patient_id && parseInt(p.patient_id) === parseInt(id)) {
        return true;
      }
      return false;
    });
  }, [allPrescriptions, childClinicalProformas, id]);
  
  // Helper function to toggle card expansion
  const toggleCard = (cardName) => {
    setExpandedCards(prev => ({
      ...prev,
      [cardName]: !prev[cardName]
    }));
  };
  
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
  
  // Get today's date string
  const todayDateString = toISTDateString(new Date());
  
  // Create unified visit structure: group child clinical proformas, follow-ups, and prescriptions by visit date
  const unifiedVisits = useMemo(() => {
    if (!isViewMode) return [];
    
    // Combine all visit records
    const allVisits = [];
    
    // Add child clinical proformas as visits
    childClinicalProformas.forEach(proforma => {
      if (!proforma) return;
      const visitDate = proforma.visit_date || proforma.created_at || proforma.date;
      if (!visitDate) return;
      
      allVisits.push({
        visitId: `proforma-${proforma.id}`,
        visitDate: visitDate,
        type: 'child_clinical_proforma',
        isFollowUp: false,
        proforma: proforma,
        followUp: null,
        prescription: null,
      });
    });
    
    // Add child follow-ups as visits
    childFollowUps.forEach(followUp => {
      if (!followUp) return;
      const visitDate = followUp.visit_date || followUp.created_at;
      if (!visitDate) return;
      
      allVisits.push({
        visitId: `followup-${followUp.id}`,
        visitDate: visitDate,
        type: 'follow_up',
        isFollowUp: true,
        proforma: null,
        followUp: {
          ...followUp,
          child_patient_id: followUp.child_patient_id || id, // Ensure child_patient_id is set
        },
        prescription: null,
      });
    });
    
    // Add standalone prescriptions as visits (prescriptions not linked to any proforma or follow-up)
    const usedPrescriptionIds = new Set();
    prescriptions.forEach(prescription => {
      // Skip if already associated with a visit
      if (usedPrescriptionIds.has(prescription.id)) return;
      
      // Check if this prescription is already linked to a child clinical proforma that's in our visits
      const isLinkedToProforma = childClinicalProformas.some(proforma => 
        proforma.id === prescription.clinical_proforma_id
      );
      
      // Only add as standalone if not linked to any proforma
      if (!isLinkedToProforma) {
        const visitDate = prescription.created_at || prescription.prescription_date;
        if (!visitDate) return;
        
        allVisits.push({
          visitId: `prescription-${prescription.id}`,
          visitDate: visitDate,
          type: 'prescription',
          isFollowUp: false,
          proforma: null,
          followUp: null,
          prescription: prescription,
        });
        usedPrescriptionIds.add(prescription.id);
      }
    });
    
    // Group visits by date and associate prescriptions
    const visitsByDate = {};
    
    allVisits.forEach(visit => {
      const dateKey = toISTDateString(visit.visitDate);
      if (!dateKey) return;
      
      if (!visitsByDate[dateKey]) {
        visitsByDate[dateKey] = [];
      }
      
      // Try to find associated prescription for this visit
      if (visit.type === 'child_clinical_proforma' && visit.proforma) {
        // Look for prescription linked to this child clinical proforma by clinical_proforma_id
        const associatedPrescription = prescriptions.find(p => 
          p.clinical_proforma_id === visit.proforma.id
        );
        if (associatedPrescription) {
          visit.prescription = associatedPrescription;
        }
      } else if (visit.type === 'follow_up' && visit.followUp) {
        // For follow-ups, try to find prescription by matching date
        // Note: Follow-ups might have prescriptions linked via a minimal clinical proforma
        // For now, we'll match by date - this could be improved if follow-ups get direct prescription links
        const associatedPrescription = prescriptions.find(p => {
          const prescriptionDate = toISTDateString(p.created_at || p.prescription_date);
          return prescriptionDate === dateKey;
        });
        if (associatedPrescription) {
          visit.prescription = associatedPrescription;
        }
      }
      
      visitsByDate[dateKey].push(visit);
    });
    
    // Convert to array and sort by date (newest first)
    const sortedVisits = Object.entries(visitsByDate)
      .map(([date, visits]) => ({
        visitDate: date,
        visits: visits.sort((a, b) => {
          const dateA = new Date(a.visitDate);
          const dateB = new Date(b.visitDate);
          return dateB - dateA;
        }),
      }))
      .sort((a, b) => {
        const dateA = new Date(a.visitDate);
        const dateB = new Date(b.visitDate);
        return dateB - dateA; // Newest first
      });
    
    return sortedVisits;
  }, [childClinicalProformas, childFollowUps, prescriptions, id, isViewMode, todayDateString]);
  
  // Filter past proformas (exclude today's) - for backward compatibility
  const pastProformas = useMemo(() => {
    return childClinicalProformas.filter(proforma => {
      if (!proforma) return false;
      const proformaDate = toISTDateString(proforma.visit_date || proforma.created_at || proforma.date);
      return proformaDate && proformaDate !== todayDateString;
    }).sort((a, b) => {
      const dateA = new Date(a.visit_date || a.created_at || a.date || 0);
      const dateB = new Date(b.visit_date || b.created_at || b.date || 0);
      return dateB - dateA; // Newest first
    });
  }, [childClinicalProformas, todayDateString]);

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

      // Add documents
      selectedDocuments.forEach((file, index) => {
        formDataToSend.append('documents', file);
      });

      // Add photo (single file)
      if (selectedPhoto.length > 0) {
        formDataToSend.append('photo', selectedPhoto[0]);
      }

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
      setSelectedPhoto([]);
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
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50/30 to-indigo-100/40 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-400/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-400/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full px-4 sm:px-6 lg:px-8 py-6 lg:py-10 space-y-6 lg:space-y-8">
        {/* Child Patient Registration Form - Hide in edit mode */}
        {!isEditMode && (
          <Card className="shadow-lg border-0 bg-white">
            {/* Collapsible Header for View Mode */}
            {isViewMode ? (
              <div
                className="flex items-center justify-between p-6 border-b border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => toggleCard('childPatientRegistration')}
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-br from-primary-100 to-primary-200 rounded-lg">
                    <FiUsers className="h-6 w-6 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      Child Patient Registration Details (View Mode)
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      View child patient registration information
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
            ) : (
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-br from-primary-100 to-primary-200 rounded-lg">
                    <FiUsers className="h-6 w-6 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      Child Guidance Clinic (CGC) - Child Patient Registration
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Postgraduate Institute of Medical Education & Research, Chandigarh
                    </p>
                  </div>
                </div>
              </div>
            )}

            {(!isViewMode || expandedCards.childPatientRegistration) && (
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
                disabled={isViewMode || (formData.age && formData.age.trim() !== '')}
                className={formData.age && formData.age.trim() !== '' ? "bg-gray-50 cursor-not-allowed" : ""}
                title={formData.age && formData.age.trim() !== '' ? "Age group is auto-calculated from age" : ""}
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

            {/* Patient Photo */}
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Patient Photo</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-3">
                  <FileUpload
                    files={selectedPhoto}
                    onFilesChange={setSelectedPhoto}
                    maxFiles={1}
                    maxSizeMB={10}
                    accept="image/*"
                    disabled={isViewMode}
                  />
                  {selectedPhoto.length > 0 && (
                    <p className="mt-2 text-sm text-gray-600">
                      Photo selected
                    </p>
                  )}
                </div>
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
                <>
                  <Button
                    type="button"
                    onClick={() => navigate(`/child-patient/${id}?mode=edit`)}
                    className="px-6 lg:px-8 py-3 bg-[#0ea5e9] hover:bg-[#0284c7] text-white font-bold shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    <FiEdit className="mr-2" />
                    Edit
                  </Button>
                  <Button
                    type="button"
                    onClick={() => navigate('/patients')}
                    className="px-6 lg:px-8 py-3 bg-gray-500 hover:bg-gray-600 text-white font-bold shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    Back to Patients List
                  </Button>
                </>
              ) : (
                <Button
                  type="submit"
                  loading={isLoading}
                  disabled={isLoading || isLoadingData}
                  className="px-6 lg:px-8 py-3 bg-[#0ea5e9] hover:bg-[#0284c7] text-white font-bold shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  <FiSave className="mr-2" />
                  {isLoading 
                    ? (isEditMode ? 'Updating...' : 'Registering...')
                    : (isEditMode ? 'Update Child Patient' : 'Register Child Patient')}
                </Button>
              )}
            </div>
          </form>
            )}
        </Card>
        )}

        {/* Edit Mode: Show Child Clinical Proforma and Intake Record in collapsible cards */}
        {isEditMode && id && (
          <>
            {/* Child Clinical Proforma Card */}
            <Card className="shadow-lg border-0 bg-white">
              <div
                className="flex items-center justify-between p-6 border-b border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <div 
                  className="flex items-center gap-4 cursor-pointer flex-1"
                  onClick={() => toggleCard('childClinicalProforma')}
                >
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <FiClipboard className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Child Clinical Proforma</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Create or edit child clinical proforma
                    </p>
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
                  <EditChildClinicalProforma
                    childPatientId={id}
                    onUpdate={(proforma) => {
                      // Optionally handle update
                      console.log('Child clinical proforma updated:', proforma);
                    }}
                  />
                </div>
              )}
            </Card>

            {/* Intake Record (ADL) Card */}
            <Card className="shadow-lg border-0 bg-white">
              <div
                className="flex items-center justify-between p-6 border-b border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <div 
                  className="flex items-center gap-4 cursor-pointer flex-1"
                  onClick={() => toggleCard('intakeRecord')}
                >
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <FiFileText className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Intake Record</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Out Patient Intake Record form
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
                  <EditADL
                    isEmbedded={true}
                    childPatientId={id}
                    patientId={null}
                  />
                </div>
              )}
            </Card>
          </>
        )}
        
        {/* Past History Section - Only show when viewing (not editing) existing child patient */}
        {id && isViewMode && (
          <Card className="shadow-lg border-0 bg-white mt-6">
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
                    {unifiedVisits.length > 0 
                      ? `${unifiedVisits.length} visit${unifiedVisits.length > 1 ? 's' : ''} - View only`
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
                {/* Child Registration Details Card */}
                <Card className="shadow-md border-2 border-blue-200">
                  <div
                    className="flex items-center justify-between p-4 border-b border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => toggleCard('childRegistration')}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <FiUser className="h-5 w-5 text-blue-600" />
                      </div>
                      <h4 className="text-lg font-bold text-gray-900">Child Registration Details</h4>
                    </div>
                    <div className="flex items-center gap-2">
                      {expandedCards.childRegistration ? (
                        <FiChevronUp className="h-5 w-5 text-gray-500" />
                      ) : (
                        <FiChevronDown className="h-5 w-5 text-gray-500" />
                      )}
                    </div>
                  </div>
                  {expandedCards.childRegistration && (
                    <div className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                          <label className="text-xs font-medium text-gray-500">Child Name</label>
                          <input
                            type="text"
                            value={formData.child_name || ''}
                            disabled
                            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 cursor-not-allowed"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-500">CGC No</label>
                          <input
                            type="text"
                            value={formData.cgc_number || ''}
                            disabled
                            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 cursor-not-allowed"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-500">CR No</label>
                          <input
                            type="text"
                            value={formData.cr_number || ''}
                            disabled
                            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 cursor-not-allowed"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-500">Age Group</label>
                          <input
                            type="text"
                            value={formData.age_group || ''}
                            disabled
                            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 cursor-not-allowed"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-500">Sex</label>
                          <input
                            type="text"
                            value={formData.sex || ''}
                            disabled
                            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 cursor-not-allowed"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-500">Assigned Room</label>
                          <input
                            type="text"
                            value={formData.assigned_room || ''}
                            disabled
                            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 cursor-not-allowed"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </Card>

                {/* Unified Visit Records - Grouped by Date */}
                {unifiedVisits.length > 0 ? (
                  <div className="space-y-6">
                    {unifiedVisits.map((visitGroup) => {
                      const visitDate = formatDate(visitGroup.visitDate);
                      const dateKey = visitGroup.visitDate;
                      const isDateExpanded = isVisitCardExpanded(`date-${dateKey}`);
                      
                      // Count visit types for this date
                      const hasProforma = visitGroup.visits.some(v => v.proforma);
                      const hasFollowUp = visitGroup.visits.some(v => v.followUp);
                      const hasPrescription = visitGroup.visits.some(v => v.prescription || v.type === 'prescription');
                      const visitCount = visitGroup.visits.length;
                      
                      return (
                        <Card key={`date-${dateKey}`} className="shadow-lg border-2 border-purple-200">
                          {/* Date Header */}
                          <div
                            className="flex items-center justify-between p-5 border-b border-gray-200 hover:bg-purple-50 transition-colors cursor-pointer"
                            onClick={() => toggleVisitCard(`date-${dateKey}`)}
                          >
                            <div className="flex items-center gap-4">
                              <div className="p-3 bg-purple-100 rounded-lg">
                                <FiCalendar className="h-6 w-6 text-purple-600" />
                              </div>
                              <div>
                                <h4 className="text-xl font-bold text-gray-900">
                                  {visitDate}
                                </h4>
                                <div className="flex items-center gap-3 mt-2">
                                  {hasProforma && (
                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                                      <FiClipboard className="w-3 h-3" /> Clinical Proforma
                                    </span>
                                  )}
                                  {hasFollowUp && (
                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                                      <FiFileText className="w-3 h-3" /> Follow-Up Visit
                                    </span>
                                  )}
                                  {hasPrescription && (
                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs font-medium">
                                      <FiPackage className="w-3 h-3" /> Prescription
                                    </span>
                                  )}
                                  <span className="text-xs text-gray-500">
                                    {visitCount} {visitCount === 1 ? 'record' : 'records'}
                                  </span>
                                </div>
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
                          
                          {/* All Visit Types for This Date */}
                          {isDateExpanded && (
                            <div className="p-6 space-y-4">
                              {visitGroup.visits.map((visit) => {
                                const visitId = visit.visitId;
                                const isVisitExpanded = isVisitCardExpanded(visitId);
                                
                                return (
                                  <div key={visitId} className="border border-gray-200 rounded-lg">
                                    {/* Visit Type Header */}
                                    <div
                                      className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                                      onClick={() => toggleVisitCard(visitId)}
                                    >
                                      <div className="flex items-center gap-3">
                                        {visit.type === 'prescription' ? (
                                          <FiPackage className="h-5 w-5 text-amber-600" />
                                        ) : visit.isFollowUp ? (
                                          <FiFileText className="h-5 w-5 text-blue-600" />
                                        ) : (
                                          <FiClipboard className="h-5 w-5 text-green-600" />
                                        )}
                                        <div>
                                          <h5 className="font-semibold text-gray-900">
                                            {visit.type === 'prescription' 
                                              ? 'Prescription' 
                                              : visit.isFollowUp 
                                                ? 'Follow-Up Visit' 
                                                : 'Child Clinical Proforma'}
                                          </h5>
                                          {visit.prescription && visit.type !== 'prescription' && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-medium mt-1">
                                              <FiPackage className="w-2.5 h-2.5" /> Has Prescription
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {visit.proforma && (
                                          <>
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                navigate(`/child-clinical-proformas/${visit.proforma.id}`);
                                              }}
                                              className="flex items-center gap-1.5 px-2 py-1 text-xs"
                                            >
                                              <FiEye className="w-3 h-3" />
                                              View
                                            </Button>
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                navigate(`/child-clinical-proformas/${visit.proforma.id}/edit`);
                                              }}
                                              className="flex items-center gap-1.5 px-2 py-1 text-xs"
                                            >
                                              <FiEdit3 className="w-3 h-3" />
                                              Edit
                                            </Button>
                                          </>
                                        )}
                                        {visit.followUp && (
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              toggleVisitCard(visitId);
                                            }}
                                            className="flex items-center gap-1.5 px-2 py-1 text-xs"
                                          >
                                            <FiEye className="w-3 h-3" />
                                            {isVisitExpanded ? "Hide" : "View"}
                                          </Button>
                                        )}
                                        <div
                                          className="cursor-pointer"
                                          onClick={() => toggleVisitCard(visitId)}
                                        >
                                          {isVisitExpanded ? (
                                            <FiChevronUp className="h-5 w-5 text-gray-500" />
                                          ) : (
                                            <FiChevronDown className="h-5 w-5 text-gray-500" />
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    
                                    {/* Visit Details */}
                                    {isVisitExpanded && (
                                      <div className="p-4 space-y-4 border-t border-gray-200">
                                        {/* Child Clinical Proforma Details */}
                                        {visit.proforma && (
                                          <div className="border-l-4 border-green-500 pl-4">
                                            <h6 className="text-base font-semibold text-gray-800 mb-2">Child Clinical Proforma</h6>
                                            <div className="text-sm text-gray-700 space-y-1">
                                              <p><strong>Age:</strong> {visit.proforma.age}</p>
                                              <p><strong>Sex:</strong> {visit.proforma.sex}</p>
                                              <p><strong>Source of Referral:</strong> {Array.isArray(visit.proforma.source_of_referral) ? visit.proforma.source_of_referral.join(', ') : visit.proforma.source_of_referral}</p>
                                              <p><strong>Duration of Illness:</strong> {visit.proforma.duration_of_illness}</p>
                                              <p><strong>Onset:</strong> {visit.proforma.onset}</p>
                                              <p><strong>Course:</strong> {visit.proforma.course}</p>
                                              <p><strong>Physical Illness:</strong> {visit.proforma.has_physical_illness ? `Yes (${visit.proforma.physical_illness_specification})` : 'No'}</p>
                                              <p><strong>Provisional Diagnosis:</strong> {visit.proforma.remarks_provisional_diagnosis || 'N/A'}</p>
                                              <p><strong>Disposal Status:</strong> {visit.proforma.disposal_status || 'N/A'}</p>
                                            </div>
                                          </div>
                                        )}
                                        
                                        {/* Follow-Up Details */}
                                        {visit.followUp && (
                                          <div className="border-l-4 border-blue-500 pl-4 bg-blue-50 rounded-lg p-3">
                                            <h6 className="text-base font-semibold text-gray-800 mb-2 flex items-center gap-2">
                                              <FiFileText className="w-4 h-4 text-blue-600" />
                                              Follow-Up Visit Details
                                            </h6>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                              <div>
                                                <p className="text-gray-500 mb-1">Visit Date</p>
                                                <p className="font-medium text-gray-900">{formatDate(visit.followUp.visit_date || visit.followUp.created_at)}</p>
                                              </div>
                                              {visit.followUp.room_no && (
                                                <div>
                                                  <p className="text-gray-500 mb-1">Room</p>
                                                  <p className="font-medium text-gray-900">{visit.followUp.room_no}</p>
                                                </div>
                                              )}
                                              {visit.followUp.assigned_doctor_name && (
                                                <div>
                                                  <p className="text-gray-500 mb-1">Assigned Doctor</p>
                                                  <p className="font-medium text-gray-900">{visit.followUp.assigned_doctor_name}</p>
                                                </div>
                                              )}
                                            </div>
                                            {visit.followUp.clinical_assessment && (
                                              <div className="mt-3">
                                                <p className="text-gray-500 mb-2">Clinical Assessment</p>
                                                <div className="bg-white border border-gray-200 rounded-lg p-3 whitespace-pre-wrap text-gray-900 min-h-[80px] text-sm">
                                                  {visit.followUp.clinical_assessment}
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        )}
                                        
                                        {/* Prescription Details */}
                                        {(visit.prescription || visit.type === 'prescription') && (
                                          <div className="border-l-4 border-amber-500 pl-4 bg-amber-50 rounded-lg p-3">
                                            <h6 className="text-base font-semibold text-gray-800 mb-2 flex items-center gap-2">
                                              <FiPackage className="w-4 h-4 text-amber-600" />
                                              Prescription Details
                                            </h6>
                                            {(() => {
                                              const prescription = visit.prescription || visit;
                                              return (
                                                <div className="text-sm text-gray-700 space-y-1">
                                                  <p><strong>Prescription Date:</strong> {formatDate(prescription.created_at || prescription.prescription_date)}</p>
                                                  {prescription.prescription && Array.isArray(prescription.prescription) && prescription.prescription.length > 0 && (
                                                    <div className="mt-2">
                                                      <p className="font-medium mb-1">Medications:</p>
                                                      <ul className="list-disc list-inside space-y-0.5">
                                                        {prescription.prescription.map((med, idx) => (
                                                          <li key={idx} className="text-xs">
                                                            {med.medicine} {med.dosage && `- ${med.dosage}`} {med.frequency && `(${med.frequency})`}
                                                          </li>
                                                        ))}
                                                      </ul>
                                                    </div>
                                                  )}
                                                </div>
                                              );
                                            })()}
                                          </div>
                                        )}
                                      </div>
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
                  <div className="text-center py-8">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-2xl mx-auto">
                      <FiClipboard className="h-12 w-12 mx-auto mb-4 text-blue-500" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        No Past History Found
                      </h3>
                      <p className="text-sm text-gray-600 mb-4">
                        This child patient has no past clinical proforma visits, follow-ups, or prescriptions.
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
  );
};

export default CreateChildPatient;
