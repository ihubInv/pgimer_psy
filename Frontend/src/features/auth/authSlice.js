import { createSlice } from '@reduxjs/toolkit';
import { normalizeRole } from '../../utils/constants';

// Helper function to normalize user role
const normalizeUser = (user) => {
  if (!user) return null;
  if (user.role) {
    const normalizedRole = normalizeRole(user.role);
    if (normalizedRole !== user.role) {
      return { ...user, role: normalizedRole };
    }
  }
  return user;
};

// Helper function to get user from localStorage safely
const getUserFromStorage = () => {
  try {
    const userData = localStorage.getItem('user');
    const user = userData ? JSON.parse(userData) : null;
    return normalizeUser(user);
  } catch (error) {
    console.error('Error parsing user data from localStorage:', error);
    localStorage.removeItem('user');
    return null;
  }
};

// Get initial user and normalize it
const initialUser = getUserFromStorage();
// Save normalized user back to localStorage if it was changed
if (initialUser) {
  const userData = localStorage.getItem('user');
  if (userData) {
    try {
      const parsedUser = JSON.parse(userData);
      if (parsedUser.role && normalizeRole(parsedUser.role) !== parsedUser.role) {
        localStorage.setItem('user', JSON.stringify(initialUser));
      }
    } catch (e) {
      // Ignore parse errors
    }
  }
}

const initialState = {
  user: initialUser,
  token: localStorage.getItem('token') || null,
  isAuthenticated: !!(localStorage.getItem('token') && initialUser),
  otpRequired: false,
  loginData: null, // Store user_id and email for OTP verification
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      const { user, token } = action.payload;
      const normalizedUser = normalizeUser(user);
      state.user = normalizedUser;
      state.token = token;
      state.isAuthenticated = true;
      state.otpRequired = false;
      state.loginData = null;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(normalizedUser));
    },
    setOTPRequired: (state, action) => {
      state.otpRequired = true;
      state.loginData = action.payload;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.otpRequired = false;
      state.loginData = null;
      try {
        // Preserve createPatient data when session expires (user might be in middle of creating patient)
        const createPatientPatientId = localStorage.getItem('createPatient_patientId');
        const createPatientStep = localStorage.getItem('createPatient_step');
        
        // Clear all app data from storage on logout
        localStorage.clear();
        sessionStorage.clear();
        
        // Restore createPatient data if it existed (preserve user's progress)
        if (createPatientPatientId && createPatientStep) {
          localStorage.setItem('createPatient_patientId', createPatientPatientId);
          localStorage.setItem('createPatient_step', createPatientStep);
        }
      } catch (e) {
        // Fallback to removing known keys if clear() fails (e.g., quota issues)
        const createPatientPatientId = localStorage.getItem('createPatient_patientId');
        const createPatientStep = localStorage.getItem('createPatient_step');
        
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        try { sessionStorage.clear(); } catch (_) {}
        
        // Restore createPatient data if it existed
        if (createPatientPatientId && createPatientStep) {
          localStorage.setItem('createPatient_patientId', createPatientPatientId);
          localStorage.setItem('createPatient_step', createPatientStep);
        }
      }
    },
    updateUser: (state, action) => {
      const updatedUser = { ...state.user, ...action.payload };
      const normalizedUser = normalizeUser(updatedUser);
      state.user = normalizedUser;
      localStorage.setItem('user', JSON.stringify(normalizedUser));
    },
  },
});

export const { setCredentials, setOTPRequired, logout, updateUser } = authSlice.actions;

export default authSlice.reducer;

export const selectCurrentUser = (state) => state.auth.user;
export const selectCurrentToken = (state) => state.auth.token;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectOTPRequired = (state) => state.auth.otpRequired;
export const selectLoginData = (state) => state.auth.loginData;

