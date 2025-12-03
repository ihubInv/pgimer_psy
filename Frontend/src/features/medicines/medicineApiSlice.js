import { apiSlice } from '../../app/api/apiSlice';

export const medicineApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Get all medicines with pagination and filters
    getAllMedicines: builder.query({
      query: ({ page = 1, limit = 50, category, search, is_active } = {}) => {
        const params = new URLSearchParams();
        params.append('page', page);
        params.append('limit', limit);
        if (category) params.append('category', category);
        if (search) params.append('search', search);
        if (is_active !== undefined) params.append('is_active', is_active);
        return `/medicines?${params.toString()}`;
      },
      providesTags: (result) =>
        result
          ? [
              ...result.data.medicines.map(({ id }) => ({ type: 'Medicine', id })),
              { type: 'Medicine', id: 'LIST' },
            ]
          : [{ type: 'Medicine', id: 'LIST' }],
    }),

    // Get medicine by ID
    getMedicineById: builder.query({
      query: (id) => `/medicines/${id}`,
      providesTags: (result, error, id) => [{ type: 'Medicine', id }],
    }),

    // Get medicines by category
    getMedicinesByCategory: builder.query({
      query: (category) => `/medicines/category/${category}`,
      providesTags: (result, error, category) => [
        { type: 'Medicine', id: `category-${category}` },
        'Medicine',
      ],
    }),

    // Get all categories
    getCategories: builder.query({
      query: () => '/medicines/categories',
      providesTags: ['Medicine'],
    }),

    // Create medicine
    createMedicine: builder.mutation({
      query: (medicineData) => ({
        url: '/medicines',
        method: 'POST',
        body: medicineData,
      }),
      invalidatesTags: ['Medicine'],
    }),

    // Update medicine
    updateMedicine: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `/medicines/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Medicine', id },
        'Medicine',
      ],
    }),

    // Delete medicine
    deleteMedicine: builder.mutation({
      query: (id) => ({
        url: `/medicines/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'Medicine', id },
        'Medicine',
      ],
    }),

    // Bulk import medicines
    bulkImportMedicines: builder.mutation({
      query: () => ({
        url: '/medicines/bulk-import',
        method: 'POST',
      }),
      invalidatesTags: ['Medicine'],
    }),
  }),
});

export const {
  useGetAllMedicinesQuery,
  useGetMedicineByIdQuery,
  useGetMedicinesByCategoryQuery,
  useGetCategoriesQuery,
  useCreateMedicineMutation,
  useUpdateMedicineMutation,
  useDeleteMedicineMutation,
  useBulkImportMedicinesMutation,
} = medicineApiSlice;

