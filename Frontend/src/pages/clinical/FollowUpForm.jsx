import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../../features/auth/authSlice';
import { useGetPatientByIdQuery } from '../../features/patients/patientsApiSlice';
import { useCreateFollowUpMutation } from '../../features/followUp/followUpApiSlice';
import { useCreatePrescriptionMutation } from '../../features/prescriptions/prescriptionApiSlice';
import { useCreateClinicalProformaMutation } from '../../features/clinical/clinicalApiSlice';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Textarea from '../../components/Textarea';
import { FiArrowLeft, FiSave, FiUser } from 'react-icons/fi';
import CreatePrescription from '../PrescribeMedication/CreatePrescription';

const FollowUpForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const currentUser = useSelector(selectCurrentUser);
  const patientId = id ? parseInt(id, 10) : null;

  const { 
    data: patientData, 
    isLoading: isLoadingPatient,
    error: patientError,
    refetch: refetchPatient
  } = useGetPatientByIdQuery(
    patientId,
    { 
      skip: !patientId,
      // Retry on 401 to allow token refresh
      retry: (failureCount, error) => {
        // Retry up to 2 times for 401 errors (to allow token refresh)
        if (error?.status === 401 && failureCount < 2) {
          return true;
        }
        // Don't retry other errors
        return false;
      }
    }
  );

  const patient = patientData?.data?.patient;

  const [followUpAssessment, setFollowUpAssessment] = useState('');
  const [prescriptions, setPrescriptions] = useState([
    { medicine: '', dosage: '', when: '', frequency: '', duration: '', qty: '', details: '', notes: '' }
  ]);
  const [clinicalProformaId, setClinicalProformaId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isPrescriptionSaved, setIsPrescriptionSaved] = useState(false);

  // Debug: Log prescription state changes
  useEffect(() => {
    const validPrescriptions = prescriptions.filter(p => p.medicine && p.medicine.trim());
    if (validPrescriptions.length > 0) {
      console.log('[FollowUpForm] Prescriptions state updated:', {
        total: prescriptions.length,
        valid: validPrescriptions.length,
        data: validPrescriptions
      });
    }
  }, [prescriptions]);

  const [createFollowUp, { isLoading: isCreatingFollowUp }] = useCreateFollowUpMutation();
  const [createPrescription, { isLoading: isSavingPrescription }] = useCreatePrescriptionMutation();
  const [createClinicalProforma] = useCreateClinicalProformaMutation();

  // Callback when prescription is saved independently
  const handlePrescriptionSaved = (savedProformaId) => {
    if (savedProformaId) {
      setClinicalProformaId(savedProformaId);
      setIsPrescriptionSaved(true);
      console.log('[FollowUpForm] Prescription saved independently, proforma ID:', savedProformaId);
    }
  };

  const handleSave = async (retryCount = 0) => {
    if (!patientId) {
      toast.error('Patient ID is required');
      return;
    }

    if (!followUpAssessment.trim()) {
      toast.error('Please enter Follow-Up Clinical Assessment');
      return;
    }

    // If patient data failed to load with 401, try to refetch it first to trigger token refresh
    if (patientError && patientError?.status === 401 && retryCount === 0) {
      try {
        // Wait a bit for token refresh to complete if it's in progress
        await new Promise(resolve => setTimeout(resolve, 1000));
        await refetchPatient();
      } catch (refetchError) {
        // If refetch still fails, continue anyway - we have patientId
        // The save operation will trigger its own token refresh if needed
        console.warn('Failed to refetch patient data, continuing with save:', refetchError);
      }
    }

    // Filter out empty prescriptions - ensure we're getting the latest state
    // Filter prescriptions that have at least a medicine name
    const validPrescriptions = prescriptions.filter(p => p.medicine && p.medicine.trim());
    
    // Debug: Log prescription data
    console.log('[FollowUpForm] Saving follow-up visit:', {
      patientId,
      assessmentLength: followUpAssessment.trim().length,
      totalPrescriptions: prescriptions.length,
      validPrescriptions: validPrescriptions.length,
      validPrescriptionsData: validPrescriptions
    });

    setIsSaving(true);

    try {
      // Step 1: Create follow-up visit record using the dedicated follow-up table
      // Note: The followUpController will automatically create/check for a visit record
      // Use patient data if available, otherwise use null for optional fields
      const followUpData = {
        patient_id: patientId,
        visit_date: new Date().toISOString().split('T')[0],
        clinical_assessment: followUpAssessment.trim(),
        assigned_doctor_id: currentUser?.id || null,
        room_no: patient?.assigned_room || null, // Optional field, can be null
      };

      const followUpResult = await createFollowUp(followUpData).unwrap();
      const createdFollowUpId = followUpResult?.data?.followup?.id;
      const visitId = followUpResult?.data?.followup?.visit_id;

      if (!createdFollowUpId) {
        throw new Error('Failed to create follow-up visit');
      }

      console.log('[FollowUpForm] Follow-up visit created:', { createdFollowUpId, visitId });

      // Step 2: Verify and save prescriptions if any
      // If there are valid prescriptions, check if they've been saved already
      if (validPrescriptions.length > 0) {
        // If prescription hasn't been saved yet, require user to save it first
        if (!isPrescriptionSaved || !clinicalProformaId) {
          toast.error('Please save the prescription first by clicking "Save Prescription" button before saving the follow-up visit.');
          setIsSaving(false);
          return;
        }
        
        console.log('[FollowUpForm] Prescription already saved, using existing proforma ID:', clinicalProformaId);
        toast.success('Prescription already saved, proceeding with follow-up visit save.');
      } else {
        console.log('[FollowUpForm] No valid prescriptions to save');
      }

      toast.success('Follow-up visit saved successfully');
      
      // Navigate back to today's patients
      navigate('/clinical-today-patients');
    } catch (error) {
      console.error('Save error:', error);
      
      // Handle different error types
      let errorMessage = 'Failed to save follow-up visit';
      
      if (error?.status === 'FETCH_ERROR') {
        // Network or fetch error
        if (error?.error?.message) {
          errorMessage = `Network error: ${error.error.message}`;
        } else {
          errorMessage = 'Network error: Unable to connect to server. Please check your connection.';
        }
      } else if (error?.status === 404) {
        errorMessage = 'Follow-up endpoint not found. Please ensure the server is running the latest version.';
      } else if (error?.status === 401) {
        // 401 error - token might be expired, try to refresh and retry once
        if (retryCount === 0) {
          // First attempt failed with 401, wait for token refresh and retry
          toast.info('Session expired. Refreshing token and retrying...');
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for token refresh
          // Retry the save operation (keep isSaving true during retry)
          try {
            return await handleSave(1);
          } catch (retryError) {
            // If retry also fails, fall through to show error
            errorMessage = 'Authentication failed. Please log in again.';
          }
        } else {
          // Retry also failed, show error
          errorMessage = 'Authentication failed. Please log in again.';
        }
      } else if (error?.status === 403) {
        errorMessage = 'Access denied. You do not have permission to perform this action.';
      } else if (error?.data?.message) {
        errorMessage = error.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoadingPatient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 border-4 border-primary-100 border-t-primary-600 rounded-full animate-spin mx-auto"></div>
          <p className="mt-6 text-gray-600 font-medium text-lg">Loading patient data...</p>
        </div>
      </div>
    );
  }

  // Show error state if patient fetch failed (but allow save if we have patientId)
  if (patientError && patientError?.status !== 401) {
    // Only show error for non-401 errors (401 will be handled by token refresh)
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl font-semibold text-gray-700 mb-2">
            {patientError?.status === 404 ? 'Patient not found' : 'Failed to load patient data'}
          </p>
          <p className="text-gray-500 mb-4">
            {patientError?.data?.message || patientError?.message || 'An error occurred'}
          </p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => refetchPatient()} variant="outline" className="mt-4">
              Retry
            </Button>
            <Button onClick={() => navigate('/clinical-today-patients')} className="mt-4">
              <FiArrowLeft className="w-4 h-4 mr-2" />
              Back to Today's Patients
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // If patient data is not loaded but we have patientId, show a warning but allow save
  const showPatientWarning = !patient && !isLoadingPatient && patientId;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-6">
          <Button
            onClick={() => navigate('/clinical-today-patients')}
            variant="outline"
            className="mb-4"
          >
            <FiArrowLeft className="w-4 h-4 mr-2" />
            Back to Today's Patients
          </Button>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <FiUser className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Follow-Up Visit</h1>
              <p className="text-sm text-gray-600">
                {patient ? `${patient.name} - CR: ${patient.cr_no || 'N/A'}` : `Patient ID: ${patientId}`}
              </p>
              {showPatientWarning && (
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                  ⚠️ Patient data could not be loaded, but you can still save the follow-up visit.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Follow-Up Clinical Assessment */}
          <Card className="shadow-lg">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">
                Follow-Up Clinical Assessment
              </h2>
              <Textarea
                label="Follow-Up Clinical Assessment"
                name="followUpAssessment"
                value={followUpAssessment}
                onChange={(e) => setFollowUpAssessment(e.target.value)}
                rows={8}
                placeholder="Enter follow-up clinical assessment notes..."
                required
              />
            </div>
          </Card>

          {/* Prescription Section - Minimal Mode */}
          <Card className="shadow-lg">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">
                Prescription
              </h2>
              <CreatePrescription
                patientId={patientId}
                clinicalProformaId={clinicalProformaId}
                prescriptions={prescriptions}
                setPrescriptions={setPrescriptions}
                currentUser={currentUser}
                returnTab="clinical-today-patients"
                isFollowUpMode={true}
                onPrescriptionSaved={handlePrescriptionSaved}
                patient={patient}
              />
            </div>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              onClick={() => navigate('/clinical-today-patients')}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              loading={isSaving || isCreatingFollowUp || isSavingPrescription}
              disabled={isSaving || isCreatingFollowUp || isSavingPrescription || !patientId}
              className="bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg"
            >
              <FiSave className="w-4 h-4 mr-2" />
              Save Follow-Up Visit
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FollowUpForm;

