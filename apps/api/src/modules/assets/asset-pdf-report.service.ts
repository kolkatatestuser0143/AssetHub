import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { AuthContext } from '../../common/guards/tenant-context.guard';
import { EntitlementService } from '../billing/entitlement.service';
import { AssetExcelReportFilters } from './asset-excel-report.service';
import { TenantPdfBrandingService } from './tenant-pdf-branding.service';

@Injectable()
export class AssetPdfReportService {
  constructor(private readonly prisma: PrismaService, private readonly entitlements: EntitlementService, private readonly branding: TenantPdfBrandingService) {}

  async generate(auth: AuthContext, filters: AssetExcelReportFilters = {}): Promise<Buffer> {
    await this.entitlements.requireFeature(auth.tenantId, 'advanced_reports_enabled');
    const scope: any = { tenantId: auth.tenantId, ...(auth.crossCompany ? {} : { companyId: auth.companyId }) };
    if (filters.status) scope.status = filters.status; if (filters.assetTypeId) scope.assetTypeId = filters.assetTypeId; if (filters.locationId) scope.locationId = filters.locationId;
    if (filters.companyId) { if (!auth.crossCompany && filters.companyId !== auth.companyId) throw new ForbiddenException('Company out of scope'); scope.companyId = filters.companyId; }
    if (filters.fromDate || filters.toDate) { scope.createdAt = {}; if (filters.fromDate) { const d = new Date(filters.fromDate); if (Number.isNaN(d.getTime())) throw new ForbiddenException('Invalid fromDate'); scope.createdAt.gte = d; } if (filters.toDate) { const d = new Date(filters.toDate); if (Number.isNaN(d.getTime())) throw new ForbiddenException('Invalid toDate'); d.setHours(23,59,59,999); scope.createdAt.lte = d; } }
    const assets = await this.prisma.withTenantContext(auth.tenantId, auth.companyId, tx => tx.asset.findMany({ where: scope, orderBy: { createdAt: 'desc' }, take: 5000, include: { assetType: { select: { name: true } } } }));
    const rows = assets.map(a => [a.assetNumber, a.status, a.assetType?.name ?? '', a.companyId, a.createdAt.toISOString().slice(0,10)]);
    const filtersText = Object.entries(filters).filter(([,v]) => v).map(([k,v]) => `${k}=${v}`).join(', ') || 'None';
    return this.branding.brand(auth.tenantId, buildPdf([['AssetHub Asset Report'],[`Generated: ${new Date().toISOString()}`],[`Tenant: ${auth.tenantId}`],[`Filters: ${filtersText}`],[`Total assets: ${rows.length}`],[''],['Asset Number','Status','Asset Type','Company','Created'],...rows]));
  }
}
function esc(v:string){return v.replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)').replace(/\r?\n/g,' ');}
function buildPdf(rows:string[][]){const h=842,w=595,m=36,lh=13,usable=h-70,pages:string[][]=[];let page:string[]=[];for(const row of rows){const line=row.map(v=>String(v??'').slice(0,38)).join('    ').slice(0,120);if((page.length+1)*lh>usable){pages.push(page);page=[];}page.push(line);}if(page.length)pages.push(page);const objects:string[]=['','<< /Type /Catalog /Pages 2 0 R >>'];const font=3+pages.length*2;objects.push(`<< /Type /Pages /Kids [${pages.map((_,i)=>`${4+i*2} 0 R`).join(' ')}] /Count ${pages.length} >>`);for(let i=0;i<pages.length;i++){const po=4+i*2,co=po+1,cmd=['BT','/F1 9 Tf',`${m} ${h-48} Td`];pages[i].forEach((line,j)=>{if(j)cmd.push(`0 -${lh} Td`);cmd.push(`(${esc(line)}) Tj`);});cmd.push('ET');const stream=cmd.join('\n');objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] /Resources << /Font << /F1 ${font} 0 R >> >> /Contents ${co} 0 R >>`);objects.push(`<< /Length ${Buffer.byteLength(stream,'utf8')} >>\nstream\n${stream}\nendstream`);}objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');const chunks:Buffer[]=[Buffer.from('%PDF-1.4\n')],offsets:number[]=[0];let offset=chunks[0].length;for(let i=1;i<objects.length;i++){offsets[i]=offset;const b=Buffer.from(`${i} 0 obj\n${objects[i]}\nendobj\n`);chunks.push(b);offset+=b.length;}const x=offset,lines=['xref',`0 ${objects.length}`,'0000000000 65535 f '];for(let i=1;i<objects.length;i++)lines.push(`${String(offsets[i]).padStart(10,'0')} 00000 n `);lines.push('trailer',`<< /Size ${objects.length} /Root 1 0 R >>`,'startxref',String(x),'%%EOF');chunks.push(Buffer.from(`${lines.join('\n')}\n`));return Buffer.concat(chunks);}
