import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { 
  FiUser, FiPhone,  FiClock, FiEye,
  FiRefreshCw, FiPlusCircle, FiFileText, FiUsers,  FiShield, FiCheck, FiHome
} from 'react-icons/fi';
import { useGetAllPatientsQuery, useMarkVisitCompletedMutation, useGetPatientVisitHistoryQuery } from '../../features/patients/patientsApiSlice';
import { useGetClinicalProformaByPatientIdQuery } from '../../features/clinical/clinicalApiSlice';
import { useGetMyRoomQuery, useGetAvailableRoomsQuery, useSelectRoomMutation, useClearRoomMutation, roomsApiSlice } from '../../features/rooms/roomsApiSlice';
import { useDispatch } from 'react-redux';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Select from '../../components/Select';
// Removed RoomSelectionModal - using inline card instead
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../../features/auth/authSlice';
import { isAdmin, isMWO, isJrSr, isSR, isJR } from '../../utils/constants';

// Component to check for existing proforma and render patient row
const PatientRow = ({ patient, isNewPatient: propIsNewPatient, navigate, onMarkCompleted }) => {
  const [markCompleted, { isLoading: isMarkingCompleted }] = useMarkVisitCompletedMutation();
  const { data: proformaData, isLoading: isLoadingProformas, refetch: refetchProformas } = useGetClinicalProformaByPatientIdQuery(
    patient.id, 
    { 
      skip: !patient.id,
      refetchOnMountOrArgChange: true,
      refetchOnFocus: true,
      refetchOnReconnect: true,
    }
  );
  
  // Fetch visit history to check for past visits
  const { data: visitHistoryData } = useGetPatientVisitHistoryQuery(
    patient.id,
    { skip: !patient.id }
  );
  
  const handleMarkCompleted = async () => {
    try {
      await markCompleted({ patient_id: patient.id }).unwrap();
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

  // Get visit history and proformas
  const visitHistory = visitHistoryData?.visitHistory || [];
  const proformas = proformaData?.data?.proformas || [];
  
  // Filter out today's visits from history to get only past visits
  const todayDateString = toISTDateString(new Date());
  const pastVisitHistory = visitHistory.filter(visit => {
    const visitDate = toISTDateString(visit.visit_date);
    return visitDate && visitDate !== todayDateString;
  });
  
  // Filter out today's proformas to get only past proformas
  const pastProformas = proformas.filter(proforma => {
    const proformaDate = toISTDateString(proforma.visit_date || proforma.created_at);
    return proformaDate && proformaDate !== todayDateString;
  });

  // Check if patient has actual past history (not including today's visits/proformas)
  const hasPastHistory = pastVisitHistory.length > 0 || pastProformas.length > 0;

  // Determine if patient is truly new: created today AND has no past history
  const isNewPatient = isPatientCreatedToday() && !hasPastHistory;
  
  // Check if visit is already completed
  const isCompleted = patient.visit_status === 'completed';
  
  // Show "Mark as Completed" button for ALL patients in today's list
  // Since patients are already filtered to show only today's patients (created today OR has visit today),
  // we should show the button for all of them, except those already completed
  // This ensures the button appears for both new patients and existing patients with visits
  const shouldShowCompleteButton = !isCompleted;
  
  // Refetch proformas when component becomes visible (e.g., after returning from deletion)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && patient.id) {
        refetchProformas();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [patient.id, refetchProformas]);

  const hasExistingProforma = proformas.length > 0;
  const latestProformaId = hasExistingProforma ? proformas[0].id : null;
  
  // Check if patient has a proforma created today
  const hasProformaToday = proformas.some(proforma => {
    const proformaDate = toISTDateString(proforma.created_at || proforma.visit_date || proforma.date);
    return proformaDate === todayDateString;
  });
  
  // Note: We no longer hide patients with proformas today - they should still be visible in the list
  // This allows users to view/edit proformas or create additional ones if needed

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
              <span className="text-gray-500">Room: <span className="font-medium text-gray-700">{patient.assigned_room}</span></span>
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

        {/* Action Buttons Section - More Compact */}
        <div className="lg:w-auto shrink-0">
          <div className="flex flex-row lg:flex-col gap-2">
            {/* View Details Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/patients/${patient.id}?edit=false&mode=view`)}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all hover:shadow-sm"
            >
              <FiEye className="w-3.5 h-3.5" />
              <span className="whitespace-nowrap">View Details</span>
            </Button>
            
            {/* Walk-in Clinical Proforma Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigate(`/patients/${patient.id}?edit=true&mode=create`)
              }}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100 hover:border-blue-400 transition-all hover:shadow-sm"
            >
              <FiPlusCircle className="w-3.5 h-3.5" />
              <span className="whitespace-nowrap">Walk-in Clinical Proforma</span>
            </Button>
            
            {/* Prescribe Medication Button */}
            {/* <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/prescriptions/create?patient_id=${patient.id}`)}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium bg-purple-50 border-purple-300 text-purple-700 hover:bg-purple-100 hover:border-purple-400 transition-all hover:shadow-sm"
            >
              <FiPlusCircle className="w-3.5 h-3.5" />
            </Button> */}
            
            {/* Mark as Completed Button - Show for all patients in today's list (not already completed) */}
            {shouldShowCompleteButton && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkCompleted}
                loading={isMarkingCompleted}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium bg-gradient-to-r from-green-500 to-emerald-500 border-green-500 text-white hover:from-green-600 hover:to-emerald-600 hover:border-green-600 transition-all hover:shadow-md shadow-sm"
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
  const dispatch = useDispatch();
  const currentUser = useSelector(selectCurrentUser);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Check if user is a doctor (Faculty, Admin, or Resident)
  const isDoctor = currentUser && (isAdmin(currentUser.role) || isSR(currentUser.role) || isJR(currentUser.role));
  
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
  // This handles timezone edge cases where the room is assigned but date comparison fails
  // Also check if the current user's ID matches the doctor_id in occupied_rooms
  const currentUserId = currentUser?.id ? parseInt(currentUser.id, 10) : null;
  const fallbackRoomData = !validRoomData && hasRoomAssigned && 
    roomsData?.data?.occupied_rooms?.[myRoomData.data.current_room]?.doctor_id === currentUserId
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
    
    // Check if selected room is disabled (occupied)
    const selectedOption = allRoomOptions.find(opt => opt.value === selectedRoom);
    if (selectedOption && selectedOption.disabled) {
      toast.error(`Room ${selectedRoom} is already assigned to another doctor. Please select a different room.`);
      return;
    }
    
    if (!assignmentTime) {
      toast.error('Please select assignment time');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const result = await selectRoom({
        room_number: selectedRoom,
        assignment_time: new Date(assignmentTime).toISOString(),
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

  // Fetch patients data - use a high limit to get all today's patients at once
  // This ensures newly created patients appear immediately
  const { data, isLoading, isFetching, refetch, error } = useGetAllPatientsQuery({
    page: 1,
    limit: 100, // Reduced from 1000 - use server-side filtering instead
    // Filter for today's patients on backend if possible
    // search: search.trim() || undefined // Only include search if it has a value
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
  
  // Create room options with disabled state for occupied rooms
  // Note: distribution_today shows patients created today OR with visits today
  // We'll show the count but clarify in the UI that it includes both new and existing patients
  const roomOptions = rooms.map(room => {
    const totalPatients = distribution[room] || 0; // This shows today's patients (new + existing with visits)
    const isOccupied = occupiedRooms[room] !== undefined;
    const occupiedBy = isOccupied ? occupiedRooms[room]?.doctor_name : null;
    
    // Check if this is the current user's room
    const isMyRoom = validRoomData?.data?.current_room === room;
    
    return {
      value: room,
      label: `${room} (${totalPatients} patient${totalPatients !== 1 ? 's' : ''} today)${isOccupied ? ` - Assigned to ${occupiedBy || 'Doctor'}` : ''}${isMyRoom ? ' (Your room)' : ''}`,
      disabled: isOccupied && !isMyRoom, // Don't disable if it's the current user's room
      disabledReason: isOccupied && !isMyRoom ? `This room is already assigned to ${occupiedBy || 'another doctor'}` : undefined,
    };
  });
  
  // If no rooms available, add default rooms
  const allRoomOptions = [...roomOptions];
  if (allRoomOptions.length === 0) {
    for (let i = 1; i <= 10; i++) {
      const roomName = `Room ${i}`;
      const isOccupied = occupiedRooms[roomName] !== undefined;
      const occupiedBy = isOccupied ? occupiedRooms[roomName]?.doctor_name : null;
      
      allRoomOptions.push({
        value: roomName,
        label: `${roomName} (0 patients)${isOccupied ? ` - Assigned to ${occupiedBy || 'Doctor'}` : ''}`,
        disabled: isOccupied,
        disabledReason: isOccupied ? `This room is already assigned to ${occupiedBy || 'another doctor'}` : undefined,
      });
    }
  }
  
  const allRoomsOccupied = allRoomOptions.every(room => room.disabled) && Object.keys(occupiedRooms).length > 0;
  
  const hasNoRoom = isDoctor && !isLoadingRoom && !effectiveRoomData?.data?.current_room;
  


 

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

  const filterTodayPatients = (patients) => {
    if (!Array.isArray(patients)) return [];

    const targetDate = toISTDateString(selectedDate || new Date());

    return patients.filter((patient) => {
      if (!patient) return false;

      // Check if patient was created today - be more lenient with date comparison
      const patientCreatedDate = patient?.created_at ? toISTDateString(patient.created_at) : '';
      const createdToday = patientCreatedDate && patientCreatedDate === targetDate;

      // Check if patient has a visit today (from latest assignment date, visit date, or has_visit_today flag)
      const hasVisitToday = patient?.has_visit_today === true ||
        (patient?.last_assigned_date && 
        toISTDateString(patient.last_assigned_date) === targetDate) ||
        (patient?.visit_date && 
        toISTDateString(patient.visit_date) === targetDate);

      // Patient appears if created today OR has visit today
      // Show all patients created today regardless of who created them
      // The role-based filtering happens later in the component
      return createdToday || hasVisitToday;
    });
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
  const isNewPatientBasic = (patient) => {
    if (!patient?.created_at) return false;
    const targetDate = toISTDateString(selectedDate || new Date());
    const patientCreatedDate = toISTDateString(patient.created_at);
    return patientCreatedDate && patientCreatedDate === targetDate;
  };

  // For existing patient check: has visit today OR was not created today
  // The PatientRow component will do a more accurate check using actual history data
  const isExistingPatientBasic = (patient) => {
    const targetDate = toISTDateString(selectedDate || new Date());
    const hasVisitToday = patient?.has_visit_today === true ||
      (patient?.last_assigned_date && 
      toISTDateString(patient.last_assigned_date) === targetDate) ||
      (patient?.visit_date && 
      toISTDateString(patient.visit_date) === targetDate);
    
    // Existing patient: has visit today but NOT created today
    const patientCreatedDate = patient?.created_at ? toISTDateString(patient.created_at) : '';
    const createdToday = patientCreatedDate && patientCreatedDate === targetDate;
    
    return hasVisitToday && !createdToday;
  };

  // First filter by date (today's patients)
  const todayPatientsByDate = filterTodayPatients(deduplicatedApiPatients);
  
  // Filter out completed visits - only show patients with pending visits
  // Patients will only disappear when "Mark as Completed" button is clicked
  const todayPatientsNotCompleted = todayPatientsByDate.filter(patient => {
    // Show patient if visit_status is not 'completed' or if there's no visit_status (new patients)
    return patient.visit_status !== 'completed';
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
    
    // Only allow JR/SR to see patients assigned to them
    if (isJrSr(currentUser.role)) {
      // Prefer direct field; fallback to latest assignment fields if present
      if (p.assigned_doctor_id) {
        // Both IDs are integers
        const patientDoctorId = parseInt(p.assigned_doctor_id, 10);
        const currentUserId = parseInt(currentUser.id, 10);
        return patientDoctorId === currentUserId;
      }
      if (p.assigned_doctor) {
        const patientDoctorId = String(p.assigned_doctor);
        const currentUserId = String(currentUser.id);
        return patientDoctorId === currentUserId;
      }
      if (p.assigned_doctor_name && p.assigned_doctor_role) {
        // If role exists but id missing, be conservative: hide
        return false;
      }
      // If no assignment info present, hide for doctors
      return false;
    }
    
    // Other roles: default deny
    return false;
  });

  
  // Combine all today's patients (both new and existing) - they'll be color-coded
  const allTodayPatients = todayPatients;
  
  const filteredPatients = allTodayPatients.filter(patient => {
    return Object.entries(filters).every(([key, value]) => {
      if (!value) return true;
      return patient[key]?.toString().toLowerCase().includes(value.toLowerCase());
    });
  });



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
      
        {/* Current Room Assignment Card - Show if doctor has selected a room TODAY */}
        {isDoctor && !isLoadingRoom && effectiveRoomData?.data?.current_room && effectiveRoomData.data.current_room !== null && effectiveRoomData.data.current_room !== '' && (
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200">
            <div className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                  <FiHome className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Current Room Assignment</p>
                  <p className="text-lg font-semibold text-gray-800">
                    Room: {effectiveRoomData.data.current_room}
                  </p>
                  {effectiveRoomData.data.room_assignment_time && (
                    <p className="text-xs text-gray-500 mt-1">
                      Assigned at: {new Date(effectiveRoomData.data.room_assignment_time).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Patients List */}
        <Card className="shadow-lg border border-gray-200/50 bg-white/90 backdrop-blur-sm">
          <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-slate-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
              <h3 className="text-lg font-semibold text-gray-900">
                  Today's Patients
                <span className="ml-2 px-2.5 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-medium">
                  {filteredPatients.length}
                </span>
              </h3>
              {/* Show current room if doctor has one - simplified display since we have a card above */}
              {isDoctor && effectiveRoomData?.data?.current_room && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg border border-blue-200">
                  <FiHome className="w-4 h-4" />
                  <span className="text-sm font-medium">Room: {effectiveRoomData.data.current_room}</span>
                </div>
              )}
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-blue-600"></div>
                    <span className="text-gray-600 font-medium">
                      New ({todayPatients.filter(isNewPatientBasic).length})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-green-500 border-2 border-green-600"></div>
                    <span className="text-gray-600 font-medium">
                      Existing ({todayPatients.filter(isExistingPatientBasic).length})
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Room Selection Card - Show if doctor hasn't selected a room OR if no patients found */}
          {(hasNoRoom || filteredPatients.length === 0) && isDoctor ? (
            <div className="space-y-6">
              {/* Room Selection Card */}
              {hasNoRoom && (
                <Card id="room-selection-card" className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200">
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                        <FiHome className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800">Select Your Room for Today</h3>
                        <p className="text-sm text-gray-600">Room selection is required each day. You must select a room before patients can be assigned to you.</p>
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
                                {Object.keys(occupiedRooms).length} room(s) are already assigned to other doctors and are disabled.
                              </p>
                            )}
                          </>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                          <FiClock className="w-4 h-4 text-blue-600" />
                          What time did you start sitting in this room? <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="datetime-local"
                          value={assignmentTime}
                          onChange={(e) => setAssignmentTime(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                          required
                        />
                      </div>
                      
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
                        <strong>Note:</strong> Only one doctor can be assigned to each room. Rooms already assigned to other doctors are shown but disabled.
                        All unassigned patients in your selected room will be automatically assigned to you.
                      </p>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          ) : filteredPatients.length === 0 ? (
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
          ) : (
          <div className="p-4 sm:p-5 space-y-3">
            {filteredPatients.map((patient) => (
              <PatientRow 
                key={patient.id} 
                patient={patient} 
                isNewPatient={isNewPatientBasic(patient)}
                navigate={navigate}
                onMarkCompleted={handleMarkCompleted}
              />
            ))}
          </div>
        )}

          {/* Patient count info - no pagination needed since we fetch all today's patients */}
          {filteredPatients.length > 0 && (
            <div className="px-6 py-5 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-slate-50">
              <div className="text-sm text-gray-700 font-medium">
                Showing <span className="font-semibold text-gray-900">{filteredPatients.length}</span> patient{filteredPatients.length !== 1 ? 's' : ''} for today
                <span className="ml-3 text-gray-500">
                  (<span className="text-blue-600 font-semibold">{todayPatients.filter(isNewPatientBasic).length} new</span>
                  {' / '}
                  <span className="text-green-600 font-semibold">{todayPatients.filter(isExistingPatientBasic).length} existing</span>)
                </span>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ClinicalTodayPatients;
