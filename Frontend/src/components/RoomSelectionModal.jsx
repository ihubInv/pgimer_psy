import { useState, useEffect } from 'react';
import { FiHome, FiClock, FiCheck } from 'react-icons/fi';
import { toast } from 'react-toastify';
import Modal from './Modal';
import Button from './Button';
import Select from './Select';
import DatePicker from './CustomDatePicker';
import { useGetAvailableRoomsQuery, useSelectRoomMutation, useGetMyRoomQuery } from '../features/rooms/roomsApiSlice';
import { isAdmin, isSR, isJR } from '../utils/constants';

const RoomSelectionModal = ({ isOpen, onClose, currentUser }) => {
  const [selectedRoom, setSelectedRoom] = useState('');
  const [assignmentTime, setAssignmentTime] = useState(new Date().toISOString().slice(0, 16));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: roomsData, isLoading: isLoadingRooms } = useGetAvailableRoomsQuery(undefined, {
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
      await refetchMyRoom();
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

  const rooms = roomsData?.data?.rooms || [];
  const distribution = roomsData?.data?.distribution || {};
  
  const roomOptions = rooms.map(room => ({
    value: room,
    label: `${room} (${distribution[room] || 0} patients)`,
  }));

  // If no rooms available, add default rooms
  if (roomOptions.length === 0) {
    for (let i = 1; i <= 10; i++) {
      roomOptions.push({
        value: `Room ${i}`,
        label: `Room ${i} (0 patients)`,
      });
    }
  }

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
            All patients assigned to this room will be automatically assigned to you.
          </p>

          {/* Room Selection */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-800">
              <FiHome className="w-4 h-4 text-primary-600" />
              Which room are you sitting in today? <span className="text-red-500">*</span>
            </label>
            <Select
              name="room"
              value={selectedRoom}
              onChange={(e) => setSelectedRoom(e.target.value)}
              options={roomOptions}
              placeholder="Select room"
              searchable={true}
              disabled={isLoadingRooms}
              className="bg-white/60 backdrop-blur-md border-2 border-gray-300/60"
            />
            {selectedRoom && distribution[selectedRoom] !== undefined && (
              <p className="text-xs text-gray-500 mt-1">
                {distribution[selectedRoom]} patient(s) currently assigned to this room
              </p>
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
            disabled={isSubmitting || isSelectingRoom || !selectedRoom || !assignmentTime}
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

