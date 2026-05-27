import { apiSlice } from '../../app/api/apiSlice';

export const dashboardApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getDashboard: builder.query({
      query: (params) => {
        if (!params || Object.keys(params).length === 0) return '/dashboard';
        const usp = new URLSearchParams();
        Object.entries(params).forEach(([k, v]) => {
          if (v === undefined || v === null || v === '') return;
          usp.set(k, String(v));
        });
        const qs = usp.toString();
        return qs ? `/dashboard?${qs}` : '/dashboard';
      },
      providesTags: ['Dashboard'],
    }),
  }),
});

export const { useGetDashboardQuery } = dashboardApiSlice;
