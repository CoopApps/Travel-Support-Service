import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type ServiceType = 'transport' | 'bus';

interface ServiceContextValue {
  activeService: ServiceType;
  setActiveService: (service: ServiceType) => void;
  transportEnabled: boolean;
  busEnabled: boolean;
  bothEnabled: boolean;
}

const ServiceContext = createContext<ServiceContextValue | undefined>(undefined);

interface ServiceProviderProps {
  children: ReactNode;
  transportEnabled?: boolean;
  busEnabled?: boolean;
}

export function ServiceProvider({
  children,
  transportEnabled = true,
  busEnabled = false
}: ServiceProviderProps) {
  const [activeService, setActiveServiceState] = useState<ServiceType>('transport');

  const bothEnabled = transportEnabled && busEnabled;

  // Load saved preference from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('preferred_service') as ServiceType | null;
    if (saved === 'bus' && busEnabled) {
      setActiveServiceState('bus');
    } else if (saved === 'transport' && transportEnabled) {
      setActiveServiceState('transport');
    } else if (transportEnabled) {
      setActiveServiceState('transport');
    } else if (busEnabled) {
      setActiveServiceState('bus');
    }
  }, [transportEnabled, busEnabled]);

  // Save preference when changed
  const setActiveService = (service: ServiceType) => {
    setActiveServiceState(service);
    localStorage.setItem('preferred_service', service);
  };

  return (
    <ServiceContext.Provider
      value={{
        activeService,
        setActiveService,
        transportEnabled,
        busEnabled,
        bothEnabled
      }}
    >
      {children}
    </ServiceContext.Provider>
  );
}

export function useServiceContext() {
  const context = useContext(ServiceContext);
  if (!context) {
    throw new Error('useServiceContext must be used within ServiceProvider');
  }
  return context;
}
