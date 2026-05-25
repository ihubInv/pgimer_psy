import { useState, useEffect } from 'react';
import { FiHome, FiClock, FiCheck } from 'react-icons/fi';
import { toast } from 'react-toastify';
import Modal from './Modal';
import Button from './Button';
import Select from './Select';
import CustomDateTimePicker from './CustomDateTimePicker';
import { useGetAvailableRoomsQuery, useSelectRoomMutation, useGetMyRoomQuery, roomsApiSlice } from '../features/rooms/roomsApiSlice';
import { useDispatch } from 'react-redux';
import { isAdmin, isSR, isJR } from '../utils/constants';

const RoomSelectionModal = ({ isOpen, onClose, currentUser }) => {
  const dispatch = useDispatch();
  
  // Helper function to format date for datetime-local input (local timezone)
  const formatLocalDateTime = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };
  
  const [selectedRoom, setSelectedRoom] = useState('');
  const [assignmentTime, setAssignmentTime] = useState(formatLocalDateTime(new Date()));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: roomsData, isLoading: isLoadingRooms, refetch: refetchRooms } = useGetAvailableRoomsQuery(undefined, {
    skip: !isOpen,
  });
  const { data: myRoomData, refetch: refetchMyRoom } = useGetMyRoomQuery(undefined, {
    skip: !isOpen,
  });
  const [selectRoom, { isLoading: isSelectingRoom }] = useSelectRoomMutation();

  // Check if user should see this modal (Faculty, Admin, or Resident)
  const shouldShowModal = currentUser && (
    isAdmin(currentUser.role) || 
    isSR(currentUser.role) || 
    isJR(currentUser.role)
  );

  // Set default time to current time (local timezone) whenever modal opens
  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      const timeString = formatLocalDateTime(now);
      setAssignmentTime(timeString);
      
      // If user already has a room, pre-select it
      if (myRoomData?.data?.current_room) {
        setSelectedRoom(myRoomData.data.current_room);
        // If they have an existing assignment time, use it
        if (myRoomData.data.room_assignment_time) {
          const existingTime = new Date(myRoomData.data.room_assignment_time);
          setAssignmentTime(formatLocalDateTime(existingTime));
        }
      }
    }
  }, [isOpen, myRoomData]);

  useEffect(() => {
    if (isOpen) {
      setAssignmentTime(formatLocalDateTime(new Date()));
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedRoom) {
      toast.error('Please select a room');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await selectRoom({
        room_number: selectedRoom,
        assignment_time: new Date().toISOString(),
      }).unwrap();

      toast.success(result.message || `Room ${selectedRoom} selected successfully!`);
      
      // Refetch room data and invalidate cache so other doctors see updated availability
      await Promise.all([
        refetchMyRoom(),
        refetchRooms(),
        dispatch(roomsApiSlice.util.invalidateTags(['Rooms', 'MyRoom']))
      ]);
      
      onClose();
    } catch (error) {
      console.error('Room selection error:', error);
      toast.error(error?.data?.message || 'Failed to select room');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!shouldShowModal) {
    return null;
  }

  const rooms = roomsData?.data?.rooms || []; // All active rooms
  const distribution = roomsData?.data?.distribution_today || {};
  const occupiedRooms = roomsData?.data?.occupied_rooms || {};
  const currentUserId = currentUser?.id ? parseInt(currentUser.id, 10) : null;

  // Build capacity-aware room option
  const buildOption = (room, totalPatients) => {
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

    const disabledReason = isDisabled
      ? (capacity === 1
          ? `This room is already assigned to ${doctors[0]?.doctor_name || 'another doctor'}`
          : `Room is full (${doctors.length}/${capacity} doctors)`)
      : undefined;

    return {
      value: room,
      label: `${room} (${totalPatients} patient${totalPatients !== 1 ? 's' : ''} today)${occupancyLabel}`,
      disabled: isDisabled,
      disabledReason,
    };
  };

  const roomOptions = rooms.map(room => buildOption(room, distribution[room] || 0));

  // If no rooms available, add default rooms (only non-full ones)
  if (roomOptions.length === 0) {
    for (let i = 1; i <= 10; i++) {
      const roomName = `Room ${i}`;
      const opt = buildOption(roomName, distribution[roomName] || 0);
      if (!opt.disabled) roomOptions.push(opt);
    }
  }
  
  const allRoomsOccupied =
    (roomOptions.length === 0 && Object.keys(occupiedRooms).length > 0) ||
    (roomOptions.length > 0 && roomOptions.every((o) => o.disabled));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Select Your Room"
      size="md"
      closeOnOverlayClick={false}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <p className="text-sm text-gray-600 mb-4">
            Please select the room you are sitting in today and the time you started.
            You may choose a room even if no patients are listed for it yet today (for example walk-ins). Patients already tied to that room for today will be assigned to you.
            <span className="block mt-1 text-xs text-orange-600 font-medium">
              Note: Rooms at full capacity are disabled. Shared rooms (capacity 2+) show remaining slots and are still selectable.
            </span>
          </p>

          {/* Room Selection */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-800">
              <FiHome className="w-4 h-4 text-primary-600" />
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
                    const opt = roomOptions.find((o) => o.value === e.target.value);
                    if (opt && !opt.disabled) setSelectedRoom(e.target.value);
                  }}
                  options={roomOptions}
                  placeholder="Select room"
                  searchable={true}
                  disabled={isLoadingRooms || allRoomsOccupied}
                  className="bg-white/60 backdrop-blur-md border-2 border-gray-300/60"
                />
                {selectedRoom && distribution[selectedRoom] !== undefined && (
                  <p className="text-xs text-gray-500 mt-1">
                    {distribution[selectedRoom]} patient(s) currently assigned to this room
                  </p>
                )}
                {Object.keys(occupiedRooms).length > 0 && (
                  <p className="text-xs text-gray-500 mt-1 italic">
                    Rooms shown as full are disabled. Shared rooms with remaining capacity are still available.
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-1 italic">
                  You can select any free room, even if no patients are listed for it yet today.
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

          {/* Current Room Info */}
          {myRoomData?.data?.current_room && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Current Room:</strong> {myRoomData.data.current_room}
                {myRoomData.data.room_assignment_time && (
                  <span className="ml-2 text-blue-600">
                    (Assigned at:{' '}
                    {new Date(myRoomData.data.room_assignment_time).toLocaleString('en-IN', {
                      timeZone: 'Asia/Kolkata',
                      day: 'numeric',
                      month: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      hour12: true,
                    })}
                    )
                  </span>
                )}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting || isSelectingRoom}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            loading={isSubmitting || isSelectingRoom}
            disabled={
              isSubmitting ||
              isSelectingRoom ||
              !selectedRoom ||
              !assignmentTime ||
              allRoomsOccupied ||
              Boolean(roomOptions.find((o) => o.value === selectedRoom)?.disabled)
            }
            className="bg-[#0ea5e9] hover:bg-[#0284c7]"
          >
            <FiCheck className="mr-2" />
            Select Room
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default RoomSelectionModal;

