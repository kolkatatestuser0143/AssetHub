import { Injectable } from '@nestjs/common';
import { MongooseDatabaseService } from '../mongoose-database.service';

export interface AuditWriteInput {
  tenantId: string;
  companyId?: string;
  actorUserId?: string;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditService {
  constructor(private readonly db: MongooseDatabaseService) {}

  async record(input: AuditWriteInput): Promise<void> {
    if (!input.tenantId) return;

    await this.db.auditEvent.create({
      tenantId: input.tenantId,
      companyId: input.companyId,
      actorUserId: input.actorUserId,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      metadata: this.sanitizeMetadata(input.metadata),
      occurredAt: new Date(),
    });
  }

  private sanitizeMetadata(metadata?: Record<string, unknown>) {
    if (!metadata) return undefined;

    const sensitive = /password|token|secret|authorization|cookie|refresh|access[_-]?token|private[_-]?key/i;
    const output: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(metadata)) {
      if (sensitive.test(key)) continue;
      if (typeof value === 'string' && value.length > 2000) {
        output[key] = value.slice(0, 2000);
      } else {
        output[key] = value;
      }
    }

    return output;
  }
}
