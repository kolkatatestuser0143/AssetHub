import { ForbiddenException, Injectable } from '@nestjs/common';
import { AuthContext } from '../../common/guards/tenant-context.guard';
import { TenantScopedRepository } from '../../common/tenant-scoped.repository';
import { MongooseDatabaseService } from '../../common/mongoose-database.service';
import { EntitlementService } from '../billing/entitlement.service';

interface ZipEntry { name: string; data: Buffer; }
export interface AssetExcelReportFilters {
  status?: string;
  companyId?: string;
  assetTypeId?: string;
  locationId?: string;
  fromDate?: string;
  toDate?: string;
}

@Injectable()
export class AssetExcelReportService extends TenantScopedRepository {
  constructor(
    private readonly db: MongooseDatabaseService,
    private readonly entitlements: EntitlementService,
  ) { super(); }

  async generate(auth: AuthContext, filters: AssetExcelReportFilters = {}): Promise<Buffer> {
    await this.entitlements.requireFeature(auth.tenantId, 'advanced_reports_enabled');

    const assetScope: Record<string, unknown> = { ...this.scope(auth) };
    if (filters.status) assetScope.status = filters.status;
    if (filters.assetTypeId) assetScope.assetTypeId = filters.assetTypeId;
    if (filters.locationId) assetScope.locationId = filters.locationId;
    if (filters.companyId) {
      if (!auth.crossCompany && filters.companyId !== auth.companyId) throw new ForbiddenException('Company out of scope');
      const company = await this.db.company.findOne({ _id: filters.companyId, tenantId: auth.tenantId }).lean();
      if (!company) throw new ForbiddenException('Company out of scope');
      assetScope.companyId = filters.companyId;
    }

    if (filters.fromDate || filters.toDate) {
      const createdAt: Record<string, Date> = {};
      if (filters.fromDate) createdAt.$gte = this.parseDate(filters.fromDate, 'fromDate');
      if (filters.toDate) {
        const end = this.parseDate(filters.toDate, 'toDate');
        end.setHours(23, 59, 59, 999);
        createdAt.$lte = end;
      }
      assetScope.createdAt = createdAt;
    }

    const assets = await this.db.asset.find(assetScope).sort({ createdAt: -1 }).lean();
    const companyIds = [...new Set(assets.map((asset: any) => String(asset.companyId)).filter(Boolean))];
    const assetTypeIds = [...new Set(assets.map((asset: any) => String(asset.assetTypeId)).filter(Boolean))];
    const vendorIds = [...new Set(assets.map((asset: any) => String(asset.vendorId)).filter(Boolean))];
    const locationIds = [...new Set(assets.map((asset: any) => String(asset.locationId)).filter(Boolean))];
    const departmentIds = [...new Set(assets.map((asset: any) => String(asset.departmentId)).filter(Boolean))];
    const assetIds = assets.map((asset: any) => String(asset._id));

    const [companies, assetTypes, vendors, locations, departments, assignments, warranties] = await Promise.all([
      companyIds.length ? this.db.company.find({ _id: { $in: companyIds }, tenantId: auth.tenantId }).lean() : [],
      assetTypeIds.length ? this.db.assetType.find({ _id: { $in: assetTypeIds } }).lean() : [],
      vendorIds.length ? this.db.vendor.find({ _id: { $in: vendorIds }, tenantId: auth.tenantId }).lean() : [],
      locationIds.length ? this.db.location.find({ _id: { $in: locationIds } }).lean() : [],
      departmentIds.length ? this.db.department.find({ _id: { $in: departmentIds } }).lean() : [],
      assetIds.length ? this.db.assetAssignment.find({ assetId: { $in: assetIds }, returnedAt: { $exists: false } }).lean() : [],
      assetIds.length ? this.db.warranty.find({ assetId: { $in: assetIds } }).sort({ expiresAt: 1 }).lean() : [],
    ]);

    const companyMap = new Map(companies.map((x: any) => [String(x._id), x]));
    const typeMap = new Map(assetTypes.map((x: any) => [String(x._id), x]));
    const vendorMap = new Map(vendors.map((x: any) => [String(x._id), x]));
    const locationMap = new Map(locations.map((x: any) => [String(x._id), x]));
    const departmentMap = new Map(departments.map((x: any) => [String(x._id), x]));
    const assignmentMap = new Map(assignments.map((x: any) => [String(x.assetId), x]));
    const warrantyMap = new Map<string, any>();
    for (const warranty of warranties as any[]) {
      const key = String(warranty.assetId);
      if (!warrantyMap.has(key)) warrantyMap.set(key, warranty);
    }

    const userIds = [...new Set(assignments.map((x: any) => String(x.userId)).filter(Boolean))];
    const users = userIds.length
      ? await this.db.user.find({ _id: { $in: userIds }, tenantId: auth.tenantId }).select({ email: 1, firstName: 1, lastName: 1 }).lean()
      : [];
    const userMap = new Map(users.map((x: any) => [String(x._id), x]));

    const headers = ['Asset Number', 'Status', 'Asset Type', 'Company', 'Vendor', 'Location', 'Department', 'Assigned To', 'Warranty Provider', 'Warranty Expires', 'Created At', 'Asset ID'];
    const rows = assets.map((asset: any) => {
      const assignment = assignmentMap.get(String(asset._id));
      const assignedUser = assignment ? userMap.get(String(assignment.userId)) : null;
      const warranty = warrantyMap.get(String(asset._id));
      return [
        asset.assetNumber ?? '', asset.status ?? '', typeMap.get(String(asset.assetTypeId))?.name ?? '',
        companyMap.get(String(asset.companyId))?.name ?? '', vendorMap.get(String(asset.vendorId))?.name ?? '',
        locationMap.get(String(asset.locationId))?.name ?? '', departmentMap.get(String(asset.departmentId))?.name ?? '',
        assignedUser ? `${assignedUser.firstName ?? ''} ${assignedUser.lastName ?? ''}`.trim() || assignedUser.email : '',
        warranty?.provider ?? '', warranty?.expiresAt ? new Date(warranty.expiresAt).toISOString().slice(0, 10) : '',
        asset.createdAt ? new Date(asset.createdAt).toISOString() : '', String(asset._id),
      ];
    });

    const summary = [
      ['AssetHub Asset Report', ''], ['Generated At', new Date().toISOString()], ['Tenant ID', auth.tenantId],
      ['Filters', this.filterSummary(filters)], ['Total Assets', String(assets.length)], ['', ''], ['Status', 'Count'],
      ...this.countBy(assets.map((asset: any) => String(asset.status ?? 'UNKNOWN'))),
    ];

    const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Summary" sheetId="1" r:id="rId1"/><sheet name="Assets" sheetId="2" r:id="rId2"/></sheets></workbook>`;
    const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
    const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
    const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`;
    const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF0F172A"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/><xf numFmtId="0" fontId="1" fillId="1" borderId="0" applyFont="1" applyFill="1"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
    const sheet1 = this.sheetXml(summary, { freezeRows: 7, headerRow: 7 });
    const sheet2 = this.sheetXml([headers, ...rows], { freezeRows: 1, headerRow: 1, autoFilterEndColumn: headers.length, autoFilterEndRow: rows.length + 1 });
    return zip([
      { name: '[Content_Types].xml', data: Buffer.from(contentTypesXml) }, { name: '_rels/.rels', data: Buffer.from(rootRelsXml) },
      { name: 'xl/workbook.xml', data: Buffer.from(workbookXml) }, { name: 'xl/_rels/workbook.xml.rels', data: Buffer.from(relsXml) },
      { name: 'xl/styles.xml', data: Buffer.from(stylesXml) }, { name: 'xl/worksheets/sheet1.xml', data: Buffer.from(sheet1) },
      { name: 'xl/worksheets/sheet2.xml', data: Buffer.from(sheet2) },
    ]);
  }

  private parseDate(value: string, field: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) throw new ForbiddenException(`Invalid ${field}`);
    return date;
  }

  private filterSummary(filters: AssetExcelReportFilters) {
    const active = Object.entries(filters).filter(([, value]) => value).map(([key, value]) => `${key}=${value}`);
    return active.length ? active.join('; ') : 'None';
  }

  private countBy(values: string[]): string[][] { const counts = new Map<string, number>(); for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1); return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([key, count]) => [key, String(count)]); }

  private sheetXml(rows: string[][], options: { freezeRows: number; headerRow: number; autoFilterEndColumn?: number; autoFilterEndRow?: number }) {
    const xmlRows = rows.map((row, rowIndex) => {
      const cells = row.map((value, colIndex) => { const ref = `${this.colName(colIndex + 1)}${rowIndex + 1}`; const style = rowIndex === options.headerRow - 1 ? 1 : (rowIndex === 0 && options.headerRow > 1 ? 2 : 0); return `<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(String(value ?? ''))}</t></is></c>`; }).join('');
      return `<row r="${rowIndex + 1}">${cells}</row>`;
    }).join('');
    const autoFilter = options.autoFilterEndColumn && options.autoFilterEndRow ? `<autoFilter ref="A${options.headerRow}:${this.colName(options.autoFilterEndColumn)}${options.autoFilterEndRow}"/>` : '';
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="${options.freezeRows}" topLeftCell="A${options.freezeRows + 1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetData>${xmlRows}</sheetData>${autoFilter}</worksheet>`;
  }

  private colName(column: number) { let n = column; let out = ''; while (n > 0) { const rem = (n - 1) % 26; out = String.fromCharCode(65 + rem) + out; n = Math.floor((n - 1) / 26); } return out; }
}

function escapeXml(value: string) { return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;'); }
function zip(entries: ZipEntry[]) { const local: Buffer[] = []; const central: Buffer[] = []; let offset = 0; for (const entry of entries) { const name = Buffer.from(entry.name, 'utf8'); const data = entry.data; const crc = crc32(data); const localHeader = Buffer.alloc(30 + name.length); localHeader.writeUInt32LE(0x04034b50, 0); localHeader.writeUInt16LE(20, 4); localHeader.writeUInt16LE(0, 6); localHeader.writeUInt16LE(0, 8); localHeader.writeUInt16LE(0, 10); localHeader.writeUInt16LE(0, 12); localHeader.writeUInt32LE(crc, 14); localHeader.writeUInt32LE(data.length, 18); localHeader.writeUInt32LE(data.length, 22); localHeader.writeUInt16LE(name.length, 26); localHeader.writeUInt16LE(0, 28); name.copy(localHeader, 30); local.push(localHeader, data); const centralHeader = Buffer.alloc(46 + name.length); centralHeader.writeUInt32LE(0x02014b50, 0); centralHeader.writeUInt16LE(20, 4); centralHeader.writeUInt16LE(20, 6); centralHeader.writeUInt16LE(0, 8); centralHeader.writeUInt16LE(0, 10); centralHeader.writeUInt16LE(0, 12); centralHeader.writeUInt16LE(0, 14); centralHeader.writeUInt32LE(crc, 16); centralHeader.writeUInt32LE(data.length, 20); centralHeader.writeUInt32LE(data.length, 24); centralHeader.writeUInt16LE(name.length, 28); centralHeader.writeUInt16LE(0, 30); centralHeader.writeUInt16LE(0, 32); centralHeader.writeUInt16LE(0, 34); centralHeader.writeUInt16LE(0, 36); centralHeader.writeUInt32LE(0, 38); centralHeader.writeUInt32LE(offset, 42); name.copy(centralHeader, 46); central.push(centralHeader); offset += localHeader.length + data.length; } const centralBuffer = Buffer.concat(central); const localBuffer = Buffer.concat(local); const end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(0, 4); end.writeUInt16LE(0, 6); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10); end.writeUInt32LE(centralBuffer.length, 12); end.writeUInt32LE(localBuffer.length, 16); end.writeUInt16LE(0, 20); return Buffer.concat([localBuffer, centralBuffer, end]); }
function crc32(data: Buffer) { let crc = 0xffffffff; for (const byte of data) { crc ^= byte; for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (-(crc & 1) & 0xedb88320); } return (crc ^ 0xffffffff) >>> 0; }
