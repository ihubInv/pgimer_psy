import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../../features/auth/authSlice';
import { useCreateFollowUpMutation } from '../../features/followUp/followUpApiSlice';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Textarea from '../../components/Textarea';
import LoadingSpinner from '../../components/LoadingSpinner';
import { FiArrowLeft, FiSave, FiUser, FiCalendar, FiHash } from 'react-icons/fi';

const ChildFollowUpForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const currentUser = useSelector(selectCurrentUser);
  const childPatientId = id ? parseInt(id, 10) : null;

  const [childPatient, setChildPatient] = useState(null);
  const [isLoadingPatient, setIsLoadingPatient] = useState(true);
  const [followUpAssessment, setFollowUpAssessment] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [createFollowUp, { isLoading: isCreatingFollowUp }] = useCreateFollowUpMutation();

  // Fetch child patient data
  useEffect(() => {
    const fetchChildPatient = async () => {
      if (!childPatientId) {
        setIsLoadingPatient(false);
        return;
      }

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
        }
      } catch (error) {
        console.error('Error fetching child patient:', error);
      } finally {
        setIsLoadingPatient(false);
      }
    };

    fetchChildPatient();
  }, [childPatientId]);

  const handleSave = async () => {
    if (!childPatientId) {
      toast.error('Child patient ID is required');
      return;
    }

    if (!followUpAssessment.trim()) {
      toast.error('Please enter Follow-Up Clinical Assessment');
      return;
    }

    setIsSaving(true);

    try {
      // Create follow-up visit record for child patient
      const followUpData = {
        child_patient_id: childPatientId,
        visit_date: new Date().toISOString().split('T')[0],
        clinical_assessment: followUpAssessment.trim(),
        assigned_doctor_id: currentUser?.id || null,
        room_no: childPatient?.assigned_room || null,
      };

      const followUpResult = await createFollowUp(followUpData).unwrap();
      const createdFollowUpId = followUpResult?.data?.followup?.id;

      if (!createdFollowUpId) {
        throw new Error('Failed to create follow-up visit');
      }

      console.log('[ChildFollowUpForm] Follow-up visit created:', createdFollowUpId);

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
        errorMessage = 'Authentication failed. Please log in again.';
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
    return <LoadingSpinner size="lg" className="h-96" />;
  }

  // If patient data is not loaded but we have childPatientId, show a warning but allow save
  const showPatientWarning = !childPatient && !isLoadingPatient && childPatientId;

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
            <div className="p-3 bg-purple-100 rounded-xl">
              <FiUser className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Child Follow-Up Visit</h1>
              <p className="text-sm text-gray-600">
                {childPatient ? `${childPatient.child_name} - CR: ${childPatient.cr_number || 'N/A'}` : `Child Patient ID: ${childPatientId}`}
              </p>
              {showPatientWarning && (
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                  ⚠️ Child patient data could not be loaded, but you can still save the follow-up visit.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6 max-w-4xl">
          {/* Child Patient Info Card */}
          {childPatient && (
            <Card className="shadow-lg bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100">
              <div className="p-5">
                <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <FiUser className="w-5 h-5 text-purple-600" />
                  Child Patient Information
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center gap-2">
                    <FiUser className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Name</p>
                      <p className="font-medium text-gray-800">{childPatient.child_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <FiHash className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">CR No</p>
                      <p className="font-medium text-gray-800">{childPatient.cr_number || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <FiCalendar className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Age Group / Sex</p>
                      <p className="font-medium text-gray-800">{childPatient.age_group || 'N/A'} / {childPatient.sex || 'N/A'}</p>
                    </div>
                  </div>
                  {childPatient.assigned_room && (
                    <div className="flex items-center gap-2">
                      <FiHash className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">Room</p>
                        <p className="font-medium text-gray-800">{childPatient.assigned_room}</p>
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
                <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
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
              <span className="font-semibold">Note:</span> This follow-up visit will be recorded for the child patient. 
              You can add additional clinical proformas or prescriptions as needed.
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
              disabled={isSaving || isCreatingFollowUp || !childPatientId || !followUpAssessment.trim()}
              className="bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg px-8"
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

export default ChildFollowUpForm;
