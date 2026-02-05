import { useState } from 'react';
import { FiSearch, FiUser, FiPhone, FiClock, FiX } from 'react-icons/fi';
import { toast } from 'react-toastify';
import Modal from './Modal';
import Button from './Button';
import Input from './Input';
import { useGetPatientByCRNoQuery, useCreatePatientMutation, useAddChildPatientToTodayListMutation } from '../features/patients/patientsApiSlice';

const SearchExistingPatientModal = ({ isOpen, onClose, onSelectPatient, currentRoom }) => {
  const [crNo, setCrNo] = useState('');
  const [searchTrigger, setSearchTrigger] = useState(null);
  
  // Unified search: Single query searches both adult and child patients
  const { data: patientData, isLoading, error } = useGetPatientByCRNoQuery(
    searchTrigger,
    { skip: !searchTrigger }
  );

  // Extract patient data from unified response
  const patient = patientData?.data?.patient;
  const patientType = patientData?.data?.patient_type;
  const isChildPatient = patientType === 'child';
  const foundPatient = patient;

  // Prefer the logged-in doctor's current room (passed from parent) for display as well.
  // This ensures the modal shows where the doctor is sitting today, not the patient's old room.
  const displayRoom =
    (currentRoom && currentRoom.trim() !== '')
      ? currentRoom
      : (foundPatient?.assigned_room || '');
  const [createPatient, { isLoading: isCreatingVisit }] = useCreatePatientMutation();
  const [addChildPatientToTodayList, { isLoading: isAddingChildPatient }] = useAddChildPatientToTodayListMutation();

  const handleSearch = () => {
    if (!crNo.trim()) {
      toast.error('Please enter a CR Number');
      return;
    }
    setSearchTrigger(crNo.trim());
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleSelectPatient = async () => {
    if (!foundPatient) return;

    try {
      if (isChildPatient) {
        // For child patients, update their assigned_room to add them to today's list
        const roomToUse =
          (currentRoom && currentRoom.trim() !== '') 
            ? currentRoom 
            : (patient.assigned_room || undefined);

        const result = await addChildPatientToTodayList({
          child_patient_id: parseInt(patient.id, 10),
          assigned_room: roomToUse,
        }).unwrap();

        toast.success('Child patient added to today\'s list successfully!');
        
        // Call onSelectPatient callback if provided (for refetching patient list)
        // Call immediately - cache invalidation happens synchronously
        if (onSelectPatient) {
          onSelectPatient(patient);
        }
        
        handleClose();
        return;
      }

      // Create a visit record for the existing adult patient
      // This will add them to today's patients list
      // Prefer the logged-in doctor's current room (passed from parent) over stale patient room
      const roomToUse =
        (currentRoom && currentRoom.trim() !== '') 
          ? currentRoom 
          : (patient.assigned_room || undefined);

      await createPatient({
        name: patient.name,
        patient_id: parseInt(patient.id, 10),
        assigned_room: roomToUse,
      }).unwrap();

      toast.success('Patient added to today\'s list successfully!');
      
      // Call onSelectPatient callback if provided (for refetching patient list)
      if (onSelectPatient) {
        onSelectPatient(patient);
      }
      
      handleClose();
    } catch (err) {
      console.error('Failed to add patient to today\'s list:', err);
      // Handle case where visit already exists or patient is already in list
      if (err?.status === 400 && (err?.data?.message?.includes('already exists') || err?.data?.message?.includes('already has'))) {
        toast.info('Patient is already in today\'s list');
        // Still call onSelectPatient to trigger refetch
        if (onSelectPatient) {
          onSelectPatient(foundPatient);
        }
        handleClose();
      } else {
        toast.error(err?.data?.message || 'Failed to add patient to today\'s list');
      }
    }
  };

  const handleClose = () => {
    setCrNo('');
    setSearchTrigger(null);
    onClose();
  };

  const formatTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Search Existing Patient"
      size="md"
    >
      <div className="space-y-4">
        {/* Search Input */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Enter CR Number
          </label>
          <div className="flex gap-2">
            <Input
              type="text"
              value={crNo}
              onChange={(e) => setCrNo(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter CR Number"
              className="flex-1"
            />
            <Button
              onClick={handleSearch}
              loading={isLoading}
              className="px-4"
            >
              <FiSearch className="w-4 h-4 mr-2" />
              Search
            </Button>
          </div>
        </div>

        {/* Error Message */}
        {error && searchTrigger && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">
              {error?.data?.message || 'Patient not found. Please check the CR Number and try again.'}
            </p>
          </div>
        )}

        {/* Patient Card */}
        {foundPatient && !error && (
          <div className="p-4 bg-gradient-to-r from-green-50/30 to-white border-l-4 border-l-green-500 rounded-lg shadow-sm">
            <div className="space-y-3">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-bold text-gray-900">
                  {patient.name || patient.child_name}
                </h4>
                <div className="flex items-center gap-2">
                  {isChildPatient && (
                    <span className="px-2 py-0.5 rounded text-xs font-semibold bg-purple-100 text-purple-700 border border-purple-200">
                      Child Patient
                    </span>
                  )}
                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
                  Existing Patient
                </span>
                </div>
              </div>

              {/* Patient Details */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs sm:text-sm text-gray-600">
                <span className="flex items-center gap-1 whitespace-nowrap">
                  <FiUser className="w-3.5 h-3.5 text-gray-400" />
                  <span className="font-medium">{patient.sex}</span>
                  {!isChildPatient && patient.age && (
                    <>
                  <span className="text-gray-300">•</span>
                  <span>{patient.age}y</span>
                    </>
                  )}
                  {isChildPatient && patient.age_group && (
                    <>
                      <span className="text-gray-300">•</span>
                      <span>{patient.age_group}</span>
                    </>
                  )}
                </span>
                {!isChildPatient && patient.contact_number && (
                  <span className="flex items-center gap-1 whitespace-nowrap">
                    <FiPhone className="w-3.5 h-3.5 text-gray-400" />
                    <span>{patient.contact_number}</span>
                  </span>
                )}
                {patient.created_at && (
                  <span className="flex items-center gap-1 whitespace-nowrap">
                    <FiClock className="w-3.5 h-3.5 text-gray-400" />
                    <span>{formatTime(patient.created_at)}</span>
                  </span>
                )}
                <span className="text-gray-500">
                  CR: <span className="font-medium text-gray-700">{patient.cr_no || patient.cr_number}</span>
                </span>
                {!isChildPatient && patient.psy_no && (
                  <span className="text-gray-500">
                    PSY: <span className="font-medium text-gray-700">{patient.psy_no}</span>
                  </span>
                )}
                {isChildPatient && (patient.cgc_number || patient.special_clinic_no) && (
                  <span className="text-gray-500">
                    CGC: <span className="font-medium text-gray-700">{patient.cgc_number || patient.special_clinic_no}</span>
                  </span>
                )}
                {(displayRoom && displayRoom.trim() !== '') && (
                  <span className="text-gray-500">
                    Room: <span className="font-medium text-gray-700">{displayRoom}</span>
                  </span>
                )}
              </div>

              {/* Action Button */}
              <div className="pt-2 border-t border-gray-100">
                <Button
                  onClick={handleSelectPatient}
                  loading={isCreatingVisit || isAddingChildPatient}
                  disabled={isCreatingVisit || isAddingChildPatient}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
                >
                  Add to Today's List
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default SearchExistingPatientModal;

