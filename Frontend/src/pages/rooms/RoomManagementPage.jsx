import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { 
  FiPlus, FiSearch, FiEdit, FiTrash2, FiCheck, FiX
} from 'react-icons/fi';
import {
  useGetAllRoomsQuery,
  useCreateRoomMutation,
  useUpdateRoomMutation,
  useDeleteRoomMutation,
} from '../../features/rooms/roomsApiSlice';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Input from '../../components/Input';
import Modal from '../../components/Modal';
import Badge from '../../components/Badge';
import { formatDate } from '../../utils/formatters';

const RoomManagementPage = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [isActiveFilter, setIsActiveFilter] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [formData, setFormData] = useState({
    room_number: '',
    description: '',
    is_active: true,
  });
  const limit = 10;

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, isActiveFilter]);

  const { data, isLoading, isFetching, refetch, error } = useGetAllRoomsQuery({ 
    page, 
    limit,
    is_active: isActiveFilter,
    search: search.trim() || undefined 
  }, {
    pollingInterval: 60000, // Increased from 30s to 60s
    refetchOnFocus: false,
    refetchOnMountOrArgChange: true,
  });

  const [createRoom, { isLoading: isCreating }] = useCreateRoomMutation();
  const [updateRoom, { isLoading: isUpdating }] = useUpdateRoomMutation();
  const [deleteRoom, { isLoading: isDeleting }] = useDeleteRoomMutation();

  const handleOpenModal = (room = null) => {
    if (room) {
      setSelectedRoom(room);
      setIsEditMode(true);
      setFormData({
        room_number: room.room_number || '',
        description: room.description || '',
        is_active: room.is_active !== undefined ? room.is_active : true,
      });
    } else {
      setSelectedRoom(null);
      setIsEditMode(false);
      setFormData({
        room_number: '',
        description: '',
        is_active: true,
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedRoom(null);
    setIsEditMode(false);
    setFormData({
      room_number: '',
      description: '',
      is_active: true,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.room_number.trim()) {
      toast.error('Room number is required');
      return;
    }

    try {
      if (isEditMode && selectedRoom) {
        await updateRoom({
          id: selectedRoom.id,
          ...formData,
        }).unwrap();
        toast.success('Room updated successfully');
      } else {
        await createRoom(formData).unwrap();
        toast.success('Room created successfully');
      }
      handleCloseModal();
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || `Failed to ${isEditMode ? 'update' : 'create'} room`);
    }
  };

  const handleDelete = async (room) => {
    const confirmMessage = `Are you sure you want to permanently delete room "${room.room_number}"?\n\nThis action cannot be undone.`;
    
    if (window.confirm(confirmMessage)) {
      try {
        await deleteRoom(room.id).unwrap();
        toast.success(`Room "${room.room_number}" deleted successfully`);
        refetch();
      } catch (err) {
        const errorMessage = err?.data?.message || err?.message || 'Failed to delete room';
        toast.error(errorMessage);
        console.error('Delete room error:', err);
      }
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleToggleActive = async (room) => {
    try {
      await updateRoom({
        id: room.id,
        is_active: !room.is_active,
      }).unwrap();
      toast.success(`Room ${!room.is_active ? 'activated' : 'deactivated'} successfully`);
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to update room status');
    }
  };

  const rooms = data?.data?.rooms || [];
  const pagination = data?.data?.pagination || {};

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading rooms...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Failed to load rooms</p>
          <Button onClick={() => refetch()}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 lg:p-6">
      <div className="w-full space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Room Management</h1>
            <p className="text-gray-600 mt-1">Manage rooms in the system</p>
          </div>
          <Button
            onClick={() => handleOpenModal()}
            className="bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800"
          >
            <FiPlus className="mr-2" />
            Add Room
          </Button>
        </div>

        {/* Filters and Search */}
        <Card>
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex-1 w-full md:w-auto">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search by room number..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 w-full"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant={isActiveFilter ? 'default' : 'outline'}
                onClick={() => setIsActiveFilter(true)}
                size="sm"
              >
                Active
              </Button>
              <Button
                variant={!isActiveFilter ? 'default' : 'outline'}
                onClick={() => setIsActiveFilter(false)}
                size="sm"
              >
                Inactive
              </Button>
            </div>
          </div>
        </Card>

        {/* Rooms Table */}
        <Card className="w-full">
          <div className="overflow-x-auto w-full">
            <table className="w-full min-w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Room Number</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Description</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Created</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rooms.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="text-center py-8 text-gray-500">
                      No rooms found
                    </td>
                  </tr>
                ) : (
                  rooms.map((room) => (
                    <tr key={room.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <span className="font-medium text-gray-900">{room.room_number}</span>
                      </td>
                      <td className="py-3 px-4 text-gray-600 text-sm">
                        {room.description ? (
                          <span title={room.description}>
                            {room.description.length > 50 
                              ? `${room.description.substring(0, 50)}...` 
                              : room.description}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="py-3 px-4 text-gray-600 text-sm">
                        {room.created_at ? formatDate(room.created_at) : '-'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenModal(room)}
                            className="text-blue-600 hover:text-blue-700"
                            title="Edit"
                          >
                            <FiEdit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleActive(room)}
                            loading={isUpdating}
                            className={room.is_active ? "text-orange-600 hover:text-orange-700" : "text-green-600 hover:text-green-700"}
                            title={room.is_active ? "Deactivate" : "Activate"}
                          >
                            {room.is_active ? (
                              <FiX className="w-4 h-4" />
                            ) : (
                              <FiCheck className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(room)}
                            loading={isDeleting}
                            className="text-red-600 hover:text-red-700"
                            title="Permanently delete room"
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="mt-4 flex justify-center">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <span className="flex items-center px-4 text-gray-700">
                  Page {page} of {pagination.pages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                  disabled={page === pagination.pages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Add/Edit Room Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          title={isEditMode ? 'Edit Room' : 'Add New Room'}
          size="md"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Room Number <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                name="room_number"
                value={formData.room_number}
                onChange={handleChange}
                placeholder="e.g., Room 208"
                required
                disabled={isEditMode}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Room description..."
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseModal}
              >
                <FiX className="mr-2" />
                Cancel
              </Button>
              <Button
                type="submit"
                loading={isCreating || isUpdating}
                className="bg-gradient-to-r from-primary-600 to-primary-700"
              >
                <FiCheck className="mr-2" />
                {isEditMode ? 'Update' : 'Create'} Room
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </div>
  );
};

export default RoomManagementPage;

