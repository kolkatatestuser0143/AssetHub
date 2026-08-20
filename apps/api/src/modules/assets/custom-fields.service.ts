import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { AuthContext } from '../../common/guards/tenant-context.guard';
import { EntitlementService } from '../billing/entitlement.service';

const FIELD_TYPES = new Set(['text', 'number', 'boolean', 'date']);

@Injectable()
export class CustomFieldsService {
  constructor(private readonly prisma: PrismaService, private readonly entitlements: EntitlementService) {}

  private async definitions(auth: AuthContext) {
    return this.prisma.withTenantContext(auth.tenantId, auth.companyId, tx => tx.customFieldDefinition.findMany({ where: { tenantId: auth.tenantId, companyId: auth.companyId }, orderBy: { key: 'asc' } }));
  }

  async listDefinitions(auth: AuthContext) {
    await this.entitlements.requireFeature(auth.tenantId, 'custom_fields_enabled');
    return this.definitions(auth);
  }

  async createDefinition(auth: AuthContext, key: string, label: string, fieldType: string) {
    await this.entitlements.requireFeature(auth.tenantId, 'custom_fields_enabled');
    const normalizedKey = key.trim();
    if (!/^[a-z][a-z0-9_.-]{0,63}$/.test(normalizedKey)) throw new BadRequestException('key must start with a letter and contain only letters, numbers, dot, dash, or underscore');
    if (!FIELD_TYPES.has(fieldType)) throw new BadRequestException(`fieldType must be one of: ${Array.from(FIELD_TYPES).join(', ')}`);
    try {
      return await this.prisma.withTenantContext(auth.tenantId, auth.companyId, tx => tx.customFieldDefinition.create({ data: { tenantId: auth.tenantId, companyId: auth.companyId, key: normalizedKey, label: label.trim(), fieldType } }));
    } catch (error: any) {
      if (error?.code === 'P2002') throw new ConflictException('Custom field key already exists');
      throw error;
    }
  }

  async updateDefinition(auth: AuthContext, key: string, label?: string, fieldType?: string) {
    await this.entitlements.requireFeature(auth.tenantId, 'custom_fields_enabled');
    if (fieldType !== undefined && !FIELD_TYPES.has(fieldType)) throw new BadRequestException(`fieldType must be one of: ${Array.from(FIELD_TYPES).join(', ')}`);
    const result = await this.prisma.withTenantContext(auth.tenantId, auth.companyId, tx => tx.customFieldDefinition.updateMany({ where: { tenantId: auth.tenantId, companyId: auth.companyId, key }, data: { ...(label !== undefined ? { label: label.trim() } : {}), ...(fieldType !== undefined ? { fieldType } : {}) } }));
    if (!result.count) throw new NotFoundException('Custom field not found');
    return this.prisma.withTenantContext(auth.tenantId, auth.companyId, tx => tx.customFieldDefinition.findFirstOrThrow({ where: { tenantId: auth.tenantId, companyId: auth.companyId, key } }));
  }

  async deleteDefinition(auth: AuthContext, key: string) {
    await this.entitlements.requireFeature(auth.tenantId, 'custom_fields_enabled');
    const result = await this.prisma.withTenantContext(auth.tenantId, auth.companyId, tx => tx.customFieldDefinition.deleteMany({ where: { tenantId: auth.tenantId, companyId: auth.companyId, key } }));
    if (!result.count) throw new NotFoundException('Custom field not found');
    return { ok: true };
  }

  async getValues(auth: AuthContext, assetId: string) {
    await this.entitlements.requireFeature(auth.tenantId, 'custom_fields_enabled');
    const asset = await this.prisma.withTenantContext(auth.tenantId, auth.companyId, tx => tx.asset.findFirst({ where: { id: assetId, tenantId: auth.tenantId, companyId: auth.companyId } }));
    if (!asset) throw new NotFoundException('Asset not found');
    return asset.customFields ?? {};
  }

  async setValues(auth: AuthContext, assetId: string, values: Record<string, unknown>) {
    await this.entitlements.requireFeature(auth.tenantId, 'custom_fields_enabled');
    const asset = await this.prisma.withTenantContext(auth.tenantId, auth.companyId, tx => tx.asset.findFirst({ where: { id: assetId, tenantId: auth.tenantId, companyId: auth.companyId } }));
    if (!asset) throw new NotFoundException('Asset not found');
    const definitions = await this.definitions(auth);
    const byKey = new Map(definitions.map(definition => [definition.key, definition]));
    for (const [key, value] of Object.entries(values)) {
      const definition = byKey.get(key);
      if (!definition) throw new BadRequestException(`Unknown custom field: ${key}`);
      this.validateValue(key, definition.fieldType, value);
    }
    const current = asset.customFields && typeof asset.customFields === 'object' && !Array.isArray(asset.customFields) ? asset.customFields as Record<string, unknown> : {};
    const merged = { ...current, ...Object.fromEntries(Object.entries(values).map(([key, value]) => [key, this.serializeValue(value)])) };
    const updated = await this.prisma.withTenantContext(auth.tenantId, auth.companyId, tx => tx.asset.update({ where: { id: assetId }, data: { customFields: merged } }));
    return updated.customFields ?? {};
  }

  async clearValue(auth: AuthContext, assetId: string, key: string) {
    await this.entitlements.requireFeature(auth.tenantId, 'custom_fields_enabled');
    const asset = await this.prisma.withTenantContext(auth.tenantId, auth.companyId, tx => tx.asset.findFirst({ where: { id: assetId, tenantId: auth.tenantId, companyId: auth.companyId } }));
    if (!asset) throw new NotFoundException('Asset not found');
    const definition = await this.prisma.withTenantContext(auth.tenantId, auth.companyId, tx => tx.customFieldDefinition.findFirst({ where: { tenantId: auth.tenantId, companyId: auth.companyId, key } }));
    if (!definition) throw new NotFoundException('Custom field not found');
    const values = asset.customFields && typeof asset.customFields === 'object' && !Array.isArray(asset.customFields) ? { ...(asset.customFields as Record<string, unknown>) } : {};
    delete values[key];
    const updated = await this.prisma.withTenantContext(auth.tenantId, auth.companyId, tx => tx.asset.update({ where: { id: assetId }, data: { customFields: values } }));
    return updated.customFields ?? {};
  }

  private validateValue(key: string, type: string, value: unknown) {
    if (value === null || value === undefined) throw new BadRequestException(`${key} cannot be null`);
    if (type === 'text' && typeof value !== 'string') throw new BadRequestException(`${key} must be text`);
    if (type === 'number' && (typeof value !== 'number' || !Number.isFinite(value))) throw new BadRequestException(`${key} must be a finite number`);
    if (type === 'boolean' && typeof value !== 'boolean') throw new BadRequestException(`${key} must be boolean`);
    if (type === 'date' && (typeof value !== 'string' || Number.isNaN(Date.parse(value)))) throw new BadRequestException(`${key} must be an ISO date string`);
  }

  private serializeValue(value: unknown): string { return typeof value === 'string' ? value : JSON.stringify(value); }
}
