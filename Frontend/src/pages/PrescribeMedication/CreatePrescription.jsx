import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { createPortal } from 'react-dom';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../../features/auth/authSlice';
import { useGetPatientByIdQuery } from '../../features/patients/patientsApiSlice';
import { useGetClinicalProformaByPatientIdQuery } from '../../features/clinical/clinicalApiSlice';
import { useCreatePrescriptionMutation, useGetPrescriptionByIdQuery } from '../../features/prescriptions/prescriptionApiSlice';
import { useGetAllMedicinesQuery } from '../../features/medicines/medicineApiSlice';
import { useGetAllPrescriptionTemplatesQuery, useCreatePrescriptionTemplateMutation } from '../../features/prescriptionTemplates/prescriptionTemplateApiSlice';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Select from '../../components/Select';
import Modal from '../../components/Modal';
import { FiPackage, FiUser, FiSave, FiX, FiPlus, FiTrash2, FiHome, FiUserCheck, FiCalendar, FiFileText, FiClock, FiPrinter, FiSearch, FiDroplet, FiActivity, FiBookmark, FiDownload } from 'react-icons/fi';
import PGI_Logo from '../../assets/PGI_Logo.png';
import { 
  PRESCRIPTION_FORM,
  PRESCRIPTION_OPTIONS,
  DOSAGE_OPTIONS,
  WHEN_OPTIONS,
  FREQUENCY_OPTIONS,
  DURATION_OPTIONS,
  QUANTITY_OPTIONS
} from '../../utils/constants';

const CreatePrescription = ({ 
  patientId: propPatientId, 
  clinicalProformaId: propClinicalProformaId, 
  returnTab: propReturnTab,
  currentUser: propCurrentUser,
  prescriptions: propPrescriptions,
  setPrescriptions: propSetPrescriptions,
  // Other optional props for embedded mode
  addPrescriptionRow: propAddPrescriptionRow,
  updatePrescriptionCell: propUpdatePrescriptionCell,
  selectMedicine: propSelectMedicine,
  handleMedicineKeyDown: propHandleMedicineKeyDown,
  removePrescriptionRow: propRemovePrescriptionRow,
  clearAllPrescriptions: propClearAllPrescriptions,
  handleSave: propHandleSave,
  handlePrint: propHandlePrint,
  formatDateFull: propFormatDateFull,
  formatDate: propFormatDate,
} = {}) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Use props if provided (embedded mode), otherwise use URL params (standalone mode)
  const patientId = propPatientId || searchParams.get('patient_id');
  const clinicalProformaId = propClinicalProformaId || searchParams.get('clinical_proforma_id');
  const returnTab = propReturnTab || searchParams.get('returnTab');
  const currentUser = propCurrentUser || useSelector(selectCurrentUser);
  const printRef = useRef(null);
  
  // Track if component is in embedded mode
  const isEmbedded = !!propPatientId;

  const { data: patientData, isLoading: loadingPatient } = useGetPatientByIdQuery(
    patientId,
    { skip: !patientId }
  );

  const { data: clinicalHistoryData } = useGetClinicalProformaByPatientIdQuery(
    patientId,
    { skip: !patientId }
  );

  const [createPrescription, { isLoading: isSavingPrescriptions }] = useCreatePrescriptionMutation();
  
  // Template functionality
  const { data: templatesData, isLoading: isLoadingTemplates } = useGetAllPrescriptionTemplatesQuery({ is_active: true });
  const [createPrescriptionTemplate, { isLoading: isSavingTemplate }] = useCreatePrescriptionTemplateMutation();
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [showLoadTemplateModal, setShowLoadTemplateModal] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [rowIndexToSave, setRowIndexToSave] = useState(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [showDetailsNotesModal, setShowDetailsNotesModal] = useState(false);
  const [detailsNotesRowIndex, setDetailsNotesRowIndex] = useState(null);
  const [detailsNotesField, setDetailsNotesField] = useState(null); // 'details' or 'notes'
  const [detailsNotesValue, setDetailsNotesValue] = useState('');

  // Fetch existing prescriptions when clinicalProformaId is provided
  const { 
    data: existingPrescriptionsData, 
    isLoading: isLoadingPrescriptions,
    refetch: refetchPrescriptions
  } = useGetPrescriptionByIdQuery(
    { clinical_proforma_id: clinicalProformaId },
    {
      skip: !clinicalProformaId,
      refetchOnMountOrArgChange: true
    }
  );

  const prescriptionData = existingPrescriptionsData?.data?.prescription;
  const existingPrescriptions = prescriptionData?.prescription || [];

  const patient = patientData?.data?.patient;
  const clinicalHistory = clinicalHistoryData?.data?.proformas || [];

  // Get the most recent clinical proforma for past history
  const latestProforma = clinicalHistory.length > 0 ? clinicalHistory[0] : null;
  

  // Get today's proforma or latest proforma for linking prescriptions
  const getProformaForPrescription = () => {
    if (clinicalProformaId) {
      // If clinical_proforma_id is provided in URL, use it
      const proforma = clinicalHistory.find(p => p.id === parseInt(clinicalProformaId));
      if (proforma) return proforma;
    }
    
    if (!clinicalHistory.length) return null;
    
    const today = new Date().toISOString().split('T')[0];
    // Try to find today's proforma first
    const todayProforma = clinicalHistory.find(p => {
      const visitDate = p.visit_date || p.created_at;
      return visitDate && new Date(visitDate).toISOString().split('T')[0] === today;
    });
    
    // Return today's proforma or the latest one
    return todayProforma || latestProforma;
  };
  
  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  // Prescription table rows - use props if provided (embedded mode), otherwise use local state
  const [localPrescriptions, setLocalPrescriptions] = useState([
    { medicine: '', dosage: '', when: '', frequency: '', duration: '', qty: '', details: '', notes: '' }
  ]);
  
  // Use prop state if provided, otherwise use local state
  const prescriptions = propPrescriptions || localPrescriptions;
  const setPrescriptions = propSetPrescriptions || setLocalPrescriptions;

  // Track if we've populated prescriptions to prevent overwriting
  const [hasPopulatedPrescriptions, setHasPopulatedPrescriptions] = useState(false);
  const [lastPopulatedProformaId, setLastPopulatedProformaId] = useState(null);

  // Reset population flag when clinicalProformaId changes
  useEffect(() => {
    if (clinicalProformaId !== lastPopulatedProformaId) {
      
      setHasPopulatedPrescriptions(false);
      setLastPopulatedProformaId(clinicalProformaId);
    }
  }, [clinicalProformaId, lastPopulatedProformaId]);

  // Populate prescriptions when existing data is fetched
  useEffect(() => {
    if (existingPrescriptions && Array.isArray(existingPrescriptions) && existingPrescriptions.length > 0 && !hasPopulatedPrescriptions) {
     
      // Map prescription data to match the form structure
      const mappedPrescriptions = existingPrescriptions.map(p => ({
        medicine: p.medicine || '',
        dosage: p.dosage || '',
        when: p.when_to_take || p.when || '',
        frequency: p.frequency || '',
        duration: p.duration || '',
        qty: p.quantity || p.qty || '',
        details: p.details || '',
        notes: p.notes || ''
      }));
      setPrescriptions(mappedPrescriptions);
      setHasPopulatedPrescriptions(true);
      if (clinicalProformaId) {
        setLastPopulatedProformaId(clinicalProformaId);
      }
      
    } else if (existingPrescriptions && existingPrescriptions.length === 0 && clinicalProformaId && !hasPopulatedPrescriptions) {
      // If prescriptions query returned empty array, keep default empty prescription
     
      setHasPopulatedPrescriptions(true);
    }
  }, [existingPrescriptions, clinicalProformaId, hasPopulatedPrescriptions, setPrescriptions]);

  // Fetch medicines from API
  const { data: medicinesApiData, isLoading: isLoadingMedicines, error: medicinesError } = useGetAllMedicinesQuery({
    limit: 1000,
    is_active: true
  });

  // Flatten medicines data for autocomplete from API
  const allMedicines = useMemo(() => {
    if (!medicinesApiData) return [];
    
    // API returns: { success: true, data: { medicines: [...], pagination: {...} } }
    const medicines = medicinesApiData?.data?.medicines || medicinesApiData?.data || [];
    
    if (!Array.isArray(medicines) || medicines.length === 0) {
      return [];
    }
    
    return medicines.map(med => ({
      name: med.name,
      displayName: med.name,
      category: med.category,
      id: med.id
    })).sort((a, b) => a.name.localeCompare(b.name));
  }, [medicinesApiData]);
  
  // Debug: Log medicines data
  useEffect(() => {
    if (medicinesApiData) {
      console.log('[CreatePrescription] Medicines data received:', {
        hasData: !!medicinesApiData,
        medicines: allMedicines.length
      });
    }
    if (medicinesError) {
      console.error('[CreatePrescription] Medicines API error:', medicinesError);
    }
  }, [medicinesApiData, medicinesError, allMedicines.length]);

  // Medicine autocomplete state for each row
  const [medicineSuggestions, setMedicineSuggestions] = useState({});
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState({});
  const [showSuggestions, setShowSuggestions] = useState({});
  const [dropdownPositions, setDropdownPositions] = useState({});
  const inputRefs = useRef({});
  
  // Update dropdown positions on scroll/resize when dropdowns are open
  useEffect(() => {
    const updatePositions = () => {
      const openDropdowns = Object.keys(showSuggestions).filter(idx => showSuggestions[idx]);
      if (openDropdowns.length === 0) return;
      
      openDropdowns.forEach(idx => {
        const input = inputRefs.current[`medicine-${idx}`];
        if (input) {
          const rect = input.getBoundingClientRect();
          setDropdownPositions(prev => ({
            ...prev,
            [idx]: {
              top: rect.bottom + 4,
              left: rect.left,
              width: rect.width
            }
          }));
        }
      });
    };
    
    window.addEventListener('scroll', updatePositions, true);
    window.addEventListener('resize', updatePositions);
    return () => {
      window.removeEventListener('scroll', updatePositions, true);
      window.removeEventListener('resize', updatePositions);
    };
  }, [showSuggestions]);

  const addPrescriptionRow = () => {
    setPrescriptions((prev) => ([...prev, { medicine: '', dosage: '', when: '', frequency: '', duration: '', qty: '', details: '', notes: '' }]));
  };

  const updatePrescriptionCell = (rowIdx, field, value) => {
    setPrescriptions((prev) => prev.map((r, i) => i === rowIdx ? { ...r, [field]: value } : r));
    
    // Handle medicine autocomplete
    if (field === 'medicine') {
      const searchTerm = value.toLowerCase().trim();
      
      if (searchTerm.length > 0 && allMedicines.length > 0) {
        // Filter medicines based on name or category
        const filtered = allMedicines.filter(med =>
          med.name.toLowerCase().includes(searchTerm) ||
          (med.category && med.category.toLowerCase().includes(searchTerm))
        ).slice(0, 20); // Show up to 20 suggestions
        
        setMedicineSuggestions(prev => ({ ...prev, [rowIdx]: filtered }));
        setShowSuggestions(prev => ({ ...prev, [rowIdx]: filtered.length > 0 }));
        setActiveSuggestionIndex(prev => ({ ...prev, [rowIdx]: -1 }));
        
        // Calculate position for portal dropdown
        setTimeout(() => {
          const input = inputRefs.current[`medicine-${rowIdx}`];
          if (input) {
            const rect = input.getBoundingClientRect();
            setDropdownPositions(prev => ({
              ...prev,
              [rowIdx]: {
                top: rect.bottom + 4,
                left: rect.left,
                width: rect.width
              }
            }));
          }
        }, 0);
      } else {
        setShowSuggestions(prev => ({ ...prev, [rowIdx]: false }));
        setMedicineSuggestions(prev => ({ ...prev, [rowIdx]: [] }));
      }
    }
  };

  const selectMedicine = (rowIdx, medicine) => {
    setPrescriptions((prev) => prev.map((r, i) => 
      i === rowIdx ? { ...r, medicine: medicine.name } : r
    ));
    setShowSuggestions(prev => ({ ...prev, [rowIdx]: false }));
    setMedicineSuggestions(prev => ({ ...prev, [rowIdx]: [] }));
  };

  const handleMedicineKeyDown = (e, rowIdx) => {
    const suggestions = medicineSuggestions[rowIdx] || [];
    const currentIndex = activeSuggestionIndex[rowIdx] || -1;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = currentIndex < suggestions.length - 1 ? currentIndex + 1 : currentIndex;
      setActiveSuggestionIndex(prev => ({ ...prev, [rowIdx]: nextIndex }));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = currentIndex > 0 ? currentIndex - 1 : -1;
      setActiveSuggestionIndex(prev => ({ ...prev, [rowIdx]: prevIndex }));
    } else if (e.key === 'Enter' && currentIndex >= 0 && suggestions[currentIndex]) {
      e.preventDefault();
      selectMedicine(rowIdx, suggestions[currentIndex]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(prev => ({ ...prev, [rowIdx]: false }));
    }
  };

  const removePrescriptionRow = (rowIdx) => {
    setPrescriptions((prev) => prev.filter((_, i) => i !== rowIdx));
  };

  const clearAllPrescriptions = () => {
    setPrescriptions([{ medicine: '', dosage: '', when: '', frequency: '', duration: '', qty: '', details: '', notes: '' }]);
  };

  const handleSave = async () => {
    // Filter out empty prescriptions
    const validPrescriptions = prescriptions.filter(p => p.medicine || p.dosage || p.frequency || p.details);
    
    if (validPrescriptions.length === 0) {
      toast.error('Please add at least one medication');
      return;
    }

    // Get the clinical proforma to link prescriptions to
    const proformaForPrescription = getProformaForPrescription();
    
    if (!proformaForPrescription || !proformaForPrescription.id) {
      toast.error('No clinical proforma found. Please create a clinical proforma first before saving prescriptions.');
      return;
    }

    try {
      // Prepare prescriptions data for API (ensure medicine is not empty)
      const prescriptionsToSave = validPrescriptions
        .filter(p => p.medicine && p.medicine.trim()) // Ensure medicine is not empty
        .map(p => ({
          medicine: p.medicine.trim(),
          dosage: p.dosage?.trim() || null,
          when: p.when?.trim() || null,
          frequency: p.frequency?.trim() || null,
          duration: p.duration?.trim() || null,
          qty: p.qty?.trim() || null,
          details: p.details?.trim() || null,
          notes: p.notes?.trim() || null,
        }));
      
      if (prescriptionsToSave.length === 0) {
        toast.error('Please add at least one medication with a valid medicine name');
        return;
      }

      // Save to backend using createPrescription (handles multiple medicines)
      // Convert patient_id to integer if needed
      const patientIdInt = patientId 
        ? (typeof patientId === 'string' ? parseInt(patientId) : patientId)
        : (proformaForPrescription.patient_id 
            ? (typeof proformaForPrescription.patient_id === 'string' 
                ? parseInt(proformaForPrescription.patient_id) 
                : proformaForPrescription.patient_id)
            : null);
      
      if (!patientIdInt || isNaN(patientIdInt)) {
        toast.error('Valid patient ID is required');
        return;
      }
      
      const result = await createPrescription({
        patient_id: patientIdInt,
        clinical_proforma_id: proformaForPrescription.id,
        prescription: prescriptionsToSave, // Use 'prescription' for new format
      }).unwrap();

      toast.success(`Prescription created successfully! ${result?.data?.prescription?.prescription?.length || validPrescriptions.length} medication(s) recorded.`);
      
      // Navigate back or to patient details
      if (returnTab) {
        navigate(`/clinical-today-patients${returnTab === 'existing' ? '?tab=existing' : ''}`);
      } else if (patientId) {
        navigate(`/patients/${patientId}?tab=prescriptions`);
      } else {
        navigate(-1);
      }
    } catch (error) {
      console.error('Error saving prescriptions:', error);
      toast.error(error?.data?.message || 'Failed to save prescriptions. Please try again.');
    }
  };

  const handlePrint = () => {
    // Filter out empty prescriptions
    const validPrescriptions = prescriptions.filter(p => p.medicine || p.dosage || p.frequency || p.details);
    
    if (validPrescriptions.length === 0) {
      toast.error('Please add at least one medication before printing');
      return;
    }

    // Trigger print
    window.print();
  };

  // Save current prescriptions as template
  const handleSaveAsTemplate = async () => {
    // Filter out empty prescriptions
    const validPrescriptions = prescriptions.filter(p => p.medicine && p.medicine.trim());
    
    if (validPrescriptions.length === 0) {
      toast.error('Please add at least one medication with a valid medicine name');
      return;
    }

    if (!templateName.trim()) {
      toast.error('Please enter a template name');
      return;
    }

    try {
      const templateData = {
        name: templateName.trim(),
        description: templateDescription.trim() || null,
        prescription: validPrescriptions.map(p => ({
          medicine: p.medicine.trim(),
          dosage: p.dosage?.trim() || null,
          when: p.when?.trim() || null,
          frequency: p.frequency?.trim() || null,
          duration: p.duration?.trim() || null,
          qty: p.qty?.trim() || null,
          details: p.details?.trim() || null,
          notes: p.notes?.trim() || null,
        }))
      };

      await createPrescriptionTemplate(templateData).unwrap();
      toast.success('Template saved successfully!');
      setShowSaveTemplateModal(false);
      setTemplateName('');
      setTemplateDescription('');
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error(error?.data?.message || 'Failed to save template. Please try again.');
    }
  };

  // Save single prescription row as template
  const handleSaveRowAsTemplate = async (rowIdx) => {
    const row = prescriptions[rowIdx];
    
    if (!row.medicine || !row.medicine.trim()) {
      toast.error('Please enter a medicine name before saving as template');
      return;
    }

    // Set the template name to the medicine name as default
    setTemplateName(row.medicine.trim());
    setTemplateDescription(`Template for ${row.medicine.trim()}`);
    
    // Store the row index to save after user confirms
    setRowIndexToSave(rowIdx);
    setShowSaveTemplateModal(true);
  };

  // Save single row template after modal confirmation
  const handleSaveSingleRowTemplate = async () => {
    if (rowIndexToSave === null) return;
    
    const row = prescriptions[rowIndexToSave];
    
    if (!templateName.trim()) {
      toast.error('Please enter a template name');
      return;
    }

    try {
      const templateData = {
        name: templateName.trim(),
        description: templateDescription.trim() || null,
        prescription: [{
          medicine: row.medicine.trim(),
          dosage: row.dosage?.trim() || null,
          when: row.when?.trim() || null,
          frequency: row.frequency?.trim() || null,
          duration: row.duration?.trim() || null,
          qty: row.qty?.trim() || null,
          details: row.details?.trim() || null,
          notes: row.notes?.trim() || null,
        }]
      };

      await createPrescriptionTemplate(templateData).unwrap();
      toast.success('Template saved successfully!');
      setShowSaveTemplateModal(false);
      setTemplateName('');
      setTemplateDescription('');
      setRowIndexToSave(null);
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error(error?.data?.message || 'Failed to save template. Please try again.');
    }
  };

  // Save all prescriptions as template
  const handleSaveAllAsTemplate = async () => {
    const validPrescriptions = prescriptions.filter(p => p.medicine && p.medicine.trim());
    
    if (validPrescriptions.length === 0) {
      toast.error('Please add at least one medication with a valid medicine name');
      return;
    }

    // Set default template name
    setTemplateName(`Prescription Template - ${new Date().toLocaleDateString()}`);
    setTemplateDescription(`Template containing ${validPrescriptions.length} medication(s)`);
    
    // Clear row index to indicate saving all
    setRowIndexToSave(null);
    setShowSaveTemplateModal(true);
  };

  // Load template into prescriptions (appends to existing)
  const handleLoadTemplate = (template) => {
    if (!template.prescription || !Array.isArray(template.prescription) || template.prescription.length === 0) {
      toast.error('Template has no valid prescriptions');
      return;
    }

    // Map template prescription to form format
    const loadedPrescriptions = template.prescription.map(p => ({
      medicine: p.medicine || '',
      dosage: p.dosage || '',
      when: p.when_to_take || p.when || '',
      frequency: p.frequency || '',
      duration: p.duration || '',
      qty: p.quantity || p.qty || '',
      details: p.details || '',
      notes: p.notes || ''
    }));

    // Append to existing prescriptions instead of replacing
    setPrescriptions(prev => [...prev, ...loadedPrescriptions]);
    toast.success(`Template "${template.name}" loaded successfully! ${loadedPrescriptions.length} medication(s) added.`);
    // Keep modal open so user can load more templates
  };




  // Format date for display (full format for print)
  const formatDateFull = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  if (loadingPatient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading patient data...</p>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-teal-50 flex items-center justify-center">
        <Card className="p-8 max-w-md text-center">
          <FiUser className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Patient Not Found</h2>
          <p className="text-gray-600 mb-6">The patient you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/patients')} variant="primary">
            Back to Patients
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <>
      {/* Custom scrollbar styles for dropdown */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #10b981;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #059669;
        }
      `}</style>

      {/* Print-specific styles */}
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 12mm 15mm;
          }
          * {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          html, body {
            height: auto !important;
            overflow: visible !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          body {
            padding: 0 !important;
            margin: 0 !important;
          }
          body * {
            visibility: hidden;
          }
          .print-content, .print-content * {
            visibility: visible !important;
          }
          .print-content {
            position: relative !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
            opacity: 1 !important;
            visibility: visible !important;
            page-break-after: avoid !important;
            overflow: visible !important;
            height: auto !important;
            min-height: auto !important;
          }
          .no-print,
          .no-print * {
            display: none !important;
            visibility: hidden !important;
          }
          .print-header {
            margin-bottom: 12px !important;
            padding-bottom: 8px !important;
            border-bottom: 3px solid #1f2937;
            page-break-after: avoid;
            page-break-inside: avoid;
          }
          .print-header h1 {
            margin: 0 !important;
            padding: 0 !important;
            line-height: 1.2 !important;
          }
          .print-header h2 {
            margin: 8px 0 0 0 !important;
            padding: 0 !important;
          }
          .print-table {
            border-collapse: collapse;
            width: 100%;
            font-size: 9px !important;
            margin: 6px 0 !important;
            page-break-inside: auto;
          }
          .print-table thead {
            display: table-header-group;
          }
          .print-table tbody {
            display: table-row-group;
          }
          .print-table th,
          .print-table td {
            border: 1px solid #374151;
            padding: 3px 4px !important;
            text-align: left;
            vertical-align: top;
            word-wrap: break-word;
            line-height: 1.2 !important;
          }
          .print-table th {
            background-color: #f3f4f6 !important;
            font-weight: bold;
            font-size: 9px !important;
          }
          .print-table td {
            font-size: 9px !important;
          }
          .print-table tr {
            page-break-inside: avoid;
          }
          .print-footer {
            margin-top: 15px !important;
            padding-top: 8px !important;
            border-top: 2px solid #1f2937;
            page-break-inside: avoid;
            page-break-after: avoid;
          }
          .print-footer .mb-16 {
            margin-bottom: 35px !important;
          }
          .print-patient-info {
            font-size: 10px !important;
            margin-bottom: 10px !important;
            page-break-after: avoid;
            page-break-inside: avoid;
          }
          .print-patient-info > div {
            margin: 0 !important;
            padding: 0 !important;
          }
          .print-section-title {
            font-weight: bold;
            font-size: 11px !important;
            margin: 8px 0 4px 0 !important;
            padding: 0 !important;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            page-break-after: avoid;
          }
          .print-content > div {
            page-break-inside: avoid;
            margin: 0 !important;
            padding: 0 !important;
          }
          .print-content img {
            max-height: 65px !important;
            width: auto !important;
            margin: 0 !important;
          }
          .my-4 {
            margin-top: 8px !important;
            margin-bottom: 8px !important;
          }
          .gap-12 {
            gap: 40px !important;
          }
          .gap-4 {
            gap: 12px !important;
          }
          .gap-x-8 {
            column-gap: 20px !important;
          }
          .gap-y-2 {
            row-gap: 4px !important;
          }
          .mb-3 {
            margin-bottom: 8px !important;
          }
          .mt-4 {
            margin-top: 8px !important;
          }
          .pt-3 {
            padding-top: 8px !important;
          }
          .mt-6 {
            margin-top: 12px !important;
          }
        }
      `}</style>

        <div className="w-full px-6 py-8 space-y-8">
       
          {/* Print Content - Hidden on screen, visible when printing */}
          <div className="print-content" ref={printRef} style={{ position: 'absolute', left: '-9999px', opacity: 0, pointerEvents: 'none' }}>
            {/* Print Header with PGI Logo */}
            <div className="print-header">
              <div className="flex items-center justify-center gap-4 mb-3">
                <img src={PGI_Logo} alt="PGIMER Logo" className="h-24 w-24 object-contain" />
                <div className="text-center">
                  <h1 className="text-xl font-bold text-gray-900 leading-tight">
                    POSTGRADUATE INSTITUTE OF<br />MEDICAL EDUCATION & RESEARCH
                  </h1>
                  <p className="text-base font-semibold text-gray-700 mt-1">Department of Psychiatry</p>
                  <p className="text-sm text-gray-600">Chandigarh, India</p>
                </div>
              </div>
              <h2 className="text-lg font-bold text-gray-900 uppercase tracking-wide text-center">PRESCRIPTION</h2>
            </div>

            {/* Print Patient Information */}
            {patient && (
              // <div className="print-patient-info">
              //   <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs">
              //     <div>
              //       <span className="font-bold">Patient Name:</span> <span className="ml-2">{patient.name}</span>
              //     </div>
              //     <div>
              //       <span className="font-bold">CR Number:</span> <span className="ml-2 font-mono">{patient.cr_no}</span>
              //     </div>
              //     <div>
              //       <span className="font-bold">Age/Sex:</span> <span className="ml-2">{patient.age} years, {patient.sex}</span>
              //     </div>
              //     {patient.psy_no && (
              //       <div>
              //         <span className="font-bold">PSY Number:</span> <span className="ml-2 font-mono">{patient.psy_no}</span>
              //       </div>
              //     )}
              //     {patient.assigned_doctor_name && (
              //       <div>
              //         <span className="font-bold">Prescribing Doctor:</span> <span className="ml-2">{patient.assigned_doctor_name} {patient.assigned_doctor_role ? `(${patient.assigned_doctor_role})` : ''}</span>
              //       </div>
              //     )}
              //     <div>
              //       <span className="font-bold">Room Number:</span> <span className="ml-2">{patient.assigned_room || 'N/A'}</span>
              //     </div>
              //     <div>
              //       <span className="font-bold">Date:</span> <span className="ml-2">{formatDateFull(new Date().toISOString())}</span>
              //     </div>
              //   </div>

              //   {/* Past History in Print */}
              //   {latestProforma && (
              //     <div className="mt-4 pt-3 border-t border-gray-400">
              //       <h3 className="print-section-title">Past Clinical History (Most Recent):</h3>
              //       <div className="text-xs space-y-1 ml-2">
              //         {latestProforma.diagnosis && (
              //           <p><span className="font-semibold">Diagnosis:</span> <span className="ml-1">{latestProforma.diagnosis}</span></p>
              //         )}
              //         {latestProforma.icd_code && (
              //           <p><span className="font-semibold">ICD Code:</span> <span className="ml-1 font-mono">{latestProforma.icd_code}</span></p>
              //         )}
              //         {latestProforma.case_severity && (
              //           <p><span className="font-semibold">Case Severity:</span> <span className="ml-1 capitalize">{latestProforma.case_severity}</span></p>
              //         )}
              //         {latestProforma.visit_date && (
              //           <p><span className="font-semibold">Last Visit:</span> <span className="ml-1">{formatDateFull(latestProforma.visit_date)}</span></p>
              //         )}
              //       </div>
              //     </div>
              //   )}
              // </div>
              <></>
            )}

            {/* Print Prescription Table */}
            <div className="my-4">
              <h3 className="print-section-title">Medications Prescribed:</h3>
              <table className="print-table">
                <thead>
                  <tr>
                    <th style={{ width: '5%' }}>#</th>
                    <th style={{ width: '22%' }}>Medicine Name</th>
                    <th style={{ width: '12%' }}>Dosage</th>
                    <th style={{ width: '10%' }}>When</th>
                    <th style={{ width: '12%' }}>Frequency</th>
                    <th style={{ width: '10%' }}>Duration</th>
                    <th style={{ width: '8%' }}>Qty</th>
                    <th style={{ width: '11%' }}>Details</th>
                    <th style={{ width: '10%' }}>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {prescriptions
                    .filter(p => p.medicine || p.dosage || p.frequency || p.details)
                    .map((row, idx) => (
                      <tr key={idx}>
                        <td className="text-center">{idx + 1}</td>
                        <td className="font-medium">{row.medicine || '-'}</td>
                        <td>{row.dosage || '-'}</td>
                        <td>{row.when || '-'}</td>
                        <td>{row.frequency || '-'}</td>
                        <td>{row.duration || '-'}</td>
                        <td className="text-center">{row.qty || '-'}</td>
                        <td>{row.details || '-'}</td>
                        <td>{row.notes || '-'}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {/* Print Footer with Signatures */}
            <div className="print-footer">
              <div className="grid grid-cols-2 gap-12 mt-6">
                <div>
                  <div className="mb-16"></div>
                  <div className="border-t-2 border-gray-700 text-center pt-2">
                    <p className="font-bold text-xs">{patient?.assigned_doctor_name || currentUser?.name || 'Doctor Name'}</p>
                    <p className="text-xs text-gray-600 mt-1">{patient?.assigned_doctor_role || currentUser?.role || 'Designation'}</p>
                    <p className="text-xs text-gray-600 mt-1">Department of Psychiatry</p>
                    <p className="text-xs text-gray-600">PGIMER, Chandigarh</p>
                  </div>
                </div>
                <div>
                  <div className="mb-16"></div>
                  <div className="border-t-2 border-gray-700 text-center pt-2">
                    <p className="font-bold text-xs">Authorized Signature</p>
                    <p className="text-xs text-gray-600 mt-1">with Hospital Stamp</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Patient Info Card */}
          {patient && (
            <Card className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border-2 border-blue-200 shadow-lg">
              <div className="flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-100 rounded-full">
                    <FiUser className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{patient.name}</h3>
                    <p className="text-sm text-gray-600">CR: {patient.cr_no} {patient.psy_no && `| PSY: ${patient.psy_no}`}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <FiCalendar className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-700"><strong>Age:</strong> {patient.age} years, {patient.sex}</span>
                  </div>
                  {patient.assigned_room && (
                    <div className="flex items-center gap-2">
                      <FiHome className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-700"><strong>Room:</strong> {patient.assigned_room}</span>
                    </div>
                  )}
                  {patient.assigned_doctor_name && (
                    <div className="flex items-center gap-2">
                      <FiUserCheck className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-700"><strong>Doctor:</strong> {patient.assigned_doctor_name}</span>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* Prescription Table Card */}
          <Card className="bg-white border-2 border-green-200 shadow-xl overflow-hidden" style={{ position: 'relative' }}>
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                    <FiDroplet className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Prescription Form</h2>
                    <p className="text-sm text-green-100">Add medications for the patient</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className="min-w-[200px] [&_button]:!text-white [&_button]:!bg-white/20 [&_button]:!hover:bg-white/30 [&_button]:!border-white/30 [&_button]:!backdrop-blur-sm [&_button]:!placeholder:text-white/70 [&_button>span]:!text-white">
                      <Select
                        name="load-template"
                        value={selectedTemplateId}
                        onChange={(e) => {
                          const templateId = e.target.value;
                          if (templateId) {
                            const selectedTemplate = templatesData?.data?.templates?.find(t => t.id === parseInt(templateId));
                            if (selectedTemplate) {
                              handleLoadTemplate(selectedTemplate);
                              // Reset the select value after loading
                              setSelectedTemplateId('');
                            }
                          }
                        }}
                        options={templatesData?.data?.templates?.map(template => ({
                          value: String(template.id),
                          label: `${template.name}${template.description ? ` - ${template.description}` : ''} (${Array.isArray(template.prescription) ? template.prescription.length : 0} meds)`
                        })) || []}
                        placeholder="Load Template"
                        searchable={true}
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    onClick={handleSaveAllAsTemplate}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm border-white/30 text-white hover:text-white"
                  >
                    <FiBookmark className="w-4 h-4" />
                    Save All Template
                  </Button>
                  <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm font-medium">
                    {prescriptions.filter(p => p.medicine || p.dosage || p.frequency || p.details).length} medication(s)
                  </span>
                </div>
              </div>
            </div>

            <div className="overflow-y-auto" style={{ maxHeight: '600px' }}>
              <div className="space-y-4 p-4">
                {prescriptions.map((row, idx) => (
                  <div key={idx} className="bg-white border-2 border-green-200 rounded-lg p-4 hover:shadow-lg transition-all duration-200">
                    {/* Header with number and remove button */}
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 text-green-700 font-semibold text-base">
                          {idx + 1}
                        </div>
                        <h3 className="text-base font-semibold text-gray-800">Medication #{idx + 1}</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          type="button" 
                          onClick={() => handleSaveRowAsTemplate(idx)} 
                          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors duration-200 border border-purple-200 hover:border-purple-300"
                        >
                          <FiBookmark className="w-4 h-4" />
                          Save as Template
                        </button>
                        <button 
                          type="button" 
                          onClick={() => removePrescriptionRow(idx)} 
                          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors duration-200 border border-red-200 hover:border-red-300"
                        >
                          <FiTrash2 className="w-4 h-4" />
                          Remove
                        </button>
                      </div>
                    </div>

                    {/* Grid Layout: 2 rows, 4 columns */}
                    {/* Row 1: Medicine | Dosage | Frequency | When */}
                    <div className="grid grid-cols-4 gap-4 mb-4">
                      {/* Medicine Field */}
                      <div className="relative">
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                          <FiDroplet className="w-3 h-3 inline mr-1" />
                          Medicine
                        </label>
                        <div className="relative">
                          <FiDroplet className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10" />
                          <input
                            ref={(el) => { inputRefs.current[`medicine-${idx}`] = el; }}
                            value={row.medicine || ''}
                            onChange={(e) => updatePrescriptionCell(idx, 'medicine', e.target.value)}
                            onKeyDown={(e) => handleMedicineKeyDown(e, idx)}
                            onFocus={() => {
                              if (allMedicines.length > 0) {
                                if (row.medicine && row.medicine.trim().length > 0) {
                                  const searchTerm = row.medicine.toLowerCase().trim();
                                  const filtered = allMedicines.filter(med =>
                                    med.name.toLowerCase().includes(searchTerm) ||
                                    (med.category && med.category.toLowerCase().includes(searchTerm))
                                  ).slice(0, 20);
                                  setMedicineSuggestions(prev => ({ ...prev, [idx]: filtered }));
                                  setShowSuggestions(prev => ({ ...prev, [idx]: filtered.length > 0 }));
                                } else {
                                  const topMedicines = allMedicines.slice(0, 20);
                                  setMedicineSuggestions(prev => ({ ...prev, [idx]: topMedicines }));
                                  setShowSuggestions(prev => ({ ...prev, [idx]: true }));
                                }
                                setTimeout(() => {
                                  const input = inputRefs.current[`medicine-${idx}`];
                                  if (input) {
                                    const rect = input.getBoundingClientRect();
                                    setDropdownPositions(prev => ({
                                      ...prev,
                                      [idx]: {
                                        top: rect.bottom + 4,
                                        left: rect.left,
                                        width: rect.width
                                      }
                                    }));
                                  }
                                }, 0);
                              }
                            }}
                            onBlur={() => {
                              setTimeout(() => {
                                setShowSuggestions(prev => ({ ...prev, [idx]: false }));
                              }, 200);
                            }}
                            className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-white hover:border-green-300 text-sm"
                            placeholder="Type to search..."
                            autoComplete="off"
                          />
                        </div>
                        {/* Dropdown using portal */}
                        {showSuggestions[idx] && medicineSuggestions[idx] && Array.isArray(medicineSuggestions[idx]) && medicineSuggestions[idx].length > 0 && dropdownPositions[idx] && createPortal(
                          <div
                            style={{
                              position: 'fixed',
                              top: `${dropdownPositions[idx].top}px`,
                              left: `${dropdownPositions[idx].left}px`,
                              width: `${dropdownPositions[idx].width}px`,
                              zIndex: 999999,
                            }}
                          >
                            <div
                              className="bg-white border-2 border-green-200 rounded-lg shadow-2xl overflow-hidden"
                              style={{
                                maxHeight: '280px',
                                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                              }}
                            >
                              <div className="overflow-y-auto max-h-[280px] custom-scrollbar">
                                {medicineSuggestions[idx].map((med, medIdx) => (
                                  <div
                                    key={`${med.name}-${medIdx}`}
                                    onClick={() => selectMedicine(idx, med)}
                                    onMouseDown={(e) => e.preventDefault()}
                                    onMouseEnter={() => setActiveSuggestionIndex(prev => ({ ...prev, [idx]: medIdx }))}
                                    className={`px-4 py-3 cursor-pointer transition-all duration-150 border-b border-gray-100 last:border-b-0 ${
                                      activeSuggestionIndex[idx] === medIdx 
                                        ? 'bg-gradient-to-r from-green-100 to-emerald-50 border-l-4 border-l-green-500' 
                                        : 'hover:bg-green-50/50'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="font-semibold text-gray-900 text-sm">{med.name}</div>
                                      {med.category && (
                                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800 capitalize">
                                          {med.category.replace('_', ' ')}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>,
                          document.body
                        )}
                      </div>

                      {/* Dosage Field */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                          <FiActivity className="w-3 h-3 inline mr-1" />
                          Dosage
                        </label>
                        <Select
                          name={`dosage-${idx}`}
                          value={row.dosage || ''}
                          onChange={(e) => updatePrescriptionCell(idx, 'dosage', e.target.value)}
                          options={PRESCRIPTION_OPTIONS.DOSAGE || []}
                          placeholder="Select dosage"
                          searchable={true}
                          className="bg-white border-2 border-gray-200 text-sm"
                        />
                      </div>

                      {/* Frequency Field */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                          <FiClock className="w-3 h-3 inline mr-1" />
                          Frequency
                        </label>
                        <Select
                          name={`frequency-${idx}`}
                          value={row.frequency || ''}
                          onChange={(e) => updatePrescriptionCell(idx, 'frequency', e.target.value)}
                          options={PRESCRIPTION_OPTIONS.FREQUENCY || []}
                          placeholder="Select frequency"
                          searchable={true}
                          className="bg-white border-2 border-gray-200 text-sm"
                        />
                      </div>

                      {/* When Field */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                          <FiClock className="w-3 h-3 inline mr-1" />
                          When
                        </label>
                        <Select
                          name={`when-${idx}`}
                          value={row.when || ''}
                          onChange={(e) => updatePrescriptionCell(idx, 'when', e.target.value)}
                          options={PRESCRIPTION_OPTIONS.WHEN || []}
                          placeholder="Select when"
                          searchable={true}
                          className="bg-white border-2 border-gray-200 text-sm"
                        />
                      </div>
                    </div>

                    {/* Row 2: Duration | Qty | Details | Notes */}
                    <div className="grid grid-cols-4 gap-4">
                      {/* Duration Field */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                          <FiCalendar className="w-3 h-3 inline mr-1" />
                          Duration
                        </label>
                        <Select
                          name={`duration-${idx}`}
                          value={row.duration || ''}
                          onChange={(e) => updatePrescriptionCell(idx, 'duration', e.target.value)}
                          options={PRESCRIPTION_OPTIONS.DURATION || []}
                          placeholder="Select duration"
                          searchable={true}
                          className="bg-white border-2 border-gray-200 text-sm"
                        />
                      </div>

                      {/* Qty Field */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                          <FiPackage className="w-3 h-3 inline mr-1" />
                          Quantity
                        </label>
                        <Select
                          name={`qty-${idx}`}
                          value={row.qty || ''}
                          onChange={(e) => updatePrescriptionCell(idx, 'qty', e.target.value)}
                          options={PRESCRIPTION_OPTIONS.QUANTITY || []}
                          placeholder="Select quantity"
                          searchable={true}
                          className="bg-white border-2 border-gray-200 text-sm"
                        />
                      </div>

                      {/* Details Field */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                          <FiFileText className="w-3 h-3 inline mr-1" />
                          Details
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setDetailsNotesRowIndex(idx);
                            setDetailsNotesField('details');
                            setDetailsNotesValue(row.details || '');
                            setShowDetailsNotesModal(true);
                          }}
                          className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-white hover:border-green-300 text-sm text-left min-h-[38px] flex items-center justify-between"
                        >
                          <span className={row.details ? 'text-gray-900' : 'text-gray-400'}>
                            {row.details || 'Click to add details'}
                          </span>
                          <FiFileText className="w-4 h-4 text-gray-400" />
                        </button>
                      </div>

                      {/* Notes Field */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                          <FiFileText className="w-3 h-3 inline mr-1" />
                          Notes
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setDetailsNotesRowIndex(idx);
                            setDetailsNotesField('notes');
                            setDetailsNotesValue(row.notes || '');
                            setShowDetailsNotesModal(true);
                          }}
                          className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-white hover:border-green-300 text-sm text-left min-h-[38px] flex items-center justify-between"
                        >
                          <span className={row.notes ? 'text-gray-900' : 'text-gray-400'}>
                            {row.notes || 'Click to add notes'}
                          </span>
                          <FiFileText className="w-4 h-4 text-gray-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Datalist suggestions for prescription fields - Using constants */}
            <datalist id="dosageOptions">
              {DOSAGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value} />
              ))}
            </datalist>
            <datalist id="whenOptions">
              {WHEN_OPTIONS.map((option) => (
                <option key={option.value} value={option.value} />
              ))}
            </datalist>
            <datalist id="frequencyOptions">
              {FREQUENCY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value} />
              ))}
            </datalist>
            <datalist id="durationOptions">
              {DURATION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value} />
              ))}
            </datalist>
            <datalist id="quantityOptions">
              {QUANTITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value} />
              ))}
            </datalist>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-4 pb-2 px-6 bg-gradient-to-r from-gray-50 to-slate-50 border-t-2 border-gray-200">
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  onClick={addPrescriptionRow}
                  variant="outline"
                  className="flex items-center gap-2 bg-white hover:bg-green-50 border-2 border-green-300 hover:border-green-500 text-green-700 hover:text-green-800 font-medium shadow-sm transition-all duration-200"
                >
                  <FiPlus className="w-5 h-5" />
                  Add Medicine
                </Button>
                <Button
                  type="button"
                  onClick={clearAllPrescriptions}
                  variant="outline"
                  className="flex items-center gap-2 bg-white hover:bg-red-50 border-2 border-red-300 hover:border-red-500 text-red-700 hover:text-red-800 font-medium shadow-sm transition-all duration-200"
                >
                  <FiTrash2 className="w-4 h-4" />
                  Remove All Medicine
                </Button>
              </div>
              <div className="flex items-center gap-3">
              </div>
            </div>
          </Card>

        {/* Action Buttons */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl no-print">
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (returnTab) {
                  navigate(`/clinical-today-patients${returnTab === 'existing' ? '?tab=existing' : ''}`);
                } else if (patientId) {
                  navigate(`/patients/${patientId}?tab=prescriptions`);
                } else {
                  navigate(-1);
                }
              }}
            >
              <FiX className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handlePrint}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white border-0"
            >
              <FiPrinter className="w-4 h-4 mr-2" />
              Print
            </Button>
            <Button 
              type="button" 
              onClick={handleSave}
              disabled={isSavingPrescriptions}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FiSave className="w-4 h-4 mr-2" />
              {isSavingPrescriptions ? 'Saving...' : 'Save Prescription'}
            </Button>
          </div>
        </Card>
      </div>

      {/* Save Template Modal */}
      <Modal
        isOpen={showSaveTemplateModal}
        onClose={() => {
          setShowSaveTemplateModal(false);
          setTemplateName('');
          setTemplateDescription('');
        }}
        title="Save as Template"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Template Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              placeholder="e.g., Common Antidepressants"
              maxLength={255}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description (Optional)
            </label>
            <textarea
              value={templateDescription}
              onChange={(e) => setTemplateDescription(e.target.value)}
              className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              placeholder="Brief description of this template..."
              rows={3}
              maxLength={1000}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowSaveTemplateModal(false);
                setTemplateName('');
                setTemplateDescription('');
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={rowIndexToSave !== null ? handleSaveSingleRowTemplate : handleSaveAsTemplate}
              disabled={isSavingTemplate || !templateName.trim()}
              className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 disabled:opacity-50"
            >
              {isSavingTemplate ? 'Saving...' : 'Save Template'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Load Template Modal */}
      <Modal
        isOpen={showLoadTemplateModal}
        onClose={() => setShowLoadTemplateModal(false)}
        title="Load Template"
      >
        <p className="text-sm text-gray-600 mb-4">
          Click on a template to add its medications to your current prescription. You can load multiple templates.
        </p>
        <div className="space-y-4">
          {isLoadingTemplates ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-500">Loading templates...</p>
            </div>
          ) : templatesData?.data?.templates?.length > 0 ? (
            <div className="max-h-96 overflow-y-auto space-y-2">
              {templatesData.data.templates.map((template) => (
                <div
                  key={template.id}
                  onClick={() => handleLoadTemplate(template)}
                  className="p-4 border-2 border-gray-200 rounded-lg hover:border-purple-400 hover:bg-purple-50 cursor-pointer transition-all duration-200"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{template.name}</h3>
                      {template.description && (
                        <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-2">
                        {Array.isArray(template.prescription) ? template.prescription.length : 0} medication(s)
                        {template.creator_name && ` • Created by ${template.creator_name}`}
                      </p>
                    </div>
                    <FiDownload className="w-5 h-5 text-purple-600 flex-shrink-0 ml-3" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FiBookmark className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">No templates available</p>
              <p className="text-sm text-gray-400 mt-1">Save a prescription as a template to get started</p>
            </div>
          )}
          <div className="flex justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowLoadTemplateModal(false)}
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* Details/Notes Modal */}
      <Modal
        isOpen={showDetailsNotesModal}
        onClose={() => {
          setShowDetailsNotesModal(false);
          setDetailsNotesRowIndex(null);
          setDetailsNotesField(null);
          setDetailsNotesValue('');
        }}
        title={detailsNotesField === 'details' ? 'Add Details' : 'Add Notes'}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {detailsNotesField === 'details' ? 'Details' : 'Notes'}
            </label>
            <textarea
              value={detailsNotesValue}
              onChange={(e) => setDetailsNotesValue(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 resize-none"
              placeholder={detailsNotesField === 'details' ? 'Enter additional details...' : 'Enter notes...'}
              rows={6}
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowDetailsNotesModal(false);
                setDetailsNotesRowIndex(null);
                setDetailsNotesField(null);
                setDetailsNotesValue('');
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (detailsNotesRowIndex !== null && detailsNotesField) {
                  updatePrescriptionCell(detailsNotesRowIndex, detailsNotesField, detailsNotesValue);
                  setShowDetailsNotesModal(false);
                  setDetailsNotesRowIndex(null);
                  setDetailsNotesField(null);
                  setDetailsNotesValue('');
                }
              }}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
            >
              Save
            </Button>
          </div>
        </div>
      </Modal>
 
    </>
  );
};

export default CreatePrescription;

