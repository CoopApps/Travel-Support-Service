import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TenantProvider } from './context/TenantContext';
import { ToastProvider } from './context/ToastContext';
import { ToastContainer } from './components/common/ToastContainer';
import ErrorBoundary from './components/ErrorBoundary';
import App from './App';
import './index.css';

/**
 * Application Entry Point - Stage 3
 *
 * Sets up:
 * - React Router for navigation
 * - React Query for data fetching and caching
 * - Global providers
 */

// Create React Query client
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: true,
      staleTime: 30 * 1000, // 30 seconds - short stale time to always fetch fresh data
      gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes (renamed from cacheTime in react-query v5)
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <TenantProvider>
            <ToastProvider>
              <App />
              <ToastContainer />
            </ToastProvider>
          </TenantProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
