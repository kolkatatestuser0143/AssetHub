import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../common/database/prisma.service';
import { EntitlementService } from '../billing/entitlement.service';
import { ProvisioningService } from '../auth/provisioning.service';
import { NormalizedIdentity } from './identity-provider.interface';

export const SCIM_USER_SCHEMA = 'urn:ietf:params:scim:schemas:core:2.0:User';

@Injectable()
export class ScimService {
  constructor(private readonly db: PrismaService, private readonly entitlements: EntitlementService, private readonly provisioning: ProvisioningService) {}

  async authenticate(authorization?: string) {
    if (!authorization?.startsWith('Bearer ')) throw new UnauthorizedException('Missing SCIM bearer token');
    const hash = crypto.createHash('sha256').update(authorization.slice(7).trim()).digest('hex');
    const token = await this.db.scimToken.findFirst({ where: { tokenHash: hash, revokedAt: null }, include: { company: true } });
    if (!token) throw new UnauthorizedException('Invalid or revoked SCIM token');
    await this.entitlements.requireFeature(token.company.tenantId, 'scim_enabled');
    return token;
  }

  serviceProviderConfig() {
    return { schemas: ['urn:ietf:params:scim:schemas:core:2.0:ServiceProviderConfig'], patch: { supported: true }, bulk: { supported: false, maxOperations: 0, maxPayloadSize: 0 }, filter: { supported: true, maxResults: 200 }, sort: { supported: false }, etag: { supported: false }, changePassword: { supported: false }, authenticationSchemes: [{ type: 'oauth2', name: 'SCIM Bearer Token', description: 'AssetHub SCIM bearer token' }] };
  }

  resourceTypes() { return { schemas: ['urn:ietf:params:scim:schemas:core:2.0:ResourceType'], id: 'User', name: 'User', endpoint: '/Users', schema: SCIM_USER_SCHEMA }; }
  schemas() { return { schemas: ['urn:ietf:params:scim:schemas:core:2.0:Schema'], id: SCIM_USER_SCHEMA, name: 'User', description: 'AssetHub SCIM User schema', attributes: [] }; }

  async listUsers(token: any, startIndex = 1, count = 100, filter?: string) {
    const where: any = { tenantId: token.company.tenantId, companyId: token.companyId };
    const match = filter?.match(/^(userName|externalId)\s+eq\s+"([^"]+)"$/i);
    if (match?.[1].toLowerCase() === 'username') where.email = match[2];
    if (match?.[1].toLowerCase() === 'externalid') {
      const rows = await this.db.$queryRawUnsafe<any[]>(`SELECT user_id AS "userId" FROM external_identities WHERE company_id=$1::uuid AND provider=$2 AND external_id=$3`, token.companyId, this.providerName(token), match[2]);
      where.id = { in: rows.map(row => row.userId) };
    }
    const [total, users] = await Promise.all([this.db.user.count({ where }), this.db.user.findMany({ where, orderBy: { createdAt: 'asc' }, skip: Math.max(startIndex - 1, 0), take: Math.min(Math.max(count, 1), 200) })]);
    return { schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'], totalResults: total, startIndex, itemsPerPage: users.length, Resources: users.map(user => this.toScim(user)) };
  }

  async getUser(token: any, id: string) {
    const user = await this.db.user.findFirst({ where: { id, tenantId: token.company.tenantId, companyId: token.companyId } });
    if (!user) throw new NotFoundException('SCIM user not found');
    return this.toScim(user);
  }

  async createUser(token: any, body: any) {
    const identity = this.fromScim(body);
    const user = await this.provisioning.upsertFromIdentity(token.companyId, token.company.tenantId, identity, this.providerName(token));
    return this.toScim(user);
  }

  async replaceUser(token: any, id: string, body: any) {
    const existing = await this.db.user.findFirst({ where: { id, tenantId: token.company.tenantId, companyId: token.companyId } });
    if (!existing) throw new NotFoundException('SCIM user not found');
    const identity = this.fromScim(body, existing.employeeId ?? existing.externalScimId ?? id);
    return this.toScim(await this.provisioning.upsertFromIdentity(token.companyId, token.company.tenantId, identity, this.providerName(token)));
  }

  async patchUser(token: any, id: string, body: any) {
    const existing = await this.db.user.findFirst({ where: { id, tenantId: token.company.tenantId, companyId: token.companyId } });
    if (!existing) throw new NotFoundException('SCIM user not found');
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
    if (Object.keys(data).length) await this.db.user.update({ where: { id }, data });
    await this.db.$executeRawUnsafe(`UPDATE external_identities SET status=CASE WHEN $1::boolean THEN 'active' ELSE 'inactive' END, last_seen_at=now(), updated_at=now() WHERE user_id=$2::uuid AND company_id=$3::uuid AND provider=$4`, data.isActive !== false, id, token.companyId, this.providerName(token));
    return this.toScim(await this.db.user.findUniqueOrThrow({ where: { id } }));
  }

  async deleteUser(token: any, id: string) {
    const user = await this.db.user.findFirst({ where: { id, tenantId: token.company.tenantId, companyId: token.companyId } });
    if (!user) throw new NotFoundException('SCIM user not found');
    await this.db.user.update({ where: { id }, data: { isActive: false } });
    await this.db.$executeRawUnsafe(`UPDATE external_identities SET status='inactive', last_seen_at=now(), updated_at=now() WHERE user_id=$1::uuid AND company_id=$2::uuid AND provider=$3`, id, token.companyId, this.providerName(token));
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

  private toScim(user: any) {
    const displayName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email;
    return { schemas: [SCIM_USER_SCHEMA], id: user.id, externalId: user.externalScimId ?? user.employeeId ?? user.id, userName: user.email, displayName, name: { givenName: user.firstName ?? '', familyName: user.lastName ?? '', formatted: displayName }, emails: [{ value: user.email, type: 'work', primary: true }], active: Boolean(user.isActive), title: user.jobTitle ?? undefined, phoneNumbers: user.phone ? [{ value: user.phone, type: 'work', primary: true }] : [], meta: { resourceType: 'User', created: user.createdAt?.toISOString?.(), lastModified: user.updatedAt?.toISOString?.() } };
  }
}
