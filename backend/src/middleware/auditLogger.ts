/**
 * Audit Logging Middleware
 *
 * Automatically logs all CUD (Create, Update, Delete) operations
 * for compliance, security, and debugging purposes
 */

import { Request, Response, NextFunction } from 'express';
import { query } from '../config/database';
import { logger } from '../utils/logger';

export interface AuditLogData {
  tenantId: number;
  userId?: number;
  action: 'create' | 'update' | 'delete' | 'login' | 'logout' | 'password_reset';
  resourceType: string;
  resourceId?: number;
  oldData?: any;
  newData?: any;
}

/**
 * Log an audit event to database
 */
export async function logAudit(data: AuditLogData, req?: Request): Promise<void> {
  try {
    const ipAddress = req ? req.ip || req.socket.remoteAddress : null;
    const userAgent = req ? req.headers['user-agent'] : null;
    const requestId = req ? (req as any).id : null;

    await query(
      `INSERT INTO audit_logs (
        tenant_id,
        user_id,
        action,
        resource_type,
        resource_id,
        old_data,
        new_data,
        ip_address,
        user_agent,
        request_id,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
      [
        data.tenantId,
        data.userId || null,
        data.action,
        data.resourceType,
        data.resourceId || null,
        data.oldData ? JSON.stringify(data.oldData) : null,
        data.newData ? JSON.stringify(data.newData) : null,
        ipAddress,
        userAgent,
        requestId,
      ]
    );

    logger.debug('Audit log recorded', {
      tenantId: data.tenantId,
      userId: data.userId,
      action: data.action,
      resourceType: data.resourceType,
      resourceId: data.resourceId,
    });
  } catch (error) {
    // Don't fail the request if audit logging fails
    logger.error('Failed to write audit log', {
      error: error instanceof Error ? error.message : 'Unknown error',
      data,
    });
  }
}

/**
 * Middleware to automatically log operations
 * Attaches audit logging function to request object
 */
export function auditMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Attach audit logging function to request
  (req as any).audit = async (data: AuditLogData) => {
    await logAudit(data, req);
  };

  // Intercept response to capture response data
  const originalJson = res.json.bind(res);
  (res as any).jsonWithAudit = function (body: any, auditData?: Partial<AuditLogData>) {
    // If audit data provided, log it
    if (auditData && req.method !== 'GET') {
      const tenantId =
        auditData.tenantId || parseInt(req.params.tenantId) || (req as any).user?.tenantId;
      const userId = auditData.userId || (req as any).user?.userId;

      if (tenantId) {
        // Determine action from HTTP method
        let action: AuditLogData['action'] = 'create';
        if (req.method === 'POST') action = 'create';
        else if (req.method === 'PUT' || req.method === 'PATCH') action = 'update';
        else if (req.method === 'DELETE') action = 'delete';

        logAudit(
          {
            tenantId,
            userId,
            action,
            ...auditData,
          } as AuditLogData,
          req
        ).catch((err) => {
          logger.error('Audit logging failed', { error: err });
        });
      }
    }

    return originalJson(body);
  };

  next();
}

/**
 * Helper to extract important fields from an object (remove sensitive data)
 */
export function sanitizeAuditData(data: any): any {
  if (!data || typeof data !== 'object') return data;

  const sanitized = { ...data };

  // Remove sensitive fields
  delete sanitized.password;
  delete sanitized.password_hash;
  delete sanitized.token;
  delete sanitized.api_key;
  delete sanitized.secret;

  return sanitized;
}
