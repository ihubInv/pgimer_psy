import { apiSlice } from '../../app/api/apiSlice';

export const patientsApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getAllPatients: builder.query({
      query: ({ page = 1, limit = 10, ...filters }) => ({
        url: '/patients',
        params: { page, limit, ...filters },
      }),
      providesTags: (result, error, arg) => {
        // Provide tags that match what mutations invalidate
        const tags = ['Patient', { type: 'Patient', id: 'LIST' }];
        // If filtering by date, also provide a date-specific tag
        if (arg?.date) {
          tags.push({ type: 'Patient', id: `LIST-${arg.date}` });
        }
        return tags;
      },
      // Keep unused data for 60 seconds to reduce refetches
      keepUnusedDataFor: 60,
    }),
    getPatientById: builder.query({
      query: (id) => `/patients/${id}`,
      providesTags: (result, error, id) => [{ type: 'Patient', id }],
      // Keep patient data for 5 minutes (patients don't change frequently)
      keepUnusedDataFor: 300,
    }),
    getPatientByCRNo: builder.query({
      query: (cr_no) => `/patients/cr/${cr_no}`,
      providesTags: (result, error, cr_no) => {
        // Don't cache 404 errors - they're expected when searching for wrong patient type
        if (error?.status === 404) {
          return [];
        }
        return [{ type: 'Patient', id: result?.data?.patient?.id }];
      },
      keepUnusedDataFor: 60,
      // Don't retry on 404 - it's expected when searching for wrong patient type
      extraOptions: { maxRetries: 0 },
    }),
    searchPatients: builder.query({
      query: ({ search, page = 1, limit = 10 }) => ({
        url: '/patients/search',
        params: { q: search, page, limit },
      }),
      providesTags: ['Patient'],
    }),
    createPatient: builder.mutation({
      query: (patientData) => ({
        url: '/patients',
        method: 'POST',
        body: patientData,
      }),
      invalidatesTags: (result, error, patientData) => {
        const tags = ['Patient', 'Stats'];
        // If creating a visit for existing patient, also invalidate visit count
        if (patientData?.patient_id) {
          tags.push({ type: 'PatientVisit', id: patientData.patient_id });
        }
        return tags;
      },
    }),
    createPatientComplete: builder.mutation({
      query: (patientData) => ({
        url: '/patients/register-complete',
        method: 'POST',
        body: patientData,
      }),
      invalidatesTags: ['Patient', 'Stats', 'ClinicalProforma', 'ADLFile'],
    }),
    updatePatient: builder.mutation({
      queryFn: async ({ id, files, files_to_remove, ...data }, _queryApi, _extraOptions, fetchWithBQ) => {
        const baseUrl = import.meta.env.VITE_API_URL || '/api';
        const state = _queryApi.getState();
        const token = state.auth.token;
        
        // If files are present, use FormData; otherwise use JSON
        if (files && files.length > 0 || (files_to_remove && files_to_remove.length > 0)) {
          const formData = new FormData();
          
          // Append patient data
          Object.keys(data).forEach(key => {
            if (data[key] !== undefined && data[key] !== null) {
              if (typeof data[key] === 'object' && !(data[key] instanceof File)) {
                formData.append(key, JSON.stringify(data[key]));
              } else {
                formData.append(key, data[key]);
              }
            }
          });
          
          // Append new files
          if (files && files.length > 0) {
            files.forEach((file) => {
              formData.append('attachments[]', file);
            });
          }
          
          // Append files to remove
          if (files_to_remove && files_to_remove.length > 0) {
            if (Array.isArray(files_to_remove)) {
              files_to_remove.forEach((filePath) => {
                formData.append('files_to_remove[]', filePath);
              });
            } else {
              formData.append('files_to_remove', JSON.stringify(files_to_remove));
            }
          }
          
          // Use fetch directly for FormData (don't set Content-Type, browser will set it with boundary)
          const response = await fetch(`${baseUrl}/patients/${id}`, {
            method: 'PUT',
            body: formData,
            headers: token ? { 'Authorization': `Bearer ${token}` } : {},
            credentials: 'include',
          });
          
          const result = await response.json();
          
          if (!response.ok) {
            return { error: { status: response.status, data: result } };
          }
          
          return { data: result };
        } else {
          // No files, use regular JSON request via fetchWithBQ
          return fetchWithBQ({
            url: `/patients/${id}`,
            method: 'PUT',
            body: data,
          });
        }
      },
      invalidatesTags: (result, error, { id, files, files_to_remove }) => {
        const tags = [{ type: 'Patient', id }, 'Patient'];
        // If files were uploaded or removed, also invalidate PatientFile cache
        if ((files && files.length > 0) || (files_to_remove && files_to_remove.length > 0)) {
          tags.push({ type: 'PatientFile', id }, { type: 'PatientFile', id: 'LIST' });
        }
        return tags;
      },
    }),
    deletePatient: builder.mutation({
      query: (id) => ({
        url: `/patients/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'Patient', id },
        { type: 'Patient', id: 'LIST' },
        'Patient',
        'Stats',
        'ClinicalProforma',
        'ADLFile',
      ],
    }),
    getPatientStats: builder.query({
      query: () => '/patients/stats',
      providesTags: ['Stats'],
    }),
    assignPatient: builder.mutation({
      query: (payload) => ({
        url: '/patients/assign',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: ['Patient'],
    }),
    getPatientsStats: builder.query({
      query: () => '/patients/stats',
      providesTags: ['Stats'],
    }),
    getAgeDistribution: builder.query({
      query: () => '/patients/age-distribution',
      providesTags: ['Stats'],
    }),
    getRegistrationsByDate: builder.query({
      query: ({ start_date, end_date } = {}) => {
        const params = new URLSearchParams();
        if (start_date) params.append('start_date', start_date);
        if (end_date) params.append('end_date', end_date);
        return `/patients/registrations-by-date?${params.toString()}`;
      },
      providesTags: ['Stats'],
    }),
    getPatientsByRegistrationDate: builder.query({
      query: (date) => `/patients/patients-by-date/${date}`,
      providesTags: (result, error, date) => [
        { type: 'Patient', id: `date-${date}` },
        'Stats'
      ],
    }),
    getPatientsByRoom: builder.query({
      query: (room_number) => `/patients/by-room/${encodeURIComponent(room_number)}`,
      providesTags: (result, error, room_number) => [
        { type: 'Patient', id: 'LIST' },
        { type: 'Patient', room: room_number }
      ],
    }),
    getPatientVisitCount: builder.query({
      query: (patientId) => `/patients/${patientId}/visits/count`,
      providesTags: (result, error, patientId) => [
        { type: 'Patient', id: patientId },
        { type: 'PatientVisit', id: patientId }
      ],
    }),
    getPatientVisitHistory: builder.query({
      query: (patientId) => `/patients/${patientId}/visits`,
      providesTags: (result, error, patientId) => [
        { type: 'Patient', id: patientId },
        { type: 'PatientVisit', id: patientId }
      ],
      transformResponse: (resp) => resp?.data?.visitHistory || [],
    }),
    markVisitCompleted: builder.mutation({
      query: ({ patient_id, visit_date, patient_type }) => ({
        url: `/patients/${patient_id}/visits/complete`,
        method: 'POST',
        body: { 
          ...(visit_date ? { visit_date } : {}),
          ...(patient_type ? { patient_type } : {})
        },
      }),
      invalidatesTags: (result, error, { patient_id }) => [
        { type: 'Patient', id: patient_id },
        { type: 'Patient', id: 'LIST' },
        { type: 'PatientVisit', id: patient_id },
      ],
    }),
    changePatientRoom: builder.mutation({
      query: ({ patient_id, new_room }) => ({
        url: `/patients/${patient_id}/change-room`,
        method: 'POST',
        body: { new_room },
      }),
      // Invalidate patient cache to trigger real-time updates across all doctor views
      invalidatesTags: (result, error, { patient_id }) => [
        { type: 'Patient', id: patient_id },
        { type: 'Patient', id: 'LIST' },
        { type: 'PatientVisit', id: patient_id },
        'Patient', // Invalidate all patient queries to refresh both doctors' lists
      ],
    }),
    uploadPatientFiles: builder.mutation({
      queryFn: async ({ patientId, files }, _queryApi, _extraOptions, fetchWithBQ) => {
        const formData = new FormData();
        files.forEach((file) => {
          formData.append('files', file);
        });

        const baseUrl = import.meta.env.VITE_API_URL || '/api';
        const token = JSON.parse(localStorage.getItem('user'))?.token || localStorage.getItem('token');

        try {
          const response = await fetch(`${baseUrl}/patients/${patientId}/files`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              // Don't set Content-Type, let browser set it with boundary
            },
            credentials: 'include',
            body: formData,
          });

          const data = await response.json();

          if (!response.ok) {
            return { error: { status: response.status, data } };
          }

          return { data };
        } catch (error) {
          return { error: { status: 'FETCH_ERROR', error: error.message } };
        }
      },
      invalidatesTags: (result, error, { patientId }) => [
        { type: 'Patient', id: patientId },
        'Patient',
      ],
    }),
    getPatientFiles: builder.query({
      query: (patientId) => `/patients/${patientId}/files`,
      providesTags: (result, error, patientId) => [
        { type: 'Patient', id: patientId },
        'Patient',
      ],
    }),
    deletePatientFile: builder.mutation({
      query: ({ patientId, filename }) => ({
        url: `/patients/${patientId}/files/${filename}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { patientId }) => [
        { type: 'Patient', id: patientId },
        'Patient',
      ],
    }),
    getAllChildPatients: builder.query({
      query: ({ page = 1, limit = 10, ...filters }) => ({
        url: '/child-patient',
        params: { page, limit, ...filters },
      }),
      providesTags: ['ChildPatient'],
      keepUnusedDataFor: 60,
    }),
    getChildPatientByCRNo: builder.query({
      query: (cr_number) => `/child-patient/cr/${cr_number}`,
      providesTags: (result, error, cr_number) => {
        // Don't cache 404 errors - they're expected when searching for wrong patient type
        if (error?.status === 404) {
          return [];
        }
        return [{ type: 'ChildPatient', id: result?.data?.childPatient?.id }];
      },
      keepUnusedDataFor: 60,
      // Don't retry on 404 - it's expected when searching for wrong patient type
      extraOptions: { maxRetries: 0 },
    }),
    addChildPatientToTodayList: builder.mutation({
      query: (data) => ({
        url: '/child-patient/add-to-today',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (result, error, data) => {
        // Invalidate all patient-related caches to ensure UI updates
        // Get today's date to invalidate date-specific queries
        const today = new Date().toISOString().slice(0, 10);
        return [
          'ChildPatient',
          'Patient',
          { type: 'Patient', id: 'LIST' },
          { type: 'ChildPatient', id: 'LIST' },
          // Invalidate date-specific queries for today
          { type: 'Patient', id: `LIST-${today}` },
          // Invalidate all patient queries
          { type: 'Patient', id: undefined },
        ];
      },
    }),
    deleteChildPatient: builder.mutation({
      query: (id) => ({
        url: `/child-patient/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => {
        const today = new Date().toISOString().slice(0, 10);
        return [
          { type: 'ChildPatient', id },
          { type: 'ChildPatient', id: 'LIST' },
          { type: 'Patient', id: 'LIST' },
          { type: 'Patient', id: `LIST-${today}` },
        ];
      },
    }),
  }),
});

export const {
  useGetAllPatientsQuery,
  useGetPatientByIdQuery,
  useGetPatientByCRNoQuery,
  useSearchPatientsQuery,
  useCreatePatientMutation,
  useCreatePatientCompleteMutation,
  useUpdatePatientMutation,
  useDeletePatientMutation,
  useGetPatientStatsQuery,
  useAssignPatientMutation,
  //dashboard stats queries
  useGetPatientsStatsQuery,
  useGetAgeDistributionQuery,
  useGetRegistrationsByDateQuery,
  useGetPatientsByRegistrationDateQuery,
  useGetPatientsByRoomQuery,
  useGetPatientVisitCountQuery,
  useGetPatientVisitHistoryQuery,
  useMarkVisitCompletedMutation,
  useChangePatientRoomMutation,
  useUploadPatientFilesMutation,
  useGetPatientFilesQuery,
  useDeletePatientFileMutation,
  useGetAllChildPatientsQuery,
  useGetChildPatientByCRNoQuery,
  useAddChildPatientToTodayListMutation,
  useDeleteChildPatientMutation,
} = patientsApiSlice;

