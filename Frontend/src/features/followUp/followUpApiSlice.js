import { apiSlice } from '../../app/api/apiSlice';

export const followUpApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    createFollowUp: builder.mutation({
      query: (followUpData) => ({
        url: '/follow-ups',
        method: 'POST',
        body: followUpData,
      }),
      invalidatesTags: (result, error, followUpData) => [
        'FollowUp',
        { type: 'Patient', id: followUpData.patient_id },
        { type: 'PatientVisit', id: followUpData.patient_id },
      ],
    }),
    getFollowUpById: builder.query({
      query: (id) => `/follow-ups/${id}`,
      providesTags: (result, error, id) => [{ type: 'FollowUp', id }],
    }),
    getFollowUpsByPatientId: builder.query({
      query: ({ patient_id, page = 1, limit = 10 }) => ({
        url: `/follow-ups/patient/${patient_id}`,
        params: { page, limit },
      }),
      providesTags: (result, error, { patient_id }) => [
        { type: 'FollowUp', id: 'LIST' },
        { type: 'Patient', id: patient_id },
      ],
    }),
    getFollowUpsByChildPatientId: builder.query({
      query: ({ child_patient_id, page = 1, limit = 100 }) => ({
        url: `/follow-ups/child-patient/${child_patient_id}`,
        params: { page, limit },
      }),
      providesTags: (result, error, { child_patient_id }) => [
        { type: 'FollowUp', id: 'LIST' },
        { type: 'ChildPatient', id: child_patient_id },
      ],
    }),
    updateFollowUp: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `/follow-ups/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'FollowUp', id },
        'FollowUp',
      ],
    }),
    deleteFollowUp: builder.mutation({
      query: (id) => ({
        url: `/follow-ups/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'FollowUp', id },
        'FollowUp',
      ],
    }),
  }),
});

export const {
  useCreateFollowUpMutation,
  useGetFollowUpByIdQuery,
  useGetFollowUpsByPatientIdQuery,
  useGetFollowUpsByChildPatientIdQuery,
  useUpdateFollowUpMutation,
  useDeleteFollowUpMutation,
} = followUpApiSlice;



