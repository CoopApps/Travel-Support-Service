import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '../types';

/**
 * Authentication Store - Stage 3
 *
 * Uses Zustand for lightweight state management.
 * Persists auth state to localStorage for session persistence.
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

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: (user, token) => {
        // Clear React Query cache on login to ensure fresh data
        if (typeof window !== 'undefined') {
          import('../main').then(({ queryClient }) => {
            queryClient.clear();
          });
        }

        set({
          user,
          token,
          isAuthenticated: true,
        });
      },

      logout: () => {
        // Clear React Query cache on logout
        if (typeof window !== 'undefined') {
          import('../main').then(({ queryClient }) => {
            queryClient.clear();
          });
        }

        set({
          user: null,
          token: null,
          isAuthenticated: false,
        });
      },

      updateUser: (userData) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...userData } : null,
        }));
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
      // Check token expiration on hydration
      onRehydrateStorage: () => (state) => {
        if (state?.token && isTokenExpired(state.token)) {
          console.log('Token expired on rehydration, clearing auth state');
          state.logout();
        }
      },
    }
  )
);

// Periodic token expiration check (runs every minute)
if (typeof window !== 'undefined') {
  setInterval(() => {
    const state = useAuthStore.getState();
    if (state.token && isTokenExpired(state.token)) {
      console.log('Token expired during session, logging out');
      state.logout();
    }
  }, 60000); // Check every 60 seconds
}
