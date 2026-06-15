import { apiSlice } from '../../app/api/apiSlice';

export const patientsApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getAllPatients: builder.query({
      query: ({ page = 1, limit = 10, ...filters }) => ({
        url: '/patients',
        params: { page, limit, ...filters },
      }),
      providesTags: (result, error, arg) => {
        const tags = ['Patient', { type: 'Patient', id: 'LIST' }];
        if (arg?.referral_view) {
          tags.push({ type: 'Patient', id: `REFERRAL-${arg.referral_view}` });
        }
        if (arg?.date) {
          const roomSuffix = arg?.assigned_room ? `-${arg.assigned_room}` : '';
          tags.push({ type: 'Patient', id: `LIST-${arg.date}${roomSuffix}` });
        }
        if (arg?.unassigned_only) {
          tags.push({ type: 'Patient', id: 'UNASSIGNED' });
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
        // Use IST date string to match the date-specific cache key used by getAllPatients
        const todayIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
        const tags = [
          'Patient',
          'Stats',
          { type: 'Patient', id: 'LIST' },
          { type: 'Patient', id: `LIST-${todayIST}` },
        ];
        // If creating a visit for an existing patient, also invalidate their visit count cache
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
      invalidatesTags: () => {
        const todayIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
        return [
          'Patient',
          'Stats',
          'ClinicalProforma',
          'ADLFile',
          { type: 'Patient', id: 'LIST' },
          { type: 'Patient', id: `LIST-${todayIST}` },
        ];
      },
    }),
    updatePatient: builder.mutation({
      queryFn: async ({ id, files, files_to_remove, ...data }, _queryApi, _extraOptions, fetchWithBQ) => {
        const baseUrl = import.meta.env.VITE_API_URL || '/api';
        const state = _queryApi.getState();
        const token = state.auth.token;
        
        // If files are present, use FormData; otherwise use JSON
        if (files && files.length > 0 || (files_to_remove && files_to_remove.length > 0)) {
          const formData = new FormData();

          // Ensure patient id is first in multipart body so multer never falls back to "temp"
          formData.append('patient_id', String(id));

          // Append patient data (skip patient_id — already set above for multer)
          Object.keys(data).forEach(key => {
            if (key === 'patient_id') return;
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
      query: () => ({
        url: '/patients/stats',
      }),
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
      query: () => ({
        url: '/patients/stats',
      }),
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
      query: ({ patient_id, new_room, patient_type }) => ({
        url: `/patients/${patient_id}/change-room`,
        method: 'POST',
        body: {
          new_room,
          ...(patient_type ? { patient_type } : {}),
        },
      }),
      // Invalidate patient cache to trigger real-time updates across all doctor views
      invalidatesTags: (result, error, { patient_id }) => [
        { type: 'Patient', id: patient_id },
        { type: 'Patient', id: 'LIST' },
        { type: 'PatientVisit', id: patient_id },
        'Patient', // Invalidate all patient queries to refresh both doctors' lists
      ],
    }),
    transferPatientToDoctor: builder.mutation({
      query: ({ patient_id, target_doctor_id, patient_type }) => ({
        url: `/patients/${patient_id}/transfer`,
        method: 'POST',
        body: {
          target_doctor_id,
          ...(patient_type ? { patient_type } : {}),
        },
      }),
      invalidatesTags: (result, error, { patient_id }) => [
        { type: 'Patient', id: patient_id },
        { type: 'Patient', id: 'LIST' },
        { type: 'PatientVisit', id: patient_id },
        'Patient',
      ],
    }),
    addPatientToMyList: builder.mutation({
      query: ({ patientId, patient_type, doctor_id }) => ({
        url: `/patients/${patientId}/add-to-my-list`,
        method: 'POST',
        body: {
          ...(patient_type ? { patient_type } : {}),
          ...(doctor_id != null && doctor_id !== '' ? { doctor_id } : {}),
        },
      }),
      invalidatesTags: (result, error, patientId) => [
        { type: 'Patient', id: patientId },
        { type: 'Patient', id: 'LIST' },
        { type: 'Patient', id: 'UNASSIGNED' },
        'Patient',
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
    getChildPatientById: builder.query({
      query: (id) => `/child-patient/${id}`,
      providesTags: (result, error, id) => [{ type: 'ChildPatient', id }],
      keepUnusedDataFor: 120,
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

    /** Append/remove files on child registration (`POST /child-patient/:id/documents`) */
    referPatientToDoctor: builder.mutation({
      query: ({ patientId, referred_to_doctor_id, referral_reason, patient_type, notes }) => ({
        url: `/patients/${patientId}/refer`,
        method: 'POST',
        body: {
          referred_to_doctor_id,
          referral_reason,
          patient_type,
          notes,
        },
      }),
      invalidatesTags: ['Patient', { type: 'Patient', id: 'LIST' }],
    }),
    bulkReferPatients: builder.mutation({
      query: ({ patients, referred_to_doctor_id, referral_reason, notes }) => ({
        url: '/patients/refer/bulk',
        method: 'POST',
        body: { patients, referred_to_doctor_id, referral_reason, notes },
      }),
      invalidatesTags: ['Patient', { type: 'Patient', id: 'LIST' }],
    }),
    markReferralSeen: builder.mutation({
      query: (referralId) => ({
        url: `/patients/referrals/${referralId}/seen`,
        method: 'PATCH',
      }),
      invalidatesTags: ['Patient', { type: 'Patient', id: 'LIST' }],
    }),
    completeReferral: builder.mutation({
      query: ({ referralId, notes }) => ({
        url: `/patients/referrals/${referralId}/complete`,
        method: 'PATCH',
        body: notes ? { notes } : {},
      }),
      invalidatesTags: ['Patient', { type: 'Patient', id: 'LIST' }],
    }),
    getReferralLogs: builder.query({
      query: (referralId) => `/patients/referrals/${referralId}/logs`,
    }),
    revokeReferral: builder.mutation({
      query: ({ referralId, notes }) => ({
        url: `/patients/referrals/${referralId}/revoke`,
        method: 'PATCH',
        body: notes ? { notes } : {},
      }),
      invalidatesTags: ['Patient', { type: 'Patient', id: 'LIST' }],
    }),
    updateChildPatientDocuments: builder.mutation({
      queryFn: async ({ id, files = [], files_to_remove = [] }, _queryApi, _extraOptions) => {
        const formData = new FormData();
        if (files_to_remove && files_to_remove.length > 0) {
          formData.append('files_to_remove', JSON.stringify(files_to_remove));
        }
        (files || []).forEach((file) => {
          formData.append('files', file);
        });

        const baseUrl = import.meta.env.VITE_API_URL || '/api';
        let token = localStorage.getItem('token');
        try {
          const rawUser = localStorage.getItem('user');
          if (rawUser) {
            const parsed = JSON.parse(rawUser);
            if (parsed?.token) token = parsed.token;
          }
        } catch {
          /* keep token */
        }

        try {
          const response = await fetch(`${baseUrl}/child-patient/${id}/documents`, {
            method: 'POST',
            headers: {
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: formData,
            credentials: 'include',
          });
          const data = await response.json().catch(() => ({}));
          if (!response.ok) {
            return { error: { status: response.status, data } };
          }
          return { data };
        } catch (error) {
          return { error: { status: 'FETCH_ERROR', error: error.message } };
        }
      },
      invalidatesTags: (result, error, { id }) => [
        { type: 'ChildPatient', id },
        { type: 'ChildPatient', id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useGetAllPatientsQuery,
  useGetPatientByIdQuery,
  useGetPatientByCRNoQuery,
  useLazyGetPatientByCRNoQuery,
  useSearchPatientsQuery,
  useLazySearchPatientsQuery,
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
  useTransferPatientToDoctorMutation,
  useAddPatientToMyListMutation,
  useUploadPatientFilesMutation,
  useGetPatientFilesQuery,
  useDeletePatientFileMutation,
  useGetChildPatientByCRNoQuery,
  useGetChildPatientByIdQuery,
  useAddChildPatientToTodayListMutation,
  useDeleteChildPatientMutation,
  useUpdateChildPatientDocumentsMutation,
  useReferPatientToDoctorMutation,
  useBulkReferPatientsMutation,
  useMarkReferralSeenMutation,
  useCompleteReferralMutation,
  useGetReferralLogsQuery,
  useRevokeReferralMutation,
} = patientsApiSlice;

