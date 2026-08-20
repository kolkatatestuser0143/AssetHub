import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { AuthContext } from '../../common/guards/tenant-context.guard';
import { EntitlementService } from '../billing/entitlement.service';
import { DOCUMENT_STORAGE, DocumentStorage } from './document-storage';

const ALLOWED_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel']);
const ALLOWED_DOCUMENT_TYPES = new Set(['INVOICE', 'PURCHASE_ORDER', 'WARRANTY_CERTIFICATE', 'PHOTO', 'DISPOSAL_RECORD', 'OTHER']);
const PLATFORM_MAX_FILE_BYTES = 25 * 1024 * 1024;

@Injectable()
export class AssetDocumentsService {
  constructor(private readonly prisma: PrismaService, private readonly entitlements: EntitlementService, @Inject(DOCUMENT_STORAGE) private readonly storage: DocumentStorage) {}

  private async requireAsset(auth: AuthContext, assetId: string) {
    const asset = await this.prisma.withTenantContext(auth.tenantId, auth.companyId, tx => tx.asset.findFirst({ where: { id: assetId, tenantId: auth.tenantId, companyId: auth.companyId } }));
    if (!asset) throw new NotFoundException('Asset not found in your scope');
    return asset;
  }

  async list(auth: AuthContext, assetId: string) { await this.requireAsset(auth, assetId); return this.prisma.withTenantContext(auth.tenantId, auth.companyId, tx => tx.assetDocument.findMany({ where: { tenantId: auth.tenantId, companyId: auth.companyId, assetId }, orderBy: { createdAt: 'desc' } })); }

  async registerUpload(auth: AuthContext, assetId: string, input: { uuid: string; fileName: string; contentType: string; sizeBytes: number; documentType?: string }) {
    await this.requireAsset(auth, assetId);
    const requestedFileName = String(input.fileName ?? '').trim(); const requestedContentType = String(input.contentType ?? '').trim().toLowerCase(); const requestedSize = Number(input.sizeBytes);
    if (!input.uuid || !requestedFileName || !ALLOWED_TYPES.has(requestedContentType) || !Number.isFinite(requestedSize) || requestedSize <= 0) throw new BadRequestException('Valid uploaded file metadata is required');
    this.assertDocumentType(input.documentType);
    const stored = await this.storage.register(input.uuid);
    try {
      const fileName = String(stored.fileName ?? requestedFileName).trim(); const contentType = String(stored.contentType ?? '').trim().toLowerCase(); const sizeBytes = Number(stored.sizeBytes);
      if (!fileName || !contentType || !Number.isFinite(sizeBytes) || sizeBytes <= 0) throw new BadRequestException('Uploadcare did not return complete file metadata');
      if (contentType !== requestedContentType || sizeBytes !== requestedSize) throw new BadRequestException('Uploaded file metadata does not match the verified Uploadcare file');
      if (!ALLOWED_TYPES.has(contentType)) throw new BadRequestException('Unsupported document type');
      await this.checkLimits(auth, sizeBytes);
      const doc = await this.prisma.withTenantContext(auth.tenantId, auth.companyId, tx => tx.assetDocument.create({ data: { tenantId: auth.tenantId, companyId: auth.companyId, assetId, s3Key: stored.key, storageProvider: stored.provider, fileName, contentType, sizeBytes, documentType: input.documentType?.trim() || null } }));
      await this.audit(auth, 'asset.document_uploaded', assetId, doc.id, { provider: stored.provider, fileName, contentType, sizeBytes });
      return doc;
    } catch (error) { await this.storage.remove(stored.key).catch(() => undefined); throw error; }
  }

  async upload(auth: AuthContext, assetId: string, file: any, documentType?: string) {
    await this.requireAsset(auth, assetId);
    if (!file?.buffer?.length) throw new BadRequestException('Document file is required');
    if (!ALLOWED_TYPES.has(String(file.mimetype).toLowerCase())) throw new BadRequestException('Unsupported document type');
    this.assertDocumentType(documentType); await this.checkLimits(auth, Number(file.size));
    const fileName = String(file.originalname ?? 'document').replace(/[\r\n]/g, '').trim() || 'document';
    const stored = await this.storage.upload({ buffer: file.buffer, fileName, contentType: String(file.mimetype).toLowerCase() });
    try {
      const doc = await this.prisma.withTenantContext(auth.tenantId, auth.companyId, tx => tx.assetDocument.create({ data: { tenantId: auth.tenantId, companyId: auth.companyId, assetId, s3Key: stored.key, storageProvider: stored.provider, fileName: stored.fileName ?? fileName, contentType: stored.contentType ?? String(file.mimetype).toLowerCase(), sizeBytes: stored.sizeBytes ?? Number(file.size ?? file.buffer.length), documentType: documentType?.trim() || null } }));
      await this.audit(auth, 'asset.document_uploaded', assetId, doc.id, { provider: stored.provider, fileName: doc.fileName, contentType: doc.contentType, sizeBytes: doc.sizeBytes });
      return doc;
    } catch (error) { await this.storage.remove(stored.key).catch(() => undefined); throw error; }
  }

  async storeGeneratedPdf(auth: AuthContext, assetId: string, fileName: string, buffer: Buffer, documentType = 'ACKNOWLEDGEMENT') {
    await this.requireAsset(auth, assetId); this.assertDocumentType(documentType, true); if (!buffer.length) throw new BadRequestException('Generated document is empty'); await this.checkLimits(auth, buffer.length);
    const stored = await this.storage.upload({ buffer, fileName, contentType: 'application/pdf' });
    try { const doc = await this.prisma.withTenantContext(auth.tenantId, auth.companyId, tx => tx.assetDocument.create({ data: { tenantId: auth.tenantId, companyId: auth.companyId, assetId, s3Key: stored.key, storageProvider: stored.provider, fileName: stored.fileName ?? fileName, contentType: stored.contentType ?? 'application/pdf', sizeBytes: stored.sizeBytes ?? buffer.length, documentType } })); await this.audit(auth, 'asset.document_generated', assetId, doc.id, { documentType, fileName: doc.fileName, sizeBytes: doc.sizeBytes }); return doc; } catch (error) { await this.storage.remove(stored.key).catch(() => undefined); throw error; }
  }

  async download(auth: AuthContext, assetId: string, documentId: string) { await this.requireAsset(auth, assetId); const doc = await this.prisma.withTenantContext(auth.tenantId, auth.companyId, tx => tx.assetDocument.findFirst({ where: { id: documentId, tenantId: auth.tenantId, companyId: auth.companyId, assetId } })); if (!doc) throw new NotFoundException('Document not found'); const stored = await this.storage.download(doc.s3Key); await this.audit(auth, 'asset.document_downloaded', assetId, documentId, { fileName: doc.fileName, sizeBytes: doc.sizeBytes }); return { buffer: stored.buffer, fileName: doc.fileName, contentType: doc.contentType || stored.contentType || 'application/octet-stream' }; }

  async remove(auth: AuthContext, assetId: string, documentId: string) { await this.requireAsset(auth, assetId); const doc = await this.prisma.withTenantContext(auth.tenantId, auth.companyId, tx => tx.assetDocument.findFirst({ where: { id: documentId, tenantId: auth.tenantId, companyId: auth.companyId, assetId } })); if (!doc) throw new NotFoundException('Document not found'); await this.storage.remove(doc.s3Key); await this.prisma.withTenantContext(auth.tenantId, auth.companyId, tx => tx.assetDocument.delete({ where: { id: doc.id } })); await this.audit(auth, 'asset.document_deleted', assetId, documentId, { fileName: doc.fileName, sizeBytes: doc.sizeBytes }); return { ok: true }; }

  private async checkLimits(auth: AuthContext, incomingBytes: number) {
    if (incomingBytes > PLATFORM_MAX_FILE_BYTES) throw new BadRequestException('Document exceeds the 25 MB platform limit');
    const maxFileMb = await this.entitlements.getNumber(auth.tenantId, 'max_asset_document_size_mb'); const maxFileBytes = Math.min(PLATFORM_MAX_FILE_BYTES, maxFileMb === null ? PLATFORM_MAX_FILE_BYTES : maxFileMb * 1024 * 1024); if (incomingBytes > maxFileBytes) throw new BadRequestException(`Document exceeds the ${Math.floor(maxFileBytes / (1024 * 1024))} MB size limit`);
    const count = await this.prisma.withTenantContext(auth.tenantId, auth.companyId, tx => tx.assetDocument.count({ where: { tenantId: auth.tenantId } })); await this.entitlements.requireWithinLimit(auth.tenantId, 'max_asset_documents', count, 1);
    const docs = await this.prisma.withTenantContext(auth.tenantId, auth.companyId, tx => tx.assetDocument.findMany({ where: { tenantId: auth.tenantId }, select: { sizeBytes: true } })); const currentBytes = docs.reduce((sum, d) => sum + d.sizeBytes, 0); const maxStorageGb = await this.entitlements.getNumber(auth.tenantId, 'max_storage_gb'); if (maxStorageGb !== null && currentBytes + incomingBytes > maxStorageGb * 1024 * 1024 * 1024) throw new ConflictException(`Tenant storage limit reached: max_storage_gb (${maxStorageGb})`);
  }

  private assertDocumentType(documentType?: string, generated = false) { if (!documentType) return; if (generated && documentType === 'ACKNOWLEDGEMENT') return; if (!ALLOWED_DOCUMENT_TYPES.has(documentType.trim().toUpperCase())) throw new BadRequestException('Invalid document type'); }
  private async audit(auth: AuthContext, action: string, assetId: string, targetId: string, metadata: Record<string, unknown>) { await this.prisma.withTenantContext(auth.tenantId, auth.companyId, tx => tx.auditEvent.create({ data: { tenantId: auth.tenantId, actorUserId: auth.userId, action, targetType: 'asset_document', targetId, metadata, result: 'success', occurredAt: new Date() } })); }
}
