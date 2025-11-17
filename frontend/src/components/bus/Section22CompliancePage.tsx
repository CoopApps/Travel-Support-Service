import React, { useEffect, useState } from 'react';
import { useTenant } from '../../context/TenantContext';
import { useToast } from '../../context/ToastContext';
import { CheckMarkIcon, WarningIcon, XMarkIcon, MoneyBagIcon, InfoIcon, BusIcon } from '../icons/BusIcons';

/**
 * Section 22 Compliance Dashboard
 *
 * Comprehensive compliance monitoring for Section 22 Community Bus Services
 * Shows status of all legal requirements:
 * - Organizational Section 22 Permit
 * - EU Regulation 1071/2009 Exemptions
 * - Driver Qualifications (Section 22 qualified)
 * - Vehicle Compliance (9+ seats, MOT, insurance)
 * - Service Registration (28-day notice, LTA approval)
 * - Financial Compliance (not-for-profit status)
 */

interface ComplianceStatus {
  // Organizational Permit
  organizationalPermit: {
    status: 'active' | 'expiring_soon' | 'expired' | 'not_registered';
    permitNumber?: string;
    expiryDate?: string;
    issuingAuthority?: string;
    daysUntilExpiry?: number;
  };

  // EU Regulation 1071/2009 Exemptions
  euExemptions: {
    notForProfitConfirmed: boolean;
    tenMileExemptionApplicable: boolean;
    localServiceOnly: boolean;
    exemptFromOperatorLicense: boolean;
  };

  // Driver Compliance
  driverCompliance: {
    totalDrivers: number;
    section22Qualified: number;
    expiringPermits: number; // Within 30 days
    expiredPermits: number;
    qualificationRate: number; // Percentage
  };

  // Vehicle Compliance
  vehicleCompliance: {
    totalVehicles: number;
    section22Suitable: number; // 9+ seats
    motCurrent: number;
    insuranceValid: number;
    complianceRate: number; // Percentage
  };

  // Service Registration
  serviceRegistration: {
    registeredServices: number;
    pendingRegistration: number;
    noticeGiven: boolean; // 28-day notice
    ltaApprovalCurrent: boolean;
  };

  // Financial Compliance
  financialCompliance: {
    notForProfitVerified: boolean;
    separateFaresConfigured: boolean;
    communityPurposeDocumented: boolean;
  };

  // Overall Compliance Score
  overallScore: number; // 0-100
  complianceLevel: 'excellent' | 'good' | 'needs_attention' | 'critical';
}

export default function Section22CompliancePage() {
  const { tenant } = useTenant();
  const toast = useToast();
  const [compliance, setCompliance] = useState<ComplianceStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tenant?.tenant_id) return;

    const fetchComplianceStatus = async () => {
      try {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('No authentication token found');
        }

        const response = await fetch(`/api/tenants/${tenant.tenant_id}/section22-compliance`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch compliance data: ${response.statusText}`);
        }

        const data = await response.json();
        setCompliance(data.compliance);
      } catch (err: any) {
        console.error('Error fetching compliance status:', err);
        setError(err.message || 'Failed to load compliance data');
        toast.error('Failed to load compliance data');
      } finally {
        setLoading(false);
      }
    };

    fetchComplianceStatus();
  }, [tenant?.tenant_id]);

  const getComplianceLevelColor = (level: string) => {
    switch (level) {
      case 'excellent':
        return '#10b981';
      case 'good':
        return '#3b82f6';
      case 'needs_attention':
        return '#f59e0b';
      case 'critical':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getComplianceLevelLabel = (level: string) => {
    switch (level) {
      case 'excellent':
        return 'Excellent';
      case 'good':
        return 'Good';
      case 'needs_attention':
        return 'Needs Attention';
      case 'critical':
        return 'Critical';
      default:
        return 'Unknown';
    }
  };

  const getStatusBadge = (status: 'active' | 'expiring_soon' | 'expired' | 'not_registered') => {
    const styles = {
      active: { bg: '#d1fae5', color: '#047857', label: 'Active', icon: <CheckMarkIcon size={14} color="#047857" /> },
      expiring_soon: { bg: '#fef3c7', color: '#92400e', label: 'Expiring Soon', icon: <WarningIcon size={14} color="#92400e" /> },
      expired: { bg: '#fee2e2', color: '#991b1b', label: 'Expired', icon: <XMarkIcon size={14} color="#991b1b" /> },
      not_registered: { bg: '#f3f4f6', color: '#374151', label: 'Not Registered', icon: null },
    };

    const style = styles[status];
    return (
      <span style={{
        background: style.bg,
        color: style.color,
        padding: '4px 12px',
        borderRadius: '12px',
        fontSize: '0.75rem',
        fontWeight: 600,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.25rem'
      }}>
        {style.icon}
        {style.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <div className="spinner" style={{ width: '2rem', height: '2rem', margin: '0 auto' }}></div>
        <p style={{ marginTop: '1rem', color: 'var(--gray-600)' }}>Loading compliance status...</p>
      </div>
    );
  }

  if (error || !compliance) {
    return (
      <div style={{
        background: '#fee2e2',
        border: '1px solid #fecaca',
        borderRadius: '8px',
        padding: '1rem',
        color: '#991b1b'
      }}>
        {error || 'No compliance data available'}
      </div>
    );
  }

  return (
    <div style={{ padding: '1.5rem' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 700, color: '#111827', marginBottom: '0.5rem' }}>
          Section 22 Compliance Dashboard
        </h1>
        <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
          Monitor all legal requirements for Section 22 Community Bus Services
        </p>
      </div>

      {/* Overall Compliance Score */}
      <div style={{
        background: `linear-gradient(135deg, ${getComplianceLevelColor(compliance.complianceLevel)} 0%, ${getComplianceLevelColor(compliance.complianceLevel)}dd 100%)`,
        borderRadius: '12px',
        padding: '2rem',
        color: 'white',
        marginBottom: '2rem',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: '0.5rem' }}>
            Overall Compliance Score
          </div>
          <div style={{ fontSize: '4rem', fontWeight: 700, lineHeight: 1 }}>
            {compliance.overallScore}%
          </div>
          <div style={{ fontSize: '1.125rem', marginTop: '0.5rem', opacity: 0.95 }}>
            {getComplianceLevelLabel(compliance.complianceLevel)}
          </div>
        </div>
      </div>

      {/* Compliance Sections Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>

        {/* 1. Organizational Section 22 Permit */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '1.5rem',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#111827', margin: 0 }}>
              🏢 Organizational Permit
            </h3>
            {getStatusBadge(compliance.organizationalPermit.status)}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '4px' }}>Permit Number</div>
              <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#111827' }}>
                {compliance.organizationalPermit.permitNumber || 'Not registered'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '4px' }}>Expiry Date</div>
              <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#111827' }}>
                {compliance.organizationalPermit.expiryDate
                  ? new Date(compliance.organizationalPermit.expiryDate).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })
                  : 'N/A'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '4px' }}>Issuing Authority</div>
              <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#111827' }}>
                {compliance.organizationalPermit.issuingAuthority || 'N/A'}
              </div>
            </div>
            {compliance.organizationalPermit.daysUntilExpiry !== undefined && (
              <div style={{
                marginTop: '0.5rem',
                padding: '0.75rem',
                background: compliance.organizationalPermit.daysUntilExpiry < 90 ? '#fef3c7' : '#f0fdf4',
                borderRadius: '6px',
                fontSize: '0.8125rem',
                color: compliance.organizationalPermit.daysUntilExpiry < 90 ? '#92400e' : '#047857',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                {compliance.organizationalPermit.daysUntilExpiry < 90 ?
                  <WarningIcon size={16} color="#92400e" /> :
                  <CheckMarkIcon size={16} color="#047857" />
                }
                {compliance.organizationalPermit.daysUntilExpiry} days until renewal
              </div>
            )}
          </div>

          <button
            className="btn btn-secondary"
            style={{ width: '100%', marginTop: '1rem', fontSize: '0.875rem' }}
          >
            View Permit Details
          </button>
        </div>

        {/* 2. EU Regulation Exemptions */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '1.5rem',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
        }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#111827', marginBottom: '1rem' }}>
            EU Regulation 1071/2009
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.875rem', color: '#374151' }}>Not-for-Profit Status</span>
              <span>
                {compliance.euExemptions.notForProfitConfirmed ?
                  <CheckMarkIcon size={20} color="#10b981" /> :
                  <XMarkIcon size={20} color="#ef4444" />}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.875rem', color: '#374151' }}>10-Mile Exemption</span>
              <span>
                {compliance.euExemptions.tenMileExemptionApplicable ?
                  <CheckMarkIcon size={20} color="#10b981" /> :
                  <XMarkIcon size={20} color="#ef4444" />}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.875rem', color: '#374151' }}>Local Service Only</span>
              <span>
                {compliance.euExemptions.localServiceOnly ?
                  <CheckMarkIcon size={20} color="#10b981" /> :
                  <XMarkIcon size={20} color="#ef4444" />}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.875rem', color: '#374151' }}>Operator License Exempt</span>
              <span>
                {compliance.euExemptions.exemptFromOperatorLicense ?
                  <CheckMarkIcon size={20} color="#10b981" /> :
                  <XMarkIcon size={20} color="#ef4444" />}
              </span>
            </div>
          </div>

          <div style={{
            marginTop: '1rem',
            padding: '0.75rem',
            background: '#eff6ff',
            borderRadius: '6px',
            fontSize: '0.8125rem',
            color: '#1e40af',
            lineHeight: 1.5,
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.5rem'
          }}>
            <InfoIcon size={16} color="#1e40af" style={{ flexShrink: 0, marginTop: '0.125rem' }} />
            <div>
              <strong>Exemption Basis:</strong> Community transport operations under 10 miles,
              not-for-profit, serving local communities only.
            </div>
          </div>
        </div>

        {/* 3. Driver Compliance */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '1.5rem',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
        }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#111827', marginBottom: '1rem' }}>
            👨‍💼 Driver Qualification Status
          </h3>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1rem',
            marginBottom: '1rem'
          }}>
            <div style={{ textAlign: 'center', padding: '1rem', background: '#f9fafb', borderRadius: '8px' }}>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#111827' }}>
                {compliance.driverCompliance.section22Qualified}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Qualified</div>
            </div>
            <div style={{ textAlign: 'center', padding: '1rem', background: '#f9fafb', borderRadius: '8px' }}>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#111827' }}>
                {compliance.driverCompliance.totalDrivers}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Total Drivers</div>
            </div>
          </div>

          <div style={{
            padding: '1rem',
            background: `linear-gradient(90deg, #10b981 ${compliance.driverCompliance.qualificationRate}%, #e5e7eb ${compliance.driverCompliance.qualificationRate}%)`,
            borderRadius: '8px',
            color: 'white',
            textAlign: 'center',
            fontWeight: 600,
            fontSize: '1.125rem',
            marginBottom: '1rem'
          }}>
            {compliance.driverCompliance.qualificationRate}% Compliance
          </div>

          {compliance.driverCompliance.expiringPermits > 0 && (
            <div style={{
              padding: '0.75rem',
              background: '#fef3c7',
              borderRadius: '6px',
              fontSize: '0.8125rem',
              color: '#92400e',
              marginBottom: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <WarningIcon size={16} color="#92400e" />
              {compliance.driverCompliance.expiringPermits} permit(s) expiring within 30 days
            </div>
          )}

          {compliance.driverCompliance.expiredPermits > 0 && (
            <div style={{
              padding: '0.75rem',
              background: '#fee2e2',
              borderRadius: '6px',
              fontSize: '0.8125rem',
              color: '#991b1b',
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem'
            }}>
              <XMarkIcon size={14} color="#991b1b" />
              {compliance.driverCompliance.expiredPermits} expired permit(s) - action required
            </div>
          )}

          <button
            className="btn btn-secondary"
            style={{ width: '100%', marginTop: '1rem', fontSize: '0.875rem' }}
          >
            View Driver Compliance
          </button>
        </div>

        {/* 4. Vehicle Compliance */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '1.5rem',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
        }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#111827', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BusIcon size={20} />
            Vehicle Compliance
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.875rem', color: '#374151' }}>Section 22 Suitable (9+ seats)</span>
              <span style={{ fontSize: '1rem', fontWeight: 600, color: '#111827' }}>
                {compliance.vehicleCompliance.section22Suitable} / {compliance.vehicleCompliance.totalVehicles}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.875rem', color: '#374151' }}>MOT Current</span>
              <span style={{ fontSize: '1rem', fontWeight: 600, color: compliance.vehicleCompliance.motCurrent === compliance.vehicleCompliance.totalVehicles ? '#10b981' : '#f59e0b' }}>
                {compliance.vehicleCompliance.motCurrent} / {compliance.vehicleCompliance.totalVehicles}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.875rem', color: '#374151' }}>Insurance Valid</span>
              <span style={{ fontSize: '1rem', fontWeight: 600, color: compliance.vehicleCompliance.insuranceValid === compliance.vehicleCompliance.totalVehicles ? '#10b981' : '#ef4444' }}>
                {compliance.vehicleCompliance.insuranceValid} / {compliance.vehicleCompliance.totalVehicles}
              </span>
            </div>
          </div>

          <div style={{
            marginTop: '1rem',
            padding: '1rem',
            background: compliance.vehicleCompliance.complianceRate === 100 ? '#d1fae5' : '#fef3c7',
            borderRadius: '8px',
            textAlign: 'center',
            fontSize: '1.125rem',
            fontWeight: 600,
            color: compliance.vehicleCompliance.complianceRate === 100 ? '#047857' : '#92400e',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem'
          }}>
            {compliance.vehicleCompliance.complianceRate === 100 ?
              <CheckMarkIcon size={20} color="#047857" /> :
              <WarningIcon size={20} color="#92400e" />}
            {compliance.vehicleCompliance.complianceRate}% Compliant
          </div>

          <button
            className="btn btn-secondary"
            style={{ width: '100%', marginTop: '1rem', fontSize: '0.875rem' }}
          >
            View Vehicle Fleet
          </button>
        </div>

        {/* 5. Service Registration */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '1.5rem',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
        }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#111827', marginBottom: '1rem' }}>
            📋 Service Registration
          </h3>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1rem',
            marginBottom: '1rem'
          }}>
            <div style={{ textAlign: 'center', padding: '1rem', background: '#f0fdf4', borderRadius: '8px' }}>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#047857' }}>
                {compliance.serviceRegistration.registeredServices}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#065f46' }}>Registered</div>
            </div>
            <div style={{ textAlign: 'center', padding: '1rem', background: '#fef3c7', borderRadius: '8px' }}>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#92400e' }}>
                {compliance.serviceRegistration.pendingRegistration}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#78350f' }}>Pending</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.875rem', color: '#374151' }}>28-Day Notice Given</span>
              <span>
                {compliance.serviceRegistration.noticeGiven ?
                  <CheckMarkIcon size={20} color="#10b981" /> :
                  <XMarkIcon size={20} color="#ef4444" />}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.875rem', color: '#374151' }}>LTA Approval Current</span>
              <span>
                {compliance.serviceRegistration.ltaApprovalCurrent ?
                  <CheckMarkIcon size={20} color="#10b981" /> :
                  <XMarkIcon size={20} color="#ef4444" />}
              </span>
            </div>
          </div>

          <div style={{
            marginTop: '1rem',
            padding: '0.75rem',
            background: '#eff6ff',
            borderRadius: '6px',
            fontSize: '0.8125rem',
            color: '#1e40af',
            lineHeight: 1.5,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <InfoIcon size={16} color="#1e40af" />
            New services require 28-day advance notice to Local Transport Authority
          </div>
        </div>

        {/* 6. Financial Compliance */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '1.5rem',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
        }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#111827', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MoneyBagIcon size={20} color="#111827" />
            Financial Compliance
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.875rem', color: '#374151' }}>Not-for-Profit Verified</span>
              <span>
                {compliance.financialCompliance.notForProfitVerified ?
                  <CheckMarkIcon size={20} color="#10b981" /> :
                  <XMarkIcon size={20} color="#ef4444" />}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.875rem', color: '#374151' }}>Separate Fares Configured</span>
              <span>
                {compliance.financialCompliance.separateFaresConfigured ?
                  <CheckMarkIcon size={20} color="#10b981" /> :
                  <XMarkIcon size={20} color="#ef4444" />}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.875rem', color: '#374151' }}>Community Purpose Documented</span>
              <span>
                {compliance.financialCompliance.communityPurposeDocumented ?
                  <CheckMarkIcon size={20} color="#10b981" /> :
                  <XMarkIcon size={20} color="#ef4444" />}
              </span>
            </div>
          </div>

          <div style={{
            marginTop: '1rem',
            padding: '0.75rem',
            background: '#f0fdf4',
            borderRadius: '6px',
            fontSize: '0.8125rem',
            color: '#047857',
            lineHeight: 1.5,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <CheckMarkIcon size={16} color="#047857" />
            Section 22 requires not-for-profit operation with community benefit focus
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{
        marginTop: '2rem',
        display: 'flex',
        gap: '1rem',
        justifyContent: 'center'
      }}>
        <button className="btn btn-primary">
          Generate Compliance Report
        </button>
        <button className="btn btn-secondary">
          Schedule Renewals
        </button>
        <button className="btn btn-secondary">
          Export to PDF
        </button>
      </div>
    </div>
  );
}
