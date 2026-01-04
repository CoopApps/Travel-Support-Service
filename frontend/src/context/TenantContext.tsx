import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import axios from 'axios';
import { detectSubdomain } from '../utils/subdomainDetection';
import type { Tenant } from '../types';

/**
 * Tenant Context
 *
 * Provides tenant information throughout the app based on subdomain
 */

interface TenantContextType {
  tenant: Tenant | null;
  tenantId: number | null;
  subdomain: string | null;
  isPlatformAdmin: boolean;
  loading: boolean;
  error: string | null;
  refetchTenant: () => Promise<void>;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within TenantProvider');
  }
  return context;
}

interface TenantProviderProps {
  children: ReactNode;
}

export function TenantProvider({ children }: TenantProviderProps) {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const subdomainInfo = detectSubdomain();
  const { subdomain, isPlatformAdmin } = subdomainInfo;

  const fetchTenant = useCallback(async () => {
    // If platform admin domain, don't fetch tenant
    if (isPlatformAdmin || !subdomain) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch tenant by subdomain from public endpoint
      const response = await axios.get<Tenant>(
        `${import.meta.env.VITE_API_URL || '/api'}/public/tenant/${subdomain}`
      );

      setTenant(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load tenant');
    } finally {
      setLoading(false);
    }
  }, [isPlatformAdmin, subdomain]);

  useEffect(() => {
    fetchTenant();
  }, [fetchTenant]);

  const value: TenantContextType = {
    tenant,
    tenantId: tenant?.tenant_id || null,
    subdomain,
    isPlatformAdmin,
    loading,
    error,
    refetchTenant: fetchTenant,
  };

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
}
