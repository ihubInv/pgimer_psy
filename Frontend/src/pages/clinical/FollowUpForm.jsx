import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../../features/auth/authSlice';
import { useGetPatientByIdQuery } from '../../features/patients/patientsApiSlice';
import { useCreateFollowUpMutation } from '../../features/followUp/followUpApiSlice';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Textarea from '../../components/Textarea';
import { FiArrowLeft, FiSave, FiUser, FiCalendar, FiHash, FiPhone } from 'react-icons/fi';

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
      retry: (failureCount, error) => {
        if (error?.status === 401 && failureCount < 2) {
          return true;
        }
        return false;
      }
    }
  );

  const patient = patientData?.data?.patient;

  const [followUpAssessment, setFollowUpAssessment] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [createFollowUp, { isLoading: isCreatingFollowUp }] = useCreateFollowUpMutation();

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
        await new Promise(resolve => setTimeout(resolve, 1000));
        await refetchPatient();
      } catch (refetchError) {
        console.warn('Failed to refetch patient data, continuing with save:', refetchError);
      }
    }

    setIsSaving(true);

    try {
      // Create follow-up visit record
      const followUpData = {
        patient_id: patientId,
        visit_date: new Date().toISOString().split('T')[0],
        clinical_assessment: followUpAssessment.trim(),
        assigned_doctor_id: currentUser?.id || null,
        room_no: patient?.assigned_room || null,
      };

      const followUpResult = await createFollowUp(followUpData).unwrap();
      const createdFollowUpId = followUpResult?.data?.followup?.id;

      if (!createdFollowUpId) {
        throw new Error('Failed to create follow-up visit');
      }

      console.log('[FollowUpForm] Follow-up visit created:', createdFollowUpId);

      toast.success('Follow-up visit saved successfully');
      
      // Navigate back to today's patients
      navigate('/clinical-today-patients');
    } catch (error) {
      console.error('Save error:', error);
      
      let errorMessage = 'Failed to save follow-up visit';
      
      if (error?.status === 'FETCH_ERROR') {
        if (error?.error?.message) {
          errorMessage = `Network error: ${error.error.message}`;
        } else {
          errorMessage = 'Network error: Unable to connect to server. Please check your connection.';
        }
      } else if (error?.status === 404) {
        errorMessage = 'Follow-up endpoint not found. Please ensure the server is running the latest version.';
      } else if (error?.status === 401) {
        if (retryCount === 0) {
          toast.info('Session expired. Refreshing token and retrying...');
          await new Promise(resolve => setTimeout(resolve, 2000));
          try {
            return await handleSave(1);
          } catch (retryError) {
            errorMessage = 'Authentication failed. Please log in again.';
          }
        } else {
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
            <div className="p-3 bg-indigo-100 rounded-xl">
              <FiUser className="w-6 h-6 text-indigo-600" />
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

        <div className="space-y-6 max-w-4xl">
          {/* Patient Info Card */}
          {patient && (
            <Card className="shadow-lg bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100">
              <div className="p-5">
                <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <FiUser className="w-5 h-5 text-indigo-600" />
                  Patient Information
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center gap-2">
                    <FiUser className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Name</p>
                      <p className="font-medium text-gray-800">{patient.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <FiHash className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">CR No</p>
                      <p className="font-medium text-gray-800">{patient.cr_no || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <FiCalendar className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Age / Sex</p>
                      <p className="font-medium text-gray-800">{patient.age}y / {patient.sex}</p>
                    </div>
                  </div>
                  {patient.contact_number && (
                    <div className="flex items-center gap-2">
                      <FiPhone className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">Contact</p>
                        <p className="font-medium text-gray-800">{patient.contact_number}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* Follow-Up Clinical Assessment */}
          <Card className="shadow-lg">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2 flex items-center gap-2">
                <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
                Follow-Up Clinical Assessment
              </h2>
              <Textarea
                label="Clinical Assessment Notes"
                name="followUpAssessment"
                value={followUpAssessment}
                onChange={(e) => setFollowUpAssessment(e.target.value)}
                rows={10}
                placeholder="Enter follow-up clinical assessment notes, observations, and recommendations..."
                required
                className="text-base"
              />
              <p className="mt-2 text-xs text-gray-500">
                * This field is required. Enter detailed clinical observations and assessment for this follow-up visit.
              </p>
            </div>
          </Card>

          {/* Info Note */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <span className="font-semibold">Note:</span> To add prescriptions for this patient, please use the separate{' '}
              <span className="font-medium">"Prescription"</span> button on the patient card after saving this follow-up visit.
            </p>
          </div>

          {/* Save Button */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              onClick={() => navigate('/clinical-today-patients')}
              variant="outline"
              className="px-6"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              loading={isSaving || isCreatingFollowUp}
              disabled={isSaving || isCreatingFollowUp || !patientId || !followUpAssessment.trim()}
              className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-lg px-8"
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
