import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type ServiceType = 'transport' | 'bus' | 'homecare';

interface ServiceContextValue {
  activeService: ServiceType;
  setActiveService: (service: ServiceType) => void;
  transportEnabled: boolean;
  busEnabled: boolean;
  homecareEnabled: boolean;
  multipleEnabled: boolean; // true if 2+ services enabled
}

const ServiceContext = createContext<ServiceContextValue | undefined>(undefined);

interface ServiceProviderProps {
  children: ReactNode;
  transportEnabled?: boolean;
  busEnabled?: boolean;
  homecareEnabled?: boolean;
}

export function ServiceProvider({
  children,
  transportEnabled = true,
  busEnabled = false,
  homecareEnabled = false
}: ServiceProviderProps) {
  const [activeService, setActiveServiceState] = useState<ServiceType>('transport');

  const enabledCount = [transportEnabled, busEnabled, homecareEnabled].filter(Boolean).length;
  const multipleEnabled = enabledCount >= 2;

  // Load saved preference from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('preferred_service') as ServiceType | null;
    if (saved === 'homecare' && homecareEnabled) {
      setActiveServiceState('homecare');
    } else if (saved === 'bus' && busEnabled) {
      setActiveServiceState('bus');
    } else if (saved === 'transport' && transportEnabled) {
      setActiveServiceState('transport');
    } else if (transportEnabled) {
      setActiveServiceState('transport');
    } else if (busEnabled) {
      setActiveServiceState('bus');
    } else if (homecareEnabled) {
      setActiveServiceState('homecare');
    }
  }, [transportEnabled, busEnabled, homecareEnabled]);

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
        homecareEnabled,
        multipleEnabled
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
