import { BadRequestException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../common/database/prisma.service';
import { EntitlementService } from '../billing/entitlement.service';
import { ProvisioningService } from '../auth/provisioning.service';
import { NormalizedIdentity } from './identity-provider.interface';

export const SCIM_USER_SCHEMA = 'urn:ietf:params:scim:schemas:core:2.0:User';

@Injectable()
export class ScimService {
  constructor(
    private readonly db: PrismaService,
    private readonly entitlements: EntitlementService,
    private readonly provisioning: ProvisioningService,
  ) {}

  async authenticate(authorization?: string) {
    if (!authorization?.startsWith('Bearer ')) throw new UnauthorizedException('Missing SCIM bearer token');
    const raw = authorization.slice('Bearer '.length).trim();
    const hash = crypto.createHash('sha256').update(raw).digest('hex');
    const token = await this.db.scimToken.findFirst({ where: { tokenHash: hash, revokedAt: null }, include: { company: true } });
    if (!token) throw new UnauthorizedException('Invalid or revoked SCIM token');
    await this.entitlements.requireFeature(token.company.tenantId, 'scim_enabled');
    return token;
  }

  serviceProviderConfig() {
    return {
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:ServiceProviderConfig'],
      documentationUri: 'https://www.rfc-editor.org/rfc/rfc7644',
      patch: { supported: true },
      bulk: { supported: false, maxOperations: 0, maxPayloadSize: 0 },
      filter: { supported: true, maxResults: 200 },
      changePassword: { supported: false },
      sort: { supported: false },
      etag: { supported: false },
      authenticationSchemes: [{ type: 'oauth2', name: 'SCIM Bearer Token', description: 'Bearer token issued by AssetHub' }],
    };
  }

  async listUsers(token: any, startIndex = 1, count = 100, filter?: string) {
    const where: any = { tenantId: token.company.tenantId, companyId: token.companyId };
    const match = filter?.match(/^(userName|externalId)\s+eq\s+"([^"]+)"$/i);
    if (match) {
      if (match[1].toLowerCase() === 'username') where.email = match[2];
      else {
        const identities = await this.db.$queryRawUnsafe<any[]>(
          `SELECT user_id AS "userId" FROM external_identities WHERE company_id=$1::uuid AND provider='SCIM' AND external_id=$2`,
          token.companyId,
          match[2],
        );
        where.id = { in: identities.map(i => i.userId) };
      }
    }
    const [total, users] = await Promise.all([
      this.db.user.count({ where }),
      this.db.user.findMany({ where, orderBy: { createdAt: 'asc' }, skip: Math.max(startIndex - 1, 0), take: Math.min(Math.max(count, 1), 200) }),
    ]);
    return { schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'], totalResults: total, startIndex, itemsPerPage: users.length, Resources: users.map(u => this.toScim(u)) };
  }

  async getUser(token: any, id: string) {
    const user = await this.db.user.findFirst({ where: { id, tenantId: token.company.tenantId, companyId: token.companyId } });
    if (!user) throw new NotFoundException('SCIM user not found');
    return this.toScim(user);
  }

  async createUser(token: any, body: any) {
    const identity = this.fromScim(body);
    if (!identity.externalId && !identity.employeeId) throw new BadRequestException('SCIM externalId or employeeNumber is required');
    const user = await this.provisioning.upsertFromIdentity(token.companyId, token.company.tenantId, identity, 'SCIM');
    return this.toScim(user);
  }

  async replaceUser(token: any, id: string, body: any) {
    const existing = await this.db.user.findFirst({ where: { id, tenantId: token.company.tenantId, companyId: token.companyId } });
    if (!existing) throw new NotFoundException('SCIM user not found');
    const identity = this.fromScim(body);
    const updated = await this.provisioning.upsertFromIdentity(token.companyId, token.company.tenantId, { ...identity, externalId: identity.externalId || existing.externalScimId || id }, 'SCIM');
    return this.toScim(updated);
  }

  async patchUser(token: any, id: string, body: any) {
    const existing = await this.db.user.findFirst({ where: { id, tenantId: token.company.tenantId, companyId: token.companyId } });
    if (!existing) throw new NotFoundException('SCIM user not found');
    const operations = Array.isArray(body?.Operations) ? body.Operations : [];
    const data: any = {};
    for (const op of operations) {
      const operation = String(op.op || '').toLowerCase();
      const path = String(op.path || '').toLowerCase();
      if (!['add', 'replace', 'remove'].includes(operation)) throw new BadRequestException(`Unsupported SCIM operation: ${op.op}`);
      if (path === 'active') data.isActive = operation === 'remove' ? false : Boolean(op.value);
      else if (path === 'username' || path === 'emails[type eq "work"].value') data.email = operation === 'remove' ? existing.email : this.extractValue(op.value);
      else if (path === 'name.givenname') data.firstName = operation === 'remove' ? null : this.extractValue(op.value);
      else if (path === 'name.familyname') data.lastName = operation === 'remove' ? null : this.extractValue(op.value);
      else if (path === 'title') data.jobTitle = operation === 'remove' ? null : this.extractValue(op.value);
      else if (path === 'department') {
        // Department names are directory attributes; departmentId remains an AssetHub-owned relation.
      } else if (!path && op.value && typeof op.value === 'object') Object.assign(data, this.fromScim({ ...op.value, externalId: existing.externalScimId }).asUserData());
      else throw new BadRequestException(`Unsupported SCIM path: ${op.path}`);
    }
    if (Object.keys(data).length) await this.db.user.update({ where: { id }, data });
    if (data.isActive === false) await this.db.$executeRawUnsafe(`UPDATE external_identities SET status='inactive', last_seen_at=now(), updated_at=now() WHERE user_id=$1::uuid AND company_id=$2::uuid`, id, token.companyId);
    if (data.isActive === true) await this.db.$executeRawUnsafe(`UPDATE external_identities SET status='active', last_seen_at=now(), updated_at=now() WHERE user_id=$1::uuid AND company_id=$2::uuid`, id, token.companyId);
    return this.toScim(await this.db.user.findUniqueOrThrow({ where: { id } }));
  }

  async deleteUser(token: any, id: string) {
    const user = await this.db.user.findFirst({ where: { id, tenantId: token.company.tenantId, companyId: token.companyId } });
    if (!user) throw new NotFoundException('SCIM user not found');
    await this.db.user.update({ where: { id }, data: { isActive: false } });
    await this.db.$executeRawUnsafe(`UPDATE external_identities SET status='inactive', last_seen_at=now(), updated_at=now() WHERE user_id=$1::uuid AND company_id=$2::uuid`, id, token.companyId);
    return undefined;
  }

  private fromScim(body: any): NormalizedIdentity & { asUserData?: () => any } {
    const email = body?.emails?.find?.((e: any) => e?.primary)?.value ?? body?.emails?.[0]?.value ?? body?.userName;
    if (!email) throw new BadRequestException('SCIM userName or email is required');
    const identity: any = {
      externalId: String(body?.externalId ?? ''),
      employeeId: body?.employeeNumber ? String(body.employeeNumber) : undefined,
      email: String(email),
      firstName: body?.name?.givenName ?? undefined,
      lastName: body?.name?.familyName ?? undefined,
      jobTitle: body?.title ?? undefined,
      department: body?.department ?? undefined,
      phone: body?.phoneNumbers?.find?.((p: any) => p?.primary)?.value ?? body?.phoneNumbers?.[0]?.value ?? undefined,
      active: body?.active !== false,
      rawAttributes: body ?? {},
    };
    identity.asUserData = () => ({ email: identity.email, firstName: identity.firstName, lastName: identity.lastName, jobTitle: identity.jobTitle, phone: identity.phone, isActive: identity.active });
    return identity;
  }

  private extractValue(value: any) {
    if (Array.isArray(value)) return value[0]?.value ?? value[0];
    if (value && typeof value === 'object') return value.value;
    return value;
  }

  private toScim(user: any) {
    const displayName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email;
    return {
      schemas: [SCIM_USER_SCHEMA],
      id: user.id,
      externalId: user.externalScimId ?? user.employeeId ?? user.id,
      userName: user.email,
      displayName,
      name: { givenName: user.firstName ?? '', familyName: user.lastName ?? '', formatted: displayName },
      emails: [{ value: user.email, type: 'work', primary: true }],
      active: Boolean(user.isActive),
      title: user.jobTitle ?? undefined,
      phoneNumbers: user.phone ? [{ value: user.phone, type: 'work', primary: true }] : [],
      meta: { resourceType: 'User', created: user.createdAt?.toISOString?.(), lastModified: user.updatedAt?.toISOString?.() },
    };
  }
}
