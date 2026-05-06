import { apiSlice } from '../../app/api/apiSlice';

export const childCapWorkupApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getChildCapWorkupsByChildPatientId: builder.query({
      query: (childPatientId) => `/child-cap-workup/child-patient/${childPatientId}`,
      providesTags: (result, error, childPatientId) => [
        { type: 'ChildCapWorkup', id: `child-${childPatientId}` },
        'ChildCapWorkup',
      ],
    }),
    getChildCapWorkupById: builder.query({
      query: (id) => `/child-cap-workup/${id}`,
      providesTags: (result, error, id) => [{ type: 'ChildCapWorkup', id }],
    }),
    createChildCapWorkup: builder.mutation({
      query: (data) => ({
        url: '/child-cap-workup',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (result, error, { child_patient_id }) => [
        { type: 'ChildCapWorkup', id: `child-${child_patient_id}` },
        'ChildCapWorkup',
      ],
    }),
    updateChildCapWorkup: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `/child-cap-workup/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'ChildCapWorkup', id },
        'ChildCapWorkup',
      ],
    }),
    deleteChildCapWorkup: builder.mutation({
      query: (id) => ({
        url: `/child-cap-workup/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['ChildCapWorkup'],
    }),
  }),
});

export const {
  useGetChildCapWorkupsByChildPatientIdQuery,
  useGetChildCapWorkupByIdQuery,
  useCreateChildCapWorkupMutation,
  useUpdateChildCapWorkupMutation,
  useDeleteChildCapWorkupMutation,
} = childCapWorkupApiSlice;
