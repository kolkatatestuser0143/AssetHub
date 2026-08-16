import { Inject, Injectable } from '@nestjs/common';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { MongooseDatabaseService } from '../../common/mongoose-database.service';
import { DOCUMENT_STORAGE, DocumentStorage } from './document-storage';

@Injectable()
export class TenantPdfBrandingService {
  constructor(
    private readonly db: MongooseDatabaseService,
    @Inject(DOCUMENT_STORAGE) private readonly storage: DocumentStorage,
  ) {}

  async brand(tenantId: string, input: Buffer): Promise<Buffer> {
    const tenant = await this.db.tenant.findById(tenantId).select({ name: 1, logoFileId: 1 }).lean();
    if (!tenant) return input;

    let pdf: PDFDocument;
    try {
      pdf = await PDFDocument.load(input);
    } catch {
      return input;
    }

    const pages = pdf.getPages();
    if (!pages.length) return input;

    const first = pages[0];
    const { width, height } = first.getSize();
    const brandName = String(tenant.name ?? 'AssetHub');
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const logoId = String(tenant.logoFileId ?? '').trim();

    first.drawText(brandName, {
      x: 36,
      y: height - 30,
      size: 11,
      font: bold,
      color: rgb(0.12, 0.16, 0.23),
    });
    first.drawLine({
      start: { x: 36, y: height - 41 },
      end: { x: width - 36, y: height - 41 },
      thickness: 0.6,
      color: rgb(0.82, 0.84, 0.88),
    });

    if (!logoId) return Buffer.from(await pdf.save());

    try {
      const stored = await this.storage.download(logoId);
      const contentType = (stored.contentType ?? '').toLowerCase();
      let image;
      if (contentType.includes('png')) image = await pdf.embedPng(stored.buffer);
      else if (contentType.includes('jpeg') || contentType.includes('jpg')) image = await pdf.embedJpg(stored.buffer);
      else return Buffer.from(await pdf.save());

      const maxW = 110;
      const maxH = 28;
      const scale = Math.min(maxW / image.width, maxH / image.height, 1);
      const logoW = image.width * scale;
      const logoH = image.height * scale;
      first.drawImage(image, {
        x: width - 36 - logoW,
        y: height - 36 - logoH,
        width: logoW,
        height: logoH,
      });
    } catch {
      // Tenant branding must never make an otherwise valid PDF fail.
    }

    return Buffer.from(await pdf.save());
  }
}
