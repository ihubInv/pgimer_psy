import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef
} from "react";

import { useDispatch, useSelector } from "react-redux";
import useIdleTimer from "../hooks/useIdleTimer";
import {
  logout,
  selectCurrentToken
} from "../features/auth/authSlice";

import {
  useRefreshTokenMutation,
  useUpdateActivityMutation,
  useLogoutMutation
} from "../features/auth/authApiSlice";

const SessionContext = createContext(null);

export const useSession = () => {
  const context = useContext(SessionContext);
  if (!context) throw new Error("useSession must be used inside SessionProvider");
  return context;
};

export const SessionProvider = ({ children }) => {
  const dispatch = useDispatch();
  const token = useSelector(selectCurrentToken);

  const [isSessionExpired, setIsSessionExpired] = useState(false);
  const [isUIFrozen, setIsUIFrozen] = useState(false);

  const [refreshToken] = useRefreshTokenMutation();
  const [updateActivity] = useUpdateActivityMutation();
  const [logoutMutation] = useLogoutMutation();

  // Track last activity timestamp
  const lastActivityRef = useRef(Date.now());

  // Handle session expired
  const handleSessionExpired = useCallback(() => {
    if (isSessionExpired) return;

    setIsSessionExpired(true);
    setIsUIFrozen(true);

    dispatch(logout());
  }, [isSessionExpired, dispatch]);

  // When user becomes active again
  const handleActive = useCallback(async () => {
    if (!token) return;

    lastActivityRef.current = Date.now();

    try {
      await updateActivity().unwrap();
      lastActivityRef.current = Date.now();
    } catch (err) {
      console.error("Failed to update activity:", err);
    }
  }, [token, updateActivity]);

  // Idle timer hook — **30 minutes** timeout (matches JWT_ACCESS_EXPIRES_IN)
  useIdleTimer({
    timeout: 1800 * 1000, // ⏳ 30 minutes
    onIdle: handleSessionExpired,
    onActive: handleActive,
    enabled: !!token && !isSessionExpired
  });

  // Auto refresh token before expiry (every 20 minutes for 30-minute token)
  useEffect(() => {
    if (!token || isSessionExpired) return;

    const refreshInterval = setInterval(async () => {
      try {
        // DO NOT update activity here - activity should only be updated when user actually interacts
        // This prevents excessive API calls and ensures sessions expire correctly

        const result = await refreshToken().unwrap();

        // SECURITY: Access token is now stored in cookie, read from cookie
        const getCookie = (name) => {
          const value = `; ${document.cookie}`;
          const parts = value.split(`; ${name}=`);
          if (parts.length === 2) return parts.pop().split(';').shift();
          return null;
        };
        
        // Read token from cookie (fallback to response body for backward compatibility)
        const newToken = getCookie('accessToken') || result?.data?.accessToken;
        
        if (newToken) {
          // Only update token if it's different to avoid unnecessary re-renders
          // This prevents form data from being cleared during token refresh
          if (token !== newToken) {
            // Use updateToken action which only updates the token
            // This prevents full state updates and form data loss
            dispatch({
              type: "auth/updateToken",
              payload: newToken
            });
          }

          lastActivityRef.current = Date.now();
        }
      } catch (err) {
        if (err?.data?.code === "SESSION_EXPIRED") {
          handleSessionExpired();
        }
      }
    }, 1200000); // 🔁 20 minutes (refresh before 30-minute token expiry)

    return () => clearInterval(refreshInterval);
  }, [token, refreshToken, dispatch, isSessionExpired, handleSessionExpired]);

  // Every 5 minutes -> check session status (for 30-minute session)
  useEffect(() => {
    if (!token || isSessionExpired) return;

    const interval = setInterval(async () => {
      const diff = Date.now() - lastActivityRef.current;

      // Skip check if user is active (within 20 minutes for 30-minute session)
      if (diff < 1200000) return; // 20 minutes

      try {
        const result = await refreshToken().unwrap();
        
        // Only update token if it changed to prevent unnecessary re-renders
        if (result?.data?.accessToken && result.data.accessToken !== token) {
          // Use updateToken action which only updates the token
          // This prevents full state updates and form data loss
          dispatch({
            type: "auth/updateToken",
            payload: result.data.accessToken
          });
        }
        
        lastActivityRef.current = Date.now();
      } catch (err) {
        if (err?.data?.code === "SESSION_EXPIRED") {
          handleSessionExpired();
        }
      }
    }, 300000); // 5 minutes

    return () => clearInterval(interval);
  }, [token, refreshToken, dispatch, isSessionExpired, handleSessionExpired]);

  // Reset session expired state when user logs in (token changes from null to a value)
  // Clear session expired state when user logs out (token becomes null)
  // This ensures the session expired popup disappears after login/logout
  useEffect(() => {
    if (token) {
      // User has a valid token (logged in) - ensure session expired state is reset
      if (isSessionExpired) {
        setIsSessionExpired(false);
        setIsUIFrozen(false);
      }
      // Reset activity timestamp on login
      lastActivityRef.current = Date.now();
    } else {
      // User logged out - clear session expired state
      if (isSessionExpired) {
        setIsSessionExpired(false);
        setIsUIFrozen(false);
      }
    }
  }, [token, isSessionExpired]);

  // Logout handler
  const handleLogout = useCallback(async () => {
    try {
      await logoutMutation().unwrap();
    } catch (err) {
      console.error(err);
    } finally {
      dispatch(logout());
      setIsSessionExpired(false);
      setIsUIFrozen(false);
    }
  }, [logoutMutation, dispatch]);

  const value = {
    isSessionExpired,
    isUIFrozen,
    setIsUIFrozen,
    handleLogout
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
};