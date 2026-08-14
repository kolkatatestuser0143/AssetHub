import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'fs';
import { basename, join } from 'path';
import { MongooseDatabaseService } from '../../common/mongoose-database.service';
import { AuthContext } from '../../common/guards/tenant-context.guard';
import { TenantScopedRepository } from '../../common/tenant-scoped.repository';
import { toDto, toDtoArray } from '../../common/mongoose.utils';
import { EntitlementService } from '../billing/entitlement.service';

const ALLOWED_TYPES = new Set([
  'application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel',
]);
const PLATFORM_MAX_FILE_BYTES = 25 * 1024 * 1024;

@Injectable()
export class AssetDocumentsService extends TenantScopedRepository {
  private readonly root = process.env.ASSET_DOCUMENTS_DIR || join(process.cwd(), 'storage', 'asset-documents');

  constructor(private readonly db: MongooseDatabaseService, private readonly entitlements: EntitlementService) {
    super();
    mkdirSync(this.root, { recursive: true });
  }

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

    const currentDocumentCount = await this.db.assetDocument.countDocuments({ tenantId: auth.tenantId });
    await this.entitlements.requireWithinLimit(auth.tenantId, 'max_asset_documents', currentDocumentCount, 1);

    const storageRows = await this.db.assetDocument.aggregate([
      { $match: { tenantId: auth.tenantId } },
      { $group: { _id: null, bytes: { $sum: '$sizeBytes' } } },
    ]);
    const currentBytes = Number(storageRows[0]?.bytes ?? 0);
    const maxStorageGb = await this.entitlements.getNumber(auth.tenantId, 'max_storage_gb');
    if (maxStorageGb !== null && currentBytes + Number(file.size) > maxStorageGb * 1024 * 1024 * 1024) {
      throw new ConflictException(`Tenant storage limit reached: max_storage_gb (${maxStorageGb})`);
    }

    const safeName = basename(String(file.originalname ?? 'document')).replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = join(auth.tenantId, auth.companyId, assetId, `${randomUUID()}-${safeName}`);
    const absolutePath = join(this.root, key);
    mkdirSync(join(this.root, auth.tenantId, auth.companyId, assetId), { recursive: true });
    writeFileSync(absolutePath, file.buffer, { flag: 'wx' });

    try {
      const doc = await this.db.assetDocument.create({
        tenantId: auth.tenantId, companyId: auth.companyId, assetId, s3Key: key,
        fileName: String(file.originalname ?? safeName), contentType: String(file.mimetype ?? 'application/octet-stream'),
        sizeBytes: Number(file.size ?? file.buffer.length), ...(documentType ? { documentType: documentType.trim() } : {}),
      });
      return toDto(doc.toObject());
    } catch (error) {
      if (existsSync(absolutePath)) unlinkSync(absolutePath);
      throw error;
    }
  }

  async download(auth: AuthContext, assetId: string, documentId: string) {
    await this.requireAsset(auth, assetId);
    const doc = await this.db.assetDocument.findOne({ _id: documentId, tenantId: auth.tenantId, companyId: auth.companyId, assetId }).lean();
    if (!doc) throw new NotFoundException('Document not found');
    const path = join(this.root, doc.s3Key);
    if (!existsSync(path)) throw new NotFoundException('Document content not found');
    return { path, fileName: doc.fileName, contentType: doc.contentType || 'application/octet-stream' };
  }

  async remove(auth: AuthContext, assetId: string, documentId: string) {
    await this.requireAsset(auth, assetId);
    const doc = await this.db.assetDocument.findOne({ _id: documentId, tenantId: auth.tenantId, companyId: auth.companyId, assetId }).lean();
    if (!doc) throw new NotFoundException('Document not found');
    const path = join(this.root, doc.s3Key);
    if (existsSync(path)) unlinkSync(path);
    await this.db.assetDocument.deleteOne({ _id: documentId, tenantId: auth.tenantId, companyId: auth.companyId, assetId });
    return { ok: true };
  }

  private async requireAsset(auth: AuthContext, assetId: string) {
    const asset = await this.db.asset.findOne({ _id: assetId, ...this.scope(auth) }).lean();
    if (!asset) throw new NotFoundException('Asset not found in your scope');
    return asset;
  }
}
