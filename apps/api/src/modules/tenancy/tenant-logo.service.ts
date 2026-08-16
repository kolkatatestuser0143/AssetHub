import { BadRequestException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { createHmac } from 'crypto';
import { MongooseDatabaseService } from '../../common/mongoose-database.service';
import { AuthContext } from '../../common/guards/tenant-context.guard';

const UPLOADCARE_API = 'https://api.uploadcare.com';
const UPLOADCARE_ACCEPT = 'application/vnd.uploadcare-v0.7+json';

@Injectable()
export class TenantLogoService {
  private readonly publicKey = process.env.UPLOADCARE_PUBLIC_KEY?.trim() ?? '';
  private readonly secretKey = process.env.UPLOADCARE_SECRET_KEY?.trim() ?? '';
  private readonly cdnBase = (process.env.UPLOADCARE_CDN_BASE ?? 'https://ucarecdn.com').replace(/\/$/, '');

  constructor(private readonly db: MongooseDatabaseService) {}

  getClientConfig() {
    return { publicKey: this.publicKey || null, cdnBase: this.cdnBase };
  }

  private assertConfigured() {
    if (!this.publicKey || !this.secretKey) {
      throw new ServiceUnavailableException('Uploadcare is not configured. Set UPLOADCARE_PUBLIC_KEY and UPLOADCARE_SECRET_KEY on the API.');
    }
  }

  private async verifyFile(fileId: string) {
    this.assertConfigured();
    const key = fileId.trim();
    if (!/^[a-f0-9-]{20,64}$/i.test(key)) throw new BadRequestException('Invalid Uploadcare file identifier');
    const method = 'GET';
    const date = new Date().toUTCString();
    const uri = `/files/${encodeURIComponent(key)}/`;
    const signature = createHmac('sha1', this.secretKey).update([method, '', '', date, uri].join('\n')).digest('hex');
    const response = await fetch(`${UPLOADCARE_API}${uri}`, {
      headers: { Accept: UPLOADCARE_ACCEPT, Date: date, Authorization: `Uploadcare ${this.publicKey}:${signature}` },
    });
    const text = await response.text();
    let body: any = {};
    try { body = text ? JSON.parse(text) : {}; } catch {}
    if (!response.ok) {
      if (response.status === 404) throw new BadRequestException('Uploadcare file was not found');
      throw new ServiceUnavailableException(`Uploadcare file verification failed: ${body?.detail || body?.message || text || response.statusText}`);
    }
    return body;
  }

  async setLogo(auth: AuthContext, fileId: string) {
    const tenant = await this.db.tenant.findById(auth.tenantId).lean();
    if (!tenant) throw new NotFoundException('Tenant not found');
    const file = await this.verifyFile(fileId);
    const mime = String(file?.mime_type ?? file?.content_type ?? '').toLowerCase();
    if (mime && !['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'].includes(mime)) {
      throw new BadRequestException('Tenant logo must be a PNG, JPEG, WebP or SVG image');
    }
    const normalizedFileId = fileId.trim();
    const url = `${this.cdnBase}/${encodeURIComponent(normalizedFileId)}/`;
    const updated = await this.db.tenant.findByIdAndUpdate(auth.tenantId, { $set: { logoFileId: normalizedFileId, logoUrl: url, updatedAt: new Date() } }, { new: true }).lean();
    await this.db.auditEvent.create({ tenantId: auth.tenantId, actorUserId: auth.userId, action: 'tenant.logo_updated', targetType: 'tenant', targetId: auth.tenantId, metadata: { fileId: normalizedFileId }, result: 'success', occurredAt: new Date() });
    return { logoFileId: updated?.logoFileId ?? null, logoUrl: updated?.logoUrl ?? null };
  }

  async removeLogo(auth: AuthContext) {
    const tenant = await this.db.tenant.findById(auth.tenantId).lean();
    if (!tenant) throw new NotFoundException('Tenant not found');
    await this.db.tenant.updateOne({ _id: auth.tenantId }, { $unset: { logoFileId: 1, logoUrl: 1 }, $set: { updatedAt: new Date() } });
    await this.db.auditEvent.create({ tenantId: auth.tenantId, actorUserId: auth.userId, action: 'tenant.logo_removed', targetType: 'tenant', targetId: auth.tenantId, metadata: {}, result: 'success', occurredAt: new Date() });
    return { logoFileId: null, logoUrl: null };
  }
}
