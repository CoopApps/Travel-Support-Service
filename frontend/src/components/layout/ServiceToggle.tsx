import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useServiceContext, ServiceType } from '../../contexts/ServiceContext';
import './ServiceToggle.css';

export function ServiceToggle() {
  const navigate = useNavigate();
  const { activeService, setActiveService, bothEnabled } = useServiceContext();
  const [isToggling, setIsToggling] = useState(false);

  // Don't render if only one service is enabled
  if (!bothEnabled) {
    return null;
  }

  const handleToggle = async (newService: ServiceType) => {
    if (newService === activeService || isToggling) return;

    setIsToggling(true);

    try {
      // Update active service
      setActiveService(newService);

      // Navigate to dashboard (now service-aware)
      navigate('/dashboard');
    } catch {
      // Error handled silently
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <div className="service-toggle-container">
      <div className="service-toggle">
        <button
          className={`toggle-option ${activeService === 'transport' ? 'active' : ''}`}
          onClick={() => handleToggle('transport')}
          disabled={isToggling}
          aria-label="Switch to Community Transport service"
        >
          <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
          </svg>
          <div className="toggle-content">
            <span className="toggle-title">Community Transport</span>
            <span className="toggle-description">Cars & Minibuses</span>
          </div>
        </button>

        <button
          className={`toggle-option ${activeService === 'bus' ? 'active' : ''}`}
          onClick={() => handleToggle('bus')}
          disabled={isToggling}
          aria-label="Switch to Community Bus service"
        >
          <svg className="icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M4 16c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-6H6V6h12v5z"/>
          </svg>
          <div className="toggle-content">
            <span className="toggle-title">Community Bus</span>
            <span className="toggle-description">Fixed Routes</span>
          </div>
        </button>
      </div>
    </div>
  );
}
