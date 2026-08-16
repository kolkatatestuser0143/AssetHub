import { ForbiddenException, Injectable } from '@nestjs/common';
import { AuthContext } from '../../common/guards/tenant-context.guard';
import { TenantScopedRepository } from '../../common/tenant-scoped.repository';
import { MongooseDatabaseService } from '../../common/mongoose-database.service';
import { EntitlementService } from '../billing/entitlement.service';
import { AssetExcelReportFilters } from './asset-excel-report.service';
import { TenantPdfBrandingService } from './tenant-pdf-branding.service';

@Injectable()
export class AssetPdfReportService extends TenantScopedRepository {
  constructor(
    private readonly db: MongooseDatabaseService,
    private readonly entitlements: EntitlementService,
    private readonly branding: TenantPdfBrandingService,
  ) { super(); }

  async generate(auth: AuthContext, filters: AssetExcelReportFilters = {}): Promise<Buffer> {
    await this.entitlements.requireFeature(auth.tenantId, 'advanced_reports_enabled');

    const scope: Record<string, unknown> = { ...this.scope(auth) };
    if (filters.status) scope.status = filters.status;
    if (filters.assetTypeId) scope.assetTypeId = filters.assetTypeId;
    if (filters.locationId) scope.locationId = filters.locationId;
    if (filters.companyId) {
      if (!auth.crossCompany && filters.companyId !== auth.companyId) throw new ForbiddenException('Company out of scope');
      const company = await this.db.company.findOne({ _id: filters.companyId, tenantId: auth.tenantId }).lean();
      if (!company) throw new ForbiddenException('Company out of scope');
      scope.companyId = filters.companyId;
    }
    if (filters.fromDate || filters.toDate) {
      const createdAt: Record<string, Date> = {};
      if (filters.fromDate) {
        const d = new Date(filters.fromDate);
        if (Number.isNaN(d.getTime())) throw new ForbiddenException('Invalid fromDate');
        createdAt.$gte = d;
      }
      if (filters.toDate) {
        const d = new Date(filters.toDate);
        if (Number.isNaN(d.getTime())) throw new ForbiddenException('Invalid toDate');
        d.setHours(23, 59, 59, 999);
        createdAt.$lte = d;
      }
      scope.createdAt = createdAt;
    }

    const assets = await this.db.asset.find(scope).sort({ createdAt: -1 }).limit(5000).lean();
    const companyIds = [...new Set(assets.map((a: any) => String(a.companyId)).filter(Boolean))];
    const typeIds = [...new Set(assets.map((a: any) => String(a.assetTypeId)).filter(Boolean))];
    const companies = companyIds.length ? await this.db.company.find({ _id: { $in: companyIds }, tenantId: auth.tenantId }).lean() : [];
    const types = typeIds.length ? await this.db.assetType.find({ _id: { $in: typeIds } }).lean() : [];
    const companyMap = new Map(companies.map((x: any) => [String(x._id), x.name]));
    const typeMap = new Map(types.map((x: any) => [String(x._id), x.name]));

    const rows = assets.map((a: any) => [
      a.assetNumber ?? '',
      a.status ?? '',
      typeMap.get(String(a.assetTypeId)) ?? '',
      companyMap.get(String(a.companyId)) ?? '',
      a.createdAt ? new Date(a.createdAt).toISOString().slice(0, 10) : '',
    ]);

    const filtersText = Object.entries(filters).filter(([, v]) => v).map(([k, v]) => `${k}=${v}`).join(', ') || 'None';
    const pdf = buildPdf([
      ['AssetHub Asset Report'],
      [`Generated: ${new Date().toISOString()}`],
      [`Tenant: ${auth.tenantId}`],
      [`Filters: ${filtersText}`],
      [`Total assets: ${rows.length}`],
      [''],
      ['Asset Number', 'Status', 'Asset Type', 'Company', 'Created'],
      ...rows,
    ]);
    return this.branding.brand(auth.tenantId, pdf);
  }
}

function pdfEscape(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)').replace(/\r?\n/g, ' ');
}

function buildPdf(rows: string[][]): Buffer {
  const pageHeight = 842;
  const pageWidth = 595;
  const margin = 36;
  const lineHeight = 13;
  const usable = pageHeight - 70;
  const wrapped: string[][] = rows.map((row) => row.map((v) => String(v ?? '').slice(0, 38)));
  const pages: string[][] = [];
  let page: string[] = [];

  for (const row of wrapped) {
    const line = row.join('    ').slice(0, 120);
    if ((page.length + 1) * lineHeight > usable) { pages.push(page); page = []; }
    page.push(line);
  }
  if (page.length) pages.push(page);

  const objects: string[] = [];
  objects.push('');
  objects.push('<< /Type /Catalog /Pages 2 0 R >>');
  const fontObject = 3 + pages.length * 2;
  objects.push(`<< /Type /Pages /Kids [${pages.map((_, i) => `${4 + i * 2} 0 R`).join(' ')}] /Count ${pages.length} >>`);
  for (let i = 0; i < pages.length; i += 1) {
    const pageObj = 4 + i * 2;
    const contentObj = pageObj + 1;
    const commands = ['BT', '/F1 9 Tf', `${margin} ${pageHeight - 48} Td`];
    pages[i].forEach((line, idx) => {
      if (idx > 0) commands.push(`0 -${lineHeight} Td`);
      commands.push(`(${pdfEscape(line)}) Tj`);
    });
    commands.push('ET');
    const stream = commands.join('\n');
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${fontObject} 0 R >> >> /Contents ${contentObj} 0 R >>`);
    objects.push(`<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\nstream\n${stream}\nendstream`);
  }
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');

  const chunks: Buffer[] = [Buffer.from('%PDF-1.4\n')];
  const offsets: number[] = [0];
  let offset = chunks[0].length;
  for (let i = 1; i < objects.length; i += 1) {
    offsets[i] = offset;
    const obj = Buffer.from(`${i} 0 obj\n${objects[i]}\nendobj\n`);
    chunks.push(obj); offset += obj.length;
  }
  const xrefOffset = offset;
  const xref = ['xref', `0 ${objects.length}`, '0000000000 65535 f '];
  for (let i = 1; i < objects.length; i += 1) xref.push(`${String(offsets[i]).padStart(10, '0')} 00000 n `);
  xref.push('trailer', `<< /Size ${objects.length} /Root 1 0 R >>`, 'startxref', String(xrefOffset), '%%EOF');
  chunks.push(Buffer.from(`${xref.join('\n')}\n`));
  return Buffer.concat(chunks);
}
