import { apiSlice } from '../../app/api/apiSlice';

export const roomsApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getAvailableRooms: builder.query({
      query: () => '/users/rooms/available',
      providesTags: ['Rooms'],
      // Poll every 10 seconds to get updated room availability
      pollingInterval: 10000,
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

export const {
  useGetAvailableRoomsQuery,
  useGetMyRoomQuery,
  useSelectRoomMutation,
  useClearRoomMutation,
} = roomsApiSlice;

