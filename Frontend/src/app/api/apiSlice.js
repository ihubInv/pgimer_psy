// import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

// const baseQuery = fetchBaseQuery({
//   baseUrl: import.meta.env.VITE_API_URL || 'http://31.97.60.2:2025/api',
//   credentials: 'include', // Include cookies for refresh tokens
//   prepareHeaders: (headers, { getState }) => {
//     const token = getState().auth.token;
//     if (token) {
//       headers.set('authorization', `Bearer ${token}`);
//     }
//     headers.set('Content-Type', 'application/json');
//     return headers;
//   },
// });

// // Base query with automatic token refresh
// const baseQueryWithReauth = async (args, api, extraOptions) => {
//   let result = await baseQuery(args, api, extraOptions);

//   // If access token expired, try to refresh it
//   if (result?.error?.status === 401) {
//     // Check if it's a token expiration error
//     const errorMessage = result?.error?.data?.message || '';
    
//     // Don't try to refresh if it's a session expired error or login endpoint
//     if (
//       errorMessage.includes('Session expired') ||
//       errorMessage.includes('SESSION_EXPIRED') ||
//       args.url?.includes('/login') ||
//       args.url?.includes('/session/refresh')
//     ) {
//       // Session expired or refresh failed, logout user
//       api.dispatch({ type: 'auth/logout' });
//       return result;
//     }

//     // Update activity before refreshing to ensure backend sees recent activity
//     // This is critical for the 10-second inactivity check
//     try {
//       await baseQuery(
//         { url: '/session/activity', method: 'POST' },
//         api,
//         extraOptions
//       );
//     } catch (activityError) {
//       // If activity update fails, still try to refresh
//       console.warn('Failed to update activity before refresh:', activityError);
//     }

//     // Try to refresh the token
//     const refreshResult = await baseQuery(
//       { url: '/session/refresh', method: 'POST' },
//       api,
//       extraOptions
//     );

//     if (refreshResult?.data?.success && refreshResult?.data?.data?.accessToken) {
//       // Store the new token
//       const newToken = refreshResult.data.data.accessToken;
//       const state = api.getState();
//       api.dispatch({
//         type: 'auth/setCredentials',
//         payload: {
//           user: state.auth.user,
//           token: newToken
//         }
//       });

//       // Retry the original query with new token
//       result = await baseQuery(args, api, extraOptions);
//     } else {
//       // Refresh failed, logout user
//       api.dispatch({ type: 'auth/logout' });
//     }
//   }

//   return result;
// };

// export const apiSlice = createApi({
//   baseQuery: baseQueryWithReauth,
//   tagTypes: ['User', 'Patient', 'Clinical', 'ADL', 'Stats', 'Prescription'],
//   endpoints: (builder) => ({}),
// });




import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const baseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_API_URL || 'http://31.97.60.2:2025/api',
  credentials: 'include', // Include cookies for refresh tokens
  prepareHeaders: (headers, { getState }) => {
    const token = getState().auth.token;
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    headers.set('Content-Type', 'application/json');
    return headers;
  },
});

// Base query with automatic token refresh
const baseQueryWithReauth = async (args, api, extraOptions) => {
  let result = await baseQuery(args, api, extraOptions);

  // If access token expired, try to refresh it
  if (result?.error?.status === 401) {
    // Check if it's a token expiration error
    const errorMessage = result?.error?.data?.message || '';
    
    // Don't try to refresh if it's a session expired error or login endpoint
    if (
      errorMessage.includes('Session expired') ||
      errorMessage.includes('SESSION_EXPIRED') ||
      args.url?.includes('/login') ||
      args.url?.includes('/session/refresh')
    ) {
      // Session expired or refresh failed, logout user
      api.dispatch({ type: 'auth/logout' });
      return result;
    }

    // DO NOT update activity here - activity should only be updated when user actually interacts
    // Updating activity here would prevent sessions from expiring and cause excessive API calls
    // The backend will check inactivity on token refresh and expire if user has been idle for 2+ minutes

    // Try to refresh the token
    const refreshResult = await baseQuery(
      { url: '/session/refresh', method: 'POST' },
      api,
      extraOptions
    );

    if (refreshResult?.data?.success && refreshResult?.data?.data?.accessToken) {
      // Store the new token - use updateToken to avoid unnecessary re-renders
      // This prevents form data from being cleared during automatic token refresh
      const newToken = refreshResult.data.data.accessToken;
      const state = api.getState();
      
      // Only update if token actually changed
      if (state.auth.token !== newToken) {
        api.dispatch({
          type: 'auth/updateToken',
          payload: newToken
        });
      }

      // Retry the original query with new token
      result = await baseQuery(args, api, extraOptions);
    } else {
      // Refresh failed, logout user
      api.dispatch({ type: 'auth/logout' });
    }
  }

  return result;
};

export const apiSlice = createApi({
  baseQuery: baseQueryWithReauth,
  tagTypes: ['User', 'Patient', 'Clinical', 'ADL', 'Stats', 'Prescription', 'Rooms', 'MyRoom'],
  endpoints: (builder) => ({}),
});