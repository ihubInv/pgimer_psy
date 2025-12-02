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

  // Idle timer hook — **10 minutes** timeout
  useIdleTimer({
    timeout: 600 * 1000, // ⏳ 10 minutes
    onIdle: handleSessionExpired,
    onActive: handleActive,
    enabled: !!token && !isSessionExpired
  });

  // Auto refresh token before expiry (every 8 minutes for 10-minute session)
  useEffect(() => {
    if (!token || isSessionExpired) return;

    const refreshInterval = setInterval(async () => {
      try {
        // DO NOT update activity here - activity should only be updated when user actually interacts
        // This prevents excessive API calls and ensures sessions expire correctly

        const result = await refreshToken().unwrap();

        if (result?.data?.accessToken) {
          // Only update token if it's different to avoid unnecessary re-renders
          // This prevents form data from being cleared during token refresh
          const newToken = result.data.accessToken;
          
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
    }, 480000); // 🔁 8 minutes (refresh before 10-minute expiry)

    return () => clearInterval(refreshInterval);
  }, [token, refreshToken, dispatch, isSessionExpired, handleSessionExpired]);

  // Every 2 minutes -> check session status (for 10-minute session)
  useEffect(() => {
    if (!token || isSessionExpired) return;

    const interval = setInterval(async () => {
      const diff = Date.now() - lastActivityRef.current;

      // Skip check if user is active (within 5 minutes for 10-minute session)
      if (diff < 300000) return; // 5 minutes

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
    }, 120000); // 2 minutes

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