import { apiSlice } from '../../app/api/apiSlice';

export const prescriptionTemplateApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Get all prescription templates
    getAllPrescriptionTemplates: builder.query({
      query: (params = {}) => {
        const queryParams = new URLSearchParams();
        if (params.is_active !== undefined) {
          queryParams.append('is_active', params.is_active);
        }
        return {
          url: `/prescription-templates${queryParams.toString() ? `?${queryParams.toString()}` : ''}`,
          method: 'GET',
        };
      },
      providesTags: ['PrescriptionTemplate'],
    }),

    // Get a specific template by ID
    getPrescriptionTemplateById: builder.query({
      query: (id) => ({
        url: `/prescription-templates/${id}`,
        method: 'GET',
      }),
      providesTags: (result, error, id) => [{ type: 'PrescriptionTemplate', id }],
    }),

    // Create a new template
    createPrescriptionTemplate: builder.mutation({
      query: (templateData) => ({
        url: '/prescription-templates',
        method: 'POST',
        body: templateData,
      }),
      invalidatesTags: ['PrescriptionTemplate'],
    }),

    // Update a template
    updatePrescriptionTemplate: builder.mutation({
      query: ({ id, ...templateData }) => ({
        url: `/prescription-templates/${id}`,
        method: 'PUT',
        body: templateData,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'PrescriptionTemplate', id },
        'PrescriptionTemplate',
      ],
    }),

    // Delete a template
    deletePrescriptionTemplate: builder.mutation({
      query: (id) => ({
        url: `/prescription-templates/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'PrescriptionTemplate', id },
        'PrescriptionTemplate',
      ],
    }),
  }),
});

export const {
  useGetAllPrescriptionTemplatesQuery,
  useGetPrescriptionTemplateByIdQuery,
  useCreatePrescriptionTemplateMutation,
  useUpdatePrescriptionTemplateMutation,
  useDeletePrescriptionTemplateMutation,
} = prescriptionTemplateApiSlice;

