import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '../types';

/**
 * Authentication Store - Stage 3 (Updated for httpOnly cookies)
 *
 * SECURITY UPDATE: Tokens are now stored in httpOnly cookies, NOT localStorage
 *
 * Uses Zustand for lightweight state management.
 * Only user metadata is persisted to localStorage (no sensitive tokens).
 * The actual JWT is in an httpOnly cookie that JavaScript cannot access.
 */

interface AuthState {
  user: User | null;
  token: string | null; // DEPRECATED: Token is now in httpOnly cookie, this is kept for backward compatibility
  isAuthenticated: boolean;
  tenantId: number | null; // Convenience accessor for user.tenantId
  login: (user: User, token?: string) => void; // token param is now optional (cookie handles auth)
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null, // DEPRECATED: Not used for auth anymore (httpOnly cookie handles this)
      isAuthenticated: false,
      tenantId: null,

      login: (user, _token) => {
        // SECURITY: Token is now stored in httpOnly cookie by the server
        // We only store user metadata in localStorage (no sensitive data)
        // Clear React Query cache on login to ensure fresh data
        if (typeof window !== 'undefined') {
          import('../main').then(({ queryClient }) => {
            queryClient.clear();
          });
        }

        set({
          user,
          token: null, // SECURITY: Don't store token in localStorage
          isAuthenticated: true,
          tenantId: user.tenantId,
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
          tenantId: null,
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
      // SECURITY: Only persist user metadata, NOT the token
      partialize: (state) => ({
        user: state.user,
        // token is intentionally NOT persisted - it's in an httpOnly cookie
        isAuthenticated: state.isAuthenticated,
        tenantId: state.tenantId,
      }),
      // Token expiration is now handled by the server (httpOnly cookie)
      // No client-side token validation needed
    }
  )
);

// SECURITY: Token expiration is now handled server-side via httpOnly cookies
// The server will return 401 when the cookie expires, triggering logout via response interceptor
// No client-side token checking needed (and not possible since token is httpOnly)
