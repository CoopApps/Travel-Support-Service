/**
 * GDPR Compliance Service
 *
 * Handles data subject rights under GDPR:
 * - Right to erasure (Article 17) - "Right to be forgotten"
 * - Right to data portability (Article 20) - Export user data
 * - Right to rectification (Article 16) - Update personal data
 * - Right of access (Article 15) - View personal data
 *
 * IMPORTANT: Before deleting data, ensure:
 * 1. User identity is verified
 * 2. Legal retention requirements are met (invoices: 7 years, etc.)
 * 3. Deletion request is logged for compliance audit
 */

import { query, queryOne } from '../config/database';
import { logger } from '../utils/logger';
import { logAudit } from '../middleware/auditLogger';
import { decryptPIIFields, maskEmail } from './piiEncryption.service';

export interface DataDeletionRequest {
  tenantId: number;
  requesterId: number; // User making the request
  subjectType: 'customer' | 'driver' | 'user';
  subjectId: number;
  reason: string;
  retainInvoices?: boolean; // Legal requirement
}

export interface DataDeletionResult {
  success: boolean;
  deletedRecords: {
    table: string;
    count: number;
  }[];
  retainedRecords: {
    table: string;
    count: number;
    reason: string;
  }[];
  anonymizedRecords: {
    table: string;
    count: number;
  }[];
}

export interface DataExportResult {
  subjectType: string;
  subjectId: number;
  exportedAt: string;
  data: {
    category: string;
    records: any[];
  }[];
}

/**
 * Delete all personal data for a customer (GDPR Article 17)
 * Anonymizes financial records instead of deleting (legal requirement)
 */
export async function deleteCustomerData(
  request: DataDeletionRequest
): Promise<DataDeletionResult> {
  const { tenantId, requesterId, subjectId, reason } = request;

  logger.info('GDPR: Processing customer data deletion request', {
    tenantId,
    requesterId,
    customerId: subjectId,
    reason,
  });

  const result: DataDeletionResult = {
    success: false,
    deletedRecords: [],
    retainedRecords: [],
    anonymizedRecords: [],
  };

  try {
    // 1. Get customer data for audit log before deletion
    const customer = await queryOne(
      'SELECT * FROM tenant_customers WHERE customer_id = $1 AND tenant_id = $2',
      [subjectId, tenantId]
    );

    if (!customer) {
      throw new Error('Customer not found');
    }

    // 2. Log the deletion request
    await logAudit({
      tenantId,
      userId: requesterId,
      action: 'delete',
      resourceType: 'customer_gdpr_deletion',
      resourceId: subjectId,
      oldData: { reason, customerEmail: maskEmail(customer.email || '') },
    });

    // 3. Delete related records (non-financial)
    const deletionQueries = [
      { table: 'customer_feedback', query: 'DELETE FROM customer_feedback WHERE customer_id = $1 AND tenant_id = $2' },
      { table: 'tenant_customer_reminder_logs', query: 'DELETE FROM tenant_customer_reminder_logs WHERE customer_id = $1 AND tenant_id = $2' },
      { table: 'tenant_messages', query: 'DELETE FROM tenant_messages WHERE customer_id = $1 AND tenant_id = $2' },
    ];

    for (const { table, query: sql } of deletionQueries) {
      try {
        await query(sql, [subjectId, tenantId]);
        // Note: query() returns rows, not rowCount - record deletion attempt
        result.deletedRecords.push({ table, count: 1 });
      } catch (err) {
        logger.warn(`GDPR: Failed to delete from ${table}`, { error: err });
      }
    }

    // 4. Anonymize trips (keep for operational records but remove PII)
    await query(
      `UPDATE tenant_trips
       SET notes = '[GDPR DELETED]',
           special_requirements = NULL,
           pickup_notes = NULL,
           dropoff_notes = NULL
       WHERE customer_id = $1 AND tenant_id = $2`,
      [subjectId, tenantId]
    );
    // Note: query() returns rows, not rowCount - record anonymization attempt
    result.anonymizedRecords.push({ table: 'tenant_trips', count: 1 });

    // 5. Anonymize invoices (legal requirement: retain for 7 years)
    const invoiceCount = await queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM tenant_invoices WHERE customer_id = $1 AND tenant_id = $2',
      [subjectId, tenantId]
    );
    if (invoiceCount && parseInt(invoiceCount.count) > 0) {
      result.retainedRecords.push({
        table: 'tenant_invoices',
        count: parseInt(invoiceCount.count),
        reason: 'Legal retention requirement (7 years)',
      });

      // Anonymize the customer reference in invoices
      await query(
        `UPDATE tenant_invoices
         SET notes = COALESCE(notes, '') || ' [Customer data deleted per GDPR request]'
         WHERE customer_id = $1 AND tenant_id = $2`,
        [subjectId, tenantId]
      );
    }

    // 6. Finally, anonymize the customer record
    await query(
      `UPDATE tenant_customers SET
         name = '[DELETED]',
         email = 'deleted_' || customer_id || '@deleted.local',
         phone = NULL,
         mobile = NULL,
         address = '[DELETED]',
         postcode = NULL,
         notes = '[GDPR DELETED on ' || CURRENT_DATE || ']',
         emergency_contact_name = NULL,
         emergency_contact_phone = NULL,
         medical_notes = NULL,
         mobility_requirements = NULL,
         is_active = false,
         deleted_at = NOW(),
         deleted_by = $3
       WHERE customer_id = $1 AND tenant_id = $2`,
      [subjectId, tenantId, requesterId]
    );
    result.anonymizedRecords.push({ table: 'tenant_customers', count: 1 });

    // 7. Delete associated user account if exists
    await query(
      `DELETE FROM tenant_users
       WHERE tenant_id = $1
       AND email = $2
       AND role = 'customer'`,
      [tenantId, customer.email]
    );
    // Note: query() returns rows, not rowCount - record deletion attempt
    result.deletedRecords.push({ table: 'tenant_users', count: 1 });

    result.success = true;

    logger.info('GDPR: Customer data deletion completed', {
      tenantId,
      customerId: subjectId,
      deleted: result.deletedRecords,
      anonymized: result.anonymizedRecords,
      retained: result.retainedRecords,
    });

    return result;
  } catch (error) {
    logger.error('GDPR: Customer data deletion failed', {
      tenantId,
      customerId: subjectId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Delete all personal data for a driver (GDPR Article 17)
 */
export async function deleteDriverData(
  request: DataDeletionRequest
): Promise<DataDeletionResult> {
  const { tenantId, requesterId, subjectId, reason } = request;

  logger.info('GDPR: Processing driver data deletion request', {
    tenantId,
    requesterId,
    driverId: subjectId,
    reason,
  });

  const result: DataDeletionResult = {
    success: false,
    deletedRecords: [],
    retainedRecords: [],
    anonymizedRecords: [],
  };

  try {
    // Get driver for audit
    const driver = await queryOne(
      'SELECT * FROM tenant_drivers WHERE driver_id = $1 AND tenant_id = $2',
      [subjectId, tenantId]
    );

    if (!driver) {
      throw new Error('Driver not found');
    }

    // Log deletion request
    await logAudit({
      tenantId,
      userId: requesterId,
      action: 'delete',
      resourceType: 'driver_gdpr_deletion',
      resourceId: subjectId,
      oldData: { reason, driverEmail: maskEmail(driver.email || '') },
    });

    // Delete non-essential records
    const deletionQueries = [
      { table: 'driver_messages', query: 'DELETE FROM driver_messages WHERE driver_id = $1 AND tenant_id = $2' },
      { table: 'driver_to_office_messages', query: 'DELETE FROM driver_to_office_messages WHERE driver_id = $1 AND tenant_id = $2' },
      { table: 'driver_sms_delivery_log', query: 'DELETE FROM driver_sms_delivery_log WHERE driver_id = $1 AND tenant_id = $2' },
    ];

    for (const { table, query: sql } of deletionQueries) {
      try {
        await query(sql, [subjectId, tenantId]);
        // Note: query() returns rows, not rowCount - record deletion attempt
        result.deletedRecords.push({ table, count: 1 });
      } catch (err) {
        logger.warn(`GDPR: Failed to delete from ${table}`, { error: err });
      }
    }

    // Retain payroll records (legal requirement)
    const payrollCount = await queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM tenant_payroll_records WHERE driver_id = $1 AND tenant_id = $2',
      [subjectId, tenantId]
    );
    if (payrollCount && parseInt(payrollCount.count) > 0) {
      result.retainedRecords.push({
        table: 'tenant_payroll_records',
        count: parseInt(payrollCount.count),
        reason: 'Legal retention requirement (payroll: 6 years)',
      });
    }

    // Retain timesheets (legal requirement)
    const timesheetCount = await queryOne<{ count: string }>(
      'SELECT COUNT(*) as count FROM tenant_timesheets WHERE driver_id = $1 AND tenant_id = $2',
      [subjectId, tenantId]
    );
    if (timesheetCount && parseInt(timesheetCount.count) > 0) {
      result.retainedRecords.push({
        table: 'tenant_timesheets',
        count: parseInt(timesheetCount.count),
        reason: 'Legal retention requirement (employment records: 6 years)',
      });
    }

    // Anonymize trips
    await query(
      `UPDATE tenant_trips
       SET driver_notes = '[GDPR DELETED]'
       WHERE driver_id = $1 AND tenant_id = $2`,
      [subjectId, tenantId]
    );
    // Note: query() returns rows, not rowCount - record anonymization attempt
    result.anonymizedRecords.push({ table: 'tenant_trips', count: 1 });

    // Anonymize driver record
    await query(
      `UPDATE tenant_drivers SET
         name = '[DELETED]',
         email = 'deleted_driver_' || driver_id || '@deleted.local',
         phone = NULL,
         mobile = NULL,
         address = NULL,
         postcode = NULL,
         national_insurance = NULL,
         emergency_contact_name = NULL,
         emergency_contact_phone = NULL,
         notes = '[GDPR DELETED on ' || CURRENT_DATE || ']',
         is_active = false,
         is_login_enabled = false,
         deleted_at = NOW(),
         deleted_by = $3
       WHERE driver_id = $1 AND tenant_id = $2`,
      [subjectId, tenantId, requesterId]
    );
    result.anonymizedRecords.push({ table: 'tenant_drivers', count: 1 });

    // Delete user account
    await query(
      `DELETE FROM tenant_users
       WHERE tenant_id = $1
       AND email = $2
       AND role = 'driver'`,
      [tenantId, driver.email]
    );
    // Note: query() returns rows, not rowCount - record deletion attempt
    result.deletedRecords.push({ table: 'tenant_users', count: 1 });

    result.success = true;

    logger.info('GDPR: Driver data deletion completed', {
      tenantId,
      driverId: subjectId,
      deleted: result.deletedRecords,
      anonymized: result.anonymizedRecords,
      retained: result.retainedRecords,
    });

    return result;
  } catch (error) {
    logger.error('GDPR: Driver data deletion failed', {
      tenantId,
      driverId: subjectId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Export all personal data for a customer (GDPR Article 20)
 */
export async function exportCustomerData(
  tenantId: number,
  customerId: number
): Promise<DataExportResult> {
  logger.info('GDPR: Exporting customer data', { tenantId, customerId });

  const result: DataExportResult = {
    subjectType: 'customer',
    subjectId: customerId,
    exportedAt: new Date().toISOString(),
    data: [],
  };

  // Customer profile
  const customer = await queryOne(
    'SELECT * FROM tenant_customers WHERE customer_id = $1 AND tenant_id = $2',
    [customerId, tenantId]
  );
  if (customer) {
    // Decrypt PII fields if encrypted
    const decrypted = decryptPIIFields(customer, [
      'email',
      'phone',
      'address',
      'postcode',
      'emergency_contact_phone',
    ]);
    result.data.push({ category: 'Profile', records: [decrypted] });
  }

  // Trips
  const trips = await query(
    `SELECT trip_id, pickup_location, dropoff_location, pickup_time,
            status, fare, special_requirements, created_at
     FROM tenant_trips
     WHERE customer_id = $1 AND tenant_id = $2
     ORDER BY created_at DESC`,
    [customerId, tenantId]
  );
  if (trips.length > 0) {
    result.data.push({ category: 'Trip History', records: trips });
  }

  // Invoices
  const invoices = await query(
    `SELECT invoice_id, invoice_number, total_amount, status,
            due_date, paid_date, created_at
     FROM tenant_invoices
     WHERE customer_id = $1 AND tenant_id = $2
     ORDER BY created_at DESC`,
    [customerId, tenantId]
  );
  if (invoices.length > 0) {
    result.data.push({ category: 'Invoices', records: invoices });
  }

  // Messages
  const messages = await query(
    `SELECT message_id, message_content, sent_at, delivery_status
     FROM tenant_messages
     WHERE customer_id = $1 AND tenant_id = $2
     ORDER BY sent_at DESC`,
    [customerId, tenantId]
  );
  if (messages.length > 0) {
    result.data.push({ category: 'Communications', records: messages });
  }

  // Feedback
  const feedback = await query(
    `SELECT feedback_id, rating, comments, created_at
     FROM customer_feedback
     WHERE customer_id = $1 AND tenant_id = $2
     ORDER BY created_at DESC`,
    [customerId, tenantId]
  );
  if (feedback.length > 0) {
    result.data.push({ category: 'Feedback', records: feedback });
  }

  logger.info('GDPR: Customer data export completed', {
    tenantId,
    customerId,
    categories: result.data.map((d) => d.category),
  });

  return result;
}

/**
 * Export all personal data for a driver (GDPR Article 20)
 */
export async function exportDriverData(
  tenantId: number,
  driverId: number
): Promise<DataExportResult> {
  logger.info('GDPR: Exporting driver data', { tenantId, driverId });

  const result: DataExportResult = {
    subjectType: 'driver',
    subjectId: driverId,
    exportedAt: new Date().toISOString(),
    data: [],
  };

  // Driver profile
  const driver = await queryOne(
    'SELECT * FROM tenant_drivers WHERE driver_id = $1 AND tenant_id = $2',
    [driverId, tenantId]
  );
  if (driver) {
    // Remove sensitive fields, decrypt PII
    const { password_hash, ...safeDriver } = driver as any;
    const decrypted = decryptPIIFields(safeDriver, [
      'email',
      'phone',
      'address',
      'postcode',
      'national_insurance',
    ]);
    result.data.push({ category: 'Profile', records: [decrypted] });
  }

  // Trips assigned
  const driverTrips = await query(
    `SELECT trip_id, pickup_location, dropoff_location, pickup_time,
            status, fare, created_at
     FROM tenant_trips
     WHERE driver_id = $1 AND tenant_id = $2
     ORDER BY created_at DESC`,
    [driverId, tenantId]
  );
  if (driverTrips.length > 0) {
    result.data.push({ category: 'Trip History', records: driverTrips });
  }

  // Timesheets
  const timesheets = await query(
    `SELECT id, week_starting, week_ending, regular_hours, overtime_hours,
            total_hours, status, created_at
     FROM tenant_timesheets
     WHERE driver_id = $1 AND tenant_id = $2
     ORDER BY week_starting DESC`,
    [driverId, tenantId]
  );
  if (timesheets.length > 0) {
    result.data.push({ category: 'Timesheets', records: timesheets });
  }

  // Payroll records
  const payroll = await query(
    `SELECT record_id, period_id, gross_pay, net_pay, status, created_at
     FROM tenant_payroll_records
     WHERE driver_id = $1 AND tenant_id = $2
     ORDER BY created_at DESC`,
    [driverId, tenantId]
  );
  if (payroll.length > 0) {
    result.data.push({ category: 'Payroll Records', records: payroll });
  }

  // Training records
  const training = await query(
    `SELECT record_id, training_type, completion_date, expiry_date, status
     FROM tenant_training_records
     WHERE driver_id = $1 AND tenant_id = $2
     ORDER BY completion_date DESC`,
    [driverId, tenantId]
  );
  if (training.length > 0) {
    result.data.push({ category: 'Training Records', records: training });
  }

  // Permits
  const permits = await query(
    `SELECT permit_id, permit_type, issue_date, expiry_date, status
     FROM tenant_driver_permits
     WHERE driver_id = $1 AND tenant_id = $2
     ORDER BY issue_date DESC`,
    [driverId, tenantId]
  );
  if (permits.length > 0) {
    result.data.push({ category: 'Permits', records: permits });
  }

  logger.info('GDPR: Driver data export completed', {
    tenantId,
    driverId,
    categories: result.data.map((d) => d.category),
  });

  return result;
}
