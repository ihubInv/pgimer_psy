import { apiSlice } from '../../app/api/apiSlice';

export const usersApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getAllUsers: builder.query({
      query: ({ page = 1, limit = 10, ...filters }) => ({
        url: '/users',
        params: { page, limit, ...filters },
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.data?.users?.map(({ id }) => ({ type: 'User', id })) || [],
              { type: 'User', id: 'LIST' },
              'User',
            ]
          : ['User'],
    }),
    getUserById: builder.query({
      query: (id) => `/users/${id}`,
      providesTags: (result, error, id) => [{ type: 'User', id }],
    }),
    createUser: builder.mutation({
      query: (userData) => ({
        url: '/users/register',
        method: 'POST',
        body: userData,
      }),
      invalidatesTags: [{ type: 'User', id: 'LIST' }, 'User', 'Stats'],
    }),
    updateUser: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `/users/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'User', id },
        { type: 'User', id: 'LIST' },
        'User',
      ],
    }),
    deleteUser: builder.mutation({
      query: (id) => ({
        url: `/users/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'User', id },
        { type: 'User', id: 'LIST' },
        'User',
        'Stats',
      ],
    }),
    getUserStats: builder.query({
      query: () => '/users/stats',
      providesTags: ['Stats'],
    }),
    activateUser: builder.mutation({
      query: (id) => ({
        url: `/users/${id}/activate`,
        method: 'PUT',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'User', id },
        { type: 'User', id: 'LIST' },
        'User',
        'Stats',
      ],
    }),
    deactivateUser: builder.mutation({
      query: (id) => ({
        url: `/users/${id}/deactivate`,
        method: 'PUT',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'User', id },
        { type: 'User', id: 'LIST' },
        'User',
        'Stats',
      ],
    }),
    resetUserPassword: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `/users/${id}/reset-password`,
        method: 'PUT',
        body: data,
      }),
    }),
    enable2FAForUser: builder.mutation({
      query: (id) => ({
        url: `/users/${id}/enable-2fa`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'User', id },
        { type: 'User', id: 'LIST' },
        'User',
      ],
    }),
    disable2FAForUser: builder.mutation({
      query: (id) => ({
        url: `/users/${id}/disable-2fa`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'User', id },
        { type: 'User', id: 'LIST' },
        'User',
      ],
    }),
    getDoctors: builder.query({
      query: ({ page = 1, limit = 100 }) => ({
        url: '/users/doctors',
        params: { page, limit },
      }),
      providesTags: ['User'],
    }),
  }),
});

export const {
  useGetAllUsersQuery,
  useGetUserByIdQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useGetUserStatsQuery,
  useActivateUserMutation,
  useDeactivateUserMutation,
  useResetUserPasswordMutation,
  useEnable2FAForUserMutation,
  useDisable2FAForUserMutation,
  useGetDoctorsQuery,
} = usersApiSlice;

