/**
 * Dividend Scheduler Service
 *
 * Automated dividend calculation and distribution on a recurring schedule.
 * Supports monthly and quarterly dividend periods with configurable settings.
 *
 * Usage:
 * - Start scheduler on server startup
 * - Runs at configurable intervals (default: 1st of each month at 1 AM)
 * - Auto-calculates dividends for the previous period
 * - Can auto-distribute or require manual approval
 */

import * as cron from 'node-cron';
import { query, queryOne } from '../config/database';
import { logger } from '../utils/logger';
import {
  calculateDividends,
  saveDividendDistribution,
  markDistributionPaid,
} from './dividendCalculation.service';

// ============================================================================
// INTERFACES
// ============================================================================

export interface DividendScheduleSettings {
  tenant_id: number;
  enabled: boolean;
  frequency: 'monthly' | 'quarterly';
  reserves_percent: number;
  business_percent: number;
  dividend_percent: number;
  auto_distribute: boolean; // Auto-mark as distributed or require manual approval
  notification_email?: string;
}

// ============================================================================
// SCHEDULER STATE
// ============================================================================

let schedulerTask: cron.ScheduledTask | null = null;
let isRunning = false;

// ============================================================================
// DIVIDEND SCHEDULE SETTINGS
// ============================================================================

/**
 * Get dividend schedule settings for a tenant
 */
export async function getDividendScheduleSettings(
  tenantId: number
): Promise<DividendScheduleSettings | null> {
  try {
    const settings = await queryOne(
      `SELECT * FROM section22_dividend_schedule_settings WHERE tenant_id = $1`,
      [tenantId]
    );

    if (!settings) return null;

    return {
      tenant_id: settings.tenant_id,
      enabled: settings.enabled,
      frequency: settings.frequency,
      reserves_percent: parseFloat(settings.reserves_percent),
      business_percent: parseFloat(settings.business_percent),
      dividend_percent: parseFloat(settings.dividend_percent),
      auto_distribute: settings.auto_distribute,
      notification_email: settings.notification_email,
    };
  } catch (error: any) {
    logger.error('Error fetching dividend schedule settings', {
      error: error.message,
      tenantId,
    });
    return null;
  }
}

/**
 * Update dividend schedule settings for a tenant
 */
export async function updateDividendScheduleSettings(
  tenantId: number,
  settings: Partial<DividendScheduleSettings>
): Promise<void> {
  try {
    // Check if settings exist
    const existing = await queryOne(
      `SELECT tenant_id FROM section22_dividend_schedule_settings WHERE tenant_id = $1`,
      [tenantId]
    );

    if (existing) {
      // Update existing settings
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (settings.enabled !== undefined) {
        updates.push(`enabled = $${paramIndex++}`);
        values.push(settings.enabled);
      }
      if (settings.frequency) {
        updates.push(`frequency = $${paramIndex++}`);
        values.push(settings.frequency);
      }
      if (settings.reserves_percent !== undefined) {
        updates.push(`reserves_percent = $${paramIndex++}`);
        values.push(settings.reserves_percent);
      }
      if (settings.business_percent !== undefined) {
        updates.push(`business_percent = $${paramIndex++}`);
        values.push(settings.business_percent);
      }
      if (settings.dividend_percent !== undefined) {
        updates.push(`dividend_percent = $${paramIndex++}`);
        values.push(settings.dividend_percent);
      }
      if (settings.auto_distribute !== undefined) {
        updates.push(`auto_distribute = $${paramIndex++}`);
        values.push(settings.auto_distribute);
      }
      if (settings.notification_email !== undefined) {
        updates.push(`notification_email = $${paramIndex++}`);
        values.push(settings.notification_email);
      }

      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(tenantId);

      await query(
        `UPDATE section22_dividend_schedule_settings
         SET ${updates.join(', ')}
         WHERE tenant_id = $${paramIndex}`,
        values
      );
    } else {
      // Insert new settings
      await query(
        `INSERT INTO section22_dividend_schedule_settings (
          tenant_id,
          enabled,
          frequency,
          reserves_percent,
          business_percent,
          dividend_percent,
          auto_distribute,
          notification_email
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          tenantId,
          settings.enabled ?? true,
          settings.frequency ?? 'monthly',
          settings.reserves_percent ?? 20,
          settings.business_percent ?? 30,
          settings.dividend_percent ?? 50,
          settings.auto_distribute ?? false,
          settings.notification_email ?? null,
        ]
      );
    }

    logger.info('Dividend schedule settings updated', { tenantId, settings });
  } catch (error: any) {
    logger.error('Error updating dividend schedule settings', {
      error: error.message,
      tenantId,
    });
    throw error;
  }
}

// ============================================================================
// AUTOMATIC DIVIDEND CALCULATION
// ============================================================================

/**
 * Calculate period dates based on frequency
 */
function getPeriodDates(frequency: 'monthly' | 'quarterly'): { start: string; end: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-11

  if (frequency === 'monthly') {
    // Previous month
    const periodEnd = new Date(year, month, 0); // Last day of previous month
    const periodStart = new Date(year, month - 1, 1); // First day of previous month

    return {
      start: periodStart.toISOString().split('T')[0],
      end: periodEnd.toISOString().split('T')[0],
    };
  } else {
    // Quarterly
    // Q1: Jan-Mar, Q2: Apr-Jun, Q3: Jul-Sep, Q4: Oct-Dec
    const currentQuarter = Math.floor(month / 3);
    const previousQuarter = currentQuarter === 0 ? 3 : currentQuarter - 1;
    const quarterYear = currentQuarter === 0 ? year - 1 : year;

    const periodStart = new Date(quarterYear, previousQuarter * 3, 1);
    const periodEnd = new Date(quarterYear, previousQuarter * 3 + 3, 0);

    return {
      start: periodStart.toISOString().split('T')[0],
      end: periodEnd.toISOString().split('T')[0],
    };
  }
}

/**
 * Process automated dividend calculation for a tenant
 */
async function processAutomatedDividend(tenantId: number): Promise<void> {
  try {
    const settings = await getDividendScheduleSettings(tenantId);

    if (!settings || !settings.enabled) {
      logger.debug('Dividend automation disabled for tenant', { tenantId });
      return;
    }

    // Get period dates
    const { start, end } = getPeriodDates(settings.frequency);

    logger.info('Processing automated dividend calculation', {
      tenantId,
      frequency: settings.frequency,
      periodStart: start,
      periodEnd: end,
    });

    // Check if distribution already exists for this period
    const existing = await queryOne(
      `SELECT distribution_id FROM section22_surplus_distributions
       WHERE tenant_id = $1
         AND period_start = $2
         AND period_end = $3`,
      [tenantId, start, end]
    );

    if (existing) {
      logger.info('Distribution already exists for this period', {
        tenantId,
        distributionId: existing.distribution_id,
        periodStart: start,
        periodEnd: end,
      });
      return;
    }

    // Calculate dividends
    const calculation = await calculateDividends(
      tenantId,
      start,
      end,
      settings.reserves_percent,
      settings.business_percent,
      settings.dividend_percent
    );

    // Save distribution
    const distributionId = await saveDividendDistribution(calculation);

    logger.info('Automated dividend calculated and saved', {
      tenantId,
      distributionId,
      dividendPool: calculation.distribution.dividend_pool,
      eligibleMembers: calculation.distribution.eligible_members,
    });

    // Auto-distribute if enabled
    if (settings.auto_distribute) {
      await markDistributionPaid(distributionId, 'account_credit');
      logger.info('Automated dividend distributed', { tenantId, distributionId });
    }

    // TODO: Send notification email if configured
    if (settings.notification_email) {
      logger.info('Dividend notification email would be sent to', {
        email: settings.notification_email,
        tenantId,
        distributionId,
      });
      // Email sending would be implemented here
    }
  } catch (error: any) {
    logger.error('Error processing automated dividend', {
      error: error.message,
      tenantId,
      stack: error.stack,
    });
  }
}

/**
 * Run dividend calculation for all enabled tenants
 */
async function runScheduledDividendCalculation(): Promise<void> {
  if (isRunning) {
    logger.warn('Dividend scheduler already running, skipping this run');
    return;
  }

  try {
    isRunning = true;
    logger.info('Starting scheduled dividend calculation run');

    // Get all tenants with dividend automation enabled
    const enabledTenants = await query(
      `SELECT tenant_id
       FROM section22_dividend_schedule_settings
       WHERE enabled = true`
    );

    logger.info(`Processing dividends for ${enabledTenants.length} tenants`);

    // Process each tenant
    for (const tenant of enabledTenants) {
      await processAutomatedDividend(tenant.tenant_id);
    }

    logger.info('Scheduled dividend calculation run completed');
  } catch (error: any) {
    logger.error('Error in scheduled dividend calculation', {
      error: error.message,
      stack: error.stack,
    });
  } finally {
    isRunning = false;
  }
}

// ============================================================================
// SCHEDULER CONTROL
// ============================================================================

/**
 * Start the dividend scheduler
 * Runs on the 1st of each month at 1:00 AM by default
 *
 * @param cronSchedule - Cron expression (default: '0 1 1 * *' = 1 AM on 1st of month)
 */
export function startDividendScheduler(cronSchedule: string = '0 1 1 * *'): void {
  if (schedulerTask) {
    logger.warn('Dividend scheduler already started');
    return;
  }

  // Validate cron expression
  if (!cron.validate(cronSchedule)) {
    throw new Error(`Invalid cron schedule: ${cronSchedule}`);
  }

  schedulerTask = cron.schedule(cronSchedule, async () => {
    logger.info('Dividend scheduler triggered');
    await runScheduledDividendCalculation();
  });

  logger.info('Dividend scheduler started', {
    schedule: cronSchedule,
    description: 'Runs on 1st of each month at 1:00 AM',
  });
}

/**
 * Stop the dividend scheduler
 */
export function stopDividendScheduler(): void {
  if (schedulerTask) {
    schedulerTask.stop();
    schedulerTask = null;
    logger.info('Dividend scheduler stopped');
  }
}

/**
 * Manually trigger dividend calculation (for testing)
 */
export async function triggerManualDividendCalculation(): Promise<void> {
  logger.info('Manual dividend calculation triggered');
  await runScheduledDividendCalculation();
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  getDividendScheduleSettings,
  updateDividendScheduleSettings,
  startDividendScheduler,
  stopDividendScheduler,
  triggerManualDividendCalculation,
};
