import { Injectable } from '@nestjs/common';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { MongooseDatabaseService } from '../../common/mongoose-database.service';
import { DocumentStorage } from './document-storage';

@Injectable()
export class TenantPdfBrandingService {
  constructor(
    private readonly db: MongooseDatabaseService,
    private readonly storage: DocumentStorage,
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
    const { width } = first.getSize();
    const brandName = String(tenant.name ?? 'AssetHub');
    const logoId = String(tenant.logoFileId ?? '').trim();

    first.drawText(brandName, {
      x: 36,
      y: first.getSize().height - 34,
      size: 11,
      font: await pdf.embedFont(StandardFonts.HelveticaBold),
      color: rgb(0.12, 0.16, 0.23),
    });
    first.drawLine({
      start: { x: 36, y: first.getSize().height - 44 },
      end: { x: width - 36, y: first.getSize().height - 44 },
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
      const scaled = image.scale(Math.min(maxW / image.width, maxH / image.height, 1));
      first.drawImage(image, {
        x: width - 36 - scaled.width,
        y: first.getSize().height - 39 - scaled.height / 2,
        width: scaled.width,
        height: scaled.height,
      });
    } catch {
      // Branding must never break an otherwise valid PDF.
    }

    return Buffer.from(await pdf.save());
  }
}
