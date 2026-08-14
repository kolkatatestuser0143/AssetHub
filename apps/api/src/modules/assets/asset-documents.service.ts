import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'fs';
import { basename, join } from 'path';
import { MongooseDatabaseService } from '../../common/mongoose-database.service';
import { AuthContext } from '../../common/guards/tenant-context.guard';
import { TenantScopedRepository } from '../../common/tenant-scoped.repository';
import { toDto, toDtoArray } from '../../common/mongoose.utils';

const ALLOWED_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
]);
const MAX_FILE_BYTES = 25 * 1024 * 1024;

@Injectable()
export class AssetDocumentsService extends TenantScopedRepository {
  private readonly root = process.env.ASSET_DOCUMENTS_DIR || join(process.cwd(), 'storage', 'asset-documents');

  constructor(private readonly db: MongooseDatabaseService) {
    super();
    mkdirSync(this.root, { recursive: true });
  }

  async list(auth: AuthContext, assetId: string) {
    await this.requireAsset(auth, assetId);
    return toDtoArray(
      await this.db.assetDocument
        .find({ tenantId: auth.tenantId, companyId: auth.companyId, assetId })
        .select({ s3Key: 0 })
        .sort({ createdAt: -1 })
        .lean(),
    );
  }

  async upload(auth: AuthContext, assetId: string, file: any, documentType?: string) {
    await this.requireAsset(auth, assetId);
    if (!file?.buffer?.length) throw new BadRequestException('Document file is required');
    if (file.size > MAX_FILE_BYTES) throw new BadRequestException('Document exceeds the 25 MB limit');
    if (!ALLOWED_TYPES.has(file.mimetype)) throw new BadRequestException('Unsupported document type');

    const safeName = basename(String(file.originalname ?? 'document')).replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = join(auth.tenantId, auth.companyId, assetId, `${randomUUID()}-${safeName}`);
    const absolutePath = join(this.root, key);
    mkdirSync(join(this.root, auth.tenantId, auth.companyId, assetId), { recursive: true });
    writeFileSync(absolutePath, file.buffer, { flag: 'wx' });

    try {
      const doc = await this.db.assetDocument.create({
        tenantId: auth.tenantId,
        companyId: auth.companyId,
        assetId,
        s3Key: key,
        fileName: String(file.originalname ?? safeName),
        contentType: String(file.mimetype ?? 'application/octet-stream'),
        sizeBytes: Number(file.size ?? file.buffer.length),
        ...(documentType ? { documentType: documentType.trim() } : {}),
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
