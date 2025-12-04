import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import {
  FiUser, FiUsers, FiBriefcase,  FiHome, FiMapPin, FiPhone,
  FiCalendar, FiGlobe, FiFileText, FiHash, FiClock,
  FiHeart, FiBookOpen, FiTrendingUp, FiShield,
  FiNavigation,  FiEdit3, FiSave, FiX, FiLayers, 
  FiChevronDown, FiChevronUp, FiArrowRight, 
} from 'react-icons/fi';
import {  useCreatePatientCompleteMutation, useUpdatePatientMutation } from '../../features/patients/patientsApiSlice';
import { useCreatePatientFilesMutation } from '../../features/patients/patientFilesApiSlice';
import { selectCurrentUser, selectCurrentToken } from '../../features/auth/authSlice';
import { updatePatientRegistrationForm, resetPatientRegistrationForm, selectPatientRegistrationForm } from '../../features/form/formSlice';
import { useCreateClinicalProformaMutation } from '../../features/clinical/clinicalApiSlice';
import { useGetAllRoomsQuery } from '../../features/rooms/roomsApiSlice';
import { SelectWithOther } from '../../components/SelectWithOther';
import { IconInput } from '../../components/IconInput';
import Card from '../../components/Card';
import Select from '../../components/Select';
import Button from '../../components/Button';
import DatePicker from '../../components/CustomDatePicker';
import FileUpload from '../../components/FileUpload';
import {
  MARITAL_STATUS, FAMILY_TYPE_OPTIONS, LOCALITY_OPTIONS, RELIGION_OPTIONS, SEX_OPTIONS,
  AGE_GROUP_OPTIONS, OCCUPATION_OPTIONS, EDUCATION_OPTIONS,
  MOBILITY_OPTIONS, REFERRED_BY_OPTIONS, UNIT_DAYS_OPTIONS,
   isSR, isJR, HEAD_RELATIONSHIP_OPTIONS, CATEGORY_OPTIONS, isMWO
} from '../../utils/constants';
import { validatePatientRegistration } from '../../utils/patientValidation';




const CreatePatient = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const formData = useSelector(selectPatientRegistrationForm);
  const [createRecord, { isLoading }] = useCreatePatientCompleteMutation();
  const [updatePatient, { isLoading: isUpdating }] = useUpdatePatientMutation();
  const [createProforma] = useCreateClinicalProformaMutation();
  const [createPatientFiles] = useCreatePatientFilesMutation();
  const { data: roomsData } = useGetAllRoomsQuery({ page: 1, limit: 100, is_active: true });
  const token = useSelector(selectCurrentToken);
  const currentUser = useSelector(selectCurrentUser);
  const [errors, setErrors] = useState({});
  const [expandedPatientDetails, setExpandedPatientDetails] = useState(true);
  const [currentStep, setCurrentStep] = useState(1); // 1 for Out Patient Card, 2 for remaining sections
  const [patientId, setPatientId] = useState(null); // Store patient ID after step 1
  const [showOccupationOther, setShowOccupationOther] = useState(false); // Show custom occupation input when "Others" is selected
  const [occupationOther, setOccupationOther] = useState(''); // Custom occupation value
  const [showFamilyTypeOther, setShowFamilyTypeOther] = useState(false);
  const [familyTypeOther, setFamilyTypeOther] = useState('');
  const [showLocalityOther, setShowLocalityOther] = useState(false);
  const [localityOther, setLocalityOther] = useState('');
  const [showReligionOther, setShowReligionOther] = useState(false);
  const [religionOther, setReligionOther] = useState('');
  const [showHeadRelationshipOther, setShowHeadRelationshipOther] = useState(false);
  const [headRelationshipOther, setHeadRelationshipOther] = useState('');
  const [showMobilityOther, setShowMobilityOther] = useState(false);
  const [mobilityOther, setMobilityOther] = useState('');
  const [showReferredByOther, setShowReferredByOther] = useState(false);
  const [referredByOther, setReferredByOther] = useState('');
  const [sameAsPermanent, setSameAsPermanent] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);


  
  
  // Initialize department field with default value
  useEffect(() => {
    if (!formData.department) {
      dispatch(updatePatientRegistrationForm({ department: 'Psychiatry' }));
    }
  }, []);

  // Restore step state from localStorage on mount and after authentication
  useEffect(() => {
    const savedPatientId = localStorage.getItem('createPatient_patientId');
    const savedStep = localStorage.getItem('createPatient_step');

    // If no saved data, start at step 1
    if (!savedPatientId || savedStep !== '2') {
      return;
    }

    // If token is available, verify patient exists before restoring
    if (token) {
      const verifyAndRestore = async () => {
        try {
          const baseUrl = import.meta.env.VITE_API_URL || '/api';
          const response = await fetch(`${baseUrl}/patients/${savedPatientId}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            credentials: 'include',
          });

          if (response.ok) {
            // Patient exists, restore step 2
            setPatientId(savedPatientId);
            setCurrentStep(2);
            setExpandedPatientDetails(true);
          } else {
            // Patient doesn't exist, clear localStorage and reset to step 1
            localStorage.removeItem('createPatient_patientId');
            localStorage.removeItem('createPatient_step');
            setCurrentStep(1);
            setPatientId(null);
          }
        } catch (error) {
          console.error('Error verifying patient:', error);
          // On error, still restore step 2 (patient might exist, just network issue)
          setPatientId(savedPatientId);
          setCurrentStep(2);
          setExpandedPatientDetails(true);
        }
      };

      verifyAndRestore();
    } else {
      // Token not available yet (session expired), but restore step 2 anyway
      // Will verify when token becomes available
      setPatientId(savedPatientId);
      setCurrentStep(2);
      setExpandedPatientDetails(true);
    }
  }, [token]); // Run when token changes (after login or session expiration)

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

  // Auto-populate Permanent Address from Step 1 address when moving to Step 2
  useEffect(() => {
    if (currentStep === 2 && !formData.permanent_address_line_1) {
      // Copy Step 1 address to Permanent Address if permanent address is empty
      if (formData.address_line || formData.city || formData.district || formData.state || formData.pin_code || formData.country) {
        dispatch(updatePatientRegistrationForm({
          permanent_address_line_1: formData.address_line || '',
          permanent_city_town_village: formData.city || '',
          permanent_district: formData.district || '',
          permanent_state: formData.state || '',
          permanent_pin_code: formData.pin_code || '',
          permanent_country: formData.country || ''
        }));
      }
    }
  }, [currentStep, formData.address_line, formData.city, formData.district, formData.state, formData.pin_code, formData.country, formData.permanent_address_line_1, dispatch]);

  // Sync present address with permanent address when checkbox is checked
  useEffect(() => {
    if (sameAsPermanent) {
      dispatch(updatePatientRegistrationForm({
        present_address_line_1: formData.permanent_address_line_1 || '',
        present_city_town_village: formData.permanent_city_town_village || '',
        present_district: formData.permanent_district || '',
        present_state: formData.permanent_state || '',
        present_pin_code: formData.permanent_pin_code || '',
        present_country: formData.permanent_country || ''
      }));
    }
  }, [
    sameAsPermanent,
    formData.permanent_address_line_1,
    formData.permanent_city_town_village,
    formData.permanent_district,
    formData.permanent_state,
    formData.permanent_pin_code,
    formData.permanent_country,
    dispatch
  ]);

  // Handle cancel - clear localStorage and navigate away
  const handleCancel = () => {
    localStorage.removeItem('createPatient_patientId');
    localStorage.removeItem('createPatient_step');
    navigate('/patients');
  };



  const handleChange = (e) => {
    const { name, value } = e.target;
    // Ensure department is always set to "Psychiatry" if it's the department field
    const updateValue = name === 'department' ? (value || 'Psychiatry') : value;
    dispatch(updatePatientRegistrationForm({ [name]: updateValue }));

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
        dispatch(updatePatientRegistrationForm({ [fieldConfig.customField]: null }));
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
        dispatch(updatePatientRegistrationForm({ [name]: value }));
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
        dispatch(updatePatientRegistrationForm({ age_group: ageGroup }));
      }
    }
  };


  const handlePatientChange = (e) => {
    const { name, value } = e.target;
    dispatch(updatePatientRegistrationForm({ [name]: value }));
  };

  const validate = (step = 1) => {
    const validationResult = validatePatientRegistration(formData, step);
    setErrors(validationResult.errors);
    return { isValid: validationResult.isValid, missingFields: validationResult.missingFields };
  };





  // Handler for Step 1: Save Out Patient Card data
  const handleStep1Submit = async (e) => {
    e.preventDefault();

    const validationResult = validate(1);
    if (!validationResult.isValid) {
      // Show toaster error for each missing field
      validationResult.missingFields.forEach((field) => {
        toast.error(`Please fill ${field} field`);
      });
      return;
    }

    // Get patient data early for validation
    const patientName = (formData.name || '').trim();
    const patientSex = formData.sex || '';
    const patientAge = formData.age || '';
    const patientCRNo = (formData.cr_no || '').trim();

    try {
      // Additional validation (already checked in validate function, but keeping for safety)

      // Check if CR number already exists (if provided)
      if (patientCRNo && patientCRNo.length >= 3) {
        try {
          const baseUrl = import.meta.env.VITE_API_URL || '/api';
          const response = await fetch(`${baseUrl}/patients/cr/${encodeURIComponent(patientCRNo)}`, {
            method: 'GET',
            headers: {
              'Authorization': token ? `Bearer ${token}` : '',
              'Content-Type': 'application/json',
            },
            credentials: 'include',
          });

          // If patient exists (200 status), show error
          if (response.ok) {
            toast.error('CR number already registered');
            return;
          }
          // If 404, patient doesn't exist, continue with submission
          // Other errors will be handled by the catch block
        } catch (checkError) {
          // If there's an error checking (network issue, etc.), continue with submission
          // The backend will catch duplicate CR numbers during creation
          console.warn('Error checking CR number:', checkError);
        }
      }

      const parseIntSafe = (val) => {
        if (val === '' || val === undefined || val === null) return null;
        const parsed = parseInt(val);
        return isNaN(parsed) ? null : parsed;
      };

      const currentUser = JSON.parse(localStorage.getItem("user"));

      // Step 1: Save only Out Patient Card data
      const step1PatientData = {
        // Required basic fields
        name: patientName,
        sex: patientSex,
        father_name: formData.father_name || null,
        age: parseIntSafe(patientAge),
        date: formData.date || null,
        filled_by: currentUser.id,
        filled_by_name: currentUser.name,
        filled_by_role: currentUser.role,
        ...(patientCRNo && { cr_no: patientCRNo }),

        // Contact Information
        contact_number: formData.contact_number || null,

        // Quick Entry fields
        department: formData.department || "Psychiatry",
        unit_consit: formData.unit_consit || null,
        room_no: formData.room_no || null,
        serial_no: formData.serial_no || null,
        file_no: formData.file_no || null,
        unit_days: formData.unit_days || null,
        patient_income: formData.patient_income || null,
        family_income: formData.family_income || null,
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

        // Assignment - Include assigned_room in Step 1 so auto-assignment can happen
        // If not provided, backend will auto-assign
        assigned_room: formData.assigned_room || null,
      };

      // Create patient with step 1 data (using createPatientComplete which accepts all fields)
      const patientResult = await createRecord(step1PatientData).unwrap();
      const createdPatientId = patientResult.data.patient.id;

      setPatientId(createdPatientId);

      // Save to localStorage for persistence across page refreshes
      localStorage.setItem('createPatient_patientId', String(createdPatientId));
      localStorage.setItem('createPatient_step', '2');

      toast.success('Out Patient Card saved successfully!');

      // Move to step 2
      setCurrentStep(2);

    } catch (err) {
      console.error('Step 1 submission error:', err);

      // Handle specific error cases
      if (err?.data?.message?.includes('duplicate key value violates unique constraint "patients_cr_no_key"') ||
        err?.data?.error?.includes('duplicate key value violates unique constraint "patients_cr_no_key"')) {
        toast.error('CR number is already registered');
        dispatch(updatePatientRegistrationForm({ cr_no: '' }));
      } else if (err?.data?.message?.includes('duplicate key value violates unique constraint') ||
        err?.data?.error?.includes('duplicate key value violates unique constraint')) {
        toast.error('A record with this information already exists. Please check your data and try again.');
      } else {
        toast.error(err?.data?.message || err?.data?.error || 'Failed to save Out Patient Card');
      }
    }
  };

  // Handler for Step 2: Update patient with remaining data
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!patientId) {
      toast.error('Patient ID is missing. Please complete step 1 first.');
      return;
    }

    // Validate Step 2 required fields
    const validationResult = validate(2);
    if (!validationResult.isValid) {
      // Show toaster error for each missing field
      validationResult.missingFields.forEach((field) => {
        toast.error(`Please fill ${field} field`);
      });
      return;
    }

    try {
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

      const currentUser = JSON.parse(localStorage.getItem("user"));

      // Step 2: Update patient with remaining data
      const step2PatientData = {
        // Personal Information
        psy_no: formData.psy_no || null,
        seen_in_walk_in_on: formData.seen_in_walk_in_on || formData.date || null,
        worked_up_on: formData.worked_up_on || null,
        special_clinic_no: formData.special_clinic_no || null,
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
        // income: parseFloatSafe(formData.income),
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
        head_name: formData.head_name || null,
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

        // Assignment - Only update if a room is explicitly selected
        // Don't overwrite auto-assigned room from Step 1 with null
        // Only include assigned_room if it has a value
        ...(formData.assigned_room && formData.assigned_room.trim() !== '' ? { assigned_room: formData.assigned_room } : {}),
      };

      // Update patient with step 2 data
      await updatePatient({
        id: patientId,
        ...step2PatientData
      }).unwrap();

      toast.success('Patient information updated successfully!');

      // Upload files if any are selected
      if (selectedFiles && selectedFiles.length > 0) {
        try {
          await createPatientFiles({
            patient_id: patientId,
            user_id: currentUser?.id,
            files: selectedFiles
          }).unwrap();
          toast.success(`${selectedFiles.length} file(s) uploaded successfully!`);
        } catch (err) {
          console.error('Error uploading files:', err);
          toast.error(err?.data?.message || 'Failed to upload files. Patient created but files were not saved.');
        }
      }

      // Create clinical proforma
      await createProforma({
        patient_id: patientId,
        visit_date: new Date().toISOString().split('T')[0]
      }).unwrap();

      // Clear localStorage after successful completion
      localStorage.removeItem('createPatient_patientId');
      localStorage.removeItem('createPatient_step');

      // Reset form after successful submission
      dispatch(resetPatientRegistrationForm());
      setCurrentStep(1);
      setPatientId(null);
      setSelectedFiles([]); // Clear selected files

      // Navigate to patients list
      navigate('/patients');

    } catch (err) {
      console.error('Step 2 submission error:', err);
      toast.error(err?.data?.message || err?.data?.error || 'Failed to update patient information');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50/30 to-indigo-100/40 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-400/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-400/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full px-4 sm:px-6 lg:px-8 py-6 lg:py-10 space-y-6 lg:space-y-8">

        {/* Patient Details Card - Collapsible */}
        <Card className="shadow-lg border-0 bg-white">
          <div
            className="flex items-center justify-between cursor-pointer p-6 border-b border-gray-200 hover:bg-gray-50 transition-colors"
            onClick={() => setExpandedPatientDetails(!expandedPatientDetails)}
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <FiUser className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Patient Details</h3>
                <p className="text-sm text-gray-500 mt-1">Postgraduate Institute of Medical Education & Research, Chandigarh</p>
              </div>
            </div>
            {expandedPatientDetails ? (
              <FiChevronUp className="h-6 w-6 text-gray-500" />
            ) : (
              <FiChevronDown className="h-6 w-6 text-gray-500" />
            )}
          </div>

          {expandedPatientDetails && (
            <div className="p-6">
              <form onSubmit={currentStep === 1 ? handleStep1Submit : handleSubmit}>
                {/* Step 1: Out Patient Card Section */}
                {currentStep === 1 && (
                  <div className="relative mb-8">
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
                      className="relative mb-8 shadow-2xl border border-white/30 bg-white/70 backdrop-blur-xl rounded-3xl overflow-hidden">
                      <div className="space-y-8">
                        {/* First Row - Basic Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                          <IconInput
                            icon={<FiHash className="w-4 h-4" />}
                            label={
                              <span>
                                CR No. <span className="text-red-500">*</span>
                              </span>
                            }
                            name="cr_no"
                            value={formData.cr_no || ''}
                            onChange={handleChange}
                            placeholder="Enter CR number"
                            className=""
                          />

                          <DatePicker
                            icon={<FiCalendar className="w-4 h-4" />}
                            label="Date"
                            name="date"
                            value={formData.date || ''}
                            onChange={handleChange}
                            defaultToday={true}
                            required={true}
                          />
                          <IconInput
                            icon={<FiUser className="w-4 h-4" />}
                            label={
                              <span>
                                Name <span className="text-red-500">*</span>
                              </span>
                            }
                            name="name"
                            value={formData.name || ''}
                            onChange={handleChange}
                            placeholder="Enter patient name"
                            className=""
                          />
                          <IconInput
                            icon={<FiPhone className="w-4 h-4" />}
                            label={
                              <span>
                                Phone No. <span className="text-red-500">*</span>
                              </span>
                            }
                            name="contact_number"
                            value={formData.contact_number || ''}
                            onChange={handleChange}
                            placeholder="Enter mobile number"
                            type="tel"
                            maxLength={10}
                            className=""
                          />
                        </div>

                        {/* Second Row - Age, Sex, Category, Father's Name */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                          <IconInput
                            icon={<FiClock className="w-4 h-4" />}
                            label={
                              <span>
                                Age <span className="text-red-500">*</span>
                              </span>
                            }
                            name="age"
                            value={formData.age || ''}
                            onChange={handleChange}
                            type="number"
                            placeholder="Enter age"
                            className=""
                          />
                          <div className="space-y-2">
                            <Select
                              label={
                                <span>
                                  Sex <span className="text-red-500">*</span>
                                </span>
                              }
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
                              Category <span className="text-red-500">*</span>
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
                            label={
                              <span>
                                Father's Name <span className="text-red-500">*</span>
                              </span>
                            }
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
                            label={
                              <span>
                                Department <span className="text-red-500">*</span>
                              </span>
                            }
                            name="department"
                            value="Psychiatry"
                            onChange={handleChange}
                            placeholder="Psychiatry"
                            className="disabled:bg-gray-200 disabled:cursor-not-allowed"
                            disabled={true}
                          />
                          <IconInput
                            icon={<FiUsers className="w-4 h-4" />}
                            label={
                              <span>
                                Unit/Consit <span className="text-red-500">*</span>
                              </span>
                            }
                            name="unit_consit"
                            value={formData.unit_consit || ''}
                            onChange={handleChange}
                            placeholder="Enter unit/consit"
                            className=""
                          />
                          <IconInput
                            icon={<FiHome className="w-4 h-4" />}
                            label={
                              <span>
                                Room No. <span className="text-red-500">*</span>
                              </span>
                            }
                            name="room_no"
                            value={formData.room_no || ''}
                            onChange={handleChange}
                            placeholder="Enter room number"
                            className=""
                          />
                          <IconInput
                            icon={<FiHash className="w-4 h-4" />}
                            label={
                              <span>
                                Serial No. <span className="text-red-500">*</span>
                              </span>
                            }
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
                            label={
                              <span>
                                File No. <span className="text-red-500">*</span>
                              </span>
                            }
                            name="file_no"
                            value={formData.file_no || ''}
                            onChange={handleChange}
                            placeholder="Enter file number"
                            className=""
                          />
                          <div className="space-y-2">
                            <Select
                              label={
                                <span>
                                  Unit Days <span className="text-red-500">*</span>
                                </span>
                              }
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
                              label={
                                <span>
                                  Address Line (House No., Street, Locality) <span className="text-red-500">*</span>
                                </span>
                              }
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
                                label={
                                  <span>
                                    Country <span className="text-red-500">*</span>
                                  </span>
                                }
                                name="country"
                                value={formData.country || ''}
                                onChange={handleChange}
                                placeholder="Enter country"
                                className=""
                              />
                              <IconInput
                                icon={<FiMapPin className="w-4 h-4" />}
                                label={
                                  <span>
                                    State <span className="text-red-500">*</span>
                                  </span>
                                }
                                name="state"
                                value={formData.state || ''}
                                onChange={handleChange}
                                placeholder="Enter state"
                                required
                                className=""
                              />
                              <IconInput
                                icon={<FiLayers className="w-4 h-4" />}
                                label={
                                  <span>
                                    District <span className="text-red-500">*</span>
                                  </span>
                                }
                                name="district"
                                value={formData.district || ''}
                                onChange={handleChange}
                                placeholder="Enter district"
                                required
                                className=""
                              />
                              <IconInput
                                icon={<FiHome className="w-4 h-4" />}
                                label={
                                  <span>
                                    City/Town/Village <span className="text-red-500">*</span>
                                  </span>
                                }
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
                                label={
                                  <span>
                                    Pin Code <span className="text-red-500">*</span>
                                  </span>
                                }
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
                )}

                {/* Step 1: Submit Button for Out Patient Card */}
                {currentStep === 1 && (
                  <div className="relative mt-8">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary-500/20 via-indigo-500/20 to-blue-500/20 rounded-3xl blur-xl"></div>
                    <div className="relative bg-white/70 backdrop-blur-xl rounded-3xl p-6 lg:p-8 shadow-2xl border border-white/30">
                      <div className="flex flex-col sm:flex-row justify-end gap-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleCancel}
                          className="px-6 lg:px-8 py-3 bg-white/60 backdrop-blur-md border border-white/30 hover:bg-white/80 hover:border-gray-300/50 text-gray-800 font-semibold shadow-sm hover:shadow-md transition-all duration-200"
                        >
                          <FiX className="mr-2" />
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          loading={isLoading}
                          disabled={isLoading}
                          className="px-6 lg:px-8 py-3 bg-[#0ea5e9] hover:bg-[#0284c7] text-white font-bold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                        >
                          <FiArrowRight className="mr-2" />
                          {isLoading ? 'Saving...' : 'Save & Continue'}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2: Basic Information and remaining sections */}
                {currentStep === 2 && (
                  <>
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

                              <DatePicker
                                icon={<FiCalendar className="w-4 h-4" />}
                                label="Seen in Walk-in-on"
                                name="seen_in_walk_in_on"
                                value={formData.seen_in_walk_in_on}
                                onChange={handleChange}
                                defaultToday={true}
                                required={true}
                              />
                              <DatePicker
                                icon={<FiCalendar className="w-4 h-4" />}
                                label="Worked up on"
                                name="worked_up_on"
                                value={formData.worked_up_on}
                                onChange={handleChange}
                                defaultToday={true}
                                required={true}
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
                                label={
                                  <span>
                                    Psy. No. <span className="text-red-500">*</span>
                                  </span>
                                }
                                name="psy_no"
                                value={formData.psy_no}
                                onChange={handlePatientChange}
                                placeholder="Enter PSY number"
                                error={errors.patientPSYNo}
                                className=""
                              />
                              <IconInput
                                icon={<FiHeart className="w-4 h-4" />}
                                label={
                                  <span>
                                    Special Clinic No. <span className="text-red-500">*</span>
                                  </span>
                                }
                                name="special_clinic_no"
                                value={formData.special_clinic_no}
                                onChange={handleChange}
                                placeholder="Enter special clinic number"
                                className=""
                              />

                              <IconInput
                                icon={<FiUser className="w-4 h-4" />}
                                label={
                                  <span>
                                    Name <span className="text-red-500">*</span>
                                  </span>
                                }
                                name="name"
                                value={formData.name || ''}
                                onChange={handleChange}
                                placeholder="Enter patient name"
                                disabled={true}
                                className="disabled:bg-gray-200 disabled:cursor-not-allowed"
                              />

                              <div className="space-y-2">
                                <Select
                                  label={
                                    <span>
                                      Sex <span className="text-red-500">*</span>
                                    </span>
                                  }
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
                                label={
                                  <span>
                                    Age Group <span className="text-red-500">*</span>
                                  </span>
                                }
                                name="age_group"
                                value={formData.age_group || ''}
                                onChange={handleChange}
                                options={AGE_GROUP_OPTIONS}
                                placeholder="Select age group"
                                searchable={true}
                                className="bg-gradient-to-r from-blue-50 to-indigo-50"
                              />
                              <Select
                                label={
                                  <span>
                                    Marital Status <span className="text-red-500">*</span>
                                  </span>
                                }
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
                                label={
                                  <span>
                                    Occupation <span className="text-red-500">*</span>
                                  </span>
                                }
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
                                label={
                                  <span>
                                    Education <span className="text-red-500">*</span>
                                  </span>
                                }
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
                                label={
                                  <span>
                                    Exact Income of the Patient (₹) <span className="text-red-500">*</span>
                                  </span>
                                }
                                name="patient_income"
                                value={formData.patient_income}
                                onChange={handleChange}
                                type="number"
                                placeholder="Monthly income"
                                min="0"
                                className="bg-gradient-to-r from-teal-50 to-cyan-50"
                              />
                               <IconInput
                                icon={<FiTrendingUp className="w-4 h-4" />}
                                label={
                                  <span>
                                    Exact Income of the Family (₹) <span className="text-red-500">*</span>
                                  </span>
                                }
                                name="family_income"
                                value={formData.family_income}
                                onChange={handleChange}
                                type="number"
                                placeholder="Monthly income"
                                min="0"
                                className="bg-gradient-to-r from-teal-50 to-cyan-50"
                              />

                              <SelectWithOther
                                label={
                                  <span>
                                    Religion <span className="text-red-500">*</span>
                                  </span>
                                }
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
                                label={
                                  <span>
                                    Family Type <span className="text-red-500">*</span>
                                  </span>
                                }
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
                                label={
                                  <span>
                                    Locality <span className="text-red-500">*</span>
                                  </span>
                                }
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
                                label={
                                  <span>
                                    Family Head Name <span className="text-red-500">*</span>
                                  </span>
                                }
                                name="head_name"
                                value={formData.head_name}
                                onChange={handleChange}
                                placeholder="Enter head of family name"
                                className="bg-gradient-to-r from-blue-50 to-indigo-50"
                              />
                              <IconInput
                                icon={<FiClock className="w-4 h-4" />}
                                label={
                                  <span>
                                    Family Head Age <span className="text-red-500">*</span>
                                  </span>
                                }
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
                                label={
                                  <span>
                                    Relationship With Family Head <span className="text-red-500">*</span>
                                  </span>
                                }
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
                                label={
                                  <span>
                                    Family Head Education <span className="text-red-500">*</span>
                                  </span>
                                }
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
                                label={
                                  <span>
                                    Family Head Occupation <span className="text-red-500">*</span>
                                  </span>
                                }
                                name="head_occupation"
                                value={formData.head_occupation}
                                onChange={handleChange}
                                options={OCCUPATION_OPTIONS}
                                placeholder="Select occupation"
                                searchable={true}
                                className="bg-gradient-to-r from-green-50 to-emerald-50"
                              />
                              <IconInput
                                icon={<FiTrendingUp className="w-4 h-4" />}
                                label={
                                  <span>
                                    Family Head Income (₹) <span className="text-red-500">*</span>
                                  </span>
                                }
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
                                label={
                                  <span>
                                    Exact distance from hospital <span className="text-red-500">*</span>
                                  </span>
                                }
                                name="distance_from_hospital"
                                value={formData.distance_from_hospital}
                                onChange={handleChange}
                                placeholder="Enter distance from hospital"
                                className=""
                              />

                              <SelectWithOther
                                label={
                                  <span>
                                    Mobility of the patient <span className="text-red-500">*</span>
                                  </span>
                                }
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
                                label={
                                  <span>
                                    Referred by <span className="text-red-500">*</span>
                                  </span>
                                }
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
                            </div>

                        {/* Permanent Address Section */}
                        <div className="space-y-6 pt-6 border-t border-white/30">
                          <h4 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                            <div className="p-2.5 bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-sm rounded-xl border border-white/30 shadow-md">
                              <FiHome className="w-5 h-5 text-green-600" />
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
                                    dispatch(updatePatientRegistrationForm({
                                      present_address_line_1: formData.permanent_address_line_1 || '',
                                      present_city_town_village: formData.permanent_city_town_village || '',
                                      present_district: formData.permanent_district || '',
                                      present_state: formData.permanent_state || '',
                                      present_pin_code: formData.permanent_pin_code || '',
                                      present_country: formData.permanent_country || ''
                                    }));
                                  } else {
                                    // Clear present address fields when unchecked
                                    dispatch(updatePatientRegistrationForm({
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

                              <div className="space-y-2">
                                <Select
                                  icon={<FiHome className="w-4 h-4" />}
                                  label={
                                    <span>
                                      Assigned Room
                                      {isMWO(currentUser?.role) && (
                                        <span className="ml-2 text-xs text-gray-500 font-normal">
                                          (Auto-assigned if not selected)
                                        </span>
                                      )}
                                    </span>
                                  }
                                  name="assigned_room"
                                  value={formData.assigned_room || ''}
                                  onChange={handleChange}
                                  options={(roomsData?.data?.rooms || [])
                                    .filter(room => room.is_active)
                                    .map(room => ({
                                      value: room.room_number,
                                      label: room.room_number + (room.description ? ` - ${room.description}` : '')
                                    }))}
                                  placeholder={isMWO(currentUser?.role) ? "Select room or leave empty for auto-assignment" : "Select room"}
                                  searchable={true}
                                  className="bg-gradient-to-r from-teal-50 to-cyan-50"
                                />
                                {isMWO(currentUser?.role) && (
                                  <p className="text-xs text-gray-500 italic">
                                    If no room is selected, the patient will be automatically assigned to an active room using round-robin distribution. When a doctor selects a room, all patients in that room will be assigned to that doctor.
                                  </p>
                                )}
                              </div>
                        </div>

                        {/* File Upload Section */}
                        <div className="space-y-6 pt-6 border-t border-white/30">
                          <h4 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                            <div className="p-2.5 bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-sm rounded-xl border border-white/30 shadow-md">
                              <FiFileText className="w-5 h-5 text-purple-600" />
                            </div>
                            Patient Documents & Files
                          </h4>
                          <FileUpload
                            files={selectedFiles}
                            onFilesChange={setSelectedFiles}
                            maxFiles={20}
                            maxSizeMB={10}
                            patientId={patientId}
                            disabled={!patientId}
                          />
                          
                          {/* File Preview - Show uploaded files */}
                          {selectedFiles && selectedFiles.length > 0 && (
                            <div className="mt-6">
                              <h5 className="text-lg font-semibold text-gray-800 mb-4">Uploaded Files Preview</h5>
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                {selectedFiles.map((file, index) => {
                                  const fileUrl = file instanceof File 
                                    ? URL.createObjectURL(file) 
                                    : file;
                                  const fileName = file instanceof File ? file.name : file.split('/').pop();
                                  const fileType = fileName.split('.').pop()?.toLowerCase();
                                  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileType);
                                  
                                  return (
                                    <div
                                      key={index}
                                      className="relative group bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-200"
                                    >
                                      {/* Remove Button */}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSelectedFiles(prev => prev.filter((_, i) => i !== index));
                                        }}
                                        className="absolute top-2 right-2 z-10 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-md transition-all opacity-0 group-hover:opacity-100"
                                      >
                                        <FiX className="w-4 h-4" />
                                      </button>
                                      
                                      {/* Image Preview */}
                                      {isImage && file instanceof File ? (
                                        <div className="aspect-square relative bg-gray-100">
                                          <img
                                            src={fileUrl}
                                            alt={fileName}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                              e.target.style.display = 'none';
                                            }}
                                          />
                                        </div>
                                      ) : (
                                        <div className="aspect-square flex items-center justify-center bg-gray-100">
                                          <FiFileText className="w-12 h-12 text-gray-400" />
                                        </div>
                                      )}
                                      
                                      {/* File Name */}
                                      <div className="p-2">
                                        <p className="text-xs font-medium text-gray-800 truncate" title={fileName}>
                                          {fileName}
                                        </p>
                                        {file instanceof File && (
                                          <p className="text-xs text-gray-500">
                                            {(file.size / 1024 / 1024).toFixed(2)} MB
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>

                            <div className="flex flex-col sm:flex-row justify-end gap-4">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={handleCancel}
                                className="px-6 lg:px-8 py-3 bg-white/60 backdrop-blur-md border border-white/30 hover:bg-white/80 hover:border-gray-300/50 text-gray-800 font-semibold shadow-sm hover:shadow-md transition-all duration-200"
                              >
                                <FiX className="mr-2" />
                                Cancel
                              </Button>
                              <Button
                                type="submit"
                                loading={isLoading || isUpdating}
                                disabled={isLoading || isUpdating}
                                className="px-6 lg:px-8 py-3 bg-[#0ea5e9] hover:bg-[#0284c7] text-white font-bold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                              >
                                <FiSave className="mr-2" />
                                {isLoading || isUpdating ? 'Saving...' : 'Register Patient'}
                              </Button>
                            </div>

                          </div>
                        </div>
                      </Card>
                    </div>
                  </>
                )}
              </form>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default CreatePatient;