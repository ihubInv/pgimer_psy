
import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from 'react-toastify';
import { createPortal } from 'react-dom';
import { useGetPrescriptionByIdQuery, useCreatePrescriptionMutation, useUpdatePrescriptionMutation } from "../../features/prescriptions/prescriptionApiSlice";
import { useGetAllMedicinesQuery } from "../../features/medicines/medicineApiSlice";
import { useGetAllPrescriptionTemplatesQuery, useCreatePrescriptionTemplateMutation } from '../../features/prescriptionTemplates/prescriptionTemplateApiSlice';
import { FiSave, FiEdit, FiPlus, FiTrash2, FiPackage, FiDroplet, FiActivity, FiClock, FiCalendar, FiFileText, FiBookmark, FiDownload } from 'react-icons/fi';
import Select from '../../components/Select';
import Button from '../../components/Button';
import Card from '../../components/Card';
import Modal from '../../components/Modal';
import { PRESCRIPTION_OPTIONS, PRESCRIPTION_FORM } from '../../utils/constants';





const PrescriptionEdit = ({ proforma, index, patientId }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode'); // 'create' or 'update' from URL
  
  const { data: prescriptionsData, isLoading: loadingPrescriptions } = useGetPrescriptionByIdQuery(
    { clinical_proforma_id: proforma.id },
    { skip: !proforma.id }
  );
  const [createPrescription, { isLoading: isSaving }] = useCreatePrescriptionMutation();
  
  const [updatePrescription, { isLoading: isUpdating }] = useUpdatePrescriptionMutation();
  const prescriptionData = prescriptionsData?.data?.prescription;
  
  // Fetch medicines from API
  const { data: medicinesData, isLoading: isLoadingMedicines, error: medicinesError } = useGetAllMedicinesQuery({
    limit: 1000,
    is_active: true
  });

  // Template functionality
  const { data: templatesData, isLoading: isLoadingTemplates } = useGetAllPrescriptionTemplatesQuery({ is_active: true });
  const [createPrescriptionTemplate, { isLoading: isSavingTemplate }] = useCreatePrescriptionTemplateMutation();
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [showLoadTemplateModal, setShowLoadTemplateModal] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  
  // Debug: Log medicines data
  useEffect(() => {
    if (medicinesData) {
      console.log('[PrescriptionEdit] Medicines data received:', {
        hasData: !!medicinesData,
        dataStructure: medicinesData,
        medicines: medicinesData?.data?.medicines?.length || 0
      });
    }
    if (medicinesError) {
      console.error('[PrescriptionEdit] Medicines API error:', medicinesError);
    }
  }, [medicinesData, medicinesError]);
  
  // Memoize existingPrescriptions to prevent infinite loops
  const existingPrescriptions = useMemo(() => {
    return prescriptionData?.prescription || [];
  }, [prescriptionData?.prescription]);
  
  // Determine if this is create or update mode
  // Update mode: existingPrescriptions exist OR mode === 'update'
  // Create mode: no existingPrescriptions OR mode === 'create'
  const isUpdateMode = mode === 'update' || (mode !== 'create' && existingPrescriptions.length > 0);

  // Flatten medicines data for autocomplete from API
  const allMedicines = useMemo(() => {
    if (!medicinesData) {
      return [];
    }
    
    // API returns: { success: true, data: { medicines: [...], pagination: {...} } }
    const medicines = medicinesData?.data?.medicines || medicinesData?.data || [];
    
    if (!Array.isArray(medicines) || medicines.length === 0) {
      return [];
    }
    
    return medicines.map(med => ({
            name: med.name,
            displayName: med.name,
      category: med.category,
      id: med.id
    })).sort((a, b) => a.name.localeCompare(b.name));
  }, [medicinesData]);

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

  // Initialize with empty row, will be populated when prescriptions load
  const [prescriptionRows, setPrescriptionRows] = useState([
    { medicine: '', dosage: '', when: '', frequency: '', duration: '', qty: '', details: '', notes: '' }
  ]);

  // Update rows when prescriptions data loads
  useEffect(() => {
    // Only update if we're not currently loading
    if (loadingPrescriptions) {
      return;
    }

    if (existingPrescriptions.length > 0) {
      const newRows = existingPrescriptions.map(p => ({
        id: p.id || null,
        medicine: p.medicine || '',
        dosage: p.dosage || '',
        when: p.when_to_take || p.when || '',
        frequency: p.frequency || '',
        duration: p.duration || '',
        qty: p.quantity || p.qty || '',
        details: p.details || '',
        notes: p.notes || '',
      }));
      
      // Only update if the data has actually changed
      setPrescriptionRows(prev => {
        const prevString = JSON.stringify(prev.map(r => ({ ...r, id: r.id || null })));
        const newString = JSON.stringify(newRows);
        if (prevString !== newString) {
          return newRows;
        }
        return prev;
      });
    } else {
      // Ensure at least one empty row is shown when no prescriptions exist
      setPrescriptionRows(prev => {
        // Only set if we don't already have at least one empty row
        if (prev.length === 0 || (prev.length === 1 && prev[0].medicine === '' && !prev[0].id)) {
          return [{ medicine: '', dosage: '', when: '', frequency: '', duration: '', qty: '', details: '', notes: '' }];
        }
        return prev;
      });
    }
  }, [existingPrescriptions, loadingPrescriptions]);

  const addPrescriptionRow = () => {
    setPrescriptionRows(prev => [...prev, { medicine: '', dosage: '', when: '', frequency: '', duration: '', qty: '', details: '', notes: '' }]);
  };


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
      

   

  const removePrescriptionRow = async (rowIdx) => {
    const rowToRemove = prescriptionRows[rowIdx];
    
    // Calculate remaining valid prescriptions after removal
    const remainingPrescriptions = prescriptionRows
      .filter((_, i) => i !== rowIdx)
      .filter(row => row.medicine && row.medicine.trim() !== '');

    // If the row has an ID, it's an existing medicine - delete via API
    if (rowToRemove?.id && isUpdateMode && prescriptionData?.id) {
      // Check if deletion would leave at least one valid medicine
      if (remainingPrescriptions.length === 0) {
        toast.error('Cannot delete. At least one medicine is required.');
        return;
      }

      try {
        // Filter out the medicine with this ID from the prescription array
        const updatedPrescriptions = remainingPrescriptions.map((p) => ({
          id: p.id || null,
          medicine: p.medicine?.trim() || null,
          dosage: p.dosage?.trim() || null,
          when_to_take: p.when?.trim() || null,
          frequency: p.frequency?.trim() || null,
          duration: p.duration?.trim() || null,
          quantity: p.qty?.trim() || null,
          details: p.details?.trim() || null,
          notes: p.notes?.trim() || null,
        }));

        // Update prescription via API
        await updatePrescription({
          id: prescriptionData.id,
          clinical_proforma_id: Number(proforma.id),
          prescription: updatedPrescriptions
        }).unwrap();

        toast.success('Medicine deleted successfully');
      } catch (error) {
        console.error('Error deleting medicine:', error);
        toast.error(error?.data?.message || error?.data?.error || 'Failed to delete medicine. Please try again.');
        return; // Don't update local state if API call failed
      }
    } else {
      // For new rows (no ID) or create mode, just validate locally
      if (remainingPrescriptions.length === 0 && prescriptionRows.length === 1) {
        toast.error('At least one medicine row is required.');
        return;
      }
    }

    // Update local state - remove the row
    setPrescriptionRows(prev => prev.filter((_, i) => i !== rowIdx));
    
    // Clean up autocomplete state for removed row
    setMedicineSuggestions(prev => {
      const newState = { ...prev };
      delete newState[rowIdx];
      // Reindex remaining suggestions
      const reindexed = {};
      Object.keys(newState).forEach(key => {
        const keyNum = parseInt(key);
        if (keyNum > rowIdx) {
          reindexed[keyNum - 1] = newState[key];
        } else if (keyNum < rowIdx) {
          reindexed[key] = newState[key];
        }
      });
      return reindexed;
    });
    setShowSuggestions(prev => {
      const newState = { ...prev };
      delete newState[rowIdx];
      // Reindex remaining suggestions
      const reindexed = {};
      Object.keys(newState).forEach(key => {
        const keyNum = parseInt(key);
        if (keyNum > rowIdx) {
          reindexed[keyNum - 1] = newState[key];
        } else if (keyNum < rowIdx) {
          reindexed[key] = newState[key];
        }
      });
      return reindexed;
    });
  };

  const updatePrescriptionCell = (rowIdx, field, value) => {
    setPrescriptionRows(prev => {
      const newRows = [...prev];
      newRows[rowIdx] = { ...newRows[rowIdx], [field]: value };
      return newRows;
    });

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
    setPrescriptionRows(prev => prev.map((r, i) =>
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

 

  const handleSavePrescriptions = async () => {
    if (!proforma?.id) {
      toast.error("Clinical proforma ID is required");
      return;
    }
  
    // --- Validate rows ---
    const validPrescriptions = prescriptionRows.filter(
      (p) => p.medicine && p.medicine.trim() !== ""
    );
  
    if (validPrescriptions.length === 0) {
      toast.error("Please add at least one medication with a valid medicine name");
      return;
    }
  
    try {
      // Generate IDs for new items (items without IDs) - backend will also generate, but this ensures consistency
      const prescriptionArray = validPrescriptions.map((p, index) => ({
        id: p.id || (index + 1), // Generate ID if not present (1, 2, 3, etc.)
        medicine: p.medicine.trim(),
        dosage: p.dosage?.trim() || null,
        when_to_take: p.when?.trim() || null,
        frequency: p.frequency?.trim() || null,
        duration: p.duration?.trim() || null,
        quantity: p.qty?.trim() || null,
        details: p.details?.trim() || null,
        notes: p.notes?.trim() || null,
      }));
  
      let savedPrescription;
      if (isUpdateMode && prescriptionData?.id) {
        // Update existing prescription
        const result = await updatePrescription({
          id: prescriptionData.id,
          clinical_proforma_id: Number(proforma.id),
          prescription: prescriptionArray
        }).unwrap();
        savedPrescription = result?.data?.prescription;
      }
      
      else {
        // Create new prescription
        const patientIdInt = patientId 
          ? (typeof patientId === 'string' ? parseInt(patientId) : patientId)
          : null;
        
        if (!patientIdInt || isNaN(patientIdInt)) {
          toast.error('Valid patient ID is required');
          return;
        }
        
        const result = await createPrescription({
          clinical_proforma_id: Number(proforma.id),
          patient_id: patientIdInt,
          prescription: prescriptionArray // Use 'prescription' for new format
        }).unwrap();
        savedPrescription = result?.data?.prescription;
      }
  
      toast.success(
        `Prescription saved successfully! ${prescriptionArray.length} medication(s) recorded.`
      );
  
      // Update state with saved prescription data (which includes generated IDs from backend)
      if (savedPrescription?.prescription && Array.isArray(savedPrescription.prescription)) {
        setPrescriptionRows(
          savedPrescription.prescription.map(p => ({
            id: p.id || null,
            medicine: p.medicine || '',
            dosage: p.dosage || '',
            when: p.when_to_take || p.when || '',
            frequency: p.frequency || '',
            duration: p.duration || '',
            qty: p.quantity || p.qty || '',
            details: p.details || '',
            notes: p.notes || '',
          }))
        );
      } else {
        // Fallback: Keep current rows but update IDs if they were generated
        setPrescriptionRows(prev => 
          prev.map((row, index) => ({
            ...row,
            id: row.id || (index + 1) // Ensure IDs are set
          }))
        );
      }
    } catch (error) {
      console.error("Error saving prescriptions:", error);
  
      const msg =
        error?.data?.error ||
        error?.data?.message ||
        "Failed to save prescriptions. Please try again.";
  
      toast.error(msg);
    }
  };

  // Save current prescriptions as template
  const handleSaveAsTemplate = async () => {
    // Filter out empty prescriptions
    const validPrescriptions = prescriptionRows.filter(p => p.medicine && p.medicine.trim());
    
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

  // Load template into prescriptions (appends to existing)
  const handleLoadTemplate = (template) => {
    if (!template.prescription || !Array.isArray(template.prescription) || template.prescription.length === 0) {
      toast.error('Template has no valid prescriptions');
      return;
    }

    // Map template prescription to form format
    const loadedPrescriptions = template.prescription.map(p => ({
      id: null, // New prescriptions don't have IDs
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
    setPrescriptionRows(prev => [...prev, ...loadedPrescriptions]);
    toast.success(`Template "${template.name}" loaded successfully! ${loadedPrescriptions.length} medication(s) added.`);
    // Keep modal open so user can load more templates
  };

  
  
  return (
    <>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #6366f1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #4f46e5;
        }
      `}</style>
      <div className="border border-gray-200 rounded-lg p-6 bg-gradient-to-r from-amber-50 to-yellow-50">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
        <div>
          <h4 className="text-lg font-semibold text-gray-900">Visit #{index + 1}</h4>
          <p className="text-sm text-gray-500 mt-1">
            {proforma.visit_date ? formatDate(proforma.visit_date) : 'N/A'}
            {proforma.visit_type && ` • ${proforma.visit_type.replace('_', ' ')}`}
          </p>
        </div>
        {existingPrescriptions.length > 0 && (
          <Button
            onClick={() => navigate(`/prescriptions/view?clinical_proforma_id=${proforma.id}&patient_id=${patientId}`)}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <FiEdit className="w-4 h-4" />
            View All
          </Button>
        )}
      </div>

      {loadingPrescriptions ? (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-600 mx-auto"></div>
          <p className="text-sm text-gray-500 mt-2">Loading prescriptions...</p>
        </div>
      ) : (
        <Card className="bg-white border-2 border-amber-200 shadow-xl overflow-hidden" style={{ position: 'relative' }}>
          <div className="bg-gradient-to-r from-amber-600 to-yellow-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <FiPackage className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Prescription Form</h2>
                  <p className="text-sm text-amber-100">Edit medications for the patient</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm font-medium">
                  {prescriptionRows.filter(p => p.medicine || p.dosage || p.frequency || p.details).length} medication(s)
                </span>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto" style={{ overflowY: 'visible', maxHeight: '600px' }}>
            <table className="min-w-full text-sm" style={{ position: 'relative' }}>
              <thead className="bg-gradient-to-r from-gray-50 to-slate-50 border-b-2 border-gray-200 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left w-12 font-semibold text-gray-700 bg-gradient-to-r from-gray-50 to-slate-50">
                    <div className="flex items-center gap-1">
                      <span>#</span>
                    </div>
                  </th>
                  {PRESCRIPTION_FORM.map((field) => {
                    const icons = {
                      medicine: <FiDroplet className="w-4 h-4" />,
                      dosage: <FiActivity className="w-4 h-4" />,
                      frequency: <FiClock className="w-4 h-4" />,
                      duration: <FiCalendar className="w-4 h-4" />,
                      qty: <FiPackage className="w-4 h-4" />,
                      details: <FiFileText className="w-4 h-4" />,
                      notes: <FiFileText className="w-4 h-4" />
                    };
                    return (
                      <th key={field.value} className="px-4 py-3 text-left font-semibold text-gray-700 bg-gradient-to-r from-gray-50 to-slate-50">
                        <div className="flex items-center gap-2">
                          {icons[field.value] || <FiFileText className="w-4 h-4" />}
                          <span>{field.label}</span>
                        </div>
                      </th>
                    );
                  })}
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 bg-gradient-to-r from-gray-50 to-slate-50">
                    <div className="flex items-center gap-2">
                      <FiClock className="w-4 h-4" />
                      <span>When</span>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-center w-24 font-semibold text-gray-700 bg-gradient-to-r from-gray-50 to-slate-50">Action</th>
                </tr>
              </thead>
              <tbody>
                {prescriptionRows.map((row, idx) => (
                  <tr key={row.id || idx} className="border-t border-gray-100 hover:bg-gradient-to-r hover:from-amber-50/50 hover:to-yellow-50/50 transition-colors duration-150">
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-amber-100 to-yellow-100 text-amber-700 font-semibold text-sm">
                        {idx + 1}
                      </div>
                    </td>
                    {/* Medicine Field - Special handling with autocomplete */}
                    <td className="px-4 py-3">
                      <div className="relative w-full">
                        <div className="relative">
                          <FiDroplet className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10" />
                          <input
                            ref={(el) => { inputRefs.current[`medicine-${idx}`] = el; }}
                            type="text"
                            value={row.medicine || ''}
                            onChange={(e) => {
                              const newValue = e.target.value;
                              updatePrescriptionCell(idx, 'medicine', newValue);
                            }}
                            onKeyDown={(e) => handleMedicineKeyDown(e, idx)}
                            onFocus={() => {
                              // Show suggestions when focused, even if input is empty
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
                                  // Show all medicines when input is empty and focused
                                  const topMedicines = allMedicines.slice(0, 20);
                                  setMedicineSuggestions(prev => ({ ...prev, [idx]: topMedicines }));
                                setShowSuggestions(prev => ({ ...prev, [idx]: true }));
                                }

                                // Calculate position for portal dropdown
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
                            className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all duration-200 bg-white hover:border-amber-300"
                            placeholder="Type to search medicine..."
                            autoComplete="off"
                          />
                        </div>
                        {/* Dropdown using portal to render in document.body (like Select component) */}
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
                              className="bg-white border-2 border-amber-200 rounded-lg shadow-2xl overflow-hidden"
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
                                      ? 'bg-gradient-to-r from-amber-50 to-yellow-50 border-l-4 border-l-amber-500' 
                                      : 'hover:bg-amber-50/50'
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
                    </td>
                    {/* Dynamic fields from PRESCRIPTION_FORM (excluding medicine which is handled above) */}
                    {PRESCRIPTION_FORM.filter(field => field.value !== 'medicine').map((field) => {
                      const fieldIcons = {
                        dosage: <FiActivity className="w-4 h-4 text-gray-400" />,
                        frequency: <FiClock className="w-4 h-4 text-gray-400" />,
                        duration: <FiCalendar className="w-4 h-4 text-gray-400" />,
                        qty: <FiPackage className="w-4 h-4 text-gray-400" />,
                        details: <FiFileText className="w-4 h-4 text-gray-400" />,
                        notes: <FiFileText className="w-4 h-4 text-gray-400" />
                      };
                      const placeholders = {
                        dosage: 'Select dosage',
                        frequency: 'Select frequency',
                        duration: 'Select duration',
                        qty: 'Select quantity',
                        details: 'Details',
                        notes: 'Notes'
                      };
                      const isSelectField = ['dosage', 'frequency', 'duration', 'qty'].includes(field.value);
                      
                      return (
                        <td key={field.value} className="px-4 py-3">
                          {isSelectField ? (
                            <Select
                              name={`${field.value}-${idx}`}
                              value={row[field.value] || ''}
                              onChange={(e) => updatePrescriptionCell(idx, field.value, e.target.value)}
                              options={PRESCRIPTION_OPTIONS[field.value === 'qty' ? 'QUANTITY' : field.value.toUpperCase()] || []}
                              placeholder={placeholders[field.value]}
                              searchable={true}
                              className="bg-white border-2 border-gray-200"
                            />
                          ) : (
                            <div className="relative">
                              {fieldIcons[field.value] && (
                                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                                  {fieldIcons[field.value]}
                                </div>
                              )}
                              <input
                                value={row[field.value] || ''}
                                onChange={(e) => updatePrescriptionCell(idx, field.value, e.target.value)}
                                className={`w-full border-2 border-gray-200 rounded-lg px-3 py-2 ${fieldIcons[field.value] ? 'pl-10' : 'pl-3'} focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all duration-200 bg-white hover:border-amber-300`}
                                placeholder={placeholders[field.value]}
                              />
                            </div>
                          )}
                        </td>
                      );
                    })}
                    {/* When field - not in PRESCRIPTION_FORM but needed */}
                    <td className="px-4 py-3">
                      <Select
                        name={`when-${idx}`}
                        value={row.when || ''}
                        onChange={(e) => updatePrescriptionCell(idx, 'when', e.target.value)}
                        options={PRESCRIPTION_OPTIONS.WHEN}
                        placeholder="Select when"
                        searchable={true}
                        className="bg-white border-2 border-gray-200"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button 
                        type="button" 
                        onClick={() => removePrescriptionRow(idx)} 
                        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors duration-200 border border-red-200 hover:border-red-300"
                      >
                        <FiTrash2 className="w-4 h-4" />
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Datalist suggestions for prescription fields */}
          {prescriptionRows.map((_, rowIdx) => (
            <div key={`datalists-${rowIdx}`} style={{ display: 'none' }}>
              <datalist id={`dosageOptions-${proforma.id}-${rowIdx}`}>
                {PRESCRIPTION_OPTIONS.DOSAGE.map((option) => (
                  <option key={option.value} value={option.value} />
                ))}
              </datalist>
              <datalist id={`whenOptions-${proforma.id}-${rowIdx}`}>
                {PRESCRIPTION_OPTIONS.WHEN.map((option) => (
                  <option key={option.value} value={option.value} />
                ))}
              </datalist>
              <datalist id={`frequencyOptions-${proforma.id}-${rowIdx}`}>
                {PRESCRIPTION_OPTIONS.FREQUENCY.map((option) => (
                  <option key={option.value} value={option.value} />
                ))}
              </datalist>
              <datalist id={`durationOptions-${proforma.id}-${rowIdx}`}>
                {PRESCRIPTION_OPTIONS.DURATION.map((option) => (
                  <option key={option.value} value={option.value} />
                ))}
              </datalist>
              <datalist id={`quantityOptions-${proforma.id}-${rowIdx}`}>
                {PRESCRIPTION_OPTIONS.QUANTITY.map((option) => (
                  <option key={option.value} value={option.value} />
                ))}
              </datalist>
            </div>
          ))}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 pb-2 px-6 bg-gradient-to-r from-gray-50 to-slate-50 border-t-2 border-gray-200">
            <div className="flex items-center gap-3">
              <Button
                type="button"
                onClick={addPrescriptionRow}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <FiPlus className="w-4 h-4" />
                Add Medicine
              </Button>
              <Button
                type="button"
                onClick={() => setShowLoadTemplateModal(true)}
                variant="outline"
                size="sm"
                className="flex items-center gap-2 bg-white hover:bg-blue-50 border-2 border-blue-300 hover:border-blue-500 text-blue-700"
              >
                <FiDownload className="w-4 h-4" />
                Load Template
              </Button>
              {existingPrescriptions.length > 0 && (
                <Button
                  onClick={() => navigate(`/prescriptions/view?clinical_proforma_id=${proforma.id}&patient_id=${patientId}`)}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <FiEdit className="w-4 h-4" />
                  View All Prescriptions
                </Button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                onClick={() => setShowSaveTemplateModal(true)}
                variant="outline"
                size="sm"
                className="flex items-center gap-2 bg-white hover:bg-purple-50 border-2 border-purple-300 hover:border-purple-500 text-purple-700"
              >
                <FiBookmark className="w-4 h-4" />
                Save as Template
              </Button>
              {proforma.id && (
                <Button
                  type="button"
                  onClick={handleSavePrescriptions}
                  disabled={isSaving}
                  className="bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-700 hover:to-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <FiSave className="w-4 h-4" />
                  {isSaving ? 'Saving...' : (isUpdateMode ? 'Update Prescriptions' : 'Create Prescriptions')}
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}
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
              onClick={handleSaveAsTemplate}
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
    </>
  );
};


export default PrescriptionEdit;