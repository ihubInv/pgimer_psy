import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { 
  FiPlus, FiSearch, FiTrash2, FiEye,  FiEdit, FiUsers, 
   FiDownload,  FiClock, FiPrinter,
  FiHeart, FiFileText, FiShield, FiTrendingUp, FiX
} from 'react-icons/fi';
import { BsFileEarmarkExcelFill } from 'react-icons/bs';
import { useGetAllPatientsQuery, useDeletePatientMutation, useGetPatientByIdQuery } from '../../features/patients/patientsApiSlice';
import { selectCurrentUser, selectCurrentToken } from '../../features/auth/authSlice';
import { formatPatientsForExport, exportData } from '../../utils/exportUtils';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Input from '../../components/Input';
import Table from '../../components/Table';
import Pagination from '../../components/Pagination';
import Badge from '../../components/Badge';
import { isAdmin, isMWO, isJrSr, PATIENT_REGISTRATION_FORM, CLINICAL_PROFORMA_FORM, ADL_FILE_FORM, PRESCRIPTION_FORM } from '../../utils/constants';
import PGI_Logo from '../../assets/PGI_Logo.png';
import * as XLSX from 'xlsx-js-style';

const PatientsPage = () => {
  const user = useSelector(selectCurrentUser);
  const token = useSelector(selectCurrentToken);
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const limit = 10;

  // Reset page to 1 when search changes
  useEffect(() => {
    setPage(1);
  }, [search]);

  // Fetch patients - use server-side pagination when not searching, client-side when searching
  const fetchLimit = search.trim() ? 100 : limit; // Fetch more when searching to allow client-side filtering
  
  const { data, isLoading, isFetching, refetch, error } = useGetAllPatientsQuery({
    page: search.trim() ? 1 : page, // Use current page when not searching, always page 1 when searching
    limit: fetchLimit,
    search: search.trim() || undefined // Send search to backend if provided
  }, {
    refetchOnMountOrArgChange: true,
  });

  // Client-side filtering by all fields including doctor name (only when searching)
  const filteredPatients = data?.data?.patients ? (() => {
    if (!search.trim()) {
      // No search - use server-side paginated results directly
      return data.data.patients;
    }

    // When searching, filter client-side
    const searchLower = search.trim().toLowerCase();
    
    // Filter by all searchable fields including doctor name
    const filtered = data.data.patients.filter(patient => {
      return (
        patient.name?.toLowerCase().includes(searchLower) ||
        patient.cr_no?.toLowerCase().includes(searchLower) ||
        patient.psy_no?.toLowerCase().includes(searchLower) ||
        patient.adl_no?.toLowerCase().includes(searchLower) ||
        patient.assigned_doctor_name?.toLowerCase().includes(searchLower) ||
        patient.assigned_doctor_role?.toLowerCase().includes(searchLower)
      );
    });

    // Apply pagination to filtered results
    const startIndex = (page - 1) * limit;
    return filtered.slice(startIndex, startIndex + limit);
  })() : [];

  // Calculate total pages for filtered results
  const totalFiltered = search.trim() 
    ? (data?.data?.patients?.filter(patient => {
        const searchLower = search.trim().toLowerCase();
        return (
          patient.name?.toLowerCase().includes(searchLower) ||
          patient.cr_no?.toLowerCase().includes(searchLower) ||
          patient.psy_no?.toLowerCase().includes(searchLower) ||
          patient.adl_no?.toLowerCase().includes(searchLower) ||
          patient.assigned_doctor_name?.toLowerCase().includes(searchLower) ||
          patient.assigned_doctor_role?.toLowerCase().includes(searchLower)
        );
      }).length || 0)
    : (data?.data?.pagination?.total || 0);
  
  const totalPages = search.trim() 
    ? Math.ceil(totalFiltered / limit)
    : (data?.data?.pagination?.pages || 1);
 
  const [deletePatient] = useDeletePatientMutation();
 

  // Handle view patient details
  const handleView = (row) => {
   
    const patientId = row.id
    //  getPatientId(row);
    
    if (!patientId) {
      toast.error('Invalid patient ID. Unable to view patient details.');
      return;
    }

    // Explicitly set edit=false to ensure view mode and clear any persisted edit state
    navigate(`/patients/${patientId}?edit=false`);
  };

  // Handle edit patient
  const handleEdit = (row) => {
    const patientId = row.id
    // getPatientId(row.id);
    
    if (!patientId) {
      toast.error('Invalid patient ID. Unable to edit patient.');
      return;
    }
    
    navigate(`/patients/${patientId}?edit=true`);
  };

  const handleDelete = async (id) => {
    if (!id) {
      toast.error('Invalid patient ID. Cannot delete patient.');
      return;
    }
  
    // No browser confirm — directly attempt delete
    try {
      await deletePatient(id).unwrap();
      toast.success('Patient and all related records deleted successfully');
  
      // RTK Query will automatically refetch when tags are invalidated
      // But we can also explicitly refetch to ensure immediate update
      refetch();
  
    } catch (err) {
      toast.error(err?.data?.message || err?.message || 'Failed to delete patient');
    }
  };
  

  const handleExport = async (patientId) => {
    if (!patientId) {
      toast.error('Invalid patient ID. Unable to export patient details.');
      return;
    }

    try {
      toast.info('Loading patient data for export...');
      
      const baseUrl = import.meta.env.VITE_API_URL || '/api';
      const todayDateString = toISTDateString(new Date());

      // Fetch patient data
      const patientResponse = await fetch(`${baseUrl}/patients/${patientId}`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!patientResponse.ok) {
        throw new Error('Failed to fetch patient details');
      }

      const patientResult = await patientResponse.json();
      const patient = patientResult?.data?.patient;

      if (!patient) {
        toast.error('Patient data not found');
      return;
    }
    
      // Define complete header sets for each sheet (same as handleExportAll)
      const patientDetailsHeaders = {
        'Patient ID': 'N/A',
        'CR No': 'N/A',
        'PSY No': 'N/A',
        'ADL No': 'N/A',
        'Name': 'N/A',
        'Age': 'N/A',
        'Sex': 'N/A',
        'Contact Number': 'N/A',
        'Age Group': 'N/A',
        'Marital Status': 'N/A',
        'Year of Marriage': 'N/A',
        'No of Children': 'N/A',
        'No of Children Male': 'N/A',
        'No of Children Female': 'N/A',
        'Occupation': 'N/A',
        'Actual Occupation': 'N/A',
        'Education Level': 'N/A',
        'Completed Years of Education': 'N/A',
        'Patient Income': 'N/A',
        'Family Income': 'N/A',
        'Religion': 'N/A',
        'Family Type': 'N/A',
        'Locality': 'N/A',
        'Head Name': 'N/A',
        'Head Age': 'N/A',
        'Head Relationship': 'N/A',
        'Head Education': 'N/A',
        'Head Occupation': 'N/A',
        'Head Income': 'N/A',
        'Distance from Hospital': 'N/A',
        'Mobility': 'N/A',
        'Referred By': 'N/A',
        'Exact Source': 'N/A',
        'Seen in Walk-in On': 'N/A',
        'Worked Up On': 'N/A',
        'Present Address Line 1': 'N/A',
        'Present Address Line 2': 'N/A',
        'Present City/Town/Village': 'N/A',
        'Present District': 'N/A',
        'Present State': 'N/A',
        'Present Pin Code': 'N/A',
        'Present Country': 'N/A',
        'Permanent Address Line 1': 'N/A',
        'Permanent Address Line 2': 'N/A',
        'Permanent City/Town/Village': 'N/A',
        'Permanent District': 'N/A',
        'Permanent State': 'N/A',
        'Permanent Pin Code': 'N/A',
        'Permanent Country': 'N/A',
        'Assigned Doctor': 'N/A',
        'Doctor Role': 'N/A',
        'Assigned Room': 'N/A',
        'Category': 'N/A',
        'Case Complexity': 'N/A',
        'Department': 'N/A',
        'Unit/Consit': 'N/A',
        'Room No': 'N/A',
        'Serial No': 'N/A',
        'File No': 'N/A',
        'Unit Days': 'N/A',
        'Special Clinic No': 'N/A',
        'Created At': 'N/A',
      };

      const clinicalProformaHeaders = {
        'Patient ID': 'N/A',
        'Patient Name': 'N/A',
        'CR No': 'N/A',
        'Visit Number': 'N/A',
        'Visit Date': 'N/A',
        'Visit Type': 'N/A',
        'Room Number': 'N/A',
        'Doctor': 'N/A',
        'Doctor Role': 'N/A',
        'Informant Present': 'N/A',
        'Nature of Information': 'N/A',
        'Onset Duration': 'N/A',
        'Course': 'N/A',
        'Precipitating Factor': 'N/A',
        'Illness Duration': 'N/A',
        'Current Episode Since': 'N/A',
        'Mood': 'N/A',
        'Behaviour': 'N/A',
        'Speech': 'N/A',
        'Thought': 'N/A',
        'Perception': 'N/A',
        'Somatic': 'N/A',
        'Bio Functions': 'N/A',
        'Adjustment': 'N/A',
        'Cognitive Function': 'N/A',
        'Fits': 'N/A',
        'Sexual Problem': 'N/A',
        'Substance Use': 'N/A',
        'Past History': 'N/A',
        'Family History': 'N/A',
        'Associated Medical/Surgical': 'N/A',
        'MSE Behaviour': 'N/A',
        'MSE Affect': 'N/A',
        'MSE Thought': 'N/A',
        'MSE Delusions': 'N/A',
        'MSE Perception': 'N/A',
        'MSE Cognitive Function': 'N/A',
        'General Physical Examination': 'N/A',
        'Diagnosis': 'N/A',
        'ICD Code': 'N/A',
        'Disposal': 'N/A',
        'Workup Appointment': 'N/A',
        'Referred To': 'N/A',
        'Treatment Prescribed': 'N/A',
        'Doctor Decision': 'N/A',
        'Requires ADL File': 'N/A',
        'ADL Reasoning': 'N/A',
        'Created At': 'N/A',
      };

      const adlFileHeaders = {
        'Patient ID': 'N/A',
        'Patient Name': 'N/A',
        'CR No': 'N/A',
        'ADL File #': 'N/A',
        'ADL No': 'N/A',
        'File Status': 'N/A',
        'File Created Date': 'N/A',
        'Physical File Location': 'N/A',
        'Last Accessed Date': 'N/A',
        'Last Accessed By': 'N/A',
        'Total Visits': 'N/A',
        'Created By': 'N/A',
        'Created By Role': 'N/A',
        'Notes': 'N/A',
        'History Narrative': 'N/A',
        'History Specific Enquiry': 'N/A',
        'History Drug Intake': 'N/A',
        'History Treatment Place': 'N/A',
        'History Treatment Dates': 'N/A',
        'History Treatment Drugs': 'N/A',
        'History Treatment Response': 'N/A',
        'Informants': 'N/A',
        'Complaints Patient': 'N/A',
        'Complaints Informant': 'N/A',
        'Past History Medical': 'N/A',
        'Past History Psychiatric Diagnosis': 'N/A',
        'Past History Psychiatric Treatment': 'N/A',
        'Family History Father Age': 'N/A',
        'Family History Father Education': 'N/A',
        'Family History Father Occupation': 'N/A',
        'Family History Mother Age': 'N/A',
        'Family History Mother Education': 'N/A',
        'Family History Mother Occupation': 'N/A',
        'Provisional Diagnosis': 'N/A',
        'Treatment Plan': 'N/A',
        'Consultant Comments': 'N/A',
        'Created At': 'N/A',
      };

      const prescriptionHeaders = {
        'Patient ID': 'N/A',
        'Patient Name': 'N/A',
        'CR No': 'N/A',
        'Proforma ID': 'N/A',
        'Visit Date': 'N/A',
        'Visit Type': 'N/A',
        'Prescription #': 'N/A',
        'Medicine': 'N/A',
        'Dosage': 'N/A',
        'When to Take': 'N/A',
        'Frequency': 'N/A',
        'Duration': 'N/A',
        'Quantity': 'N/A',
        'Details': 'N/A',
        'Notes': 'N/A',
        'Created At': 'N/A',
      };

      // Helper functions
      const formatDate = (date) => {
        if (!date) return 'N/A';
        try {
          return new Date(date).toLocaleDateString('en-IN');
        } catch {
          return 'N/A';
        }
      };

      const formatDateTime = (date) => {
        if (!date) return 'N/A';
        try {
          return new Date(date).toLocaleString('en-IN');
        } catch {
          return 'N/A';
        }
      };

      const formatArray = (arr) => {
        if (!arr || !Array.isArray(arr) || arr.length === 0) return 'N/A';
        return Array.isArray(arr) ? arr.join(', ') : String(arr);
      };

      const formatBoolean = (val) => {
        if (val === null || val === undefined) return 'N/A';
        return val ? 'Yes' : 'No';
      };

      // Prepare data arrays for each sheet
      const patientDetailsData = [];
      const clinicalProformaData = [];
      const adlFileData = [];
      const prescriptionData = [];

      // Helper function to populate row data from constants
      const populateRowFromConstants = (row, constantArray, data, specialMappings = {}) => {
        constantArray.forEach(field => {
          const fieldValue = field.value;
          let value = data[fieldValue];
          
          // Apply special mappings if provided
          if (specialMappings[fieldValue]) {
            value = specialMappings[fieldValue](data);
          } else {
            // Handle date fields
            if (fieldValue === 'date' || fieldValue === 'seen_in_walk_in_on' || fieldValue === 'worked_up_on') {
              value = formatDate(value);
            } else if (fieldValue === 'mobile_no') {
              value = data.contact_number || data.mobile_no || 'N/A';
            } else if (fieldValue === 'education') {
              value = data.education || data.education_level || 'N/A';
            } else if (fieldValue === 'patient_income' || fieldValue === 'family_income') {
              value = value ? (typeof value === 'number' ? `₹${value}` : value) : 'N/A';
            } else if (fieldValue === 'assigned_doctor_name') {
              const doctorName = data.assigned_doctor_name || '';
              const doctorRole = data.assigned_doctor_role || '';
              value = doctorName ? (doctorRole ? `${doctorName} (${doctorRole})` : doctorName) : 'Not assigned';
            } else {
              value = (value !== null && value !== undefined && value !== '') ? value : 'N/A';
            }
          }
          
          row[field.label] = value;
        });
        return row;
      };

      // Add patient details (always included with all headers)
      const patientRow = { ...patientDetailsHeaders };
      patientRow['Patient ID'] = patient.id;
      patientRow['ADL No'] = patient.adl_no || 'N/A';
      patientRow['Actual Occupation'] = patient.actual_occupation || 'N/A';
      patientRow['Completed Years of Education'] = patient.completed_years_of_education || 'N/A';
      patientRow['Present Address Line 1'] = patient.present_address_line_1 || 'N/A';
      patientRow['Present Address Line 2'] = patient.present_address_line_2 || 'N/A';
      patientRow['Present City/Town/Village'] = patient.present_city_town_village || 'N/A';
      patientRow['Permanent Address Line 1'] = patient.permanent_address_line_1 || 'N/A';
      patientRow['Permanent Address Line 2'] = patient.permanent_address_line_2 || 'N/A';
      patientRow['Permanent City/Town/Village'] = patient.permanent_city_town_village || 'N/A';
      patientRow['Assigned Doctor'] = patient.assigned_doctor_name || 'N/A';
      patientRow['Doctor Role'] = patient.assigned_doctor_role || 'N/A';
      patientRow['Assigned Room'] = patient.assigned_room || 'N/A';
      patientRow['Case Complexity'] = patient.case_complexity || 'N/A';
      patientRow['Created At'] = formatDateTime(patient.created_at);
      
      // Populate from PATIENT_REGISTRATION_FORM constants
      populateRowFromConstants(patientRow, PATIENT_REGISTRATION_FORM, patient);
      
      patientDetailsData.push(patientRow);

      // Track if patient has any past history data
      let hasPastClinicalProforma = false;
      let hasPastAdlFile = false;
      let hasPastPrescription = false;

      try {
        // Fetch clinical proformas
        const clinicalResponse = await fetch(`${baseUrl}/clinical-proformas/patient/${patientId}`, {
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });

        if (clinicalResponse.ok) {
          const clinicalResult = await clinicalResponse.json();
          const proformas = clinicalResult?.data?.proformas || clinicalResult?.data || [];
          
          // Filter to only past proformas (not today's)
          const pastProformas = proformas.filter(proforma => {
            if (!proforma) return false;
            const proformaDate = toISTDateString(proforma.visit_date || proforma.created_at);
            if (!proformaDate) return true; // Include proformas without date as past
            return proformaDate !== todayDateString;
          });

          if (pastProformas.length > 0) {
            hasPastClinicalProforma = true;
          }

          // Add past proformas to clinical proforma data
          pastProformas.forEach((proforma, idx) => {
            const proformaRow = { ...clinicalProformaHeaders };
            proformaRow['Patient ID'] = patientId;
            proformaRow['Patient Name'] = patient.name || 'N/A';
            proformaRow['CR No'] = patient.cr_no || 'N/A';
            proformaRow['Visit Number'] = idx + 1;
            proformaRow['Visit Date'] = formatDate(proforma.visit_date);
            proformaRow['Visit Type'] = proforma.visit_type || 'N/A';
            proformaRow['Room Number'] = proforma.room_no || 'N/A';
            proformaRow['Doctor'] = proforma.doctor_name || proforma.assigned_doctor_name || 'N/A';
            proformaRow['Doctor Role'] = proforma.doctor_role || proforma.assigned_doctor_role || 'N/A';
            proformaRow['Informant Present'] = formatBoolean(proforma.informant_present);
            proformaRow['Nature of Information'] = proforma.nature_of_information || 'N/A';
            proformaRow['Onset Duration'] = proforma.onset_duration || 'N/A';
            proformaRow['Course'] = proforma.course || 'N/A';
            proformaRow['Precipitating Factor'] = proforma.precipitating_factor || 'N/A';
            proformaRow['Illness Duration'] = proforma.illness_duration || 'N/A';
            proformaRow['Current Episode Since'] = proforma.current_episode_since || 'N/A';
            proformaRow['Mood'] = formatArray(proforma.mood);
            proformaRow['Behaviour'] = formatArray(proforma.behaviour);
            proformaRow['Speech'] = formatArray(proforma.speech);
            proformaRow['Thought'] = formatArray(proforma.thought);
            proformaRow['Perception'] = formatArray(proforma.perception);
            proformaRow['Somatic'] = formatArray(proforma.somatic);
            proformaRow['Bio Functions'] = formatArray(proforma.bio_functions);
            proformaRow['Adjustment'] = formatArray(proforma.adjustment);
            proformaRow['Cognitive Function'] = formatArray(proforma.cognitive_function);
            proformaRow['Fits'] = formatArray(proforma.fits);
            proformaRow['Sexual Problem'] = formatArray(proforma.sexual_problem);
            proformaRow['Substance Use'] = formatArray(proforma.substance_use);
            proformaRow['Past History'] = proforma.past_history || 'N/A';
            proformaRow['Family History'] = proforma.family_history || 'N/A';
            proformaRow['Associated Medical/Surgical'] = formatArray(proforma.associated_medical_surgical);
            proformaRow['MSE Behaviour'] = formatArray(proforma.mse_behaviour);
            proformaRow['MSE Affect'] = formatArray(proforma.mse_affect);
            proformaRow['MSE Thought'] = formatArray(proforma.mse_thought);
            proformaRow['MSE Delusions'] = proforma.mse_delusions || 'N/A';
            proformaRow['MSE Perception'] = formatArray(proforma.mse_perception);
            proformaRow['MSE Cognitive Function'] = formatArray(proforma.mse_cognitive_function);
            proformaRow['General Physical Examination'] = proforma.gpe || 'N/A';
            proformaRow['Diagnosis'] = proforma.diagnosis || 'N/A';
            proformaRow['ICD Code'] = proforma.icd_code || 'N/A';
            proformaRow['Disposal'] = proforma.disposal || 'N/A';
            proformaRow['Workup Appointment'] = formatDate(proforma.workup_appointment);
            proformaRow['Referred To'] = proforma.referred_to || 'N/A';
            proformaRow['Treatment Prescribed'] = proforma.treatment_prescribed || 'N/A';
            proformaRow['Doctor Decision'] = proforma.doctor_decision || 'N/A';
            proformaRow['Requires ADL File'] = formatBoolean(proforma.requires_adl_file);
            proformaRow['ADL Reasoning'] = proforma.adl_reasoning || 'N/A';
            proformaRow['Created At'] = formatDateTime(proforma.created_at);
            clinicalProformaData.push(proformaRow);
          });

          // Fetch prescriptions for past proformas
          for (const proforma of pastProformas) {
            try {
              const prescriptionResponse = await fetch(`${baseUrl}/prescriptions/by-proforma/${proforma.id}`, {
                headers: {
                  'Authorization': token ? `Bearer ${token}` : '',
                  'Content-Type': 'application/json',
                },
                credentials: 'include',
              });

              if (prescriptionResponse.ok) {
                const prescriptionResult = await prescriptionResponse.json();
                const prescriptions = prescriptionResult?.data?.prescription || [];
                
                if (prescriptions.length > 0) {
                  hasPastPrescription = true;
                }
                
                prescriptions.forEach((prescription, pIdx) => {
                  const prescriptionRow = { ...prescriptionHeaders };
                  prescriptionRow['Patient ID'] = patientId;
                  prescriptionRow['Patient Name'] = patient.name || 'N/A';
                  prescriptionRow['CR No'] = patient.cr_no || 'N/A';
                  prescriptionRow['Proforma ID'] = proforma.id;
                  prescriptionRow['Visit Date'] = formatDate(proforma.visit_date);
                  prescriptionRow['Visit Type'] = proforma.visit_type || 'N/A';
                  prescriptionRow['Prescription #'] = pIdx + 1;
                  prescriptionRow['When to Take'] = prescription.when_to_take || 'N/A';
                  prescriptionRow['Created At'] = formatDateTime(prescription.created_at);
                  
                  // Populate from PRESCRIPTION_FORM constants
                  populateRowFromConstants(prescriptionRow, PRESCRIPTION_FORM, prescription);
                  
                  prescriptionData.push(prescriptionRow);
                });
              }
            } catch (e) {
              console.warn(`Failed to fetch prescriptions for proforma ${proforma.id}:`, e);
            }
          }
        }
      } catch (e) {
        console.warn(`Failed to fetch clinical proformas for patient ${patientId}:`, e);
      }

      try {
        // Fetch ADL files
        const adlResponse = await fetch(`${baseUrl}/adl-files/patient/${patientId}`, {
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });

        if (adlResponse.ok) {
          const adlResult = await adlResponse.json();
          const adlFiles = adlResult?.data?.adlFiles || adlResult?.data?.files || adlResult?.data || [];
          const adlFilesArray = Array.isArray(adlFiles) ? adlFiles : [];

          // Filter to only past ADL files (not today's)
          const pastAdlFiles = adlFilesArray.filter(adl => {
            if (!adl) return false;
            const adlDate = toISTDateString(adl.file_created_date || adl.created_at);
            if (!adlDate) return true; // Include ADL files without date as past
            return adlDate !== todayDateString;
          });

          if (pastAdlFiles.length > 0) {
            hasPastAdlFile = true;
          }

          // Add past ADL files to ADL data
          pastAdlFiles.forEach((adl, idx) => {
            const adlRow = { ...adlFileHeaders };
            adlRow['Patient ID'] = patientId;
            adlRow['Patient Name'] = patient.name || 'N/A';
            adlRow['CR No'] = patient.cr_no || 'N/A';
            adlRow['ADL File #'] = idx + 1;
            adlRow['ADL No'] = adl.adl_no || 'N/A';
            adlRow['File Status'] = adl.file_status || 'N/A';
            adlRow['File Created Date'] = formatDate(adl.file_created_date);
            adlRow['Physical File Location'] = adl.physical_file_location || 'N/A';
            adlRow['Last Accessed Date'] = formatDate(adl.last_accessed_date);
            adlRow['Last Accessed By'] = adl.last_accessed_by_name || 'N/A';
            adlRow['Total Visits'] = adl.total_visits || 'N/A';
            adlRow['Created By'] = adl.created_by_name || 'N/A';
            adlRow['Created By Role'] = adl.created_by_role || 'N/A';
            adlRow['Created At'] = formatDateTime(adl.created_at);
            
            // Populate from ADL_FILE_FORM constants
            const adlMappings = {
              'history_treatment_dates': (data) => formatDate(data.history_treatment_dates),
            };
            
            populateRowFromConstants(adlRow, ADL_FILE_FORM, adl, adlMappings);
            
            adlFileData.push(adlRow);
          });
        }
      } catch (e) {
        console.warn(`Failed to fetch ADL files for patient ${patientId}:`, e);
      }

      // If patient has no past history data in any section, add placeholder rows with N/A
      if (!hasPastClinicalProforma) {
        const emptyProformaRow = { ...clinicalProformaHeaders };
        emptyProformaRow['Patient ID'] = patientId;
        emptyProformaRow['Patient Name'] = patient.name || 'N/A';
        emptyProformaRow['CR No'] = patient.cr_no || 'N/A';
        clinicalProformaData.push(emptyProformaRow);
      }

      if (!hasPastAdlFile) {
        const emptyAdlRow = { ...adlFileHeaders };
        emptyAdlRow['Patient ID'] = patientId;
        emptyAdlRow['Patient Name'] = patient.name || 'N/A';
        emptyAdlRow['CR No'] = patient.cr_no || 'N/A';
        adlFileData.push(emptyAdlRow);
      }

      if (!hasPastPrescription) {
        const emptyPrescriptionRow = { ...prescriptionHeaders };
        emptyPrescriptionRow['Patient ID'] = patientId;
        emptyPrescriptionRow['Patient Name'] = patient.name || 'N/A';
        emptyPrescriptionRow['CR No'] = patient.cr_no || 'N/A';
        prescriptionData.push(emptyPrescriptionRow);
      }

      // Create Excel workbook
      const wb = XLSX.utils.book_new();

      // Helper function to apply header styles
      const applyHeaderStyles = (ws) => {
        if (!ws['!ref']) return;
        
        const range = XLSX.utils.decode_range(ws['!ref']);
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cellAddress = XLSX.utils.encode_cell({ r: 0, c: C });
          if (!ws[cellAddress]) continue;
          ws[cellAddress].s = {
            fill: { fgColor: { rgb: '1e40af' } },
            font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
            alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
            border: {
              top: { style: 'thin', color: { rgb: '000000' } },
              bottom: { style: 'thin', color: { rgb: '000000' } },
              left: { style: 'thin', color: { rgb: '000000' } },
              right: { style: 'thin', color: { rgb: '000000' } },
            },
          };
        }
        
        // Set column widths
        const colWidths = [];
        for (let C = range.s.c; C <= range.e.c; ++C) {
          colWidths.push({ wch: 20 });
        }
        ws['!cols'] = colWidths;
      };

      // Sheet 1: Patient Details (always created with all headers)
      const ws1 = XLSX.utils.json_to_sheet(patientDetailsData);
      applyHeaderStyles(ws1);
      XLSX.utils.book_append_sheet(wb, ws1, 'Patient Details');

      // Sheet 2: Walk-in Clinical Proforma (always created with all headers)
      const ws2 = XLSX.utils.json_to_sheet(clinicalProformaData);
      applyHeaderStyles(ws2);
      XLSX.utils.book_append_sheet(wb, ws2, 'Walk-in Clinical Proforma');

      // Sheet 3: Out-Patient Intake Record (always created with all headers)
      const ws3 = XLSX.utils.json_to_sheet(adlFileData);
      applyHeaderStyles(ws3);
      XLSX.utils.book_append_sheet(wb, ws3, 'Out-Patient Intake Record');

      // Sheet 4: Prescription (always created with all headers)
      const ws4 = XLSX.utils.json_to_sheet(prescriptionData);
      applyHeaderStyles(ws4);
      XLSX.utils.book_append_sheet(wb, ws4, 'Prescription');

      // Generate filename with patient name and date
      const patientName = patient.name || patient.cr_no || 'Patient';
      const sanitizedName = patientName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const filename = `patient_${sanitizedName}_${patientId}_${new Date().toISOString().split('T')[0]}.xlsx`;

      // Write file
      XLSX.writeFile(wb, filename);
      
      toast.success(`Successfully exported patient ${patient.name || patient.cr_no || patientId}'s Past History data to Excel`);
    } catch (err) {
      console.error('Export error:', err);
      toast.error(err?.message || 'Failed to export patient\'s Past History data');
    }
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

  const handleExportAll = async () => {
    let progressToastId = null;
    
    try {
      // Show initial loading toast
      progressToastId = toast.loading('Loading all patients\' Past History data for export...', {
        autoClose: false,
      });
      
      const baseUrl = import.meta.env.VITE_API_URL || '/api';
      const todayDateString = toISTDateString(new Date());
      
      // Get all patients (use filtered if searching, otherwise fetch all)
      let allPatients = [];
      if (search.trim()) {
        // Use filtered patients from search
        allPatients = filteredPatients;
      } else {
        // Fetch all patients
        const patientsResponse = await fetch(`${baseUrl}/patients?page=1&limit=1000`, {
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });
        
        if (!patientsResponse.ok) {
          throw new Error('Failed to fetch patients');
        }
        
        const patientsResult = await patientsResponse.json();
        allPatients = patientsResult?.data?.patients || [];
      }

      if (!allPatients || allPatients.length === 0) {
        toast.dismiss(progressToastId);
        toast.warning('No patients found to export');
        return;
      }

      // Update toast with total count
      toast.update(progressToastId, {
        render: `Processing patients' Past History data for export... (0/${allPatients.length} patients)`,
        type: 'info',
        isLoading: true,
        autoClose: false,
      });

      // Helper function to build headers from constants
      const buildHeadersFromConstants = (constantArray, additionalHeaders = {}) => {
        const headers = {};
        // Add additional headers first (like Patient ID, CR No, etc.)
        Object.keys(additionalHeaders).forEach(key => {
          headers[key] = 'N/A';
        });
        // Add headers from constants
        constantArray.forEach(field => {
          headers[field.label] = 'N/A';
        });
        return headers;
      };

      // Define complete header sets for each sheet using constants
      const patientDetailsHeaders = buildHeadersFromConstants(PATIENT_REGISTRATION_FORM, {
        'Patient ID': 'N/A',
        'ADL No': 'N/A',
        'Actual Occupation': 'N/A',
        'Completed Years of Education': 'N/A',
        'Present Address Line 1': 'N/A',
        'Present Address Line 2': 'N/A',
        'Present City/Town/Village': 'N/A',
        'Permanent Address Line 1': 'N/A',
        'Permanent Address Line 2': 'N/A',
        'Permanent City/Town/Village': 'N/A',
        'Assigned Doctor': 'N/A',
        'Doctor Role': 'N/A',
        'Assigned Room': 'N/A',
        'Case Complexity': 'N/A',
        'Created At': 'N/A',
      });

      const clinicalProformaHeaders = buildHeadersFromConstants(CLINICAL_PROFORMA_FORM, {
        'Patient ID': 'N/A',
        'Patient Name': 'N/A',
        'CR No': 'N/A',
        'Visit Number': 'N/A',
        'Visit Date': 'N/A',
        'Visit Type': 'N/A',
        'Room Number': 'N/A',
        'Doctor': 'N/A',
        'Doctor Role': 'N/A',
        'Disposal': 'N/A',
        'Workup Appointment': 'N/A',
        'Referred To': 'N/A',
        'Treatment Prescribed': 'N/A',
        'Requires ADL File': 'N/A',
        'ADL Reasoning': 'N/A',
        'Created At': 'N/A',
      });

      const adlFileHeaders = buildHeadersFromConstants(ADL_FILE_FORM, {
        'Patient ID': 'N/A',
        'Patient Name': 'N/A',
        'CR No': 'N/A',
        'ADL File #': 'N/A',
        'ADL No': 'N/A',
        'File Status': 'N/A',
        'File Created Date': 'N/A',
        'Physical File Location': 'N/A',
        'Last Accessed Date': 'N/A',
        'Last Accessed By': 'N/A',
        'Total Visits': 'N/A',
        'Created By': 'N/A',
        'Created By Role': 'N/A',
        'Created At': 'N/A',
      });

      const prescriptionHeaders = buildHeadersFromConstants(PRESCRIPTION_FORM, {
        'Patient ID': 'N/A',
        'Patient Name': 'N/A',
        'CR No': 'N/A',
        'Proforma ID': 'N/A',
        'Visit Date': 'N/A',
        'Visit Type': 'N/A',
        'Prescription #': 'N/A',
        'When to Take': 'N/A',
        'Created At': 'N/A',
      });

      // Prepare data arrays for each sheet
      const patientDetailsData = [];
      const clinicalProformaData = [];
      const adlFileData = [];
      const prescriptionData = [];

      // Helper function to format date
      const formatDate = (date) => {
        if (!date) return 'N/A';
        try {
          return new Date(date).toLocaleDateString('en-IN');
        } catch {
          return 'N/A';
        }
      };

      // Helper function to format date time
      const formatDateTime = (date) => {
        if (!date) return 'N/A';
        try {
          return new Date(date).toLocaleString('en-IN');
        } catch {
          return 'N/A';
        }
      };

      // Helper function to format array values
      const formatArray = (arr) => {
        if (!arr || !Array.isArray(arr) || arr.length === 0) return 'N/A';
        return Array.isArray(arr) ? arr.join(', ') : String(arr);
      };

      // Helper function to format boolean
      const formatBoolean = (val) => {
        if (val === null || val === undefined) return 'N/A';
        return val ? 'Yes' : 'No';
      };

      // Process each patient
      for (let i = 0; i < allPatients.length; i++) {
        const patient = allPatients[i];
        const patientId = patient.id;

        if (!patientId) continue;

        // Update progress toast every 5 patients or on the last patient
        if ((i + 1) % 5 === 0 || i === allPatients.length - 1) {
          toast.update(progressToastId, {
            render: `Processing patients' Past History data for export... (${i + 1}/${allPatients.length} patients)`,
            type: 'info',
            isLoading: true,
            autoClose: false,
          });
        }

        // Helper function to populate row data from constants (same as in handleExport)
        const populateRowFromConstants = (row, constantArray, data, specialMappings = {}) => {
          constantArray.forEach(field => {
            const fieldValue = field.value;
            let value = data[fieldValue];
            
            // Apply special mappings if provided
            if (specialMappings[fieldValue]) {
              value = specialMappings[fieldValue](data);
            } else {
              // Handle date fields
              if (fieldValue === 'date' || fieldValue === 'seen_in_walk_in_on' || fieldValue === 'worked_up_on') {
                value = formatDate(value);
              } else if (fieldValue === 'mobile_no') {
                value = data.contact_number || data.mobile_no || 'N/A';
              } else if (fieldValue === 'education') {
                value = data.education || data.education_level || 'N/A';
              } else if (fieldValue === 'patient_income' || fieldValue === 'family_income') {
                value = value ? (typeof value === 'number' ? `₹${value}` : value) : 'N/A';
              } else if (fieldValue === 'assigned_doctor_name') {
                const doctorName = data.assigned_doctor_name || '';
                const doctorRole = data.assigned_doctor_role || '';
                value = doctorName ? (doctorRole ? `${doctorName} (${doctorRole})` : doctorName) : 'Not assigned';
              } else {
                value = (value !== null && value !== undefined && value !== '') ? value : 'N/A';
              }
            }
            
            row[field.label] = value;
          });
          return row;
        };

        // Add patient details (always included with all headers)
        const patientRow = { ...patientDetailsHeaders };
        patientRow['Patient ID'] = patientId;
        patientRow['ADL No'] = patient.adl_no || 'N/A';
        patientRow['Actual Occupation'] = patient.actual_occupation || 'N/A';
        patientRow['Completed Years of Education'] = patient.completed_years_of_education || 'N/A';
        patientRow['Present Address Line 1'] = patient.present_address_line_1 || 'N/A';
        patientRow['Present Address Line 2'] = patient.present_address_line_2 || 'N/A';
        patientRow['Present City/Town/Village'] = patient.present_city_town_village || 'N/A';
        patientRow['Permanent Address Line 1'] = patient.permanent_address_line_1 || 'N/A';
        patientRow['Permanent Address Line 2'] = patient.permanent_address_line_2 || 'N/A';
        patientRow['Permanent City/Town/Village'] = patient.permanent_city_town_village || 'N/A';
        patientRow['Assigned Doctor'] = patient.assigned_doctor_name || 'N/A';
        patientRow['Doctor Role'] = patient.assigned_doctor_role || 'N/A';
        patientRow['Assigned Room'] = patient.assigned_room || 'N/A';
        patientRow['Case Complexity'] = patient.case_complexity || 'N/A';
        patientRow['Created At'] = formatDateTime(patient.created_at);
        
        // Populate from PATIENT_REGISTRATION_FORM constants
        populateRowFromConstants(patientRow, PATIENT_REGISTRATION_FORM, patient);
        
        patientDetailsData.push(patientRow);

        // Track if patient has any past history data
        let hasPastClinicalProforma = false;
        let hasPastAdlFile = false;
        let hasPastPrescription = false;

        try {
          // Fetch clinical proformas
          const clinicalResponse = await fetch(`${baseUrl}/clinical-proformas/patient/${patientId}`, {
            headers: {
              'Authorization': token ? `Bearer ${token}` : '',
              'Content-Type': 'application/json',
            },
            credentials: 'include',
          });

          if (clinicalResponse.ok) {
            const clinicalResult = await clinicalResponse.json();
            const proformas = clinicalResult?.data?.proformas || clinicalResult?.data || [];
            
            // Filter to only past proformas (not today's)
            const pastProformas = proformas.filter(proforma => {
              if (!proforma) return false;
              const proformaDate = toISTDateString(proforma.visit_date || proforma.created_at);
              if (!proformaDate) return true; // Include proformas without date as past
              return proformaDate !== todayDateString;
            });

            if (pastProformas.length > 0) {
              hasPastClinicalProforma = true;
            }

            // Add past proformas to clinical proforma data
            pastProformas.forEach((proforma, idx) => {
              const proformaRow = { ...clinicalProformaHeaders };
              proformaRow['Patient ID'] = patientId;
              proformaRow['Patient Name'] = patient.name || 'N/A';
              proformaRow['CR No'] = patient.cr_no || 'N/A';
              proformaRow['Visit Number'] = idx + 1;
              proformaRow['Visit Date'] = formatDate(proforma.visit_date);
              proformaRow['Visit Type'] = proforma.visit_type || 'N/A';
              proformaRow['Room Number'] = proforma.room_no || 'N/A';
              proformaRow['Doctor'] = proforma.doctor_name || proforma.assigned_doctor_name || 'N/A';
              proformaRow['Doctor Role'] = proforma.doctor_role || proforma.assigned_doctor_role || 'N/A';
              proformaRow['Disposal'] = proforma.disposal || 'N/A';
              proformaRow['Workup Appointment'] = formatDate(proforma.workup_appointment);
              proformaRow['Referred To'] = proforma.referred_to || 'N/A';
              proformaRow['Treatment Prescribed'] = proforma.treatment_prescribed || 'N/A';
              proformaRow['Requires ADL File'] = formatBoolean(proforma.requires_adl_file);
              proformaRow['ADL Reasoning'] = proforma.adl_reasoning || 'N/A';
              proformaRow['Created At'] = formatDateTime(proforma.created_at);
              
              // Populate from CLINICAL_PROFORMA_FORM constants
              const clinicalMappings = {
                'informant_present': (data) => formatBoolean(data.informant_present),
                'mood': (data) => formatArray(data.mood),
                'behaviour': (data) => formatArray(data.behaviour),
                'speech': (data) => formatArray(data.speech),
                'thought': (data) => formatArray(data.thought),
                'perception': (data) => formatArray(data.perception),
                'somatic': (data) => formatArray(data.somatic),
                'bio_functions': (data) => formatArray(data.bio_functions),
                'adjustment': (data) => formatArray(data.adjustment),
                'cognitive_function': (data) => formatArray(data.cognitive_function),
                'fits': (data) => formatArray(data.fits),
                'sexual_problem': (data) => formatArray(data.sexual_problem),
                'substance_use': (data) => formatArray(data.substance_use),
                'associated_medical_surgical': (data) => formatArray(data.associated_medical_surgical),
                'mse_behaviour': (data) => formatArray(data.mse_behaviour),
                'mse_affect': (data) => formatArray(data.mse_affect),
                'mse_thought': (data) => formatArray(data.mse_thought),
                'mse_perception': (data) => formatArray(data.mse_perception),
                'mse_cognitive_function': (data) => formatArray(data.mse_cognitive_function),
              };
              
              populateRowFromConstants(proformaRow, CLINICAL_PROFORMA_FORM, proforma, clinicalMappings);
              
              clinicalProformaData.push(proformaRow);
            });

            // Fetch prescriptions for past proformas
            for (const proforma of pastProformas) {
              try {
                const prescriptionResponse = await fetch(`${baseUrl}/prescriptions/by-proforma/${proforma.id}`, {
                  headers: {
                    'Authorization': token ? `Bearer ${token}` : '',
                    'Content-Type': 'application/json',
                  },
                  credentials: 'include',
                });

                if (prescriptionResponse.ok) {
                  const prescriptionResult = await prescriptionResponse.json();
                  const prescriptions = prescriptionResult?.data?.prescription || [];
                  
                  if (prescriptions.length > 0) {
                    hasPastPrescription = true;
                  }
                  
                  prescriptions.forEach((prescription, pIdx) => {
                    const prescriptionRow = { ...prescriptionHeaders };
                    prescriptionRow['Patient ID'] = patientId;
                    prescriptionRow['Patient Name'] = patient.name || 'N/A';
                    prescriptionRow['CR No'] = patient.cr_no || 'N/A';
                    prescriptionRow['Proforma ID'] = proforma.id;
                    prescriptionRow['Visit Date'] = formatDate(proforma.visit_date);
                    prescriptionRow['Visit Type'] = proforma.visit_type || 'N/A';
                    prescriptionRow['Prescription #'] = pIdx + 1;
                    prescriptionRow['When to Take'] = prescription.when_to_take || 'N/A';
                    prescriptionRow['Created At'] = formatDateTime(prescription.created_at);
                    
                    // Populate from PRESCRIPTION_FORM constants
                    populateRowFromConstants(prescriptionRow, PRESCRIPTION_FORM, prescription);
                    
                    prescriptionData.push(prescriptionRow);
                  });
                }
              } catch (e) {
                console.warn(`Failed to fetch prescriptions for proforma ${proforma.id}:`, e);
              }
            }
          }
        } catch (e) {
          console.warn(`Failed to fetch clinical proformas for patient ${patientId}:`, e);
        }

        try {
          // Fetch ADL files
          const adlResponse = await fetch(`${baseUrl}/adl-files/patient/${patientId}`, {
            headers: {
              'Authorization': token ? `Bearer ${token}` : '',
              'Content-Type': 'application/json',
            },
            credentials: 'include',
          });

          if (adlResponse.ok) {
            const adlResult = await adlResponse.json();
            const adlFiles = adlResult?.data?.adlFiles || adlResult?.data?.files || adlResult?.data || [];
            const adlFilesArray = Array.isArray(adlFiles) ? adlFiles : [];

            // Filter to only past ADL files (not today's)
            const pastAdlFiles = adlFilesArray.filter(adl => {
              if (!adl) return false;
              const adlDate = toISTDateString(adl.file_created_date || adl.created_at);
              if (!adlDate) return true; // Include ADL files without date as past
              return adlDate !== todayDateString;
            });

            if (pastAdlFiles.length > 0) {
              hasPastAdlFile = true;
            }

            // Add past ADL files to ADL data
            pastAdlFiles.forEach((adl, idx) => {
              const adlRow = { ...adlFileHeaders };
              adlRow['Patient ID'] = patientId;
              adlRow['Patient Name'] = patient.name || 'N/A';
              adlRow['CR No'] = patient.cr_no || 'N/A';
              adlRow['ADL File #'] = idx + 1;
              adlRow['ADL No'] = adl.adl_no || 'N/A';
              adlRow['File Status'] = adl.file_status || 'N/A';
              adlRow['File Created Date'] = formatDate(adl.file_created_date);
              adlRow['Physical File Location'] = adl.physical_file_location || 'N/A';
              adlRow['Last Accessed Date'] = formatDate(adl.last_accessed_date);
              adlRow['Last Accessed By'] = adl.last_accessed_by_name || 'N/A';
              adlRow['Total Visits'] = adl.total_visits || 'N/A';
              adlRow['Created By'] = adl.created_by_name || 'N/A';
              adlRow['Created By Role'] = adl.created_by_role || 'N/A';
              adlRow['Created At'] = formatDateTime(adl.created_at);
              
              // Populate from ADL_FILE_FORM constants
              const adlMappings = {
                'history_treatment_dates': (data) => formatDate(data.history_treatment_dates),
              };
              
              populateRowFromConstants(adlRow, ADL_FILE_FORM, adl, adlMappings);
              
              adlFileData.push(adlRow);
            });
          }
        } catch (e) {
          console.warn(`Failed to fetch ADL files for patient ${patientId}:`, e);
        }

        // If patient has no past history data in any section, add placeholder rows with N/A
        if (!hasPastClinicalProforma) {
          const emptyProformaRow = { ...clinicalProformaHeaders };
          emptyProformaRow['Patient ID'] = patientId;
          emptyProformaRow['Patient Name'] = patient.name || 'N/A';
          emptyProformaRow['CR No'] = patient.cr_no || 'N/A';
          clinicalProformaData.push(emptyProformaRow);
        }

        if (!hasPastAdlFile) {
          const emptyAdlRow = { ...adlFileHeaders };
          emptyAdlRow['Patient ID'] = patientId;
          emptyAdlRow['Patient Name'] = patient.name || 'N/A';
          emptyAdlRow['CR No'] = patient.cr_no || 'N/A';
          adlFileData.push(emptyAdlRow);
        }

        if (!hasPastPrescription) {
          const emptyPrescriptionRow = { ...prescriptionHeaders };
          emptyPrescriptionRow['Patient ID'] = patientId;
          emptyPrescriptionRow['Patient Name'] = patient.name || 'N/A';
          emptyPrescriptionRow['CR No'] = patient.cr_no || 'N/A';
          prescriptionData.push(emptyPrescriptionRow);
        }
      }

      // Create Excel workbook
      const wb = XLSX.utils.book_new();

      // Helper function to apply header styles
      const applyHeaderStyles = (ws) => {
        if (!ws['!ref']) return;
        
        const range = XLSX.utils.decode_range(ws['!ref']);
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cellAddress = XLSX.utils.encode_cell({ r: 0, c: C });
          if (!ws[cellAddress]) continue;
          ws[cellAddress].s = {
            fill: { fgColor: { rgb: '1e40af' } },
            font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
            alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
            border: {
              top: { style: 'thin', color: { rgb: '000000' } },
              bottom: { style: 'thin', color: { rgb: '000000' } },
              left: { style: 'thin', color: { rgb: '000000' } },
              right: { style: 'thin', color: { rgb: '000000' } },
            },
          };
        }
        
        // Set column widths
        const colWidths = [];
        for (let C = range.s.c; C <= range.e.c; ++C) {
          colWidths.push({ wch: 20 });
        }
        ws['!cols'] = colWidths;
      };

      // Sheet 1: Patient Details (always created with all headers)
      const ws1 = XLSX.utils.json_to_sheet(patientDetailsData);
      applyHeaderStyles(ws1);
      XLSX.utils.book_append_sheet(wb, ws1, 'Patient Details');

      // Sheet 2: Walk-in Clinical Proforma (always created with all headers)
      const ws2 = XLSX.utils.json_to_sheet(clinicalProformaData);
      applyHeaderStyles(ws2);
      XLSX.utils.book_append_sheet(wb, ws2, 'Walk-in Clinical Proforma');

      // Sheet 3: Out-Patient Intake Record (always created with all headers)
      const ws3 = XLSX.utils.json_to_sheet(adlFileData);
      applyHeaderStyles(ws3);
      XLSX.utils.book_append_sheet(wb, ws3, 'Out-Patient Intake Record');

      // Sheet 4: Prescription (always created with all headers)
      const ws4 = XLSX.utils.json_to_sheet(prescriptionData);
      applyHeaderStyles(ws4);
      XLSX.utils.book_append_sheet(wb, ws4, 'Prescription');

      // Generate filename with current date
      const filename = `all_patients_past_history_${new Date().toISOString().split('T')[0]}.xlsx`;

      // Write file
      XLSX.writeFile(wb, filename);
      
      // Dismiss progress toast and show success
      toast.dismiss(progressToastId);
      toast.success(`Successfully exported ${allPatients.length} patients' Past History data to Excel`);
    } catch (err) {
      console.error('Export error:', err);
      // Dismiss progress toast and show error
      if (progressToastId) {
        toast.dismiss(progressToastId);
      }
      toast.error(err?.message || 'Failed to export patients\' Past History data');
    }
  };
  // Handle print patient details
  const handlePrint = async (patientId) => {
    if (!patientId) {
      toast.error('Invalid patient ID. Unable to print patient details.');
      return;
    }

    try {
      toast.info('Loading complete patient data for printing...');
      
      // Fetch all related data in parallel
      const baseUrl = import.meta.env.VITE_API_URL || '/api';
      
      const [patientResponse, clinicalResponse, adlResponse] = await Promise.all([
        fetch(`${baseUrl}/patients/${patientId}`, {
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        }),
        fetch(`${baseUrl}/clinical-proformas/patient/${patientId}`, {
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        }).catch(() => ({ ok: false })), // Gracefully handle if endpoint doesn't exist
        fetch(`${baseUrl}/adl-files/patient/${patientId}`, {
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        }).catch(() => ({ ok: false })), // Gracefully handle if endpoint doesn't exist
      ]);

      if (!patientResponse.ok) {
        throw new Error('Failed to fetch patient details');
      }

      const patientResult = await patientResponse.json();
      const patient = patientResult?.data?.patient;

      if (!patient) {
        toast.error('Patient data not found');
        return;
      }

      // Get clinical proforma data (may be empty array)
      let clinicalProformas = [];
      if (clinicalResponse.ok) {
        try {
          const clinicalResult = await clinicalResponse.json();
          clinicalProformas = clinicalResult?.data?.proformas || clinicalResult?.data || [];
        } catch (e) {
          console.warn('Could not parse clinical proforma data:', e);
        }
      }

      // Get ADL file data (may be empty array)
      let adlFiles = [];
      if (adlResponse.ok) {
        try {
          const adlResult = await adlResponse.json();
          const files = adlResult?.data?.adlFiles || adlResult?.data?.files || adlResult?.data || [];
          // Ensure it's always an array
          adlFiles = Array.isArray(files) ? files : [];
        } catch (e) {
          console.warn('Could not parse ADL file data:', e);
          adlFiles = [];
        }
      }

      // Fetch prescriptions for all clinical proformas
      let allPrescriptions = [];
      if (clinicalProformas && clinicalProformas.length > 0) {
        const prescriptionPromises = clinicalProformas.slice(0, 10).map(proforma => 
          fetch(`${baseUrl}/prescriptions/by-proforma/${proforma.id}`, {
            headers: {
              'Authorization': token ? `Bearer ${token}` : '',
              'Content-Type': 'application/json',
            },
            credentials: 'include',
          }).catch(() => ({ ok: false }))
        );

        const prescriptionResponses = await Promise.all(prescriptionPromises);
        
        for (let i = 0; i < prescriptionResponses.length; i++) {
          const response = prescriptionResponses[i];
          if (response.ok) {
            try {
              const prescriptionResult = await response.json();
              const prescriptionData = prescriptionResult?.data?.prescription;
              if (prescriptionData && prescriptionData.prescription) {
                const proforma = clinicalProformas[i];
                prescriptionData.prescription.forEach(prescription => {
                  allPrescriptions.push({
                    ...prescription,
                    proforma_id: proforma.id,
                    visit_date: proforma.visit_date || proforma.created_at,
                    visit_type: proforma.visit_type
                  });
                });
              }
            } catch (e) {
              console.warn('Could not parse prescription data:', e);
            }
          }
        }
      }

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

      // Create print content with all data
      const printContent = generatePrintContent(patient, clinicalProformas, adlFiles, allPrescriptions, logoBase64);
      
      // Create a new window for printing
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error('Please allow pop-ups to print patient details');
        return;
      }
      
      printWindow.document.write(printContent);
      printWindow.document.close();
      
      // Wait for content to load, then print
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
          toast.success('Print dialog opened');
        }, 500);
      };
    } catch (err) {
      console.error('Print error:', err);
      toast.error(err?.message || 'Failed to print patient details');
    }
  };

  // Generate print-friendly HTML content
  const generatePrintContent = (patient, clinicalProformas = [], adlFiles = [], prescriptions = [], logoBase64 = '') => {
    const formatValue = (value) => {
      if (value === null || value === undefined || value === '') return 'N/A';
      if (typeof value === 'boolean') return value ? 'Yes' : 'No';
      if (Array.isArray(value)) {
        if (value.length === 0) return 'N/A';
        return JSON.stringify(value, null, 2);
      }
      if (typeof value === 'object') {
        return JSON.stringify(value, null, 2);
      }
      return String(value);
    };
    
    const formatDate = (date) => {
      if (!date) return 'N/A';
      try {
        return new Date(date).toLocaleDateString('en-IN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      } catch {
        return date;
      }
    };

    const formatDateTime = (date) => {
      if (!date) return 'N/A';
      try {
        return new Date(date).toLocaleString('en-IN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      } catch {
        return date;
      }
    };

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Patient Details - ${formatValue(patient.name)}</title>
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
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-bottom: 12px;
    }
    .info-grid:last-child {
      margin-bottom: 0;
    }
    .info-item {
      margin-bottom: 8px;
      padding: 6px 8px;
      background: #f8fafc;
      border-left: 3px solid #3b82f6;
      border-radius: 4px;
    }
    .info-item:empty {
      display: none;
    }
    .info-label {
      font-weight: 600;
      color: #475569;
      font-size: 9pt;
      margin-bottom: 4px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .info-value {
      color: #1e293b;
      font-size: 10pt;
      font-weight: 500;
      padding-left: 4px;
    }
    .full-width {
      grid-column: 1 / -1;
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
    }
    .footer p {
      margin: 4px 0;
    }
    .footer strong {
      color: #1e40af;
      font-weight: 600;
    }
    @media print {
      body {
        margin: 0;
        padding: 0;
      }
      .section {
        page-break-inside: avoid;
        box-shadow: none;
      }
      .header {
        page-break-after: avoid;
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

  <!-- OUT PATIENT CARD Section -->
  <div class="section">
    <div class="section-title">OUT PATIENT CARD</div>
    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">CR No.</div>
        <div class="info-value">${formatValue(patient.cr_no)}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Date</div>
        <div class="info-value">${formatDate(patient.date)}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Name</div>
        <div class="info-value">${formatValue(patient.name)}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Mobile No.</div>
        <div class="info-value">${formatValue(patient.contact_number)}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Age</div>
        <div class="info-value">${formatValue(patient.age)}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Sex</div>
        <div class="info-value">${formatValue(patient.sex)}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Category</div>
        <div class="info-value">${formatValue(patient.category)}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Father's Name</div>
        <div class="info-value">${formatValue(patient.father_name)}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Department</div>
        <div class="info-value">${formatValue(patient.department)}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Unit/Consit</div>
        <div class="info-value">${formatValue(patient.unit_consit)}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Room No.</div>
        <div class="info-value">${formatValue(patient.room_no)}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Serial No.</div>
        <div class="info-value">${formatValue(patient.serial_no)}</div>
      </div>
      <div class="info-item">
        <div class="info-label">File No.</div>
        <div class="info-value">${formatValue(patient.file_no)}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Unit Days</div>
        <div class="info-value">${formatValue(patient.unit_days)}</div>
      </div>
    </div>
    <div class="info-grid" style="margin-top: 15px;">
      <div class="info-item full-width">
        <div class="info-label">Address Line (House No., Street, Locality)</div>
        <div class="info-value">${formatValue(patient.address_line)}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Country</div>
        <div class="info-value">${formatValue(patient.country)}</div>
      </div>
      <div class="info-item">
        <div class="info-label">State</div>
        <div class="info-value">${formatValue(patient.state)}</div>
      </div>
      <div class="info-item">
        <div class="info-label">District</div>
        <div class="info-value">${formatValue(patient.district)}</div>
      </div>
      <div class="info-item">
        <div class="info-label">City/Town/Village</div>
        <div class="info-value">${formatValue(patient.city)}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Pin Code</div>
        <div class="info-value">${formatValue(patient.pin_code)}</div>
      </div>
    </div>
  </div>

  <!-- OUT-PATIENT RECORD Section -->
  <div class="section">
    <div class="section-title">OUT-PATIENT RECORD</div>
    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">Seen in Walk-in-on</div>
        <div class="info-value">${formatDate(patient.seen_in_walk_in_on)}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Worked up on</div>
        <div class="info-value">${formatDate(patient.worked_up_on)}</div>
      </div>
      <div class="info-item">
        <div class="info-label">CR No.</div>
        <div class="info-value">${formatValue(patient.cr_no)}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Psy. No.</div>
        <div class="info-value">${formatValue(patient.psy_no)}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Special Clinic No.</div>
        <div class="info-value">${formatValue(patient.special_clinic_no)}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Name</div>
        <div class="info-value">${formatValue(patient.name)}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Sex</div>
        <div class="info-value">${formatValue(patient.sex)}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Age Group</div>
        <div class="info-value">${formatValue(patient.age_group)}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Marital Status</div>
        <div class="info-value">${formatValue(patient.marital_status)}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Year of marriage</div>
        <div class="info-value">${formatValue(patient.year_of_marriage)}</div>
      </div>
      <div class="info-item">
        <div class="info-label">No. of Children: M</div>
        <div class="info-value">${formatValue(patient.no_of_children_male)}</div>
      </div>
      <div class="info-item">
        <div class="info-label">No. of Children: F</div>
        <div class="info-value">${formatValue(patient.no_of_children_female)}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Occupation</div>
        <div class="info-value">${formatValue(patient.occupation)}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Education</div>
        <div class="info-value">${formatValue(patient.education || patient.education_level)}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Family Income (₹)</div>
        <div class="info-value">${formatValue(patient.family_income)}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Patient Income (₹)</div>
        <div class="info-value">${formatValue(patient.patient_income || patient.income)}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Religion</div>
        <div class="info-value">${formatValue(patient.religion)}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Family Type</div>
        <div class="info-value">${formatValue(patient.family_type)}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Locality</div>
        <div class="info-value">${formatValue(patient.locality)}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Assigned Doctor</div>
        <div class="info-value">${formatValue(patient.assigned_doctor_name)}${patient.assigned_doctor_role ? ` (${formatValue(patient.assigned_doctor_role)})` : ''}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Assigned Room</div>
        <div class="info-value">${formatValue(patient.assigned_room)}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Family Head Name</div>
        <div class="info-value">${formatValue(patient.head_name)}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Family Head Age</div>
        <div class="info-value">${formatValue(patient.head_age)}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Relationship With Family Head</div>
        <div class="info-value">${formatValue(patient.head_relationship)}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Family Head Education</div>
        <div class="info-value">${formatValue(patient.head_education)}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Family Head Occupation</div>
        <div class="info-value">${formatValue(patient.head_occupation)}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Family Head Income (₹)</div>
        <div class="info-value">${formatValue(patient.head_income)}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Exact distance from hospital</div>
        <div class="info-value">${formatValue(patient.distance_from_hospital)}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Mobility of the patient</div>
        <div class="info-value">${formatValue(patient.mobility)}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Referred by</div>
        <div class="info-value">${formatValue(patient.referred_by)}</div>
      </div>
    </div>
    
    ${patient.permanent_address_line_1 || patient.permanent_city_town_village || patient.permanent_district || patient.permanent_state || patient.permanent_pin_code || patient.permanent_country ? `
    <!-- Permanent Address -->
    <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #e5e7eb;">
      <div class="section-title" style="font-size: 11px; margin-bottom: 10px;">Permanent Address</div>
      <div class="info-grid">
        ${patient.permanent_address_line_1 ? `
        <div class="info-item full-width">
          <div class="info-label">Address Line</div>
          <div class="info-value">${formatValue(patient.permanent_address_line_1)}</div>
        </div>
        ` : ''}
        ${patient.permanent_city_town_village ? `
        <div class="info-item">
          <div class="info-label">City/Town/Village</div>
          <div class="info-value">${formatValue(patient.permanent_city_town_village)}</div>
        </div>
        ` : ''}
        ${patient.permanent_district ? `
        <div class="info-item">
          <div class="info-label">District</div>
          <div class="info-value">${formatValue(patient.permanent_district)}</div>
        </div>
        ` : ''}
        ${patient.permanent_state ? `
        <div class="info-item">
          <div class="info-label">State</div>
          <div class="info-value">${formatValue(patient.permanent_state)}</div>
        </div>
        ` : ''}
        ${patient.permanent_pin_code ? `
        <div class="info-item">
          <div class="info-label">Pin Code</div>
          <div class="info-value">${formatValue(patient.permanent_pin_code)}</div>
        </div>
        ` : ''}
        ${patient.permanent_country ? `
        <div class="info-item">
          <div class="info-label">Country</div>
          <div class="info-value">${formatValue(patient.permanent_country)}</div>
        </div>
        ` : ''}
      </div>
    </div>
    ` : ''}

    ${patient.present_address_line_1 || patient.present_city_town_village || patient.present_district || patient.present_state || patient.present_pin_code || patient.present_country ? `
    <!-- Present Address -->
    <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #e5e7eb;">
      <div class="section-title" style="font-size: 11px; margin-bottom: 10px;">Present Address</div>
      <div class="info-grid">
        ${patient.present_address_line_1 ? `
        <div class="info-item full-width">
          <div class="info-label">Address Line</div>
          <div class="info-value">${formatValue(patient.present_address_line_1)}</div>
        </div>
        ` : ''}
        ${patient.present_city_town_village ? `
        <div class="info-item">
          <div class="info-label">City/Town/Village</div>
          <div class="info-value">${formatValue(patient.present_city_town_village)}</div>
        </div>
        ` : ''}
        ${patient.present_district ? `
        <div class="info-item">
          <div class="info-label">District</div>
          <div class="info-value">${formatValue(patient.present_district)}</div>
        </div>
        ` : ''}
        ${patient.present_state ? `
        <div class="info-item">
          <div class="info-label">State</div>
          <div class="info-value">${formatValue(patient.present_state)}</div>
        </div>
        ` : ''}
        ${patient.present_pin_code ? `
        <div class="info-item">
          <div class="info-label">Pin Code</div>
          <div class="info-value">${formatValue(patient.present_pin_code)}</div>
        </div>
        ` : ''}
        ${patient.present_country ? `
        <div class="info-item">
          <div class="info-label">Country</div>
          <div class="info-value">${formatValue(patient.present_country)}</div>
        </div>
        ` : ''}
      </div>
    </div>
    ` : ''}

    ${patient.local_address ? `
    <!-- Local Address -->
    <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #e5e7eb;">
      <div class="section-title" style="font-size: 11px; margin-bottom: 10px;">Local Address</div>
      <div class="info-grid">
        <div class="info-item full-width">
          <div class="info-label">Local Address</div>
          <div class="info-value">${formatValue(patient.local_address)}</div>
        </div>
      </div>
    </div>
    ` : ''}
  </div>

  ${clinicalProformas && clinicalProformas.length > 0 ? `
  <div class="section">
    <div class="section-title">Walk-in Clinical Proforma (${clinicalProformas.length} visit${clinicalProformas.length > 1 ? 's' : ''})</div>
    ${clinicalProformas.map((proforma, index) => `
    <div style="margin-bottom: ${index < clinicalProformas.length - 1 ? '15px' : '0'}; padding: 18px; border: 2px solid #3b82f6; border-radius: 8px; background: linear-gradient(to bottom, #eff6ff, #ffffff); box-shadow: 0 2px 4px rgba(59, 130, 246, 0.1);">
      <h3 style="margin: 0 0 18px 0; font-size: 13pt; font-weight: bold; color: #1e40af; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; background: linear-gradient(to right, #dbeafe, #eff6ff); padding: 10px; margin: -18px -18px 18px -18px; border-radius: 6px 6px 0 0;">
        Visit ${index + 1} - ${formatDate(proforma.visit_date)}
      </h3>
      <div class="info-grid">
        ${proforma.visit_type ? `
        <div class="info-item">
          <div class="info-label">Visit Type</div>
          <div class="info-value">${formatValue(proforma.visit_type)}</div>
        </div>
        ` : ''}
        ${proforma.room_no ? `
        <div class="info-item">
          <div class="info-label">Room Number</div>
          <div class="info-value">${formatValue(proforma.room_no)}</div>
        </div>
        ` : ''}
        ${proforma.doctor_name ? `
        <div class="info-item">
          <div class="info-label">Doctor</div>
          <div class="info-value">${formatValue(proforma.doctor_name)} (${formatValue(proforma.doctor_role)})</div>
        </div>
        ` : ''}
        ${proforma.informant_present !== undefined ? `
        <div class="info-item">
          <div class="info-label">Informant Present</div>
          <div class="info-value">${formatValue(proforma.informant_present)}</div>
        </div>
        ` : ''}
        ${proforma.nature_of_information ? `
        <div class="info-item full-width">
          <div class="info-label">Nature of Information</div>
          <div class="info-value">${formatValue(proforma.nature_of_information)}</div>
        </div>
        ` : ''}
        ${proforma.onset_duration ? `
        <div class="info-item">
          <div class="info-label">Onset Duration</div>
          <div class="info-value">${formatValue(proforma.onset_duration)}</div>
        </div>
        ` : ''}
        ${proforma.course ? `
        <div class="info-item">
          <div class="info-label">Course</div>
          <div class="info-value">${formatValue(proforma.course)}</div>
        </div>
        ` : ''}
        ${proforma.precipitating_factor ? `
        <div class="info-item full-width">
          <div class="info-label">Precipitating Factor</div>
          <div class="info-value">${formatValue(proforma.precipitating_factor)}</div>
        </div>
        ` : ''}
        ${proforma.illness_duration ? `
        <div class="info-item">
          <div class="info-label">Illness Duration</div>
          <div class="info-value">${formatValue(proforma.illness_duration)}</div>
        </div>
        ` : ''}
        ${proforma.current_episode_since ? `
        <div class="info-item">
          <div class="info-label">Current Episode Since</div>
          <div class="info-value">${formatValue(proforma.current_episode_since)}</div>
        </div>
        ` : ''}
        ${proforma.mood ? `
        <div class="info-item">
          <div class="info-label">Mood</div>
          <div class="info-value">${formatValue(proforma.mood)}</div>
        </div>
        ` : ''}
        ${proforma.behaviour ? `
        <div class="info-item">
          <div class="info-label">Behaviour</div>
          <div class="info-value">${formatValue(proforma.behaviour)}</div>
        </div>
        ` : ''}
        ${proforma.speech ? `
        <div class="info-item">
          <div class="info-label">Speech</div>
          <div class="info-value">${formatValue(proforma.speech)}</div>
        </div>
        ` : ''}
        ${proforma.thought ? `
        <div class="info-item">
          <div class="info-label">Thought</div>
          <div class="info-value">${formatValue(proforma.thought)}</div>
        </div>
        ` : ''}
        ${proforma.perception ? `
        <div class="info-item">
          <div class="info-label">Perception</div>
          <div class="info-value">${formatValue(proforma.perception)}</div>
        </div>
        ` : ''}
        ${proforma.somatic ? `
        <div class="info-item">
          <div class="info-label">Somatic</div>
          <div class="info-value">${formatValue(proforma.somatic)}</div>
        </div>
        ` : ''}
        ${proforma.bio_functions ? `
        <div class="info-item">
          <div class="info-label">Bio Functions</div>
          <div class="info-value">${formatValue(proforma.bio_functions)}</div>
        </div>
        ` : ''}
        ${proforma.adjustment ? `
        <div class="info-item">
          <div class="info-label">Adjustment</div>
          <div class="info-value">${formatValue(proforma.adjustment)}</div>
        </div>
        ` : ''}
        ${proforma.cognitive_function ? `
        <div class="info-item">
          <div class="info-label">Cognitive Function</div>
          <div class="info-value">${formatValue(proforma.cognitive_function)}</div>
        </div>
        ` : ''}
        ${proforma.fits ? `
        <div class="info-item">
          <div class="info-label">Fits</div>
          <div class="info-value">${formatValue(proforma.fits)}</div>
        </div>
        ` : ''}
        ${proforma.sexual_problem ? `
        <div class="info-item">
          <div class="info-label">Sexual Problem</div>
          <div class="info-value">${formatValue(proforma.sexual_problem)}</div>
        </div>
        ` : ''}
        ${proforma.substance_use ? `
        <div class="info-item full-width">
          <div class="info-label">Substance Use</div>
          <div class="info-value">${formatValue(proforma.substance_use)}</div>
        </div>
        ` : ''}
        ${proforma.past_history ? `
        <div class="info-item full-width">
          <div class="info-label">Past History</div>
          <div class="info-value">${formatValue(proforma.past_history)}</div>
        </div>
        ` : ''}
        ${proforma.family_history ? `
        <div class="info-item full-width">
          <div class="info-label">Family History</div>
          <div class="info-value">${formatValue(proforma.family_history)}</div>
        </div>
        ` : ''}
        ${proforma.associated_medical_surgical ? `
        <div class="info-item full-width">
          <div class="info-label">Associated Medical/Surgical</div>
          <div class="info-value">${formatValue(proforma.associated_medical_surgical)}</div>
        </div>
        ` : ''}
        ${proforma.mse_behaviour ? `
        <div class="info-item">
          <div class="info-label">MSE - Behaviour</div>
          <div class="info-value">${formatValue(proforma.mse_behaviour)}</div>
        </div>
        ` : ''}
        ${proforma.mse_affect ? `
        <div class="info-item">
          <div class="info-label">MSE - Affect</div>
          <div class="info-value">${formatValue(proforma.mse_affect)}</div>
        </div>
        ` : ''}
        ${proforma.mse_thought ? `
        <div class="info-item">
          <div class="info-label">MSE - Thought</div>
          <div class="info-value">${formatValue(proforma.mse_thought)}</div>
        </div>
        ` : ''}
        ${proforma.mse_delusions ? `
        <div class="info-item">
          <div class="info-label">MSE - Delusions</div>
          <div class="info-value">${formatValue(proforma.mse_delusions)}</div>
        </div>
        ` : ''}
        ${proforma.mse_perception ? `
        <div class="info-item">
          <div class="info-label">MSE - Perception</div>
          <div class="info-value">${formatValue(proforma.mse_perception)}</div>
        </div>
        ` : ''}
        ${proforma.mse_cognitive_function ? `
        <div class="info-item">
          <div class="info-label">MSE - Cognitive Function</div>
          <div class="info-value">${formatValue(proforma.mse_cognitive_function)}</div>
        </div>
        ` : ''}
        ${proforma.gpe ? `
        <div class="info-item full-width">
          <div class="info-label">General Physical Examination</div>
          <div class="info-value">${formatValue(proforma.gpe)}</div>
        </div>
        ` : ''}
        ${proforma.diagnosis ? `
        <div class="info-item full-width">
          <div class="info-label">Diagnosis</div>
          <div class="info-value">${formatValue(proforma.diagnosis)}</div>
        </div>
        ` : ''}
        ${proforma.icd_code ? `
        <div class="info-item">
          <div class="info-label">ICD Code</div>
          <div class="info-value">${formatValue(proforma.icd_code)}</div>
        </div>
        ` : ''}
        ${proforma.disposal ? `
        <div class="info-item">
          <div class="info-label">Disposal</div>
          <div class="info-value">${formatValue(proforma.disposal)}</div>
        </div>
        ` : ''}
        ${proforma.workup_appointment ? `
        <div class="info-item">
          <div class="info-label">Workup Appointment</div>
          <div class="info-value">${formatDate(proforma.workup_appointment)}</div>
        </div>
        ` : ''}
        ${proforma.referred_to ? `
        <div class="info-item">
          <div class="info-label">Referred To</div>
          <div class="info-value">${formatValue(proforma.referred_to)}</div>
        </div>
        ` : ''}
        ${proforma.treatment_prescribed ? `
        <div class="info-item full-width">
          <div class="info-label">Treatment Prescribed</div>
          <div class="info-value">${formatValue(proforma.treatment_prescribed)}</div>
        </div>
        ` : ''}
        ${proforma.prescriptions ? `
        <div class="info-item full-width">
          <div class="info-label">Prescriptions</div>
          <div class="info-value">${formatValue(proforma.prescriptions)}</div>
        </div>
        ` : ''}
        ${proforma.doctor_decision ? `
        <div class="info-item">
          <div class="info-label">Doctor Decision</div>
          <div class="info-value">${formatValue(proforma.doctor_decision)}</div>
        </div>
        ` : ''}
        ${proforma.requires_adl_file !== undefined ? `
        <div class="info-item">
          <div class="info-label">Requires Out Patient Intake Record</div>
          <div class="info-value">${formatValue(proforma.requires_adl_file)}</div>
        </div>
        ` : ''}
        ${proforma.adl_reasoning ? `
        <div class="info-item full-width">
          <div class="info-label">Out Patient Intake Record Reasoning</div>
          <div class="info-value">${formatValue(proforma.adl_reasoning)}</div>
        </div>
        ` : ''}
        ${proforma.created_at ? `
        <div class="info-item">
          <div class="info-label">Created At</div>
          <div class="info-value">${formatDateTime(proforma.created_at)}</div>
        </div>
        ` : ''}
      </div>
    </div>
    `).join('')}
  </div>
  ` : ''}

  ${adlFiles && Array.isArray(adlFiles) && adlFiles.length > 0 ? `
  <div class="section">
    <div class="section-title">Out Patient Intake Record (${adlFiles.length} file${adlFiles.length > 1 ? 's' : ''})</div>
    ${adlFiles.map((adl, index) => `
    <div style="margin-bottom: ${index < adlFiles.length - 1 ? '15px' : '0'}; padding: 18px; border: 2px solid #8b5cf6; border-radius: 8px; background: linear-gradient(to bottom, #f5f3ff, #ffffff); box-shadow: 0 2px 4px rgba(139, 92, 246, 0.1);">
      <h3 style="margin: 0 0 18px 0; font-size: 13pt; font-weight: bold; color: #6d28d9; border-bottom: 2px solid #8b5cf6; padding-bottom: 10px; background: linear-gradient(to right, #ede9fe, #f5f3ff); padding: 10px; margin: -18px -18px 18px -18px; border-radius: 6px 6px 0 0;">
        Out Patient Intake Record ${index + 1} - ${formatValue(adl.adl_no || `ID: ${adl.id}`)}
      </h3>
      <div class="info-grid">
        ${adl.file_status ? `
        <div class="info-item">
          <div class="info-label">File Status</div>
          <div class="info-value">${formatValue(adl.file_status)}</div>
        </div>
        ` : ''}
        ${adl.file_created_date ? `
        <div class="info-item">
          <div class="info-label">File Created Date</div>
          <div class="info-value">${formatDate(adl.file_created_date)}</div>
        </div>
        ` : ''}
        ${adl.physical_file_location ? `
        <div class="info-item full-width">
          <div class="info-label">Physical File Location</div>
          <div class="info-value">${formatValue(adl.physical_file_location)}</div>
        </div>
        ` : ''}
        ${adl.last_accessed_date ? `
        <div class="info-item">
          <div class="info-label">Last Accessed Date</div>
          <div class="info-value">${formatDate(adl.last_accessed_date)}</div>
        </div>
        ` : ''}
        ${adl.last_accessed_by_name ? `
        <div class="info-item">
          <div class="info-label">Last Accessed By</div>
          <div class="info-value">${formatValue(adl.last_accessed_by_name)}</div>
        </div>
        ` : ''}
        ${adl.total_visits ? `
        <div class="info-item">
          <div class="info-label">Total Visits</div>
          <div class="info-value">${formatValue(adl.total_visits)}</div>
        </div>
        ` : ''}
        ${adl.created_by_name ? `
        <div class="info-item">
          <div class="info-label">Created By</div>
          <div class="info-value">${formatValue(adl.created_by_name)} (${formatValue(adl.created_by_role)})</div>
        </div>
        ` : ''}
        ${adl.notes ? `
        <div class="info-item full-width">
          <div class="info-label">Notes</div>
          <div class="info-value">${formatValue(adl.notes)}</div>
        </div>
        ` : ''}
        ${adl.history_narrative ? `
        <div class="info-item full-width">
          <div class="info-label">History Narrative</div>
          <div class="info-value">${formatValue(adl.history_narrative)}</div>
        </div>
        ` : ''}
        ${adl.history_specific_enquiry ? `
        <div class="info-item full-width">
          <div class="info-label">History Specific Enquiry</div>
          <div class="info-value">${formatValue(adl.history_specific_enquiry)}</div>
        </div>
        ` : ''}
        ${adl.history_drug_intake ? `
        <div class="info-item full-width">
          <div class="info-label">History Drug Intake</div>
          <div class="info-value">${formatValue(adl.history_drug_intake)}</div>
        </div>
        ` : ''}
        ${adl.history_treatment_place ? `
        <div class="info-item">
          <div class="info-label">History Treatment Place</div>
          <div class="info-value">${formatValue(adl.history_treatment_place)}</div>
        </div>
        ` : ''}
        ${adl.history_treatment_dates ? `
        <div class="info-item">
          <div class="info-label">History Treatment Dates</div>
          <div class="info-value">${formatDate(adl.history_treatment_dates)}</div>
        </div>
        ` : ''}
        ${adl.history_treatment_drugs ? `
        <div class="info-item full-width">
          <div class="info-label">History Treatment Drugs</div>
          <div class="info-value">${formatValue(adl.history_treatment_drugs)}</div>
        </div>
        ` : ''}
        ${adl.history_treatment_response ? `
        <div class="info-item full-width">
          <div class="info-label">History Treatment Response</div>
          <div class="info-value">${formatValue(adl.history_treatment_response)}</div>
        </div>
        ` : ''}
        ${adl.informants ? `
        <div class="info-item full-width">
          <div class="info-label">Informants</div>
          <div class="info-value">${formatValue(adl.informants)}</div>
        </div>
        ` : ''}
        ${adl.complaints_patient ? `
        <div class="info-item full-width">
          <div class="info-label">Complaints - Patient</div>
          <div class="info-value">${formatValue(adl.complaints_patient)}</div>
        </div>
        ` : ''}
        ${adl.complaints_informant ? `
        <div class="info-item full-width">
          <div class="info-label">Complaints - Informant</div>
          <div class="info-value">${formatValue(adl.complaints_informant)}</div>
        </div>
        ` : ''}
        ${adl.past_history_medical ? `
        <div class="info-item full-width">
          <div class="info-label">Past History - Medical</div>
          <div class="info-value">${formatValue(adl.past_history_medical)}</div>
        </div>
        ` : ''}
        ${adl.past_history_psychiatric_diagnosis ? `
        <div class="info-item full-width">
          <div class="info-label">Past History - Psychiatric Diagnosis</div>
          <div class="info-value">${formatValue(adl.past_history_psychiatric_diagnosis)}</div>
        </div>
        ` : ''}
        ${adl.past_history_psychiatric_treatment ? `
        <div class="info-item full-width">
          <div class="info-label">Past History - Psychiatric Treatment</div>
          <div class="info-value">${formatValue(adl.past_history_psychiatric_treatment)}</div>
        </div>
        ` : ''}
        ${adl.family_history_father_age ? `
        <div class="info-item">
          <div class="info-label">Family History - Father Age</div>
          <div class="info-value">${formatValue(adl.family_history_father_age)}</div>
        </div>
        ` : ''}
        ${adl.family_history_father_education ? `
        <div class="info-item">
          <div class="info-label">Family History - Father Education</div>
          <div class="info-value">${formatValue(adl.family_history_father_education)}</div>
        </div>
        ` : ''}
        ${adl.family_history_father_occupation ? `
        <div class="info-item">
          <div class="info-label">Family History - Father Occupation</div>
          <div class="info-value">${formatValue(adl.family_history_father_occupation)}</div>
        </div>
        ` : ''}
        ${adl.family_history_mother_age ? `
        <div class="info-item">
          <div class="info-label">Family History - Mother Age</div>
          <div class="info-value">${formatValue(adl.family_history_mother_age)}</div>
        </div>
        ` : ''}
        ${adl.family_history_mother_education ? `
        <div class="info-item">
          <div class="info-label">Family History - Mother Education</div>
          <div class="info-value">${formatValue(adl.family_history_mother_education)}</div>
        </div>
        ` : ''}
        ${adl.family_history_mother_occupation ? `
        <div class="info-item">
          <div class="info-label">Family History - Mother Occupation</div>
          <div class="info-value">${formatValue(adl.family_history_mother_occupation)}</div>
        </div>
        ` : ''}
        ${adl.provisional_diagnosis ? `
        <div class="info-item full-width">
          <div class="info-label">Provisional Diagnosis</div>
          <div class="info-value">${formatValue(adl.provisional_diagnosis)}</div>
        </div>
        ` : ''}
        ${adl.treatment_plan ? `
        <div class="info-item full-width">
          <div class="info-label">Treatment Plan</div>
          <div class="info-value">${formatValue(adl.treatment_plan)}</div>
        </div>
        ` : ''}
        ${adl.consultant_comments ? `
        <div class="info-item full-width">
          <div class="info-label">Consultant Comments</div>
          <div class="info-value">${formatValue(adl.consultant_comments)}</div>
        </div>
        ` : ''}
        ${adl.created_at ? `
        <div class="info-item">
          <div class="info-label">Created At</div>
          <div class="info-value">${formatDateTime(adl.created_at)}</div>
        </div>
        ` : ''}
      </div>
    </div>
    `).join('')}
  </div>
  ` : ''}

  ${prescriptions && prescriptions.length > 0 ? `
  <div class="section">
    <div class="section-title">Prescription History (${prescriptions.length} prescription${prescriptions.length > 1 ? 's' : ''})</div>
    ${prescriptions.map((prescription, index) => {
      const visitDate = prescription.visit_date ? formatDate(prescription.visit_date) : 'Unknown Date';
      return `
      <div style="margin-bottom: ${index < prescriptions.length - 1 ? '15px' : '0'}; padding: 18px; border: 2px solid #f59e0b; border-radius: 8px; background: linear-gradient(to bottom, #fffbeb, #ffffff); box-shadow: 0 2px 4px rgba(245, 158, 11, 0.1);">
        <h3 style="margin: 0 0 18px 0; font-size: 13pt; font-weight: bold; color: #d97706; border-bottom: 2px solid #f59e0b; padding-bottom: 10px; background: linear-gradient(to right, #fef3c7, #fffbeb); padding: 10px; margin: -18px -18px 18px -18px; border-radius: 6px 6px 0 0;">
          Prescription ${index + 1} - Visit Date: ${visitDate}${prescription.visit_type ? ` (${formatValue(prescription.visit_type)})` : ''}
        </h3>
        <div class="info-grid">
          ${prescription.medication_name ? `
          <div class="info-item">
            <div class="info-label">Medication Name</div>
            <div class="info-value">${formatValue(prescription.medication_name)}</div>
          </div>
          ` : ''}
          ${prescription.dosage ? `
          <div class="info-item">
            <div class="info-label">Dosage</div>
            <div class="info-value">${formatValue(prescription.dosage)}</div>
          </div>
          ` : ''}
          ${prescription.frequency ? `
          <div class="info-item">
            <div class="info-label">Frequency</div>
            <div class="info-value">${formatValue(prescription.frequency)}</div>
          </div>
          ` : ''}
          ${prescription.duration ? `
          <div class="info-item">
            <div class="info-label">Duration</div>
            <div class="info-value">${formatValue(prescription.duration)}</div>
          </div>
          ` : ''}
          ${prescription.instructions ? `
          <div class="info-item full-width">
            <div class="info-label">Instructions</div>
            <div class="info-value">${formatValue(prescription.instructions)}</div>
          </div>
          ` : ''}
          ${prescription.created_at ? `
          <div class="info-item">
            <div class="info-label">Prescribed On</div>
            <div class="info-value">${formatDateTime(prescription.created_at)}</div>
          </div>
          ` : ''}
        </div>
      </div>
      `;
    }).join('')}
  </div>
  ` : ''}

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
  };

  const columns = [
    {
      header: (
        <div className="flex items-center gap-2">
          <FiFileText className="w-4 h-4 text-primary-600" />
          <span className="font-semibold">CR No</span>
        </div>
      ),
      accessor: 'cr_no',
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-lg flex items-center justify-center">
            <FiFileText className="w-4 h-4 text-blue-600" />
          </div>
          <span className="font-medium text-gray-900">{row.cr_no || 'N/A'}</span>
        </div>
      ),
    },
    {
      header: (
        <div className="flex items-center gap-2">
          <FiUsers className="w-4 h-4 text-primary-600" />
          <span className="font-semibold">Patient Info</span>
        </div>
      ),
      render: (row) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-r from-green-100 to-emerald-100 rounded-full flex items-center justify-center">
              <FiHeart className="w-3 h-3 text-green-600" />
            </div>
            <span className="font-semibold text-gray-900">{row.name}</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <FiClock className="w-3 h-3" />
              {row.age} years
            </span>
            <span className="px-2 py-1 bg-gray-100 rounded-full text-xs font-medium">
              {row.sex}
            </span>
          </div>
        </div>
      ),
    },
    // {
    //   header: (
    //     <div className="flex items-center gap-2">
    //       <FiShield className="w-4 h-4 text-primary-600" />
    //       <span className="font-semibold">Doctor</span>
    //     </div>
    //   ),
    //   render: (row) => (
    //     row.assigned_doctor_name ? (
    //       <div className="flex items-center gap-2">
    //         <div className="w-8 h-8 bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg flex items-center justify-center">
    //           <FiUsers className="w-4 h-4 text-purple-600" />
    //         </div>
    //         <div>
    //           <Badge className="bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 border-purple-200">
    //             {row.assigned_doctor_name}
    //           </Badge>
    //           <p className="text-xs text-gray-500 mt-1">{row.assigned_doctor_role}</p>
    //         </div>
    //       </div>
    //     ) : (
    //       <div className="flex items-center gap-2">
    //         <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
    //           <FiUsers className="w-4 h-4 text-gray-400" />
    //         </div>
    //         <span className="text-gray-400 text-sm">Unassigned</span>
    //       </div>
    //     )
    //   ),
    // },
    {
      header: (
        <div className="flex items-center gap-2">
          <FiFileText className="w-4 h-4 text-primary-600" />
          <span className="font-semibold">PSY No</span>
        </div>
      ),
      accessor: 'psy_no',
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-r from-orange-100 to-yellow-100 rounded-lg flex items-center justify-center">
            <FiFileText className="w-4 h-4 text-orange-600" />
          </div>
          <span className="font-medium text-gray-900">{row.psy_no || 'N/A'}</span>
        </div>
      ),
    },
    {
      header: (
        <div className="flex items-center gap-2">
          <FiTrendingUp className="w-4 h-4 text-primary-600" />
          <span className="font-semibold">Status</span>
        </div>
      ),
      render: (row) => {
        // If patient has ADL file, status should be "complex"
        const isComplex = row.has_adl_file || row.case_complexity === 'complex';
        const statusText = isComplex ? 'complex' : 'simple';
        
        return (
        <div className="space-y-2">
          <Badge 
              variant={ row.has_adl_file ? ' success ' : 'warning'}
            className={`${
              !row.has_adl_file 
                ? 'bg-gradient-to-r from-orange-100 to-yellow-100 text-orange-800 border-orange-200 gap-1`' 
                : 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border-green-200'
            }`}
          >
              {/* {statusText}  */}
              Out Patient Intake Record
          </Badge>
          <div className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${
              row.has_adl_file ? 'bg-green-500' : 'bg-gray-300'
            }`}></div>
            <span className="text-xs text-gray-600">
               {row.has_adl_file ? 'Yes' : 'No'}
            </span>
          </div>
        </div>
        );
      },
    },
    {
      header: (
        <div className="flex items-center gap-2">
          {/* <FiMoreVertical className="w-4 h-4 text-primary-600" /> */}
          <span className="font-semibold ml-12">Actions</span>
        </div>
      ),
      render: (row) => {
        const patientId = row.id
        // getPatientId(row);
        return (
        <div className="flex gap-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => handleView(row)}
              className="h-9 w-9 p-0 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border border-blue-200 hover:border-blue-300 shadow-sm hover:shadow-md transition-all duration-200 rounded-lg"
              title={`View Details for Patient ID: ${patientId || 'N/A'}`}
            >
              <FiEye className="w-4 h-4 text-blue-600" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => handleEdit(row)}
              className="h-9 w-9 p-0 bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 border border-green-200 hover:border-green-300 shadow-sm hover:shadow-md transition-all duration-200 rounded-lg"
              title="Edit Patient"
            >
              <FiEdit className="w-4 h-4 text-green-600" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => handlePrint(patientId)}
              className="h-9 w-9 p-0 bg-gradient-to-r from-purple-50 to-indigo-50 hover:from-purple-100 hover:to-indigo-100 border border-purple-200 hover:border-purple-300 shadow-sm hover:shadow-md transition-all duration-200 rounded-lg"
              title="Print Patient Details"
            >
              <FiPrinter className="w-4 h-4 text-purple-600" />
             
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => handleExport(patientId)}
              className="h-9 w-9 p-0 bg-gradient-to-r from-purple-50 to-indigo-50 hover:from-purple-100 hover:to-indigo-100 border border-purple-200 hover:border-purple-300 shadow-sm hover:shadow-md transition-all duration-200 rounded-lg"
              title="Export All Patients"
            >
              <BsFileEarmarkExcelFill className="w-4 h-4 text-green-600" />
            </Button>
            {/* Show Delete button only for Admin, not for MWO */}
            {(isAdmin(user?.role) && !isMWO(user?.role)) && patientId && (
              <Button 
                variant="ghost" 
                size="sm"
                className="h-9 w-9 p-0 bg-gradient-to-r from-red-50 to-rose-50 hover:from-red-100 hover:to-rose-100 border border-red-200 hover:border-red-300 shadow-sm hover:shadow-md transition-all duration-200 rounded-lg"
                title="Delete Patient"
                onClick={() => handleDelete(patientId)}
              >
                <FiTrash2 className="w-4 h-4 text-red-600" />
              </Button>
            )}
        </div>
        );
      },
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="space-y-6 p-4 sm:p-6 lg:p-8">
        {/* Header Section */}
        {/* Main Content Card */}
        <Card className="shadow-lg border border-gray-200/50 bg-white/90 backdrop-blur-sm">
          {error && (
            <div className="mb-6 bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="p-2.5 bg-red-100 rounded-lg flex-shrink-0">
                  <FiShield className="w-5 h-5 text-red-600" />
                </div>
                <div className="flex-1">
                  <p className="text-red-800 font-semibold text-base mb-1">Error Loading Patients</p>
                  <p className="text-red-600 text-sm">{error?.data?.message || 'Failed to load patients. Please try again.'}</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Enhanced Search and Filter Section */}
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <FiSearch className="w-5 h-5 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                </div>
                <Input
                  placeholder="Search by CR No, Patient Name, PSY No, Doctor Name, or Doctor Role..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-12 pr-12 h-12 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all duration-200 shadow-sm hover:shadow-md"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                    title="Clear search"
                  >
                    <FiX className="w-5 h-5" />
                  </button>
                )}
              </div>
              {!isMWO(user?.role) && (
                <div className="flex flex-col sm:flex-row gap-3 lg:flex-col xl:flex-row">
                  <Link to="/patients/new">
                    <Button className="bg-gradient-to-r h-12 px-5 from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 shadow-lg hover:shadow-xl transition-all duration-200 whitespace-nowrap">
                      <FiPlus className="mr-2" />
                 
                      Add Patient
                    </Button>
                  </Link>
                </div>
              )}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="h-12 px-5 bg-white border-2 border-primary-200 hover:bg-primary-50 hover:border-primary-300 shadow-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleExportAll}
                  disabled={filteredPatients.length === 0 && (!data?.data?.patients || data.data.patients.length === 0)}
                >
                  <FiDownload className="mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </div>

          {(isLoading || isFetching) ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="relative">
                <div className="w-20 h-20 border-4 border-primary-100 border-t-primary-600 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <FiUsers className="w-8 h-8 text-primary-600" />
                </div>
              </div>
              <p className="mt-6 text-gray-600 font-medium text-lg">Loading patients...</p>
              <p className="mt-2 text-gray-500 text-sm">Please wait while we fetch the data</p>
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-6">
                <FiUsers className="w-12 h-12 text-gray-400" />
              </div>
              <p className="text-xl font-semibold text-gray-700 mb-2">No patients found</p>
              <p className="text-gray-500 text-center max-w-md">
                {search 
                  ? `No patients match your search "${search}". Try searching by CR No, Patient Name, PSY No, Doctor Name, or Doctor Role.`
                  : data?.data?.patients?.length === 0
                    ? 'There are no patients in the system yet. Add your first patient to get started.'
                    : 'No patients match the current filters. Try adjusting your search criteria.'}
              </p>
              {search && (
                <Button
                  onClick={() => setSearch('')}
                  variant="outline"
                  className="mt-4"
                >
                  <FiX className="mr-2" />
                  Clear Search
                </Button>
              )}
              {user?.role !== 'MWO' && !search && data?.data?.patients?.length === 0 && (
                <Link to="/patients/new" className="mt-6">
                  <Button className="bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 shadow-lg">
                    <FiPlus className="mr-2" />
                    Add First Patient
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <>
              {/* Search Results Info */}
              {search && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <span className="font-semibold">{totalFiltered}</span> patient(s) found matching "<span className="font-semibold">{search}</span>"
                    {totalPages > 1 && (
                      <span className="ml-2 text-blue-600">(Page {page} of {totalPages})</span>
                    )}
                  </p>
                </div>
              )}
              
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <Table
                  columns={columns}
                  data={filteredPatients}
                  loading={isLoading}
                />
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm mt-4">
                  <Pagination
                    currentPage={page}
                    totalPages={totalPages}
                    totalItems={totalFiltered}
                    itemsPerPage={limit}
                    onPageChange={setPage}
                  />
                </div>
              )}
            </>
          )}
        </Card>

      </div>
    </div>
  );
};

export default PatientsPage;

