import { apiSlice } from '../../app/api/apiSlice';

export const roomsApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getAvailableRooms: builder.query({
      query: () => '/users/rooms/available',
      providesTags: ['Rooms'],
      // Poll every 10 seconds to get updated room availability
      pollingInterval: 30000, // Increased from 10s to 30s
    }),
    getMyRoom: builder.query({
      query: () => '/users/rooms/my-room',
      providesTags: ['MyRoom'],
    }),
    selectRoom: builder.mutation({
      query: ({ room_number, assignment_time }) => ({
        url: '/users/rooms/select',
        method: 'POST',
        body: { room_number, assignment_time },
      }),
      invalidatesTags: ['MyRoom', 'Rooms', 'Patient'],
      // Refetch available rooms after selection to update the list
      onQueryStarted: async (arg, { dispatch, queryFulfilled }) => {
        try {
          await queryFulfilled;
          // Invalidate and refetch rooms to show updated availability
          dispatch(roomsApiSlice.util.invalidateTags(['Rooms']));
        } catch (error) {
          console.error('Room selection error:', error);
        }
      },
    }),
    clearRoom: builder.mutation({
      query: () => ({
        url: '/users/rooms/clear',
        method: 'POST',
      }),
      invalidatesTags: ['MyRoom', 'Rooms'],
    }),
  }),
});

// Room Management endpoints (for MWO/Admin)
export const roomManagementApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getAllRooms: builder.query({
      query: ({ page = 1, limit = 10, is_active, search } = {}) => {
        const params = new URLSearchParams();
        if (page) params.append('page', page);
        if (limit) params.append('limit', limit);
        if (is_active !== undefined) params.append('is_active', is_active);
        if (search) params.append('search', search);
        return `/rooms?${params.toString()}`;
      },
      providesTags: ['RoomManagement'],
    }),
    getRoomById: builder.query({
      query: (id) => `/rooms/${id}`,
      providesTags: (result, error, id) => [{ type: 'RoomManagement', id }],
    }),
    createRoom: builder.mutation({
      query: (roomData) => ({
        url: '/rooms',
        method: 'POST',
        body: roomData,
      }),
      invalidatesTags: ['RoomManagement', 'Rooms'],
    }),
    updateRoom: builder.mutation({
      query: ({ id, ...roomData }) => ({
        url: `/rooms/${id}`,
        method: 'PUT',
        body: roomData,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'RoomManagement', id },
        'RoomManagement',
        'Rooms',
      ],
    }),
    deleteRoom: builder.mutation({
      query: ({ id, force = false }) => ({
        url: `/rooms/${id}${force ? '?force=true' : ''}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'RoomManagement', id },
        'RoomManagement',
        'Rooms',
        'Patient', // Also invalidate patient cache as room references may have been cleared
      ],
    }),
  }),
});

export const {
  useGetAvailableRoomsQuery,
  useGetMyRoomQuery,
  useSelectRoomMutation,
  useClearRoomMutation,
} = roomsApiSlice;

export const {
  useGetAllRoomsQuery,
  useGetRoomByIdQuery,
  useCreateRoomMutation,
  useUpdateRoomMutation,
  useDeleteRoomMutation,
} = roomManagementApiSlice;

