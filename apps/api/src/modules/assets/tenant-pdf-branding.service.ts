import { Inject, Injectable } from '@nestjs/common';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { PrismaService } from '../../common/database/prisma.service';
import { DOCUMENT_STORAGE, DocumentStorage } from './document-storage';

@Injectable()
export class TenantPdfBrandingService {
  constructor(private readonly prisma: PrismaService, @Inject(DOCUMENT_STORAGE) private readonly storage: DocumentStorage) {}
  async brand(tenantId: string, input: Buffer): Promise<Buffer> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true, logoFileId: true } });
    if (!tenant) return input;
    let pdf: PDFDocument; try { pdf = await PDFDocument.load(input); } catch { return input; }
    const pages = pdf.getPages(); if (!pages.length) return input; const first = pages[0]; const { width, height } = first.getSize(); const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    first.drawText(String(tenant.name ?? 'AssetHub'), { x:36, y:height-30, size:11, font:bold, color:rgb(0.12,0.16,0.23) });
    first.drawLine({ start:{x:36,y:height-41}, end:{x:width-36,y:height-41}, thickness:0.6, color:rgb(0.82,0.84,0.88) });
    const logoId=String(tenant.logoFileId??'').trim(); if(!logoId)return Buffer.from(await pdf.save());
    try { const stored=await this.storage.download(logoId); const type=(stored.contentType??'').toLowerCase(); const image=type.includes('png')?await pdf.embedPng(stored.buffer):type.includes('jpeg')||type.includes('jpg')?await pdf.embedJpg(stored.buffer):null; if(!image)return Buffer.from(await pdf.save()); const scale=Math.min(110/image.width,28/image.height,1); const logoW=image.width*scale,logoH=image.height*scale; first.drawImage(image,{x:width-36-logoW,y:height-36-logoH,width:logoW,height:logoH}); } catch {}
    return Buffer.from(await pdf.save());
  }
}
