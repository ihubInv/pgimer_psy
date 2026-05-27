import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiShield, FiRepeat, FiX, FiSettings, FiExternalLink } from 'react-icons/fi';
import {
  useGetAvailableRoomsQuery,
  useGetAllRoomsQuery,
  useChangeDoctorRoomMutation,
} from '../features/rooms/roomsApiSlice';
import { useGetDoctorsQuery } from '../features/users/usersApiSlice';
import Card from './Card';
import Button from './Button';

function getDoctorRoomAssignment(doctorId, occupiedRooms) {
  for (const [room, info] of Object.entries(occupiedRooms || {})) {
    const doctorsInRoom = info?.doctors?.length
      ? info.doctors
      : info?.doctor_id
        ? [{ doctor_id: info.doctor_id, doctor_name: info.doctor_name }]
        : [];
    if (doctorsInRoom.some((d) => d.doctor_id === doctorId)) {
      return { current_room: room, room_info: info };
    }
  }
  return { current_room: null, room_info: null };
}

const AdminDoctorRoomManager = ({ refetch, refetchRooms }) => {
  const navigate = useNavigate();
  const [panelOpen, setPanelOpen] = useState(false);
  const [doctorSearch, setDoctorSearch] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedNewRoom, setSelectedNewRoom] = useState('');
  const [showChangeModal, setShowChangeModal] = useState(false);

  const { data: doctorsData, isLoading: isLoadingDoctors, refetch: refetchDoctors } = useGetDoctorsQuery(
    { page: 1, limit: 100 },
    { skip: !panelOpen }
  );
  const { data: roomsData, refetch: refetchAvailableRooms } = useGetAvailableRoomsQuery(undefined, {
    skip: !panelOpen,
  });
  const { data: allRoomsData } = useGetAllRoomsQuery(
    { page: 1, limit: 100, is_active: true },
    { skip: !panelOpen }
  );
  const [changeDoctorRoom, { isLoading: isChangingRoom }] = useChangeDoctorRoomMutation();

  const doctors = doctorsData?.data?.users || [];
  const occupiedRooms = roomsData?.data?.occupied_rooms || {};
  const availableRooms = (allRoomsData?.data?.rooms || []).filter((room) => room.is_active);

  const doctorsWithRooms = doctors.map((doctor) => {
    const { current_room, room_info } = getDoctorRoomAssignment(doctor.id, occupiedRooms);
    return { ...doctor, current_room, room_info };
  });

  const assignedCount = doctorsWithRooms.filter((d) => d.current_room).length;
  const searchLower = doctorSearch.trim().toLowerCase();
  const filteredDoctors = searchLower
    ? doctorsWithRooms.filter(
        (d) =>
          d.name?.toLowerCase().includes(searchLower) ||
          d.role?.toLowerCase().includes(searchLower) ||
          d.current_room?.toLowerCase().includes(searchLower)
      )
    : doctorsWithRooms;

  useEffect(() => {
    if (panelOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [panelOpen]);

  const handleChangeRoom = async () => {
    if (!selectedDoctor || !selectedNewRoom) {
      toast.warning('Please select a doctor and a new room');
      return;
    }
    if (selectedNewRoom === selectedDoctor.current_room) {
      toast.warning('Please select a different room');
      return;
    }
    try {
      const result = await changeDoctorRoom({
        doctorId: selectedDoctor.id,
        new_room: selectedNewRoom,
      }).unwrap();
      toast.success(
        result.message ||
          `Room changed successfully. ${result.data?.patients_assigned ?? 0} patient(s) reassigned.`
      );
      setShowChangeModal(false);
      setSelectedDoctor(null);
      setSelectedNewRoom('');
      refetch();
      refetchRooms();
      refetchDoctors();
      refetchAvailableRooms();
    } catch (error) {
      console.error('Failed to change doctor room:', error);
      toast.error(error?.data?.message || 'Failed to change doctor room');
    }
  };

  const isRoomSelectableForAdmin = (roomNumber, excludeDoctorId) => {
    const info = occupiedRooms[roomNumber];
    if (!info) return true;
    const capacity = info.capacity ?? 1;
    const doctorsInRoom = info.doctors?.length
      ? info.doctors
      : info.doctor_id
        ? [{ doctor_id: info.doctor_id }]
        : [];
    return doctorsInRoom.filter((d) => d.doctor_id !== excludeDoctorId).length < capacity;
  };

  const roomOptionLabel = (roomNumber) => {
    const info = occupiedRooms[roomNumber];
    if (!info) return roomNumber;
    const capacity = info.capacity ?? 1;
    const doctorsInRoom = info.doctors?.length
      ? info.doctors
      : info.doctor_id
        ? [{ doctor_name: info.doctor_name }]
        : [];
    if (capacity > 1 && doctorsInRoom.length > 0) {
      const names = doctorsInRoom.map((d) => d.doctor_name).join(', ');
      const slots = info.slots_remaining ?? Math.max(0, capacity - doctorsInRoom.length);
      return `${roomNumber} (${doctorsInRoom.length}/${capacity}: ${names}${slots > 0 ? `, ${slots} slot left` : ', full'})`;
    }
    if (doctorsInRoom.length > 0) return `${roomNumber} (Dr. ${doctorsInRoom[0].doctor_name})`;
    return roomNumber;
  };

  return (
    <>
      <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 shadow-sm mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <FiShield className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-gray-800">Room management</h3>
              <p className="text-xs text-gray-600 truncate">
                Assign or change doctor rooms for today
                {assignedCount > 0 ? ` · ${assignedCount} doctor(s) assigned` : ''}
              </p>
            </div>
          </div>
          <Button
            type="button"
            onClick={() => setPanelOpen(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white flex-shrink-0 w-full sm:w-auto"
          >
            <FiSettings className="w-4 h-4 mr-2" />
            Manage rooms
          </Button>
        </div>
      </Card>

      {panelOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 bg-black/40 z-40"
            aria-label="Close room management panel"
            onClick={() => setPanelOpen(false)}
          />
          <aside
            className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-room-panel-title"
          >
            <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
              <div>
                <h2 id="admin-room-panel-title" className="text-lg font-semibold">
                  Doctor room management
                </h2>
                <p className="text-xs text-purple-100 mt-0.5">Admin · today&apos;s assignments</p>
              </div>
              <button
                type="button"
                onClick={() => setPanelOpen(false)}
                className="p-2 rounded-lg hover:bg-white/20 transition-colors"
                aria-label="Close"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <div className="px-4 py-3 border-b border-gray-100 flex flex-col gap-2">
              <input
                type="search"
                value={doctorSearch}
                onChange={(e) => setDoctorSearch(e.target.value)}
                placeholder="Search doctor, role, or room..."
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setPanelOpen(false);
                  navigate('/rooms');
                }}
                className="w-full border-purple-200 text-purple-700 hover:bg-purple-50"
              >
                <FiExternalLink className="w-4 h-4 mr-2" />
                Open full room settings (capacity, add rooms)
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3">
              {isLoadingDoctors ? (
                <div className="text-center py-12">
                  <div className="inline-block w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-gray-600 mt-3">Loading doctors...</p>
                </div>
              ) : filteredDoctors.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-12">
                  {doctorSearch ? 'No doctors match your search.' : 'No doctors found.'}
                </p>
              ) : (
                <ul className="space-y-2">
                  {filteredDoctors.map((doctor) => (
                    <li
                      key={doctor.id}
                      className="p-3 rounded-lg border border-gray-200 bg-gray-50/80 hover:bg-white hover:border-purple-200 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                            {doctor.name?.charAt(0) || 'D'}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 text-sm truncate">{doctor.name}</p>
                            <p className="text-xs text-gray-500">{doctor.role}</p>
                            {doctor.current_room ? (
                              <p className="text-xs font-semibold text-purple-600 mt-1">
                                Room: {doctor.current_room}
                                {doctor.room_info?.capacity > 1 && (
                                  <span className="font-normal text-gray-500">
                                    {' '}
                                    (shared, cap {doctor.room_info.capacity})
                                  </span>
                                )}
                              </p>
                            ) : (
                              <p className="text-xs text-amber-600 mt-1">No room today</p>
                            )}
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedDoctor(doctor);
                            setSelectedNewRoom('');
                            setShowChangeModal(true);
                          }}
                          className="flex-shrink-0 bg-white border-purple-300 text-purple-700 hover:bg-purple-50 text-xs px-2 py-1"
                        >
                          <FiRepeat className="w-3.5 h-3.5 mr-1" />
                          Change
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 text-xs text-gray-600">
              First doctor in a shared room receives today&apos;s patients. Other doctors join with an empty
              list until the first doctor transfers patients to them.
            </div>
          </aside>
        </>
      )}

      {showChangeModal && selectedDoctor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                Change room — {selectedDoctor.name}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowChangeModal(false);
                  setSelectedDoctor(null);
                  setSelectedNewRoom('');
                }}
                className="p-1 rounded hover:bg-gray-100"
                aria-label="Close"
              >
                <FiX className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current room</label>
                <p className="text-base font-semibold text-purple-600">
                  {selectedDoctor.current_room || 'Not assigned'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New room <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedNewRoom}
                  onChange={(e) => setSelectedNewRoom(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  disabled={isChangingRoom}
                >
                  <option value="">Select new room...</option>
                  {availableRooms
                    .filter((room) => room.room_number !== selectedDoctor.current_room)
                    .map((room) => {
                      const selectable = isRoomSelectableForAdmin(room.room_number, selectedDoctor.id);
                      return (
                        <option
                          key={room.room_number}
                          value={room.room_number}
                          disabled={!selectable}
                        >
                          {roomOptionLabel(room.room_number)}
                          {!selectable ? ' — Full' : ''}
                        </option>
                      );
                    })}
                </select>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-xs text-amber-900">
                  If this doctor is the first in the new room today, patients in that room will be assigned to
                  them. Joining an already-occupied shared room does not move patients.
                </p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button
                onClick={handleChangeRoom}
                disabled={
                  !selectedNewRoom ||
                  isChangingRoom ||
                  selectedNewRoom === selectedDoctor.current_room
                }
                loading={isChangingRoom}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
              >
                Confirm change
              </Button>
              <Button
                onClick={() => {
                  setShowChangeModal(false);
                  setSelectedDoctor(null);
                  setSelectedNewRoom('');
                }}
                variant="outline"
                disabled={isChangingRoom}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminDoctorRoomManager;
