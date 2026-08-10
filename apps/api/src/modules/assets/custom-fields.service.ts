import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { MongooseDatabaseService } from '../../common/mongoose-database.service';
import { AuthContext } from '../../common/guards/tenant-context.guard';
import { TenantScopedRepository } from '../../common/tenant-scoped.repository';
import { toDto, toDtoArray } from '../../common/mongoose.utils';

const FIELD_TYPES = new Set(['text', 'number', 'boolean', 'date']);

@Injectable()
export class CustomFieldsService extends TenantScopedRepository {
  constructor(private readonly db: MongooseDatabaseService) { super(); }

  async listDefinitions(auth: AuthContext) {
    const docs = await this.db.customFieldDefinition.find(this.scope(auth)).sort({ key: 1 }).lean();
    return toDtoArray(docs);
  }

  async createDefinition(auth: AuthContext, key: string, label: string, fieldType: string) {
    const normalizedKey = key.trim();
    if (!/^[a-z][a-z0-9_.-]{0,63}$/.test(normalizedKey)) {
      throw new BadRequestException('key must start with a letter and contain only letters, numbers, dot, dash, or underscore');
    }
    if (!FIELD_TYPES.has(fieldType)) {
      throw new BadRequestException(`fieldType must be one of: ${Array.from(FIELD_TYPES).join(', ')}`);
    }
    try {
      const doc = await this.db.customFieldDefinition.create({
        companyId: auth.companyId,
        key: normalizedKey,
        label: label.trim(),
        fieldType,
      });
      return toDto(doc.toObject());
    } catch (error: any) {
      if (error?.code === 11000) throw new ConflictException('Custom field key already exists');
      throw error;
    }
  }

  async updateDefinition(auth: AuthContext, key: string, label?: string, fieldType?: string) {
    if (fieldType !== undefined && !FIELD_TYPES.has(fieldType)) {
      throw new BadRequestException(`fieldType must be one of: ${Array.from(FIELD_TYPES).join(', ')}`);
    }
    const updated = await this.db.customFieldDefinition.findOneAndUpdate(
      { ...this.scope(auth), key },
      {
        ...(label !== undefined ? { $set: { label: label.trim() } } : {}),
        ...(fieldType !== undefined ? { $set: { fieldType } } : {}),
      },
      { new: true },
    ).lean();
    if (!updated) throw new NotFoundException('Custom field not found');
    return toDto(updated);
  }

  async deleteDefinition(auth: AuthContext, key: string) {
    const deleted = await this.db.customFieldDefinition.findOneAndDelete({ ...this.scope(auth), key }).lean();
    if (!deleted) throw new NotFoundException('Custom field not found');
    return { ok: true };
  }

  async getValues(auth: AuthContext, assetId: string) {
    const asset = await this.db.asset.findOne({ _id: assetId, ...this.scope(auth) }).lean();
    if (!asset) throw new NotFoundException('Asset not found');
    return asset.customFields ?? {};
  }

  async setValues(auth: AuthContext, assetId: string, values: Record<string, unknown>) {
    const asset = await this.db.asset.findOne({ _id: assetId, ...this.scope(auth) }).lean();
    if (!asset) throw new NotFoundException('Asset not found');

    const definitions = await this.db.customFieldDefinition.find(this.scope(auth)).lean();
    const byKey = new Map(definitions.map((definition) => [definition.key, definition]));
    for (const [key, value] of Object.entries(values)) {
      const definition = byKey.get(key);
      if (!definition) throw new BadRequestException(`Unknown custom field: ${key}`);
      this.validateValue(key, definition.fieldType, value);
    }

    const merged = { ...(asset.customFields ?? {}), ...Object.fromEntries(
      Object.entries(values).map(([key, value]) => [key, this.serializeValue(value)]),
    ) };

    const updated = await this.db.asset.findOneAndUpdate(
      { _id: assetId, ...this.scope(auth) },
      { $set: { customFields: merged } },
      { new: true },
    ).lean();
    if (!updated) throw new NotFoundException('Asset not found');
    return updated.customFields ?? {};
  }

  async clearValue(auth: AuthContext, assetId: string, key: string) {
    const asset = await this.db.asset.findOne({ _id: assetId, ...this.scope(auth) }).lean();
    if (!asset) throw new NotFoundException('Asset not found');
    const definition = await this.db.customFieldDefinition.findOne({ ...this.scope(auth), key }).lean();
    if (!definition) throw new NotFoundException('Custom field not found');
    const values = { ...(asset.customFields ?? {}) };
    delete values[key];
    const updated = await this.db.asset.findOneAndUpdate(
      { _id: assetId, ...this.scope(auth) },
      { $set: { customFields: values } },
      { new: true },
    ).lean();
    if (!updated) throw new NotFoundException('Asset not found');
    return updated.customFields ?? {};
  }

  private validateValue(key: string, type: string, value: unknown) {
    if (value === null || value === undefined) throw new BadRequestException(`${key} cannot be null`);
    if (type === 'text' && typeof value !== 'string') throw new BadRequestException(`${key} must be text`);
    if (type === 'number' && (typeof value !== 'number' || !Number.isFinite(value))) throw new BadRequestException(`${key} must be a finite number`);
    if (type === 'boolean' && typeof value !== 'boolean') throw new BadRequestException(`${key} must be boolean`);
    if (type === 'date' && (typeof value !== 'string' || Number.isNaN(Date.parse(value)))) throw new BadRequestException(`${key} must be an ISO date string`);
  }

  private serializeValue(value: unknown): string {
    if (typeof value === 'string') return value;
    return JSON.stringify(value);
  }
}
