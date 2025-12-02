import { useState, useEffect } from 'react';
import { FiHome, FiClock, FiCheck } from 'react-icons/fi';
import { toast } from 'react-toastify';
import Modal from './Modal';
import Button from './Button';
import Select from './Select';
import DatePicker from './CustomDatePicker';
import { useGetAvailableRoomsQuery, useSelectRoomMutation, useGetMyRoomQuery, roomsApiSlice } from '../features/rooms/roomsApiSlice';
import { useDispatch } from 'react-redux';
import { isAdmin, isSR, isJR } from '../utils/constants';

const RoomSelectionModal = ({ isOpen, onClose, currentUser }) => {
  const dispatch = useDispatch();
  const [selectedRoom, setSelectedRoom] = useState('');
  const [assignmentTime, setAssignmentTime] = useState(new Date().toISOString().slice(0, 16));
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

  // Set default time to current time
  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      const timeString = now.toISOString().slice(0, 16);
      setAssignmentTime(timeString);
      
      // If user already has a room, pre-select it
      if (myRoomData?.data?.current_room) {
        setSelectedRoom(myRoomData.data.current_room);
      }
    }
  }, [isOpen, myRoomData]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedRoom) {
      toast.error('Please select a room');
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

  const rooms = roomsData?.data?.rooms || []; // These are only available (unoccupied) rooms
  const distribution = roomsData?.data?.distribution || {};
  const occupiedRooms = roomsData?.data?.occupied_rooms || {};
  
  const roomOptions = rooms.map(room => ({
    value: room,
    label: `${room} (${distribution[room] || 0} patients)`,
  }));

  // If no rooms available, add default rooms (but only if they're not occupied)
  if (roomOptions.length === 0) {
    for (let i = 1; i <= 10; i++) {
      const roomName = `Room ${i}`;
      // Only add if not occupied
      if (!occupiedRooms[roomName]) {
        roomOptions.push({
          value: roomName,
          label: `${roomName} (0 patients)`,
        });
      }
    }
  }
  
  // Show message if all rooms are occupied
  const allRoomsOccupied = roomOptions.length === 0 && Object.keys(occupiedRooms).length > 0;

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
            All unassigned patients in this room will be automatically assigned to you.
            <span className="block mt-1 text-xs text-orange-600 font-medium">
              Note: Only one doctor can be assigned to each room. Rooms already assigned to other doctors are not shown.
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
                  onChange={(e) => setSelectedRoom(e.target.value)}
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
                    {Object.keys(occupiedRooms).length} room(s) are already assigned to other doctors and are not shown.
                  </p>
                )}
              </>
            )}
          </div>

          {/* Assignment Time */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-800">
              <FiClock className="w-4 h-4 text-primary-600" />
              What time did you start sitting in this room? <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              value={assignmentTime}
              onChange={(e) => setAssignmentTime(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white/60 backdrop-blur-md"
              required
            />
          </div>

          {/* Current Room Info */}
          {myRoomData?.data?.current_room && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Current Room:</strong> {myRoomData.data.current_room}
                {myRoomData.data.room_assignment_time && (
                  <span className="ml-2 text-blue-600">
                    (Assigned at: {new Date(myRoomData.data.room_assignment_time).toLocaleString()})
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
            disabled={isSubmitting || isSelectingRoom || !selectedRoom || !assignmentTime || allRoomsOccupied}
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

