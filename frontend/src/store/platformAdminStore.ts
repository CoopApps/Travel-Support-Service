import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PlatformAdmin } from '../types';

/**
 * Platform Admin Store
 *
 * Manages platform admin authentication state
 */

/**
 * Check if a JWT token is expired
 */
function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    // Check if token has expired (exp is in seconds, Date.now() is in milliseconds)
    return payload.exp * 1000 < Date.now();
  } catch (err) {
    console.error('Failed to decode token:', err);
    return true; // If we can't decode it, consider it expired
  }
}

interface PlatformAdminState {
  admin: PlatformAdmin | null;
  token: string | null;
  isAuthenticated: boolean;

  // Actions
  setAdmin: (admin: PlatformAdmin, token: string) => void;
  logout: () => void;
}

export const usePlatformAdminStore = create<PlatformAdminState>()(
  persist(
    (set) => ({
      admin: null,
      token: null,
      isAuthenticated: false,

      setAdmin: (admin, token) => {
        localStorage.setItem('platformAdminToken', token);
        localStorage.setItem('platformAdmin', JSON.stringify(admin));
        set({ admin, token, isAuthenticated: true });
      },

      logout: () => {
        localStorage.removeItem('platformAdminToken');
        localStorage.removeItem('platformAdmin');
        set({ admin: null, token: null, isAuthenticated: false });
      },
    }),
    {
      name: 'platform-admin-storage',
      partialize: (state) => ({
        admin: state.admin,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
      // Check token expiration on hydration
      onRehydrateStorage: () => (state) => {
        if (state?.token && isTokenExpired(state.token)) {
          console.log('Platform admin token expired on rehydration, clearing auth state');
          state.logout();
        }
      },
    }
  )
);

// Periodic token expiration check for platform admin (runs every minute)
if (typeof window !== 'undefined') {
  setInterval(() => {
    const state = usePlatformAdminStore.getState();
    if (state.token && isTokenExpired(state.token)) {
      console.log('Platform admin token expired during session, logging out');
      state.logout();
    }
  }, 60000); // Check every 60 seconds
}
