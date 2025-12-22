

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

// Suppress console errors for expected 404s on prescription endpoints
// This prevents browser console from showing errors for missing prescriptions (which is normal)
// Note: Browser Network tab will still show 404s, but console.error won't log them
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

// Override console.error to filter expected errors
console.error = (...args) => {
  const errorString = String(args[0] || '');
  
  // Suppress 404 errors for prescription endpoints (expected when no prescription exists)
  if (errorString.includes('404') && 
      (errorString.includes('prescriptions/by-proforma') || 
       errorString.includes('/api/prescriptions/by-proforma/'))) {
    // Suppress this expected error - it's handled gracefully by RTK Query
    return;
  }
  
  // Suppress 401 errors that are being handled by token refresh mechanism
  // These are temporary and will be resolved after token refresh
  if (errorString.includes('401') && errorString.includes('Unauthorized')) {
    // Check if it's a token refresh scenario (not a permanent auth failure)
    // We'll let the token refresh mechanism handle it silently
    // Only suppress if it's not a session expired error (those should be logged)
    if (!errorString.includes('Session expired') && !errorString.includes('SESSION_EXPIRED')) {
      // This is likely a token expiration that will be auto-refreshed
      // Suppress to reduce console noise during automatic token refresh
      return;
    }
  }
  
  // Log all other errors normally
  originalConsoleError.apply(console, args);
};

// Also filter console.warn for RTK Query warnings about 404s
console.warn = (...args) => {
  const warnString = String(args[0] || '');
  // Suppress RTK Query warnings about 404s on prescription endpoints
  if (warnString.includes('404') && warnString.includes('prescriptions/by-proforma')) {
    return;
  }
  // Log all other warnings normally
  originalConsoleWarn.apply(console, args);
};

// Track if we're currently refreshing to prevent multiple simultaneous refresh attempts
let isRefreshing = false;
let refreshPromise = null;

const baseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_API_URL || '/api',
  credentials: 'include', // Include cookies for refresh tokens
  prepareHeaders: (headers, { getState }) => {
    const token = getState().auth.token;
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    headers.set('Content-Type', 'application/json');
    return headers;
  },
  // Custom fetch function to suppress console errors for expected 404s
  fetchFn: async (url, options) => {
    const response = await fetch(url, options);
    
    // For prescription endpoints with 404, clone response but don't treat as error
    // This prevents browser from logging it as an error
    const urlString = String(url || '');
    if (response.status === 404 && urlString.includes('/prescriptions/by-proforma/')) {
      // Return a response that RTK Query will handle gracefully
      return response;
    }
    
    return response;
  },
});

// Base query with automatic token refresh
const baseQueryWithReauth = async (args, api, extraOptions) => {
  let result = await baseQuery(args, api, extraOptions);

  // Handle 404 for prescription endpoints gracefully (it's expected when no prescription exists)
  // Note: Browser console may still show 404 network errors, but RTK Query handles them gracefully
  // This is normal behavior - 404s are logged by the browser before our code can intercept them
  const argsUrlString = String(args.url || '');
  if (result?.error?.status === 404 && argsUrlString.includes('/prescriptions/by-proforma/')) {
    // Return success with null data instead of error for missing prescriptions
    // This prevents RTK Query from treating it as an error and breaking the UI
    return {
      data: {
        success: true,
        data: { prescription: null },
        message: 'No prescription found for this clinical proforma'
      },
      error: undefined,
      meta: {
        ...result.meta,
        request: { ...result.meta?.request, suppressErrorLog: true }
      }
    };
  }

  // If access token expired, try to refresh it
  if (result?.error?.status === 401) {
    // Check if it's a token expiration error
    const errorMessage = String(result?.error?.data?.message || '');
    const errorData = result?.error?.data || {};
    
    // Don't try to refresh if it's a session expired error or login endpoint
    const urlString = String(args.url || '');
    if (
      (errorMessage && typeof errorMessage === 'string' && errorMessage.includes('Session expired')) ||
      (errorMessage && typeof errorMessage === 'string' && errorMessage.includes('SESSION_EXPIRED')) ||
      (urlString && urlString.includes('/login')) ||
      (urlString && urlString.includes('/session/refresh'))
    ) {
      // Session expired or refresh failed, logout user
      if (errorMessage && typeof errorMessage === 'string' && (errorMessage.includes('Session expired') || errorMessage.includes('SESSION_EXPIRED'))) {
        console.log('[apiSlice] Session expired, logging out');
      api.dispatch({ type: 'auth/logout' });
      return result;
      }
    }

    // DO NOT update activity here - activity should only be updated when user actually interacts
    // Updating activity here would prevent sessions from expiring and cause excessive API calls
    // The backend will check inactivity on token refresh and expire if user has been idle for 2+ minutes

    // Try to refresh the token (skip if we're already trying to refresh)
    const urlStr = String(args.url || '');
    if (!urlStr.includes('/session/refresh') && !isRefreshing) {
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

    // SECURITY: Access token is now stored in cookie, read from cookie
    const getCookie = (name) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop().split(';').shift();
      return null;
    };
    
    if (refreshResult?.data?.success) {
      // Read token from cookie (fallback to response body for backward compatibility)
      const newToken = getCookie('accessToken') || refreshResult.data.data?.accessToken;
      
      if (newToken) {
        // Store the new token - use updateToken to avoid unnecessary re-renders
        // This prevents form data from being cleared during automatic token refresh
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
      }
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
    } else if (urlStr && urlStr.includes('/session/refresh')) {
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
  tagTypes: ['User', 'Patient', 'Clinical', 'ADL', 'Stats', 'Prescription', 'Rooms', 'MyRoom', 'Medicine', 'PrescriptionTemplate', 'FollowUp', 'PatientVisit'],
  endpoints: (builder) => ({}),
});