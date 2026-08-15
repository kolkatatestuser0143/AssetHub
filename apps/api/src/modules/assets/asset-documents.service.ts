import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { MongooseDatabaseService } from '../../common/mongoose-database.service';
import { AuthContext } from '../../common/guards/tenant-context.guard';
import { TenantScopedRepository } from '../../common/tenant-scoped.repository';
import { toDto, toDtoArray } from '../../common/mongoose.utils';
import { EntitlementService } from '../billing/entitlement.service';
import { DOCUMENT_STORAGE, DocumentStorage } from './document-storage';

const ALLOWED_TYPES = new Set([
  'application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel',
]);
const PLATFORM_MAX_FILE_BYTES = 25 * 1024 * 1024;

@Injectable()
export class AssetDocumentsService extends TenantScopedRepository {
  constructor(
    private readonly db: MongooseDatabaseService,
    private readonly entitlements: EntitlementService,
    @Inject(DOCUMENT_STORAGE) private readonly storage: DocumentStorage,
  ) { super(); }

  async list(auth: AuthContext, assetId: string) {
    await this.requireAsset(auth, assetId);
    return toDtoArray(await this.db.assetDocument.find({ tenantId: auth.tenantId, companyId: auth.companyId, assetId }).select({ s3Key: 0 }).sort({ createdAt: -1 }).lean());
  }

  async upload(auth: AuthContext, assetId: string, file: any, documentType?: string) {
    await this.requireAsset(auth, assetId);
    if (!file?.buffer?.length) throw new BadRequestException('Document file is required');
    if (!ALLOWED_TYPES.has(file.mimetype)) throw new BadRequestException('Unsupported document type');
    const maxFileMb = await this.entitlements.getNumber(auth.tenantId, 'max_asset_document_size_mb');
    const maxFileBytes = Math.min(PLATFORM_MAX_FILE_BYTES, maxFileMb === null ? PLATFORM_MAX_FILE_BYTES : maxFileMb * 1024 * 1024);
    if (Number(file.size) > maxFileBytes) throw new BadRequestException(`Document exceeds the ${Math.floor(maxFileBytes / (1024 * 1024))} MB size limit`);
    await this.assertStorageLimits(auth.tenantId, Number(file.size));

    const fileName = String(file.originalname ?? 'document');
    const stored = await this.storage.upload({ buffer: file.buffer, fileName, contentType: String(file.mimetype ?? 'application/octet-stream') });
    try {
      const doc = await this.db.assetDocument.create({
        tenantId: auth.tenantId, companyId: auth.companyId, assetId,
        s3Key: stored.key, storageProvider: stored.provider, fileName, contentType: String(file.mimetype ?? 'application/octet-stream'), sizeBytes: Number(file.size ?? file.buffer.length),
        ...(documentType ? { documentType: documentType.trim() } : {}),
      });
      return toDto(doc.toObject());
    } catch (error) {
      await this.storage.remove(stored.key).catch(() => undefined);
      throw error;
    }
  }

  async storeGeneratedPdf(auth: AuthContext, assetId: string, fileName: string, buffer: Buffer, documentType = 'ACKNOWLEDGEMENT') {
    await this.requireAsset(auth, assetId);
    if (!buffer.length) throw new BadRequestException('Generated document is empty');
    const maxFileMb = await this.entitlements.getNumber(auth.tenantId, 'max_asset_document_size_mb');
    const maxFileBytes = Math.min(PLATFORM_MAX_FILE_BYTES, maxFileMb === null ? PLATFORM_MAX_FILE_BYTES : maxFileMb * 1024 * 1024);
    if (buffer.length > maxFileBytes) throw new BadRequestException(`Document exceeds the ${Math.floor(maxFileBytes / (1024 * 1024))} MB size limit`);
    await this.assertStorageLimits(auth.tenantId, buffer.length);

    const stored = await this.storage.upload({ buffer, fileName, contentType: 'application/pdf' });
    try {
      const doc = await this.db.assetDocument.create({ tenantId: auth.tenantId, companyId: auth.companyId, assetId, s3Key: stored.key, storageProvider: stored.provider, fileName, contentType: 'application/pdf', sizeBytes: buffer.length, documentType });
      return toDto(doc.toObject());
    } catch (error) {
      await this.storage.remove(stored.key).catch(() => undefined);
      throw error;
    }
  }

  async download(auth: AuthContext, assetId: string, documentId: string) {
    await this.requireAsset(auth, assetId);
    const doc = await this.db.assetDocument.findOne({ _id: documentId, tenantId: auth.tenantId, companyId: auth.companyId, assetId }).lean();
    if (!doc) throw new NotFoundException('Document not found');
    const stored = await this.storage.download(doc.s3Key);
    return { buffer: stored.buffer, fileName: doc.fileName, contentType: doc.contentType || stored.contentType || 'application/octet-stream' };
  }

  async remove(auth: AuthContext, assetId: string, documentId: string) {
    await this.requireAsset(auth, assetId);
    const doc = await this.db.assetDocument.findOne({ _id: documentId, tenantId: auth.tenantId, companyId: auth.companyId, assetId }).lean();
    if (!doc) throw new NotFoundException('Document not found');
    await this.storage.remove(doc.s3Key);
    await this.db.assetDocument.deleteOne({ _id: documentId, tenantId: auth.tenantId, companyId: auth.companyId, assetId });
    return { ok: true };
  }

  private async assertStorageLimits(tenantId: string, incomingBytes: number) {
    const currentDocumentCount = await this.db.assetDocument.countDocuments({ tenantId });
    await this.entitlements.requireWithinLimit(tenantId, 'max_asset_documents', currentDocumentCount, 1);
    const storageRows = await this.db.assetDocument.aggregate([{ $match: { tenantId } }, { $group: { _id: null, bytes: { $sum: '$sizeBytes' } } }]);
    const currentBytes = Number(storageRows[0]?.bytes ?? 0);
    const maxStorageGb = await this.entitlements.getNumber(tenantId, 'max_storage_gb');
    if (maxStorageGb !== null && currentBytes + incomingBytes > maxStorageGb * 1024 * 1024 * 1024) {
      throw new ConflictException(`Tenant storage limit reached: max_storage_gb (${maxStorageGb})`);
    }
  }

  private async requireAsset(auth: AuthContext, assetId: string) {
    const asset = await this.db.asset.findOne({ _id: assetId, ...this.scope(auth) }).lean();
    if (!asset) throw new NotFoundException('Asset not found in your scope');
    return asset;
  }
}
