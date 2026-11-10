import { create } from 'zustand';
import api from '../utils/api';

const normalizeAvatar = (user) => {
  if (!user) return null;
  if (user.avatar?.includes('name=User')) {
    return {
      ...user,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=random`
    };
  }
  return user;
};

let initializePromise = null;

const useAuthStore = create((set, get) => ({
  user: null,
  isAuthenticated: localStorage.getItem('isAuthenticated') === 'true',
  isInitialized: false, // Prevents flickers on refresh
  loading: false,
  error: null,

  initialize: async () => {
    if (get().isInitialized) return;
    if (initializePromise) return initializePromise;

    initializePromise = (async () => {
      try {
        if (localStorage.getItem('isAuthenticated') === 'true') {
          await get().getMe();
        }
      } finally {
        set({ isInitialized: true });
        initializePromise = null;
      }
    })();

    return initializePromise;
  },

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post('/auth/login', { email, password });
      const userData = normalizeAvatar(response.data);
      set({ user: userData, isAuthenticated: true, loading: false });
      localStorage.setItem('isAuthenticated', 'true');
      return true;
    } catch (error) {
      if (error.response?.status === 403 && error.response?.data?.requiresVerification) {
        set({ loading: false });
        return error.response.data;
      }
      set({ error: error.response?.data?.message || 'Login failed', loading: false });
      return false;
    }
  },

  register: async (name, email, password) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post('/auth/register', { name, email, password });
      set({ loading: false });
      return response.data;
    } catch (error) {
      set({ error: error.response?.data?.message || 'Registration failed', loading: false });
      return false;
    }
  },

  googleLogin: async (idToken) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post('/auth/google-login', { idToken });
      const userData = normalizeAvatar(response.data);
      set({ user: userData, isAuthenticated: true, loading: false });
      localStorage.setItem('isAuthenticated', 'true');
      return true;
    } catch (error) {
      set({ error: error.response?.data?.message || error.message || 'Google login failed', loading: false });
      return false;
    }
  },

  setError: (message) => set({ error: message }),

  verifyEmail: async (email, otp) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post('/auth/verify-email', { email, otp });
      const userData = normalizeAvatar(response.data);
      set({ user: userData, isAuthenticated: true, loading: false });
      localStorage.setItem('isAuthenticated', 'true');
      return true;
    } catch (error) {
      set({ error: error.response?.data?.message || error.message || 'Verification failed', loading: false });
      return false;
    }
  },

  sendLoginOTP: async (email) => {
    set({ loading: true, error: null });
    try {
      await api.post('/auth/send-login-otp', { email });
      set({ loading: false });
      return true;
    } catch (error) {
      set({ error: error.response?.data?.message || 'Failed to send OTP', loading: false });
      return false;
    }
  },

  verifyLoginOTP: async (email, otp) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post('/auth/verify-login-otp', { email, otp });
      const userData = normalizeAvatar(response.data);
      set({ user: userData, isAuthenticated: true, loading: false });
      localStorage.setItem('isAuthenticated', 'true');
      return true;
    } catch (error) {
      set({ error: error.response?.data?.message || 'Verification failed', loading: false });
      return false;
    }
  },

  resendOTP: async (email) => {
    set({ loading: true, error: null });
    try {
      await api.post('/auth/resend-otp', { email });
      set({ loading: false });
      return true;
    } catch (error) {
      set({ error: error.response?.data?.message || 'Failed to resend OTP', loading: false });
      return false;
    }
  },

  updateProfile: async (data) => {
    set({ loading: true, error: null });
    try {
      const hasImageUpload = typeof data?.avatar === 'string' && data.avatar.startsWith('data:image');
      const response = await api.put('/auth/profile', data, hasImageUpload ? { timeout: 60000 } : undefined);
      const userData = normalizeAvatar(response.data);
      set({ user: userData, loading: false });
      return true;
    } catch (error) {
      const fallbackMessage =
        error.code === 'ECONNABORTED'
          ? 'Profile update timed out. Please try a smaller image or check your connection.'
          : error.message && !error.response
            ? `Network error: ${error.message}`
            : 'Profile update failed';
      set({ error: error.response?.data?.message || fallbackMessage, loading: false });
      return false;
    }
  },

  requestPasswordOtp: async () => {
    set({ loading: true, error: null });
    try {
      await api.post('/auth/request-password-otp', {});
      set({ loading: false });
      return true;
    } catch (error) {
      set({ error: error.response?.data?.message || 'Failed to request OTP', loading: false });
      return false;
    }
  },

  verifyPasswordOtp: async (otp, newPassword) => {
    set({ loading: true, error: null });
    try {
      await api.post('/auth/verify-password-otp', { otp, newPassword });
      set({ loading: false });
      return true;
    } catch (error) {
      set({ error: error.response?.data?.message || 'Password update failed', loading: false });
      return false;
    }
  },

  changePassword: async (currentPassword, newPassword, confirmPassword) => {
    set({ loading: true, error: null });
    try {
      await api.post('/auth/change-password', { 
        currentPassword, 
        newPassword, 
        confirmPassword 
      });
      set({ loading: false });
      return true;
    } catch (error) {
      set({ error: error.response?.data?.message || 'Password change failed', loading: false });
      return false;
    }
  },

  getMe: async () => {
    try {
      const response = await api.get('/auth/me');
      const userData = normalizeAvatar(response.data);
      set({ user: userData, isAuthenticated: true });
      localStorage.setItem('isAuthenticated', 'true');
      return userData;
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      set({ user: null, isAuthenticated: false });
      localStorage.removeItem('isAuthenticated');
      return null;
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      console.error('Logout API failed', e);
    }
    set({ user: null, isAuthenticated: false });
    localStorage.removeItem('isAuthenticated');
    
    // Clear old deprecated storage items just in case
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  },

  clearError: () => set({ error: null })
}));

export default useAuthStore;
