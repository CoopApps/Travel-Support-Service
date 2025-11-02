/**
 * Soft Delete Utilities
 *
 * Provides reusable functions for soft delete operations across all tables.
 *
 * Features:
 * - Soft delete (mark as inactive)
 * - Restore (reactivate)
 * - Permanent delete (admin only)
 * - Cascading soft deletes
 *
 * Usage:
 *   import { softDelete, restore, getDeleted } from './utils/softDelete';
 */

import { Pool, PoolClient } from 'pg';
import { logger } from './logger';

/**
 * Soft Delete Options
 */
export interface SoftDeleteOptions {
  tableName: string;
  idColumn: string;
  id: number;
  userId?: number; // User performing the deletion
  tenantId?: number; // For tenant-scoped tables
  cascadeDeletes?: CascadeDelete[]; // Related records to also soft delete
}

/**
 * Cascade Delete Configuration
 */
export interface CascadeDelete {
  tableName: string;
  foreignKeyColumn: string; // Column that references the parent
  idColumn: string;
}

/**
 * Restore Options
 */
export interface RestoreOptions {
  tableName: string;
  idColumn: string;
  id: number;
  tenantId?: number;
  cascadeRestores?: CascadeDelete[]; // Related records to also restore
}

/**
 * Soft delete a record
 *
 * Sets is_active = false, deleted_at = CURRENT_TIMESTAMP, deleted_by = userId
 *
 * @param options - Soft delete options
 * @param client - Database client
 * @returns Number of rows affected
 */
export async function softDelete(
  options: SoftDeleteOptions,
  client: Pool | PoolClient
): Promise<number> {
  const { tableName, idColumn, id, userId, tenantId, cascadeDeletes } = options;

  try {
    // Build WHERE clause
    let whereClause = `${idColumn} = $1`;
    const params: any[] = [id];

    if (tenantId) {
      whereClause += ' AND tenant_id = $2';
      params.push(tenantId);
    }

    // Build SET clause
    let setClause = 'is_active = false, deleted_at = CURRENT_TIMESTAMP';
    if (userId) {
      setClause += `, deleted_by = $${params.length + 1}`;
      params.push(userId);
    }

    // Execute soft delete
    const query = `
      UPDATE ${tableName}
      SET ${setClause}
      WHERE ${whereClause}
      RETURNING *
    `;

    const result = await client.query(query, params);

    if (result.rows.length === 0) {
      logger.warn('Soft delete failed: record not found', {
        tableName,
        idColumn,
        id,
        tenantId,
      });
      return 0;
    }

    logger.info('Soft deleted record', {
      tableName,
      idColumn,
      id,
      userId,
      tenantId,
    });

    // Handle cascade deletes
    if (cascadeDeletes && cascadeDeletes.length > 0) {
      for (const cascade of cascadeDeletes) {
        await cascadeSoftDelete(cascade, id, userId, tenantId, client);
      }
    }

    return result.rows.length;
  } catch (error) {
    logger.error('Soft delete error', {
      error,
      tableName,
      idColumn,
      id,
    });
    throw error;
  }
}

/**
 * Restore a soft-deleted record
 *
 * Sets is_active = true, deleted_at = NULL, deleted_by = NULL
 *
 * @param options - Restore options
 * @param client - Database client
 * @returns Number of rows affected
 */
export async function restore(
  options: RestoreOptions,
  client: Pool | PoolClient
): Promise<number> {
  const { tableName, idColumn, id, tenantId, cascadeRestores } = options;

  try {
    // Build WHERE clause
    let whereClause = `${idColumn} = $1`;
    const params: any[] = [id];

    if (tenantId) {
      whereClause += ' AND tenant_id = $2';
      params.push(tenantId);
    }

    // Execute restore
    const query = `
      UPDATE ${tableName}
      SET is_active = true,
          deleted_at = NULL,
          deleted_by = NULL
      WHERE ${whereClause}
      RETURNING *
    `;

    const result = await client.query(query, params);

    if (result.rows.length === 0) {
      logger.warn('Restore failed: record not found', {
        tableName,
        idColumn,
        id,
        tenantId,
      });
      return 0;
    }

    logger.info('Restored record', {
      tableName,
      idColumn,
      id,
      tenantId,
    });

    // Handle cascade restores
    if (cascadeRestores && cascadeRestores.length > 0) {
      for (const cascade of cascadeRestores) {
        await cascadeRestore(cascade, id, tenantId, client);
      }
    }

    return result.rows.length;
  } catch (error) {
    logger.error('Restore error', {
      error,
      tableName,
      idColumn,
      id,
    });
    throw error;
  }
}

/**
 * Permanently delete a record (admin only)
 *
 * Actually removes the record from the database
 *
 * @param tableName - Table name
 * @param idColumn - ID column name
 * @param id - Record ID
 * @param tenantId - Optional tenant ID
 * @param client - Database client
 * @returns Number of rows affected
 */
export async function permanentDelete(
  tableName: string,
  idColumn: string,
  id: number,
  tenantId: number | undefined,
  client: Pool | PoolClient
): Promise<number> {
  try {
    // Build WHERE clause
    let whereClause = `${idColumn} = $1`;
    const params: any[] = [id];

    if (tenantId) {
      whereClause += ' AND tenant_id = $2';
      params.push(tenantId);
    }

    // Execute permanent delete
    const query = `DELETE FROM ${tableName} WHERE ${whereClause}`;
    const result = await client.query(query, params);

    logger.warn('Permanently deleted record', {
      tableName,
      idColumn,
      id,
      tenantId,
      rowsDeleted: result.rowCount,
    });

    return result.rowCount || 0;
  } catch (error) {
    logger.error('Permanent delete error', {
      error,
      tableName,
      idColumn,
      id,
    });
    throw error;
  }
}

/**
 * Get all deleted records for a table
 *
 * @param tableName - Table name
 * @param tenantId - Tenant ID
 * @param client - Database client
 * @returns Array of deleted records
 */
export async function getDeleted(
  tableName: string,
  tenantId: number,
  client: Pool | PoolClient
): Promise<any[]> {
  const query = `
    SELECT *
    FROM ${tableName}
    WHERE tenant_id = $1 AND is_active = false
    ORDER BY deleted_at DESC
  `;

  const result = await client.query(query, [tenantId]);
  return result.rows;
}

/**
 * Get recently deleted records (last 30 days)
 *
 * @param tableName - Table name
 * @param tenantId - Tenant ID
 * @param days - Number of days to look back (default 30)
 * @param client - Database client
 * @returns Array of recently deleted records
 */
export async function getRecentlyDeleted(
  tableName: string,
  tenantId: number,
  days: number = 30,
  client: Pool | PoolClient
): Promise<any[]> {
  const query = `
    SELECT *
    FROM ${tableName}
    WHERE tenant_id = $1
      AND is_active = false
      AND deleted_at > CURRENT_TIMESTAMP - INTERVAL '${days} days'
    ORDER BY deleted_at DESC
  `;

  const result = await client.query(query, [tenantId]);
  return result.rows;
}

/**
 * Check if a record is soft deleted
 *
 * @param tableName - Table name
 * @param idColumn - ID column name
 * @param id - Record ID
 * @param client - Database client
 * @returns True if soft deleted, false otherwise
 */
export async function isDeleted(
  tableName: string,
  idColumn: string,
  id: number,
  client: Pool | PoolClient
): Promise<boolean> {
  const query = `
    SELECT is_active, deleted_at
    FROM ${tableName}
    WHERE ${idColumn} = $1
  `;

  const result = await client.query(query, [id]);

  if (result.rows.length === 0) {
    return false; // Record doesn't exist
  }

  return !result.rows[0].is_active || result.rows[0].deleted_at !== null;
}

/**
 * Cascade soft delete for related records
 *
 * @param cascade - Cascade configuration
 * @param parentId - Parent record ID
 * @param userId - User performing the deletion
 * @param tenantId - Tenant ID
 * @param client - Database client
 */
async function cascadeSoftDelete(
  cascade: CascadeDelete,
  parentId: number,
  userId: number | undefined,
  tenantId: number | undefined,
  client: Pool | PoolClient
): Promise<void> {
  const { tableName, foreignKeyColumn } = cascade;

  // Build SET clause
  let setClause = 'is_active = false, deleted_at = CURRENT_TIMESTAMP';
  const params: any[] = [parentId];

  if (userId) {
    setClause += `, deleted_by = $2`;
    params.push(userId);
  }

  // Build WHERE clause
  let whereClause = `${foreignKeyColumn} = $1`;
  if (tenantId) {
    whereClause += ` AND tenant_id = $${params.length + 1}`;
    params.push(tenantId);
  }

  const query = `
    UPDATE ${tableName}
    SET ${setClause}
    WHERE ${whereClause} AND is_active = true
  `;

  const result = await client.query(query, params);

  logger.info('Cascade soft delete completed', {
    tableName,
    foreignKeyColumn,
    parentId,
    rowsAffected: result.rowCount,
  });
}

/**
 * Cascade restore for related records
 *
 * @param cascade - Cascade configuration
 * @param parentId - Parent record ID
 * @param tenantId - Tenant ID
 * @param client - Database client
 */
async function cascadeRestore(
  cascade: CascadeDelete,
  parentId: number,
  tenantId: number | undefined,
  client: Pool | PoolClient
): Promise<void> {
  const { tableName, foreignKeyColumn } = cascade;

  const params: any[] = [parentId];
  let whereClause = `${foreignKeyColumn} = $1`;

  if (tenantId) {
    whereClause += ' AND tenant_id = $2';
    params.push(tenantId);
  }

  const query = `
    UPDATE ${tableName}
    SET is_active = true,
        deleted_at = NULL,
        deleted_by = NULL
    WHERE ${whereClause} AND is_active = false
  `;

  const result = await client.query(query, params);

  logger.info('Cascade restore completed', {
    tableName,
    foreignKeyColumn,
    parentId,
    rowsAffected: result.rowCount,
  });
}

/**
 * Batch soft delete multiple records
 *
 * @param tableName - Table name
 * @param idColumn - ID column name
 * @param ids - Array of IDs to delete
 * @param userId - User performing the deletion
 * @param tenantId - Tenant ID
 * @param client - Database client
 * @returns Number of rows affected
 */
export async function batchSoftDelete(
  tableName: string,
  idColumn: string,
  ids: number[],
  userId: number | undefined,
  tenantId: number | undefined,
  client: Pool | PoolClient
): Promise<number> {
  if (ids.length === 0) {
    return 0;
  }

  // Build SET clause
  let setClause = 'is_active = false, deleted_at = CURRENT_TIMESTAMP';
  const params: any[] = [ids];

  if (userId) {
    setClause += `, deleted_by = $2`;
    params.push(userId);
  }

  // Build WHERE clause
  let whereClause = `${idColumn} = ANY($1)`;
  if (tenantId) {
    whereClause += ` AND tenant_id = $${params.length + 1}`;
    params.push(tenantId);
  }

  const query = `
    UPDATE ${tableName}
    SET ${setClause}
    WHERE ${whereClause}
  `;

  const result = await client.query(query, params);

  logger.info('Batch soft delete completed', {
    tableName,
    count: ids.length,
    rowsAffected: result.rowCount,
  });

  return result.rowCount || 0;
}
