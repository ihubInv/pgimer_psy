import { apiSlice } from '../../app/api/apiSlice';

export const childClinicalApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Get child clinical proforma by ID
    getChildClinicalProformaById: builder.query({
      query: (id) => `/child-clinical-proformas/${id}`,
      providesTags: (result, error, id) => [{ type: 'ChildClinical', id }],
    }),
    // Get child clinical proformas by child patient ID
    getChildClinicalProformasByChildPatientId: builder.query({
      query: (childPatientId) => `/child-clinical-proformas/child-patient/${childPatientId}`,
      providesTags: (result, error, childPatientId) => [
        { type: 'ChildClinical', id: `child-patient-${childPatientId}` },
        'ChildClinical',
      ],
    }),
    // Get all child clinical proformas
    getAllChildClinicalProformas: builder.query({
      query: ({ page = 1, limit = 10, ...filters }) => ({
        url: '/child-clinical-proformas',
        params: { page, limit, ...filters },
      }),
      providesTags: ['ChildClinical'],
    }),
    // Create child clinical proforma
    createChildClinicalProforma: builder.mutation({
      query: (proformaData) => ({
        url: '/child-clinical-proformas',
        method: 'POST',
        body: proformaData,
      }),
      invalidatesTags: (result, error, proformaData) => {
        const tags = ['ChildClinical'];
        const childPatientId = result?.data?.proforma?.child_patient_id || proformaData?.child_patient_id;
        if (childPatientId) {
          tags.push({ type: 'ChildClinical', id: `child-patient-${childPatientId}` });
        }
        return tags;
      },
    }),
    // Update child clinical proforma
    updateChildClinicalProforma: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `/child-clinical-proformas/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id, child_patient_id }) => {
        const tags = [
          { type: 'ChildClinical', id },
          'ChildClinical',
        ];
        const cpid = result?.data?.proforma?.child_patient_id || child_patient_id;
        if (cpid) {
          tags.push({ type: 'ChildClinical', id: `child-patient-${cpid}` });
        }
        return tags;
      },
    }),
  }),
});

export const {
  useGetChildClinicalProformaByIdQuery,
  useGetChildClinicalProformasByChildPatientIdQuery,
  useGetAllChildClinicalProformasQuery,
  useCreateChildClinicalProformaMutation,
  useUpdateChildClinicalProformaMutation,
} = childClinicalApiSlice;
