import { db } from "./db";

export async function recordAuditLog(params: {
  companyId?: string | null;
  userId?: string | null;
  module: string;
  action: string;
  recordId?: string;
  oldValues?: any;
  newValues?: any;
  ipAddress?: string;
  userAgent?: string;
}) {
  try {
    await db.auditLog.create({
      data: {
        companyId: params.companyId,
        userId: params.userId,
        module: params.module,
        action: params.action,
        recordId: params.recordId,
        oldValuesJson: params.oldValues ? JSON.stringify(params.oldValues) : null,
        newValuesJson: params.newValues ? JSON.stringify(params.newValues) : null,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    });
  } catch (err) {
    console.error("Audit log error:", err);
  }
}