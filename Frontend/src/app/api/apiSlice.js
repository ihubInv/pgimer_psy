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

// Track if we're currently refreshing to prevent multiple simultaneous refresh attempts
let isRefreshing = false;
let refreshPromise = null;

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
    const errorData = result?.error?.data || {};
    
    // Don't try to refresh if it's a session expired error or login endpoint
    if (
      errorMessage.includes('Session expired') ||
      errorMessage.includes('SESSION_EXPIRED') ||
      args.url?.includes('/login') ||
      args.url?.includes('/session/refresh')
    ) {
      // Session expired or refresh failed, logout user
      if (errorMessage.includes('Session expired') || errorMessage.includes('SESSION_EXPIRED')) {
        console.log('[apiSlice] Session expired, logging out');
      api.dispatch({ type: 'auth/logout' });
      return result;
      }
    }

    // DO NOT update activity here - activity should only be updated when user actually interacts
    // Updating activity here would prevent sessions from expiring and cause excessive API calls
    // The backend will check inactivity on token refresh and expire if user has been idle for 2+ minutes

    // Try to refresh the token (skip if we're already trying to refresh)
    if (!args.url?.includes('/session/refresh') && !isRefreshing) {
      // If we're not already refreshing, start a refresh
      if (!refreshPromise) {
        isRefreshing = true;
        console.log('[apiSlice] Token expired, attempting refresh...');
        
        refreshPromise = baseQuery(
      { url: '/session/refresh', method: 'POST' },
      api,
      extraOptions
        ).then((refreshResult) => {
          isRefreshing = false;
          refreshPromise = null;

    if (refreshResult?.data?.success && refreshResult?.data?.data?.accessToken) {
      // Store the new token - use updateToken to avoid unnecessary re-renders
      // This prevents form data from being cleared during automatic token refresh
      const newToken = refreshResult.data.data.accessToken;
      const state = api.getState();
      
      // Only update if token actually changed
      if (state.auth.token !== newToken) {
              console.log('[apiSlice] Token refreshed successfully');
        api.dispatch({
          type: 'auth/updateToken',
          payload: newToken
        });
      }

            return { success: true, token: newToken };
          } else {
            // Refresh failed, logout user
            console.log('[apiSlice] Token refresh failed, logging out');
            api.dispatch({ type: 'auth/logout' });
            return { success: false };
          }
        }).catch((error) => {
          isRefreshing = false;
          refreshPromise = null;
          console.error('[apiSlice] Token refresh error:', error);
          api.dispatch({ type: 'auth/logout' });
          return { success: false };
        });
      }
      
      // Wait for the refresh to complete
      const refreshResult = await refreshPromise;
      
      if (refreshResult?.success) {
      // Retry the original query with new token
      result = await baseQuery(args, api, extraOptions);
      }
    } else if (isRefreshing && refreshPromise) {
      // If we're already refreshing, wait for it to complete and retry
      const refreshResult = await refreshPromise;
      if (refreshResult?.success) {
        result = await baseQuery(args, api, extraOptions);
      }
    } else if (args.url?.includes('/session/refresh')) {
      // Already trying to refresh, just logout
      console.log('[apiSlice] Refresh endpoint returned 401, logging out');
      isRefreshing = false;
      refreshPromise = null;
      api.dispatch({ type: 'auth/logout' });
    }
  }

  return result;
};

export const apiSlice = createApi({
  baseQuery: baseQueryWithReauth,
  tagTypes: ['User', 'Patient', 'Clinical', 'ADL', 'Stats', 'Prescription', 'Rooms', 'MyRoom', 'Medicine', 'PrescriptionTemplate'],
  endpoints: (builder) => ({}),
});