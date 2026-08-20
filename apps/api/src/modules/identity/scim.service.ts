import { BadRequestException, ConflictException, Injectable, NotFoundException, PreconditionFailedException, UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../common/database/prisma.service';
import { EntitlementService } from '../billing/entitlement.service';
import { ProvisioningService } from '../auth/provisioning.service';
import { NormalizedIdentity } from './identity-provider.interface';

export const SCIM_USER_SCHEMA = 'urn:ietf:params:scim:schemas:core:2.0:User';
const SCIM_LIST_SCHEMA = 'urn:ietf:params:scim:api:messages:2.0:ListResponse';

@Injectable()
export class ScimService {
  constructor(private readonly db: PrismaService, private readonly entitlements: EntitlementService, private readonly provisioning: ProvisioningService) {}

  async authenticate(authorization?: string) {
    if (!authorization?.startsWith('Bearer ')) throw new UnauthorizedException('Missing SCIM bearer token');
    const raw = authorization.slice(7).trim();
    if (!raw) throw new UnauthorizedException('Missing SCIM bearer token');
    const hash = crypto.createHash('sha256').update(raw).digest('hex');
    const token = await this.db.scimToken.findFirst({ where: { tokenHash: hash, revokedAt: null }, include: { company: true } });
    if (!token) throw new UnauthorizedException('Invalid or revoked SCIM token');
    await this.entitlements.requireFeature(token.company.tenantId, 'scim_enabled');
    return token;
  }

  serviceProviderConfig() {
    return { schemas: ['urn:ietf:params:scim:schemas:core:2.0:ServiceProviderConfig'], patch: { supported: true }, bulk: { supported: false, maxOperations: 0, maxPayloadSize: 0 }, filter: { supported: true, maxResults: 200 }, sort: { supported: false }, etag: { supported: true }, changePassword: { supported: false }, authenticationSchemes: [{ type: 'oauth2', name: 'SCIM Bearer Token', description: 'AssetHub SCIM bearer token' }] };
  }

  resourceTypes() { return { schemas: ['urn:ietf:params:scim:schemas:core:2.0:ResourceType'], id: 'User', name: 'User', endpoint: '/Users', schema: SCIM_USER_SCHEMA }; }
  schemas() { return { schemas: ['urn:ietf:params:scim:schemas:core:2.0:Schema'], id: SCIM_USER_SCHEMA, name: 'User', description: 'AssetHub SCIM User schema', attributes: [] }; }

  async listUsers(token: any, startIndex = 1, count = 100, filter?: string) {
    const safeStart = Number.isFinite(startIndex) ? Math.max(Math.floor(startIndex), 1) : 1;
    const safeCount = Number.isFinite(count) ? Math.min(Math.max(Math.floor(count), 1), 200) : 100;
    const where: any = { tenantId: token.company.tenantId, companyId: token.companyId };
    if (filter?.trim()) await this.applyFilter(where, token, filter.trim());
    const [total, users] = await Promise.all([this.db.user.count({ where }), this.db.user.findMany({ where, orderBy: { createdAt: 'asc' }, skip: safeStart - 1, take: safeCount })]);
    return { schemas: [SCIM_LIST_SCHEMA], totalResults: total, startIndex: safeStart, itemsPerPage: users.length, Resources: users.map(user => this.toScim(user)) };
  }

  private async applyFilter(where: any, token: any, filter: string) {
    const match = filter.match(/^([A-Za-z][A-Za-z0-9.]*)\s+(eq|co|sw|ew)\s+"((?:\\.|[^"])*)"$/i);
    if (!match) throw new BadRequestException('Unsupported SCIM filter. Supported form: attribute eq|co|sw|ew "value"');
    const attribute = match[1].toLowerCase();
    const operator = match[2].toLowerCase();
    const value = match[3].replace(/\\(["\\])/g, '$1');
    const stringFilter = (field: string) => ({ [field]: operator === 'eq' ? value : operator === 'co' ? { contains: value, mode: 'insensitive' } : operator === 'sw' ? { startsWith: value, mode: 'insensitive' } : { endsWith: value, mode: 'insensitive' } });
    if (attribute === 'username' || attribute === 'emails.value') Object.assign(where, stringFilter('email'));
    else if (attribute === 'name.givenname') Object.assign(where, stringFilter('firstName'));
    else if (attribute === 'name.familyname') Object.assign(where, stringFilter('lastName'));
    else if (attribute === 'title') Object.assign(where, stringFilter('jobTitle'));
    else if (attribute === 'active') {
      if (operator !== 'eq') throw new BadRequestException('SCIM active supports eq only');
      if (!['true', 'false'].includes(value.toLowerCase())) throw new BadRequestException('SCIM active must be true or false');
      where.isActive = value.toLowerCase() === 'true';
    } else if (attribute === 'externalid') {
      const rows = await this.db.$queryRawUnsafe<any[]>(`SELECT user_id AS "userId" FROM external_identities WHERE tenant_id=$1::uuid AND company_id=$2::uuid AND provider=$3 AND external_id=$4`, token.company.tenantId, token.companyId, this.providerName(token), value);
      where.id = { in: rows.map(row => row.userId) };
    } else if (attribute === 'employeenumber') where.employeeId = value;
    else throw new BadRequestException(`Unsupported SCIM filter attribute: ${match[1]}`);
  }

  async getUser(token: any, id: string) {
    const user = await this.db.user.findFirst({ where: { id, tenantId: token.company.tenantId, companyId: token.companyId } });
    if (!user) throw new NotFoundException('SCIM user not found');
    return this.toScim(user);
  }

  async createUser(token: any, body: any) {
    const identity = this.fromScim(body);
    try {
      const user = await this.provisioning.upsertFromIdentity(token.companyId, token.company.tenantId, identity, this.providerName(token));
      await this.recordLog(token, 'CREATE', identity.externalId, body, true);
      return this.toScim(user);
    } catch (error) {
      await this.recordLog(token, 'CREATE', identity.externalId, body, false, this.errorMessage(error));
      throw error;
    }
  }

  async replaceUser(token: any, id: string, body: any, ifMatch?: string) {
    const existing = await this.db.user.findFirst({ where: { id, tenantId: token.company.tenantId, companyId: token.companyId } });
    if (!existing) throw new NotFoundException('SCIM user not found');
    this.assertIfMatch(existing, ifMatch);
    const identity = this.fromScim(body, existing.employeeId ?? existing.externalScimId ?? id);
    try {
      const user = await this.provisioning.upsertFromIdentity(token.companyId, token.company.tenantId, identity, this.providerName(token));
      await this.recordLog(token, 'REPLACE', identity.externalId, body, true);
      return this.toScim(user);
    } catch (error) {
      await this.recordLog(token, 'REPLACE', identity.externalId, body, false, this.errorMessage(error));
      throw error;
    }
  }

  async patchUser(token: any, id: string, body: any, ifMatch?: string) {
    const existing = await this.db.user.findFirst({ where: { id, tenantId: token.company.tenantId, companyId: token.companyId } });
    if (!existing) throw new NotFoundException('SCIM user not found');
    this.assertIfMatch(existing, ifMatch);
    const data: any = {};
    for (const op of Array.isArray(body?.Operations) ? body.Operations : []) {
      const operation = String(op.op || '').toLowerCase();
      const path = String(op.path || '').toLowerCase();
      if (!['add', 'replace', 'remove'].includes(operation)) throw new BadRequestException(`Unsupported SCIM operation: ${op.op}`);
      const value = operation === 'remove' ? null : this.extractValue(op.value);
      if (path === 'active') data.isActive = operation !== 'remove' && Boolean(op.value);
      else if (path === 'username' || path === 'emails[type eq "work"].value') data.email = value ?? existing.email;
      else if (path === 'name.givenname') data.firstName = value;
      else if (path === 'name.familyname') data.lastName = value;
      else if (path === 'title') data.jobTitle = value;
      else if (!path && op.value && typeof op.value === 'object') Object.assign(data, this.fromScim({ ...op.value, externalId: existing.employeeId ?? existing.externalScimId ?? id }).userData());
      else throw new BadRequestException(`Unsupported SCIM path: ${op.path}`);
    }
    try {
      const user = await this.db.$transaction(async tx => {
        if (Object.keys(data).length) await tx.user.update({ where: { id }, data });
        return tx.user.findUniqueOrThrow({ where: { id } });
      });
      await this.db.$executeRawUnsafe(`UPDATE external_identities SET status=CASE WHEN $1::boolean THEN 'active' ELSE 'inactive' END, last_seen_at=now(), updated_at=now() WHERE user_id=$2::uuid AND company_id=$3::uuid AND provider=$4`, data.isActive !== false, id, token.companyId, this.providerName(token));
      await this.recordLog(token, 'PATCH', id, body, true);
      return this.toScim(user);
    } catch (error) {
      await this.recordLog(token, 'PATCH', id, body, false, this.errorMessage(error));
      throw error;
    }
  }

  async deleteUser(token: any, id: string, ifMatch?: string) {
    const user = await this.db.user.findFirst({ where: { id, tenantId: token.company.tenantId, companyId: token.companyId } });
    if (!user) throw new NotFoundException('SCIM user not found');
    this.assertIfMatch(user, ifMatch);
    try {
      await this.db.user.update({ where: { id }, data: { isActive: false } });
      await this.db.$executeRawUnsafe(`UPDATE external_identities SET status='inactive', last_seen_at=now(), updated_at=now() WHERE user_id=$1::uuid AND company_id=$2::uuid AND provider=$3`, id, token.companyId, this.providerName(token));
      await this.recordLog(token, 'DELETE', id, undefined, true);
    } catch (error) {
      await this.recordLog(token, 'DELETE', id, undefined, false, this.errorMessage(error));
      throw error;
    }
  }

  etag(user: any) { return `W/\"${crypto.createHash('sha256').update(`${user.id}:${user.updatedAt?.toISOString?.() ?? ''}`).digest('hex')}\"`; }

  private assertIfMatch(user: any, ifMatch?: string) {
    if (!ifMatch || ifMatch.trim() === '*') return;
    if (ifMatch.trim() !== this.etag(user)) throw new PreconditionFailedException('SCIM resource has changed; refresh before updating');
  }

  private providerName(token: any) { return `SCIM:${token.label?.trim() || token.id}`; }

  private fromScim(body: any, fallbackExternalId?: string): NormalizedIdentity & { userData: () => any } {
    const email = body?.emails?.find?.((entry: any) => entry?.primary)?.value ?? body?.emails?.[0]?.value ?? body?.userName;
    if (!email) throw new BadRequestException('SCIM userName or email is required');
    const externalId = String(body?.externalId ?? body?.employeeNumber ?? body?.userName ?? fallbackExternalId ?? '');
    if (!externalId) throw new BadRequestException('SCIM externalId, employeeNumber or userName is required');
    const identity: any = { externalId, employeeId: body?.employeeNumber ? String(body.employeeNumber) : undefined, email: String(email), firstName: body?.name?.givenName, lastName: body?.name?.familyName, jobTitle: body?.title, department: body?.department, phone: body?.phoneNumbers?.[0]?.value, active: body?.active !== false, rawAttributes: body ?? {} };
    identity.userData = () => ({ email: identity.email, firstName: identity.firstName, lastName: identity.lastName, jobTitle: identity.jobTitle, phone: identity.phone, isActive: identity.active });
    return identity;
  }

  private extractValue(value: any) { if (Array.isArray(value)) return value[0]?.value ?? value[0]; if (value && typeof value === 'object') return value.value; return value; }

  private errorMessage(error: unknown) { return error instanceof Error ? error.message : String(error); }

  private async recordLog(token: any, operation: string, externalId: string | undefined, payload: unknown, success: boolean, errorMessage?: string) {
    try {
      await this.db.scimSyncLog.create({ data: { scimTokenId: token.id, operation, externalId, payloadHash: payload === undefined ? undefined : crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex'), success, errorMessage } });
    } catch {
      // Logging must never turn a successful SCIM operation into a provider-visible failure.
    }
  }

  private toScim(user: any) {
    const displayName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email;
    return { schemas: [SCIM_USER_SCHEMA], id: user.id, externalId: user.externalScimId ?? user.employeeId ?? user.id, userName: user.email, displayName, name: { givenName: user.firstName ?? '', familyName: user.lastName ?? '', formatted: displayName }, emails: [{ value: user.email, type: 'work', primary: true }], active: Boolean(user.isActive), title: user.jobTitle ?? undefined, phoneNumbers: user.phone ? [{ value: user.phone, type: 'work', primary: true }] : [], meta: { resourceType: 'User', created: user.createdAt?.toISOString?.(), lastModified: user.updatedAt?.toISOString?.(), version: this.etag(user) } };
  }
}
