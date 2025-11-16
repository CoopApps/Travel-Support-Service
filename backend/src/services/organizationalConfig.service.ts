/**
 * Organizational Configuration Service
 *
 * Handles organization-type-aware configurations for:
 * - Surplus allocation (reserves, dividends, commonwealth)
 * - Cooperative model-specific rules
 * - Service-specific settings (Section 19 vs Section 22)
 * - Discount percentages
 * - Module access permissions
 */

import { Pool } from 'pg';

export type OrganizationType = 'charity' | 'cic' | 'third_sector' | 'cooperative' | 'cooperative_commonwealth';
export type CooperativeModel = 'worker' | 'passenger' | 'hybrid' | null;
export type ServiceType = 'section_19' | 'section_22' | 'both';

interface SurplusAllocationRules {
  businessReservePercent: number;
  dividendPercent: number;
  cooperativeCommonwealthPercent: number;
  dividendRecipients: 'none' | 'workers' | 'passengers' | 'both';
  votingRights: 'none' | 'workers' | 'passengers' | 'both';
}

interface OrganizationalConfig {
  organizationType: OrganizationType;
  cooperativeModel: CooperativeModel;
  discountPercentage: number;
  surplusAllocation: SurplusAllocationRules;
  enabledModules: {
    governance: boolean;
    membership: boolean;
    voting: boolean;
    profitSharing: boolean;
    commonwealthContributions: boolean;
  };
  serviceTransportEnabled: boolean;
  serviceBusEnabled: boolean;
}

export class OrganizationalConfigService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Get complete organizational configuration for a tenant
   */
  async getOrganizationalConfig(tenantId: number): Promise<OrganizationalConfig> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `SELECT
          organization_type,
          cooperative_model,
          discount_percentage,
          service_transport_enabled,
          service_bus_enabled,
          enabled_modules
        FROM tenants
        WHERE tenant_id = $1`,
        [tenantId]
      );

      if (result.rows.length === 0) {
        throw new Error(`Tenant ${tenantId} not found`);
      }

      const tenant = result.rows[0];
      const surplusAllocation = this.getSurplusAllocationRules(
        tenant.organization_type,
        tenant.cooperative_model
      );

      return {
        organizationType: tenant.organization_type,
        cooperativeModel: tenant.cooperative_model,
        discountPercentage: parseFloat(tenant.discount_percentage),
        surplusAllocation,
        enabledModules: this.getEnabledModules(tenant.organization_type, tenant.cooperative_model),
        serviceTransportEnabled: tenant.service_transport_enabled ?? true,
        serviceBusEnabled: tenant.service_bus_enabled ?? false,
      };
    } finally {
      client.release();
    }
  }

  /**
   * Get surplus allocation rules based on organization type and cooperative model
   *
   * ALLOCATION MATRIX:
   *
   * Non-Cooperatives (charity, cic, third_sector):
   * - 100% Business Reserves
   * - 0% Dividends (no members to distribute to)
   * - 0% Commonwealth (not part of cooperative movement)
   *
   * Cooperative (standard):
   * - 40% Business Reserves
   * - 40% Dividends (to members based on model)
   * - 20% Cooperative Commonwealth
   *
   * Cooperative Commonwealth (solidarity economy):
   * - 30% Business Reserves
   * - 40% Dividends (to members)
   * - 30% Cooperative Commonwealth (higher contribution)
   */
  getSurplusAllocationRules(
    organizationType: OrganizationType,
    cooperativeModel: CooperativeModel
  ): SurplusAllocationRules {
    // Non-cooperatives: All surplus stays with organization
    if (!this.isCooperative(organizationType)) {
      return {
        businessReservePercent: 100,
        dividendPercent: 0,
        cooperativeCommonwealthPercent: 0,
        dividendRecipients: 'none',
        votingRights: 'none',
      };
    }

    // Standard Cooperative
    if (organizationType === 'cooperative') {
      const dividendRecipients = this.getDividendRecipients(cooperativeModel);
      const votingRights = this.getVotingRights(cooperativeModel);

      return {
        businessReservePercent: 40,
        dividendPercent: 40,
        cooperativeCommonwealthPercent: 20,
        dividendRecipients,
        votingRights,
      };
    }

    // Cooperative Commonwealth (solidarity economy)
    if (organizationType === 'cooperative_commonwealth') {
      const dividendRecipients = this.getDividendRecipients(cooperativeModel);
      const votingRights = this.getVotingRights(cooperativeModel);

      return {
        businessReservePercent: 30,
        dividendPercent: 40,
        cooperativeCommonwealthPercent: 30, // Higher solidarity contribution
        dividendRecipients,
        votingRights,
      };
    }

    // Default fallback (shouldn't reach here)
    return {
      businessReservePercent: 100,
      dividendPercent: 0,
      cooperativeCommonwealthPercent: 0,
      dividendRecipients: 'none',
      votingRights: 'none',
    };
  }

  /**
   * Determine who receives dividends based on cooperative model
   */
  private getDividendRecipients(cooperativeModel: CooperativeModel): 'none' | 'workers' | 'passengers' | 'both' {
    if (!cooperativeModel) return 'none';

    switch (cooperativeModel) {
      case 'worker':
        return 'workers'; // Dividends to drivers/staff based on hours worked
      case 'passenger':
        return 'passengers'; // Patronage refunds to customers based on usage
      case 'hybrid':
        return 'both'; // Split between workers and passengers
      default:
        return 'none';
    }
  }

  /**
   * Determine who has voting rights based on cooperative model
   */
  private getVotingRights(cooperativeModel: CooperativeModel): 'none' | 'workers' | 'passengers' | 'both' {
    if (!cooperativeModel) return 'none';

    switch (cooperativeModel) {
      case 'worker':
        return 'workers'; // One worker, one vote
      case 'passenger':
        return 'passengers'; // One member, one vote (customers)
      case 'hybrid':
        return 'both'; // Both workers and passengers vote (may have different weights)
      default:
        return 'none';
    }
  }

  /**
   * Check if organization is a cooperative
   */
  private isCooperative(organizationType: OrganizationType): boolean {
    return organizationType === 'cooperative' || organizationType === 'cooperative_commonwealth';
  }

  /**
   * Get enabled modules based on organization type
   */
  private getEnabledModules(
    organizationType: OrganizationType,
    _cooperativeModel: CooperativeModel
  ) {
    const isCooperative = this.isCooperative(organizationType);

    return {
      governance: isCooperative,
      membership: isCooperative,
      voting: isCooperative,
      profitSharing: isCooperative,
      commonwealthContributions: isCooperative,
    };
  }

  /**
   * Get human-readable description of organization structure
   */
  getOrganizationDescription(config: OrganizationalConfig): string {
    const { organizationType, cooperativeModel, surplusAllocation } = config;

    if (!this.isCooperative(organizationType)) {
      return `${this.formatOrgType(organizationType)} - All surplus retained for organizational reserves`;
    }

    const modelDesc = cooperativeModel === 'worker'
      ? 'Worker-Owned Cooperative'
      : cooperativeModel === 'passenger'
      ? 'Passenger/Customer-Owned Cooperative'
      : cooperativeModel === 'hybrid'
      ? 'Multi-Stakeholder Cooperative (Workers + Passengers)'
      : 'Cooperative';

    return `${modelDesc} - Surplus allocated: ${surplusAllocation.businessReservePercent}% Reserves, ${surplusAllocation.dividendPercent}% Dividends (to ${surplusAllocation.dividendRecipients}), ${surplusAllocation.cooperativeCommonwealthPercent}% Commonwealth`;
  }

  /**
   * Format organization type for display
   */
  private formatOrgType(orgType: OrganizationType): string {
    switch (orgType) {
      case 'charity':
        return 'Registered Charity';
      case 'cic':
        return 'Community Interest Company';
      case 'third_sector':
        return 'Third Sector Organization';
      case 'cooperative':
        return 'Cooperative';
      case 'cooperative_commonwealth':
        return 'Cooperative Commonwealth Member';
      default:
        return orgType;
    }
  }

  /**
   * Initialize fare calculation settings based on organizational config
   */
  async initializeFareSettings(tenantId: number): Promise<void> {
    const config = await this.getOrganizationalConfig(tenantId);
    const { surplusAllocation } = config;

    const client = await this.pool.connect();
    try {
      await client.query(
        `INSERT INTO fare_calculation_settings (
          tenant_id,
          business_reserve_percent,
          dividend_percent,
          cooperative_commonwealth_percent,
          show_cost_breakdown,
          show_surplus_allocation,
          show_commonwealth_impact
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (tenant_id) DO UPDATE SET
          business_reserve_percent = EXCLUDED.business_reserve_percent,
          dividend_percent = EXCLUDED.dividend_percent,
          cooperative_commonwealth_percent = EXCLUDED.cooperative_commonwealth_percent,
          updated_at = NOW()`,
        [
          tenantId,
          surplusAllocation.businessReservePercent,
          surplusAllocation.dividendPercent,
          surplusAllocation.cooperativeCommonwealthPercent,
          true, // Always show cost breakdown for transparency
          this.isCooperative(config.organizationType), // Show surplus allocation only for coops
          this.isCooperative(config.organizationType), // Show commonwealth only for coops
        ]
      );
    } finally {
      client.release();
    }
  }

  /**
   * Validate that fare settings respect organizational constraints
   */
  async validateFareSettings(
    tenantId: number,
    businessReservePercent: number,
    dividendPercent: number,
    commonwealthPercent: number
  ): Promise<{ valid: boolean; errors: string[] }> {
    const config = await this.getOrganizationalConfig(tenantId);
    const errors: string[] = [];

    // Check total is 100%
    const total = businessReservePercent + dividendPercent + commonwealthPercent;
    if (Math.abs(total - 100) > 0.01) {
      errors.push(`Allocation percentages must total 100% (currently ${total.toFixed(2)}%)`);
    }

    // Non-cooperatives cannot have dividends or commonwealth contributions
    if (!this.isCooperative(config.organizationType)) {
      if (dividendPercent > 0) {
        errors.push(`${this.formatOrgType(config.organizationType)} cannot allocate to dividends (no members)`);
      }
      if (commonwealthPercent > 0) {
        errors.push(`${this.formatOrgType(config.organizationType)} cannot contribute to cooperative commonwealth`);
      }
      if (businessReservePercent !== 100) {
        errors.push(`${this.formatOrgType(config.organizationType)} must allocate 100% to business reserves`);
      }
    }

    // Cooperatives must contribute to commonwealth
    if (this.isCooperative(config.organizationType) && commonwealthPercent === 0) {
      errors.push('Cooperatives must contribute to the cooperative commonwealth (minimum 5%)');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get service-specific configuration
   */
  getServiceConfig(config: OrganizationalConfig): {
    section19: { enabled: boolean; name: string };
    section22: { enabled: boolean; name: string };
  } {
    return {
      section19: {
        enabled: config.serviceTransportEnabled,
        name: 'Community Transport (Car Services)',
      },
      section22: {
        enabled: config.serviceBusEnabled,
        name: 'Community Bus Services',
      },
    };
  }
}
