import { apiSlice } from '../../app/api/apiSlice';

export const roomsApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getAvailableRooms: builder.query({
      query: () => '/users/rooms/available',
      providesTags: ['Rooms'],
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

