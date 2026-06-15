import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { 
  FiUser, FiPhone,  FiClock, FiEye,
  FiRefreshCw, FiPlusCircle, FiFileText, FiUsers,  FiShield, FiCheck, FiHome, FiUserPlus, FiClipboard, FiRepeat, FiX,
  FiChevronDown, FiChevronUp, FiMaximize2, FiMinimize2
} from 'react-icons/fi';
import { useGetAllPatientsQuery, useMarkVisitCompletedMutation, useChangePatientRoomMutation, useTransferPatientToDoctorMutation, patientsApiSlice } from '../../features/patients/patientsApiSlice';
import { useGetClinicalProformaByPatientIdQuery } from '../../features/clinical/clinicalApiSlice';
import { useGetChildClinicalProformasByChildPatientIdQuery } from '../../features/clinical/childClinicalApiSlice';
import { useGetMyRoomQuery, useGetAvailableRoomsQuery, useSelectRoomMutation, useClearRoomMutation, roomsApiSlice, useGetAllRoomsQuery } from '../../features/rooms/roomsApiSlice';
import { useDispatch } from 'react-redux';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Select from '../../components/Select';
import SearchExistingPatientModal from '../../components/SearchExistingPatientModal';
import AdminDoctorRoomManager from '../../components/AdminDoctorRoomManager';
import CustomDateTimePicker from '../../components/CustomDateTimePicker';
// Removed RoomSelectionModal - using inline card instead
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../../features/auth/authSlice';
import {
  isAdmin,
  isMWO,
  isJrSr,
  canFillClinicalProforma,
  canFillIntakeRecord,
  isJuniorResidentUser,
  isSeniorResidentUser,
  isFacultyUser,
} from '../../utils/constants';

// listContext: 'new' = New Patients sub-tab (strip returning-patient-only actions); 'existing' = full actions
const PatientRow = ({ patient, navigate, onMarkCompleted, onRoomChanged, availableRooms = [], listContext = 'existing', sharedRoomContext = null }) => {
  const currentUser = useSelector(selectCurrentUser);
  const mayFillClinicalProforma = canFillClinicalProforma(currentUser);
  const mayFillIntakeRecord = canFillIntakeRecord(currentUser);

  const currentUserIdParsed = currentUser?.id ? parseInt(currentUser.id, 10) : null;
  const patientDoctorId =
    patient?.assigned_doctor_id != null ? parseInt(patient.assigned_doctor_id, 10) : null;
  const ownsPatient =
    currentUserIdParsed != null &&
    patientDoctorId != null &&
    !isNaN(patientDoctorId) &&
    patientDoctorId === currentUserIdParsed;
  const canShowTransferOnPatient = Boolean(sharedRoomContext?.room && ownsPatient);
  const canTransferActive = canShowTransferOnPatient && sharedRoomContext?.hasColleagues;

  // Get patient ID safely - use 0 if invalid to satisfy hook rules (skip will prevent API call)
  const patientId = patient?.id || 0;
  const isValidPatient = Boolean(patient && patient.id);
  
  // ALL HOOKS MUST BE CALLED UNCONDITIONALLY - React rules of hooks
  const [markCompleted, { isLoading: isMarkingCompleted }] = useMarkVisitCompletedMutation();
  const [changeRoom, { isLoading: isChangingRoom }] = useChangePatientRoomMutation();
  const [transferPatient, { isLoading: isTransferringPatient }] = useTransferPatientToDoctorMutation();
  const [showRoomDropdown, setShowRoomDropdown] = useState(false);
  const [selectedNewRoom, setSelectedNewRoom] = useState('');
  const roomDropdownRef = useRef(null);

  const [showTransferDropdown, setShowTransferDropdown] = useState(false);
  const [selectedTransferDoctorId, setSelectedTransferDoctorId] = useState('');
  const transferDropdownRef = useRef(null);
  
  // Check if patient is a child patient
  const isChildPatient = patient?.patient_type === 'child';
  const childPatientId = isChildPatient ? patientId : null;

  // Fetch adult clinical proformas (skip for child patients)
  const { data: proformaData, isLoading: isLoadingProformas, refetch: refetchProformas } = useGetClinicalProformaByPatientIdQuery(
    patientId, 
    { 
      skip: !isValidPatient || isChildPatient, // Skip API call if patient is invalid or is a child patient
      refetchOnMountOrArgChange: false,
      refetchOnFocus: false,
      refetchOnReconnect: false,
    }
  );

  // Fetch child clinical proformas (only for child patients)
  const { data: childProformaData, isLoading: isLoadingChildProformas, refetch: refetchChildProformas } = useGetChildClinicalProformasByChildPatientIdQuery(
    childPatientId,
    {
      skip: !childPatientId || !isChildPatient,
      refetchOnMountOrArgChange: true,
    }
  );
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (roomDropdownRef.current && !roomDropdownRef.current.contains(event.target)) {
        setShowRoomDropdown(false);
      }
      if (transferDropdownRef.current && !transferDropdownRef.current.contains(event.target)) {
        setShowTransferDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Handle room change
  const handleRoomChange = async () => {
    if (!selectedNewRoom || selectedNewRoom === patient.assigned_room) {
      toast.warning('Please select a different room');
      return;
    }
    
    try {
      const result = await changeRoom({
        patient_id: patient.id,
        new_room: selectedNewRoom,
        patient_type: isChildPatient ? 'child' : 'adult',
      }).unwrap();
      
      toast.success(result.message || `Patient moved to ${selectedNewRoom}`);
      setShowRoomDropdown(false);
      setSelectedNewRoom('');
      
      // Call parent callback to trigger list refresh
      if (onRoomChanged) {
        onRoomChanged();
      }
    } catch (error) {
      console.error('Failed to change room:', error);
      toast.error(error?.data?.message || 'Failed to change patient room');
    }
  };

  const handleTransferPatient = async () => {
    if (!canTransferActive) {
      toast.error('Transfer is only available when another doctor is in your shared room');
      return;
    }
    if (!selectedTransferDoctorId) {
      toast.warning('Please select a doctor');
      return;
    }

    try {
      const targetId = parseInt(selectedTransferDoctorId, 10);
      const result = await transferPatient({
        patient_id: patient.id,
        target_doctor_id: targetId,
        patient_type: isChildPatient ? 'child' : 'adult',
      }).unwrap();

      toast.success(result.message || 'Patient transferred successfully');
      setShowTransferDropdown(false);
      setSelectedTransferDoctorId('');
      onRoomChanged?.(); // refresh list
    } catch (error) {
      console.error('Failed to transfer patient:', error);
      toast.error(error?.data?.message || 'Failed to transfer patient');
    }
  };
  
  // Safety check - AFTER all hooks are called (React rules of hooks)
  if (!isValidPatient) {
    return null;
  }
  
  const handleMarkCompleted = async () => {
    try {
      // Include patient_type for child patients so backend knows how to handle it
      await markCompleted({ 
        patient_id: patient.id,
        patient_type: isChildPatient ? 'child' : 'adult'
      }).unwrap();
      toast.success(`Patient ${patient.name} marked as completed`);
      if (onMarkCompleted) {
        onMarkCompleted();
      }
    } catch (error) {
      console.error('Failed to mark visit as completed:', error);
      // Handle 404 (no visit found) differently from other errors
      if (error?.status === 404 || error?.data?.status === 404) {
        toast.warning(error?.data?.message || 'No active visit found for today to mark as completed');
      } else {
        toast.error(error?.data?.message || 'Failed to mark visit as completed');
      }
    }
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

  // Check if patient was created today
  const isPatientCreatedToday = () => {
    if (!patient?.created_at) return false;
    const todayDateString = toISTDateString(new Date());
    const patientCreatedDate = toISTDateString(patient.created_at);
    return patientCreatedDate && patientCreatedDate === todayDateString;
  };

  // Get visit history and proformas - simplified to avoid API calls
  const visitHistory = []; // Disabled to prevent 500 errors
  
  // Get proformas based on patient type
  const proformas = isChildPatient 
    ? (childProformaData?.data?.proformas || [])
    : (proformaData?.data?.proformas || []);
  
  // Filter out today's visits from history to get only past visits
  const todayDateString = toISTDateString(new Date());
  
  // Since visit history is disabled, use proforma history only
  const pastProformas = proformas.filter(proforma => {
    const proformaDate = toISTDateString(proforma.visit_date || proforma.created_at);
    return proformaDate && proformaDate !== todayDateString;
  });

  // Check if patient has actual past history (not including today's proformas)
  // Simplified: just check if they have past proformas
  const hasPastHistory = pastProformas.length > 0;

  // Determine if patient is truly new: created today AND has no past history
  const isNewPatient = isPatientCreatedToday() && !hasPastHistory;
  
  // Check if visit is already completed
  const isCompleted = patient.visit_status === 'completed';
  
  // Show "Mark as Completed" button for ALL patients in today's list
  // Since patients are already filtered to show only patients registered today (from 12:00 AM IST to 11:59 PM IST),
  // we should show the button for all of them, except those already completed
  const shouldShowCompleteButton = !isCompleted;
  
  // Refetch proformas when component becomes visible - DISABLED to prevent re-render loops
  // useEffect(() => {
  //   const handleVisibilityChange = () => {
  //     if (!document.hidden && patient.id) {
  //       refetchProformas();
  //     }
  //   };
  //   
  //   document.addEventListener('visibilitychange', handleVisibilityChange);
  //   return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  // }, [patient.id, refetchProformas]);

  const hasExistingProforma = proformas.length > 0;
  const latestProformaId = hasExistingProforma ? proformas[0].id : null;
  
  // Find the proforma that was created/filled today (if any).
  // This is used so the "Clinical Proforma" button opens the already-saved record for
  // editing rather than opening a blank new form.
  const todayProforma = proformas.find(proforma => {
    const proformaDate = toISTDateString(proforma.created_at || proforma.visit_date || proforma.date);
    return proformaDate === todayDateString;
  });
  const todayProformaId = todayProforma?.id || null;
  const hasProformaToday = Boolean(todayProformaId);

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getAgeGroupColor = (ageGroup) => {
    const colors = {
      '0-15': 'bg-blue-100 text-blue-800',
      '15-30': 'bg-green-100 text-green-800',
      '30-45': 'bg-yellow-100 text-yellow-800',
      '45-60': 'bg-orange-100 text-orange-800',
      '60+': 'bg-red-100 text-red-800',
    };
    return colors[ageGroup] || 'bg-gray-100 text-gray-800';
  };

  const getCaseComplexityColor = (complexity) => {
    return complexity === 'complex' 
      ? 'bg-red-100 text-red-800' 
      : 'bg-green-100 text-green-800';
  };

  // Color coding: New patients = blue border, Existing patients = green border
  // Use the calculated isNewPatient (based on created today AND no past history)
  const borderColor = isNewPatient 
    ? 'border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50/30 to-white' 
    : 'border-l-4 border-l-green-500 bg-gradient-to-r from-green-50/30 to-white';

  return (
    <div className={`p-3 sm:p-4 hover:bg-gradient-to-r hover:from-gray-50/50 hover:to-white transition-all duration-200 rounded-lg mb-3 shadow-sm hover:shadow-md ${borderColor}`}>
      <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-4">
        {/* Patient Information Section - More Compact */}
        <div className="flex-1 min-w-0">
          {/* Header Row: Name, Badges, and Basic Info */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 mb-2">
            <div className="flex items-center gap-3 flex-wrap">
              <h4 className="text-lg font-bold text-gray-900 break-words">
                {patient.name}
              </h4>
              {/* Compact Badges */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className={`px-2 py-0.5 rounded text-xs font-semibold whitespace-nowrap ${
                  isNewPatient 
                    ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                    : 'bg-green-100 text-green-700 border border-green-200'
                }`}>
                  {isNewPatient ? 'New Patient' : 'Existing Patient'}
                </span>
                {patient.patient_type === 'child' && (
                  <span className="px-2 py-0.5 rounded text-xs font-semibold bg-purple-100 text-purple-700 border border-purple-200 whitespace-nowrap">
                    Child Patient
                  </span>
                )}
                {patient.age_group && (
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold whitespace-nowrap ${getAgeGroupColor(patient.age_group)}`}>
                    {patient.age_group}
                  </span>
                )}
                {patient.case_complexity && (
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold whitespace-nowrap ${getCaseComplexityColor(patient.case_complexity)}`}>
                    {patient.case_complexity}
                  </span>
                )}
                {patient.has_adl_file && (
                  <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-700 whitespace-nowrap">
                    ADL
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Compact Info Row: Demographics and Details */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs sm:text-sm text-gray-600 mb-2">
            <span className="flex items-center gap-1 whitespace-nowrap">
              <FiUser className="w-3.5 h-3.5 text-gray-400" />
              <span className="font-medium">{patient.sex}</span>
              <span className="text-gray-300">•</span>
              <span>{patient.age}y</span>
            </span>
            {patient.contact_number && (
              <span className="flex items-center gap-1 whitespace-nowrap">
                <FiPhone className="w-3.5 h-3.5 text-gray-400" />
                <span>{patient.contact_number}</span>
              </span>
            )}
            <span className="flex items-center gap-1 whitespace-nowrap">
              <FiClock className="w-3.5 h-3.5 text-gray-400" />
              <span>{formatTime(patient.created_at)}</span>
            </span>
            <span className="text-gray-500">CR: <span className="font-medium text-gray-700">{patient.cr_no}</span></span>
            {patient.psy_no && (
              <span className="text-gray-500">PSY: <span className="font-medium text-gray-700">{patient.psy_no}</span></span>
            )}
            {patient.assigned_room && (
              <span className="flex items-center gap-1 text-gray-500">
                <FiHome className="w-3 h-3" />
                <span>Room: <span className="font-medium text-gray-700">{patient.assigned_room}</span></span>
              </span>
            )}
          </div>

          {/* Compact Footer: Registered by */}
          <div className="text-xs text-gray-500 pt-1 border-t border-gray-100">
            <span className="font-medium text-gray-600">By:</span>
            <span className="ml-1">{patient.filled_by_name}</span>
            {patient.filled_by_role && (
              <span className="ml-1 text-gray-400">({patient.filled_by_role})</span>
            )}
          </div>
        </div>

        {/* Action Buttons Section - 2 Column Grid Layout */}
        <div className="lg:w-auto shrink-0">
          <div className="grid grid-cols-2 gap-2 w-full lg:w-auto">
            {/* View Details Button */}
            {/* For child patients: Show child patient registration form in view mode */}
            {/* For adult patients: Show patient registration details */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const isChildPatient = patient.patient_type === 'child';
                
                if (isChildPatient) {
                  // For child patients: Navigate to child patient registration form in view mode
                  navigate(`/child-patient/${patient.id}?mode=view`);
                } else {
                  // For adult patients: Show patient registration details (existing behavior)
                  navigate(`/patients/${patient.id}?edit=false&mode=view`);
                }
              }}
              className="flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all hover:shadow-sm"
            >
              <FiEye className="w-3.5 h-3.5" />
              <span className="whitespace-nowrap">View Details</span>
            </Button>
            
            {/* Walk-In Clinical Proforma Button — hidden on Existing Patients tab (use Follow-Up / other flows there) */}
            {/* 
              WORKFLOW REQUIREMENT:
              - Show "Clinical Proforma" when EITHER:
                  a) The patient has NO proformas from previous days (brand-new patient), OR
                  b) A proforma has already been filled for TODAY — in this case the button
                     must stay "Clinical Proforma" so the doctor can re-open and edit it,
                     regardless of whether the patient has past history from earlier visits.
              - Existing Patients tab: always show Follow-Up, View Details, Prescription,
                Change Room, and Mark as Completed (regardless of whether today's clinical
                proforma has been filled). Do not show Clinical Proforma or Intake Record there.
            */}
            {listContext !== 'existing' && mayFillClinicalProforma && (
              ((!hasPastHistory || hasProformaToday) ||
              (listContext === 'new' && hasPastHistory && !hasProformaToday)
            ) && (() => {
              // If a proforma was already filled today, open it for editing.
              // Otherwise open a blank new form.
              const handleClinicalProformaClick = () => {
                if (isChildPatient) {
                  if (todayProformaId) {
                    navigate(`/child-clinical-proformas/${todayProformaId}/edit`);
                  } else {
                    navigate(`/child-clinical-proformas/new?child_patient_id=${patient.id}`);
                  }
                } else {
                  if (todayProformaId) {
                    navigate(`/clinical/${todayProformaId}/edit`);
                  } else {
                    navigate(`/clinical/new?patient_id=${patient.id}`);
                  }
                }
              };

              return (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClinicalProformaClick}
                  className="flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100 hover:border-blue-400 transition-all hover:shadow-sm"
                >
                  <FiFileText className="w-3.5 h-3.5" />
                  <span className="whitespace-nowrap">Clinical Proforma</span>
                </Button>
              );
            })()
            )}
            
            {/* Follow-Up — always shown on Existing Patients tab, regardless of whether today&apos;s clinical proforma has been filled or not */}
            {listContext === 'existing' && (() => {
              const isChildPatient = patient.patient_type === 'child';
              
              if (isChildPatient) {
                // Child patient follow-up
                return (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Navigate to child follow-up form
                      navigate(`/child-follow-up/${patient.id}`);
                    }}
                    className="flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium bg-indigo-50 border-indigo-300 text-indigo-700 hover:bg-indigo-100 hover:border-indigo-400 transition-all hover:shadow-sm"
                  >
                    <FiRefreshCw className="w-3.5 h-3.5" />
                    <span className="whitespace-nowrap">Follow-Up</span>
                  </Button>
                );
              } else {
                // Adult patient follow-up
                return (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Navigate to follow-up form for existing patient
                  navigate(`/follow-up/${patient.id}`);
                }}
                className="flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium bg-indigo-50 border-indigo-300 text-indigo-700 hover:bg-indigo-100 hover:border-indigo-400 transition-all hover:shadow-sm"
              >
                <FiRefreshCw className="w-3.5 h-3.5" />
                <span className="whitespace-nowrap">Follow-Up</span>
              </Button>
                );
              }
            })()}
            
            {/* Intake Record (ADL); hidden on Existing Patients tab */}
            {listContext !== 'existing' && mayFillIntakeRecord && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const isChildPatient = patient.patient_type === 'child';
                if (isChildPatient) {
                  navigate(`/child-patient/${patient.id}?mode=edit&section=intakeRecord`);
                } else {
                  if (patient.has_adl_file) {
                    navigate(`/adl/patient/${patient.id}`);
                  } else {
                    navigate(`/adl/new?patient_id=${patient.id}`);
                  }
                }
              }}
              className="flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium bg-purple-50 border-purple-300 text-purple-700 hover:bg-purple-100 hover:border-purple-400 transition-all hover:shadow-sm"
            >
              <FiClipboard className="w-3.5 h-3.5" />
              <span className="whitespace-nowrap">Intake Record</span>
            </Button>
            )}
            
            {/* Prescription Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const isChildPatient = patient.patient_type === 'child';
                const typeParam = isChildPatient ? '&patient_type=child' : '';
                navigate(`/prescriptions/create?patient_id=${patient.id}${typeParam}`);
              }}
              className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium bg-teal-50 border-teal-300 text-teal-700 hover:bg-teal-100 hover:border-teal-400 transition-all hover:shadow-sm"
            >
              <FiPlusCircle className="w-3.5 h-3.5" />
              <span className="whitespace-nowrap">Prescription</span>
            </Button>
            
            {/* Change Room Button - Opens room change dropdown */}
            {patient.assigned_room && availableRooms.length > 0 && (
              <div className="relative" ref={roomDropdownRef}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowRoomDropdown(!showRoomDropdown)}
                  className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium bg-orange-50 border-orange-300 text-orange-700 hover:bg-orange-100 hover:border-orange-400 transition-all hover:shadow-sm"
                >
                  <FiRepeat className="w-3.5 h-3.5" />
                  <span className="whitespace-nowrap">Change Room (Current: {patient.assigned_room})</span>
                </Button>
                
                {/* Room Change Dropdown */}
                {showRoomDropdown && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                    <h5 className="text-sm font-semibold text-gray-700 mb-2">Move Patient to Different Room</h5>
                    <select
                      value={selectedNewRoom}
                      onChange={(e) => setSelectedNewRoom(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 mb-2"
                      disabled={isChangingRoom}
                    >
                      <option value="">Select new room...</option>
                      {availableRooms
                        .filter(room => room.room_number !== patient.assigned_room)
                        .map(room => (
                          <option key={room.room_number} value={room.room_number}>
                            {room.room_number}{room.description ? ` - ${room.description}` : ''}
                          </option>
                        ))}
                    </select>
                    <div className="flex gap-2">
                      <button
                        onClick={handleRoomChange}
                        disabled={!selectedNewRoom || isChangingRoom}
                        className="flex-1 px-3 py-1.5 text-sm bg-orange-500 text-white rounded-md hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                      >
                        {isChangingRoom ? 'Moving...' : 'Move Patient'}
                      </button>
                      <button
                        onClick={() => {
                          setShowRoomDropdown(false);
                          setSelectedNewRoom('');
                        }}
                        className="px-3 py-1.5 text-sm bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      ⚠️ Patient will be moved to the new room and assigned to the doctor in that room (if any).
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Transfer within shared room — only on patients assigned to you */}
            {canShowTransferOnPatient && (
              <div className="relative" ref={transferDropdownRef}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (canTransferActive) {
                      setShowTransferDropdown(!showTransferDropdown);
                    }
                  }}
                  disabled={!canTransferActive}
                  className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium bg-sky-50 border-sky-300 text-sky-700 hover:bg-sky-100 hover:border-sky-400 transition-all hover:shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <FiUsers className="w-3.5 h-3.5" />
                  <span className="whitespace-nowrap">Share patient to Dr…</span>
                </Button>

                {!canTransferActive && (
                  <p className="text-xs text-amber-700 mt-1 px-1">
                    Waiting for another doctor to join {sharedRoomContext.room} today before you can transfer.
                  </p>
                )}

                {showTransferDropdown && canTransferActive && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                    <h5 className="text-sm font-semibold text-gray-700 mb-2">
                      Transfer patient to another doctor in {sharedRoomContext.room}
                    </h5>
                    <select
                      value={selectedTransferDoctorId}
                      onChange={(e) => setSelectedTransferDoctorId(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 mb-2"
                      disabled={isTransferringPatient}
                    >
                      <option value="">Select doctor...</option>
                      {sharedRoomContext.doctors.map((doc) => (
                        <option key={doc.doctor_id} value={String(doc.doctor_id)}>
                          Dr. {doc.doctor_name}
                        </option>
                      ))}
                    </select>
                    <div className="flex gap-2">
                      <button
                        onClick={handleTransferPatient}
                        disabled={!selectedTransferDoctorId || isTransferringPatient}
                        className="flex-1 px-3 py-1.5 text-sm bg-sky-600 text-white rounded-md hover:bg-sky-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                      >
                        {isTransferringPatient ? 'Transferring...' : 'Transfer'}
                      </button>
                      <button
                        onClick={() => {
                          setShowTransferDropdown(false);
                          setSelectedTransferDoctorId('');
                        }}
                        className="px-3 py-1.5 text-sm bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Target doctor must be sitting in the same shared room today.
                    </p>
                  </div>
                )}
              </div>
            )}
            
            {/* Mark as Completed Button - Show for all patients in today's list (not already completed) */}
            {shouldShowCompleteButton && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkCompleted}
                loading={isMarkingCompleted}
                className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium bg-gradient-to-r from-green-500 to-emerald-500 border-green-500 text-white hover:from-green-600 hover:to-emerald-600 hover:border-green-600 transition-all hover:shadow-md shadow-sm"
              >
                <FiCheck className="w-3.5 h-3.5" />
                <span className="whitespace-nowrap">Mark as Completed</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const ClinicalTodayPatients = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const dispatch = useDispatch();
  const currentUser = useSelector(selectCurrentUser);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [expandedAdminRooms, setExpandedAdminRooms] = useState(() => new Set());
  
  // Helper: get YYYY-MM-DD string in IST for any date-like input
  const toISTDateString = (dateInput) => {
    try {
      if (!dateInput) return '';
      // Handle both string and Date objects
      const d = new Date(dateInput);
      // Check if date is valid
      if (isNaN(d.getTime())) return '';
      return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); // YYYY-MM-DD
    } catch (_) {
      return '';
    }
  };
  
  // Check if user is a doctor (Faculty, Admin, or Resident)
  const isDoctor = currentUser && (isAdmin(currentUser.role) || isJrSr(currentUser.role));
  const isAdminUser = Boolean(currentUser && isAdmin(currentUser.role));
  
  // Get current room assignment - with polling to auto-refresh when new day starts
  const { data: myRoomData, isLoading: isLoadingRoom, refetch: refetchMyRoom } = useGetMyRoomQuery(undefined, {
    skip: !isDoctor,
    pollingInterval: 60000, // Poll every 60 seconds to detect new day and room assignment changes
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });
  
  // Room selection state and queries
  const { data: roomsData, isLoading: isLoadingRooms, refetch: refetchRooms } = useGetAvailableRoomsQuery(undefined, {
    skip: !isDoctor,
  });
  // Get all active rooms for room change dropdown
  const { data: allRoomsData } = useGetAllRoomsQuery({ page: 1, limit: 100, is_active: true }, {
    skip: !isDoctor,
  });
  const [selectRoom, { isLoading: isSelectingRoom }] = useSelectRoomMutation();
  const [clearRoom, { isLoading: isClearingRoom }] = useClearRoomMutation();
  
  // Room selection form state
  const [selectedRoom, setSelectedRoom] = useState('');
  const [assignmentTime, setAssignmentTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Helper function to format date for datetime-local input (local timezone)
  const formatLocalDateTime = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };
  
  // Helper function to check if room assignment is from today (IST)
  const isRoomAssignmentFromToday = (roomData) => {
    if (!roomData?.data?.room_assignment_time) {
      // If no assignment time but has a room, still check if room exists
      // This handles cases where room_assignment_time might be null but room is set
      if (roomData?.data?.current_room) {
        return true;
      }
      return false;
    }
    
    const assignmentDate = new Date(roomData.data.room_assignment_time);
    const today = new Date();
    
    // Compare dates (YYYY-MM-DD) in IST timezone
    const assignmentDateStr = assignmentDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const todayStr = today.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    
    const isToday = assignmentDateStr === todayStr;
    return isToday;
  };
  
  // Automatically clear room assignment if it's from a previous day
  useEffect(() => {
    if (isDoctor && !isLoadingRoom && myRoomData?.data?.current_room) {
      const isFromToday = isRoomAssignmentFromToday(myRoomData);
      if (!isFromToday) {
        // Room assignment is from a previous day, clear it automatically
        clearRoom()
          .unwrap()
          .then(() => {
            refetchMyRoom();
          })
          .catch((error) => {
            console.error('Failed to clear room assignment:', error);
          });
      }
    }
  }, [isDoctor, isLoadingRoom, myRoomData, clearRoom, refetchMyRoom]);
  
  // Get valid room data (only if from today)
  // Also check if current user's room is in occupied_rooms (means they have a room assigned)
  const validRoomData = myRoomData && isRoomAssignmentFromToday(myRoomData) 
    ? myRoomData 
    : null;
  
  // Check if user has a room assigned - be more lenient: if room exists in myRoomData, use it
  // This handles cases where date comparison might fail due to timezone issues
  const hasRoomAssigned = myRoomData?.data?.current_room && 
                          myRoomData.data.current_room !== null && 
                          myRoomData.data.current_room !== '';
  
  // Fallback: If myRoomData has a room but date check failed, check if it's in occupied_rooms
  // This handles timezone edge cases where the room is assigned but date comparison fails.
  // With multi-doctor rooms, the user may be one of several doctors – check the doctors array.
  const currentUserId = currentUser?.id ? parseInt(currentUser.id, 10) : null;
  const fallbackRoomInfo = roomsData?.data?.occupied_rooms?.[myRoomData?.data?.current_room];
  const imInFallbackRoom = fallbackRoomInfo
    ? (fallbackRoomInfo.doctors
        ? fallbackRoomInfo.doctors.some(d => d.doctor_id === currentUserId)
        : fallbackRoomInfo.doctor_id === currentUserId)
    : false;
  const fallbackRoomData = !validRoomData && hasRoomAssigned && imInFallbackRoom
    ? myRoomData
    : null;
  
  // Use validRoomData if available, otherwise use fallbackRoomData
  // If room exists in myRoomData but date check failed, still use it (handles timezone issues)
  const effectiveRoomData = validRoomData || fallbackRoomData || (hasRoomAssigned ? myRoomData : null);
  
  
  // Initialize room selection form - use effectiveRoomData (handles timezone edge cases)
  useEffect(() => {
    if (isDoctor && !isLoadingRoom) {
      // Use effectiveRoomData which handles timezone edge cases
      const roomToUse = effectiveRoomData?.data?.current_room;
      if (roomToUse) {
        setSelectedRoom(roomToUse);
        if (effectiveRoomData.data.room_assignment_time) {
          const existingTime = new Date(effectiveRoomData.data.room_assignment_time);
          setAssignmentTime(formatLocalDateTime(existingTime));
        } else {
          setAssignmentTime(formatLocalDateTime(new Date()));
        }
      } else {
        setSelectedRoom('');
        setAssignmentTime(formatLocalDateTime(new Date()));
      }
    }
  }, [isDoctor, isLoadingRoom, effectiveRoomData]);
  
  // Handle room selection submit
  const handleRoomSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedRoom) {
      toast.error('Please select a room');
      return;
    }
    
    // Check if selected room is disabled (at capacity)
    const selectedOption = allRoomOptions.find(opt => opt.value === selectedRoom);
    if (selectedOption && selectedOption.disabled) {
      toast.error(selectedOption.disabledReason || `Room ${selectedRoom} is full. Please select a different room.`);
      return;
    }
    
    setIsSubmitting(true);
    try {
      const result = await selectRoom({
        room_number: selectedRoom,
        assignment_time: new Date().toISOString(),
      }).unwrap();
      
      toast.success(result.message || `Room ${selectedRoom} selected successfully!`);
      
      // Refetch room data and invalidate cache
      await Promise.all([
        refetchMyRoom(),
        refetchRooms(),
        refetch(), // Refetch patients to show newly assigned patients
        dispatch(roomsApiSlice.util.invalidateTags(['Rooms', 'MyRoom', 'Patient']))
      ]);
      
      // Force a small delay to ensure state updates
      setTimeout(() => {
        refetchMyRoom();
        refetch();
      }, 500);
    } catch (error) {
      console.error('Room selection error:', error);
      toast.error(error?.data?.message || 'Failed to select room');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const [filters, setFilters] = useState({
    sex: '',
    age_group: '',
    marital_status: '',
    occupation: '',
    religion: '',
    family_type: '',
    locality: '',
    category: '',
    case_complexity: '',
  });

  // Get today's date in IST for backend filtering
  const todayIST = toISTDateString(selectedDate || new Date());

  const doctorRoomForApi =
    effectiveRoomData?.data?.current_room?.trim?.() ||
    effectiveRoomData?.data?.current_room ||
    null;
  // Faculty: request only patients in the selected room (Admin/MWO/Residents use other scoping)
  const shouldFilterPatientsByRoom =
    Boolean(doctorRoomForApi) &&
    isFacultyUser(currentUser) &&
    !isAdminUser &&
    !isMWO(currentUser?.role);
  
  // Fetch patients data - use a high limit (backend caps at 1000) to get all today's patients at once
  // Faculty pass assigned_room so the API returns only their room (not all rooms for the date)
  const { data, isLoading, isFetching, refetch, error } = useGetAllPatientsQuery({
    page: 1,
    limit: 1000,
    date: todayIST,
    ...(shouldFilterPatientsByRoom ? { assigned_room: doctorRoomForApi } : {}),
  }, {
    pollingInterval: 60000, // Increased from 30s to 60s to reduce API calls
    refetchOnMountOrArgChange: true,
    refetchOnFocus: false, // Disable auto-refetch on focus to reduce unnecessary calls
    refetchOnReconnect: true,
  });
  
  const handleMarkCompleted = () => {
    // Refetch to update the list after marking as completed
    refetch();
  };
  
  // Track previous location to detect navigation changes
  const prevLocationRef = useRef(location.pathname);
  
  // Refetch on mount to ensure fresh data when returning from patient creation
  useEffect(() => {
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount - refetch is stable from RTK Query
  
  useEffect(() => {
    // If we navigated away and came back, refetch the data
    if (prevLocationRef.current !== location.pathname && location.pathname === '/clinical-today-patients') {
      refetch();
    }
    prevLocationRef.current = location.pathname;
  }, [location.pathname, refetch]);
  
  // Refetch when window comes into focus (user returns to tab)
  useEffect(() => {
    const handleFocus = () => {
      refetch();
    };
    
    // Refetch when component becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        refetch();
      }
    };
    
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refetch]);

  // Room selection data - use today's distribution only (not historical)
  const rooms = roomsData?.data?.rooms || []; // ALL rooms (including occupied)
  const distribution = roomsData?.data?.distribution_today || {}; // Use today's distribution only
  const occupiedRooms = roomsData?.data?.occupied_rooms || {};
  const doctorRoom = effectiveRoomData?.data?.current_room?.trim?.() || effectiveRoomData?.data?.current_room || null;
  const activeRoomsList = (allRoomsData?.data?.rooms || []).filter((room) => room.is_active);
  const roomMeta = doctorRoom
    ? activeRoomsList.find((r) => String(r.room_number).trim() === String(doctorRoom).trim())
    : null;

  const getOccupiedInfoForRoom = (roomNumber) => {
    if (!roomNumber) return null;
    const trimmed = String(roomNumber).trim();
    if (occupiedRooms[trimmed]) return occupiedRooms[trimmed];
    const matchKey = Object.keys(occupiedRooms).find((k) => String(k).trim() === trimmed);
    return matchKey ? occupiedRooms[matchKey] : null;
  };

  const myRoomInfo = getOccupiedInfoForRoom(doctorRoom);
  const myRoomCapacity = parseInt(myRoomInfo?.capacity ?? roomMeta?.doctor_capacity ?? 1, 10);
  const myRoomDoctorsRaw =
    myRoomInfo?.doctors ??
    (myRoomInfo ? [{ doctor_id: myRoomInfo.doctor_id, doctor_name: myRoomInfo.doctor_name }] : []);
  const myRoomOtherDoctors = Array.isArray(myRoomDoctorsRaw)
    ? myRoomDoctorsRaw.filter(
        (d) => d?.doctor_id != null && parseInt(d.doctor_id, 10) !== currentUserId
      )
    : [];
  const isSharedRoom = Boolean(doctorRoom && myRoomCapacity > 1);
  const sharedRoomContext = isSharedRoom
    ? {
        room: doctorRoom,
        doctors: myRoomOtherDoctors,
        hasColleagues: myRoomOtherDoctors.length > 0,
      }
    : null;

  // Build a room option label for a room that may have 1 or many doctors.
  // occupiedRooms[room] shape: { capacity, doctors: [{doctor_id, doctor_name}], slots_remaining, doctor_id, doctor_name }
  const buildRoomOption = (room, totalPatients, forFallback = false) => {
    const info = occupiedRooms[room];
    const capacity = info?.capacity ?? 1;
    const doctors = info?.doctors ?? (info ? [{ doctor_id: info.doctor_id, doctor_name: info.doctor_name }] : []);
    const slotsRemaining = info?.slots_remaining ?? (info ? 0 : capacity);
    const atCapacity = info && slotsRemaining <= 0;
    const imInRoom = doctors.some(d => d.doctor_id === currentUserId);
    const isDisabled = atCapacity && !imInRoom;

    let occupancyLabel = '';
    if (info) {
      if (capacity > 1) {
        const names = doctors.map(d => `Dr. ${d.doctor_name}`).join(', ');
        occupancyLabel = ` - ${doctors.length}/${capacity}: ${names}${slotsRemaining > 0 ? ` (${slotsRemaining} slot${slotsRemaining !== 1 ? 's' : ''} left)` : ' — Full'}`;
      } else {
        occupancyLabel = ` - Assigned to ${doctors[0]?.doctor_name || 'Doctor'}`;
      }
    }

    let disabledReason;
    if (isDisabled) {
      disabledReason = capacity === 1
        ? `This room is already assigned to ${doctors[0]?.doctor_name || 'another doctor'}`
        : `Room is full (${doctors.length}/${capacity} doctors)`;
    }

    const myRoomLabel = imInRoom ? ' (Your room)' : '';
    const label = `${room} (${totalPatients} patient${totalPatients !== 1 ? 's' : ''} today)${occupancyLabel}${myRoomLabel}`;

    return { value: room, label, disabled: isDisabled, disabledReason };
  };

  // Create room options: disable only when room is at capacity and current user is not already in it
  const roomOptions = rooms.map(room => buildRoomOption(room, distribution[room] || 0));
  
  // If no rooms available, add default rooms
  const allRoomOptions = [...roomOptions];
  if (allRoomOptions.length === 0) {
    for (let i = 1; i <= 10; i++) {
      const roomName = `Room ${i}`;
      allRoomOptions.push(buildRoomOption(roomName, distribution[roomName] || 0, true));
    }
  }
  
  const allRoomsOccupied = allRoomOptions.every(room => room.disabled) && Object.keys(occupiedRooms).length > 0;
  
  // Whether to show the room selection card:
  // - Only for doctors (Admin/Faculty/Resident)
  // - Only when there are no patients in today's list yet
  //   (once patients appear, we hide the room selector to avoid duplicate context)
  const showRoomSelectionCard =
    isDoctor && !isAdminUser && !isLoadingRoom && !effectiveRoomData?.data?.current_room;

  // Room selection: always use current date/time (field is read-only)
  useEffect(() => {
    if (showRoomSelectionCard) {
      setAssignmentTime(formatLocalDateTime(new Date()));
    }
  }, [showRoomSelectionCard]);

  const filterTodayPatients = (patients) => {
    if (!Array.isArray(patients)) return [];

    const targetDate = toISTDateString(selectedDate || new Date());

    const filtered = patients.filter((patient) => {
      if (!patient) return false;

      // Show patients who were either:
      // 1. Created today (new patients registered by MWO), OR
      // 2. Updated today with an assigned_room (existing patients added to today's list)
      // This matches the backend query logic
      const patientCreatedDate = patient?.created_at ? toISTDateString(patient.created_at) : '';
      const createdToday = patientCreatedDate && patientCreatedDate === targetDate;
      
      // For existing patients added to today's list, check if they were updated today
      // and have an assigned_room (indicating they were added to today's list)
      const patientUpdatedDate = patient?.updated_at ? toISTDateString(patient.updated_at) : '';
      const updatedToday = patientUpdatedDate && patientUpdatedDate === targetDate;
      const hasAssignedRoom = patient?.assigned_room && patient.assigned_room.trim() !== '';
      
      // Include if:
      //   1. Created today (new patient registered by MWO), OR
      //   2. Updated today AND has an assigned room (existing patient added to today's list), OR
      //   3. has_visit_today flag set by backend (existing patient with a visit record for today)
      const hasVisitToday = patient?.has_visit_today === true;
      const shouldInclude = createdToday || (updatedToday && hasAssignedRoom) || hasVisitToday;

      return shouldInclude;
    });

    return filtered;
  };

  // Safely derive patients from API (handles both {data:{patients}} and {patients})
  const apiPatients = data?.data?.patients || data?.patients || [];
  const apiPagination = data?.data?.pagination || data?.pagination || undefined;


  // Deduplicate patients by ID to prevent duplicates
  // Use a Map to keep track of unique patients by their ID
  const uniquePatientsMap = new Map();
  apiPatients.forEach(patient => {
    if (patient?.id) {
      // If patient already exists, keep the first occurrence (or merge if needed)
      if (!uniquePatientsMap.has(patient.id)) {
        uniquePatientsMap.set(patient.id, patient);
      }
    }
  });
  const deduplicatedApiPatients = Array.from(uniquePatientsMap.values());

  // Helper function to determine if patient is new (created today AND no past history)
  // Note: This is a simplified check for the list view. The PatientRow component does a more detailed check
  // by fetching visit history and proformas. For the list view, we use a basic check.
  // Since we only show patients registered today, all patients here are registered today.
  const isNewPatientBasic = useCallback((patient) => {
    if (!patient?.created_at) return false;
    const targetDate = toISTDateString(selectedDate || new Date());
    const patientCreatedDate = toISTDateString(patient.created_at);
    return patientCreatedDate && patientCreatedDate === targetDate;
  }, [selectedDate]);

  // First filter by date (today's patients)
  const todayPatientsByDate = filterTodayPatients(deduplicatedApiPatients);

  // Filter out completed visits - only show patients with pending visits
  // Patients will only disappear when "Mark as Completed" button is clicked
  const todayPatientsNotCompleted = todayPatientsByDate.filter(patient => {
    // Show patient if visit_status is not 'completed' or if there's no visit_status (new patients)
    const isCompleted = patient.visit_status === 'completed';
    return !isCompleted;
  });

  // Then filter by role-based access (using the not-completed list)
  const todayPatients = todayPatientsNotCompleted.filter((p) => {
    // If no current user, show nothing (shouldn't happen in protected route, but safety check)
    if (!currentUser) {
      return false;
    }
    
    // Admin can see all patients
    if (isAdmin(currentUser.role)) return true;
    
    // MWO can see all patients created today (new patients)
    if (isMWO(currentUser.role)) {
      // MWO should see all patients - they register new patients
      return true;
    }
    
    const doctorRoom =
      effectiveRoomData?.data?.current_room?.trim?.() || effectiveRoomData?.data?.current_room;
    const targetDate = toISTDateString(selectedDate || new Date());
    const patientCreatedDate = p?.created_at ? toISTDateString(p.created_at) : '';
    const patientUpdatedDate = p?.updated_at ? toISTDateString(p.updated_at) : '';
    const createdToday = patientCreatedDate && patientCreatedDate === targetDate;
    const updatedToday = patientUpdatedDate && patientUpdatedDate === targetDate;
    const patientRoom = p.assigned_room?.trim?.() || p.assigned_room;
    const inMyRoom = doctorRoom && patientRoom && patientRoom === doctorRoom;

    // Faculty: all patients in today's selected room (including PWO registrations for residents)
    if (isFacultyUser(currentUser)) {
      if (!doctorRoom) return false;
      return (
        inMyRoom &&
        (createdToday || updatedToday || p.has_visit_today === true)
      );
    }

    // Residents (JR/SR): require today's room selection before any patient appears in the list
    if (currentUser.role === 'Resident') {
      const currentUserId = parseInt(currentUser.id, 10);
      if (!doctorRoom) {
        return false;
      }

      // Assigned to this doctor: show when in today's room or has a visit today
      if (p.assigned_doctor_id) {
        const patientDoctorId = parseInt(p.assigned_doctor_id, 10);
        if (!isNaN(patientDoctorId) && patientDoctorId === currentUserId) {
          if (p.has_visit_today === true || inMyRoom) {
            return true;
          }
        }
      }

      if (p.assigned_doctor) {
        const patientDoctorId = String(p.assigned_doctor);
        const currentUserIdStr = String(currentUser.id);
        if (patientDoctorId === currentUserIdStr && (p.has_visit_today === true || inMyRoom)) {
          return true;
        }
      }

      // Patient assigned to another doctor in this room — hide (shared room uses transfer, not shared queue)
      if (p.assigned_doctor_id) {
        const patientDoctorId = parseInt(p.assigned_doctor_id, 10);
        if (!isNaN(patientDoctorId) && patientDoctorId !== currentUserId) {
          return false;
        }
      }

      if (p.assigned_doctor_name && p.assigned_doctor_role && p.assigned_doctor_id && parseInt(p.assigned_doctor_id, 10) !== currentUserId) {
        return false;
      }

      // PWO-registered / unassigned patients in my room today (before or without doctor link)
      if ((createdToday || updatedToday || p.has_visit_today === true) && inMyRoom) {
        if (!p.assigned_doctor_id) {
          return true;
        }
      }

      // Otherwise, hide for residents
      return false;
    }
    
    // Other roles: default deny
    return false;
  });

  
  // Combine all today's patients (both new and existing) - they'll be color-coded
  const allTodayPatients = todayPatients;
  
  // Apply filters
  const filteredPatientsUnsorted = allTodayPatients.filter(patient => {
    return Object.entries(filters).every(([key, value]) => {
      if (!value) return true;
      return patient[key]?.toString().toLowerCase().includes(value.toLowerCase());
    });
  });

  // Sort patients: FIRST COME FIRST SERVE (FCFS) order
  // Patients who registered/arrived first appear at the top of the list
  const filteredPatients = [...filteredPatientsUnsorted].sort((a, b) => {
    const targetDateForSort = toISTDateString(selectedDate || new Date());

    // Get the relevant timestamp for FCFS ordering.
    // For existing patients added today via the follow-up flow their created_at is from a
    // previous date, so we use updated_at (set to now when the visit was created) to place
    // them correctly in today's queue.  For new patients we use created_at as usual.
    const getRegistrationTime = (patient) => {
      const patientCreatedDate = patient?.created_at
        ? toISTDateString(patient.created_at)
        : '';
      const isCreatedToday = patientCreatedDate === targetDateForSort;

      // Existing follow-up patient added today → order by when they were added to today's list
      if (!isCreatedToday && patient.updated_at) {
        return new Date(patient.updated_at).getTime();
      }
      // New patient registered today → order by registration time
      if (patient.created_at) {
        return new Date(patient.created_at).getTime();
      }
      // Fallback for patients with only a visit_date
      if (patient.visit_date) {
        return new Date(patient.visit_date).getTime();
      }
      // Last resort: use last_assigned_date
      if (patient.last_assigned_date) {
        return new Date(patient.last_assigned_date).getTime();
      }
      return Number.MAX_SAFE_INTEGER; // Put patients without dates at the end
    };

    const timeA = getRegistrationTime(a);
    const timeB = getRegistrationTime(b);
    
    // Sort ascending (oldest/first registered first) - FCFS order
    return timeA - timeB;
  });

  // Sub-tabs: New (registered today) vs Existing (follow-up / prior registration with visit today)
  const activePatientListTab = searchParams.get('tab') === 'existing' ? 'existing' : 'new';
  const setActivePatientListTab = useCallback(
    (tab) => {
      if (tab === 'existing') {
        setSearchParams({ tab: 'existing' }, { replace: true });
      } else {
        setSearchParams({}, { replace: true });
      }
    },
    [setSearchParams]
  );

  const newSubTabPatients = useMemo(
    () => filteredPatients.filter((p) => isNewPatientBasic(p)),
    [filteredPatients, isNewPatientBasic]
  );
  const existingSubTabPatients = useMemo(
    () => filteredPatients.filter((p) => !isNewPatientBasic(p)),
    [filteredPatients, isNewPatientBasic]
  );

  const patientsForActiveSubTab =
    activePatientListTab === 'existing' ? existingSubTabPatients : newSubTabPatients;

  const UNASSIGNED_ROOM_KEY = '__unassigned__';

  const adminRoomGroups = useMemo(() => {
    if (!isAdminUser) return [];

    const groupsMap = new Map();

    const buildGroupMeta = (roomKey) => {
      if (roomKey === UNASSIGNED_ROOM_KEY) {
        return {
          roomKey,
          roomLabel: 'No room assigned',
          capacity: 0,
          isShared: false,
          doctors: [],
          slotsRemaining: null,
        };
      }
      const info = getOccupiedInfoForRoom(roomKey);
      const roomMetaRow = activeRoomsList.find(
        (r) => String(r.room_number).trim() === roomKey
      );
      const capacity = parseInt(
        info?.capacity ?? roomMetaRow?.doctor_capacity ?? 1,
        10
      );
      const doctors =
        info?.doctors?.length > 0
          ? info.doctors
          : info?.doctor_id
            ? [{ doctor_id: info.doctor_id, doctor_name: info.doctor_name }]
            : [];
      return {
        roomKey,
        roomLabel: roomKey,
        capacity,
        isShared: capacity > 1,
        doctors,
        slotsRemaining: info?.slots_remaining ?? null,
      };
    };

    const ensureGroup = (roomKey) => {
      if (!groupsMap.has(roomKey)) {
        groupsMap.set(roomKey, {
          ...buildGroupMeta(roomKey),
          patients: [],
        });
      }
      return groupsMap.get(roomKey);
    };

    filteredPatients.forEach((patient) => {
      const roomRaw = patient?.assigned_room?.trim?.() || patient?.assigned_room || '';
      const roomKey = roomRaw ? String(roomRaw).trim() : UNASSIGNED_ROOM_KEY;
      ensureGroup(roomKey).patients.push(patient);
    });

    return [...groupsMap.values()]
      .filter((group) => group.patients.length > 0)
      .sort((a, b) => {
        if (a.roomKey === UNASSIGNED_ROOM_KEY) return 1;
        if (b.roomKey === UNASSIGNED_ROOM_KEY) return -1;
        return a.roomLabel.localeCompare(b.roomLabel, undefined, { numeric: true });
      });
  }, [
    isAdminUser,
    filteredPatients,
    allRoomsData,
    activeRoomsList,
    occupiedRooms,
  ]);

  const toggleAdminRoomExpanded = useCallback((roomKey) => {
    setExpandedAdminRooms((prev) => {
      const next = new Set(prev);
      if (next.has(roomKey)) next.delete(roomKey);
      else next.add(roomKey);
      return next;
    });
  }, []);

  const expandAllAdminRooms = useCallback(() => {
    setExpandedAdminRooms(new Set(adminRoomGroups.map((g) => g.roomKey)));
  }, [adminRoomGroups]);

  const collapseAllAdminRooms = useCallback(() => {
    setExpandedAdminRooms(new Set());
  }, []);

  // Follow-up search must be available even when today's list is empty (e.g. after selecting a room, before first patient).
  const showExistingPatientButton =
    activePatientListTab === 'existing' &&
    (isMWO(currentUser?.role) || (isDoctor && Boolean(effectiveRoomData?.data?.current_room)));

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-primary-100 border-t-primary-600 rounded-full animate-spin mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <FiUsers className="w-8 h-8 text-primary-600" />
            </div>
          </div>
          <p className="mt-6 text-gray-600 font-medium text-lg">Loading today's patients...</p>
          <p className="mt-2 text-gray-500 text-sm">Please wait while we fetch the data</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-24 h-24 bg-gradient-to-br from-red-100 to-rose-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <FiShield className="w-12 h-12 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Patients</h2>
          <p className="text-gray-600 mb-6">{error?.data?.message || 'Failed to load patients'}</p>
          <Button 
            onClick={() => refetch()} 
            className="bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 shadow-lg"
          >
            <FiRefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">

      <div className="w-full px-4 sm:px-6 lg:px-8 space-y-6 py-6">
      
        {/* Admin: compact entry point — full UI opens in side panel */}
        {isAdmin(currentUser?.role) && (
          <AdminDoctorRoomManager
            refetch={refetch}
            refetchRooms={refetchRooms}
          />
        )}

        {/* Patients List */}
        <Card className="shadow-lg border border-gray-200/50 bg-white/90 backdrop-blur-sm">
          <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-slate-50">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-lg font-semibold text-gray-900">Today&apos;s Patients</h3>
                    <span className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                      {showRoomSelectionCard
                        ? 'Select room below to see patients'
                        : isAdminUser
                          ? `${filteredPatients.length} today · ${newSubTabPatients.length} new · ${existingSubTabPatients.length} existing`
                          : `Total ${filteredPatients.length}`}
                    </span>
                    {isDoctor && effectiveRoomData?.data?.current_room && (
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg border border-blue-200">
                        <FiHome className="w-4 h-4" />
                        <span className="text-sm font-medium">Room: {effectiveRoomData.data.current_room}</span>
                      </div>
                    )}
                  </div>
                  {isAdminUser && (
                    <p className="text-sm text-gray-600 max-w-3xl">
                      Overview of every active room: doctors on duty today, shared vs single-doctor rooms,
                      and all new and existing patients registered or seen today.
                    </p>
                  )}
                  {(isJuniorResidentUser(currentUser) || isSeniorResidentUser(currentUser)) && (
                    <p className="text-sm text-gray-600 max-w-3xl">
                      Junior and Senior Residents may complete both{' '}
                      <strong>Clinical Proforma</strong> and <strong>Intake Record</strong> as required for each patient.
                    </p>
                  )}
                  {/* New vs Existing sub-tabs — hidden for admin (room view shows both) */}
                  {!isAdminUser && (
                  <div
                    className="flex gap-2 border-b border-gray-200 -mx-6 px-6"
                    role="tablist"
                    aria-label="Today patients category"
                  >
                    <button
                      type="button"
                      role="tab"
                      aria-selected={activePatientListTab === 'new'}
                      aria-current={activePatientListTab === 'new' ? 'page' : undefined}
                      onClick={() => setActivePatientListTab('new')}
                      className={`inline-flex items-center gap-2 px-6 py-3 font-semibold text-sm transition-all duration-200 border-b-2 ${
                        activePatientListTab === 'new'
                          ? 'border-primary-600 text-primary-600 bg-primary-50'
                          : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      New Patients
                      <span
                        className={`min-w-[1.5rem] px-1.5 py-0.5 rounded-full text-xs font-bold ${
                          activePatientListTab === 'new'
                            ? 'bg-primary-600 text-white'
                            : 'bg-gray-200 text-gray-700'
                        }`}
                      >
                        {newSubTabPatients.length}
                      </span>
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={activePatientListTab === 'existing'}
                      aria-current={activePatientListTab === 'existing' ? 'page' : undefined}
                      onClick={() => setActivePatientListTab('existing')}
                      className={`inline-flex items-center gap-2 px-6 py-3 font-semibold text-sm transition-all duration-200 border-b-2 ${
                        activePatientListTab === 'existing'
                          ? 'border-primary-600 text-primary-600 bg-primary-50'
                          : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      Existing Patients
                      <span
                        className={`min-w-[1.5rem] px-1.5 py-0.5 rounded-full text-xs font-bold ${
                          activePatientListTab === 'existing'
                            ? 'bg-primary-600 text-white'
                            : 'bg-gray-200 text-gray-700'
                        }`}
                      >
                        {existingSubTabPatients.length}
                      </span>
                    </button>
                  </div>
                  )}
                </div>
                {/* Add returning patient — Existing tab; doctors need today&apos;s room, MWO always */}
                {showExistingPatientButton && (
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        onClick={() => setIsSearchModalOpen(true)}
                        className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
                        size="sm"
                      >
                        <FiUserPlus className="w-4 h-4 mr-2" />
                        Existing Patient
                      </Button>
                    </div>
                  )}
              </div>
            </div>
          </div>

          {/* Room selection card: shown in both New and Existing sub-tabs whenever the doctor has not yet picked today's room */}
          {showRoomSelectionCard && (
            <div className="space-y-6">
              <Card id="room-selection-card" className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200">
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                        <FiHome className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800">Select Your Room for Today</h3>
                        <p className="text-sm text-gray-600">Room selection is required each day. Choose any room that still has available capacity. Rooms marked as shared can accommodate multiple doctors simultaneously.</p>
                        <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <p className="text-xs text-yellow-800 font-medium">
                            ⚠️ Important: Room selection is day-specific. Yesterday's room assignment does not carry over. Please select your room for today.
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <form onSubmit={handleRoomSubmit} className="space-y-4 mt-6">
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                          <FiHome className="w-4 h-4 text-blue-600" />
                          Which room are you sitting in today? <span className="text-red-500">*</span>
                        </label>
                        {allRoomsOccupied ? (
                          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <p className="text-sm text-yellow-800">
                              All rooms are currently assigned to other doctors. Please contact the administrator or wait for a room to become available.
                            </p>
                          </div>
                        ) : (
                          <>
                            <Select
                              name="room"
                              value={selectedRoom}
                              onChange={(e) => {
                                const selectedOption = allRoomOptions.find(opt => opt.value === e.target.value);
                                // Only allow selection if room is not disabled
                                if (selectedOption && !selectedOption.disabled) {
                                  setSelectedRoom(e.target.value);
                                }
                              }}
                              options={allRoomOptions}
                              placeholder="Select room"
                              searchable={true}
                              disabled={isLoadingRooms}
                              className="bg-white border-2 border-gray-300"
                            />
                            {selectedRoom && distribution[selectedRoom] !== undefined && (
                              <p className="text-xs text-gray-500 mt-1">
                                {distribution[selectedRoom]} patient{distribution[selectedRoom] !== 1 ? 's' : ''} assigned to this room today
                              </p>
                            )}
                            {Object.keys(occupiedRooms).length > 0 && (
                              <p className="text-xs text-gray-500 mt-1 italic">
                                Rooms at full capacity are disabled. Shared rooms with remaining slots are still selectable.
                              </p>
                            )}
                            <p className="text-xs text-gray-500 mt-1 italic">
                              You can select any free room, even if no patients are registered there yet today (for example walk-ins).
                            </p>
                          </>
                        )}
                      </div>
                      
                      <CustomDateTimePicker
                        label="What time did you start sitting in this room?"
                        icon={FiClock}
                        value={assignmentTime}
                        onChange={() => {}}
                        required
                        disabled
                      />
                      
                      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                        <Button
                          type="submit"
                          loading={isSubmitting || isSelectingRoom}
                          disabled={isSubmitting || isSelectingRoom || !selectedRoom || !assignmentTime || allRoomsOccupied || (selectedRoom && allRoomOptions.find(opt => opt.value === selectedRoom)?.disabled)}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <FiCheck className="mr-2" />
                          Select Room
                        </Button>
                      </div>
                    </form>
                    
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-xs text-blue-800">
                        <strong>Note:</strong> Rooms with a capacity of 1 can only be selected by one doctor. In shared rooms (capacity 2+), the first doctor to select the room receives today's patients; other doctors join with an empty list until patients are transferred to them.
                        Any patients already tied to an empty room for today will be assigned to you when you confirm.
                      </p>
                    </div>
                  </div>
                </Card>
            </div>
          )}

          {/* Patients list or empty state — hidden until today's room is selected (JR/SR) */}
          {!showRoomSelectionCard && filteredPatients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-6">
                <FiUsers className="w-12 h-12 text-gray-400" />
              </div>
              <p className="text-xl font-semibold text-gray-700 mb-2">No patients found</p>
              <p className="text-gray-500 text-center max-w-md">
                {Object.values(filters).some(f => f) 
                  ? 'No patients match the current filters for today.'
                  : 'No patients were registered or have visits scheduled for today.'
                }
              </p>
            </div>
          ) : !showRoomSelectionCard && !isAdminUser && patientsForActiveSubTab.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-4">
                <FiUsers className="w-10 h-10 text-gray-400" />
              </div>
              <p className="text-lg font-semibold text-gray-700 mb-2">
                {activePatientListTab === 'new'
                  ? 'No new patients for today'
                  : 'No existing patients for today'}
              </p>
              <p className="text-gray-500 text-center max-w-md text-sm">
                {activePatientListTab === 'new'
                  ? 'New registrations for today will appear here. Use the Existing Patients tab for follow-up visits.'
                  : 'Returning patients and follow-ups appear here once added to today\'s list.'}
              </p>
              {activePatientListTab === 'new' && existingSubTabPatients.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActivePatientListTab('existing')}
                  className="mt-4 text-sm font-semibold text-emerald-700 hover:text-emerald-800 underline"
                >
                  Go to Existing Patients ({existingSubTabPatients.length})
                </button>
              )}
              {activePatientListTab === 'existing' && newSubTabPatients.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActivePatientListTab('new')}
                  className="mt-4 text-sm font-semibold text-blue-700 hover:text-blue-800 underline"
                >
                  Go to New Patients ({newSubTabPatients.length})
                </button>
              )}
            </div>
          ) : !showRoomSelectionCard && isAdminUser ? (
            <div className="p-4 sm:p-5 space-y-4" role="tabpanel" aria-label="Today patients by room">
              {adminRoomGroups.length > 0 && (
                <div className="flex flex-wrap items-center justify-end gap-2 pb-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={expandAllAdminRooms}
                    className="text-xs"
                  >
                    <FiMaximize2 className="w-3.5 h-3.5 mr-1.5" />
                    Expand all
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={collapseAllAdminRooms}
                    className="text-xs"
                  >
                    <FiMinimize2 className="w-3.5 h-3.5 mr-1.5" />
                    Collapse all
                  </Button>
                </div>
              )}
              {adminRoomGroups.map((group) => {
                const newCount = group.patients.filter((p) => isNewPatientBasic(p)).length;
                const existingCount = group.patients.length - newCount;
                const doctorLabel =
                  group.doctors.length > 0
                    ? group.doctors.map((d) => d.doctor_name).join(', ')
                    : 'No doctor assigned today';
                const isCollapsed = !expandedAdminRooms.has(group.roomKey);

                return (
                  <section
                    key={group.roomKey}
                    className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => toggleAdminRoomExpanded(group.roomKey)}
                      className={`w-full px-4 py-3 sm:px-5 sm:py-4 bg-gradient-to-r from-slate-50 to-blue-50/40 text-left transition-colors hover:from-slate-100 hover:to-blue-50/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset ${
                        isCollapsed ? '' : 'border-b border-gray-200'
                      }`}
                      aria-expanded={!isCollapsed}
                      aria-controls={`admin-room-panel-${group.roomKey}`}
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                            <FiHome className="w-5 h-5 text-blue-700" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-base font-bold text-gray-900">{group.roomLabel}</h4>
                            <p className="text-sm text-gray-600 mt-0.5">
                              <span className="font-medium">Doctor{group.doctors.length !== 1 ? 's' : ''}:</span>{' '}
                              {doctorLabel}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 shrink-0 sm:pl-2">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                              group.isShared
                                ? 'bg-violet-100 text-violet-800 border-violet-200'
                                : 'bg-gray-100 text-gray-700 border-gray-200'
                            }`}
                          >
                            {group.roomKey === UNASSIGNED_ROOM_KEY
                              ? 'Unassigned'
                              : group.isShared
                                ? `Shared room (${group.capacity} doctors)`
                                : 'Single doctor room'}
                          </span>
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-white border border-gray-200 text-gray-800">
                            {group.patients.length} patient{group.patients.length !== 1 ? 's' : ''}
                          </span>
                          {newCount > 0 && (
                            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                              {newCount} new
                            </span>
                          )}
                          {existingCount > 0 && (
                            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-200">
                              {existingCount} existing
                            </span>
                          )}
                          <span
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 bg-white text-gray-600"
                            aria-hidden
                          >
                            {isCollapsed ? (
                              <FiChevronDown className="w-5 h-5" />
                            ) : (
                              <FiChevronUp className="w-5 h-5" />
                            )}
                          </span>
                        </div>
                      </div>
                    </button>
                    {!isCollapsed && (
                      <div
                        id={`admin-room-panel-${group.roomKey}`}
                        className="p-3 sm:p-4 space-y-3"
                      >
                        {group.patients.map((patient) => (
                          <PatientRow
                            key={`${group.roomKey}-${patient.id}`}
                            patient={patient}
                            listContext={isNewPatientBasic(patient) ? 'new' : 'existing'}
                            navigate={navigate}
                            onMarkCompleted={handleMarkCompleted}
                            onRoomChanged={handleMarkCompleted}
                            availableRooms={activeRoomsList}
                            sharedRoomContext={null}
                          />
                        ))}
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          ) : !showRoomSelectionCard ? (
            <div className="p-4 sm:p-5 space-y-3" role="tabpanel">
              {patientsForActiveSubTab.map((patient) => (
                <PatientRow
                  key={patient.id}
                  patient={patient}
                  listContext={activePatientListTab}
                  navigate={navigate}
                  onMarkCompleted={handleMarkCompleted}
                  onRoomChanged={handleMarkCompleted}
                  availableRooms={(allRoomsData?.data?.rooms || []).filter(room => room.is_active)}
                  sharedRoomContext={sharedRoomContext}
                />
              ))}
            </div>
          ) : null}

          {/* Patient count info - reflects active sub-tab */}
          {filteredPatients.length > 0 &&
            (isAdminUser || patientsForActiveSubTab.length > 0) && (
            <div className="px-6 py-5 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-slate-50">
              <div className="text-sm text-gray-700 font-medium">
                {isAdminUser ? (
                  <>
                    <span className="font-semibold text-gray-900">{filteredPatients.length}</span> patient
                    {filteredPatients.length !== 1 ? 's' : ''} today across{' '}
                    <span className="font-semibold text-gray-900">{adminRoomGroups.length}</span>{' '}
                    room{adminRoomGroups.length !== 1 ? 's' : ''}
                    <span className="ml-3 text-blue-600 font-semibold">{newSubTabPatients.length} new</span>
                    <span className="mx-1 text-gray-400">/</span>
                    <span className="text-green-600 font-semibold">{existingSubTabPatients.length} existing</span>
                  </>
                ) : (
                  <>
                    Showing{' '}
                    <span className="font-semibold text-gray-900">{patientsForActiveSubTab.length}</span> patient
                    {patientsForActiveSubTab.length !== 1 ? 's' : ''}{' '}
                    <span className="text-gray-500">
                      ({activePatientListTab === 'new' ? 'New Patients' : 'Existing Patients'})
                    </span>
                    <span className="ml-3 text-gray-500">
                      · Total today{' '}
                      <span className="font-semibold text-gray-800">{filteredPatients.length}</span>
                      <span className="text-blue-600 font-semibold ml-1">{newSubTabPatients.length} new</span>
                      <span className="mx-1 text-gray-400">/</span>
                      <span className="text-green-600 font-semibold">{existingSubTabPatients.length} existing</span>
                    </span>
                  </>
                )}
              </div>
            </div>
          )}
        </Card>

        {/* Search Existing Patient Modal */}
        <SearchExistingPatientModal
          isOpen={isSearchModalOpen}
          onClose={() => setIsSearchModalOpen(false)}
          currentRoom={effectiveRoomData?.data?.current_room || ''}
          onSelectPatient={async () => {
            // Patient was added to today's list (adult via visit record, child via room update).
            // The createPatient / addChildPatientToTodayList mutations already invalidate the
            // date-specific RTK Query cache tag; this explicit invalidation + refetch is a
            // belt-and-suspenders guard to guarantee an immediate UI update.
            try {
              dispatch(patientsApiSlice.util.invalidateTags([
                'Patient',
                'ChildPatient',
                { type: 'Patient', id: 'LIST' },
                { type: 'ChildPatient', id: 'LIST' },
                { type: 'Patient', id: `LIST-${todayIST}` },
              ]));
              await refetch();
            } catch (error) {
              console.error('[ClinincalTodayPatients] Failed to refetch patients after adding existing patient:', error);
              refetch();
            }
          }}
        />
      </div>
    </div>
  );
};


export default ClinicalTodayPatients;
